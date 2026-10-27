import React, { useCallback, useEffect, useRef } from 'react'
import { getShortcutPlatform } from '@/lib/shortcut-platform'
import { getWorkspaceBoardAreaSelectionCardRects } from './workspace-board-area-selection-card-rects'
import {
  clearWorkspaceBoardAreaSelectionPreview,
  getWorkspaceBoardAreaSelectionAutoScrollDelta,
  getWorkspaceBoardAreaSelectionCardIds,
  getWorkspaceBoardAreaSelectionRect,
  getWorkspaceBoardAreaSelectionScrollContainer,
  getWorkspaceBoardAreaSelectionScrollStartContentYByElement,
  isWorkspaceBoardScrollbarPointerDown,
  setWorkspaceBoardAreaSelectionOverlayRect,
  shouldIgnoreWorkspaceBoardAreaSelectionStart,
  updateWorkspaceBoardAreaSelectionPreview
} from './workspace-board-area-selection-dom'
import {
  WORKSPACE_BOARD_AREA_SELECTION_DRAG_THRESHOLD,
  shouldCommitWorkspaceBoardAreaSelection,
  type UseWorkspaceBoardAreaSelectionParams,
  type WorkspaceBoardAreaSelectionDragState
} from './workspace-board-area-selection-state'

/**
 * The board's marquee: a primary drag on empty board space paints a selection rectangle and
 * selects the cards it covers.
 *
 * Ported from Orca `useWorkspaceKanbanAreaSelection`. Two properties are the whole point of its
 * shape, and both are deliberate:
 *
 * - the *hot path never renders React*: pointermove updates the drag state and schedules one
 *   animation frame, which writes the overlay's transform and the preview ring straight to the
 *   DOM. The board's lanes paint thousands of pixels of rich cards; re-rendering them per frame
 *   is what the marquee must not do.
 * - the *hit test reads the measured virtual layout*, not the DOM: `getWorkspaceBoardAreaSelectionCardRects`
 *   answers for cards outside the painted window, so a marquee over a long lane covers the cards
 *   it swept even though most of them are not mounted.
 */
