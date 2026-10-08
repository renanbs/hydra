// Parity guard for the Add-SSH-host dialog — Orca's
// `components/sidebar/AddRemoteHostDialog.tsx` reduced to its SSH mode: the manual form
// (label/host/port/username/identity file) and the `~/.ssh/config` picker. Guards the
// behaviors the port promises: the picker's search is debounced to one call with the last
// term, a host-less form never reaches `ssh_add_target`, the manual payload carries exactly
// what the form holds, bulk import goes through `ssh_import_config` and re-reads the list,
// registered/tombstoned config hosts stay differentiated while `Add all` counts only new
// ones, and a successful save hydrates the registry so the sidebar's Hosts gate opens
// without a reload.
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import type {
  SshConfigHostListResult,
  SshConfigHostResolution,
  SshConfigHostSummary,
  SshConfigImportResult,
  SshTargetCreateInput
} from '../../shared/ssh-types'
import { useAppStore } from '@/store'
import { buildSidebarHostOptions, shouldShowHostScopeControls } from './sidebar-host-options'

const { invokeMock, toastError, toastSuccess, toastInfo } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  toastInfo: vi.fn()
}))
vi.mock('@tauri-apps/api/core', () => ({ invoke: invokeMock }))
vi.mock('sonner', () => ({
  toast: Object.assign(toastInfo, { success: toastSuccess, error: toastError, info: toastInfo })
}))

import { AddRemoteHostDialog } from './AddRemoteHostDialog'

type RegistryRow = { id: string; label: string; generation: number } & Partial<SshTargetCreateInput>

let registry: RegistryRow[] = []
let listResult: SshConfigHostListResult = emptyList()
let resolveResult: SshConfigHostResolution | null = null
let importResult: SshConfigImportResult = { targets: [], repoReadoptions: [] }
let nextId = 1

function emptyList(): SshConfigHostListResult {
  return { hosts: [], totalHostCount: 0, newHostCount: 0, matchCount: 0, hasMore: false }
}

function configHost(alias: string, overrides: Partial<SshConfigHostSummary> = {}): SshConfigHostSummary {
  return {
    alias,
    hostname: `${alias}.internal`,
    port: 22,
    username: 'deploy',
    alreadyInOrca: false,
    ...overrides
  }
}

function listOf(
  hosts: SshConfigHostSummary[],
  counts: Partial<Pick<SshConfigHostListResult, 'totalHostCount' | 'newHostCount'>> = {}
): SshConfigHostListResult {
  return {
    hosts,
    totalHostCount: counts.totalHostCount ?? hosts.length,
    newHostCount: counts.newHostCount ?? hosts.filter((host) => !host.alreadyInOrca).length,
    matchCount: hosts.length,
    hasMore: false
  }
}

function resetSshState(): void {
  useAppStore.setState({
    sshConnectionStates: new Map(),
    sshTargetLabels: new Map(),
    sshTargetGenerations: new Map(),
    removedSshTargetLabels: new Map(),
    sshTargetsHydrated: false
  })
}

function renderDialog() {
  const onOpenChange = vi.fn()
  render(<AddRemoteHostDialog mode="ssh" onOpenChange={onOpenChange} />)
  return { onOpenChange }
}

/** The picker loads on open, so this also asserts the refresh read happened. */
async function openPicker(): Promise<void> {
  fireEvent.click(screen.getByRole('button', { name: 'Fill from ~/.ssh/config…' }))
  await act(async () => {})
}

