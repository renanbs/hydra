// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/use-worktree-card-lifecycle-effects.ts
//
// D04b-013: card lifecycle data. The card mounts fetch-once for the visible
// linked items (hosted review, GitHub issue, Linear issue) instead of polling
// the world, then keeps them fresh while the window is visible:
// hosted-review poll with jitter + hidden-window pause, GitHub issue poll at
// 5 min gated on window visibility, Linear initial fetch + focus/visibility
// listeners, and on-demand refetch when the hover opens.
import { useEffect } from 'react'
import { installWindowVisibilityInterval, isWindowVisible } from '../../lib/window-visibility-interval'
import { useAppStore } from '../../store'
import { HOSTED_REVIEW_CARD_REFRESH_INTERVAL_MS, isWebClient } from './worktree-card-model'

export type WorktreeCardLifecycleDeps = {
  worktreeId: string
  repoPath: string
  repoId?: string
  branch?: string
  linkedIssue?: number | null
  linkedLinearIssue?: string | null
  linkedGitLabMR?: number | null
  linkedBitbucketPR?: number | null
  linkedAzureDevOpsPR?: number | null
  linkedGiteaPR?: number | null
  hostedReviewCacheKey?: string
  shouldRefreshHostedReview: boolean
  /** True while the details hover is open (Orca `hoverDetailsOpen`). */
  hoverOpen?: boolean
  /** Gated by the jira-issue card property downstream; kept for parity. */
  showJiraIssue?: boolean
}

const GITHUB_ISSUE_POLL_MS = 5 * 60_000

/**
 * Runs the Orca card data lifecycle against the Hydra store slices.
 * Test seam: pass store-backed callbacks; production wires the real slice actions.
 */
export function useWorktreeCardLifecycleEffects(deps: WorktreeCardLifecycleDeps): void {
  const {
    worktreeId,
    repoPath,
    repoId,
    branch,
    linkedIssue,
    linkedLinearIssue,
    hostedReviewCacheKey,
    shouldRefreshHostedReview,
    hoverOpen
  } = deps

  const fetchHostedReviewForBranch = useAppStore((s) => (s as unknown as { fetchHostedReviewForBranch?: (args: { repoPath: string; branch: string; repoId?: string; force?: boolean }) => void }).fetchHostedReviewForBranch)
  const fetchIssue = useAppStore((s) => (s as unknown as { fetchIssue?: (repoPath: string, number: number, options?: { repoId?: string }) => void }).fetchIssue)
  const prefetchLinearIssues = useAppStore((s) => (s as unknown as { prefetchLinearIssues?: (identifiers: string[]) => void }).prefetchLinearIssues)

  // Hosted review: initial fetch + visibility-gated poll when the card wants it.
  // Rosetta Orca: paired web clients skip per-card decoration RPCs at startup.
  useEffect(() => {
    if (isWebClient()) {
      return
    }
    if (!branch || !repoPath || !shouldRefreshHostedReview || !fetchHostedReviewForBranch) {
      return
    }
    fetchHostedReviewForBranch({ repoPath, branch, ...(repoId ? { repoId } : {}) })
    return installWindowVisibilityInterval({
      run: () => {
        fetchHostedReviewForBranch({ repoPath, branch, ...(repoId ? { repoId } : {}) })
      },
      intervalMs: HOSTED_REVIEW_CARD_REFRESH_INTERVAL_MS,
      jitterOnVisible: true
    })
  }, [branch, fetchHostedReviewForBranch, repoId, repoPath, shouldRefreshHostedReview])

  // Hosted review: on-demand refetch when the hover opens.
  useEffect(() => {
    if (!hoverOpen || !branch || !repoPath || !fetchHostedReviewForBranch) {
      return
    }
    fetchHostedReviewForBranch({ repoPath, branch, ...(repoId ? { repoId } : {}), force: true })
  }, [hoverOpen, branch, fetchHostedReviewForBranch, repoId, repoPath])

  // GitHub issue: initial fetch + 5-min poll gated on window visibility.
  const linkedIssueNumber = typeof linkedIssue === 'number' ? linkedIssue : null
  useEffect(() => {
    if (linkedIssueNumber === null || !fetchIssue) {
      return
    }
    if (!isWindowVisible()) {
      return
    }
    fetchIssue(repoPath, linkedIssueNumber, ...(repoId ? [{ repoId }] : []))
    return installWindowVisibilityInterval({
      run: () => {
        fetchIssue(repoPath, linkedIssueNumber, ...(repoId ? [{ repoId }] : []))
      },
      intervalMs: GITHUB_ISSUE_POLL_MS
    })
  }, [fetchIssue, linkedIssueNumber, repoId, repoPath])

  // GitHub issue: on-demand refetch when the hover opens.
  useEffect(() => {
    if (!hoverOpen || linkedIssueNumber === null || !fetchIssue) {
      return
    }
    fetchIssue(repoPath, linkedIssueNumber, ...(repoId ? [{ repoId }] : []))
  }, [hoverOpen, fetchIssue, linkedIssueNumber, repoId, repoPath])

  // Linear: initial fetch + window focus / visibilitychange listeners.
  useEffect(() => {
    if (!linkedLinearIssue || !prefetchLinearIssues) {
      return
    }
    prefetchLinearIssues([linkedLinearIssue])
    const refetch = (): void => {
      prefetchLinearIssues([linkedLinearIssue as string])
    }
    window.addEventListener('focus', refetch)
    document.addEventListener('visibilitychange', refetch)
    return () => {
      window.removeEventListener('focus', refetch)
      document.removeEventListener('visibilitychange', refetch)
    }
  }, [linkedLinearIssue, prefetchLinearIssues])

  // Linear: on-demand refetch when the hover opens.
  useEffect(() => {
    if (!hoverOpen || !linkedLinearIssue || !prefetchLinearIssues) {
      return
    }
    prefetchLinearIssues([linkedLinearIssue])
  }, [hoverOpen, linkedLinearIssue, prefetchLinearIssues])

  // Silence unused (kept in deps for parity with the Orca signature).
  void worktreeId
  void hostedReviewCacheKey
}
