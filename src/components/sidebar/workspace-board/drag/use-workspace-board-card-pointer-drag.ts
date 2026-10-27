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
  type WorkspaceBoardCardTrackedDropTarget
} from './workspace-board-card-drag-dom'
import {
  createWorkspaceBoardCardDragPreview,
  setWorkspaceBoardCardDragDocumentStyles,
  setWorkspaceBoardDraggedCards,
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
  /**
   * The batch the drop commits for (D03a-002): the whole selection when the pressed card is
   * part of one, otherwise the pressed card alone. Each entry carries its own lane status, so a
   * drop resolves per worktree instead of rewriting the lane every card already sits in.
   */
  targets: readonly WorkspaceBoardCardDragTarget[]
  /** The card the press lifted: the clone source and the grab point. */
  sourceCard: HTMLElement
  /** Every painted card the batch ghosts while the drag is in flight. */
  draggedCards: readonly HTMLElement[]
  preview: HTMLElement | null
  previewOffsetX: number
  previewOffsetY: number
  started: boolean
  frameId: number | null
  latestDropTarget: WorkspaceBoardCardTrackedDropTarget | null
}

/** One worktree a board card drag moves, with the lane it was lifted from. */
export type WorkspaceBoardCardDragTarget = {
  /** Host-qualified card identity — the selection's vocabulary. */
  identity: string
  /** The workspace path the app's own writers key on. */
  worktreePath: string
  /** The lane the worktree sits in when the drag lifts it; a release back here is a no-op. */
  status: WorkspaceStatus | null
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
   * Resolves the batch a press on a card moves (D03a-002): the board's selection when the card
   * is part of it and it holds more than one, the pressed card alone otherwise. Host-qualified,
   * so two hosts publishing the same workspace id never collapse into one entry.
   */
  resolveCardDragTargets: (
    draggedWorktreeId: string,
    draggedWorktreeIdentity: string
  ) => readonly WorkspaceBoardCardDragTarget[]
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
    resolveCardDragTargets,
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
  // Why a ref: the window listeners are installed once per open board and the press handler is
  // handed to memoised lanes, so the resolver is read through a ref that always holds the latest.
  const resolveCardDragTargetsRef = useRef(resolveCardDragTargets)
  resolveCardDragTargetsRef.current = resolveCardDragTargets

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

      dragRef.current = null
      if (state.frameId !== null) {
        window.cancelAnimationFrame(state.frameId)
      }
      setWorkspaceBoardDraggedCards(state.draggedCards, false)
      clearDropTarget()
      state.preview?.remove()
      setWorkspaceBoardCardDragDocumentStyles(false)

      if (!state.started) {
        return
      }
      isPointerDragActiveRef.current = false
      suppressClickUntilRef.current = performance.now() + CLICK_SUPPRESSION_MS
      // Why before the status commit: a release over the pin strip is a pin, and the strip
      // resolves no lane, so it can never also write the column. The whole batch pins.
      if (commitTarget && isWorkspaceBoardPinDropTarget(commitTarget)) {
        for (const target of state.targets) {
          void pinWorktreeRef.current(target.worktreePath)
        }
        return
      }
      // Why per target: the batch can span lanes, so each worktree is compared against its own
      // source lane — one write per worktree that actually moves, none for the ones already
      // sitting in the destination lane.
      for (const target of state.targets) {
        const commitStatus = resolveWorkspaceBoardCardDragCommit({
          sourceStatus: target.status,
          targetStatus: commitTarget?.status ?? null
        })
        if (commitStatus) {
          void assignStatusRef.current(target.worktreePath, commitStatus)
        }
      }
    },
    [boardRef, clearDropTarget]
  )

  const startWorkspaceBoardCardDrag = useCallback((state: WorkspaceBoardCardDragState) => {
    state.started = true
    isPointerDragActiveRef.current = true
    const board = boardRef.current
    if (board) {
      const batchIdentities = new Set(state.targets.map((target) => target.identity))
      state.draggedCards = Array.from(
        board.querySelectorAll<HTMLElement>(WORKSPACE_BOARD_CARD_SELECTOR)
      ).filter((card) => {
        const identity = card.dataset.workspaceBoardCardId
        return identity !== undefined && batchIdentities.has(identity)
      })
    }
    setWorkspaceBoardDraggedCards(state.draggedCards, true)
    const preview = createWorkspaceBoardCardDragPreview({
      sourceCard: state.sourceCard,
      pointerX: state.currentX,
      pointerY: state.currentY,
      draggedCount: state.targets.length
    })
    state.preview = preview.preview
    state.previewOffsetX = preview.offsetX
    state.previewOffsetY = preview.offsetY
    setWorkspaceBoardCardDragDocumentStyles(true)
  }, [boardRef])

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
      const identity = card.dataset.workspaceBoardCardId
      if (!worktreePath || !identity) {
        return
      }
      // Why resolved at press time: the selection can change between the press and the
      // threshold, and the batch a drop commits must be the one the press described.
      const targets = resolveCardDragTargetsRef.current(
        card.dataset.workspaceBoardWorktreeId ?? worktreePath,
        identity
      )
      if (targets.length === 0) {
        return
      }
      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        currentX: event.clientX,
        currentY: event.clientY,
        targets,
        sourceCard: card,
        draggedCards: [],
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
