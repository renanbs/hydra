// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: orca/src/renderer/src/components/sidebar/worktree-list/viewport/use-virtualizer.ts
//
// The TanStack virtualizer plus the row-identity guards that stop a recycled DOM node from
// writing a stale height into the wrong slot (D03a-099).
//
// Adapted to Hydra: no sticky headers (out of scope), so there is no range extractor or
// sticky index ref — the default window plus overscan is the whole range policy.
import { useCallback, useRef } from 'react'
import type React from 'react'
import {
  measureElement as measureVirtualElementSize,
  useVirtualizer,
  type Virtualizer
} from '@tanstack/react-virtual'
import { estimateRenderRowSize, getVirtualRowIndex, WORKTREE_SIDEBAR_VIRTUAL_ROW_GAP } from './virtual-rows'
import { getRenderRowKey } from '../listing/render-row'
import type { HostSectionRow } from '../../host-section-rows'
import {
  shouldAdjustWorktreeSidebarMeasuredRowScroll,
  USER_SCROLL_MEASUREMENT_ADJUSTMENT_SUPPRESS_MS
} from './use-scroll-suppression'

/** Rows kept mounted beyond the visible window, as in Orca. */
const WORKTREE_SIDEBAR_OVERSCAN = 10

export type WorktreeListVirtualizer = {
  virtualizer: Virtualizer<HTMLDivElement, HTMLDivElement>
  /** True while the node still belongs to the row its `data-index` names. */
  isCurrentVirtualRowElement: (element: Element) => boolean
}

export type WorktreeListVirtualizerArgs = {
  rows: HostSectionRow[]
  firstHeaderIndex: number
  scrollRef: React.RefObject<HTMLDivElement | null>
  scrollOffsetRef: React.MutableRefObject<number>
  suppressMeasurementAdjustmentUntilRef: React.MutableRefObject<number>
}

export function useWorktreeListVirtualizer(
  args: WorktreeListVirtualizerArgs
): WorktreeListVirtualizer {
  const { rows, firstHeaderIndex, scrollRef, scrollOffsetRef, suppressMeasurementAdjustmentUntilRef } =
    args
  const firstHeaderIndexRef = useRef(firstHeaderIndex)
  firstHeaderIndexRef.current = firstHeaderIndex

  const getVirtualItemKey = useCallback(
    (index: number) => {
      const row = rows[index]
      // Why: `getItemKey` is also asked about indexes the current row list no longer has
      // (count changes land in the same commit as the rows); a unique stale key keeps
      // TanStack's measurement cache aligned instead of reusing row 0's key.
      return row ? getRenderRowKey(row) : `__stale_${index}`
    },
    [rows]
  )
  const getExpectedVirtualRowKey = useCallback(
    (element: Element) => {
      const index = getVirtualRowIndex(element)
      const row = index === null ? undefined : rows[index]
      return row ? getRenderRowKey(row) : null
    },
    [rows]
  )
  const isCurrentVirtualRowElement = useCallback(
    (element: Element) => {
      const expectedKey = getExpectedVirtualRowKey(element)
      return (
        element.isConnected &&
        expectedKey !== null &&
        element.getAttribute('data-worktree-virtual-row-key') === expectedKey
      )
    },
    [getExpectedVirtualRowKey]
  )
  const measureCurrentVirtualRowElement = useCallback(
    (
      element: HTMLDivElement,
      entry: ResizeObserverEntry | undefined,
      instance: Virtualizer<HTMLDivElement, HTMLDivElement>
    ) => {
      if (!isCurrentVirtualRowElement(element)) {
        const index = getVirtualRowIndex(element)
        const measured = instance.getVirtualItems().find((item) => item.index === index)
        // Why: a stale ResizeObserver row after remount would write a wrong height; return
        // the current size to no-op it.
        return (
          measured?.size ??
          estimateRenderRowSize(rows, index ?? -1, firstHeaderIndexRef.current)
        )
      }
      return measureVirtualElementSize(element, entry, instance)
    },
    [isCurrentVirtualRowElement, rows]
  )

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => estimateRenderRowSize(rows, index, firstHeaderIndex),
    measureElement: measureCurrentVirtualRowElement,
    overscan: WORKTREE_SIDEBAR_OVERSCAN,
    gap: WORKTREE_SIDEBAR_VIRTUAL_ROW_GAP,
    isScrollingResetDelay: USER_SCROLL_MEASUREMENT_ADJUSTMENT_SUPPRESS_MS,
    // Why: sync-flushing rich card renders in the scroll listener stalls wheel input;
    // async plus overscan keeps the window filled.
    useFlushSync: false,
    // Why: seed the offset from the ref so the first getVirtualItems() after a remount
    // picks the rows the viewport was already showing instead of jumping to the top.
    initialOffset: () => scrollOffsetRef.current,
    getItemKey: getVirtualItemKey
  })
  // Why: TanStack's default correction writes scrollTop while cards remeasure mid-wheel,
  // which feels like rubber-banding over a list of tall, constantly-resizing cards.
  virtualizer.shouldAdjustScrollPositionOnItemSizeChange = (_item, _delta, instance) =>
    shouldAdjustWorktreeSidebarMeasuredRowScroll({
      isScrolling: instance.isScrolling,
      now: window.performance.now(),
      suppressUntil: suppressMeasurementAdjustmentUntilRef.current
    })

  return { virtualizer, isCurrentVirtualRowElement }
}
