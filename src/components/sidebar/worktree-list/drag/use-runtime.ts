// Ported from Orca — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: orca/src/renderer/src/components/sidebar/worktree-list/drag/use-runtime.ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { setSidebarPointerDragDocumentStyles } from '../pointer-drag-dom'
import {
  WORKTREE_ROW_DRAG_INITIAL_STATE,
  type WorktreePointerDrag,
  type WorktreeRowDragState
} from './row-state'

/** Handles and visual state a drag leaves behind, read by the flush/autoscroll loops. */
export type WorktreeDragRuntime = {
  worktreeDragState: WorktreeRowDragState
  setWorktreeDragState: React.Dispatch<React.SetStateAction<WorktreeRowDragState>>
  worktreePointerDragRef: React.RefObject<WorktreePointerDrag | null>
  pointerAutoscrollFrameIdRef: React.RefObject<number | null>
  pointerAutoscrollLastFrameTimeRef: React.RefObject<number | null>
  suppressWorktreeClickUntilRef: React.RefObject<number>
  cancelWorktreePointerAutoscroll: () => void
  clearWorktreeDrag: () => void
}

/**
 * Owns everything a drag leaves behind: the visual state the rows read, the RAF
 * handles, and the single teardown every exit path (drop, Escape, pointercancel)
 * calls.
 */
export function useWorktreeDragRuntime(): WorktreeDragRuntime {
  const [worktreeDragState, setWorktreeDragState] = useState<WorktreeRowDragState>(
    WORKTREE_ROW_DRAG_INITIAL_STATE
  )
  const worktreePointerDragRef = useRef<WorktreePointerDrag | null>(null)
  const pointerAutoscrollFrameIdRef = useRef<number | null>(null)
  const pointerAutoscrollLastFrameTimeRef = useRef<number | null>(null)
  const suppressWorktreeClickUntilRef = useRef(0)

  const cancelWorktreePointerAutoscroll = useCallback(() => {
    if (pointerAutoscrollFrameIdRef.current !== null) {
      window.cancelAnimationFrame(pointerAutoscrollFrameIdRef.current)
      pointerAutoscrollFrameIdRef.current = null
    }
    pointerAutoscrollLastFrameTimeRef.current = null
  }, [])

  const clearWorktreeDrag = useCallback(() => {
    const drag = worktreePointerDragRef.current
    cancelWorktreePointerAutoscroll()
    if (drag) {
      if (drag.frameId !== null) {
        window.cancelAnimationFrame(drag.frameId)
      }
      drag.preview?.remove()
      worktreePointerDragRef.current = null
      setSidebarPointerDragDocumentStyles(false)
    }
    setWorktreeDragState(WORKTREE_ROW_DRAG_INITIAL_STATE)
  }, [cancelWorktreePointerAutoscroll])

  // Why: the floating preview, the document styles and the RAFs all outlive React's
  // tree, so closing the panel mid-drag has to tear them down here — nothing else owns
  // them once the rows are gone.
  useEffect(() => clearWorktreeDrag, [clearWorktreeDrag])

  // Why: drag handlers built from this object end up in memoised rows; keep one
  // identity per meaningful change instead of one per render.
  return useMemo(
    () => ({
      worktreeDragState,
      setWorktreeDragState,
      worktreePointerDragRef,
      pointerAutoscrollFrameIdRef,
      pointerAutoscrollLastFrameTimeRef,
      suppressWorktreeClickUntilRef,
      cancelWorktreePointerAutoscroll,
      clearWorktreeDrag
    }),
    [cancelWorktreePointerAutoscroll, clearWorktreeDrag, worktreeDragState]
  )
}
