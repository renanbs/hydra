// The store's reveal queue speaks worktree ids; the sidebar reveal path speaks
// checkout paths. This is the one bridge between the two, tolerant of the id
// shapes both sides write (`repoId::path`, bare path, or a scan id).
export type RevealWorktreeEntry = {
  projectId: string
  path: string
  worktrees: readonly { id?: string | null; path: string }[]
}

export function resolveRevealWorktreePath(
  worktreeId: string,
  entries: readonly RevealWorktreeEntry[]
): string | null {
  if (!worktreeId) return null
  for (const entry of entries) {
    for (const worktree of entry.worktrees) {
      const identity = worktree.id ?? `${entry.projectId}::${worktree.path}`
      if (identity === worktreeId || worktree.path === worktreeId) {
        return worktree.path
      }
    }
    // A folder row's id is its folder path.
    if (entry.path === worktreeId) {
      return entry.path
    }
  }
  return null
}
