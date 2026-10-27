// Which workspaces a card's status assignment covers: Orca's `activeContextWorktrees` rule.
// The board is the only surface with a multi-selection, so the card menu has to be told how wide
// the assignment is — and the two failure modes worth pinning are the opposite ones: silently
// narrowing a batch the user built, and silently widening one the user forgot.
import { describe, expect, it } from 'vitest'
import { resolveWorkspaceBoardStatusAssignmentTargets } from './workspace-board-status-assignment'

describe('resolveWorkspaceBoardStatusAssignmentTargets', () => {
  it('covers the whole selection when the right-clicked card is part of it', () => {
    expect(
      resolveWorkspaceBoardStatusAssignmentTargets({
        clickedWorktreePath: '/repo/hydra/wt-b',
        selectedWorktreePaths: ['/repo/hydra/wt-a', '/repo/hydra/wt-b', '/repo/hydra/wt-c']
      })
    ).toEqual(['/repo/hydra/wt-a', '/repo/hydra/wt-b', '/repo/hydra/wt-c'])
  })

  it('covers only the clicked card when it is not part of the selection', () => {
    expect(
      resolveWorkspaceBoardStatusAssignmentTargets({
        clickedWorktreePath: '/repo/hydra/wt-z',
        selectedWorktreePaths: ['/repo/hydra/wt-a', '/repo/hydra/wt-b']
      })
    ).toEqual(['/repo/hydra/wt-z'])
  })

  it('covers the single selected card it was clicked on', () => {
    expect(
      resolveWorkspaceBoardStatusAssignmentTargets({
        clickedWorktreePath: '/repo/hydra/wt-a',
        selectedWorktreePaths: ['/repo/hydra/wt-a']
      })
    ).toEqual(['/repo/hydra/wt-a'])
  })

  it('covers the clicked card when nothing is selected at all', () => {
    expect(
      resolveWorkspaceBoardStatusAssignmentTargets({
        clickedWorktreePath: '/repo/hydra/wt-a',
        selectedWorktreePaths: []
      })
    ).toEqual(['/repo/hydra/wt-a'])
  })
})
