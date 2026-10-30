// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: orca/src/renderer/src/components/sidebar/worktree-list/listing/render-row.ts
//
// Stable identity of a painted sidebar row (D03a-053). The viewport keys every virtual
// slot with it, so a recycled DOM node can never write a stale height into another row's
// slot, and a scroll anchor recorded under one row keeps following that same row (D03a-099).
//
// D03a-080 adds the `lineage-group`: a parent and its visible lineage descendants fold
// into ONE virtual slot, so the parent card can paint its descendants inline (Orca's
// `buildRenderableRows` + `renderWorktreeLineageDescendants`).
import type { HostSectionRow } from '../../host-section-rows'
import type { WorktreeRow } from '../grouping/row-types'

/** A parent worktree row folded together with its visible lineage subtree. */
export type LineageGroupRow = {
  type: 'lineage-group'
  /** `${sectionKey}:${lineage group key}`; unique across Pinned and natural sections. */
  key: string
  /** Parent first, then every visible descendant in painted (pre-order) order. */
  rows: WorktreeRow[]
}

export type RenderRow = HostSectionRow | LineageGroupRow

/** The worktree item rows a render row paints (a group paints its whole subtree). */
export function getRenderRowItemRows(row: RenderRow): WorktreeRow[] {
  if (row.type === 'lineage-group') {
    return row.rows
  }
  return row.type === 'item' ? [row] : []
}

export function getRenderRowKey(row: RenderRow): string {
  if (row.type === 'host-header') {
    return `host:${row.hostId}`
  }
  if (row.type === 'header') {
    return row.hostId ? `hdr:${row.hostId}:${row.key}` : `hdr:${row.key}`
  }
  if (row.type === 'lineage-group') {
    return `lineage-group:${row.key}`
  }
  if (row.type === 'imported-worktrees-card') {
    return `imported:${row.key}`
  }
  if (row.type === 'new-external-worktrees-inbox') {
    return `inbox:${row.key}`
  }
  if (row.type === 'pending-creation') {
    return `pending:${row.creationId}`
  }
  if (row.type === 'folder-workspace') {
    return `folder-workspace:${row.folderWorkspace.id}`
  }
  // Item rows carry the pipeline's own `${sectionKey}:${hostIdentity}` row key, so a
  // worktree that appears under two sections keeps two distinct painted identities.
  return `wt:${row.rowKey}`
}
