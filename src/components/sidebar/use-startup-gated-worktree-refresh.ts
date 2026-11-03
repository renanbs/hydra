import { useEffect, useRef } from 'react'

import { shouldFetchWorktreesForRepoCountChange } from '../../store/slices/worktrees/listing/fetch-all-worktrees'

export type StartupGatedWorktreeRefreshArgs = {
  /** Repo count rendered by the sidebar (App's catalog projects). */
  repoCount: number
  /** Set by App once the first authoritative all-repo scan settles (D01-006). */
  startupWorktreeRefreshCompleted: boolean
  /** Store full-scan action; gated again inside the action itself. */
  fetchAllWorktrees: () => Promise<void>
}

/**
 * Sidebar-side policy of Orca `components/sidebar/index.tsx:116-125`:
 * after startup, a full refresh runs only when the repo count changes.
 *
 * The count ref (rather than the repos array) is what makes runtime-status
 * oscillation inert: `runtimeStatusByEnvironmentId` churns on reconnect and
 * can republish the same repo set, but the count stays equal, so the effect
 * does not fire. The epoch/in-flight pair is the second guard — if the count
 * really does flip while a scan is still running (host reconnect adding and
 * dropping the same repo), the second change joins the running scan instead of
 * queueing another one, and only the epoch that owns the scan clears the flag.
 */
export function useStartupGatedWorktreeRefresh({
  repoCount,
  startupWorktreeRefreshCompleted,
  fetchAllWorktrees,
}: StartupGatedWorktreeRefreshArgs): void {
  const previousRepoCountRef = useRef(repoCount)
  const inFlightRef = useRef(false)
  const epochRef = useRef(0)

  useEffect(() => {
    const previousRepoCount = previousRepoCountRef.current
    previousRepoCountRef.current = repoCount

    if (
      !shouldFetchWorktreesForRepoCountChange({
        startupWorktreeRefreshCompleted,
        previousRepoCount,
        repoCount,
      }) ||
      inFlightRef.current
    ) {
      return
    }

    const epoch = epochRef.current + 1
    epochRef.current = epoch
    inFlightRef.current = true

    void fetchAllWorktrees().finally(() => {
      if (epochRef.current === epoch) {
        inFlightRef.current = false
      }
    })
  }, [repoCount, startupWorktreeRefreshCompleted, fetchAllWorktrees])
}
