import type { StateCreator } from 'zustand'
import type { AppState } from '../types'
import type { GitHubSlice } from './slice-types'
import type { GitHubPRRefreshCandidate } from '../../shared/github/pull-request-refresh-types'
import { bypassesGitHubPRRefreshFreshness } from './pr-refresh-state'
import {
  enqueueLocalGitHubPRRefresh,
  getPRRefreshRuntimeRepoTarget,
  shouldEnqueueLocalPRRefresh
} from './repository-routing'
import { buildPRRefreshCandidate, findWorktreeById } from './worktree-refresh'

export const createRefreshRoutingActions = (
  set: Parameters<StateCreator<AppState>>[0],
  get: Parameters<StateCreator<AppState>>[1]
): Pick<
  GitHubSlice,
  | 'enqueueGitHubPRRefresh'
  | 'reportVisibleGitHubPRRefreshCandidates'
  | 'bumpGitHubPRVisibleRefreshGeneration'
> => ({
  enqueueGitHubPRRefresh: (worktreeId, reason, priority = 0) => {
    const state = get()
    const worktree = findWorktreeById(state, worktreeId)
    const candidate = worktree ? buildPRRefreshCandidate(state, worktree) : null
    if (!candidate) {
      return
    }
    if (getPRRefreshRuntimeRepoTarget(state, candidate)) {
      void get().fetchPRForBranch(candidate.repoPath, candidate.branch, {
        force: bypassesGitHubPRRefreshFreshness(reason),
        repoId: candidate.repoId,
        worktreeId: candidate.worktreeId,
        linkedPRNumber: candidate.linkedPRNumber ?? null,
        fallbackPRNumber: candidate.fallbackPRNumber ?? null,
        fallbackPRSource: candidate.fallbackPRSource ?? null,
        reason
      })
      return
    }
    if (!shouldEnqueueLocalPRRefresh(candidate)) {
      return
    }
    enqueueLocalGitHubPRRefresh({ candidate, reason, priority }, async () => {
      await get().fetchPRForBranch(candidate.repoPath, candidate.branch, {
        force: bypassesGitHubPRRefreshFreshness(reason),
        repoId: candidate.repoId,
        worktreeId: candidate.worktreeId,
        linkedPRNumber: candidate.linkedPRNumber ?? null,
        fallbackPRNumber: candidate.fallbackPRNumber ?? null,
        fallbackPRSource: candidate.fallbackPRSource ?? null,
        reason
      })
    })
  },

  reportVisibleGitHubPRRefreshCandidates: (worktreeIds, generation) => {
    // Why probe: Hydra has not wired the PR-refresh coordinator yet — `findWorktreeById`,
    // `buildPRRefreshCandidate`, `getPRRefreshRuntimeRepoTarget` and the `window.api.gh` bridge
    // are all port stubs (null) or absent under Tauri. The sidebar's visible-row reporter calls
    // this on every window change, so degrade to "nothing to report" instead of throwing out of
    // a render effect.
    const reportVisible = window.api?.gh?.reportVisiblePRRefreshCandidates
    if (
      !reportVisible ||
      typeof findWorktreeById !== 'function' ||
      typeof buildPRRefreshCandidate !== 'function'
    ) {
      return
    }
    const state = get()
    const candidates = worktreeIds
      .map((id) => {
        const worktree = findWorktreeById(state, id)
        return worktree ? buildPRRefreshCandidate(state, worktree) : null
      })
      .filter((candidate): candidate is GitHubPRRefreshCandidate => candidate !== null)
    const localCandidates: GitHubPRRefreshCandidate[] = []
    for (const candidate of candidates) {
      if (getPRRefreshRuntimeRepoTarget(state, candidate)) {
        void get().fetchPRForBranch(candidate.repoPath, candidate.branch, {
          repoId: candidate.repoId,
          worktreeId: candidate.worktreeId,
          linkedPRNumber: candidate.linkedPRNumber ?? null,
          fallbackPRNumber: candidate.fallbackPRNumber ?? null,
          fallbackPRSource: candidate.fallbackPRSource ?? null,
          reason: 'visible'
        })
        continue
      }
      if (shouldEnqueueLocalPRRefresh(candidate)) {
        localCandidates.push(candidate)
      }
    }
    void reportVisible({ candidates: localCandidates, generation }).catch((err: unknown) => {
      console.warn('Failed to report visible PR refresh candidates:', err)
    })
  },

  bumpGitHubPRVisibleRefreshGeneration: () => {
    set((s: any) => ({ prVisibleRefreshGeneration: s.prVisibleRefreshGeneration + 1 }))
  }
})
