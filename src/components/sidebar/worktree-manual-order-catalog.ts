// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/worktree-manual-order-catalog.ts
import type { FolderWorkspace } from '../../shared/folder-workspace-types'
import { folderWorkspaceToWorktree } from '../../shared/folder-workspace-worktree'
import type { Worktree } from '../../shared/worktree/types'
import { buildWorktreeSortLabels, compareWorktreeSortLabel } from './smart-sort'

export type WorktreeManualOrderCatalog = {
  orderedIds: readonly string[]
  rankByWorktreeId: ReadonlyMap<string, number>
}

/**
 * The durable Manual sequence every sparse order write reads.
 *
 * Why it lives outside the painted list: a drag only ever sees the rendered slice, but the
 * persisted ranks describe every known workspace — including the ones a filter or a collapse
 * hides and the folder workspaces that share the sidebar with git worktrees. Building the
 * catalog from the whole universe is what keeps a reorder from erasing an unseen row's rank.
 *
 * Archived rows are excluded: they are not part of the visible order, and their frozen rank
 * must not become the neighbour a live row is interpolated against.
 */
export function buildWorktreeManualOrderCatalog(args: {
  worktrees: readonly Worktree[]
  folderWorkspaces: readonly FolderWorkspace[]
}): WorktreeManualOrderCatalog {
  const rows = [
    ...args.worktrees,
    ...args.folderWorkspaces.map((workspace) => folderWorkspaceToWorktree(workspace))
  ].filter((row) => !row.isArchived)
  const labels = buildWorktreeSortLabels(rows)
  // Descending manualOrder (newest drags lead), with Orca's `sortOrder` fallback for rows that
  // have never been dragged; equal ranks fall back to the name label so the order is total.
  rows.sort(
    (left, right) =>
      (right.manualOrder ?? right.sortOrder) - (left.manualOrder ?? left.sortOrder) ||
      compareWorktreeSortLabel(left, right, labels)
  )
  const rowsById = new Map<string, Worktree[]>()
  for (const row of rows) {
    const matches = rowsById.get(row.id)
    if (matches) {
      matches.push(row)
    } else {
      rowsById.set(row.id, [row])
    }
  }

  const orderedIds = [...rowsById.keys()]
  const rankByWorktreeId = new Map<string, number>()
  for (const [worktreeId, matches] of rowsById) {
    const ranks = matches.map((row) => row.manualOrder)
    const rank = ranks[0]
    // Why every instance: a multi-host cluster publishes one id per host, and a rank is only
    // durable for the id when all of its rows agree. Interpolating against one host's rank
    // would silently rewrite the other host's order.
    if (
      typeof rank === 'number' &&
      Number.isFinite(rank) &&
      ranks.every((candidate) => candidate === rank)
    ) {
      rankByWorktreeId.set(worktreeId, rank)
    }
  }
  return { orderedIds, rankByWorktreeId }
}
