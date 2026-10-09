import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { WorkspaceStatusDefinition } from '../../../shared/worktree/types'
import { persistWorktreeStatus } from '../../../lib/worktree-status-persistence'
import { useAppStore } from '../../../store'
import { resetUiPrefsBridge } from '../../../store/ui-prefs-bridge'
import type { GitWorktreeInfo } from '../types'
import { useWorkspaceBoardStatusActions } from './use-workspace-board-status-actions'

const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }))
vi.mock('@tauri-apps/api/core', () => ({ invoke: invokeMock }))

const STATUSES: WorkspaceStatusDefinition[] = [
  { id: 'todo', label: 'Todo' },
  { id: 'in-progress', label: 'In progress' },
  { id: 'in-review', label: 'In review' },
  { id: 'completed', label: 'Done' },
]

function worktree(path: string, status?: string | null): GitWorktreeInfo {
  return { path, head_commit: 'aaa1111', branch: 'main', is_bare: false, is_locked: false, status }
}

const WORKTREES: GitWorktreeInfo[] = [
  worktree('/repo/wt-a', 'in-progress'),
  worktree('/repo/wt-b', 'completed'),
  worktree('/repo/wt-c', 'in-progress'),
]

/** Every `set_worktree_status` write the transport saw, in call order. */
function statusWrites(): unknown[][] {
  return invokeMock.mock.calls.filter(([command]) => command === 'set_worktree_status')
}

describe('useWorkspaceBoardStatusActions removal migration', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    invokeMock.mockReset()
    invokeMock.mockResolvedValue(undefined)
    useAppStore.setState({ workspaceStatuses: STATUSES.map((status) => ({ ...status })) })
  })

  afterEach(() => {
    act(() => {
      useAppStore.setState({ workspaceStatuses: STATUSES.map((status) => ({ ...status })) })
    })
    resetUiPrefsBridge()
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('writes the survivor once per migrated worktree and drops the lane', () => {
    const { result } = renderHook(() =>
      useWorkspaceBoardStatusActions({
        allWorktrees: WORKTREES,
        onAssignWorktreeStatus: persistWorktreeStatus,
      })
    )

    act(() => result.current.onRemoveStatus('in-progress'))

    expect(statusWrites()).toEqual([
      ['set_worktree_status', { worktreePath: '/repo/wt-a', status: 'in-review' }],
      ['set_worktree_status', { worktreePath: '/repo/wt-c', status: 'in-review' }],
    ])
    expect(
      useAppStore.getState().workspaceStatuses.map((status) => status.id)
    ).toEqual(['todo', 'in-review', 'completed'])
  })

  it('writes nothing when the removed lane is empty', () => {
    const { result } = renderHook(() =>
      useWorkspaceBoardStatusActions({
        allWorktrees: [worktree('/repo/wt-b', 'completed')],
        onAssignWorktreeStatus: persistWorktreeStatus,
      })
    )

    act(() => result.current.onRemoveStatus('in-progress'))

    expect(statusWrites()).toEqual([])
  })

  it('adds, renames and reorders through the store setter', () => {
    const { result } = renderHook(() =>
      useWorkspaceBoardStatusActions({
        allWorktrees: WORKTREES,
        onAssignWorktreeStatus: persistWorktreeStatus,
      })
    )

    act(() => result.current.onAddStatus())
    expect(useAppStore.getState().workspaceStatuses).toHaveLength(5)

    act(() => result.current.onRenameStatus('todo', 'Backlog'))
    expect(useAppStore.getState().workspaceStatuses[0].label).toBe('Backlog')

    act(() => result.current.onMoveStatus('todo', 1))
    expect(useAppStore.getState().workspaceStatuses.map((status) => status.id)).toEqual([
      'in-progress',
      'todo',
      'in-review',
      'completed',
      'status-5',
    ])
  })
})
