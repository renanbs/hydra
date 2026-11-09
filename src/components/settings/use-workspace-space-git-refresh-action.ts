// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: renderer/src/components/status-bar/use-workspace-space-git-refresh-action.ts
// Adaptations: Hydra fetches via the worktree-git-status slice (local,
// get_detailed_git_status_cmd) instead of the Orca runtime git client with
// executionHost routing. Same dedup semantics (generation + in-flight set).
import { useCallback } from 'react'
import { useAppStore } from '@/store'
import { getWorkspaceSpaceWorktreeIdentity } from './workspace-space-helpers'
import type { WorkspaceSpaceWorktree } from '@/store/slices/workspace-space-types'
import type { useWorkspaceSpaceManagerBindings } from './use-workspace-space-manager-bindings'

type WorkspaceSpaceManagerBindings = ReturnType<typeof useWorkspaceSpaceManagerBindings>

export function useWorkspaceSpaceGitRefreshAction(bindings: WorkspaceSpaceManagerBindings) {
  const {
    analysis,
    gitStatusByWorktreeIdentityRef,
    gitStatusScanGenerationRef,
    inFlightGitStatusRefreshes,
    setGitStatusByWorktreeIdentity,
    setGitRefreshStateByWorktreeId
  } = bindings

  const refreshWorkspaceGitStatus = useCallback(
    (worktree: WorkspaceSpaceWorktree): Promise<void> => {
      const identity = getWorkspaceSpaceWorktreeIdentity(worktree)
      const scanGeneration = analysis?.scannedAt ?? null
      const requestKey = `${String(scanGeneration)}:${identity}`
      if (
        gitStatusScanGenerationRef.current === scanGeneration &&
        gitStatusByWorktreeIdentityRef.current.has(identity)
      ) {
        return Promise.resolve()
      }
      if (inFlightGitStatusRefreshes.current.has(requestKey)) {
        return Promise.resolve()
      }
      inFlightGitStatusRefreshes.current.add(requestKey)

      setGitRefreshStateByWorktreeId((current) => ({
        ...current,
        [identity]: { isRefreshing: true, error: null }
      }))

      return useAppStore
        .getState()
        .fetchWorktreeGitStatus(worktree.worktreeId, worktree.path)
        .then((entries) => {
          if (gitStatusScanGenerationRef.current !== scanGeneration) {
            return
          }
          const nextStatus = new Map(gitStatusByWorktreeIdentityRef.current)
          nextStatus.set(identity, entries.map((e) => ({ path: e.path })))
          gitStatusByWorktreeIdentityRef.current = nextStatus
          setGitStatusByWorktreeIdentity(nextStatus)
          setGitRefreshStateByWorktreeId((current) => ({
            ...current,
            [identity]: { isRefreshing: false, error: null }
          }))
        })
        .catch((error: unknown) => {
          if (gitStatusScanGenerationRef.current !== scanGeneration) {
            return
          }
          setGitRefreshStateByWorktreeId((current) => ({
            ...current,
            [identity]: {
              isRefreshing: false,
              error: error instanceof Error ? error.message : String(error)
            }
          }))
        })
        .finally(() => {
          inFlightGitStatusRefreshes.current.delete(requestKey)
        })
    },
    [
      analysis?.scannedAt,
      gitStatusByWorktreeIdentityRef,
      gitStatusScanGenerationRef,
      inFlightGitStatusRefreshes,
      setGitRefreshStateByWorktreeId,
      setGitStatusByWorktreeIdentity
    ]
  )

  return refreshWorkspaceGitStatus
}
