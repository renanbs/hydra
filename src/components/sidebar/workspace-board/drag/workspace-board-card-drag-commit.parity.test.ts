// What a card drop writes: the destination lane's status through the app's own persistence
// path, and nothing at all when the card lands back where it started.
import { describe, expect, it } from 'vitest'
import { resolveWorkspaceBoardCardDragCommit } from './use-workspace-board-card-pointer-drag'

describe('workspace board card drag commit', () => {
  it('writes the destination status when the card changes lane', () => {
    expect(
      resolveWorkspaceBoardCardDragCommit({ sourceStatus: 'todo', targetStatus: 'completed' })
    ).toBe('completed')
  })

  it('is a no-op when the card is released over the lane it came from', () => {
    expect(
      resolveWorkspaceBoardCardDragCommit({ sourceStatus: 'todo', targetStatus: 'todo' })
    ).toBeNull()
  })

  it('commits nothing when the release resolves no lane', () => {
    expect(
      resolveWorkspaceBoardCardDragCommit({ sourceStatus: 'todo', targetStatus: null })
    ).toBeNull()
  })

  it('still moves a card whose lane could not be read at press time', () => {
    expect(
      resolveWorkspaceBoardCardDragCommit({ sourceStatus: null, targetStatus: 'in-review' })
    ).toBe('in-review')
  })
})
