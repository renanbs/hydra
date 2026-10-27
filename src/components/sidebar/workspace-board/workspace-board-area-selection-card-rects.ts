import { getWorkspaceBoardVirtualCardItemRects } from './workspace-board-virtual-card-layout'

/** The lane body the virtualized card list scrolls inside; one per lane. */
export const WORKSPACE_BOARD_AREA_SELECTION_SCROLL_CONTAINER_SELECTOR =
  '[data-workspace-board-card-scroller]'

/** Rounded card slot in the board's viewport coordinates. */
export type WorkspaceBoardAreaSelectionViewportRect = {
  left: number
  top: number
  right: number
  bottom: number
}

/** A card's slot rebased into its lane's content space, to survive a scroll mid-drag. */
type WorkspaceBoardAreaSelectionCardContentRect = {
  top: number
  bottom: number
  containerTop: number
  scrollTop: number
}

export type WorkspaceBoardAreaSelectionCardRect = {
  id: string
  /** The painted card element, or `null` for a slot only the measured layout knows. */
  element: HTMLElement | null
  rect: WorkspaceBoardAreaSelectionViewportRect
  scrollContainer: HTMLElement | null
  contentRect: WorkspaceBoardAreaSelectionCardContentRect | null
}

/**
 * Every card the board holds, with the geometry the marquee hit-tests against.
 *
 * Ported from Orca `workspace-kanban-area-selection-card-rects`. The measured virtual layout
 * comes first — it answers for cards the vertical virtualizer left outside its window — and the
 * painted card elements then override it with exact pixels and an element to preview on. A
 * marquee that only read the DOM would miss every card below the painted window.
 */
export function getWorkspaceBoardAreaSelectionCardRects(
  board: HTMLElement
): WorkspaceBoardAreaSelectionCardRect[] {
  const cardRects = new Map<string, WorkspaceBoardAreaSelectionCardRect>()
  const scrollMetrics = new Map<HTMLElement, { containerTop: number; scrollTop: number }>()
  const scrollContainers = board.querySelectorAll<HTMLElement>(
    WORKSPACE_BOARD_AREA_SELECTION_SCROLL_CONTAINER_SELECTOR
  )
  for (const scrollContainer of scrollContainers) {
    const virtualRects = getWorkspaceBoardVirtualCardItemRects(scrollContainer)
    if (!virtualRects) {
      continue
    }
    const containerTop = scrollContainer.getBoundingClientRect().top
    const scrollTop = scrollContainer.scrollTop
    scrollMetrics.set(scrollContainer, { containerTop, scrollTop })
    for (const virtualRect of virtualRects) {
      cardRects.set(virtualRect.id, {
        id: virtualRect.id,
        element: null,
        rect: {
          left: virtualRect.left,
          top: virtualRect.top,
          right: virtualRect.right,
          bottom: virtualRect.bottom
        },
        scrollContainer,
        contentRect: {
          top: virtualRect.contentTop,
          bottom: virtualRect.contentBottom,
          containerTop,
          scrollTop
        }
      })
    }
  }

  const cards = board.querySelectorAll<HTMLElement>('[data-workspace-board-card-id]')
  for (const card of cards) {
    const id = card.dataset.workspaceBoardCardId
    if (!id) {
      continue
    }
    const rect = card.getBoundingClientRect()
    const scrollContainer = card.closest<HTMLElement>(
      WORKSPACE_BOARD_AREA_SELECTION_SCROLL_CONTAINER_SELECTOR
    )
    let metrics = scrollContainer ? scrollMetrics.get(scrollContainer) : undefined
    if (scrollContainer && !metrics) {
      metrics = {
        containerTop: scrollContainer.getBoundingClientRect().top,
        scrollTop: scrollContainer.scrollTop
      }
      scrollMetrics.set(scrollContainer, metrics)
    }
    cardRects.set(id, {
      id,
      element: card,
      rect: {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom
      },
      scrollContainer,
      contentRect: metrics
        ? {
            top: rect.top - metrics.containerTop + metrics.scrollTop,
            bottom: rect.bottom - metrics.containerTop + metrics.scrollTop,
            containerTop: metrics.containerTop,
            scrollTop: metrics.scrollTop
          }
        : null
    })
  }
  return Array.from(cardRects.values())
}
