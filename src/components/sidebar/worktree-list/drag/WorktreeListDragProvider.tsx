// Ported from Orca — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: orca/src/renderer/src/components/sidebar/worktree-list/viewport/VirtualizedWorktreeViewport.tsx (drag provider)
import React, { useMemo, useRef } from 'react'
import type { HostSectionRow } from '../../host-section-rows'
import type { WorktreeGroupReorderArgs, WorktreeDropCommitContext } from './drop-commit-context'
import { useWorktreeDragRuntime } from './use-runtime'
import { useWorktreeDragSession } from './use-session'
import { useWorktreePointerDrag } from './use-pointer-drag'
import {
  WorktreeDragRowHandlersContext,
  WorktreeRowDragStateContext
} from './worktree-drag-context'

/**
 * Owns the pointer-drag session for a painted worktree list and publishes it to the
 * rows through contexts. It sits between the list and its rows so a drag frame
 * re-renders the rows that read the drag state — never the list that renders them.
 */
export function WorktreeListDragProvider({
  rows,
  scrollRef,
  onReorderWorktrees,
  onAssignWorktreesStatus,
  onPinWorktrees,
  children
}: {
  rows: readonly HostSectionRow[]
  scrollRef?: React.RefObject<HTMLDivElement | null>
  onReorderWorktrees: (args: WorktreeGroupReorderArgs) => void
  /** The workspace board's lane drop: a status write, never an order write. */
  onAssignWorktreesStatus: (worktreeIds: readonly string[], status: string) => void
  /** The workspace board's pin strip drop: a pin write, never a status write (D08-028). */
  onPinWorktrees: (worktreeIds: readonly string[]) => void
  children: React.ReactNode
}): React.JSX.Element {
  // Why the fallback: a caller that renders the list without its scroll container
  // (unit renders, composed lists) still gets a stable ref to wire the drag to.
  const fallbackScrollRef = useRef<HTMLDivElement | null>(null)
  const resolvedScrollRef = scrollRef ?? fallbackScrollRef
  const session = useWorktreeDragSession({ rows, scrollRef: resolvedScrollRef })
  const runtime = useWorktreeDragRuntime()
  const ctx = useMemo<WorktreeDropCommitContext>(
    () => ({
      scrollRef: resolvedScrollRef,
      worktreeDragGroups: session.worktreeDragGroups,
      worktreeDragUnitGroups: session.worktreeDragUnitGroups,
      computeWorktreeDrop: session.computeWorktreeDrop,
      refreshWorktreeDragSession: session.refreshWorktreeDragSession,
      clearWorktreeDrag: runtime.clearWorktreeDrag,
      onReorderWorktrees,
      onAssignWorktreesStatus,
      onPinWorktrees
    }),
    [
      onAssignWorktreesStatus,
      onPinWorktrees,
      onReorderWorktrees,
      resolvedScrollRef,
      runtime,
      session
    ]
  )
  const pointerDrag = useWorktreePointerDrag({ ctx, session, runtime })
  const handlers = useMemo(
    () => ({
      groupKeyByRowKey: session.groupKeyByRowKey,
      groupIndexByRowKey: session.groupIndexByRowKey,
      ...pointerDrag
    }),
    [pointerDrag, session.groupIndexByRowKey, session.groupKeyByRowKey]
  )

  return (
    <WorktreeDragRowHandlersContext.Provider value={handlers}>
      <WorktreeRowDragStateContext.Provider value={runtime.worktreeDragState}>
        {children}
      </WorktreeRowDragStateContext.Provider>
    </WorktreeDragRowHandlersContext.Provider>
  )
}
