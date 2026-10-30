// Orca multi-select delete: only removable workspaces take part. The primary
// checkout (the project path itself) is never deletable, and a selection that
// resolves to nothing must say so instead of opening an empty confirmation.
export type DeletableWorktreeCandidate = {
  path: string
  is_main?: boolean | null
  isMainWorktree?: boolean | null
}

export function selectDeletableWorktrees<T extends DeletableWorktreeCandidate>(
  worktrees: readonly T[],
  projectPath: string
): T[] {
  return worktrees.filter(
    (worktree) =>
      worktree.path !== projectPath &&
      worktree.is_main !== true &&
      worktree.isMainWorktree !== true
  )
}
