import type React from 'react'
import type { WorkspaceBoardAreaSelectionCardRect } from './workspace-board-area-selection-card-rects'

/**
 * One marquee session. The pointer coordinates, the board's box and the card rects are
 * captured at pointer-down and refreshed only on scroll, so the hot path (pointermove) stays
 * imperative: it writes the overlay's transform and the preview attributes and never renders
 * React.
 *
 * Ported from Orca `workspace-kanban-area-selection-state`.
 */
export type WorkspaceBoardAreaSelectionDragState = {
  /** Primary pointer that owns the marquee; a second pointer must not steer it. */
  pointerId: number
  startX: number
  startY: number
  currentX: number
  currentY: number
  /** Modifier held at pointer-down: an additive marquee unions instead of replacing. */
  additive: boolean
  /** The selection the drag started from, so preview and commit both fork off it. */
  baseSelectedIds: Set<string>
  baseAnchorId: string | null
  boardRect: DOMRect
  cardRects: readonly WorkspaceBoardAreaSelectionCardRect[]
  /**
   * Content-space Y where the marquee started inside each lane's card scroller. A lane that
   * scrolls mid-drag moves every card's viewport rect, so the hit test compares content
   * positions and the selection follows the content the user dragged across.
   */
  scrollStartContentYByElement: ReadonlyMap<HTMLElement, number>
  /** Cards the imperatively-applied preview attribute currently marks. */
  previewIds: Set<string>
  /** Ids the last frame hit-tested; what a commit without a final frame writes. */
  finalAreaIds: string[]
  started: boolean
  frameId: number | null
  scrollFrameId: number | null
}

type UpdateSelectionForArea = (
  areaIds: readonly string[],
  additive: boolean,
  baseSelectedIds?: ReadonlySet<string>,
  baseAnchorId?: string | null
) => void

export type UseWorkspaceBoardAreaSelectionParams = {
  open: boolean
  boardRef: React.RefObject<HTMLDivElement | null>
  overlayRef: React.RefObject<HTMLDivElement | null>
  selectedWorktreeIds: ReadonlySet<string>
  selectionAnchorId: string | null
  updateSelectionForArea: UpdateSelectionForArea
}

/** Orca's marquee threshold: a primary press that moves less than this is still a click. */
export const WORKSPACE_BOARD_AREA_SELECTION_DRAG_THRESHOLD = 4

/**
 * Whether a finished marquee gesture writes the selection at all.
 *
 * A plain click on empty board space is the user's "click off" gesture, so it commits an
 * empty area and clears the selection. A modifier-click on empty space is *not*: dropping the
 * selected batch because the pointer happened to land on a gap would be a data-loss-shaped
 * surprise.
 */
export function shouldCommitWorkspaceBoardAreaSelection({
  additive,
  started
}: {
  additive: boolean
  started: boolean
}): boolean {
  return started || !additive
}
