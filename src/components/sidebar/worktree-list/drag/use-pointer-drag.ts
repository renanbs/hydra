// Ported from Orca — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: orca/src/renderer/src/components/sidebar/worktree-list/drag/use-pointer-drag.ts
import { useCallback, useEffect } from 'react'
import {
  createSidebarDragPreview,
  isSidebarPointerDragBlocked,
  setSidebarPointerDragDocumentStyles
} from '../pointer-drag-dom'
import { getWorktreeSidebarDragGrab } from '../../worktree-sidebar-drag-geometry'
import { getWorktreeSidebarDragRectsForGroup } from '../../worktree-sidebar-drag-autoscroll'
import { hasWorkspaceBoardSidebarDropBoard } from '../../workspace-board/workspace-board-sidebar-drop'
import type { WorktreeDropCommitContext } from './drop-commit-context'
import type { WorktreeDragRuntime } from './use-runtime'
import type { WorktreeDragSession } from './use-session'
import { useWorktreePointerDragAutoscroll } from './use-pointer-autoscroll'
import { useWorktreePointerDragWindowEvents } from './use-pointer-window-events'
import { flushWorktreePointerDragFrame } from './pointer-flush'
import { EMPTY_WORKTREE_DRAG_PREVIEW_OFFSETS, type WorktreePointerDrag } from './row-state'

/** How long a click after a finished drag is swallowed, so a drop never selects a card. */
const WORKTREE_CLICK_SUPPRESSION_MS = 500

export type WorktreeRowPointerDragHandlers = {
  handleRowPointerDown: (
    event: React.PointerEvent<HTMLDivElement>,
    rowKey: string,
    worktreeId: string
  ) => void
  handleRowClickCapture: (event: React.MouseEvent<HTMLDivElement>) => void
  handleRowDragStartCapture: (event: React.DragEvent<HTMLDivElement>) => void
}

/**
 * Turns a primary-button press on a row into a drag session: nothing happens until the
 * pointer crosses the movement threshold, and the floating preview, the row offsets and
 * the insertion line are driven by one RAF per frame.
 */
