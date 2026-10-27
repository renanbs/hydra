// Ported from Orca — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: orca/src/renderer/src/components/sidebar/worktree-list/drag/pointer-commit.ts
import { getFullDropIndexForWorktreeDragUnit } from '../../worktree-drag-units'
import { isWorkspaceBoardPinDropTarget } from '../../workspace-board/drag/workspace-board-card-drag-dom'
import { getWorkspaceBoardSidebarDropTarget } from '../../workspace-board/workspace-board-sidebar-drop'
import type { WorktreeDropCommitContext } from './drop-commit-context'
import type { WorktreePointerDrag } from './row-state'
import {
  clearWorktreeLineageDropTargetVisual,
  findWorktreeNestingTarget
} from './nesting'
import {
  clearSidebarSectionDropVisual,
  findSidebarSectionDropTarget
} from './section-drop'

/**
 * Releases outside the sidebar's horizontal band are throws away, not reorders: the
 * list's rows and the terminal beside them sit at the same Y, so a bare Y hit test
 * would reorder the list from a pointer that is obviously not over it.
 */
function isReleaseInsideSidebar(drag: WorktreePointerDrag, ctx: WorktreeDropCommitContext): boolean {
  const container = ctx.scrollRef.current
  if (!container) {
    return false
  }
  const rect = container.getBoundingClientRect()
  return drag.currentX >= rect.left && drag.currentX <= rect.right
}

/**
 * Resolve where a released pointer drag lands: a workspace board lane (a status
 * assignment, never a reorder), a reorder slot inside the source group, or nothing at
 * all. No-op releases (the drop resolves to the order the group already has) never reach
 * the order writer.
 */
export function commitWorktreePointerDrop(args: {
  drag: WorktreePointerDrag
  ctx: WorktreeDropCommitContext
}): void {
  const { drag, ctx } = args
  if (!ctx.refreshWorktreeDragSession()) {
    clearWorktreeLineageDropTargetVisual()
    ctx.clearWorktreeDrag()
    return
  }
  // A section header under the release is a membership write: pinning or moving
  // to the status lane, exactly as the board's own targets do.
  const sectionTarget = findSidebarSectionDropTarget(drag.currentX, drag.currentY)
  if (sectionTarget) {
    clearSidebarSectionDropVisual()
    if (sectionTarget.kind === "pin") {
      ctx.onPinWorktrees(drag.draggedIds)
    } else {
      ctx.onAssignWorktreesStatus(drag.draggedIds, sectionTarget.status)
    }
    ctx.clearWorktreeDrag()
    return
  }
  clearSidebarSectionDropVisual()
  // A nest is committed against the card under the release point, before any
  // reorder/board target: the ring the user saw is the promise being kept.
  const nestingTarget = findWorktreeNestingTarget({
    pointerX: drag.currentX,
    pointerY: drag.currentY,
    draggedIds: drag.draggedIds,
    parentIdByChildId: ctx.lineageParentIdByChildId
  })
  if (nestingTarget) {
    clearWorktreeLineageDropTargetVisual()
    ctx.onNestWorktrees(nestingTarget, drag.draggedIds)
    ctx.clearWorktreeDrag()
    return
  }
  clearWorktreeLineageDropTargetVisual()
  // Why before the sidebar band test: the board sits outside the list's horizontal band,
  // so a release over it would otherwise read as a throw-away.
  const boardTarget = getWorkspaceBoardSidebarDropTarget(drag.currentX, drag.currentY)
  if (boardTarget) {
    if (isWorkspaceBoardPinDropTarget(boardTarget)) {
      ctx.onPinWorktrees(drag.draggedIds)
    } else {
      ctx.onAssignWorktreesStatus(drag.draggedIds, boardTarget.status)
    }
    ctx.clearWorktreeDrag()
    return
  }
  if (!isReleaseInsideSidebar(drag, ctx)) {
    ctx.clearWorktreeDrag()
    return
  }
  const drop = ctx.computeWorktreeDrop(drag.currentY)
  if (drop) {
    // Orca `use-lineage-drop-commit`: a nested row dropped on a reorder line
    // leaves its parent instead of staying in a tree the user just moved it out of.
    const nestedIds = drag.reorderDraggedIds.filter((id) =>
      ctx.lineageParentIdByChildId.has(id)
    )
    if (nestedIds.length > 0) {
      ctx.onUnnestWorktrees(nestedIds)
    }
    ctx.onReorderWorktrees({
      groups: ctx.worktreeDragGroups,
      sourceGroupKey: drag.sourceGroupKey,
      draggedIds: drag.reorderDraggedIds,
      dropIndex: getFullDropIndexForWorktreeDragUnit({
        groups: ctx.worktreeDragUnitGroups,
        sourceGroupKey: drag.sourceGroupKey,
        dropIndex: drop.dropIndex
      })
    })
  }
  ctx.clearWorktreeDrag()
}
