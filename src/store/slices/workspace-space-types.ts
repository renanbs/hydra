// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: shared/workspace-space-types.ts (local subset — no executionHost,
// reclaimable computation, or repo summaries; Hydra measures local worktrees).
export type WorkspaceSpaceItem = {
  name: string
  path: string
  kind: string
  sizeBytes: number
}

export type WorkspaceSpaceWorktree = {
  worktreeId: string
  repoId: string
  repoDisplayName: string
  repoPath: string
  displayName: string
  path: string
  branch: string
  isMainWorktree: boolean
  status: string
  canDelete: boolean
  lastActivityAt: number
  sizeBytes: number
  reclaimableBytes: number
  topLevelItems: WorkspaceSpaceItem[]
  omittedTopLevelItemCount: number
  omittedTopLevelSizeBytes: number
  error?: string | null
  scannedAt: number
}

export type WorkspaceSpaceAnalysis = {
  scannedAt: number
  totalSizeBytes: number
  reclaimableBytes: number
  worktrees: WorkspaceSpaceWorktree[]
}