export function useWorktreePointerDrag(args: {
  ctx: WorktreeDropCommitContext
  session: WorktreeDragSession
  runtime: WorktreeDragRuntime
}): WorktreeRowPointerDragHandlers {
  const { ctx, session, runtime } = args
  const { worktreePointerDragRef, suppressWorktreeClickUntilRef, setWorktreeDragState } = runtime
  const scrollRef = ctx.scrollRef

  const flushWorktreePointerDrag = useCallback(() => {
    const drag = worktreePointerDragRef.current
    if (!drag) {
      return
    }
    flushWorktreePointerDragFrame({ drag, ctx, setWorktreeDragState })
  }, [ctx, setWorktreeDragState, worktreePointerDragRef])

  const scheduleWorktreePointerDragFrame = useCallback(
    (drag: WorktreePointerDrag) => {
      if (drag.frameId !== null) {
        return
      }
      drag.frameId = window.requestAnimationFrame(flushWorktreePointerDrag)
    },
    [flushWorktreePointerDrag]
  )

  const startWorktreePointerAutoscroll = useWorktreePointerDragAutoscroll({
    session,
    runtime,
    scrollRef,
    scheduleWorktreePointerDragFrame
  })

  const beginWorktreePointerDrag = useCallback(
    (drag: WorktreePointerDrag) => {
      const { preview, offsetX, offsetY, height } = createSidebarDragPreview({
        sourceRow: drag.sourceRow,
        pointerX: drag.currentX,
        pointerY: drag.currentY,
        draggedCount: drag.draggedIds.length
      })
      drag.active = true
      drag.preview = preview
      drag.previewOffsetX = offsetX
      drag.previewOffsetY = offsetY
      suppressWorktreeClickUntilRef.current =
        window.performance.now() + WORKTREE_CLICK_SUPPRESSION_MS
      setSidebarPointerDragDocumentStyles(true)
      session.worktreeDragSessionRef.current = {
        draggingWorktreeId: drag.worktreeId,
        sourceGroupKey: drag.sourceGroupKey,
        draggedIds: drag.draggedIds,
        reorderDraggedIds: drag.reorderDraggedIds,
        reorderUnitDraggedIds: drag.reorderUnitDraggedIds,
        rects: drag.rects,
        // Why: reuse the floating preview's own offset so the hit test tracks the
        // card the user sees, not the raw pointer.
        grab: getWorktreeSidebarDragGrab({ offsetY, height }),
        anchor: null
      }
      setWorktreeDragState({
        draggingWorktreeId: drag.worktreeId,
        dropIndex: null,
        dropIndicatorY: null,
        previewOffsetsByWorktreeId: EMPTY_WORKTREE_DRAG_PREVIEW_OFFSETS
      })
      startWorktreePointerAutoscroll()
      scheduleWorktreePointerDragFrame(drag)
    },
    [
      scheduleWorktreePointerDragFrame,
      session,
      setWorktreeDragState,
      startWorktreePointerAutoscroll,
      suppressWorktreeClickUntilRef
    ]
  )

  const handleRowPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>, rowKey: string, worktreeId: string) => {
      if (event.button !== 0 || event.pointerType === 'touch') {
        return
      }
      const sourceRow = event.currentTarget
      if (isSidebarPointerDragBlocked(event.target, sourceRow)) {
        return
      }
      const sourceGroupKey = session.groupKeyByRowKey.get(rowKey)
      const container = scrollRef.current
      if (!sourceGroupKey || !container) {
        return
      }
      const rects = getWorktreeSidebarDragRectsForGroup(container, sourceGroupKey)
      // Why: a group of one row has no slot to move to, so the whole gesture would
      // only hide the card behind a preview that can never land anywhere — unless the
      // board is open, where these rows are still a status drop away.
      if (rects.length <= 1 && !hasWorkspaceBoardSidebarDropBoard()) {
        return
      }
      const draggedIds = [worktreeId]
      const reorderDraggedIds = session.getReorderDraggedIds(draggedIds)
      const reorderUnitDraggedIds = session.getReorderUnitDraggedIds(
        sourceGroupKey,
        reorderDraggedIds
      )
      worktreePointerDragRef.current = {
        pointerId: event.pointerId,
        sourceRow,
        startX: event.clientX,
        startY: event.clientY,
        currentX: event.clientX,
        currentY: event.clientY,
        worktreeId,
        draggedIds,
        reorderDraggedIds,
        reorderUnitDraggedIds,
        sourceGroupKey,
        rects,
        active: false,
        preview: null,
        previewOffsetX: 0,
        previewOffsetY: 0,
        frameId: null
      }
    },
    [scrollRef, session, worktreePointerDragRef]
  )

  const handleRowClickCapture = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (window.performance.now() >= suppressWorktreeClickUntilRef.current) {
        return
      }
      event.preventDefault()
      event.stopPropagation()
    },
    [suppressWorktreeClickUntilRef]
  )

  // Why: the card is also a native HTML5 drag source, and a browser that starts that
  // drag fires `pointercancel` — killing the session the press just opened. While a row
  // press owns the gesture, its native drag is cancelled, so one gesture means one
  // mechanism; rows the pointer drag does not take over keep the HTML5 path untouched.
  const handleRowDragStartCapture = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!worktreePointerDragRef.current) {
        return
      }
      event.preventDefault()
      event.stopPropagation()
    },
    [worktreePointerDragRef]
  )

  useWorktreePointerDragWindowEvents({
    ctx,
    runtime,
    beginWorktreePointerDrag,
    scheduleWorktreePointerDragFrame
  })

  // Why: the drop resolves under a click that React may route to a row the pointer never
  // touched (the card under the pointer moved as the last frame settled), so a card
  // selection after a drag has to be swallowed at the document, not on the source row.
  useEffect(() => {
    const handleClick = (event: MouseEvent): void => {
      if (window.performance.now() >= suppressWorktreeClickUntilRef.current) {
        return
      }
      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()
    }

    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [suppressWorktreeClickUntilRef])

  return { handleRowPointerDown, handleRowClickCapture, handleRowDragStartCapture }
}
