import {
  WORKSPACE_BOARD_AREA_SELECTION_SCROLL_CONTAINER_SELECTOR,
  type WorkspaceBoardAreaSelectionCardRect
} from './workspace-board-area-selection-card-rects'

/**
 * The marquee's imperative layer: geometry, hit testing and the DOM writes that must not cost
 * a React render. Ported from Orca `workspace-kanban-area-selection-dom`.
 *
 * Why imperative: a marquee moves on every pointermove frame, and re-rendering the board — the
 * lane grid, every painted rich card — 60 times a second is exactly what virtualization exists
 * to avoid. The overlay's transform and the preview ring are written straight to the DOM; only
 * the commit renders.
 */

export type WorkspaceBoardAreaSelectionRect = {
  left: number
  top: number
  width: number
  height: number
}

type WorkspaceBoardAreaSelectionAutoScrollParams = {
  pointerY: number
  containerTop: number
  containerBottom: number
  scrollTop: number
  scrollHeight: number
  clientHeight: number
  edgeSize?: number
  maxDelta?: number
}

type WorkspaceBoardAreaSelectionCardIdOptions = {
  scrollStartContentYByElement?: ReadonlyMap<HTMLElement, number>
  currentY?: number
}

/** The ring the marquee paints on a card it currently covers. */
export const WORKSPACE_BOARD_AREA_SELECTED_ATTR = 'data-workspace-board-card-area-selected'

/** How close to a lane edge the pointer starts scrolling it, and the fastest it scrolls. */
export const WORKSPACE_BOARD_AREA_SELECTION_AUTO_SCROLL_EDGE_SIZE = 48
export const WORKSPACE_BOARD_AREA_SELECTION_AUTO_SCROLL_MAX_DELTA = 22

export function getWorkspaceBoardAreaSelectionRect(
  startX: number,
  startY: number,
  currentX: number,
  currentY: number
): WorkspaceBoardAreaSelectionRect {
  const left = Math.min(startX, currentX)
  const top = Math.min(startY, currentY)
  return {
    left,
    top,
    width: Math.abs(currentX - startX),
    height: Math.abs(currentY - startY)
  }
}

/**
 * Presses that belong to something inside the board rather than to the empty surface: a card
 * (which owns its own click and drag), a control, or a scrollbar-adjacent native element. The
 * marquee must not start from those, or a card click would paint a selection rectangle.
 */
export function shouldIgnoreWorkspaceBoardAreaSelectionStart(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false
  }
  return Boolean(
    target.closest(
      [
        '[data-workspace-board-card-id]',
        'a',
        'button',
        'input',
        'select',
        'textarea',
        '[role="button"]',
        '[role="menu"]',
        '[role="menuitem"]'
      ].join(',')
    )
  )
}

/**
 * A press on a scrollbar belongs to the scrollbar. The thumb lives inside the scroll element,
 * so the only reliable tell is the pointer sitting in the last few pixels of the box on the
 * axis that actually overflows.
 */
export function isWorkspaceBoardScrollbarPointerDown(
  event: Pick<PointerEvent, 'target' | 'clientX' | 'clientY'>
): boolean {
  const target = event.target
  if (!(target instanceof HTMLElement)) {
    return false
  }
  const rect = target.getBoundingClientRect()
  const hitsVerticalScrollbar =
    target.scrollHeight > target.clientHeight && event.clientX >= rect.right - 14
  const hitsHorizontalScrollbar =
    target.scrollWidth > target.clientWidth && event.clientY >= rect.bottom - 14
  return hitsVerticalScrollbar || hitsHorizontalScrollbar
}

/**
 * The ids the marquee currently covers.
 *
 * Horizontal overlap is tested in viewport space — the lane scrolls horizontally with the
 * board, so a lane that scrolled halfway off reports the rect the pointer sees. Vertical
 * overlap is tested in *content* space for a card inside a lane scroller: the lane scrolling
 * during the drag moves the card's viewport rect without moving the content the marquee was
 * dragged across, and the user's intent follows the content, not the pixels.
 */
