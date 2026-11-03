import type { StateCreator } from 'zustand'
import { invoke } from '@tauri-apps/api/core'
import { toast } from 'sonner'
import type { AppState } from '../../../types'
import type { WorktreeSlice } from '../../worktree-helpers'
import type { ForceDeleteWorktreeBranchResult } from '../../../../shared/worktree/create-types'
import { parseExecutionHostId } from '../../../../shared/execution-host'
import {
  getRepoIdFromWorktreeId,
  splitWorktreeIdForFilesystem
} from '../../../../shared/worktree/id'

/**
 * Force-delete a branch Git preserved when a worktree was removed.
 *
 * Contract: the host owns every guard (branch exists, expected head matches, not
 * checked out, not the default branch), so the renderer sends the repository, the
 * branch and the head it showed the user. A refused cleanup is reported as a
 * failure instead of pretending the branch is gone.
 */
export function createForceDeletePreservedBranch(
  _set: Parameters<StateCreator<AppState>>[0],
  get: Parameters<StateCreator<AppState>>[1]
): WorktreeSlice['forceDeletePreservedBranch'] {
  return async (worktreeId, branchName, expectedHead, options) => {
    try {
      const parsed = splitWorktreeIdForFilesystem(worktreeId)
      const worktreePath = parsed?.worktreePath ?? worktreeId
      // Why: the branch lives in the owning repository, not in the (possibly
      // already removed) worktree. The worktree path is the honest fallback when
      // the repo row is not hydrated: Git still resolves the common repo from it.
      const repoId = getRepoIdFromWorktreeId(worktreeId)
      const repoPath =
        (get().repos as readonly { id: string; path: string }[] | undefined)?.find(
          (repo) => repo.id === repoId
        )?.path ?? worktreePath

      // Why: this command runs Git on this machine. A workspace owned by an SSH
      // target or a paired runtime needs its own host to do the deletion.
      const hostKind = options?.hostId ? parseExecutionHostId(options.hostId)?.kind : 'local'
      if (options?.runtimeEnvironmentId || hostKind !== 'local') {
        return {
          ok: false,
          error: 'Branch deletion for a remote workspace must run on its host.'
        }
      }

      const result = await invoke<ForceDeleteWorktreeBranchResult>(
        'force_delete_preserved_branch',
        {
          repoPath,
          branchName,
          expectedHead: expectedHead.trim() ? expectedHead : null
        }
      )
      if (options?.suppressToast !== true) {
        toast.success('Local branch deleted', { description: `Deleted "${branchName}".` })
      }
      return { ok: true as const, ...result }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (options?.suppressToast !== true) {
        toast.error('Failed to delete branch', { description: message })
      }
      return { ok: false as const, error: message }
    }
  }
}
