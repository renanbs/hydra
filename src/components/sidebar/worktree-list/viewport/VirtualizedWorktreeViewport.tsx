// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: orca/src/renderer/src/components/sidebar/worktree-list/viewport/VirtualizedWorktreeViewport.tsx
//
// The virtualized workspaces list: it owns the scroll container, the listbox semantics, the
// row window and the jump-to-top affordance, and paints the row content the caller hands it.
//
// Adapted to Hydra: Orca's viewport also drives its drag runtime, sticky headers, lineage
// folds, workspace board, PR refresh and reveal pipeline. Those live in Hydra's own drag
// subsystem (`../drag`) and in the list's callbacks, so the port keeps the viewport to the
// window + listbox + reveal + scroll-to-top, and takes the row content as a render prop.
import React, { useCallback, useMemo, useRef, useState } from 'react'
import { translate } from '@/i18n/i18n'
import { cn } from '@/lib/utils'
import { WorktreeListScrollToTopButton } from '../../WorktreeListScrollToTopButton'
import { getActiveDescendantOptionId, getRowOptionId, getWorktreeOptionId } from './option-id'
import { useGroupToggleWithScrollAnchor } from './use-group-toggle'
import { useVirtualRowMeasurementSync } from './use-row-measurement'
import { useWorktreeListKeyboardNavigation } from './use-listbox-keyboard'
import { useWorktreeListRevealScroll } from './use-reveal-scroll'
import { useWorktreeListScrollToTop } from './use-scroll-to-top'
import { useWorktreeSidebarScrollSuppression } from './use-scroll-suppression'
import { useWorktreeListVirtualizer } from './use-virtualizer'
import { getVirtualRowTransform, shouldUseHeaderTopSpacing } from './virtual-rows'
import type { VirtualizedWorktreeViewportProps } from './viewport-props'
import type { VirtualizedScrollAnchor } from '@/hooks/useVirtualizedScrollAnchor'

const WORKTREE_SIDEBAR_SCROLL_STYLE: React.CSSProperties = {
  // Why: TanStack Virtual owns scroll correction; native overflow anchoring fights it and
  // shows up as a jump every time a card remeasures.
  overflowAnchor: 'none'
}

