// Ported from Orca — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: orca/src/renderer/src/components/sidebar/worktree-list/drag/use-pointer-window-events.ts
import { useEffect } from 'react'
import { commitWorktreePointerDrop } from './pointer-commit'
import type { WorktreeDropCommitContext } from './drop-commit-context'
import type { WorktreeDragRuntime } from './use-runtime'
import type { WorktreePointerDrag } from './row-state'

const SIDEBAR_POINTER_DRAG_THRESHOLD_PX = 4

/**
 * Pointer drags escape the row that started them, so move/up/cancel are tracked on
 * the window in capture phase — a drop over the terminal or a header still belongs to
 * the drag, and Escape aborts it from anywhere.
 */
export function useWorktreePointerDragWindowEvents(args: {
  ctx: WorktreeDropCommitContext
  runtime: WorktreeDragRuntime
  beginWorktreePointerDrag: (drag: WorktreePointerDrag) => void
  scheduleWorktreePointerDragFrame: (drag: WorktreePointerDrag) => void
}): void {
  const { ctx, beginWorktreePointerDrag, scheduleWorktreePointerDragFrame } = args
  const { worktreePointerDragRef, clearWorktreeDrag } = args.runtime

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent): void => {
      const drag = worktreePointerDragRef.current
      if (!drag || event.pointerId !== drag.pointerId) {
        return
      }
      drag.currentX = event.clientX
      drag.currentY = event.clientY
      if (!drag.active) {
        const distance = Math.hypot(drag.currentX - drag.startX, drag.currentY - drag.startY)
        if (distance < SIDEBAR_POINTER_DRAG_THRESHOLD_PX) {
          return
        }
        beginWorktreePointerDrag(drag)
      }
      event.preventDefault()
      event.stopPropagation()
      scheduleWorktreePointerDragFrame(drag)
    }

    const handlePointerUp = (event: PointerEvent): void => {
      const drag = worktreePointerDragRef.current
      if (!drag || event.pointerId !== drag.pointerId) {
        return
      }
      drag.currentX = event.clientX
      drag.currentY = event.clientY
      if (!drag.active) {
        worktreePointerDragRef.current = null
        return
      }
      event.preventDefault()
      event.stopPropagation()
      commitWorktreePointerDrop({ drag, ctx })
    }

    const handlePointerCancel = (event: PointerEvent): void => {
      const drag = worktreePointerDragRef.current
      if (!drag || event.pointerId !== drag.pointerId) {
        return
      }
      clearWorktreeDrag()
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape' || !worktreePointerDragRef.current) {
        return
      }
      event.preventDefault()
      event.stopPropagation()
      clearWorktreeDrag()
    }

    window.addEventListener('keydown', handleKeyDown, { capture: true })
    window.addEventListener('pointermove', handlePointerMove, { capture: true })
    window.addEventListener('pointerup', handlePointerUp, { capture: true })
    window.addEventListener('pointercancel', handlePointerCancel, { capture: true })
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true })
      window.removeEventListener('pointermove', handlePointerMove, { capture: true })
      window.removeEventListener('pointerup', handlePointerUp, { capture: true })
      window.removeEventListener('pointercancel', handlePointerCancel, { capture: true })
    }
  }, [
    beginWorktreePointerDrag,
    clearWorktreeDrag,
    ctx,
    scheduleWorktreePointerDragFrame,
    worktreePointerDragRef
  ])
}
