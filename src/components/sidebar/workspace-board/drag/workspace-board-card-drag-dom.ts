import type { WorkspaceStatus } from '../../../../shared/worktree/types'
import { getWorkspaceBoardVirtualLaneSlots } from '../workspace-board-virtual-lane-layout'
import {
  getWorkspaceBoardVirtualCardItemCount,
  resolveWorkspaceBoardVirtualCardSlot
} from '../workspace-board-virtual-card-layout'

/** The board's own card hook: `data-workspace-board-card-id` on the card frame. */
export const WORKSPACE_BOARD_CARD_SELECTOR = '[data-workspace-board-card-id]'

/** One lane root per user status; also the element the drop highlight paints. */
export const WORKSPACE_BOARD_LANE_SELECTOR = '[data-workspace-status]'

/** The lane body the virtualized card list scrolls inside. */
export const WORKSPACE_BOARD_CARD_SCROLLER_SELECTOR = '[data-workspace-board-card-scroller]'

export const WORKSPACE_BOARD_DROP_INDICATOR_ATTR = 'data-workspace-board-card-drop-indicator'

/**
 * Why not the lanes' own `data-workspace-status`: the line is appended to the body, and a
 * second element carrying that hook would be picked up by any unscoped lane query.
 */
const WORKSPACE_BOARD_DROP_STATUS_ATTR = 'data-workspace-board-card-drop-status'

/** Dropping in the visual gap between lanes still lands in the nearest lane. */
const STATUS_DROP_GAP_TOLERANCE_PX = 24

/** How far a release may trail the last resolved target and still commit to it. */
const COMMIT_TARGET_FALLBACK_TOLERANCE_PX = 6

const DROP_INDICATOR_HORIZONTAL_INSET_PX = 8
const DROP_INDICATOR_MIN_WIDTH_PX = 32

/** Where the insertion line sits inside a lane that has no card to hang it from. */
const EMPTY_LANE_INDICATOR_OFFSET_PX = 14

export type WorkspaceBoardLaneDropRect = {
  status: WorkspaceStatus
  left: number
  top: number
  right: number
  bottom: number
}

export type WorkspaceBoardCardDropRect = {
  top: number
  bottom: number
  /** The card's index inside its lane; rendered order alone is not lane order. */
  index?: number
}

export type WorkspaceBoardLaneBox = {
  left: number
  top: number
  width: number
}

export type WorkspaceBoardCardLaneDropTarget = {
  status: WorkspaceStatus
  /** Insertion slot inside the lane, in the lane's own index space. */
  dropIndex: number
  /** Viewport Y of the insertion line (the indicator is `position: fixed`). */
  dropIndicatorY: number
  laneRect: WorkspaceBoardLaneBox
}

/**
 * The board's pin strip (D08-028): a release over it pins the dragged workspace and writes
 * no status, so the target carries neither a lane nor an insertion slot. Only this member
 * of the union has `isPinDrop`, which is what tells the two apart.
 */
export type WorkspaceBoardPinDropTarget = {
  status: null
  dropIndex: 0
  isPinDrop: true
}

export type WorkspaceBoardCardDropTarget =
  | WorkspaceBoardCardLaneDropTarget
  | { status: null; dropIndex: number }
  | WorkspaceBoardPinDropTarget

export type WorkspaceBoardCardTrackedDropTarget = {
  target: WorkspaceBoardCardDropTarget
  x: number
  y: number
}

/** Whether a resolved target is the pin strip — the one target that is not a lane. */
export function isWorkspaceBoardPinDropTarget(
  target: WorkspaceBoardCardDropTarget
): target is WorkspaceBoardPinDropTarget {
  return target.status === null && 'isPinDrop' in target
}



/**
 * Geometry of the destination lane, from the lanes' live rects. Rects are viewport
 * coordinates, so the board's horizontal scroll is already baked in — a lane scrolled
 * halfway off the sheet reports the rect the pointer actually sees.
 *
 * Returns the matched entry itself (not just its status) so the DOM caller keeps the
 * lane element the rect came from without a second lookup.
 */
export function resolveWorkspaceBoardLaneDropRect<T extends WorkspaceBoardLaneDropRect>(
  rects: readonly T[],
  x: number,
  y: number,
  gapTolerance = STATUS_DROP_GAP_TOLERANCE_PX
): T | null {
  let nearest: { rect: T; distance: number } | null = null

  for (const rect of rects) {
    if (y < rect.top || y > rect.bottom) {
      continue
    }
    if (x >= rect.left && x <= rect.right) {
      return rect
    }
    const distance = x < rect.left ? rect.left - x : x - rect.right
    if (distance > gapTolerance) {
      continue
    }
    if (!nearest || distance < nearest.distance) {
      nearest = { rect, distance }
    }
  }

  return nearest?.rect ?? null
}

