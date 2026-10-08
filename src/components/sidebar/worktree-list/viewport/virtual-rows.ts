// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: orca/src/renderer/src/components/sidebar/worktree-list/viewport/virtual-rows.ts
//
// Row geometry for the virtualized workspaces viewport: the fixed heights, the pre-measure
// estimate and the slot helpers the virtualizer and the row wrappers share.
//
// Adapted to Hydra: the row union has no `lineage-group`, and sticky section headers are out
// of scope for this PR — so the sticky-header resolution Orca keeps in this module is not
// ported (it would be dead code here).
import { PINNED_GROUP_KEY } from '../grouping/group-keys'
import type { HostSectionRow } from '../../host-section-rows'

/** Hydra's lane/group headers paint at `h-7` (28px) in every grouping mode. */
export const GROUP_HEADER_ROW_HEIGHT = 28

/** Hydra's host header is the same `h-7` row (Orca's host card is h-8, hence Orca's 32). */
export const HOST_HEADER_ROW_HEIGHT = 28

/**
 * Vertical rhythm between painted rows.
 *
 * Why 4 and not Orca's 6: Hydra's flat list painted `space-y-1`, and the pointer-drag
 * subsystem replays that exact gap (`WORKTREE_LIST_ROW_GAP_PX` in `drag/use-session.ts`), so
 * the virtualizer has to measure slots with the same 4px rhythm or the drop preview would
 * drift from the rows it animates.
 */
export const WORKTREE_SIDEBAR_VIRTUAL_ROW_GAP = 4

/** Top margin a secondary header paints above itself (`pt-1`). */
const SECONDARY_GROUP_HEADER_TOP_MARGIN = 4
const IMPORTED_WORKTREES_LINE_ROW_HEIGHT = 36
const PENDING_CREATION_ROW_HEIGHT = 56
const FOLDER_WORKSPACE_ROW_HEIGHT = 64
/** Card estimate before the first measurement; every card remeasures as soon as it mounts. */
const WORKTREE_CARD_ROW_HEIGHT = 116

/**
 * Headers paint a 4px top margin unless they open the list or follow the collapsed Pinned
 * header (whose section is empty while collapsed, so the margin would double the gap).
 */
export function shouldUseHeaderTopSpacing(args: {
  rows: readonly HostSectionRow[]
  index: number
  firstHeaderIndex: number
}): boolean {
  const previousRenderRow = args.rows[args.index - 1]
  const followsCollapsedPinnedHeader =
    previousRenderRow?.type === 'header' && previousRenderRow.key === PINNED_GROUP_KEY
  return args.index !== args.firstHeaderIndex && !followsCollapsedPinnedHeader
}

/** Size used until a row has been measured from the DOM. */
export function estimateRenderRowSize(
  rows: readonly HostSectionRow[],
  index: number,
  firstHeaderIndex: number
): number {
  const row = rows[index]
  if (row?.type === 'host-header') {
    return (
      HOST_HEADER_ROW_HEIGHT +
      (shouldUseHeaderTopSpacing({ rows, index, firstHeaderIndex })
        ? SECONDARY_GROUP_HEADER_TOP_MARGIN
        : 0)
    )
  }
  if (row?.type === 'header') {
    return (
      GROUP_HEADER_ROW_HEIGHT +
      (shouldUseHeaderTopSpacing({ rows, index, firstHeaderIndex })
        ? SECONDARY_GROUP_HEADER_TOP_MARGIN
        : 0)
    )
  }
  if (row?.type === 'imported-worktrees-card' || row?.type === 'new-external-worktrees-inbox') {
    return IMPORTED_WORKTREES_LINE_ROW_HEIGHT
  }
  if (row?.type === 'pending-creation') {
    return PENDING_CREATION_ROW_HEIGHT
  }
  if (row?.type === 'folder-workspace') {
    return FOLDER_WORKSPACE_ROW_HEIGHT
  }
  return WORKTREE_CARD_ROW_HEIGHT
}

export function getVirtualRowTransform(start: number): string {
  return `translateY(${start}px)`
}

export function getVirtualRowIndex(element: Element): number | null {
  const index = Number.parseInt(element.getAttribute('data-index') ?? '', 10)
  return Number.isNaN(index) ? null : index
}

export function getVirtualRowKey(element: Element): string | null {
  return element.getAttribute('data-worktree-virtual-row-key')
}

type VirtualRowElementCache<TElement extends Element> = {
  elementsCache: Map<unknown, TElement>
  measureElement: (node: TElement | null) => void
}

/**
 * Drops measured row nodes that are no longer connected and no longer belong to an active
 * row key. Their React fiber trees would otherwise survive runtime-host row churn.
 */
export function pruneStaleVirtualRowElementCache<TElement extends Element>({
  activeRowKeys,
  virtualizer
}: {
  activeRowKeys: ReadonlySet<string>
  virtualizer: VirtualRowElementCache<TElement>
}): void {
  virtualizer.measureElement(null)
  for (const [key, element] of virtualizer.elementsCache) {
    const rowKey = String(key)
    if (activeRowKeys.has(rowKey) || element.isConnected) {
      continue
    }
    virtualizer.elementsCache.delete(key)
  }
}
