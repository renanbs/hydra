import type { GitWorktreeInfo } from './types'

/**
 * Replays a within-group order onto a project's worktree list: the ordered rows
 * take the slots their members already occupy, so rows the sidebar filtered out
 * (sleeping, automation-created, hidden by the query) keep their position instead
 * of being pushed to one end.
 *
 * Returns a copy of the untouched list when `orderedWorktrees` is not a subset of
 * `worktrees` — the caller is then committing a group that spans several projects,
 * which this gesture has no order to write for.
 */
export function applyWorktreeGroupOrder(
  worktrees: readonly GitWorktreeInfo[],
  orderedWorktrees: readonly GitWorktreeInfo[]
): GitWorktreeInfo[] {
  if (orderedWorktrees.length === 0 || orderedWorktrees.length > worktrees.length) {
    return [...worktrees]
  }
  const orderedPaths = new Set(orderedWorktrees.map((worktree) => worktree.path))
  const slots: number[] = []
  worktrees.forEach((worktree, index) => {
    if (orderedPaths.has(worktree.path)) {
      slots.push(index)
    }
  })
  if (slots.length !== orderedWorktrees.length) {
    return [...worktrees]
  }
  const next = [...worktrees]
  orderedWorktrees.forEach((worktree, index) => {
    next[slots[index]!] = worktree
  })
  return next
}
