import { requestProjectsRefresh } from '../../../../lib/refresh-projects-awaitable'
import type { WorktreeRefreshAllOptions } from '../../worktree-refresh-options'

/** The slice members this action reads; kept minimal so the live store can compose it. */
export type StartupWorktreeRefreshState = {
  startupWorktreeRefreshCompleted: boolean
}

export type WorktreeFullScan = () => Promise<unknown>

/**
 * Why the gate exists: App owns the startup scan, and the startup catalog can
 * arrive in several partial writes (local first, then each runtime host). Any
 * broad scan triggered from the sidebar before that first pass settles would
 * race the authoritative result and could purge or repaint rows from a partial
 * catalog.
 */
export function isFetchAllWorktreesBlockedByStartup(
  state: StartupWorktreeRefreshState
): boolean {
  return !state.startupWorktreeRefreshCompleted
}

/**
 * Sidebar policy for post-startup full scans: only a repo-count change (for
 * example adding or removing a project) justifies another all-repo scan.
 * `previousRepoCount` comes from a ref, so a render caused by runtime status
 * oscillation with the same repo set never re-triggers the scan.
 */
export function shouldFetchWorktreesForRepoCountChange(args: {
  startupWorktreeRefreshCompleted: boolean
  previousRepoCount: number
  repoCount: number
}): boolean {
  return (
    args.startupWorktreeRefreshCompleted &&
    args.repoCount > 0 &&
    args.previousRepoCount !== args.repoCount
  )
}

/**
 * Full-scan action shared by the ported worktree slice and the live store.
 * Concurrent triggers (repo-count changes landing while a scan is still
 * running) join the in-flight scan instead of starting a second one.
 */
export function createFetchAllWorktrees(
  _set: unknown,
  get: () => StartupWorktreeRefreshState,
  requestFullScan: WorktreeFullScan = requestProjectsRefresh
): (options?: WorktreeRefreshAllOptions) => Promise<void> {
  let inFlight: Promise<void> | null = null

  return () => {
    if (isFetchAllWorktreesBlockedByStartup(get())) {
      return Promise.resolve()
    }
    if (inFlight) {
      return inFlight
    }
    const run: Promise<void> = (async () => {
      await requestFullScan()
    })().finally(() => {
      if (inFlight === run) {
        inFlight = null
      }
    })
    inFlight = run
    return run
  }
}
