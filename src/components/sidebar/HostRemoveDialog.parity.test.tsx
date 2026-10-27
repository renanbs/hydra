// Parity guard for the remove dialog. Orca's dialog counts the host's workspaces from
// live store state and only offers the destructive "also delete these workspaces" switch
// when there is something to delete. Hydra has no remote workspace removal yet, so this
// port keeps the count (it drives the copy the user is warned with) and drops the switch
// entirely rather than showing a control with nothing behind it. What it locks out: a
// delete-workspaces option with no backend, a count read from a stale cached badge, and a
// removal that leaves the host's label, connection state or tabs behind.
import { describe, expect, it, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { useAppStore } from '@/store'
import type { SshConnectionState } from '../../shared/ssh-types'
import { HostRemoveDialog } from './HostRemoveDialog'

const { invokeMock, toastSuccess, toastError } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn()
}))
vi.mock('@tauri-apps/api/core', () => ({ invoke: invokeMock }))
vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { success: toastSuccess, error: toastError, info: vi.fn() })
}))

const SSH_CONNECTION: SshConnectionState = {
  targetId: 'srv',
  status: 'disconnected',
  error: null,
  reconnectAttempt: 0
}

let registry: { id: string; label: string; generation: number }[] = []

function resetStore(overrides: Record<string, unknown> = {}): void {
  useAppStore.setState({
    repos: [],
    worktreesByRepo: {},
    sshConnectionStates: new Map([['srv', SSH_CONNECTION]]),
    sshTargetLabels: new Map(registry.map((target) => [target.id, target.label])),
    sshTargetGenerations: new Map(registry.map((target) => [target.id, target.generation])),
    removedSshTargetLabels: new Map(),
    sshTargetsHydrated: true,
    ...overrides
  })
}

function renderDialog() {
  const onOpenChange = vi.fn()
  render(
    <HostRemoveDialog open onOpenChange={onOpenChange} targetId="srv" label="Build server" />
  )
  return { onOpenChange }
}

async function confirmRemoval(): Promise<void> {
  fireEvent.click(screen.getByRole('button', { name: 'Remove host' }))
  await act(async () => {})
}

beforeEach(() => {
  registry = [{ id: 'srv', label: 'Build server', generation: 1 }]
  invokeMock.mockReset()
  toastSuccess.mockReset()
  toastError.mockReset()
  invokeMock.mockImplementation((cmd: string, args?: { id?: string }) => {
    switch (cmd) {
      case 'ssh_remove_target': {
        const removed = registry.find((target) => target.id === args?.id)
        registry = registry.filter((target) => target.id !== args?.id)
        return Promise.resolve({ tombstone: { oldTargetId: args?.id, label: removed?.label } })
      }
      case 'ssh_list_targets':
        return Promise.resolve(registry)
      case 'ssh_list_removed_target_labels':
        return Promise.resolve(registry.length === 0 ? { srv: 'Build server' } : {})
      default:
        return Promise.reject(new Error(`unexpected command: ${cmd}`))
    }
  })
  resetStore()
})

describe('HostRemoveDialog (Orca parity)', () => {
  it('offers no workspace-deletion option when the host has no workspaces', () => {
    renderDialog()

    expect(
      screen.getByText(
        'This removes the saved SSH host and its credentials from this computer. Remote files are not deleted.'
      )
    ).toBeInTheDocument()
    expect(screen.queryByRole('switch')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Advanced' })).toBeNull()
    expect(screen.queryByText(/Also delete these/)).toBeNull()
  })

  it('names the host’s workspace count when it has workspaces, still without the option', () => {
    resetStore({
      repos: [{ id: 'repo_ssh', connectionId: 'srv', executionHostId: 'ssh:srv' }],
      worktreesByRepo: {
        repo_ssh: [
          { id: 'wt-main', repoId: 'repo_ssh', isMainWorktree: true, hostId: 'ssh:srv' },
          { id: 'wt-a', repoId: 'repo_ssh', isMainWorktree: false, hostId: 'ssh:srv' }
        ]
      }
    })
    renderDialog()

    expect(screen.getByText(/Its 2 workspaces stay in Orca/)).toBeInTheDocument()
    expect(screen.queryByRole('switch')).toBeNull()
  })

  it('deletes the target once, then re-reads the registry into the store', async () => {
    const { onOpenChange } = renderDialog()

    await confirmRemoval()

    expect(toastError).not.toHaveBeenCalled()
    expect(invokeMock).toHaveBeenCalledTimes(3)
    expect(invokeMock).toHaveBeenCalledWith('ssh_remove_target', { id: 'srv' })
    expect(invokeMock).toHaveBeenCalledWith('ssh_list_targets')
    expect(invokeMock).toHaveBeenCalledWith('ssh_list_removed_target_labels')
    expect(toastError).not.toHaveBeenCalled()

    const state = useAppStore.getState()
    expect(state.sshTargetLabels.has('srv')).toBe(false)
    expect(state.sshConnectionStates.has('srv')).toBe(false)
    expect(state.removedSshTargetLabels.get('srv')).toBe('Build server')
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(toastSuccess).toHaveBeenCalledWith('Removed Build server')
  })

  it('keeps the host when the backend refuses the deletion', async () => {
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === 'ssh_remove_target') {
        return Promise.reject(new Error('registry locked'))
      }
      return Promise.reject(new Error(`unexpected command: ${cmd}`))
    })
    const { onOpenChange } = renderDialog()

    await confirmRemoval()

    expect(toastError).toHaveBeenCalledWith('registry locked')
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
    expect(useAppStore.getState().sshTargetLabels.get('srv')).toBe('Build server')
  })
})
