import { useCallback, useEffect, useRef } from 'react'
import type React from 'react'
import type { WorkspaceStatus } from '../../../../shared/worktree/types'
import { isSidebarPointerDragBlocked } from '../../worktree-list/pointer-drag-dom'
import { resolveWorkspaceBoardPinDropTarget } from '../workspace-board-pin-drop-target'
import {
  getWorkspaceBoardCardDropTarget,
  isWorkspaceBoardPinDropTarget,
  removeWorkspaceBoardCardDropIndicator,
  resolveWorkspaceBoardCardDropCommitTarget,
  updateWorkspaceBoardCardDropIndicator,
  WORKSPACE_BOARD_CARD_SELECTOR,
  WORKSPACE_BOARD_LANE_SELECTOR,
  type WorkspaceBoardCardTrackedDropTarget
} from './workspace-board-card-drag-dom'
import {
  createWorkspaceBoardCardDragPreview,
  setWorkspaceBoardCardDragDocumentStyles,
  setWorkspaceBoardDraggedCard,
  updateWorkspaceBoardCardDragPreviewPosition
} from './workspace-board-card-drag-preview-dom'
import { shouldStartWorkspaceBoardCardPointerDrag } from './workspace-board-card-drag-start'

/** Orca's card threshold: a press only becomes a drag once the pointer really moved. */
const POINTER_DRAG_THRESHOLD_PX = 5

/** How long a click after a finished drag is swallowed, so a drop never activates a card. */
const CLICK_SUPPRESSION_MS = 250

type WorkspaceBoardCardDragState = {
  pointerId: number
  startX: number
  startY: number
  currentX: number
  currentY: number
  /** The worktree the drop commits for; `set_worktree_status` keys on the path. */
  worktreePath: string
  /** Status of the lane the card was lifted from; a release back here is a no-op. */
  sourceStatus: WorkspaceStatus | null
  sourceCard: HTMLElement
  preview: HTMLElement | null
  previewOffsetX: number
  previewOffsetY: number
  started: boolean
  frameId: number | null
  latestDropTarget: WorkspaceBoardCardTrackedDropTarget | null
}

/**
 * Which status a release actually writes: nothing without a destination lane, and nothing
 * when the destination is the lane the card came from — a drop in place must not rewrite
 * the same value through the persistence command.
 */
export function resolveWorkspaceBoardCardDragCommit(args: {
  sourceStatus: WorkspaceStatus | null
  targetStatus: WorkspaceStatus | null
}): WorkspaceStatus | null {
  if (!args.targetStatus || args.targetStatus === args.sourceStatus) {
    return null
  }
  return args.targetStatus
}

/**
 * Turns a primary-button press on a board card into a drag session: nothing happens until
 * the pointer crosses the threshold, and the floating preview, the highlighted destination
 * lane and the insertion line are driven by one RAF per frame. Aborting (Escape,
 * `pointercancel`, window blur, the board closing) tears all of it down without committing.
 */
