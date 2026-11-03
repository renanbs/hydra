// Parity guard for D10-050: "Manage in Global Settings" in the worktree
// visibility dialog must close that modal and open Global Settings on the
// worktree-visibility section, not leave the stale dialog mounted behind it.
import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import type { HydraProject } from '../sidebar/types'

const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }))
vi.mock('@tauri-apps/api/core', () => ({ invoke: invokeMock }))

import { WorktreeVisibilityDialog } from './WorktreeVisibilityDialog'

const PROJECT: HydraProject = {
  id: 'repo_1',
  name: 'repo',
  path: '/home/me/src/repo',
  is_git: true,
  current_branch: 'main',
}

describe('WorktreeVisibilityDialog global settings link (D10-050)', () => {
  it('closes the dialog and asks the shell to open the visibility section', async () => {
    invokeMock.mockResolvedValue({ hidden: [] })
    const onOpenGlobalSettings = vi.fn()
    const onOpenChange = vi.fn()
    render(
      <WorktreeVisibilityDialog
        open
        project={PROJECT}
        hiddenWorktrees={[]}
        onOpenChange={onOpenChange}
        onOpenGlobalSettings={onOpenGlobalSettings}
      />
    )
    await act(async () => {})

    fireEvent.click(screen.getByRole('button', { name: 'Manage in Global Settings' }))

    expect(onOpenGlobalSettings).toHaveBeenCalledTimes(1)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
