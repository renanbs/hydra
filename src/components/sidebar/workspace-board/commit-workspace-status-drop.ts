// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/use-workspace-status-drop.ts (commit half)
//
// A release over a status lane or the pin strip commits through one dispatcher:
// the batch writer when the surface has one, otherwise one write per dragged
// workspace. Keeping the choice here means every drop surface (document capture,
// native HTML5 lane, pointer card drag) agrees on batch-vs-individual semantics.
import type { WorkspaceStatus } from '../../../shared/worktree/types'

type MoveWorktreeToStatus = (worktreeId: string, status: WorkspaceStatus) => void
type MoveWorktreesToStatus = (worktreeIds: readonly string[], status: WorkspaceStatus) => void
type PinWorktree = (worktreeId: string) => void
type PinWorktrees = (worktreeIds: readonly string[]) => void

export function commitWorkspaceStatusDocumentDrop(params: {
  worktreeIds: readonly string[]
  status: WorkspaceStatus | null
  isPinDrop: boolean
  onMoveWorktreeToStatus: MoveWorktreeToStatus
  onMoveWorktreesToStatus?: MoveWorktreesToStatus
  onPinWorktree: PinWorktree
  onPinWorktrees?: PinWorktrees
}): void {
  const {
    worktreeIds,
    status,
    isPinDrop,
    onMoveWorktreeToStatus,
    onMoveWorktreesToStatus,
    onPinWorktree,
    onPinWorktrees,
  } = params

  if (worktreeIds.length === 0) {
    return
  }

  if (isPinDrop) {
    if (onPinWorktrees) {
      onPinWorktrees(worktreeIds)
      return
    }
    for (const worktreeId of worktreeIds) {
      onPinWorktree(worktreeId)
    }
    return
  }

  if (!status) {
    return
  }

  if (onMoveWorktreesToStatus) {
    onMoveWorktreesToStatus(worktreeIds, status)
    return
  }

  for (const worktreeId of worktreeIds) {
    onMoveWorktreeToStatus(worktreeId, status)
  }
}
