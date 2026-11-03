// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: lib/manual-terminal-worktree-parking.ts
//
// The Developer submenu asks another surface to park a workspace's terminal
// renderers. The request travels as an event because the menu is portaled outside
// the workspace surface; a pending set covers the case where the menu opens before
// the consumer mounts.
export const MANUAL_TERMINAL_WORKTREE_PARK_EVENT = 'hydra-manual-terminal-worktree-park'

export type ManualTerminalWorktreeParkDetail = {
  worktreeId: string
}

const pendingWorktreeIds = new Set<string>()

export function requestManualTerminalWorktreePark(worktreeId: string): void {
  if (!worktreeId) {
    return
  }
  pendingWorktreeIds.add(worktreeId)
  window.dispatchEvent(
    new CustomEvent<ManualTerminalWorktreeParkDetail>(MANUAL_TERMINAL_WORKTREE_PARK_EVENT, {
      detail: { worktreeId }
    })
  )
}

export function takePendingManualTerminalWorktreePark(worktreeId: string): boolean {
  return pendingWorktreeIds.delete(worktreeId)
}

export function takeAllPendingManualTerminalWorktreeParks(): string[] {
  const pending = [...pendingWorktreeIds]
  pendingWorktreeIds.clear()
  return pending
}
