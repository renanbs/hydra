// Rosetta D08-044: per-worktree queue, owner settings, workflow-state
// match, already-in-state skip, local-first abort, batched aggregate.
// Reference: `src/reference/components/sidebar/workspace-board-task-status-sync.ts`.
import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  getWorkspaceBoardTaskStatusSyncRequest,
  resetWorkspaceBoardTaskStatusSyncForTests,
  syncWorkspaceBoardTaskStatuses
} from './workspace-board-task-status-sync-engine'

const STATUSES = [
  { id: 'todo', label: 'Todo' },
  { id: 'done', label: 'Done' }
] as never[]

const ISSUE = {
  id: 'iss-1',
  identifier: 'ENG-1',
  state: { name: 'Todo', type: 'unstarted' },
  team: { id: 'team-1' },
  workspaceId: 'ws-1'
} as never

function args(overrides = {}) {
  return {
    worktreeIds: ['wt-1'],
    targetStatus: STATUSES[1],
    worktreesById: new Map([['wt-1', { linkedLinearIssue: 'ENG-1', linkedLinearIssueWorkspaceId: null }]]),
    settings: {},
    getLatestWorkspaceStatus: () => 'done',
    ...overrides
  }
}

beforeEach(() => {
  resetWorkspaceBoardTaskStatusSyncForTests()
})

describe('workspace-board-task-status-sync-engine (D08-044)', () => {
  it('builds no request when the selection already sits in the target status', () => {
    const request = getWorkspaceBoardTaskStatusSyncRequest({
      enabled: true,
      worktreeIds: ['wt-1'],
      status: 'done',
      worktreesById: new Map([['wt-1', { workspaceStatus: 'done' }]]),
      workspaceStatuses: STATUSES
    })
    expect(request).toBeNull()
  })

  it('skips when the issue already sits in the resolved workflow state', async () => {
    const deps = {
      getIssue: vi.fn(async () => ISSUE),
      teamStates: vi.fn(async () => [{ id: 'st-todo', name: 'Todo', type: 'unstarted' }]),
      updateIssue: vi.fn(async () => ({ ok: true as const }))
    }
    const result = await syncWorkspaceBoardTaskStatuses({
      ...args({ targetStatus: STATUSES[0] }),
      deps
    } as never)
    expect(result).toMatchObject({ updated: 0, skipped: 1, failed: 0 })
    expect(deps.updateIssue).not.toHaveBeenCalled()
  })

  it('updates the issue to the matched workflow state', async () => {
    const deps = {
      getIssue: vi.fn(async () => ISSUE),
      teamStates: vi.fn(async () => [{ id: 'st-done', name: 'Done', type: 'completed' }]),
      updateIssue: vi.fn(async () => ({ ok: true as const }))
    }
    const result = await syncWorkspaceBoardTaskStatuses({
      ...args({ getLatestWorkspaceStatus: () => 'done' }),
      deps
    } as never)
    expect(deps.updateIssue).toHaveBeenCalledWith(
      {},
      'iss-1',
      { stateId: 'st-done' },
      'ws-1'
    )
    expect(result.updated).toBe(1)
  })

  it('skips with a message when no workflow state matches', async () => {
    const deps = {
      getIssue: vi.fn(async () => ISSUE),
      teamStates: vi.fn(async () => [{ id: 'st-x', name: 'Other', type: 'unstarted' }]),
      updateIssue: vi.fn(async () => ({ ok: true as const }))
    }
    const result = await syncWorkspaceBoardTaskStatuses({ ...args(), deps } as never)
    expect(result.skipped).toBe(1)
    expect(result.messages[0]).toMatchObject({ kind: 'missing-workflow-state' })
  })

  it('aborts when the local status moves before the provider answers', async () => {
    let latest = 'todo'
    const deps = {
      getIssue: vi.fn(async () => {
        latest = 'todo'
        return ISSUE
      }),
      teamStates: vi.fn(async () => [{ id: 'st-done', name: 'Done', type: 'completed' }]),
      updateIssue: vi.fn(async () => ({ ok: true as const }))
    }
    const result = await syncWorkspaceBoardTaskStatuses({
      ...args({ getLatestWorkspaceStatus: () => latest }),
      deps
    } as never)
    expect(result.skipped).toBe(1)
    expect(deps.updateIssue).not.toHaveBeenCalled()
  })
})
