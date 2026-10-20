// Ported from Orca — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: orca/src/renderer/src/components/sidebar/worktree-list/drag/row-state.ts
import type { WorktreeSidebarDragRect } from '../../worktree-sidebar-drag-autoscroll'
import type { WorktreeSidebarDropPreview } from '../../worktree-sidebar-drop-preview'

/**
 * The visual state a drag publishes to the rows: which card is floating, where the
 * insertion line sits, and how far every other row slides to open the gap.
 *
 * Why no `pointerY`: nothing in the painted list reads the raw pointer, and keeping
 * it here would give the state a new identity on every animation frame — re-rendering
 * every row for a pointer move that changed no slot.
 */
export type WorktreeRowDragState = {
  draggingWorktreeId: string | null
  dropIndex: number | null
  dropIndicatorY: number | null
  /** Card the pointer is hovering to nest under, or null for a reorder. */
  lineageDropTargetId: string | null
  previewOffsetsByWorktreeId: ReadonlyMap<string, number>
}

export const EMPTY_WORKTREE_DRAG_PREVIEW_OFFSETS: ReadonlyMap<string, number> = new Map()

export const WORKTREE_ROW_DRAG_INITIAL_STATE: WorktreeRowDragState = {
  draggingWorktreeId: null,
  dropIndex: null,
  dropIndicatorY: null,
  lineageDropTargetId: null,
  previewOffsetsByWorktreeId: EMPTY_WORKTREE_DRAG_PREVIEW_OFFSETS
}

export type WorktreePointerDrag = {
  pointerId: number
  sourceRow: HTMLElement
  startX: number
  startY: number
  currentX: number
  currentY: number
  worktreeId: string
  draggedIds: readonly string[]
  reorderDraggedIds: readonly string[]
  reorderUnitDraggedIds: readonly string[]
  sourceGroupKey: string
  rects: readonly WorktreeSidebarDragRect[]
  active: boolean
  preview: HTMLElement | null
  previewOffsetX: number
  previewOffsetY: number
  frameId: number | null
}

export function areWorktreeDragPreviewOffsetsEqual(
  a: ReadonlyMap<string, number>,
  b: ReadonlyMap<string, number>
): boolean {
  if (a === b) {
    return true
  }
  if (a.size !== b.size) {
    return false
  }
  for (const [key, value] of a) {
    if (b.get(key) !== value) {
      return false
    }
  }
  return true
}

export function applyWorktreeDropPreview(
  previous: WorktreeRowDragState,
  drop: WorktreeSidebarDropPreview
): WorktreeRowDragState {
  const unchanged =
    previous.dropIndex === drop.dropIndex &&
    previous.dropIndicatorY === drop.dropIndicatorY &&
    areWorktreeDragPreviewOffsetsEqual(
      previous.previewOffsetsByWorktreeId,
      drop.previewOffsetsByWorktreeId
    )
  return unchanged && previous.lineageDropTargetId === null
    ? previous
    : {
        draggingWorktreeId: previous.draggingWorktreeId,
        dropIndex: drop.dropIndex,
        dropIndicatorY: drop.dropIndicatorY,
        lineageDropTargetId: null,
        previewOffsetsByWorktreeId: drop.previewOffsetsByWorktreeId
      }
}

/** Drop the insertion line and the row offsets a frame had opened. */
export function clearWorktreeDropPreview(previous: WorktreeRowDragState): WorktreeRowDragState {
  const unchanged =
    previous.dropIndex === null &&
    previous.dropIndicatorY === null &&
    previous.previewOffsetsByWorktreeId.size === 0
  return unchanged
    ? previous
    : {
        draggingWorktreeId: previous.draggingWorktreeId,
        dropIndex: null,
        dropIndicatorY: null,
        lineageDropTargetId: previous.lineageDropTargetId,
        previewOffsetsByWorktreeId: EMPTY_WORKTREE_DRAG_PREVIEW_OFFSETS
      }
}

/** The pointer is over a nestable card: the insertion line gives way to the parent ring. */
export function applyWorktreeLineageDropPreview(
  previous: WorktreeRowDragState,
  targetId: string
): WorktreeRowDragState {
  if (
    previous.lineageDropTargetId === targetId &&
    previous.dropIndex === null &&
    previous.dropIndicatorY === null &&
    previous.previewOffsetsByWorktreeId.size === 0
  ) {
    return previous
  }
  return {
    draggingWorktreeId: previous.draggingWorktreeId,
    dropIndex: null,
    dropIndicatorY: null,
    lineageDropTargetId: targetId,
    previewOffsetsByWorktreeId: EMPTY_WORKTREE_DRAG_PREVIEW_OFFSETS
  }
}

export function clearWorktreeLineageDropPreview(
  previous: WorktreeRowDragState
): WorktreeRowDragState {
  return previous.lineageDropTargetId === null
    ? previous
    : { ...previous, lineageDropTargetId: null }
}
