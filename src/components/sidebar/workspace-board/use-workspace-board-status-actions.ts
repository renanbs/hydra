// Board settings menu → store wiring. Ported from Orca
// `use-workspace-kanban-status-actions.ts`, minus the Linear task-sync toggle (Hydra
// has no sync engine) and with the removal migration routed through the app's own
// status writer (`onAssignWorktreeStatus` → `persistWorktreeStatus`), the same path the
// board's card drop and the worktree context menu already use.
import { useCallback } from 'react'
import { useAppStore } from '@/store'
import type { WorkspaceStatusDefinition } from '../../../shared/worktree/types'
import type { GitWorktreeInfo } from '../types'
import {
  addWorkspaceStatus,
  moveWorkspaceStatus,
  planWorkspaceStatusRemoval,
  renameWorkspaceStatus,
  setWorkspaceStatusColor,
  setWorkspaceStatusIcon,
} from './workspace-board-status-crud'

export type WorkspaceBoardStatusActions = {
  workspaceStatuses: readonly WorkspaceStatusDefinition[]
  onAddStatus: () => void
  onRenameStatus: (statusId: string, label: string) => void
  onChangeStatusColor: (statusId: string, color: string) => void
  onChangeStatusIcon: (statusId: string, icon: string) => void
  onMoveStatus: (statusId: string, direction: -1 | 1) => void
  onRemoveStatus: (statusId: string) => void
}

export function useWorkspaceBoardStatusActions(args: {
  /** Every workspace, unfiltered — a hidden workspace must still migrate off a removed lane. */
  allWorktrees: readonly GitWorktreeInfo[]
  onAssignWorktreeStatus: (worktreePath: string, status: string) => void | Promise<void>
}): WorkspaceBoardStatusActions {
  const { allWorktrees, onAssignWorktreeStatus } = args
  const workspaceStatuses = useAppStore((state) => state.workspaceStatuses)
  const setWorkspaceStatuses = useAppStore((state) => state.setWorkspaceStatuses)
  const recordFeatureInteraction = useAppStore((state) => state.recordFeatureInteraction)

  const commit = useCallback(
    (next: WorkspaceStatusDefinition[]) => {
      setWorkspaceStatuses(next)
      void recordFeatureInteraction('workspace-board-actions').catch(console.error)
    },
    [recordFeatureInteraction, setWorkspaceStatuses]
  )

  const onAddStatus = useCallback(() => {
    commit(addWorkspaceStatus(workspaceStatuses))
  }, [commit, workspaceStatuses])

  const onRenameStatus = useCallback(
    (statusId: string, label: string) => {
      commit(renameWorkspaceStatus(workspaceStatuses, statusId, label))
    },
    [commit, workspaceStatuses]
  )

  const onChangeStatusColor = useCallback(
    (statusId: string, color: string) => {
      commit(setWorkspaceStatusColor(workspaceStatuses, statusId, color))
    },
    [commit, workspaceStatuses]
  )

  const onChangeStatusIcon = useCallback(
    (statusId: string, icon: string) => {
      commit(setWorkspaceStatusIcon(workspaceStatuses, statusId, icon))
    },
    [commit, workspaceStatuses]
  )

  const onMoveStatus = useCallback(
    (statusId: string, direction: -1 | 1) => {
      commit(moveWorkspaceStatus(workspaceStatuses, statusId, direction))
    },
    [commit, workspaceStatuses]
  )

  const onRemoveStatus = useCallback(
    (statusId: string) => {
      const plan = planWorkspaceStatusRemoval(workspaceStatuses, statusId, allWorktrees)
      if (!plan) {
        return
      }
      commit(plan.statuses)
      // Why no await-all: each write is the app's own idempotent per-worktree write, and the
      // lane is already gone from the board — a slow host must not block the others.
      for (const migration of plan.migrations) {
        void Promise.resolve(
          onAssignWorktreeStatus(migration.worktreePath, migration.status)
        ).catch(console.error)
      }
    },
    [allWorktrees, commit, onAssignWorktreeStatus, workspaceStatuses]
  )

  return {
    workspaceStatuses,
    onAddStatus,
    onRenameStatus,
    onChangeStatusColor,
    onChangeStatusIcon,
    onMoveStatus,
    onRemoveStatus,
  }
}
