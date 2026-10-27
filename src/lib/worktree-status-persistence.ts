// The single writer for a workspace's persisted status (host command `set_worktree_status`).
//
// Why it lives here instead of inside one caller: the worktree context menu and the workspace
// board's card drop both assign a `WorkspaceStatus`, and a second copy of this write is how the
// persisted column and the sidebar's local projections drift apart.
import { invoke } from '@tauri-apps/api/core'

/** Anything the app keeps per worktree that carries its persisted workspace status. */
type WorktreeStatusCarrier = { path: string; status?: string | null }

/** Patches one workspace's status in a flat list, leaving every other entry untouched. */
export function applyWorktreeStatus<T extends WorktreeStatusCarrier>(
  worktrees: readonly T[],
  worktreePath: string,
  status: string | null
): T[] {
  return worktrees.map((worktree) =>
    worktree.path === worktreePath ? { ...worktree, status } : worktree
  )
}

/** The same patch across every project's own list of workspaces. */
export function applyWorktreeStatusByProject<T extends WorktreeStatusCarrier>(
  worktreesByProject: Readonly<Record<string, readonly T[]>>,
  worktreePath: string,
  status: string | null
): Record<string, T[]> {
  const next: Record<string, T[]> = {}
  for (const [projectPath, worktrees] of Object.entries(worktreesByProject)) {
    next[projectPath] = applyWorktreeStatus(worktrees, worktreePath, status)
  }
  return next
}

/**
 * Persists the status through the host. Resolves once SQLite holds the new value; patching
 * the caller's own projections and surfacing the failure stay with the caller.
 */
export async function persistWorktreeStatus(
  worktreePath: string,
  status: string | null
): Promise<void> {
  await invoke('set_worktree_status', { worktreePath, status })
}