/**
 * The slot the pointer sits above, in the lane's index space: the first card whose
 * midpoint is below the pointer wins, otherwise the end of the lane. Cards carry their
 * own index, so a lane the board renders partially still reports a lane-accurate slot.
 */
export function resolveWorkspaceBoardCardDropIndexFromRects(
  rects: readonly WorkspaceBoardCardDropRect[],
  y: number
): number {
  for (let index = 0; index < rects.length; index++) {
    const rect = rects[index]!
    if (y < (rect.top + rect.bottom) / 2) {
      return rect.index ?? index
    }
  }
  const last = rects.at(-1)
  return last?.index !== undefined ? last.index + 1 : rects.length
}

/**
 * Viewport Y of the insertion line: above the card that owns the slot, in the gap before
 * it, or past the last card. An empty lane anchors the line just under its header.
 */
export function resolveWorkspaceBoardCardDropIndicatorY(
  rects: readonly WorkspaceBoardCardDropRect[],
  dropIndex: number,
  laneTop: number
): number {
  if (rects.length === 0) {
    return laneTop + EMPTY_LANE_INDICATOR_OFFSET_PX
  }
  const slot = rects.findIndex((rect, index) => (rect.index ?? index) >= dropIndex)
  if (slot === -1) {
    return rects.at(-1)!.bottom + 5
  }
  if (slot === 0) {
    return rects[0]!.top - 5
  }
  return (rects[slot - 1]!.bottom + rects[slot]!.top) / 2
}

/**
 * The target a release commits to. The live hit test runs on the drag's own RAF, so the
 * pointerup can arrive with no frame for its final position: a release that trailed the
 * last resolved lane by a few pixels still commits there instead of silently dropping.
 */
export function resolveWorkspaceBoardCardDropCommitTarget(args: {
  currentTarget: WorkspaceBoardCardDropTarget
  latestTrackedTarget: WorkspaceBoardCardTrackedDropTarget | null
  x: number
  y: number
}): WorkspaceBoardCardDropTarget {
  if (args.currentTarget.status !== null || isWorkspaceBoardPinDropTarget(args.currentTarget)) {
    return args.currentTarget
  }
  const latest = args.latestTrackedTarget
  if (
    !latest ||
    (latest.target.status === null && !isWorkspaceBoardPinDropTarget(latest.target))
  ) {
    return args.currentTarget
  }
  const distance = Math.hypot(args.x - latest.x, args.y - latest.y)
  return distance <= COMMIT_TARGET_FALLBACK_TOLERANCE_PX ? latest.target : args.currentTarget
}

/** One lane as the hit test sees it: its painted rect, or its measured slot when unpainted. */
type WorkspaceBoardLaneHitRect = WorkspaceBoardLaneDropRect & { element: HTMLElement | null }

/**
 * Every lane of the board, painted or not. A painted lane reports its live rect — viewport
 * coordinates, so the board's horizontal scroll is already baked in. A lane the virtualizer has
 * outside its window reports the slot the grid measured, so a drop never depends on every lane
 * being mounted; the row's own top/bottom band is shared by every lane (`h-full`), so it is read
 * from a painted one.
 */
function getWorkspaceBoardLaneHitRects(board: HTMLElement): WorkspaceBoardLaneHitRect[] {
  const paintedLanes: WorkspaceBoardLaneHitRect[] = []
  for (const element of board.querySelectorAll<HTMLElement>(WORKSPACE_BOARD_LANE_SELECTOR)) {
    const status = element.dataset.workspaceStatus
    if (!status) {
      continue
    }
    const rect = element.getBoundingClientRect()
    paintedLanes.push({
      element,
      status,
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom
    })
  }

  const virtualSlots = getWorkspaceBoardVirtualLaneSlots(board)
  if (!virtualSlots) {
    return paintedLanes
  }
  const boardRect = board.getBoundingClientRect()
  const band = paintedLanes[0]
  const paintedByStatus = new Map(paintedLanes.map((lane) => [lane.status, lane]))
  return virtualSlots.map((slot) => {
    const painted = paintedByStatus.get(slot.status)
    if (painted) {
      return painted
    }
    return {
      element: null,
      status: slot.status,
      left: boardRect.left + slot.start,
      right: boardRect.left + slot.end,
      top: band?.top ?? boardRect.top,
      bottom: band?.bottom ?? boardRect.bottom
    }
  })
}

/**
 * The slot the pointer sits above inside the destination lane, plus the insertion line's Y.
 *
 * The painted cards answer first — their rects are exact pixels. The one case they cannot
 * answer is a pointer below the last painted card while the lane holds more: the cards are
 * virtualized too, so the lane's measured layout reports the real slot and its line position.
 */
