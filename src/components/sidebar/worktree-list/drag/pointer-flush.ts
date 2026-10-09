// Ported from Orca — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: orca/src/renderer/src/components/sidebar/worktree-list/drag/pointer-flush.ts
import { updateSidebarDragPreviewPosition } from '../pointer-drag-dom'
import {
  getWorkspaceBoardSidebarDropTarget,
  updateWorkspaceBoardSidebarDropTargetVisual
} from '../../workspace-board/workspace-board-sidebar-drop'
import type { WorktreeDropCommitContext } from './drop-commit-context'
import {
  applyWorktreeDropPreview,
  clearWorktreeDropPreview,
  type WorktreePointerDrag,
  type WorktreeRowDragState
} from './row-state'

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
  // Why the board first: its lane resolves from its own measured layout, and a drop there
  // assigns a status instead of reordering the list — so the list's own slot must not be
  // computed for the same frame, or its insertion line would promise a reorder.
  const boardTarget = getWorkspaceBoardSidebarDropTarget(drag.currentX, drag.currentY)
  updateWorkspaceBoardSidebarDropTargetVisual(boardTarget)
  if (boardTarget) {
    args.setWorktreeDragState((previous) => clearWorktreeDropPreview(previous))
    return
  }
  const drop = ctx.computeWorktreeDrop(drag.currentY)
  args.setWorktreeDragState((previous) =>
    drop ? applyWorktreeDropPreview(previous, drop) : clearWorktreeDropPreview(previous)
  )
}
