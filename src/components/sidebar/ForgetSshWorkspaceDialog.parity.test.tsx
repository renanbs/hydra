import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ForgetSshWorkspaceDialog } from './ForgetSshWorkspaceDialog'

function renderDisconnected(overrides: Partial<Parameters<typeof ForgetSshWorkspaceDialog>[0]> = {}) {
  const props = {
    open: true,
    displayName: 'feature/ssh-worktree',
    resolution: {
      kind: 'disconnected' as const,
      targetId: 'ssh-1',
      status: 'disconnected'
    },
    onOpenChange: vi.fn(),
    onReconnectAndDelete: vi.fn(async () => true),
    onForgetWorkspace: vi.fn(async () => true),
    ...overrides
  }
  render(<ForgetSshWorkspaceDialog {...props} />)
  return props
}

describe('ForgetSshWorkspaceDialog', () => {
  it('offers an enabled Forget action backed by the real IPC handler', async () => {
    const props = renderDisconnected()
    const forget = screen.getByRole('button', { name: 'Forget Workspace' })

    expect(forget).toBeEnabled()
    expect(forget).not.toHaveAttribute('title')
    fireEvent.click(forget)

    await waitFor(() => expect(props.onForgetWorkspace).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(props.onOpenChange).toHaveBeenCalledWith(false))
  })

  it('reconnects before retrying the delete', async () => {
    const props = renderDisconnected()
    fireEvent.click(screen.getByRole('button', { name: 'Reconnect & Delete' }))

    await waitFor(() => expect(props.onReconnectAndDelete).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(props.onOpenChange).toHaveBeenCalledWith(false))
  })

  it('keeps the dialog open when the forget IPC rejects', async () => {
    const props = renderDisconnected({
      onForgetWorkspace: vi.fn(async () => false)
    })
    fireEvent.click(screen.getByRole('button', { name: 'Forget Workspace' }))

    await waitFor(() => expect(props.onForgetWorkspace).toHaveBeenCalledTimes(1))
    expect(props.onOpenChange).not.toHaveBeenCalled()
  })

  it('offers only the local forget when the target is a ghost', () => {
    renderDisconnected({
      resolution: { kind: 'ghost', targetId: 'ssh-removed' }
    })

    expect(screen.queryByRole('button', { name: 'Reconnect & Delete' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Forget Workspace' })).toBeEnabled()
  })
})