export function getWorkspaceBoardAreaSelectionCardIds(
  cardRects: readonly WorkspaceBoardAreaSelectionCardRect[],
  selectionRect: WorkspaceBoardAreaSelectionRect,
  options: WorkspaceBoardAreaSelectionCardIdOptions = {}
): string[] {
  const ids: string[] = []
  for (const card of cardRects) {
    const horizontalHit =
      selectionRect.left <= card.rect.right &&
      selectionRect.left + selectionRect.width >= card.rect.left
    if (!horizontalHit) {
      continue
    }
    const startContentY = card.scrollContainer
      ? options.scrollStartContentYByElement?.get(card.scrollContainer)
      : undefined
    let verticalHit =
      selectionRect.top <= card.rect.bottom &&
      selectionRect.top + selectionRect.height >= card.rect.top
    if (startContentY !== undefined && card.contentRect && options.currentY !== undefined) {
      const currentContentY =
        options.currentY - card.contentRect.containerTop + card.contentRect.scrollTop
      // Why: during lane scroll, viewport Y changes but the marquee range is
      // anchored to the content positions the user dragged across.
      verticalHit =
        Math.min(startContentY, currentContentY) <= card.contentRect.bottom &&
        Math.max(startContentY, currentContentY) >= card.contentRect.top
    }
    if (verticalHit) {
      ids.push(card.id)
    }
  }
  return ids
}

/**
 * Where the marquee started, expressed in each lane's content space. Captured at pointer-down,
 * before any auto-scroll can move the lanes, so the hit test can tell "the pointer swept past
 * this card" from "the lane scrolled this card under the pointer".
 */
export function getWorkspaceBoardAreaSelectionScrollStartContentYByElement(
  board: HTMLElement,
  pointerY: number
): Map<HTMLElement, number> {
  const startContentYByElement = new Map<HTMLElement, number>()
  const containers = board.querySelectorAll<HTMLElement>(
    WORKSPACE_BOARD_AREA_SELECTION_SCROLL_CONTAINER_SELECTOR
  )
  for (const element of containers) {
    const rect = element.getBoundingClientRect()
    startContentYByElement.set(element, pointerY - rect.top + element.scrollTop)
  }
  return startContentYByElement
}

/**
 * How far to scroll the lane this frame: 0 away from the edges and at either limit, otherwise
 * a speed that grows with how deep into the edge zone the pointer is. `1px` minimum keeps a
 * pointer parked in the zone scrolling instead of stalling.
 */
export function getWorkspaceBoardAreaSelectionAutoScrollDelta({
  pointerY,
  containerTop,
  containerBottom,
  scrollTop,
  scrollHeight,
  clientHeight,
  edgeSize = WORKSPACE_BOARD_AREA_SELECTION_AUTO_SCROLL_EDGE_SIZE,
  maxDelta = WORKSPACE_BOARD_AREA_SELECTION_AUTO_SCROLL_MAX_DELTA
}: WorkspaceBoardAreaSelectionAutoScrollParams): number {
  const maxScrollTop = Math.max(0, scrollHeight - clientHeight)
  if (maxScrollTop <= 0) {
    return 0
  }

  const topDistance = containerTop + edgeSize - pointerY
  if (topDistance > 0 && scrollTop > 0) {
    const ratio = Math.min(1, topDistance / edgeSize)
    return -Math.min(scrollTop, Math.max(1, Math.ceil(ratio * maxDelta)))
  }

  const bottomDistance = pointerY - (containerBottom - edgeSize)
  if (bottomDistance > 0 && scrollTop < maxScrollTop) {
    const ratio = Math.min(1, bottomDistance / edgeSize)
    return Math.min(maxScrollTop - scrollTop, Math.max(1, Math.ceil(ratio * maxDelta)))
  }

  return 0
}

/**
 * The lane scroller the pointer is scrolling during the marquee: the one whose column holds
 * the pointer's X and whose box is nearest the pointer's Y. `null` when every lane is far from
 * the pointer, which is what stops the auto-scroll loop between lanes.
 */
