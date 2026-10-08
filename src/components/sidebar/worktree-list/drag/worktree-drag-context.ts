import { createContext } from 'react'
import { WORKTREE_ROW_DRAG_INITIAL_STATE, type WorktreeRowDragState } from './row-state'
import type { WorktreeRowPointerDragHandlers } from './use-pointer-drag'

/** Row identity inside its drag group plus the pointer handlers every row shares. */
export type WorktreeDragRowHandlers = WorktreeRowPointerDragHandlers & {
  groupKeyByRowKey: Map<string, string>
  groupIndexByRowKey: Map<string, number>
}

/**
 * Why two contexts: the handlers change only when the row model does, while the drag
 * state changes on every drop decision. Splitting them keeps a drag frame from
 * re-rendering anything but the rows that read the state — the list itself, and every
 * card inside it, bail out untouched.
 *
 * A null handlers value means the row is not inside a drag surface at all, so it gets
 * neither drag attributes nor pointer handlers.
 */
export const WorktreeDragRowHandlersContext = createContext<WorktreeDragRowHandlers | null>(null)

export const WorktreeRowDragStateContext = createContext<WorktreeRowDragState>(
  WORKTREE_ROW_DRAG_INITIAL_STATE
)
