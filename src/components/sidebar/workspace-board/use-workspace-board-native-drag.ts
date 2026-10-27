// The board's native HTML5 drag (D08-041, D03a-015): Orca `useWorkspaceKanbanNativeDrag`.
//
// The board's lanes and its pin strip are drop destinations a native workspace drag reaches
// by `dataTransfer` — the payload `workspace-status-drag-data.ts` publishes and
// `hasWorkspaceDragData` recognizes — instead of by pointer position. The SOURCE is the
// sidebar list's row (`WorktreeList` publishes the shared payload on `dragstart`); Orca passes
// `nativeDragEnabled={false}` down the board's lane grid, so no board card is a native source.
// Orca wires the same handlers on the same two elements (`WorkspaceKanbanStatusLane`'s
// `onDragOver`/`onDragLeave`/`onDrop` and `WorkspaceKanbanPinDropTarget`'s
// `onDragOver`/`onDragLeave`), and a lane drop has no insertion slot: it lands at the end of
// the lane (`dropWorktreesAtEndOfStatus`).
//
// Why the highlight state lives here, not in the pointer drag: Orca keeps ONE
// `dragOverStatus`/`pinDragOver` pair for both gestures — the board's pointer drag publishes
// into it through `onDragTargetChange`/`onPinDragTargetChange` — so the two paths can never
// disagree about the destination the board paints.
//
// Why the per-frame loop (D03a-016, Orca `useWorktreeNativeDragAutoscroll`): while the pointer
// hovers an edge the browser stops delivering drag events, so the destination and the lane
// body's scroll are re-derived from the last known point once per animation frame. The
// container is the lane body the pointer is over (the board's own scroll root); the horizontal
// lane row is already covered by the Shift+wheel scroll (D08-023).
import { useCallback, useEffect, useRef, useState } from 'react'
import type React from 'react'
import type { WorkspaceStatus } from '../../../shared/worktree/types'
import { getWorktreeSidebarDragAutoscroll } from '../worktree-sidebar-drag-autoscroll'
import { hasWorkspaceDragData, readWorkspaceDragDataIds } from '../workspace-status-drag-data'
import {
  WORKSPACE_BOARD_CARD_SCROLLER_SELECTOR,
  getWorkspaceBoardCardDropTarget
} from './drag/workspace-board-card-drag-dom'
import { resolveWorkspaceBoardPinDropTarget } from './workspace-board-pin-drop-target'

/** The last point the browser reported for the drag in flight. */
type WorkspaceBoardNativeDragPoint = { clientX: number; clientY: number }

/** What the native drag is over: a lane (with its status) or the pin strip. */
type WorkspaceBoardNativeDragTarget = { status: WorkspaceStatus | null; isPinDrop: boolean }

export type WorkspaceBoardNativeDrag = {
  /** The lane the native drag hovers; the lanes' highlight reads this. */
  dragOverStatus: WorkspaceStatus | null
  /** Whether the native drag hovers the pin strip; the strip's hover reads this. */
  pinDragOver: boolean
  /**
   * Published by the board's pointer drag, so both gestures light the same lane/strip.
   * Orca's `onDragTargetChange`/`onPinDragTargetChange`.
   */
  setDragOverStatus: (status: WorkspaceStatus | null) => void
  setPinDragOver: (over: boolean) => void
  handleDragOver: (event: React.DragEvent<HTMLElement>, status: WorkspaceStatus) => void
  handleDragLeave: (event: React.DragEvent<HTMLElement>) => void
  /** A release on a lane: the destination status, at the end of the lane. */
  handleDrop: (event: React.DragEvent<HTMLElement>, status: WorkspaceStatus) => void
  handlePinDragOver: (event: React.DragEvent<HTMLElement>) => void
  handlePinDragLeave: (event: React.DragEvent<HTMLElement>) => void
  /** A release on the strip: a pin, never a status (D08-028). */
  handlePinDrop: (event: React.DragEvent<HTMLElement>) => void
  /** `dragend`/drop-outside/board-closed: the highlight and the frame loop are torn down. */
  handleDragFinish: () => void
}

