// Per-worktree upstream divergence IPC (`get_worktree_upstream_status`).
//
// The worktree scan only lists checkouts; counting ahead/behind costs a rev-list
// per worktree, so the sidebar asks for it for the rows it actually mounts. The
// host reports a branch without upstream as a successful `0/0` with `upstream:
// null`, and a branch that is gone as a rejection.
import { invoke } from '@tauri-apps/api/core'

export type WorktreeUpstreamStatus = {
  ahead: number
  behind: number
  upstream: string | null
}

export async function getWorktreeUpstreamStatus(
  repoPath: string,
  worktreePath: string
): Promise<WorktreeUpstreamStatus> {
  // Why async: callers run this from an effect, so even a test double that
  // returns a non-promise must surface as a rejection, never a synchronous throw.
  return invoke<WorktreeUpstreamStatus>('get_worktree_upstream_status', {
    repoPath,
    worktreePath,
  })
}
