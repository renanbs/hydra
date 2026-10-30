// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: orca/src/renderer/src/components/sidebar/worktree-list/listing/renderable-rows.ts
//
// D03a-080: the row model is flat — a lineage parent followed by its children — but the
// card paints its descendants inline. Folding the subtree into one `lineage-group` render
// row gives the virtualizer exactly one slot for the whole card, so the children are never
// also painted as sibling virtual rows.
import { getWorktreeLineageGroupKey } from '../grouping/group-keys'
import type { WorktreeRow } from '../grouping/row-types'
import type { HostSectionRow } from '../../host-section-rows'
import type { RenderRow } from './render-row'

export function isWorktreeItemRow(row: HostSectionRow): row is WorktreeRow {
  return row.type === 'item'
}

/**
 * Collapse each visible lineage subtree into one render row.
 *
 * A parent folds only when it actually paints children in this pass: it must report a
 * lineage child count, not be collapsed, and the next row must be a deeper item row.
 * A collapsed parent therefore stays a plain item row and its subtree — which the row
 * builder already omitted — never paints.
 */
export function buildRenderableRows(rows: readonly HostSectionRow[]): RenderRow[] {
  const renderRows: RenderRow[] = []
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index]
    if (
      !row ||
      !isWorktreeItemRow(row) ||
      row.lineageChildCount === 0 ||
      row.lineageCollapsed === true ||
      rows[index + 1]?.type !== 'item' ||
      (rows[index + 1] as WorktreeRow).depth <= row.depth
    ) {
      if (row) {
        renderRows.push(row)
      }
      continue
    }

    const groupRows: WorktreeRow[] = [row]
    let cursor = index + 1
    while (cursor < rows.length) {
      const child = rows[cursor]
      if (!child || child.type !== 'item' || child.depth <= row.depth) {
        break
      }
      groupRows.push(child)
      cursor++
    }
    renderRows.push({
      type: 'lineage-group',
      key: `${row.sectionKey}:${getWorktreeLineageGroupKey(row.worktree)}`,
      rows: groupRows
    })
    index = cursor - 1
  }
  return renderRows
}
