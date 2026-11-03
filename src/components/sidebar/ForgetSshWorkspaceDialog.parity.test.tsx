// Forget dialog for a workspace on a disconnected or ghost SSH host: it must name the host
// (live label → removed label → raw id), offer only the actions that host state allows, and
// never close on a failed action.
import { describe, expect, it, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useAppStore } from '@/store'
import { ForgetSshWorkspaceDialog } from './ForgetSshWorkspaceDialog'

beforeEach(() => {
  useAppStore.setState({
    sshTargetLabels: new Map([['srv', 'Build server']]),
    removedSshTargetLabels: new Map([['gone', 'Removed box']])
  })
})

describe('ForgetSshWorkspaceDialog', () => {
  it('offers Reconnect & Delete for a disconnected host and runs it', async () => {
    const onReconnectAndDelete = vi.fn().mockResolvedValue(true)
    const onOpenChange = vi.fn()
    render(
      <ForgetSshWorkspaceDialog
        open
        displayName="feature/login"
        resolution={{ kind: 'disconnected', targetId: 'srv', status: 'disconnected' }}
        onOpenChange={onOpenChange}
        onReconnectAndDelete={onReconnectAndDelete}
        onForgetWorkspace={vi.fn().mockResolvedValue(true)}
      />
    )

    expect(screen.getByText('Delete “feature/login”?')).toBeInTheDocument()
    expect(screen.getByText('Build server')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove from Orca' })).toBeEnabled()

    fireEvent.click(screen.getByRole('button', { name: 'Reconnect & Delete' }))
    await waitFor(() => expect(onReconnectAndDelete).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })

  it('offers only Remove from Orca for a ghost host and names its removed label', () => {
    render(
      <ForgetSshWorkspaceDialog
        open
        displayName="feature/old"
        resolution={{ kind: 'ghost', targetId: 'gone' }}
        onOpenChange={vi.fn()}
        onReconnectAndDelete={vi.fn()}
        onForgetWorkspace={vi.fn().mockResolvedValue(true)}
      />
    )

    expect(screen.getByText('Removed box')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove from Orca' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: 'Reconnect & Delete' })).toBeNull()
  })

  it('falls back to the raw target id when no label is known and stays open on failure', async () => {
    const onOpenChange = vi.fn()
    const onForgetWorkspace = vi.fn().mockResolvedValue(false)
    render(
      <ForgetSshWorkspaceDialog
        open
        displayName="feature/x"
        resolution={{ kind: 'ghost', targetId: 'unknown-target' }}
        onOpenChange={onOpenChange}
        onForgetWorkspace={onForgetWorkspace}
      />
    )

    expect(screen.getByText('unknown-target')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Remove from Orca' }))
    await waitFor(() => expect(onForgetWorkspace).toHaveBeenCalledTimes(1))
    expect(onOpenChange).not.toHaveBeenCalled()
  })
})
