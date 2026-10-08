// Parity guard for the rename dialog. Orca's rename is a client-side label override with a
// blank-means-reset affordance; Hydra writes the registry label itself through
// `ssh_update_target`, so this port has to refuse a blank name and a name another host
// already carries, send the trimmed label as the payload, and re-read the registry so the
// sidebar renames without a reload. What it locks out: an empty label silently degrading a
// host to its raw target id, and two hosts sharing one name in every host surface.
import { describe, expect, it, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { useAppStore } from '@/store'
import { HostRenameDialog } from './HostRenameDialog'

const { invokeMock, toastError } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
  toastError: vi.fn()
}))
vi.mock('@tauri-apps/api/core', () => ({ invoke: invokeMock }))
vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: toastError, info: vi.fn() })
}))

type RegistryRow = { id: string; label: string; generation: number }

let registry: RegistryRow[] = []

function resetStore(): void {
  useAppStore.setState({
    sshConnectionStates: new Map(),
    sshTargetLabels: new Map(registry.map((target) => [target.id, target.label])),
    sshTargetGenerations: new Map(registry.map((target) => [target.id, target.generation])),
    removedSshTargetLabels: new Map(),
    sshTargetsHydrated: false
  })
}

function renderDialog(onOpenChange = vi.fn()) {
  render(
    <HostRenameDialog
      open
      onOpenChange={onOpenChange}
      targetId="srv"
      currentLabel="Build server"
    />
  )
  return { onOpenChange }
}

beforeEach(() => {
  registry = [
    { id: 'srv', label: 'Build server', generation: 1 },
    { id: 'db', label: 'Database', generation: 2 }
  ]
  invokeMock.mockReset()
  toastError.mockReset()
  invokeMock.mockImplementation(
    (cmd: string, args?: { id?: string; updates?: { label?: string } }) => {
      switch (cmd) {
        case 'ssh_update_target': {
          const target = registry.find((row) => row.id === args?.id)
          if (!target || args?.updates?.label === undefined) {
            return Promise.resolve(null)
          }
          target.label = args.updates.label
          return Promise.resolve(target)
        }
        case 'ssh_list_targets':
          return Promise.resolve(registry)
        case 'ssh_list_removed_target_labels':
          return Promise.resolve({})
        default:
          return Promise.reject(new Error(`unexpected command: ${cmd}`))
      }
    }
  )
  resetStore()
})

describe('HostRenameDialog (Orca parity)', () => {
  it('refuses a blank name without writing the registry', async () => {
    renderDialog()

    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await act(async () => {})

    expect(screen.getByText('Enter a name for this host.')).toBeInTheDocument()
    expect(invokeMock).not.toHaveBeenCalledWith('ssh_update_target', expect.anything())
  })

  it('refuses a name another host already uses', async () => {
    renderDialog()

    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'database' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await act(async () => {})

    expect(screen.getByText('Another host already uses this name.')).toBeInTheDocument()
    expect(invokeMock).not.toHaveBeenCalledWith('ssh_update_target', expect.anything())
  })

  it('writes the trimmed label, re-reads the registry and closes', async () => {
    const { onOpenChange } = renderDialog()

    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: '  Build box  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await act(async () => {})

    expect(invokeMock).toHaveBeenCalledWith('ssh_update_target', {
      id: 'srv',
      updates: { label: 'Build box' }
    })
    expect(invokeMock).toHaveBeenCalledWith('ssh_list_targets')
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(useAppStore.getState().sshTargetLabels.get('srv')).toBe('Build box')
  })

  it('accepts the host\'s own current name (it is not a duplicate of itself)', async () => {
    const { onOpenChange } = renderDialog()

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await act(async () => {})

    expect(invokeMock).toHaveBeenCalledWith('ssh_update_target', {
      id: 'srv',
      updates: { label: 'Build server' }
    })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('reports a rename main no longer holds instead of closing as if it landed', async () => {
    registry = [{ id: 'db', label: 'Database', generation: 2 }]
    resetStore()
    const { onOpenChange } = renderDialog()

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await act(async () => {})

    expect(invokeMock).toHaveBeenCalledWith('ssh_update_target', {
      id: 'srv',
      updates: { label: 'Build server' }
    })
    expect(toastError).toHaveBeenCalledWith('Failed to rename host.')
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
    expect(useAppStore.getState().sshTargetLabels.has('srv')).toBe(false)
  })
})
