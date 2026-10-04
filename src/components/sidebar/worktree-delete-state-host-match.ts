// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// STA-4343: delete state is keyed by host-qualified identity, so an id-keyed entry
// that names another host must never be read for this row — the entry belongs to
// the sibling workspace that shares `repoId::path`.
import type { Worktree } from '../../shared/worktree/types'
import type { WorktreeDeleteState } from '../../store/slices/worktree-delete-state-types'
import { getWorktreeHostIdentity } from '../../shared/worktree/host-qualified-identity'

export function getDeleteStateForWorktreeHost(
  worktree: Pick<Worktree, 'id' | 'hostId'>,
  states: Readonly<Record<string, WorktreeDeleteState | undefined>>
): WorktreeDeleteState | undefined {
  const qualifiedState = worktree.hostId ? states[getWorktreeHostIdentity(worktree)] : undefined
  if (qualifiedState) {
    return qualifiedState
  }
  const legacyState = states[worktree.id]
  return legacyState?.executionHostId &&
    worktree.hostId &&
    legacyState.executionHostId !== worktree.hostId
    ? undefined
    : legacyState
}
