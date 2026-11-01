// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/worktree-list/listing/use-visible-worktrees.ts
//
// D03a-047: the painted sidebar consumes the SAME visible-list derivation the
// Cmd+1–9 numbering reads (`computeVisibleWorktrees`), instead of re-applying
// device/host/menu filters row by row. Candidates are projected once, in the
// panel's own sorted order, and the computed result becomes the row pipeline's
// input — so painted order and shortcut order cannot drift.
import type { Worktree } from '../../../../shared/worktree/types'
import { computeVisibleWorktrees, type VisibleWorktreeOptions } from '../../visible-worktrees'

export type SidebarVisibleWorktrees = {
  /**
   * The computed order, as ids. Duplicate ids across execution hosts stay in the
   * list: they are two painted rows (the host-qualified identity is the row key),
   * and the shortcut publisher dedupes by that identity.
   */
  visibleIds: string[]
  /** The computed rows, in painted order. */
  visibleWorktrees: Worktree[]
  /** The same rows bucketed by repo, preserving the computed order inside each repo. */
  visibleWorktreesByRepo: Record<string, Worktree[]>
}

/**
 * Runs the visible worktree pipeline over the projected candidate universe.
 *
 * `worktreesByRepo` must already be in the sidebar's sort order (the panel's
 * filter + sort epoch) and `sortedIds` is that same order flattened — the rank
 * index the pipeline sorts by.
 */
export function selectVisibleSidebarWorktrees(args: {
  worktreesByRepo: Record<string, Worktree[]>
  sortedIds: string[]
  options: VisibleWorktreeOptions
}): SidebarVisibleWorktrees {
  const rows = computeVisibleWorktrees(args.worktreesByRepo, args.sortedIds, args.options)
  const visibleWorktreesByRepo: Record<string, Worktree[]> = {}
  const visibleIds: string[] = []
  for (const worktree of rows) {
    const forRepo = visibleWorktreesByRepo[worktree.repoId] ?? []
    forRepo.push(worktree)
    visibleWorktreesByRepo[worktree.repoId] = forRepo
    visibleIds.push(worktree.id)
  }
  return { visibleIds, visibleWorktrees: rows, visibleWorktreesByRepo }
}
