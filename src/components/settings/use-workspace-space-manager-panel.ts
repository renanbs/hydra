// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: renderer/src/components/status-bar/use-workspace-space-manager-panel.ts
// Adaptations: delete flows through Hydra's `delete_worktree` invoke
// (repoPath+worktreePath, force flag) instead of the Orca batch-delete
// machine; readiness gating comes from the ported decision projection.
import { useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { toast } from 'sonner'
import type { WorkspaceSpaceWorktree } from '@/store/slices/workspace-space-types'
import { translate } from '@/i18n/i18n'
import { useWorkspaceSpaceManagerBindings } from './use-workspace-space-manager-bindings'
import { useWorkspaceSpaceDecisionProjection } from './use-workspace-space-decision-projection'
import { useWorkspaceSpaceGitRefreshAction } from './use-workspace-space-git-refresh-action'
import { useWorkspaceSpaceManagerProjection } from './use-workspace-space-manager-projection'
import { getWorkspaceSpaceWorktreeIdentity } from './workspace-space-helpers'

export function useWorkspaceSpaceManagerPanel() {
  const bindings = useWorkspaceSpaceManagerBindings()
  const {
    removeWorkspaceSpaceWorktrees,
    setInspectedWorktreeId,
    setSelectedIds,
    setSortDirection,
    setSortKey,
    setTreemapZoomWorktreeId
  } = bindings
  const refresh = useCallback((): void => {
    void bindings.refreshWorkspaceSpace().catch(() => {
      /* scanError is stored by the slice */
    })
  }, [bindings])
  const cancelScan = useCallback((): void => {
    void bindings.cancelWorkspaceSpaceScan()
  }, [bindings])

  const decision = useWorkspaceSpaceDecisionProjection(bindings)
  const refreshWorkspaceGitStatus = useWorkspaceSpaceGitRefreshAction(bindings)
  const projection = useWorkspaceSpaceManagerProjection({
    bindings,
    decision,
    refreshWorkspaceGitStatus
  })
  const { selectedDeletableRows } = projection

  const handleDeletedWorktrees = useCallback(
    (deletedPaths: readonly string[]): void => {
      if (deletedPaths.length === 0) {
        return
      }
      removeWorkspaceSpaceWorktrees(deletedPaths)
      const current = bindings.inspectedWorktreeId
      if (current && deletedPaths.includes(current)) {
        setInspectedWorktreeId(null)
      }
      setTreemapZoomWorktreeId((zoomed) => (zoomed && deletedPaths.includes(zoomed) ? null : zoomed))
      setSelectedIds((selected) => {
        const next = new Set(selected)
        for (const p of deletedPaths) {
          next.delete(p)
        }
        return next
      })
      toast.success(
        deletedPaths.length === 1
          ? translate('auto.components.status.bar.WorkspaceSpaceManagerPanel.9afc97f9a3', 'Workspace deleted')
          : translate('auto.components.status.bar.WorkspaceSpaceManagerPanel.eee95708140', 'Workspaces deleted')
      )
    },
    [bindings.inspectedWorktreeId, removeWorkspaceSpaceWorktrees, setInspectedWorktreeId, setSelectedIds, setTreemapZoomWorktreeId]
  )

  const runDelete = useCallback(
    async (targets: readonly WorkspaceSpaceWorktree[], force: boolean): Promise<void> => {
      const deleted: string[] = []
      for (const target of targets) {
        if (!force && !window.confirm(`Delete workspace at ${target.path}? This cannot be undone.`)) {
          continue
        }
        try {
          await invoke('delete_worktree', {
            repoPath: target.repoPath,
            worktreePath: target.path,
            force
          })
          deleted.push(target.path)
        } catch (error) {
          toast.error(error instanceof Error ? error.message : String(error))
        }
      }
      handleDeletedWorktrees(deleted)
    },
    [handleDeletedWorktrees]
  )

  const deleteWorktrees = useCallback(
    (targets: readonly WorkspaceSpaceWorktree[]): void => {
      if (targets.length === 0) {
        return
      }
      void runDelete(targets, false)
    },
    [runDelete]
  )

  const forceDeleteWorktree = useCallback(
    (worktree: WorkspaceSpaceWorktree): void => {
      void runDelete([worktree], true)
    },
    [runDelete]
  )

  const deleteSelected = useCallback((): void => {
    deleteWorktrees(selectedDeletableRows)
  }, [deleteWorktrees, selectedDeletableRows])

  const toggleSort = useCallback(
    (key: 'size' | 'name' | 'repo' | 'activity'): void => {
      if (bindings.sortKey === key) {
        setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
        return
      }
      setSortKey(key)
      setSortDirection(key === 'name' || key === 'repo' ? 'asc' : 'desc')
    },
    [bindings.sortKey, setSortDirection, setSortKey]
  )

  const toggleSelection = useCallback(
    (worktree: WorkspaceSpaceWorktree): void => {
      const identity = getWorkspaceSpaceWorktreeIdentity(worktree)
      setSelectedIds((current) => {
        const next = new Set(current)
        if (next.has(identity)) {
          next.delete(identity)
        } else {
          next.add(identity)
        }
        return next
      })
    },
    [setSelectedIds]
  )

  const toggleVisibleSelection = useCallback((): void => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (projection.allVisibleSelected) {
        for (const id of projection.visibleDeletableIdentities) {
          next.delete(id)
        }
      } else {
        for (const id of projection.visibleDeletableIdentities) {
          next.add(id)
        }
      }
      return next
    })
  }, [projection.allVisibleSelected, projection.visibleDeletableIdentities, setSelectedIds])

  const selectSortKey = useCallback(
    (key: 'size' | 'name' | 'repo' | 'activity'): void => {
      setSortKey(key)
      setSortDirection(key === 'name' || key === 'repo' ? 'asc' : 'desc')
    },
    [setSortDirection, setSortKey]
  )

  return {
    ...bindings,
    ...decision,
    ...projection,
    deleteWorktrees,
    forceDeleteWorktree,
    deleteSelected,
    refresh,
    cancelScan,
    toggleSort,
    toggleSelection,
    toggleVisibleSelection,
    selectSortKey
  }
}
