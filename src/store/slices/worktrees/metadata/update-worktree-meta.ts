// Adapter over `src/reference/store/slices/worktrees/metadata/update-worktree-meta.ts`
// and `src/reference/store/slices/worktrees/metadata/worktree-meta-persist.ts`
// (verbatim Orca, pinned in `src/reference/REVISION`).
//
// Rosetta D04a-098: the reference resolves the worktree (by id + owner host),
// applies the update optimistically, persists through the host-qualified writer,
// and refreshes. Hydra's port covers the local + SSH/runtime-hosted rows the
// sidebar owns: folder workspaces, push-target resolution, and runtime
// capability gates stay out (separate subsystems), but the host qualification
// — the point of this capability — is implemented end to end:
// `save_worktree_metadata(execution_host_id)` in Rust.
import { invoke } from '@tauri-apps/api/core'
import type { WorktreeMeta } from '../../../../shared/worktree/meta-types'
import type { WorktreeMetaUpdateOptions } from '../../worktree-helpers'
import type { Worktree } from '../../../../shared/worktree/types'
import type { ExecutionHostId } from '../../../../shared/execution-host'

type WorktreeStore = {
  worktreesByRepo: Record<string, Worktree[]>
}

export function createUpdateWorktreeMeta(
  _set: (fn: (state: WorktreeStore) => Partial<WorktreeStore>) => void,
  get: () => WorktreeStore
): (
  worktreeId: string,
  updates: Partial<WorktreeMeta>,
  options?: WorktreeMetaUpdateOptions
) => Promise<{ ok: true } | { ok: false; error: string }> {
  return async (worktreeId, updates, options) => {
    const executionHostId = options?.executionHostId ?? 'local'
    const known = findKnownWorktreeById(get(), worktreeId, executionHostId)
    if (!known) {
      return { ok: false, error: `Unknown workspace: ${worktreeId}` }
    }
    try {
      await invoke('save_worktree_metadata', {
        worktreePath: known.worktree.path,
        comment: updates.comment ?? known.worktree.comment ?? null,
        linkedIssue: updates.linkedIssue ?? known.worktree.linkedIssue ?? null,
        linkedPr: updates.linkedPR ?? known.worktree.linkedPR ?? null,
        linkedLinearIssue:
          updates.linkedLinearIssue ?? known.worktree.linkedLinearIssue ?? null,
        linkedJiraIssue:
          updates.linkedJiraIssue ?? known.worktree.linkedJiraIssue ?? null,
        executionHostId
      })
      return { ok: true }
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err)
      }
    }
  }
}

function findKnownWorktreeById(
  state: WorktreeStore,
  worktreeId: string,
  executionHostId: ExecutionHostId | string
): { worktree: Worktree } | null {
  for (const rows of Object.values(state.worktreesByRepo)) {
    for (const worktree of rows) {
      if (worktree.id !== worktreeId) continue
      // Why host-gated: two hosts can hold the same worktree id; without the
      // owner check the meta lands on the wrong row — the exact bug D04a-098
      // closes. An explicit owner on the row wins over the caller's default.
      const owner = (worktree as unknown as { hostId?: string }).hostId ?? 'local'
      if (owner === executionHostId) {
        return { worktree }
      }
      return null
    }
  }
  return null
}
