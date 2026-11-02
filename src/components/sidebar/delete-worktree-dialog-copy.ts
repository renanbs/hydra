// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/delete-worktree-dialog-copy.ts
// The confirmation must name what will actually happen: a Git worktree is also
// removed from disk, while a folder workspace only loses Hydra's entry.

export type DeleteWorktreeDialogCopy = {
  targetLabel: string | undefined
  targetClassName: string
  descriptionSuffix: string
  mainWorktreeBlocker: string
}

export function getDeleteWorktreeDialogCopy(args: {
  isBatchDelete: boolean
  worktreeDisplayName?: string | null
  worktreeCount: number
  folderWorkspaceDeleteCount: number
  isFolderWorkspaceDelete: boolean
}): DeleteWorktreeDialogCopy {
  const allFolderWorkspaceDeletes =
    args.isBatchDelete &&
    args.worktreeCount > 0 &&
    args.folderWorkspaceDeleteCount === args.worktreeCount
  const mixedFolderWorkspaceDeletes =
    args.isBatchDelete &&
    args.folderWorkspaceDeleteCount > 0 &&
    args.folderWorkspaceDeleteCount < args.worktreeCount
  return {
    targetLabel: args.isBatchDelete
      ? `${args.worktreeCount} workspaces`
      : args.worktreeDisplayName ?? undefined,
    targetClassName: args.isBatchDelete
      ? 'font-medium text-foreground'
      : 'break-all font-medium text-foreground',
    descriptionSuffix: args.isBatchDelete
      ? allFolderWorkspaceDeletes
        ? 'from Hydra. Project folders on disk will not be deleted.'
        : mixedFolderWorkspaceDeletes
          ? 'from Hydra. Git worktrees will also be removed from git and disk; folder workspaces will only remove the Hydra workspace entry.'
          : 'from git and delete their workspace folders.'
      : args.isFolderWorkspaceDelete
        ? 'from Hydra. The project folder on disk will not be deleted.'
        : 'from git and delete its workspace folder.',
    mainWorktreeBlocker: args.isFolderWorkspaceDelete
      ? 'Remove the folder project instead of deleting this workspace.'
      : 'Git does not allow removing the main worktree.',
  }
}

export function getDeleteWorktreeLineageDialogCopy(args: {
  childWorkspaceCount: number
  deleteTargetCount: number
  folderWorkspaceDeleteCount: number
}): { childTargetLabel: string; descriptionSuffix: string } {
  const allFolderWorkspaceDeletes =
    args.deleteTargetCount > 0 && args.folderWorkspaceDeleteCount === args.deleteTargetCount
  const mixedFolderWorkspaceDeletes =
    args.folderWorkspaceDeleteCount > 0 &&
    args.folderWorkspaceDeleteCount < args.deleteTargetCount

  return {
    childTargetLabel:
      args.childWorkspaceCount === 1
        ? '1 child workspace'
        : `${args.childWorkspaceCount} child workspaces`,
    descriptionSuffix: allFolderWorkspaceDeletes
      ? 'from Hydra. Project folders on disk will not be deleted.'
      : mixedFolderWorkspaceDeletes
        ? 'from Hydra. Git worktrees will also be removed from git and disk; folder workspaces will only remove the Hydra workspace entry.'
        : 'from git and delete their workspace folders.',
  }
}
