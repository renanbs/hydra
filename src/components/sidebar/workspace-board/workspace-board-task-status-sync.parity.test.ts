import { describe, expect, it } from 'vitest'
import { cloneDefaultWorkspaceStatuses } from '../../../shared/workspace-statuses'
import type { Worktree } from '../../../shared/worktree/types'
import {
  getWorkspaceBoardTaskStatusSyncRequest,
  isWorkspaceBoardTaskStatusSyncSupported,
  maybeGetWorkspaceBoardTaskStatusSyncRequest,
} from './workspace-board-task-status-sync'

const STATUSES = cloneDefaultWorkspaceStatuses()

function worktree(workspaceStatus?: string): Pick<Worktree, 'workspaceStatus'> {
  return { workspaceStatus }
}

describe('workspace board task status sync request (D08-045)', () => {
  it('returns null while the preference is disabled or there is nothing selected', () => {
    const worktreesById = new Map([['wt-a', worktree('todo')]])

    expect(
      getWorkspaceBoardTaskStatusSyncRequest({
        enabled: false,
        worktreeIds: ['wt-a'],
        status: 'completed',
        worktreesById,
        workspaceStatuses: STATUSES,
      })
    ).toBeNull()

    expect(
      getWorkspaceBoardTaskStatusSyncRequest({
        enabled: true,
        worktreeIds: [],
        status: 'completed',
        worktreesById,
        workspaceStatuses: STATUSES,
      })
    ).toBeNull()
  })

  it('returns null when the target status is not defined', () => {
    expect(
      getWorkspaceBoardTaskStatusSyncRequest({
        enabled: true,
        worktreeIds: ['wt-a'],
        status: 'ghost',
        worktreesById: new Map([['wt-a', worktree('todo')]]),
        workspaceStatuses: STATUSES,
      })
    ).toBeNull()
  })

  it('dedupes ids, drops worktrees already in the target status and keeps the target definition', () => {
    const request = getWorkspaceBoardTaskStatusSyncRequest({
      enabled: true,
      worktreeIds: ['wt-a', 'wt-a', 'wt-b', 'wt-c', 'missing'],
      status: 'completed',
      worktreesById: new Map([
        ['wt-a', worktree('todo')],
        ['wt-b', worktree('completed')],
        ['wt-c', worktree('in-progress')],
      ]),
      workspaceStatuses: STATUSES,
    })

    expect(request?.worktreeIds).toEqual(['wt-a', 'wt-c'])
    expect(request?.targetStatus.id).toBe('completed')
    expect(request?.targetStatus.label).toBe('Done')
  })

  it('returns null when every selected worktree is already in the target status', () => {
    expect(
      getWorkspaceBoardTaskStatusSyncRequest({
        enabled: true,
        worktreeIds: ['wt-b'],
        status: 'completed',
        worktreesById: new Map([['wt-b', worktree('completed')]]),
        workspaceStatuses: STATUSES,
      })
    ).toBeNull()
  })

  it('is guarded off until a Linear issue-state mutation exists', () => {
    expect(isWorkspaceBoardTaskStatusSyncSupported()).toBe(false)
    expect(
      maybeGetWorkspaceBoardTaskStatusSyncRequest({
        enabled: true,
        worktreeIds: ['wt-a'],
        status: 'completed',
        worktreesById: new Map([['wt-a', worktree('todo')]]),
        workspaceStatuses: STATUSES,
      })
    ).toBeNull()
  })
})
