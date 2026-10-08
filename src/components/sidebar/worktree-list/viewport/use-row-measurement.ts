// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: orca/src/renderer/src/components/sidebar/worktree-list/viewport/use-row-measurement.ts
//
// Re-measures only the rows whose DOM node still matches its virtual key, and keeps the
// scroll anchor pinned to a row identity across row churn.
//
// Adapted to Hydra: Orca also drives its row-removal animation and re-measures on its PR /
// issue cache growth from here. Row-removal animation is out of scope for this PR and Hydra's
// viewport has no equivalent cache subscription, so the port keeps pruning, re-measurement
// and the anchor.
import { useCallback, useLayoutEffect, useMemo } from 'react'
import type React from 'react'
import {
  useVirtualizedScrollAnchor,
  type VirtualizedScrollAnchor
} from '@/hooks/useVirtualizedScrollAnchor'
import { getVirtualRowKey, pruneStaleVirtualRowElementCache } from './virtual-rows'
import { getRenderRowKey } from '../listing/render-row'
import type { HostSectionRow } from '../../host-section-rows'
import type { WorktreeListVirtualizer } from './use-virtualizer'

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

  return { virtualItems, measureVirtualRowElement }
}
