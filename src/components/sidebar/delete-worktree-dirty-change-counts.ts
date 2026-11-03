// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/delete-worktree-dirty-change-counts.ts
// Dirty-change hydration order and the counts the confirmation may show.
import type { ExecutionHostId } from '../../shared/execution-host'
import { getWorktreeHostIdentity } from '../../shared/worktree/host-qualified-identity'
import type { WorktreeDeleteState } from '../../store/slices/worktree-delete-state-types'
import { getDeleteStateForWorktreeHost } from './worktree-delete-state-host-match'

export type DirtyHydrationTarget = {
  id: string
  hostId?: ExecutionHostId
  path: string
}

/**
 * Hydrates the active row first, then rows currently on screen, then the rest —
 * so the visible confirmation has its count before off-screen descendants.
 */
export function orderDeleteWorktreeStatusHydrationTargets<T extends DirtyHydrationTarget>(args: {
  targets: readonly T[]
  visibleTargets: readonly DirtyHydrationTarget[]
  activeWorktreeId: string | null
  activeExecutionHostId?: string | null
}): T[] {
  const visibleIdentities = new Set(args.visibleTargets.map(getWorktreeHostIdentity))
  return args.targets
    .map((target, index) => {
      const isActive =
        target.id === args.activeWorktreeId &&
        (!args.activeExecutionHostId || (target.hostId ?? 'local') === args.activeExecutionHostId)
      const rank = isActive ? 0 : visibleIdentities.has(getWorktreeHostIdentity(target)) ? 1 : 2
      return { target, index, rank }
    })
    .sort((left, right) => left.rank - right.rank || left.index - right.index)
    .map(({ target }) => target)
}

export type DirtyCountTarget = DirtyHydrationTarget & {
  isMainWorktree?: boolean
  isFolderWorkspace?: boolean
}

/**
 * Orca `getDeleteWorktreeDirtyChangeCounts`: main checkouts and folder
 * workspaces never get a count, and a backend "dirty" refusal keeps the warning
 * visible with a 0 (unknown) count instead of inventing a file number.
 */
export function getDeleteWorktreeDirtyChangeCounts(args: {
  deleteTargets: readonly DirtyCountTarget[]
  dirtyChangeCountByPath: Readonly<Record<string, number | null | undefined>>
  deleteStateByWorktreeId?: Readonly<Record<string, WorktreeDeleteState | undefined>>
}): Map<string, number> {
  const result = new Map<string, number>()
  for (const target of args.deleteTargets) {
    if (target.isMainWorktree || target.isFolderWorkspace) continue
    const forceDeleteReason = args.deleteStateByWorktreeId
      ? getDeleteStateForWorktreeHost(target, args.deleteStateByWorktreeId)?.forceDeleteReason
      : undefined
    const count = args.dirtyChangeCountByPath[target.path]
    if ((count ?? 0) > 0) {
      result.set(target.path, count ?? 0)
    } else if (forceDeleteReason === 'dirty') {
      result.set(target.path, 0)
    }
  }
  return result
}

/**
 * Why undefined stays undefined: an unresolved probe is not a zero — the hint
 * must disappear until a count is actually known.
 */
export function formatDirtyChangeHintText(count: number | null | undefined): string | null {
  if (count == null) return null
  if (count <= 0) return 'Uncommitted or untracked changes were reported by Git.'
  return count === 1
    ? '1 uncommitted or untracked change'
    : `${count} uncommitted or untracked changes`
}
