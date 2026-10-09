import React, { useCallback, useLayoutEffect, useMemo, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { GitWorktreeInfo } from '../types'
import WorkspaceBoardCard from './WorkspaceBoardCard'
import { registerWorkspaceBoardVirtualCardLayout } from './workspace-board-virtual-card-layout'
import {
  WORKSPACE_BOARD_CARD_GAP,
  WORKSPACE_BOARD_CARD_OVERSCAN,
  estimateWorkspaceBoardCardHeight
} from './workspace-board-virtual-lanes'
import type { WorkspaceBoardCard as WorkspaceBoardCardModel } from './workspace-board-worktrees'

type WorkspaceBoardStatusLaneCardListProps = {
  cards: readonly WorkspaceBoardCardModel[]
  /**
   * The lane body the list scrolls inside, owned by the lane. Handed over as an element, not a
   * ref: this list is a child of that body, so a layout effect here runs before the lane's own
   * element ref is attached and a ref read would see `null`.
   */
  scrollerElement: HTMLDivElement | null
  compactCards: boolean
  /** The board's selection, by host-qualified card identity. */
  selectedWorktreeIds: ReadonlySet<string>
  onSelectionGesture: (event: React.MouseEvent<HTMLElement>, worktreeIdentity: string) => boolean
  onActivate: (worktree: GitWorktreeInfo) => void
  onSelectSession?: (sessionId: string) => void
  onContextMenu?: (event: React.MouseEvent, card: WorkspaceBoardCardModel) => void
}

/**
 * Ported from Orca `WorkspaceKanbanLaneCardList`: the lane's cards, virtualized on the
 * vertical axis. Board cards are the sidebar's rich cards, so heights vary — the estimate only
 * seeds the first window and every painted card replaces it with its measured height
 * (`measureElement`), which is what keeps the lane from reflowing as cards come into view.
 *
 * The list also registers its measured layout for the card drag, so an insertion slot whose
 * card is outside the painted window still resolves to the right lane index.
 */
function WorkspaceBoardStatusLaneCardList({
  cards,
  scrollerElement,
  compactCards,
  selectedWorktreeIds,
  onSelectionGesture,
  onActivate,
  onSelectSession,
  onContextMenu
}: WorkspaceBoardStatusLaneCardListProps): React.JSX.Element {
  const spacerRef = useRef<HTMLDivElement | null>(null)
  // Why the identities, not just the count: the marquee's hit test needs a rectangle per card
  // the lane holds, including the ones the vertical virtualizer has not mounted.
  const itemIdentities = useMemo(() => cards.map((card) => card.identity), [cards])
  const itemIdentitiesRef = useRef(itemIdentities)
  itemIdentitiesRef.current = itemIdentities
  const estimateSize = useCallback(
    () => estimateWorkspaceBoardCardHeight(compactCards),
    [compactCards]
  )
  const getItemKey = useCallback(
    (index: number) => cards[index]?.identity ?? index,
    [cards]
  )
  const virtualizer = useVirtualizer({
    count: cards.length,
    getScrollElement: () => scrollerElement,
    estimateSize,
    getItemKey,
    overscan: WORKSPACE_BOARD_CARD_OVERSCAN,
    gap: WORKSPACE_BOARD_CARD_GAP,
    // Why: sync-flushing rich card renders inside the scroll listener stalls the wheel;
    // async + overscan keeps the lane filled without blocking input.
    useFlushSync: false
  })

  useLayoutEffect(() => {
    const spacerElement = spacerRef.current
    if (!scrollerElement || !spacerElement) {
      return
    }
    return registerWorkspaceBoardVirtualCardLayout({
      scrollElement: scrollerElement,
      spacerElement,
      getItemIdentities: () => itemIdentitiesRef.current,
      getMeasurements: () => virtualizer.measurementsCache
    })
  }, [scrollerElement, virtualizer])

  // Why the guard: `measure()` drops every measured height, so it must run only when the
  // estimate itself changed — calling it on mount would discard the heights the painted cards
  // just reported and leave the lane at the estimate forever.
  const estimateInputRef = useRef(compactCards)
  useLayoutEffect(() => {
    if (estimateInputRef.current === compactCards) {
      return
    }
    estimateInputRef.current = compactCards
    virtualizer.measure()
  }, [compactCards, virtualizer])

  return (
    <div
      ref={spacerRef}
      className="relative w-full"
      style={{ height: `${virtualizer.getTotalSize()}px` }}
    >
      {virtualizer.getVirtualItems().map((virtualItem) => {
        const card = cards[virtualItem.index]
        if (!card) {
          return null
        }
        return (
          <div
            key={virtualItem.key}
            data-index={virtualItem.index}
            ref={virtualizer.measureElement}
            className="absolute left-0 top-0 w-full"
            style={{ transform: `translateY(${virtualItem.start}px)` }}
          >
            <WorkspaceBoardCard
              card={card}
              compactCards={compactCards}
              isSelected={selectedWorktreeIds.has(card.identity)}
              onSelectionGesture={onSelectionGesture}
              onActivate={onActivate}
              onSelectSession={onSelectSession}
              onContextMenu={onContextMenu}
            />
          </div>
        )
      })}
    </div>
  )
}

export default React.memo(WorkspaceBoardStatusLaneCardList)
