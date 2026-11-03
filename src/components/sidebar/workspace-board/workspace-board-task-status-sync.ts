import type { WorkspaceStatus, WorkspaceStatusDefinition, Worktree } from '../../../shared/worktree/types'
import { getWorkspaceStatus } from '../../../shared/workspace-statuses'

/**
 * Request the board hands to the Linear task-status sync.
 *
 * Ported from Orca `workspace-board-task-status-sync` (the request half). The
 * mutation half — reading the linked issue, resolving the team's workflow states
 * and calling `linearUpdateIssue` — has no surface in Hydra: the runtime exposes
 * `linear.teamStates` reads and a `LinearMutationResult` type, but no issue-update
 * command (checked `src/runtime/**`, `src-tauri/src/**`). Until that lands, this
 * module stays a pure filter so the drop path can never queue a write it cannot do.
 */
export type WorkspaceBoardTaskStatusSyncRequest = {
  worktreeIds: string[]
  targetStatus: WorkspaceStatusDefinition
}

/** Why not silently claim success: the capability is absent, and callers must know. */
export const WORKSPACE_BOARD_TASK_STATUS_SYNC_UNAVAILABLE_REASON =
  'Hydra exposes no Linear issue-state mutation; only team workflow-state reads exist.'

/**
 * False until a Linear issue-state mutation exists in the runtime. The hook uses
 * this as the guard instead of a dead call into a non-existent command.
 */
export function isWorkspaceBoardTaskStatusSyncSupported(): boolean {
  return false
}

/**
 * Builds the sync request, or `null` when there is nothing to sync.
 *
 * Why null and not an empty list: a disabled preference, an empty selection, an
 * unknown status and a selection already in the target status are all no-ops, and
 * the caller must not open a toast for any of them.
 */
export function getWorkspaceBoardTaskStatusSyncRequest(args: {
  enabled: boolean
  worktreeIds: readonly string[]
  status: WorkspaceStatus
  worktreesById: ReadonlyMap<string, Pick<Worktree, 'workspaceStatus'>>
  workspaceStatuses: readonly WorkspaceStatusDefinition[]
}): WorkspaceBoardTaskStatusSyncRequest | null {
  if (!args.enabled || args.worktreeIds.length === 0) {
    return null
  }
  const targetStatus = args.workspaceStatuses.find((item) => item.id === args.status)
  if (!targetStatus) {
    return null
  }
  const changedWorktreeIds = [...new Set(args.worktreeIds)].filter((worktreeId) => {
    const worktree = args.worktreesById.get(worktreeId)
    return worktree
      ? getWorkspaceStatus(worktree as Worktree, args.workspaceStatuses) !== args.status
      : false
  })
  if (changedWorktreeIds.length === 0) {
    return null
  }
  return { worktreeIds: changedWorktreeIds, targetStatus }
}

/**
 * The board-drop entry point. Returns the request it would sync, or `null`.
 *
 * Why it does not perform a write: the mutation surface does not exist. Returning
 * the request keeps the filter testable and makes the blocked half explicit, so a
 * future `linearUpdateIssue` only has to consume it — no caller changes.
 */
export function maybeGetWorkspaceBoardTaskStatusSyncRequest(args: {
  enabled: boolean
  worktreeIds: readonly string[]
  status: WorkspaceStatus
  worktreesById: ReadonlyMap<string, Pick<Worktree, 'workspaceStatus'>>
  workspaceStatuses: readonly WorkspaceStatusDefinition[]
}): WorkspaceBoardTaskStatusSyncRequest | null {
  if (!isWorkspaceBoardTaskStatusSyncSupported()) {
    return null
  }
  return getWorkspaceBoardTaskStatusSyncRequest(args)
}
