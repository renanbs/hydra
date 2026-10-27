// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: orca/src/renderer/src/components/sidebar/worktree-list/listing/render-row.ts
//
// Stable identity of a painted sidebar row (D03a-053). The viewport keys every virtual
// slot with it, so a recycled DOM node can never write a stale height into another row's
// slot, and a scroll anchor recorded under one row keeps following that same row (D03a-099).
//
// Adapted to Hydra: the row union has no `lineage-group` (Hydra paints no lineage folds),
// so that branch of Orca's key function does not exist here.
import type { HostSectionRow } from '../../host-section-rows'

export function getRenderRowKey(row: HostSectionRow): string {
  if (row.type === 'host-header') {
    return `host:${row.hostId}`
  }
  if (row.type === 'header') {
    return row.hostId ? `hdr:${row.hostId}:${row.key}` : `hdr:${row.key}`
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
