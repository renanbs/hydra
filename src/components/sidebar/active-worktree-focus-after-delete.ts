// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/active-worktree-focus-after-delete.ts
// After deleting the workspace the user is currently viewing, leaving the active
// workspace empty loses their place. The committer focuses the next-best workspace
// once the delete succeeds — and only when the target WAS the active one, so a
// background delete never steals focus.
export type ActiveWorktreeFocusDependencies = {
  /** Captured up front: the deleted row is gone from the list once removal lands. */
  targetPath: string
  activeWorktreePath: string | null
  /** Reads the CURRENT active path at commit time (a concurrent activation may win). */
  getActiveWorktreePath: () => string | null
  /** Sibling preference: another workspace of the same project, then the primary. */
  pickNextPath: (deletedPath: string) => string | null
  focusPath: (path: string) => void
}

export function prepareActiveWorktreeFocusAfterDelete(
  deps: ActiveWorktreeFocusDependencies
): () => void {
  const wasViewing = deps.activeWorktreePath === deps.targetPath
  return () => {
    if (!wasViewing) return
    // Why: focus moved while the delete ran; the user's new selection wins.
    if (deps.getActiveWorktreePath() !== null) return
    const nextPath = deps.pickNextPath(deps.targetPath)
    if (nextPath) deps.focusPath(nextPath)
  }
}

/**
 * Batch counterpart: capture the active path ONCE for the whole batch and
 * commit a single focus transfer after every target settles.
 */
export function prepareBatchActiveWorktreeFocusAfterDelete(args: {
  activeWorktreePath: string | null
  getActiveWorktreePath: () => string | null
  activeStillExists: () => boolean
  pickNextPath: (deletedPath: string) => string | null
  focusPath: (path: string) => void
}): () => void {
  return () => {
    if (!args.activeWorktreePath || args.activeStillExists()) return
    if (args.getActiveWorktreePath() !== null) return
    const nextPath = args.pickNextPath(args.activeWorktreePath)
    if (nextPath) args.focusPath(nextPath)
  }
}