export const VirtualizedWorktreeViewport = React.memo(function VirtualizedWorktreeViewport({
  rows,
  activeRowKey,
  pinnedDisplayPolicy,
  revealPath,
  renderRow,
  onActivateRow,
  onToggleRowCollapse,
  dropIndicator,
  scrollRef,
  className
}: VirtualizedWorktreeViewportProps): React.JSX.Element {
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(null)
  // Why an internal ref: everything the viewport wires (virtualizer, anchor, drag geometry via
  // the caller's ref) must agree on the element that scrolls. A caller's ref can also be attached
  // elsewhere in the tree, so the viewport never reads its own wiring back out of it.
  const containerRef = useRef<HTMLDivElement | null>(null)
  const scrollOffsetRef = useRef(0)
  const scrollAnchorRef = useRef<VirtualizedScrollAnchor>(null)
  const scrollSuppression = useWorktreeSidebarScrollSuppression()
  const { markDirectScrollInput, markScrollMovement } = scrollSuppression

  const firstHeaderIndex = useMemo(
    () => rows.findIndex((row) => row.type === 'header' || row.type === 'host-header'),
    [rows]
  )

  const { toggleGroupWithScrollAnchor } = useGroupToggleWithScrollAnchor({
    scrollRef: containerRef,
    toggleGroup: onToggleRowCollapse
  })

  const virtualization = useWorktreeListVirtualizer({
    rows,
    firstHeaderIndex,
    scrollRef: containerRef,
    scrollOffsetRef,
    suppressMeasurementAdjustmentUntilRef: scrollSuppression.suppressMeasurementAdjustmentUntilRef
  })

  const { virtualItems, measureVirtualRowElement } = useVirtualRowMeasurementSync({
    rows,
    virtualization,
    scrollRef: containerRef,
    scrollOffsetRef,
    scrollAnchorRef,
    hasDirectScrollInput: scrollSuppression.hasDirectScrollInput,
    shouldSkipScrollAnchorRestore: scrollSuppression.shouldSkipScrollAnchorRestore
  })

  const { handleContainerKeyDown } = useWorktreeListKeyboardNavigation({
    rows,
    activeRowKey,
    pinnedDisplayPolicy,
    onActivateRow,
    virtualizer: virtualization.virtualizer,
    scrollRef: containerRef,
    markDirectScrollInput
  })

  useWorktreeListRevealScroll({
    rows,
    revealPath,
    virtualizer: virtualization.virtualizer,
    markDirectScrollInput
  })

  const { showScrollToTop, scrollToTop } = useWorktreeListScrollToTop({
    scrollElement,
    onUserScrollIntent: markDirectScrollInput
  })

  const activeOptionId = activeRowKey === null ? undefined : getWorktreeOptionId(activeRowKey)
  const activeDescendantOptionId = getActiveDescendantOptionId({
    rows,
    virtualItems,
    activeOptionId
  })

  // Why: the caller's ref (panel scroll container, drag geometry, anchor recording) has to name
  // the element that actually scrolls, so the node is published there as well.
  const setScrollRootRef = useCallback(
    (node: HTMLDivElement | null) => {
      containerRef.current = node
      scrollRef.current = node
      setScrollElement(node)
    },
    [scrollRef]
  )

  const handleScroll = useCallback(() => {
    scrollOffsetRef.current = containerRef.current?.scrollTop ?? 0
    markScrollMovement()
  }, [markScrollMovement])

  // Why: a scrollbar drag is direct input, but it fires no wheel event — hit-test the
  // scrollbar strip so the virtualizer's scroll guards engage.
  const handleScrollPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const scrollbarWidth = event.currentTarget.offsetWidth - event.currentTarget.clientWidth
      if (scrollbarWidth <= 0) {
        return
      }
      const rect = event.currentTarget.getBoundingClientRect()
      if (event.clientX >= rect.right - scrollbarWidth) {
        markDirectScrollInput()
      }
    },
    [markDirectScrollInput]
  )

  return (
    <div data-worktree-sidebar-container className={cn('relative h-full min-h-0', className)}>
      <div
        ref={setScrollRootRef}
        data-worktree-sidebar
        tabIndex={0}
        role="listbox"
        aria-label={translate('auto.components.sidebar.WorktreeList.bfbedc547b', 'Worktrees')}
        aria-orientation="vertical"
        aria-activedescendant={activeDescendantOptionId}
        onKeyDown={handleContainerKeyDown}
        onScroll={handleScroll}
        onPointerDown={handleScrollPointerDown}
        onTouchMove={markDirectScrollInput}
        onWheel={markDirectScrollInput}
        className="worktree-sidebar-scrollbar h-full overflow-y-auto overflow-x-hidden pl-1 pr-3 pt-px scrollbar-sleek outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-inset"
        style={WORKTREE_SIDEBAR_SCROLL_STYLE}
      >
        <div
          role="presentation"
          className="relative w-full"
          style={{ height: `${virtualization.virtualizer.getTotalSize()}px` }}
        >
          {dropIndicator}
          {virtualItems.map((virtualItem) => {
            const row = rows[virtualItem.index]
            if (!row) {
              return null
            }
            const optionId = getRowOptionId(row)
            return (
              <div
                key={virtualItem.key}
                role="presentation"
                data-worktree-virtual-row
                data-worktree-virtual-row-key={String(virtualItem.key)}
                data-worktree-virtual-row-start={virtualItem.start}
                data-index={virtualItem.index}
                ref={measureVirtualRowElement}
                className={cn(
                  'absolute left-0 right-0 top-0',
                  shouldUseHeaderTopSpacing({ rows, index: virtualItem.index, firstHeaderIndex }) &&
                    'pt-1'
                )}
                style={{ transform: getVirtualRowTransform(virtualItem.start) }}
              >
                {renderRow(row, {
                  toggleCollapse: () => toggleGroupWithScrollAnchor(row),
                  optionId,
                  isActive: optionId !== undefined && optionId === activeOptionId
                })}
              </div>
            )
          })}
        </div>
      </div>
      {showScrollToTop ? <WorktreeListScrollToTopButton onClick={scrollToTop} /> : null}
    </div>
  )
})
