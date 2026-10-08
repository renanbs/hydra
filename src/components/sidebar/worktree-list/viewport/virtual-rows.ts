// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: orca/src/renderer/src/components/sidebar/worktree-list/viewport/virtual-rows.ts
//
// Row geometry for the virtualized workspaces viewport: the fixed heights, the pre-measure
// estimate, the sticky-header resolution and the slot helpers the virtualizer and the row
// wrappers share.
//
// Adapted to Hydra: the row union has no `lineage-group`, so the sticky resolution here has
// no rekey map to consult and the range extractor never has to keep a lineage parent mounted.
import { defaultRangeExtractor } from '@tanstack/react-virtual'
import type { Range, VirtualItem } from '@tanstack/react-virtual'
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

/**
 * Indexes of the rows that can pin to the top of the viewport: host cards (outer tier) and
 * top-level project groups (inner tier).
 *
 * Why the depth check: a project group is the top-level repo context of the sidebar, so a repo
 * header nested inside one must not replace its containing group as the pinned header.
 */
export function getStickyHeaderIndexes(rows: readonly HostSectionRow[]): number[] {
  const indexes: number[] = []
  rows.forEach((row, index) => {
    if (
      row.type === 'host-header' ||
      (row.type === 'header' && (row.projectGroupDepth ?? 0) === 0)
    ) {
      indexes.push(index)
    }
  })
  return indexes
}

// Why: the pinned host card is an `h-7` (28px) row inside the 4px top-margin wrapper its slot
// paints, so the group tier pins one pixel up from its bottom edge to sit flush beneath it.
export const HOST_STICKY_PINNED_HEIGHT = HOST_HEADER_ROW_HEIGHT + SECONDARY_GROUP_HEADER_TOP_MARGIN

export type ActiveStickyIndexes = {
  /** Pinned host card (tier 1), or null outside host sections. */
  hostIndex: number | null
  /** Pinned group header (tier 2), offset below the host when one is pinned. */
  groupIndex: number | null
}

/** Two-tier sticky resolution: the host card is the outer hierarchy level so it stays pinned
 *  for the whole section while group headers hand off beneath it. Without host sections this
 *  degrades to the original single-tier rules. */
export function getActiveStickyIndexesForScroll(args: {
  rows: readonly HostSectionRow[]
  rangeStartIndex: number
  scrollOffset: number
  stickyHeaderIndexes: readonly number[]
  virtualItems: readonly VirtualItem[]
}): ActiveStickyIndexes {
  const hostIndexes = args.stickyHeaderIndexes.filter(
    (index) => args.rows[index]?.type === 'host-header'
  )

  const resolveWithHandoff = (
    candidates: readonly number[],
    pinnedOffset: number,
    fallbackToCandidate: boolean
  ): number | null => {
    const candidateIndex = getActiveStickyHeaderIndex(candidates, args.rangeStartIndex)
    if (candidateIndex === null) {
      return null
    }
    const candidate = args.virtualItems.find((item) => item.index === candidateIndex)
    if (!candidate) {
      // Why: scrollToIndex/reveal can advance rangeStartIndex before TanStack mounts the
      // candidate row. Pinning without geometry lets a group sticky paint over the host card.
      // Prefer a previous mounted sticky; the group tier waits for geometry, the host tier may
      // keep the id.
      const previous = getPreviousStickyHeaderIndex(candidates, candidateIndex)
      if (previous !== null) {
        const previousItem = args.virtualItems.find((item) => item.index === previous)
        if (previousItem) {
          return previous
        }
      }
      return fallbackToCandidate ? candidateIndex : null
    }
    // Why: hand off the moment the incoming header reaches its pinned slot (top of the
    // viewport, or the bottom edge of the pinned host card).
    if (args.scrollOffset + pinnedOffset >= candidate.start) {
      return candidateIndex
    }
    const previous = getPreviousStickyHeaderIndex(candidates, candidateIndex)
    if (previous !== null) {
      return previous
    }
    // Why: a host section's first group is still in flow below the pinned host card until it
    // reaches the slot — pinning it early would double it up. The host tier keeps the legacy
    // fallback.
    return fallbackToCandidate ? candidateIndex : null
  }

  const hostIndex = resolveWithHandoff(hostIndexes, 0, true)

  const hostPosition = hostIndex === null ? -1 : hostIndexes.indexOf(hostIndex)
  const nextHostIndex =
    hostPosition >= 0 ? (hostIndexes[hostPosition + 1] ?? Number.POSITIVE_INFINITY) : null
  const groupIndexes = args.stickyHeaderIndexes.filter((index) => {
    if (args.rows[index]?.type !== 'header') {
      return false
    }
    // Why: a group from the previous host must never pin beneath the next host's card — only
    // groups inside the pinned host's section qualify.
    if (hostIndex !== null) {
      return index > hostIndex && index < (nextHostIndex ?? Number.POSITIVE_INFINITY)
    }
    return true
  })
  const groupIndex = resolveWithHandoff(
    groupIndexes,
    hostIndex !== null ? HOST_STICKY_PINNED_HEIGHT : 0,
    hostIndex === null
  )

  return { hostIndex, groupIndex }
}

export function getActiveStickyHeaderIndex(
  stickyHeaderIndexes: readonly number[],
  rangeStartIndex: number
): number | null {
  for (let index = stickyHeaderIndexes.length - 1; index >= 0; index--) {
    const headerIndex = stickyHeaderIndexes[index]
    if (headerIndex <= rangeStartIndex) {
      return headerIndex
    }
  }
  return null
}

export function getPreviousStickyHeaderIndex(
  stickyHeaderIndexes: readonly number[],
  headerIndex: number
): number | null {
  const currentPosition = stickyHeaderIndexes.indexOf(headerIndex)
  if (currentPosition <= 0) {
    return null
  }
  return stickyHeaderIndexes[currentPosition - 1] ?? null
}

/**
 * The window the virtualizer paints, plus the sticky rows it must keep mounted even when they
 * sit outside it: the pinned group header, the header it handed off to, and the pinned host
 * card (which can be far above the window while its section's groups hand off beneath it).
 */
export function extractWorktreeVirtualRowIndexes(args: {
  range: Range
  stickyHeaderIndexes: readonly number[]
  rows?: readonly HostSectionRow[]
}): number[] {
  const activeStickyHeaderIndex = getActiveStickyHeaderIndex(
    args.stickyHeaderIndexes,
    args.range.startIndex
  )
  if (activeStickyHeaderIndex === null) {
    return defaultRangeExtractor(args.range)
  }

  const previousStickyHeaderIndex = getPreviousStickyHeaderIndex(
    args.stickyHeaderIndexes,
    activeStickyHeaderIndex
  )
  const hostIndexes = args.rows
    ? args.stickyHeaderIndexes.filter((index) => args.rows?.[index]?.type === 'host-header')
    : []
  const activeHostIndex = getActiveStickyHeaderIndex(hostIndexes, args.range.startIndex)
  return Array.from(
    new Set([
      activeStickyHeaderIndex,
      ...(previousStickyHeaderIndex === null ? [] : [previousStickyHeaderIndex]),
      ...(activeHostIndex === null ? [] : [activeHostIndex]),
      ...defaultRangeExtractor(args.range)
    ])
  ).sort((a, b) => a - b)
}
