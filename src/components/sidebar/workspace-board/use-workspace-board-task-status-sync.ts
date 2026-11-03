import { useCallback } from 'react'
import { useAppStore } from '@/store'
import type { WorkspaceStatus } from '../../../shared/worktree/types'
import {
  isWorkspaceBoardTaskStatusSyncSupported,
  maybeGetWorkspaceBoardTaskStatusSyncRequest,
} from './workspace-board-task-status-sync'
import type { WorkspaceBoardCard } from './workspace-board-worktrees'

/**
 * Ported shape of Orca `useWorkspaceBoardTaskStatusSync`, with the mutation half
 * guarded off.
 *
 * The preference (`syncTaskStatusFromWorkspaceBoard`) exists and is persisted, but
 * nothing reads it because the settings switch is deliberately absent: without a
 * Linear issue-state mutation the switch would be inert. What exists here is the
 * request builder wired to the drop path, so the day the mutation lands this hook
 * is the only file that changes.
 */
export function useWorkspaceBoardTaskStatusSync(args: {
  worktreeById: ReadonlyMap<string, WorkspaceBoardCard>
}): (worktreeIds: readonly string[], status: WorkspaceStatus) => void {
  // Why the narrow cast: the preference lives in the UI slice and is persisted, but the
  // composed `AppState` surface has not exposed it yet. The switch that would set it is
  // absent (no sync engine), so this read is the request builder's only consumer.
  const enabled = useAppStore(
    (state) =>
      (state as unknown as { syncTaskStatusFromWorkspaceBoard?: boolean })
        .syncTaskStatusFromWorkspaceBoard === true
  )
  const workspaceStatuses = useAppStore((state) => state.workspaceStatuses)

  return useCallback(
    (worktreeIds, status) => {
      if (!enabled) {
        return
      }
      const worktreesById = new Map(
        [...args.worktreeById].map(([worktreeId, card]) => [
          worktreeId,
          { workspaceStatus: card.worktree.status ?? undefined },
        ])
      )
      // Why this call still runs while unsupported: it is the guard. It returns
      // null before any provider read, so a future mutation cannot fire on a drop
      // that changed nothing.
      maybeGetWorkspaceBoardTaskStatusSyncRequest({
        enabled,
        worktreeIds,
        status,
        worktreesById,
        workspaceStatuses,
      })
      if (!isWorkspaceBoardTaskStatusSyncSupported()) {
        return
      }
    },
    [args.worktreeById, enabled, workspaceStatuses]
  )
}