export function useWorkspaceBoardCardPointerDrag(args: {
  open: boolean
  boardRef: React.RefObject<HTMLDivElement | null>
  onAssignWorktreeStatus: (worktreePath: string, status: WorkspaceStatus) => void | Promise<void>
  /** Pins the dropped workspace without touching its status (D08-028). */
  onPinWorktree: (worktreePath: string) => void | Promise<void>
  /**
   * The board's one lane-highlight state (Orca's `onDragTargetChange`). The native drag owns
   * it and the pointer drag publishes into it, so both gestures light the same lane.
   */
  onDragTargetChange: (status: WorkspaceStatus | null) => void
  /** The board's one pin-hover state (Orca's `onPinDragTargetChange`). */
  onPinDragTargetChange: (over: boolean) => void
}): {
  onCardPointerDownCapture: (event: React.PointerEvent<HTMLElement>) => void
  /**
   * Whether a card drag is in flight *past its threshold*. Read imperatively (never rendered)
   * by the Shift+wheel scroll, which is only allowed to take the wheel mid-drag.
   */
  isPointerDragActiveRef: React.RefObject<boolean>
} {
  const {
    open,
    boardRef,
    onAssignWorktreeStatus,
    onPinWorktree,
    onDragTargetChange,
    onPinDragTargetChange
  } = args
  const dragRef = useRef<WorkspaceBoardCardDragState | null>(null)
  const isPointerDragActiveRef = useRef(false)
  const suppressClickUntilRef = useRef(0)
  // Why: the window listeners are installed once per open board, so the commit callbacks
  // must be read through refs that always hold the latest ones App handed down.
  const assignStatusRef = useRef(onAssignWorktreeStatus)
  assignStatusRef.current = onAssignWorktreeStatus
  const pinWorktreeRef = useRef(onPinWorktree)
  pinWorktreeRef.current = onPinWorktree

  const clearDropTarget = useCallback(() => {
    onDragTargetChange(null)
    onPinDragTargetChange(false)
    removeWorkspaceBoardCardDropIndicator()
  }, [onDragTargetChange, onPinDragTargetChange])

  const stopWorkspaceBoardCardDrag = useCallback(
    (commit: boolean) => {
      const state = dragRef.current
      if (!state) {
        return
      }
      const commitTarget =
        commit && state.started && boardRef.current
          ? resolveWorkspaceBoardCardDropCommitTarget({
              // Why the pin again here: the pointerup can land with no frame for its final
              // position, and the strip is not inside the board's hit-test root.
              currentTarget:
                resolveWorkspaceBoardPinDropTarget(state.currentX, state.currentY) ??
                getWorkspaceBoardCardDropTarget(
                  boardRef.current,
                  state.currentX,
                  state.currentY
                ),
              latestTrackedTarget: state.latestDropTarget,
              x: state.currentX,
              y: state.currentY
            })
          : null
      const commitStatus = resolveWorkspaceBoardCardDragCommit({
        sourceStatus: state.sourceStatus,
        targetStatus: commitTarget?.status ?? null
      })

      dragRef.current = null
      if (state.frameId !== null) {
        window.cancelAnimationFrame(state.frameId)
      }
      setWorkspaceBoardDraggedCard(state.sourceCard, false)
      clearDropTarget()
      state.preview?.remove()
      setWorkspaceBoardCardDragDocumentStyles(false)

      if (!state.started) {
        return
      }
      isPointerDragActiveRef.current = false
      suppressClickUntilRef.current = performance.now() + CLICK_SUPPRESSION_MS
      // Why before the status commit: a release over the pin strip is a pin, and the strip
      // resolves no lane, so it can never also write the column.
      if (commitTarget && isWorkspaceBoardPinDropTarget(commitTarget)) {
        void pinWorktreeRef.current(state.worktreePath)
        return
      }
      if (!commitStatus) {
        return
      }
      void assignStatusRef.current(state.worktreePath, commitStatus)
    },
    [boardRef, clearDropTarget]
  )

  const startWorkspaceBoardCardDrag = useCallback((state: WorkspaceBoardCardDragState) => {
    state.started = true
    isPointerDragActiveRef.current = true
    setWorkspaceBoardDraggedCard(state.sourceCard, true)
    const preview = createWorkspaceBoardCardDragPreview({
      sourceCard: state.sourceCard,
      pointerX: state.currentX,
      pointerY: state.currentY
    })
    state.preview = preview.preview
    state.previewOffsetX = preview.offsetX
    state.previewOffsetY = preview.offsetY
    setWorkspaceBoardCardDragDocumentStyles(true)
  }, [])

  const updateWorkspaceBoardCardDropTarget = useCallback(
    (state: WorkspaceBoardCardDragState) => {
      const board = boardRef.current
      if (!board) {
        clearDropTarget()
        return
      }
      // Why the pin first: the strip sits above the lane row, outside the board's hit-test
      // root, so the lane hit test would never see it — and while it is the destination the
      // lane highlight and the insertion line must both stay dark.
      const target =
        resolveWorkspaceBoardPinDropTarget(state.currentX, state.currentY) ??
        getWorkspaceBoardCardDropTarget(board, state.currentX, state.currentY)
      state.latestDropTarget = { target, x: state.currentX, y: state.currentY }
      onPinDragTargetChange(isWorkspaceBoardPinDropTarget(target))
      onDragTargetChange(target.status)
      if (target.status === null) {
        removeWorkspaceBoardCardDropIndicator()
        return
      }
      updateWorkspaceBoardCardDropIndicator(target)
    },
    [boardRef, clearDropTarget, onDragTargetChange, onPinDragTargetChange]
  )

  const flushWorkspaceBoardCardDragFrame = useCallback(() => {
    const state = dragRef.current
    if (!state) {
      return
    }
    state.frameId = null
    if (!state.started) {
      return
    }
    if (state.preview) {
      updateWorkspaceBoardCardDragPreviewPosition({
        preview: state.preview,
        pointerX: state.currentX,
        pointerY: state.currentY,
        offsetX: state.previewOffsetX,
        offsetY: state.previewOffsetY
      })
    }
    updateWorkspaceBoardCardDropTarget(state)
  }, [updateWorkspaceBoardCardDropTarget])

  const scheduleWorkspaceBoardCardDragFrame = useCallback(
    (state: WorkspaceBoardCardDragState) => {
      if (state.frameId !== null) {
        return
      }
      state.frameId = window.requestAnimationFrame(flushWorkspaceBoardCardDragFrame)
    },
    [flushWorkspaceBoardCardDragFrame]
  )

  useEffect(() => {
    if (!open) {
      stopWorkspaceBoardCardDrag(false)
      return
    }

    const handlePointerMove = (event: PointerEvent): void => {
      const state = dragRef.current
      if (!state || event.pointerId !== state.pointerId) {
        return
      }
      state.currentX = event.clientX
      state.currentY = event.clientY
      if (!state.started) {
        const distance = Math.hypot(state.currentX - state.startX, state.currentY - state.startY)
        if (distance < POINTER_DRAG_THRESHOLD_PX) {
          return
        }
        startWorkspaceBoardCardDrag(state)
      }
      event.preventDefault()
      scheduleWorkspaceBoardCardDragFrame(state)
    }

    const handlePointerUp = (event: PointerEvent): void => {
      const state = dragRef.current
      if (!state || event.pointerId !== state.pointerId) {
        return
      }
      state.currentX = event.clientX
      state.currentY = event.clientY
      if (state.started) {
        event.preventDefault()
      }
      stopWorkspaceBoardCardDrag(true)
    }

    const handlePointerCancel = (event: PointerEvent): void => {
      const state = dragRef.current
      if (!state || event.pointerId !== state.pointerId) {
        return
      }
      stopWorkspaceBoardCardDrag(false)
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape' || !dragRef.current) {
        return
      }
      // Why: the board dismisses itself from a document capture listener, so Escape has
      // to be taken on the window capture phase — aborting a drag must not also close the
      // board under it.
      event.preventDefault()
      event.stopPropagation()
      stopWorkspaceBoardCardDrag(false)
    }

    // Why: the drop resolves under a click React routes to whatever card sits under the
    // pointer after the lanes already moved, so the post-drag click is swallowed at the
    // document, not on the source card.
    const handleClick = (event: MouseEvent): void => {
      if (performance.now() > suppressClickUntilRef.current) {
        return
      }
      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()
    }

    const handleBlur = (): void => stopWorkspaceBoardCardDrag(false)

    window.addEventListener('keydown', handleKeyDown, true)
    window.addEventListener('pointermove', handlePointerMove, true)
    window.addEventListener('pointerup', handlePointerUp, true)
    window.addEventListener('pointercancel', handlePointerCancel, true)
    window.addEventListener('blur', handleBlur)
    document.addEventListener('click', handleClick, true)
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
      window.removeEventListener('pointermove', handlePointerMove, true)
      window.removeEventListener('pointerup', handlePointerUp, true)
      window.removeEventListener('pointercancel', handlePointerCancel, true)
      window.removeEventListener('blur', handleBlur)
      document.removeEventListener('click', handleClick, true)
      stopWorkspaceBoardCardDrag(false)
    }
  }, [
    open,
    scheduleWorkspaceBoardCardDragFrame,
    startWorkspaceBoardCardDrag,
    stopWorkspaceBoardCardDrag
  ])

  const onCardPointerDownCapture = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!open || !shouldStartWorkspaceBoardCardPointerDrag(event.nativeEvent)) {
        return
      }
      const target = event.target
      if (!(target instanceof Element)) {
        return
      }
      const card = target.closest<HTMLElement>(WORKSPACE_BOARD_CARD_SELECTOR)
      const board = boardRef.current
      // Why the sidebar's own blocker list: a press that belongs to a control inside the
      // card (quick actions, links, menus) keeps its click instead of lifting the card.
      if (!card || !board?.contains(card) || isSidebarPointerDragBlocked(target, card)) {
        return
      }
      const worktreePath = card.dataset.workspaceBoardWorktreePath
      if (!worktreePath) {
        return
      }
      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        currentX: event.clientX,
        currentY: event.clientY,
        worktreePath,
        sourceStatus:
          card.closest<HTMLElement>(WORKSPACE_BOARD_LANE_SELECTOR)?.dataset.workspaceStatus ?? null,
        sourceCard: card,
        preview: null,
        previewOffsetX: 0,
        previewOffsetY: 0,
        started: false,
        frameId: null,
        latestDropTarget: null
      }
    },
    [boardRef, open]
  )

  return { onCardPointerDownCapture, isPointerDragActiveRef }
}