export function getWorkspaceBoardAreaSelectionScrollContainer(
  board: HTMLElement,
  pointerX: number,
  pointerY: number
): HTMLElement | null {
  const containers = board.querySelectorAll<HTMLElement>(
    WORKSPACE_BOARD_AREA_SELECTION_SCROLL_CONTAINER_SELECTOR
  )
  let nearest: { element: HTMLElement; distance: number } | null = null

  for (const element of containers) {
    const rect = element.getBoundingClientRect()
    if (pointerX < rect.left || pointerX > rect.right) {
      continue
    }
    const distance =
      pointerY < rect.top
        ? rect.top - pointerY
        : pointerY > rect.bottom
          ? pointerY - rect.bottom
          : 0
    if (distance > WORKSPACE_BOARD_AREA_SELECTION_AUTO_SCROLL_EDGE_SIZE * 2) {
      continue
    }
    if (!nearest || distance < nearest.distance) {
      nearest = { element, distance }
    }
  }

  return nearest?.element ?? null
}

/** Paints the marquee box, or hides it when the rectangle is clipped away. */
export function setWorkspaceBoardAreaSelectionOverlayRect(
  overlay: HTMLElement | null,
  rect: WorkspaceBoardAreaSelectionRect | null
): void {
  if (!overlay || !rect) {
    overlay?.classList.add('hidden')
    return
  }
  overlay.classList.remove('hidden')
  overlay.style.transform = `translate3d(${rect.left}px, ${rect.top}px, 0)`
  overlay.style.width = `${rect.width}px`
  overlay.style.height = `${rect.height}px`
}

export function clearWorkspaceBoardAreaSelectionPreview(
  cardRects: readonly WorkspaceBoardAreaSelectionCardRect[],
  previewIds: Set<string>
): void {
  for (const card of cardRects) {
    // Why: virtual remounts replace the element; clear via live connected node when present.
    if (card.element?.isConnected && previewIds.has(card.id)) {
      card.element.removeAttribute(WORKSPACE_BOARD_AREA_SELECTED_ATTR)
    }
  }
  previewIds.clear()
}

/**
 * Marks exactly the cards the marquee covers right now, leaving the base selection's own ring
 * (`data-workspace-board-card-selected`, set by React) alone.
 *
 * Why the round trip through the DOM attribute: the vertical virtualizer unmounts and remounts
 * cards while the lane scrolls, and a remounted card starts clean. Reading the attribute the
 * element actually carries — rather than trusting the id set — is what re-applies the ring to
 * a remounted card under the same id.
 */
export function updateWorkspaceBoardAreaSelectionPreview(
  cardRects: readonly WorkspaceBoardAreaSelectionCardRect[],
  previewIds: Set<string>,
  baseSelectedIds: ReadonlySet<string>,
  additive: boolean,
  areaIds: readonly string[]
): void {
  const nextIds = additive ? new Set(baseSelectedIds) : new Set<string>()
  for (const id of areaIds) {
    nextIds.add(id)
  }

  for (const card of cardRects) {
    const element = card.element?.isConnected ? card.element : null
    if (!element) {
      if (!nextIds.has(card.id)) {
        previewIds.delete(card.id)
      }
      continue
    }
    const shouldPreview = nextIds.has(card.id)
    // Why: virtualization can remount the same card id; trust the live attr, not previewIds alone.
    const isPreviewed = element.getAttribute(WORKSPACE_BOARD_AREA_SELECTED_ATTR) === 'true'
    if (shouldPreview === isPreviewed) {
      if (shouldPreview) {
        previewIds.add(card.id)
      } else {
        previewIds.delete(card.id)
      }
      continue
    }
    if (shouldPreview) {
      element.setAttribute(WORKSPACE_BOARD_AREA_SELECTED_ATTR, 'true')
      previewIds.add(card.id)
    } else {
      element.removeAttribute(WORKSPACE_BOARD_AREA_SELECTED_ATTR)
      previewIds.delete(card.id)
    }
  }
}