/** The lane body the pointer is over, or `null` when it is not over a lane at all. */
function resolveLaneScrollerAt(
  board: HTMLElement,
  point: WorkspaceBoardNativeDragPoint
): HTMLElement | null {
  for (const scroller of board.querySelectorAll<HTMLElement>(
    WORKSPACE_BOARD_CARD_SCROLLER_SELECTOR
  )) {
    const rect = scroller.getBoundingClientRect()
    if (
      point.clientX >= rect.left &&
      point.clientX <= rect.right &&
      point.clientY >= rect.top &&
      point.clientY <= rect.bottom
    ) {
      return scroller
    }
  }
  return null
}

export function useWorkspaceBoardNativeDrag(args: {
  /** Whether the board is open; a dismissed board is not a destination. */
  open: boolean
  /** The board's hit-test root (the lane grid), shared with the pointer drag. */
  boardRef: React.RefObject<HTMLElement | null>
  /**
   * Commits a lane drop for the dragged workspaces. Orca's `dropWorktreesAtEndOfStatus`:
   * the destination status, no insertion index — the release is a lane, not a slot.
   */
  onDropWorktreesAtEndOfStatus: (worktreeIds: readonly string[], status: WorkspaceStatus) => void
  /** Commits a strip drop: the dragged workspaces are pinned, their status untouched. */
  onPinWorktrees: (worktreeIds: readonly string[]) => void
}): WorkspaceBoardNativeDrag {
  const { open, boardRef, onDropWorktreesAtEndOfStatus, onPinWorktrees } = args
  const [dragOverStatus, setDragOverStatus] = useState<WorkspaceStatus | null>(null)
  const [pinDragOver, setPinDragOver] = useState(false)
  const latestPointRef = useRef<WorkspaceBoardNativeDragPoint | null>(null)
  const frameIdRef = useRef<number | null>(null)
  const lastFrameTimeRef = useRef<number | null>(null)

  const publishTarget = useCallback(
    (target: WorkspaceBoardNativeDragTarget | null): void => {
      const nextStatus = target?.status ?? null
      setDragOverStatus((previous) => (previous === nextStatus ? previous : nextStatus))
      setPinDragOver(target?.isPinDrop === true)
    },
    []
  )

  const stopFrameLoop = useCallback((): void => {
    if (frameIdRef.current !== null) {
      window.cancelAnimationFrame(frameIdRef.current)
      frameIdRef.current = null
    }
    lastFrameTimeRef.current = null
  }, [])

  /**
   * The destination under the last known point: the strip answers first (it sits above the
   * lane row, outside the board's own hit-test root), then the lanes' own geometry. `null`
   * means the point left the board, which is what ends the frame loop.
   */
  const resolveTargetAt = useCallback(
    (point: WorkspaceBoardNativeDragPoint): WorkspaceBoardNativeDragTarget | null => {
      const pinTarget = resolveWorkspaceBoardPinDropTarget(point.clientX, point.clientY)
      if (pinTarget) {
        return { status: null, isPinDrop: true }
      }
      const board = boardRef.current
      if (!board) {
        return null
      }
      // The lane hit test is lane-only (the strip answered above), so anything it resolves
      // is a lane — and nothing resolved at all means the point left the board.
      const target = getWorkspaceBoardCardDropTarget(board, point.clientX, point.clientY)
      return target.status === null ? null : { status: target.status, isPinDrop: false }
    },
    [boardRef]
  )

  const runAutoscrollFrame = useCallback(
    (frameTime: number): void => {
      frameIdRef.current = null
      const point = latestPointRef.current
      if (!point) {
        return
      }
      const board = boardRef.current
      const scroller = board ? resolveLaneScrollerAt(board, point) : null
      if (scroller) {
        const previousFrameTime = lastFrameTimeRef.current ?? frameTime
        lastFrameTimeRef.current = frameTime
        const autoscroll = getWorktreeSidebarDragAutoscroll({
          point,
          containerRect: scroller.getBoundingClientRect(),
          scrollTop: scroller.scrollTop,
          scrollHeight: scroller.scrollHeight,
          clientHeight: scroller.clientHeight,
          elapsedMs: frameTime - previousFrameTime
        })
        if (autoscroll) {
          scroller.scrollTop = autoscroll.scrollTop
        }
      }
      const target = resolveTargetAt(point)
      if (!target) {
        latestPointRef.current = null
        publishTarget(null)
        return
      }
      publishTarget(target)
      frameIdRef.current = window.requestAnimationFrame(runAutoscrollFrame)
    },
    [boardRef, publishTarget, resolveTargetAt]
  )

  const startFrameLoop = useCallback((): void => {
    if (frameIdRef.current !== null) {
      return
    }
    lastFrameTimeRef.current = null
    frameIdRef.current = window.requestAnimationFrame(runAutoscrollFrame)
  }, [runAutoscrollFrame])

  const handleDragFinish = useCallback((): void => {
    latestPointRef.current = null
    stopFrameLoop()
    publishTarget(null)
  }, [publishTarget, stopFrameLoop])

  const trackDragPoint = useCallback(
    (event: React.DragEvent<HTMLElement>): void => {
      latestPointRef.current = { clientX: event.clientX, clientY: event.clientY }
      startFrameLoop()
    },
    [startFrameLoop]
  )

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLElement>, status: WorkspaceStatus): void => {
      if (!hasWorkspaceDragData(event.dataTransfer)) {
        return
      }
      event.preventDefault()
      event.dataTransfer.dropEffect = 'move'
      publishTarget({ status, isPinDrop: false })
      trackDragPoint(event)
    },
    [publishTarget, trackDragPoint]
  )

  const handleDragLeave = useCallback(
    (event: React.DragEvent<HTMLElement>): void => {
      // Why: moving between a lane's own children is not leaving it — the frame loop
      // re-derives the destination from the point either way, so a real leave only has to
      // stop claiming the lane that just lost the pointer.
      const relatedTarget = event.relatedTarget
      if (relatedTarget instanceof Node && event.currentTarget.contains(relatedTarget)) {
        return
      }
      setDragOverStatus(null)
    },
    []
  )

  const handlePinDragOver = useCallback(
    (event: React.DragEvent<HTMLElement>): void => {
      if (!hasWorkspaceDragData(event.dataTransfer)) {
        return
      }
      event.preventDefault()
      event.dataTransfer.dropEffect = 'move'
      publishTarget({ status: null, isPinDrop: true })
      trackDragPoint(event)
    },
    [publishTarget, trackDragPoint]
  )

  const handlePinDragLeave = useCallback((event: React.DragEvent<HTMLElement>) => {
    const relatedTarget = event.relatedTarget
    if (relatedTarget instanceof Node && event.currentTarget.contains(relatedTarget)) {
      return
    }
    setPinDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLElement>, status: WorkspaceStatus): void => {
      const worktreeIds = readWorkspaceDragDataIds(event.dataTransfer)
      if (worktreeIds.length === 0) {
        return
      }
      event.preventDefault()
      handleDragFinish()
      onDropWorktreesAtEndOfStatus(worktreeIds, status)
    },
    [handleDragFinish, onDropWorktreesAtEndOfStatus]
  )

  const handlePinDrop = useCallback(
    (event: React.DragEvent<HTMLElement>): void => {
      const worktreeIds = readWorkspaceDragDataIds(event.dataTransfer)
      if (worktreeIds.length === 0) {
        return
      }
      event.preventDefault()
      handleDragFinish()
      onPinWorktrees(worktreeIds)
    },
    [handleDragFinish, onPinWorktrees]
  )

  // Why the document listeners: a native drag ends wherever it ends. A drop outside the
  // board (or on a surface that takes no payload) and the browser's own `dragend` must both
  // tear the highlight and the frame loop down, so nothing stays lit and no frame keeps
  // running after the gesture. They clean up only — the commit stays with the drop targets.
  useEffect(() => {
    if (!open) {
      handleDragFinish()
      return
    }
    document.addEventListener('dragend', handleDragFinish, true)
    document.addEventListener('drop', handleDragFinish, true)
    return () => {
      document.removeEventListener('dragend', handleDragFinish, true)
      document.removeEventListener('drop', handleDragFinish, true)
      handleDragFinish()
    }
  }, [handleDragFinish, open])

  return {
    dragOverStatus,
    pinDragOver,
    setDragOverStatus,
    setPinDragOver,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handlePinDragOver,
    handlePinDragLeave,
    handlePinDrop,
    handleDragFinish
  }
}
