// Ported from Orca — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: orca/src/renderer/src/components/sidebar/worktree-list/drag/pointer-commit.ts
import type { WorktreeDropCommitContext } from './drop-commit-context'
import { commitWorktreeDropAtPoint } from './drop-commit'
import type { WorktreePointerDrag } from './row-state'

/**
 * Releases a live pointer drag. The resolution itself is shared with the native and
 * document paths (`drop-commit.ts`): a pointer release requires the list's horizontal
 * band, and reaching the board keeps the preview it opened.
 */
export function commitWorktreePointerDrop(args: {
  drag: WorktreePointerDrag
  ctx: WorktreeDropCommitContext
}): void {
  const { drag, ctx } = args
  commitWorktreeDropAtPoint({
    ctx,
    point: { x: drag.currentX, y: drag.currentY },
    draggedIds: drag.draggedIds,
    reorderDraggedIds: drag.reorderDraggedIds,
    sourceGroupKey: drag.sourceGroupKey,
    executionHostId: drag.executionHostId,
    requireInsideSidebarBand: true,
    onBoardTarget: () => {
      drag.boardPreviewCommitted = true
      ctx.onWorkspaceBoardDragPreviewCommit()
    }
  })
}
