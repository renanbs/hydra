// The board's pin drop target (D08-028): Orca's `WorkspaceKanbanPinDropTarget` strip.
//
// Why a module store and not React state: the strip is a leaf of the board's tree, the
// sidebar list's drag lives in a sibling tree, and both drags resolve their release by
// pointer position outside React. The strip registers its own element while the board is
// open — the same gate the lane grid uses for the board — and everything else asks here.
// The board's own drags (pointer and native HTML5) do not need this store: they resolve the
// strip by its rect (`resolveWorkspaceBoardPinDropTarget`) and paint the hover through the
// board's shared `pinDragOver` state.
import { useSyncExternalStore } from 'react'
import type { WorkspaceBoardPinDropTarget } from './drag/workspace-board-card-drag-dom'

/** What a release over the strip commits: a pin, never a status. */
const PIN_DROP_TARGET: WorkspaceBoardPinDropTarget = {
  status: null,
  dropIndex: 0,
  isPinDrop: true
}

let registeredStrip: HTMLElement | null = null
let isDragOver = false
const dragOverListeners = new Set<() => void>()

function setDragOver(over: boolean): void {
  if (isDragOver === over) {
    return
  }
  isDragOver = over
  for (const listener of dragOverListeners) {
    listener()
  }
}

/**
 * Registered by the strip while the board is open. Why the open state is part of the
 * registration: the sheet lingers through its close animation, and a board the user
 * dismissed must not stay a drop destination.
 */
export function registerWorkspaceBoardPinDropTarget(args: {
  element: HTMLElement
}): () => void {
  const element = args.element
  registeredStrip = element
  return () => {
    if (registeredStrip !== element) {
      return
    }
    registeredStrip = null
    setDragOver(false)
  }
}

/**
 * The pin target under a pointer position, or `null` when the strip is not a destination —
 * unregistered (the board is closed) or the pointer outside its box. The box is the
 * strip's own rect: unlike the lanes it is not inside the board's hit-test root, which is
 * exactly why both drags ask here before falling back to the lane hit test.
 */
export function resolveWorkspaceBoardPinDropTarget(
  x: number,
  y: number
): WorkspaceBoardPinDropTarget | null {
  const strip = registeredStrip
  if (!strip) {
    return null
  }
  const rect = strip.getBoundingClientRect()
  if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
    return null
  }
  return PIN_DROP_TARGET
}

/** Published by the sidebar list's drag frame: the strip is that drag's own destination. */
export function setWorkspaceBoardPinDropTargetDragOver(over: boolean): void {
  setDragOver(over)
}

function subscribeToDragOver(listener: () => void): () => void {
  dragOverListeners.add(listener)
  return () => {
    dragOverListeners.delete(listener)
  }
}

// Why a named function: `useSyncExternalStore` keys its bail-out on the snapshot's
// identity, so this must stay one stable reference across renders.
function getDragOver(): boolean {
  return isDragOver
}

/** Whether the sidebar list's own drag targets the strip (Orca's external drag target). */
export function useWorkspaceBoardPinDropTargetDragOver(): boolean {
  return useSyncExternalStore(subscribeToDragOver, getDragOver)
}
