// Ported from Orca — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: orca/src/renderer/src/components/sidebar/worktree-list/drag/use-document-drop.ts
//
// A native row drag that leaves the row that started it still belongs to the sidebar's
// session: the capture-phase document listeners commit or abandon it before any other
// surface sees the event. This is the third drop path (with the pointer gesture and the
// card's own dragover preview) and it commits through the same shared context.
import { useEffect } from 'react'
import { getWorkspaceBoardSidebarDropTarget } from '../../workspace-board/workspace-board-sidebar-drop'
import {
  commitWorktreeDropAtPoint,
  isWorktreeDropCommitWrite,
  isWorktreeDropPointInsideSidebar
} from './drop-commit'
import type { WorktreeDropCommitContext } from './drop-commit-context'
import { clearWorktreeLineageDropTargetVisual } from './nesting'
import { clearSidebarSectionDropVisual } from './section-drop'
import type { WorktreeDragRuntime } from './use-runtime'
import type { WorktreeDragSession } from './use-session'

/**
 * The native drag's document fallback: commit a release that lands on the list, and
 * abandon anything else, including a drop outside the sidebar or a tab that goes away.
 */
export function useWorktreeDocumentDrop(args: {
  ctx: WorktreeDropCommitContext
  session: WorktreeDragSession
  runtime: WorktreeDragRuntime
}): void {
  const { ctx, session } = args
  const { nativeDragActiveRef, worktreePointerDragRef, dragExecutionHostIdRef } = args.runtime

  useEffect(() => {
    const abandonNativeDrag = (): void => {
      clearWorktreeLineageDropTargetVisual()
      clearSidebarSectionDropVisual()
      ctx.clearWorktreeDrag()
    }

    const handleDocumentDrop = (event: DragEvent): void => {
      if (!nativeDragActiveRef.current || worktreePointerDragRef.current) {
        return
      }
      const dragSession = session.worktreeDragSessionRef.current
      if (!dragSession) {
        abandonNativeDrag()
        return
      }
      const point = { x: event.clientX, y: event.clientY }
      // Why leave the event alone: the board and every surface outside the list's
      // band own their own release; this list only teardown its session.
      if (
        getWorkspaceBoardSidebarDropTarget(point.x, point.y) ||
        !isWorktreeDropPointInsideSidebar(ctx, point)
      ) {
        abandonNativeDrag()
        return
      }
      const outcome = commitWorktreeDropAtPoint({
        ctx,
        point,
        draggedIds: dragSession.draggedIds,
        reorderDraggedIds: dragSession.reorderDraggedIds,
        sourceGroupKey: dragSession.sourceGroupKey,
        executionHostId: dragExecutionHostIdRef.current,
        requireInsideSidebarBand: true
      })
      if (isWorktreeDropCommitWrite(outcome)) {
        event.preventDefault()
        event.stopPropagation()
      }
    }

    const handleDocumentDragEnd = (): void => {
      if (nativeDragActiveRef.current) {
        abandonNativeDrag()
      }
    }

    // Why: a tab that hides cannot deliver the rest of the pointer/drag sequence, so
    // no release should be committed after visibility is lost.
    const handleVisibilityChange = (): void => {
      if (document.visibilityState === 'visible') {
        return
      }
      if (nativeDragActiveRef.current || worktreePointerDragRef.current) {
        abandonNativeDrag()
      }
    }

    document.addEventListener('drop', handleDocumentDrop, true)
    document.addEventListener('dragend', handleDocumentDragEnd, true)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('drop', handleDocumentDrop, true)
      document.removeEventListener('dragend', handleDocumentDragEnd, true)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [ctx, dragExecutionHostIdRef, nativeDragActiveRef, session, worktreePointerDragRef])
}
