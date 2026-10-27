// The contract of a sidebar-list drop onto the workspace board (D08-002, D08-040,
// D03a-011, D03a-012, D08-028).
//
// Why a module store and not React state: the drag lives in the sidebar list, and the lane
// that paints the highlight lives in the board — a sibling. The lane grid registers the
// open board here, the drag publishes the lane and slot it resolved, and the grid
// subscribes so the destination lane paints its own ring. The geometry stays the board's
// own: the resolution reads the layout the grid measured, so a lane the virtualizer has
// outside its window still resolves. The pin strip is the same bridge's other destination
// (D08-028): it registers itself and answers first, because it sits above the lane row.
import { useSyncExternalStore } from 'react'
import type { WorkspaceStatus } from '../../../shared/worktree/types'
import {
  getWorkspaceBoardCardDropTarget,
  isWorkspaceBoardPinDropTarget,
  removeWorkspaceBoardCardDropIndicator,
  updateWorkspaceBoardCardDropIndicator,
  type WorkspaceBoardCardLaneDropTarget,
  type WorkspaceBoardPinDropTarget
} from './drag/workspace-board-card-drag-dom'
import {
  resolveWorkspaceBoardPinDropTarget,
  setWorkspaceBoardPinDropTargetDragOver
} from './workspace-board-pin-drop-target'

/** What a sidebar-list drop onto the open board resolves: a lane, or the pin strip. */
export type WorkspaceBoardSidebarDropTarget =
  | WorkspaceBoardCardLaneDropTarget
  | WorkspaceBoardPinDropTarget

type WorkspaceBoardSidebarDropBoard = {
  element: HTMLElement
}

let registeredBoard: WorkspaceBoardSidebarDropBoard | null = null
let dropTargetStatus: WorkspaceStatus | null = null
const dropTargetListeners = new Set<() => void>()

function setDropTargetStatus(status: WorkspaceStatus | null): void {
  if (dropTargetStatus === status) {
    return
  }
  dropTargetStatus = status
  for (const listener of dropTargetListeners) {
    listener()
  }
}

/**
 * Registered by the lane grid while the board is open, so the list knows a drop of its
 * own reaches the board. Why the open state is part of the registration: the sheet
 * lingers through its close animation, and a board the user dismissed must not stay a
 * drop destination.
 */
export function registerWorkspaceBoardSidebarDropBoard(args: {
  boardElement: HTMLElement
}): () => void {
  const registration: WorkspaceBoardSidebarDropBoard = { element: args.boardElement }
  registeredBoard = registration
  return () => {
    if (registeredBoard !== registration) {
      return
    }
    registeredBoard = null
    // Why: the insertion line is appended to the body and outlives React's tree, so a
    // board that closes or unmounts mid-drag must take it down with it.
    clearWorkspaceBoardSidebarDropTargetVisual()
  }
}

/**
 * Whether an open board is mounted. The list reads it to let a group of a single row
 * start a drag: the row has no slot to reorder to, but the board is still a destination.
 */
export function hasWorkspaceBoardSidebarDropBoard(): boolean {
  return registeredBoard !== null
}

/**
 * The board's destination under the pointer, or `null` when the board is not the
 * destination — unregistered, closed, or the pointer outside it. The pin strip answers
 * first: it sits above the lane row, outside the board's own hit-test root.
 */
export function getWorkspaceBoardSidebarDropTarget(
  x: number,
  y: number
): WorkspaceBoardSidebarDropTarget | null {
  const pinTarget = resolveWorkspaceBoardPinDropTarget(x, y)
  if (pinTarget) {
    return pinTarget
  }
  const board = registeredBoard
  if (!board) {
    return null
  }
  // Why the board's own rect first: the lane hit test tolerates a small gap between
  // lanes, and without this the first lane would also catch a pointer inside the sidebar
  // next to the board's edge.
  const rect = board.element.getBoundingClientRect()
  if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
    return null
  }
  const target = getWorkspaceBoardCardDropTarget(board.element, x, y)
  return target.status === null ? null : target
}

/**
 * Paints the target the drag resolved: the destination lane's highlight (the grid reads
 * the published status), the pin strip's own hover, and the insertion line the board's own
 * card drag paints. `null` clears all of it.
 */
export function updateWorkspaceBoardSidebarDropTargetVisual(
  target: WorkspaceBoardSidebarDropTarget | null
): void {
  // Why the lane is derived from the status and not from the target: the pin strip resolves
  // no lane, so a pin target must leave the lane highlight and the line dark.
  const laneTarget: WorkspaceBoardCardLaneDropTarget | null =
    target !== null && target.status !== null ? target : null
  setWorkspaceBoardPinDropTargetDragOver(target !== null && isWorkspaceBoardPinDropTarget(target))
  setDropTargetStatus(laneTarget?.status ?? null)
  if (laneTarget) {
    updateWorkspaceBoardCardDropIndicator(laneTarget)
    return
  }
  removeWorkspaceBoardCardDropIndicator()
}

/** Tears the target's visual down: a drop, an abort, or a board that closed under the drag. */
export function clearWorkspaceBoardSidebarDropTargetVisual(): void {
  setDropTargetStatus(null)
  setWorkspaceBoardPinDropTargetDragOver(false)
  removeWorkspaceBoardCardDropIndicator()
}

function subscribeToDropTargetStatus(listener: () => void): () => void {
  dropTargetListeners.add(listener)
  return () => {
    dropTargetListeners.delete(listener)
  }
}

// Why a named function: `useSyncExternalStore` keys its bail-out on the snapshot's
// identity, so this must stay one stable reference across renders.
function getDropTargetStatus(): WorkspaceStatus | null {
  return dropTargetStatus
}

/** The lane the sidebar drag is over, as the lane grid paints its highlight. */
export function useWorkspaceBoardSidebarDropTargetStatus(): WorkspaceStatus | null {
  return useSyncExternalStore(subscribeToDropTargetStatus, getDropTargetStatus)
}