beforeEach(() => {
  registry = []
  nextId = 1
  listResult = emptyList()
  resolveResult = null
  importResult = { targets: [], repoReadoptions: [] }
  invokeMock.mockReset()
  toastError.mockReset()
  toastSuccess.mockReset()
  toastInfo.mockReset()
  invokeMock.mockImplementation(
    (cmd: string, args?: { target?: SshTargetCreateInput; query?: string | null; refresh?: boolean | null }) => {
      switch (cmd) {
        case 'ssh_list_config_hosts':
          return Promise.resolve(listResult)
        case 'ssh_resolve_config_host':
          return Promise.resolve(resolveResult)
        case 'ssh_add_target': {
          const target = args?.target
          if (!target) {
            return Promise.reject(new Error('ssh_add_target without a target'))
          }
          const created: RegistryRow = { id: `ssh-${nextId}`, generation: nextId, ...target }
          nextId += 1
          registry = [...registry, created]
          return Promise.resolve({ target: created, repoReadoptions: [] })
        }
        case 'ssh_import_config':
          registry = [...registry, ...(importResult.targets as RegistryRow[])]
          return Promise.resolve(importResult)
        case 'ssh_list_targets':
          return Promise.resolve(registry)
        case 'ssh_list_removed_target_labels':
          return Promise.resolve({})
        default:
          return Promise.reject(new Error(`unexpected command: ${cmd}`))
      }
    }
  )
  resetSshState()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('AddRemoteHostDialog manual form (Orca parity)', () => {
  it('never sends a host-less form and reports the missing host', async () => {
    renderDialog()

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await act(async () => {})

    expect(invokeMock).not.toHaveBeenCalledWith('ssh_add_target', expect.anything())
    expect(toastError).toHaveBeenCalledWith('Host or SSH config alias is required.')
  })

  it('saves the form fields as the target, hydrates the registry and opens the Hosts gate', async () => {
    const { onOpenChange } = renderDialog()

    fireEvent.change(screen.getByLabelText('Label'), { target: { value: 'Dev box' } })
    fireEvent.change(screen.getByLabelText('Host or alias'), { target: { value: 'deploy@server' } })
    fireEvent.blur(screen.getByLabelText('Host or alias'))
    fireEvent.change(screen.getByLabelText('Port'), { target: { value: '2222' } })
    fireEvent.change(screen.getByLabelText('Identity file'), {
      target: { value: '~/.ssh/id_ed25519' }
    })

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await act(async () => {})

    expect(invokeMock).toHaveBeenCalledWith('ssh_add_target', {
      target: {
        label: 'Dev box',
        configHost: 'server',
        host: 'server',
        port: 2222,
        username: 'deploy',
        identityFile: '~/.ssh/id_ed25519'
      }
    })
    expect(onOpenChange).toHaveBeenCalledWith(null)
    expect(toastSuccess).toHaveBeenCalledWith('SSH host added.')

    const state = useAppStore.getState()
    expect(state.sshTargetsHydrated).toBe(true)
    expect(state.sshTargetLabels.get('ssh-1')).toBe('Dev box')
    const hosts = buildSidebarHostOptions({
      repos: [{ connectionId: 'ssh-1', executionHostId: 'ssh:ssh-1' }],
      sshTargetLabels: state.sshTargetLabels,
      sshConnectionStates: state.sshConnectionStates,
      settings: null
    })
    expect(shouldShowHostScopeControls(hosts)).toBe(true)
  })

  it('rejects a port outside 1-65535 instead of sending it', async () => {
    renderDialog()

    fireEvent.change(screen.getByLabelText('Host or alias'), { target: { value: 'server' } })
    fireEvent.change(screen.getByLabelText('Port'), { target: { value: '70000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await act(async () => {})

    expect(invokeMock).not.toHaveBeenCalledWith('ssh_add_target', expect.anything())
    expect(toastError).toHaveBeenCalledWith('Port must be between 1 and 65535.')
  })
})

describe('AddRemoteHostDialog config picker (Orca parity)', () => {
  it('debounces typing into a single read of the last term', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    listResult = listOf([configHost('alpha')])
    renderDialog()
    await openPicker()

    expect(invokeMock).toHaveBeenCalledWith('ssh_list_config_hosts', {
      query: '',
      refresh: true
    })
    invokeMock.mockClear()

    const filter = screen.getByLabelText('Filter hosts…')
    fireEvent.change(filter, { target: { value: 'a' } })
    fireEvent.change(filter, { target: { value: 'al' } })
    fireEvent.change(filter, { target: { value: 'alpha' } })
    expect(invokeMock).not.toHaveBeenCalled()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(199)
    })
    expect(invokeMock).not.toHaveBeenCalled()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(invokeMock).toHaveBeenCalledTimes(1)
    expect(invokeMock).toHaveBeenCalledWith('ssh_list_config_hosts', {
      query: 'alpha',
      refresh: null
    })
  })

  it('keeps registered hosts disabled while tombstoned ones stay pickable', async () => {
    listResult = listOf(
      [
        configHost('kept', { alreadyInOrca: true }),
        configHost('removed', { previouslyRemoved: true }),
        configHost('fresh')
      ],
      { newHostCount: 1 }
    )
    renderDialog()
    await openPicker()

    const kept = screen.getByRole('button', { name: /kept/ })
    expect(kept).toBeDisabled()
    expect(kept).toHaveTextContent('In Orca')

    const removed = screen.getByRole('button', { name: /removed/ })
    expect(removed).toBeEnabled()
    expect(removed).toHaveTextContent('Removed from Orca')

    expect(screen.getByRole('button', { name: 'Add all 1 to Orca' })).toBeEnabled()
  })

  it('offers no bulk add when every listed host is already accounted for', async () => {
    listResult = listOf(
      [configHost('kept', { alreadyInOrca: true }), configHost('removed', { previouslyRemoved: true })],
      { newHostCount: 0 }
    )
    renderDialog()
    await openPicker()

    expect(screen.getByRole('button', { name: 'No new hosts to add' })).toBeDisabled()
    expect(screen.queryByText('No hosts in ~/.ssh/config')).toBeNull()
  })

  it('prefills the form from a picked alias and leaves Identity file to OpenSSH', async () => {
    listResult = listOf([configHost('alpha')])
    resolveResult = {
      alias: 'alpha',
      hostname: 'alpha.internal',
      port: 2200,
      username: 'deploy',
      identityFiles: ['~/.ssh/id_ed25519'],
      identitiesOnly: false,
      forwardAgent: false,
      proxyUseFdpass: false
    }
    renderDialog()
    await openPicker()

    fireEvent.click(screen.getByRole('button', { name: /alpha/ }))
    await act(async () => {})

    expect(invokeMock).toHaveBeenCalledWith('ssh_resolve_config_host', { alias: 'alpha' })
    expect(screen.getByLabelText('Label')).toHaveValue('alpha')
    expect(screen.getByLabelText('Host or alias')).toHaveValue('alpha.internal')
    expect(screen.getByLabelText('Username')).toHaveValue('deploy')
    expect(screen.getByLabelText('Port')).toHaveValue(2200)
    expect(screen.getByLabelText('Identity file')).toHaveValue('')
    expect(
      screen.getByText(/uses every key ~\/\.ssh\/config resolves for alpha/)
    ).toBeInTheDocument()
  })

  it('imports every new host through ssh_import_config and re-reads the registry', async () => {
    listResult = listOf([configHost('alpha'), configHost('bravo')])
    importResult = {
      targets: [
        { id: 'imported-1', label: 'alpha', host: 'alpha.internal', port: 22, username: 'deploy' },
        { id: 'imported-2', label: 'bravo', host: 'bravo.internal', port: 22, username: 'deploy' }
      ] as RegistryRow[],
      repoReadoptions: []
    }
    const { onOpenChange } = renderDialog()
    await openPicker()

    fireEvent.click(screen.getByRole('button', { name: 'Add all 2 to Orca' }))
    await act(async () => {})

    expect(invokeMock).toHaveBeenCalledWith('ssh_import_config', { reAdopt: null })
    expect(invokeMock).toHaveBeenCalledWith('ssh_list_targets')
    expect(onOpenChange).toHaveBeenCalledWith(null)
    expect(useAppStore.getState().sshTargetLabels.get('imported-1')).toBe('alpha')
  })

  it('re-lists the picker when the config turns out to be already in sync', async () => {
    listResult = listOf([configHost('alpha')])
    importResult = { targets: [], repoReadoptions: [] }
    renderDialog()
    await openPicker()

    invokeMock.mockClear()
    fireEvent.click(screen.getByRole('button', { name: 'Add all 1 to Orca' }))
    await act(async () => {})

    expect(invokeMock).toHaveBeenCalledWith('ssh_import_config', { reAdopt: null })
    // One re-list and no registry hydrate: nothing was added, so nothing changed.
    expect(invokeMock).toHaveBeenCalledTimes(2)
    expect(invokeMock).toHaveBeenCalledWith('ssh_list_config_hosts', {
      query: '',
      refresh: null
    })
    expect(invokeMock).not.toHaveBeenCalledWith('ssh_list_targets')
    expect(toastInfo).toHaveBeenCalledWith('~/.ssh/config already in sync.')
  })
})
