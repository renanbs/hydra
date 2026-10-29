// Orca `handleOpenChange`: closing the confirmation releases every per-target state
// it published. A removal already in flight keeps its entry, so its card stays busy
// instead of turning interactive while the host is still deleting.
import type { DeleteWorktreeDialogState } from '../DeleteWorktreeDialog'
import type { WorktreeDeleteState } from '../../store/slices/worktree-delete-state-types'

export function pruneClosedDeleteStates(
  states: DeleteWorktreeDialogState
): DeleteWorktreeDialogState {
  const next: DeleteWorktreeDialogState = {}
  for (const [key, state] of Object.entries(states) as [string, WorktreeDeleteState | undefined][]) {
    if (!state) continue
    if (state.isDeleting || state.phase === 'queued') {
      next[key] = state
    }
  }
  return next
}
