import type { StateCreator } from 'zustand'
import { invoke } from '@tauri-apps/api/core'
import { toast } from 'sonner'
import type { AppState } from '../../../types'
import type { WorktreeSlice } from '../../worktree-helpers'
import type { ForceDeleteWorktreeBranchResult } from '../../../../shared/worktree/create-types'

/**
 * Force-delete a branch Git preserved when a worktree was removed.
 *
 * Contract: the host owns the unmerged-commit guard, so the renderer sends the
 * branch and the head it expects. A missing/renamed command is reported as a
 * failed cleanup instead of pretending the branch is gone.
 */
export function createForceDeletePreservedBranch(
  _set: Parameters<StateCreator<AppState>>[0],
  _get: Parameters<StateCreator<AppState>>[1]
): WorktreeSlice['forceDeletePreservedBranch'] {
  return async (worktreeId, branchName, expectedHead, options) => {
    try {
      const result = await invoke<ForceDeleteWorktreeBranchResult>(
        'force_delete_preserved_branch',
        {
          worktreeId,
          branchName,
          expectedHead,
          ...(options?.hostId ? { hostId: options.hostId } : {}),
          ...(options?.runtimeEnvironmentId
            ? { runtimeEnvironmentId: options.runtimeEnvironmentId }
            : {})
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
