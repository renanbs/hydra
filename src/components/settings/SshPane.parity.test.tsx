// Parity guard for the Settings → SSH Hosts pane. Orca's `SshPane` is reduced to the
// registry operations Hydra has a backend for, so this locks the reduced contract: the
// pane lists the hydrated targets (and says so when there are none), Add opens the shared
// Add-host dialog, Edit validates the draft and writes `{ id, updates }` to
// `ssh_update_target`, Remove goes through the shared dialog and re-reads the registry,
// and — the point of the reduction — a build without the SSH connection subsystem renders
// no Connect/Disconnect/Test/relay control at all rather than an inert one.
import { describe, expect, it, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { SshTarget } from '../../shared/ssh-types'
import { useAppStore } from '@/store'
import { TooltipProvider } from '@/components/ui/tooltip'

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

import { SshPane } from './SshPane'

function target(overrides: Partial<SshTarget> = {}): SshTarget {
  return {
    id: 'ssh-1',
    label: 'Build server',
    host: 'build.internal',
    port: 22,
    username: 'deploy',
    generation: 4,
    ...overrides
  }
}

let registry: SshTarget[] = []

function resetSshState(): void {
  useAppStore.setState({
    repos: [],
    worktreesByRepo: {},
    sshConnectionStates: new Map(),
    sshTargetLabels: new Map(),
    sshTargetGenerations: new Map(),
    removedSshTargetLabels: new Map(),
    sshTargetsHydrated: false
  })
}

function renderPane() {
  // The card's action buttons are Radix tooltips; App provides the single TooltipProvider.
  return render(
    <TooltipProvider>
      <SshPane />
    </TooltipProvider>
  )
}

/** The pane loads once on mount; every assertion below starts from that settled list. */
async function renderSettled() {
  renderPane()
  await act(async () => {})
}

beforeEach(() => {
  registry = []
  invokeMock.mockReset()
  toastError.mockReset()
  toastSuccess.mockReset()
  toastInfo.mockReset()
  invokeMock.mockImplementation((cmd: string, args?: Record<string, unknown>) => {
    switch (cmd) {
      case 'ssh_list_targets':
        return Promise.resolve(registry)
      case 'ssh_list_removed_target_labels':
        return Promise.resolve({})
      case 'ssh_update_target': {
        const id = args?.id as string
        const updates = args?.updates as Partial<SshTarget>
        const existing = registry.find((entry) => entry.id === id)
        if (!existing) {
          return Promise.resolve(null)
        }
        registry = registry.map((entry) => (entry.id === id ? { ...entry, ...updates } : entry))
        return Promise.resolve(registry.find((entry) => entry.id === id))
      }
      case 'ssh_remove_target': {
        const id = args?.id as string
        registry = registry.filter((entry) => entry.id !== id)
        return Promise.resolve({ removedWorkspaceCount: 0 })
      }
      case 'ssh_list_config_hosts':
        return Promise.resolve({ hosts: [], totalHostCount: 0, newHostCount: 0, matchCount: 0, hasMore: false })
      default:
        return Promise.reject(new Error(`unexpected command: ${cmd}`))
    }
  })
  resetSshState()
})

describe('SshPane list (Orca parity, reduced)', () => {
  it('lists the hydrated targets with their registry metadata', async () => {
    registry = [target({ configHost: 'build-server', source: 'ssh-config' })]
    await renderSettled()

    expect(await screen.findByText('Build server')).toBeInTheDocument()
    expect(screen.getByText(/deploy@build\.internal:22/)).toBeInTheDocument()
    expect(screen.getByText('From ~/.ssh/config')).toBeInTheDocument()
    expect(screen.getByText('alias build-server')).toBeInTheDocument()
    expect(screen.getByText('generation 4')).toBeInTheDocument()
    expect(screen.queryByText('No SSH targets configured.')).toBeNull()
  })

  it('shows the ported empty state when the registry has no targets', async () => {
    await renderSettled()

    expect(await screen.findByText('No SSH targets configured.')).toBeInTheDocument()
  })
})

describe('SshPane actions (Orca parity, reduced)', () => {
  it('opens the shared Add-host dialog from Add Target', async () => {
    await renderSettled()

    fireEvent.click(screen.getByRole('button', { name: /Add Target/ }))

    expect(await screen.findByText('Add SSH host')).toBeInTheDocument()
  })

  it('validates the edit draft and sends the target id with the patched fields', async () => {
    registry = [target()]
    await renderSettled()

    fireEvent.click(await screen.findByRole('button', { name: 'Edit target' }))
    fireEvent.change(screen.getByLabelText('Label'), { target: { value: 'Renamed box' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))
    await act(async () => {})

    expect(invokeMock).toHaveBeenCalledWith('ssh_update_target', {
      id: 'ssh-1',
      updates: {
        label: 'Renamed box',
        configHost: 'build.internal',
        host: 'build.internal',
        port: 22,
        username: 'deploy',
        source: 'manual'
      }
    })
    expect(toastSuccess).toHaveBeenCalledWith('Target updated')
    expect(await screen.findByText('Renamed box')).toBeInTheDocument()
  })

  it('refuses a port the host field parsed as invalid instead of writing it', async () => {
    registry = [target()]
    await renderSettled()

    fireEvent.click(await screen.findByRole('button', { name: 'Edit target' }))
    // Why: a pasted `host:port` whose port is not a number keeps the bad text in Host
    // (Orca does not rewrite an invalid draft), so the paste-time parse cannot have
    // supplied a port and the save validator is the only thing that can catch it.
    fireEvent.change(screen.getByLabelText('Host or alias *'), {
      target: { value: 'server:abc' }
    })
    fireEvent.blur(screen.getByLabelText('Host or alias *'))
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))
    await act(async () => {})

    expect(invokeMock).not.toHaveBeenCalledWith('ssh_update_target', expect.anything())
    expect(toastError).toHaveBeenCalledWith('Port must be between 1 and 65535')
  })

  it('removes through the shared dialog once and re-reads the registry', async () => {
    registry = [target()]
    await renderSettled()

    fireEvent.click(await screen.findByRole('button', { name: 'Remove target' }))
    expect(await screen.findByText('Remove Build server?')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Remove host' }))
    await act(async () => {})

    expect(invokeMock.mock.calls.filter(([cmd]) => cmd === 'ssh_remove_target')).toHaveLength(1)
    expect(
      invokeMock.mock.calls.filter(([cmd]) => cmd === 'ssh_list_targets').length
    ).toBeGreaterThanOrEqual(2)
    await waitFor(() => {
      expect(screen.getByText('No SSH targets configured.')).toBeInTheDocument()
    })
  })
})

describe('SshPane connection controls (reduced)', () => {
  it('renders no Connect, Disconnect, Test, relay or status control without a connection backend', async () => {
    registry = [target()]
    const { container } = renderPane()
    await act(async () => {})

    expect(await screen.findByText('Build server')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Connect' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Disconnect' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Test' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'End remote terminals' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Reset remote relay' })).toBeNull()
    expect(container.querySelector('[data-ssh-target-card]')).not.toBeNull()
    expect(screen.queryByText('Disconnected')).toBeNull()
  })
})