function resolveWorkspaceBoardLaneCardSlot(args: {
  laneElement: HTMLElement
  laneTop: number
  pointerY: number
}): { dropIndex: number; dropIndicatorY: number } {
  const { laneElement, laneTop, pointerY } = args
  const cardRects = Array.from(
    laneElement.querySelectorAll<HTMLElement>(WORKSPACE_BOARD_CARD_SELECTOR)
  ).map((card) => {
    const rect = card.getBoundingClientRect()
    const index = Number.parseInt(card.dataset.workspaceBoardCardIndex ?? '', 10)
    return {
      top: rect.top,
      bottom: rect.bottom,
      ...(Number.isInteger(index) ? { index } : {})
    }
  })
  const dropIndex = resolveWorkspaceBoardCardDropIndexFromRects(cardRects, pointerY)
  const lastPainted = cardRects.at(-1)
  const lastPaintedIndex = lastPainted?.index ?? cardRects.length - 1
  const cardScroller = laneElement.querySelector<HTMLElement>(
    WORKSPACE_BOARD_CARD_SCROLLER_SELECTOR
  )
  const cardCount = cardScroller ? getWorkspaceBoardVirtualCardItemCount(cardScroller) : null
  if (
    cardScroller &&
    cardCount !== null &&
    cardCount > lastPaintedIndex + 1 &&
    dropIndex === lastPaintedIndex + 1
  ) {
    const virtualSlot = resolveWorkspaceBoardVirtualCardSlot({
      scrollElement: cardScroller,
      pointerY
    })
    if (virtualSlot) {
      return virtualSlot
    }
  }
  return {
    dropIndex,
    dropIndicatorY: resolveWorkspaceBoardCardDropIndicatorY(cardRects, dropIndex, laneTop)
  }
}

/** Resolves the lane and the insertion slot under a pointer position inside the board. */
export function getWorkspaceBoardCardDropTarget(
  board: HTMLElement,
  x: number,
  y: number
): WorkspaceBoardCardDropTarget {
  const lane = resolveWorkspaceBoardLaneDropRect(getWorkspaceBoardLaneHitRects(board), x, y)
  if (!lane) {
    return { status: null, dropIndex: 0 }
  }

  const laneRect = {
    left: lane.left,
    top: lane.top,
    width: lane.right - lane.left
  }
  // Why the fallback: a lane outside the virtual window paints no cards yet. The drag's
  // retention mounts it on the next frame, which is where its line position comes from; the
  // lane itself is already resolved, and the lane is all a release commits.
  const slot = lane.element
    ? resolveWorkspaceBoardLaneCardSlot({
        laneElement: lane.element,
        laneTop: laneRect.top,
        pointerY: y
      })
    : { dropIndex: 0, dropIndicatorY: laneRect.top + EMPTY_LANE_INDICATOR_OFFSET_PX }

  return {
    status: lane.status,
    dropIndex: slot.dropIndex,
    dropIndicatorY: slot.dropIndicatorY,
    laneRect
  }
}

export function removeWorkspaceBoardCardDropIndicator(): void {
  document.querySelector<HTMLElement>(`[${WORKSPACE_BOARD_DROP_INDICATOR_ATTR}]`)?.remove()
}

export function updateWorkspaceBoardCardDropIndicator(
  target: WorkspaceBoardCardLaneDropTarget
): void {
  const existing = document.querySelector<HTMLElement>(`[${WORKSPACE_BOARD_DROP_INDICATOR_ATTR}]`)
  const indicator = existing ?? document.createElement('div')
  if (!existing) {
    indicator.setAttribute(WORKSPACE_BOARD_DROP_INDICATOR_ATTR, 'true')
    indicator.setAttribute('aria-hidden', 'true')
    indicator.style.setProperty('position', 'fixed')
    indicator.style.setProperty('left', '0')
    indicator.style.setProperty('top', '0')
    indicator.style.setProperty('pointer-events', 'none')
    document.body.appendChild(indicator)
  }
  indicator.setAttribute(WORKSPACE_BOARD_DROP_STATUS_ATTR, target.status)
  indicator.style.setProperty(
    'width',
    `${Math.max(
      DROP_INDICATOR_MIN_WIDTH_PX,
      target.laneRect.width - DROP_INDICATOR_HORIZONTAL_INSET_PX * 2
    )}px`
  )
  indicator.style.setProperty(
    'transform',
    `translate3d(${target.laneRect.left + DROP_INDICATOR_HORIZONTAL_INSET_PX}px, ${target.dropIndicatorY}px, 0)`
  )
}
