// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Parity with Orca `components/sidebar/worktree-visibility-host-target.ts`: resolves which
// repo row (and which execution host) the visibility modal is mutating. Hydra's modal is
// props-driven instead of `modalData`-driven, so the target host arrives as an optional
// `hostId`; the resolution and the scope key (`'<host>\0<repoId>'`) match Orca exactly.
import { useCallback } from 'react'
import type { Repo } from '../../shared/repo-types'
import type { GlobalSettings } from '../../shared/global-settings-types'
import type { DetectedWorktreeListResult } from '../../shared/worktree/types'
import { findRepoForHost, getRepoHostIdentity } from '@/store/slices/repo-host-identity'
import {
  getWorktreeExecutionHostId,
  parseExecutionHostId,
  type ExecutionHostId
} from '../../shared/execution-host'

export type WorktreeVisibilityHostTargetState = {
  repos: readonly Repo[]
  settings: Pick<GlobalSettings, 'activeRuntimeEnvironmentId'> | null | undefined
  detectedWorktreesByRepo: Record<string, DetectedWorktreeListResult> | null | undefined
}

export function resolveWorktreeVisibilityHostTarget(
  state: WorktreeVisibilityHostTargetState,
  repoId: string,
  modalHostId: unknown
) {
  const requestedHostId =
    typeof modalHostId === 'string' ? parseExecutionHostId(modalHostId)?.id : undefined
  const repo = findRepoForHost(state.repos, repoId, {
    hostId: requestedHostId,
    settings: state.settings
  })
  const detectedForRepo = repoId ? state.detectedWorktreesByRepo?.[repoId] : undefined
  const detected =
    detectedForRepo && repo && requestedHostId
      ? {
          ...detectedForRepo,
          worktrees: detectedForRepo.worktrees.filter(
            (worktree) => getWorktreeExecutionHostId(worktree, repo) === requestedHostId
          )
        }
      : detectedForRepo
  const scope = repo ? getRepoHostIdentity(repo) : `${requestedHostId ?? ''}\0${repoId}`
  return { detected, repo, requestedHostId, scope }
}

export type WorktreeVisibilityFetchOptions = {
  requireAuthoritative?: boolean
  executionHostId?: ExecutionHostId
}

export type WorktreeVisibilityUpdateOptions = { hostId?: ExecutionHostId }

/**
 * Wraps the modal's fetch/update actions so both carry the resolved target host. Orca applies
 * the same `executionHostId`/`hostId` scope to `fetchWorktrees`/`updateRepo`; Hydra's modal
 * backs those with the Tauri catalog commands.
 */
export function useWorktreeVisibilityHostActions<TUpdate, TResult>(
  fetchWorktrees: (repoId: string, options: WorktreeVisibilityFetchOptions) => Promise<boolean>,
  updateRepo: (
    repoId: string,
    updates: TUpdate,
    options?: WorktreeVisibilityUpdateOptions
  ) => Promise<TResult>,
  requestedHostId: ExecutionHostId | undefined
) {
  const refreshTargetRepo = useCallback(
    (repoId: string, options?: WorktreeVisibilityFetchOptions) =>
      fetchWorktrees(repoId, {
        ...options,
        ...(requestedHostId ? { executionHostId: requestedHostId } : {})
      }),
    [fetchWorktrees, requestedHostId]
  )
  const updateTargetRepo = useCallback(
    (repoId: string, updates: TUpdate) =>
      requestedHostId
        ? updateRepo(repoId, updates, { hostId: requestedHostId })
        : updateRepo(repoId, updates),
    [requestedHostId, updateRepo]
  )
  return { refreshTargetRepo, updateTargetRepo }
}
