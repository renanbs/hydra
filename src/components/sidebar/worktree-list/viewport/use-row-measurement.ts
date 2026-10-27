// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: orca/src/renderer/src/components/sidebar/worktree-list/viewport/use-row-measurement.ts
//
// Re-measures only the rows whose DOM node still matches its virtual key, keeps the scroll
// anchor pinned to a row identity across row churn, publishes the sticky-header slots the
// render pass reads out of refs, and animates the rows a removal pushed up.
//
// Adapted to Hydra: Orca also re-measures on its PR / issue cache growth from here, and its
// rekey map follows `lineage-group` rows; Hydra's viewport has no equivalent cache
// subscription and paints no lineage folds, so the port keeps pruning, re-measurement, the
// anchor, the sticky slots and the removal animation.
import { useCallback, useLayoutEffect, useMemo } from 'react'
import type React from 'react'
import {
  useVirtualizedScrollAnchor,
  type VirtualizedScrollAnchor
} from '@/hooks/useVirtualizedScrollAnchor'
import {
  getActiveStickyIndexesForScroll,
  getVirtualRowKey,
  pruneStaleVirtualRowElementCache
} from './virtual-rows'
import { getRenderRowKey } from '../listing/render-row'
import type { HostSectionRow } from '../../host-section-rows'
import type { WorktreeListVirtualizer } from './use-virtualizer'
import { useVirtualRowRemovalAnimation } from './use-row-removal-animation'

export type VirtualRowMeasurementSync = {
  virtualItems: ReturnType<WorktreeListVirtualizer['virtualizer']['getVirtualItems']>
  measureVirtualRowElement: (element: HTMLDivElement | null) => void
}

export type VirtualRowMeasurementSyncArgs = {
  rows: HostSectionRow[]
  virtualization: WorktreeListVirtualizer
  scrollRef: React.RefObject<HTMLDivElement | null>
  scrollOffsetRef: React.MutableRefObject<number>
  scrollAnchorRef: React.MutableRefObject<VirtualizedScrollAnchor>
  hasDirectScrollInput: () => boolean
  shouldSkipScrollAnchorRestore: () => boolean
}

export function useVirtualRowMeasurementSync(
  args: VirtualRowMeasurementSyncArgs
): VirtualRowMeasurementSync {
  const {
    rows,
    virtualization,
    scrollRef,
    scrollOffsetRef,
    scrollAnchorRef,
    hasDirectScrollInput,
    shouldSkipScrollAnchorRestore
  } = args
  const { virtualizer, isCurrentVirtualRowElement } = virtualization
  const activeRenderRowKeys = useMemo(() => new Set(rows.map(getRenderRowKey)), [rows])
  const totalSize = virtualizer.getTotalSize()
  const virtualItems = virtualizer.getVirtualItems()
  // Why: the pinned slots are resolved during render (not in an effect) so the row wrappers
  // the same pass paints read the indexes that match the window it paints.
  const activeStickyIndexes = getActiveStickyIndexesForScroll({
    rows,
    rangeStartIndex: virtualization.stickyRangeStartIndexRef.current,
    scrollOffset: virtualizer.scrollOffset ?? scrollOffsetRef.current,
    stickyHeaderIndexes: virtualization.stickyHeaderIndexes,
    virtualItems
  })
  virtualization.activeStickyHeaderIndexRef.current = activeStickyIndexes.groupIndex
  virtualization.activeStickyHostIndexRef.current = activeStickyIndexes.hostIndex

  const measureMountedRows = useCallback(() => {
    virtualizer.elementsCache.forEach((element) => {
      if (!isCurrentVirtualRowElement(element)) {
        return
      }
      virtualizer.measureElement(element)
    })
  }, [isCurrentVirtualRowElement, virtualizer])
  const measureVirtualRowElement = useCallback(
    (element: HTMLDivElement | null) => {
      if (!element) {
        virtualizer.measureElement(null)
        return
      }
      if (!isCurrentVirtualRowElement(element)) {
        return
      }
      virtualizer.measureElement(element)
    },
    [isCurrentVirtualRowElement, virtualizer]
  )

  useLayoutEffect(() => {
    pruneStaleVirtualRowElementCache({ activeRowKeys: activeRenderRowKeys, virtualizer })
    // Why: a stale retained element after a delete or collapse measures 0px and corrupts
    // the next slot, so only key-matched rows are measured — twice, once inside the
    // commit and once after the browser has laid the new content out.
    measureMountedRows()
    const frameId = window.requestAnimationFrame(measureMountedRows)
    return () => window.cancelAnimationFrame(frameId)
  }, [activeRenderRowKeys, measureMountedRows, virtualizer])

  useVirtualizedScrollAnchor({
    anchorRef: scrollAnchorRef,
    getItemElementKey: getVirtualRowKey,
    getRowKey: getRenderRowKey,
    itemElementSelector: '[data-worktree-virtual-row]',
    rows,
    scrollElementRef: scrollRef,
    scrollOffsetRef,
    hasDirectScrollInput,
    shouldSkipRestore: shouldSkipScrollAnchorRestore,
    totalSize,
    virtualizer
  })

  useVirtualRowRemovalAnimation({ rows, scrollRef, virtualItems })

  return { virtualItems, measureVirtualRowElement }
}