export function useWorkspaceBoardAreaSelection({
  open,
  boardRef,
  overlayRef,
  selectedWorktreeIds,
  selectionAnchorId,
  updateSelectionForArea
}: UseWorkspaceBoardAreaSelectionParams): {
  handleAreaSelectionPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
} {
  const dragRef = useRef<WorkspaceBoardAreaSelectionDragState | null>(null)
  const updateSelectionForAreaRef = useRef(updateSelectionForArea)
  const selectedWorktreeIdsRef = useRef(selectedWorktreeIds)
  const selectionAnchorIdRef = useRef(selectionAnchorId)

  // Why: pointer handlers are stable while selection commits must call the latest board
  // updater before the next event can fire, and the drag's base selection has to be the one
  // that was live at pointer-down.
  updateSelectionForAreaRef.current = updateSelectionForArea
  selectedWorktreeIdsRef.current = selectedWorktreeIds
  selectionAnchorIdRef.current = selectionAnchorId

  const cancelAreaSelectionDrag = useCallback(() => {
    const state = dragRef.current
    if (state?.frameId !== null && state?.frameId !== undefined) {
      window.cancelAnimationFrame(state.frameId)
    }
    if (state?.scrollFrameId !== null && state?.scrollFrameId !== undefined) {
      window.cancelAnimationFrame(state.scrollFrameId)
    }
    if (state) {
      clearWorkspaceBoardAreaSelectionPreview(state.cardRects, state.previewIds)
    }
    dragRef.current = null
    setWorkspaceBoardAreaSelectionOverlayRect(overlayRef.current, null)
  }, [overlayRef])

  const flushAreaSelectionDrag = useCallback(() => {
    const state = dragRef.current
    if (!state) {
      return
    }

    state.frameId = null
    const deltaX = state.currentX - state.startX
    const deltaY = state.currentY - state.startY
    // Below the threshold this is still a click: no rectangle, no preview, no commit.
    if (
      !state.started &&
      Math.hypot(deltaX, deltaY) < WORKSPACE_BOARD_AREA_SELECTION_DRAG_THRESHOLD
    ) {
      return
    }

    state.started = true

    // Why: deferred lane hydration can start a marquee against empty rects; pick up the
    // measured layout once the lanes register, without waiting for a scroll event.
    if (state.cardRects.length === 0) {
      const board = boardRef.current
      if (board) {
        state.boardRect = board.getBoundingClientRect()
        state.cardRects = getWorkspaceBoardAreaSelectionCardRects(board)
        state.scrollStartContentYByElement =
          getWorkspaceBoardAreaSelectionScrollStartContentYByElement(board, state.startY)
      }
    }

    const viewportRect = getWorkspaceBoardAreaSelectionRect(
      state.startX,
      state.startY,
      state.currentX,
      state.currentY
    )
    const clippedLeft = Math.max(viewportRect.left, state.boardRect.left)
    const clippedTop = Math.max(viewportRect.top, state.boardRect.top)
    const clippedRight = Math.min(
      viewportRect.left + viewportRect.width,
      state.boardRect.right
    )
    const clippedBottom = Math.min(
      viewportRect.top + viewportRect.height,
      state.boardRect.bottom
    )

    // Why: the pointer can leave the board mid-drag (the sheet is not modal). The marquee then
    // covers nothing, and the preview follows the clip rather than the raw pointer box.
    if (clippedRight <= clippedLeft || clippedBottom <= clippedTop) {
      state.finalAreaIds = []
      setWorkspaceBoardAreaSelectionOverlayRect(overlayRef.current, null)
      updateWorkspaceBoardAreaSelectionPreview(
        state.cardRects,
        state.previewIds,
        state.baseSelectedIds,
        state.additive,
        []
      )
      return
    }

    setWorkspaceBoardAreaSelectionOverlayRect(overlayRef.current, {
      left: clippedLeft - state.boardRect.left,
      top: clippedTop - state.boardRect.top,
      width: clippedRight - clippedLeft,
      height: clippedBottom - clippedTop
    })

    const areaIds = getWorkspaceBoardAreaSelectionCardIds(state.cardRects, viewportRect, {
      scrollStartContentYByElement: state.scrollStartContentYByElement,
      currentY: state.currentY
    })
    state.finalAreaIds = areaIds
    updateWorkspaceBoardAreaSelectionPreview(
      state.cardRects,
      state.previewIds,
      state.baseSelectedIds,
      state.additive,
      areaIds
    )
  }, [boardRef, overlayRef])

  const refreshAreaSelectionMeasurements = useCallback(() => {
    const state = dragRef.current
    const board = boardRef.current
    if (!state || !board) {
      return
    }

    clearWorkspaceBoardAreaSelectionPreview(state.cardRects, state.previewIds)
    state.boardRect = board.getBoundingClientRect()
    state.cardRects = getWorkspaceBoardAreaSelectionCardRects(board)
  }, [boardRef])

  const scheduleAreaSelectionDragFlush = useCallback(() => {
    const state = dragRef.current
    if (!state || state.frameId !== null) {
      return
    }
    // Why: the hot path stays imperative and frame-throttled so a Notion-like marquee drag does
    // not re-render every workspace card on pointermove.
    state.frameId = window.requestAnimationFrame(flushAreaSelectionDrag)
  }, [flushAreaSelectionDrag])

  const runAreaSelectionAutoScroll = useCallback(() => {
    const state = dragRef.current
    const board = boardRef.current
    if (!state || !board) {
      return
    }

    state.scrollFrameId = null
    const scrollContainer = getWorkspaceBoardAreaSelectionScrollContainer(
      board,
      state.currentX,
      state.currentY
    )
    if (!scrollContainer) {
      return
    }

    const rect = scrollContainer.getBoundingClientRect()
    const scrollDelta = getWorkspaceBoardAreaSelectionAutoScrollDelta({
      pointerY: state.currentY,
      containerTop: rect.top,
      containerBottom: rect.bottom,
      scrollTop: scrollContainer.scrollTop,
      scrollHeight: scrollContainer.scrollHeight,
      clientHeight: scrollContainer.clientHeight
    })
    if (scrollDelta === 0) {
      return
    }

    scrollContainer.scrollTop += scrollDelta
    refreshAreaSelectionMeasurements()
    scheduleAreaSelectionDragFlush()
    // Why the self-scheduling frame: a pointer parked in the edge zone stops emitting
    // pointermove, so the scroll has to keep driving itself until it leaves the zone.
    state.scrollFrameId = window.requestAnimationFrame(runAreaSelectionAutoScroll)
  }, [boardRef, refreshAreaSelectionMeasurements, scheduleAreaSelectionDragFlush])

  const scheduleAreaSelectionAutoScroll = useCallback(() => {
    const state = dragRef.current
    if (!state || state.scrollFrameId !== null) {
      return
    }
    state.scrollFrameId = window.requestAnimationFrame(runAreaSelectionAutoScroll)
  }, [runAreaSelectionAutoScroll])

  const finishAreaSelectionDrag = useCallback(
    (event: PointerEvent) => {
      const state = dragRef.current
      if (!state) {
        return
      }
      state.currentX = event.clientX
      state.currentY = event.clientY
      if (state.frameId !== null) {
        window.cancelAnimationFrame(state.frameId)
        state.frameId = null
      }
      if (state.scrollFrameId !== null) {
        window.cancelAnimationFrame(state.scrollFrameId)
        state.scrollFrameId = null
      }
      refreshAreaSelectionMeasurements()
      flushAreaSelectionDrag()
      if (shouldCommitWorkspaceBoardAreaSelection(state)) {
        updateSelectionForAreaRef.current(
          state.finalAreaIds,
          state.additive,
          state.baseSelectedIds,
          state.baseAnchorId
        )
      }
      clearWorkspaceBoardAreaSelectionPreview(state.cardRects, state.previewIds)
      dragRef.current = null
      setWorkspaceBoardAreaSelectionOverlayRect(overlayRef.current, null)
    },
    [flushAreaSelectionDrag, overlayRef, refreshAreaSelectionMeasurements]
  )

  const handleAreaSelectionPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      // Why: only a primary mouse pointer starts a marquee. Touch has its own scroll gesture, a
      // press on a scrollbar belongs to the scrollbar, and a press on a card belongs to the card
      // (its click, or its own drag).
      if (
        event.button !== 0 ||
        event.pointerType === 'touch' ||
        isWorkspaceBoardScrollbarPointerDown(event.nativeEvent) ||
        shouldIgnoreWorkspaceBoardAreaSelectionStart(event.target)
      ) {
        return
      }

      const board = boardRef.current
      if (!board) {
        return
      }
      cancelAreaSelectionDrag()
      const isMac = getShortcutPlatform() === 'darwin'
      const additive =
        event.shiftKey ||
        (isMac ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey)
      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        currentX: event.clientX,
        currentY: event.clientY,
        additive,
        baseSelectedIds: new Set(selectedWorktreeIdsRef.current),
        baseAnchorId: selectionAnchorIdRef.current,
        boardRect: board.getBoundingClientRect(),
        cardRects: getWorkspaceBoardAreaSelectionCardRects(board),
        scrollStartContentYByElement: getWorkspaceBoardAreaSelectionScrollStartContentYByElement(
          board,
          event.clientY
        ),
        previewIds: new Set(),
        finalAreaIds: [],
        started: false,
        frameId: null,
        scrollFrameId: null
      }
      event.preventDefault()
    },
    [boardRef, cancelAreaSelectionDrag]
  )

  useEffect(() => {
    if (!open) {
      cancelAreaSelectionDrag()
      return
    }

    const handlePointerMove = (event: PointerEvent): void => {
      const state = dragRef.current
      if (!state || event.pointerId !== state.pointerId) {
        return
      }
      state.currentX = event.clientX
      state.currentY = event.clientY
      event.preventDefault()
      scheduleAreaSelectionDragFlush()
      scheduleAreaSelectionAutoScroll()
    }

    const handlePointerUp = (event: PointerEvent): void => {
      const state = dragRef.current
      if (!state || event.pointerId !== state.pointerId) {
        return
      }
      event.preventDefault()
      finishAreaSelectionDrag(event)
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      // Why: the board dismisses itself from a document capture listener, so Escape has to be
      // taken on the window capture phase — cancelling a marquee must not also close the board
      // under it. A press that never crossed the threshold is still a click, so it keeps Escape.
      if (event.key !== 'Escape' || !dragRef.current?.started) {
        return
      }
      event.preventDefault()
      event.stopPropagation()
      cancelAreaSelectionDrag()
    }

    const handleScroll = (event: Event): void => {
      const state = dragRef.current
      if (!state) {
        return
      }
      const board = boardRef.current
      const target = event.target
      if (board && target instanceof Node && !board.contains(target)) {
        return
      }
      // Why: lane scrolling changes every card's viewport rect while the drag is still active.
      // Refresh before the next hit-test so selection follows the scrolled content instead of
      // stale pointer-down measurements.
      refreshAreaSelectionMeasurements()
      scheduleAreaSelectionDragFlush()
    }

    window.addEventListener('keydown', handleKeyDown, true)
    document.addEventListener('pointermove', handlePointerMove, true)
    document.addEventListener('pointerup', handlePointerUp, true)
    document.addEventListener('pointercancel', handlePointerUp, true)
    document.addEventListener('scroll', handleScroll, true)
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
      document.removeEventListener('pointermove', handlePointerMove, true)
      document.removeEventListener('pointerup', handlePointerUp, true)
      document.removeEventListener('pointercancel', handlePointerUp, true)
      document.removeEventListener('scroll', handleScroll, true)
      cancelAreaSelectionDrag()
    }
  }, [
    boardRef,
    cancelAreaSelectionDrag,
    finishAreaSelectionDrag,
    open,
    refreshAreaSelectionMeasurements,
    scheduleAreaSelectionAutoScroll,
    scheduleAreaSelectionDragFlush
  ])

  return { handleAreaSelectionPointerDown }
}
