// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/worktree-list/listing/use-section-rows.ts
// (`collectRenderedSidebarRowKeys`).
//
// The set of row keys the row model actually paints. A reveal request that names a
// key outside this set is blocked by a filter or a grouping mode, so the reveal path
// has to relax before the viewport can scroll to it (D03a-052).
import { folderWorkspaceKey } from '../../../../shared/workspace-scope'
import type { HostSectionRow } from '../../host-section-rows'

export function collectRenderedSidebarRowKeys(
  rows: readonly HostSectionRow[]
): Set<string> {
  const keys = new Set<string>()
  for (const row of rows) {
    switch (row.type) {
      case 'host-header':
        keys.add(row.key)
        break
      case 'header':
      case 'imported-worktrees-card':
      case 'new-external-worktrees-inbox':
        keys.add(row.key)
        break
      case 'pending-creation':
        keys.add(`pending:${row.creationId}`)
        break
      case 'folder-workspace':
        // Both spellings, deliberately: the painted row key (`folder-workspace:<id>`)
        // and Orca's workspace key (`folder:<id>`) reach reveal requests from
        // different call sites.
        keys.add(row.key)
        keys.add(folderWorkspaceKey(row.folderWorkspace.id))
        break
      case 'item':
        keys.add(row.rowKey)
        break
    }
  }
  return keys
}

/**
 * Whether a queued row reveal names a row the painted model does not contain while
 * sidebar filters are active — the case Orca resolves by relaxing filters before it
 * scrolls (`revealWorkspaceFilters`). A key whose target no longer exists is not a
 * filter problem, so the caller resolves it first and passes `targetResolved`.
 */
export function shouldRelaxFiltersForRevealRow(args: {
  rowKey: string
  renderedSidebarRowKeys: ReadonlySet<string>
  hasFilters: boolean
  targetResolved: boolean
}): boolean {
  return args.targetResolved && args.hasFilters && !args.renderedSidebarRowKeys.has(args.rowKey)
}
