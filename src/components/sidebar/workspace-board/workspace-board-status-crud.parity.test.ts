import { describe, expect, it } from 'vitest'
import type { WorkspaceStatusDefinition } from '../../../shared/worktree/types'
import {
  addWorkspaceStatus,
  moveWorkspaceStatus,
  planWorkspaceStatusRemoval,
  renameWorkspaceStatus,
  setWorkspaceStatusColor,
  setWorkspaceStatusIcon,
} from './workspace-board-status-crud'

const STATUSES: WorkspaceStatusDefinition[] = [
  { id: 'todo', label: 'Todo' },
  { id: 'in-progress', label: 'In progress' },
  { id: 'in-review', label: 'In review' },
  { id: 'completed', label: 'Done' },
]

describe('workspace board status CRUD', () => {
  it('adds a status with the next free label and a de-duplicated id', () => {
    const added = addWorkspaceStatus(STATUSES)

    expect(added).toHaveLength(5)
    expect(added[4]).toEqual({ id: 'status-5', label: 'Status 5' })

    // A taken slug falls through to the suffix rule instead of shadowing a lane.
    const taken: WorkspaceStatusDefinition[] = [
      { id: 'todo', label: 'Todo' },
      { id: 'status-5', label: 'Taken' },
      { id: 'in-review', label: 'In review' },
      { id: 'completed', label: 'Done' },
    ]
    expect(addWorkspaceStatus(taken)[4]).toEqual({ id: 'status-5-2', label: 'Status 5' })
  })

  it('renames only the target lane and refuses an empty label', () => {
    const renamed = renameWorkspaceStatus(STATUSES, 'in-review', '  QA  ')

    expect(renamed[2].label).toBe('QA')
    expect(renamed[0].label).toBe('Todo')
    expect(renameWorkspaceStatus(STATUSES, 'in-review', '   ')[2].label).toBe('In review')
  })

  it('changes color and icon only on the target lane', () => {
    expect(setWorkspaceStatusColor(STATUSES, 'todo', 'rose')[0].color).toBe('rose')
    expect(setWorkspaceStatusColor(STATUSES, 'todo', 'rose')[1].color).toBeUndefined()
    expect(setWorkspaceStatusIcon(STATUSES, 'completed', 'flag')[3].icon).toBe('flag')
    expect(setWorkspaceStatusIcon(STATUSES, 'completed', 'flag')[2].icon).toBeUndefined()
  })

  it('moves a lane one slot and ignores out-of-range moves', () => {
    expect(moveWorkspaceStatus(STATUSES, 'in-review', -1).map((s) => s.id)).toEqual([
      'todo',
      'in-review',
      'in-progress',
      'completed',
    ])
    expect(moveWorkspaceStatus(STATUSES, 'todo', -1).map((s) => s.id)).toEqual(
      STATUSES.map((s) => s.id)
    )
    expect(moveWorkspaceStatus(STATUSES, 'completed', 1).map((s) => s.id)).toEqual(
      STATUSES.map((s) => s.id)
    )
  })

  it('removes a lane through the survivor that slides into its slot, with migrations', () => {
    const worktrees = [
      { path: '/repo/wt-a', status: 'in-progress' },
      { path: '/repo/wt-b', status: 'completed' },
      { path: '/repo/wt-c', status: 'in-progress' },
      { path: '/repo/wt-d', status: 'todo' },
    ]

    const plan = planWorkspaceStatusRemoval(STATUSES, 'in-progress', worktrees)

    expect(plan?.statuses.map((status) => status.id)).toEqual(['todo', 'in-review', 'completed'])
    expect(plan?.fallbackStatusId).toBe('in-review')
    expect(plan?.migrations).toEqual([
      { worktreePath: '/repo/wt-a', status: 'in-review' },
      { worktreePath: '/repo/wt-c', status: 'in-review' },
    ])
  })

  it('migrates the lane that falls back to the default status, not just exact ids', () => {
    // `wt-a` persists nothing, so its lane is the default id — removing that lane has to
    // move it too, or the write would leave a workspace on a lane that no longer exists.
    const plan = planWorkspaceStatusRemoval(
      STATUSES,
      'in-progress',
      [{ path: '/repo/wt-a', status: null }]
    )

    expect(plan?.migrations).toEqual([{ worktreePath: '/repo/wt-a', status: 'in-review' }])
  })

  it('uses the last surviving lane when the removed one was last', () => {
    const plan = planWorkspaceStatusRemoval(STATUSES, 'completed', [])

    expect(plan?.fallbackStatusId).toBe('in-review')
  })

  it('refuses to remove the last lane and ignores an unknown id', () => {
    expect(planWorkspaceStatusRemoval([{ id: 'todo', label: 'Todo' }], 'todo', [])).toBeNull()
    expect(planWorkspaceStatusRemoval(STATUSES, 'ghost', [])).toBeNull()
  })
})
