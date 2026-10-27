// Ported from Orca — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: orca/src/renderer/src/components/sidebar/worktree-list/drag/pointer-commit.ts
import { getFullDropIndexForWorktreeDragUnit } from '../../worktree-drag-units'
import type { WorktreeDropCommitContext } from './drop-commit-context'
import type { WorktreePointerDrag } from './row-state'

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
 * Resolve where a released pointer drag lands: a reorder slot inside the source
 * group, or nothing at all. No-op releases (the drop resolves to the order the group
 * already has) never reach the order writer.
 */
export function commitWorktreePointerDrop(args: {
  drag: WorktreePointerDrag
  ctx: WorktreeDropCommitContext
}): void {
  const { drag, ctx } = args
  if (!ctx.refreshWorktreeDragSession() || !isReleaseInsideSidebar(drag, ctx)) {
    ctx.clearWorktreeDrag()
    return
  }
  const drop = ctx.computeWorktreeDrop(drag.currentY)
  if (drop) {
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
