// Ported from Orca — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: orca/src/renderer/src/components/sidebar/worktree-list/drag/use-pointer-autoscroll.ts
import { useCallback } from 'react'
import { getWorktreeSidebarDragAutoscroll } from '../../worktree-sidebar-drag-autoscroll'
import type { WorktreeDragRuntime } from './use-runtime'
import type { WorktreeDragSession } from './use-session'
import type { WorktreePointerDrag } from './row-state'

/**
 * Scrolls the sidebar while a pointer drag hovers near its top or bottom edge,
 * refreshing the drag session on every scrolled frame so the insertion line stays on
 * the right row. Returns the starter the drag begin calls once.
 */
export function useWorktreePointerDragAutoscroll(args: {
  session: WorktreeDragSession
  runtime: WorktreeDragRuntime
  scrollRef: React.RefObject<HTMLDivElement | null>
  scheduleWorktreePointerDragFrame: (drag: WorktreePointerDrag) => void
}): () => void {
  const { session, runtime, scrollRef, scheduleWorktreePointerDragFrame } = args
  const {
    worktreePointerDragRef,
    pointerAutoscrollFrameIdRef,
    pointerAutoscrollLastFrameTimeRef,
    cancelWorktreePointerAutoscroll,
    clearWorktreeDrag
  } = runtime

  const runFrame = useCallback(
    (frameTime: number) => {
      pointerAutoscrollFrameIdRef.current = null
      const drag = worktreePointerDragRef.current
      const container = scrollRef.current
      const dragSession = session.worktreeDragSessionRef.current
      if (!drag?.active || !container || !dragSession) {
        cancelWorktreePointerAutoscroll()
        return
      }

      const previousFrameTime = pointerAutoscrollLastFrameTimeRef.current ?? frameTime
      pointerAutoscrollLastFrameTimeRef.current = frameTime
      const autoscroll = getWorktreeSidebarDragAutoscroll({
        point: { clientX: drag.currentX, clientY: drag.currentY },
        containerRect: container.getBoundingClientRect(),
        scrollTop: container.scrollTop,
        scrollHeight: container.scrollHeight,
        clientHeight: container.clientHeight,
        elapsedMs: frameTime - previousFrameTime
      })
      if (autoscroll) {
        container.scrollTop = autoscroll.scrollTop
        if (!session.refreshWorktreeDragSession()) {
          clearWorktreeDrag()
          return
        }
        scheduleWorktreePointerDragFrame(drag)
      }

      pointerAutoscrollFrameIdRef.current = window.requestAnimationFrame(runFrame)
    },
    [
      cancelWorktreePointerAutoscroll,
      clearWorktreeDrag,
      pointerAutoscrollFrameIdRef,
      pointerAutoscrollLastFrameTimeRef,
      scheduleWorktreePointerDragFrame,
      scrollRef,
      session,
      worktreePointerDragRef
    ]
  )

  return useCallback(() => {
    if (pointerAutoscrollFrameIdRef.current !== null) {
      return
    }
    pointerAutoscrollLastFrameTimeRef.current = null
    pointerAutoscrollFrameIdRef.current = window.requestAnimationFrame(runFrame)
  }, [pointerAutoscrollFrameIdRef, pointerAutoscrollLastFrameTimeRef, runFrame])
}
