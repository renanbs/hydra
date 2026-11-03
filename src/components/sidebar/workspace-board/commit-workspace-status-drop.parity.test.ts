import { describe, expect, it, vi } from 'vitest'
import type { WorkspaceStatus } from '../../../shared/worktree/types'
import { commitWorkspaceStatusDocumentDrop } from './commit-workspace-status-drop'

describe('commitWorkspaceStatusDocumentDrop (Orca parity)', () => {
  it('prefers the batch pin writer when a surface has one', () => {
    const onPinWorktrees = vi.fn()
    const onPinWorktree = vi.fn()
    commitWorkspaceStatusDocumentDrop({
      worktreeIds: ['a', 'b'],
      status: null,
      isPinDrop: true,
      onMoveWorktreeToStatus: vi.fn(),
      onPinWorktree,
      onPinWorktrees,
    })
    expect(onPinWorktrees).toHaveBeenCalledWith(['a', 'b'])
    expect(onPinWorktree).not.toHaveBeenCalled()
  })

  it('falls back to one pin write per workspace', () => {
    const onPinWorktree = vi.fn()
    commitWorkspaceStatusDocumentDrop({
      worktreeIds: ['a', 'b'],
      status: null,
      isPinDrop: true,
      onMoveWorktreeToStatus: vi.fn(),
      onPinWorktree,
    })
    expect(onPinWorktree.mock.calls).toEqual([['a'], ['b']])
  })

  it('prefers the batch status writer, and falls back per id otherwise', () => {
    const status = 'in-progress' as WorkspaceStatus
    const onMoveWorktreesToStatus = vi.fn()
    const onMoveWorktreeToStatus = vi.fn()
    commitWorkspaceStatusDocumentDrop({
      worktreeIds: ['a'],
      status,
      isPinDrop: false,
      onMoveWorktreeToStatus,
      onMoveWorktreesToStatus,
      onPinWorktree: vi.fn(),
    })
    expect(onMoveWorktreesToStatus).toHaveBeenCalledWith(['a'], status)
    expect(onMoveWorktreeToStatus).not.toHaveBeenCalled()

    commitWorkspaceStatusDocumentDrop({
      worktreeIds: ['b', 'c'],
      status,
      isPinDrop: false,
      onMoveWorktreeToStatus,
      onPinWorktree: vi.fn(),
    })
    expect(onMoveWorktreeToStatus.mock.calls).toEqual([
      ['b', status],
      ['c', status],
    ])
  })

  it('does nothing without a destination status or a payload', () => {
    const onMoveWorktreeToStatus = vi.fn()
    commitWorkspaceStatusDocumentDrop({
      worktreeIds: ['a'],
      status: null,
      isPinDrop: false,
      onMoveWorktreeToStatus,
      onPinWorktree: vi.fn(),
    })
    commitWorkspaceStatusDocumentDrop({
      worktreeIds: [],
      status: 'todo' as WorkspaceStatus,
      isPinDrop: false,
      onMoveWorktreeToStatus,
      onPinWorktree: vi.fn(),
    })
    expect(onMoveWorktreeToStatus).not.toHaveBeenCalled()
  })
})
