import { useCallback, useEffect, useRef, useState } from 'react'
import type React from 'react'
import {
  WORKSPACE_BOARD_COLUMN_WIDTH_STEP,
  clampWorkspaceBoardColumnWidth
} from '../../../shared/workspace-statuses'

export type UseWorkspaceBoardColumnResizeResult = {
  /** The live lane width: the drag draft while a gesture is in flight, the committed value otherwise. */
  columnWidth: number
  isResizingColumn: boolean
  onColumnResizeStart: (event: React.PointerEvent<HTMLElement>) => void
  onColumnResizeKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void
}

/**
 * Ported from Orca `useWorkspaceKanbanColumnResize`: the board's lane-width gesture.
 *
 * Two properties are the whole point of its shape:
 *
 * - the *drag renders at most once per frame*: pointermove only moves a ref, and one
 *   `requestAnimationFrame` publishes the width to React. A raw pointermove → setState would
 *   re-render every lane on every device tick.
 * - the *store writes once per gesture*: the draft never commits while the pointer moves. The
 *   width reaches `onCommitWidth` on pointerup/pointercancel/blur, or on the keyboard step —
 *   never per frame, so the persisted preference is not written hundreds of times per drag.
 */
export function useWorkspaceBoardColumnResize(
  committedWidth: number,
  onCommitWidth: (width: number) => void
): UseWorkspaceBoardColumnResizeResult {
  const [columnWidth, setColumnWidth] = useState(() =>
    clampWorkspaceBoardColumnWidth(committedWidth)
  )
  const [isResizingColumn, setIsResizingColumn] = useState(false)
  const nextCommittedWidth = clampWorkspaceBoardColumnWidth(committedWidth)
  const committedWidthRef = useRef(nextCommittedWidth)
  const commitWidthRef = useRef(onCommitWidth)
  const resizingRef = useRef(false)
  const startXRef = useRef(0)
  const startWidthRef = useRef(columnWidth)
  const draftWidthRef = useRef(columnWidth)
  const frameRef = useRef<number | null>(null)

  commitWidthRef.current = onCommitWidth
  if (committedWidthRef.current !== nextCommittedWidth) {
    committedWidthRef.current = nextCommittedWidth
    if (!resizingRef.current) {
      draftWidthRef.current = nextCommittedWidth
      if (columnWidth !== nextCommittedWidth) {
        // Why: external width changes (the store, another window) should be reflected before
        // children render; during an active drag the local draft remains authoritative.
        setColumnWidth(nextCommittedWidth)
      }
    }
  }

  const resetDocumentStyles = useCallback(() => {
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [])

  const publishDraftWidth = useCallback((width: number) => {
    const nextWidth = clampWorkspaceBoardColumnWidth(width)
    if (nextWidth === draftWidthRef.current) {
      return
    }
    draftWidthRef.current = nextWidth
    if (frameRef.current !== null) {
      return
    }
    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null
      setColumnWidth(draftWidthRef.current)
    })
  }, [])

  const commitDraftWidth = useCallback(() => {
    const nextWidth = clampWorkspaceBoardColumnWidth(draftWidthRef.current)
    setColumnWidth(nextWidth)
    if (nextWidth !== committedWidthRef.current) {
      committedWidthRef.current = nextWidth
      commitWidthRef.current(nextWidth)
    }
  }, [])

  const stopResize = useCallback(() => {
    if (!resizingRef.current) {
      return
    }
    resizingRef.current = false
    setIsResizingColumn(false)
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
    resetDocumentStyles()
    commitDraftWidth()
  }, [commitDraftWidth, resetDocumentStyles])

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (!resizingRef.current) {
        return
      }
      publishDraftWidth(startWidthRef.current + event.clientX - startXRef.current)
    },
    [publishDraftWidth]
  )

  useEffect(() => {
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', stopResize)
    window.addEventListener('pointercancel', stopResize)
    window.addEventListener('blur', stopResize)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', stopResize)
      window.removeEventListener('pointercancel', stopResize)
      window.removeEventListener('blur', stopResize)
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
      resizingRef.current = false
      resetDocumentStyles()
    }
  }, [handlePointerMove, resetDocumentStyles, stopResize])

  const onColumnResizeStart = useCallback((event: React.PointerEvent<HTMLElement>) => {
    if (event.button !== 0) {
      return
    }
    // Why both: the gesture owns the press, so the card drag's capture hit test must not see
    // a card (it never does — the handle is not inside one) and the marquee must not start
    // from it. Stopping propagation keeps the ancestor selection surface out of the gesture.
    event.preventDefault()
    event.stopPropagation()
    resizingRef.current = true
    setIsResizingColumn(true)
    startXRef.current = event.clientX
    startWidthRef.current = draftWidthRef.current
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  const onColumnResizeKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
        return
      }
      event.preventDefault()
      event.stopPropagation()
      const direction = event.key === 'ArrowRight' ? 1 : -1
      // Why the doubled step: Orca reserves Shift for the coarse adjustment without giving the
      // arrow a second meaning.
      const step = WORKSPACE_BOARD_COLUMN_WIDTH_STEP * (event.shiftKey ? 2 : 1)
      publishDraftWidth(draftWidthRef.current + direction * step)
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
      commitDraftWidth()
    },
    [commitDraftWidth, publishDraftWidth]
  )

  return {
    columnWidth,
    isResizingColumn,
    onColumnResizeStart,
    onColumnResizeKeyDown
  }
}
