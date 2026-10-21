// Ported from Orca — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: orca/src/renderer/src/components/sidebar/worktree-list/drag/pointer-flush.ts
import { updateSidebarDragPreviewPosition } from '../pointer-drag-dom'
import {
  getWorkspaceBoardSidebarDropTarget,
  hasWorkspaceBoardSidebarDropBoard,
  updateWorkspaceBoardSidebarDropTargetVisual
} from '../../workspace-board/workspace-board-sidebar-drop'
import type { WorktreeDropCommitContext } from './drop-commit-context'
import {
  applyWorktreeDropPreview,
  applyWorktreeLineageDropPreview,
  clearWorktreeDropPreview,
  clearWorktreeLineageDropPreview,
  type WorktreePointerDrag,
  type WorktreeRowDragState
} from './row-state'
import {
  findWorktreeNestingTarget,
  updateWorktreeLineageDropTargetVisual
} from './nesting'
import {
  findSidebarSectionDropTarget,
  updateSidebarSectionDropVisual
} from './section-drop'

/** Crossing a gutter into the next card is an intent; it settles before the line moves. */
const REORDER_INTENT_DELAY_MS = 160

export type WorktreePointerDragFrameArgs = {
  drag: WorktreePointerDrag
  ctx: WorktreeDropCommitContext
  setWorktreeDragState: React.Dispatch<React.SetStateAction<WorktreeRowDragState>>
}

/**
 * One animation frame of an in-flight pointer drag: move the floating preview, then
 * re-decide the insertion slot the pointer is over. The row offsets and the indicator
 * only repaint when that decision changes, so a frame that crosses no slot costs no
 * React work.
 */
export function flushWorktreePointerDragFrame(args: WorktreePointerDragFrameArgs): void {
  const { drag, ctx } = args
  drag.frameId = null
  if (!drag.active || !drag.preview) {
    return
  }
  updateSidebarDragPreviewPosition({
    preview: drag.preview,
    pointerX: drag.currentX,
    pointerY: drag.currentY,
    offsetX: drag.previewOffsetX,
    offsetY: drag.previewOffsetY
  })
  if (!ctx.refreshWorktreeDragSession()) {
    ctx.clearWorktreeDrag()
    return
  }
  // Orca D03a-012: a card drag opens the board up front so its lanes are a visible
  // destination, instead of the user having to discover the edge.
  if (
    !drag.workspaceBoardDragPreviewRequested &&
    !ctx.workspaceBoardOpen &&
    !hasWorkspaceBoardSidebarDropBoard()
  ) {
    drag.workspaceBoardDragPreviewRequested = true;
    ctx.onWorkspaceBoardDragPreviewStart();
  }
  // Why the board first: its lane resolves from its own measured layout, and a drop there
  // assigns a status instead of reordering the list — so the list's own slot must not be
  // computed for the same frame, or its insertion line would promise a reorder.
  const boardTarget = getWorkspaceBoardSidebarDropTarget(drag.currentX, drag.currentY)
  updateWorkspaceBoardSidebarDropTargetVisual(boardTarget)
  if (boardTarget) {
    args.setWorktreeDragState((previous) => clearWorktreeDropPreview(previous))
    return
  }
  // A section header under the pointer is a membership write (pin/status); the
  // insertion line must not promise a reorder on top of it.
  const sectionTarget = findSidebarSectionDropTarget(drag.currentX, drag.currentY)
  updateSidebarSectionDropVisual(sectionTarget)
  if (sectionTarget) {
    drag.reorderIntent = null
    args.setWorktreeDragState((previous) =>
      clearWorktreeDropPreview(clearWorktreeLineageDropPreview(previous), {
        preserveOffsets: true
      })
    )
    return
  }

  // Why before the reorder slot: hovering a card promises a nest, and painting an
  // insertion line at the same time would offer two contradictory drops.
  const nestingTarget = findWorktreeNestingTarget({
    pointerX: drag.currentX,
    pointerY: drag.currentY,
    draggedIds: drag.draggedIds,
    parentIdByChildId: ctx.lineageParentIdByChildId
  })
  updateWorktreeLineageDropTargetVisual(nestingTarget)
  if (nestingTarget) {
    drag.reorderIntent = null
    args.setWorktreeDragState((previous) =>
      applyWorktreeLineageDropPreview(previous, nestingTarget)
    )
    return
  }
  const drop = ctx.computeWorktreeDrop(drag.currentY)
  if (!drop) {
    drag.reorderIntent = null
    args.setWorktreeDragState((previous) =>
      clearWorktreeDropPreview(clearWorktreeLineageDropPreview(previous))
    )
    return
  }
  // Let the pointer cross a reorder gutter into the card before moving the target.
  let intent = drag.reorderIntent
  if (!intent || (intent.dropIndex !== drop.dropIndex && intent.pointerY !== drag.currentY)) {
    intent = { dropIndex: drop.dropIndex, pointerY: drag.currentY, startedAt: performance.now() }
  } else {
    // Autoscroll changes slots beneath a stationary pointer without renewing intent.
    intent.dropIndex = drop.dropIndex
    intent.pointerY = drag.currentY
  }
  drag.reorderIntent = intent
  if (performance.now() - intent.startedAt < REORDER_INTENT_DELAY_MS) {
    args.setWorktreeDragState((previous) =>
      clearWorktreeDropPreview(clearWorktreeLineageDropPreview(previous), {
        preserveOffsets: true
      })
    )
    drag.frameId = window.requestAnimationFrame(() => flushWorktreePointerDragFrame(args))
    return
  }
  args.setWorktreeDragState((previous) => {
    const withoutNesting = clearWorktreeLineageDropPreview(previous)
    return applyWorktreeDropPreview(withoutNesting, drop)
  })
}
