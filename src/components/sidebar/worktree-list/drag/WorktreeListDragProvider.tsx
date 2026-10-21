// Ported from Orca — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: orca/src/renderer/src/components/sidebar/worktree-list/viewport/VirtualizedWorktreeViewport.tsx (drag provider)
import React, { useCallback, useMemo, useRef } from 'react'
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
  lineageParentIdByChildId,
  onNestWorktrees,
  onUnnestWorktrees,
  workspaceBoardOpen = false,
  onWorkspaceBoardDragPreviewStart = () => {},
  onWorkspaceBoardDragPreviewCommit = () => {},
  onWorkspaceBoardDragPreviewCancel = () => {},
  resolveDraggedWorktreeIds,
  children
}: {
  rows: readonly HostSectionRow[]
  scrollRef?: React.RefObject<HTMLDivElement | null>
  onReorderWorktrees: (args: WorktreeGroupReorderArgs) => void
  /** The workspace board's lane drop: a status write, never an order write. */
  onAssignWorktreesStatus: (worktreeIds: readonly string[], status: string) => void
  /** The workspace board's pin strip drop: a pin write, never a status write (D08-028). */
  onPinWorktrees: (worktreeIds: readonly string[]) => void
  /** Persisted lineage parent per child id, used to reject cycles during a nest drag. */
  lineageParentIdByChildId: ReadonlyMap<string, string>
  /** Commits a nest drag over the hovered parent card. */
  onNestWorktrees: (parentWorktreeId: string, childWorktreeIds: readonly string[]) => void
  /** Detaches nested rows that were dragged out onto a reorder line. */
  onUnnestWorktrees: (childWorktreeIds: readonly string[]) => void
  /** Whether the board is already open; a preview is only needed when it is not. */
  workspaceBoardOpen?: boolean
  /** Opens the board as a drag preview (D03a-012). */
  onWorkspaceBoardDragPreviewStart?: () => void
  /** The drag reached the board; keep it open after the drag ends. */
  onWorkspaceBoardDragPreviewCommit?: () => void
  /** A preview board opened by this drag closes when the drag is abandoned. */
  onWorkspaceBoardDragPreviewCancel?: () => void
  /**
   * The ids a press drags (D03a-002): the list's selection when the pressed row is part of one
   * and it holds more than one, the pressed row alone otherwise.
   */
  resolveDraggedWorktreeIds: (rowKey: string, worktreeId: string) => readonly string[]
  children: React.ReactNode
}): React.JSX.Element {
  // Why the fallback: a caller that renders the list without its scroll container
  // (unit renders, composed lists) still gets a stable ref to wire the drag to.
  const fallbackScrollRef = useRef<HTMLDivElement | null>(null)
  const resolvedScrollRef = scrollRef ?? fallbackScrollRef
  const session = useWorktreeDragSession({ rows, scrollRef: resolvedScrollRef })
  const runtime = useWorktreeDragRuntime()
  // Why wrap: the preview board belongs to the drag, so every abandonment path
  // (drop off-target, Escape, pointercancel, unmount) must close it — unless the drag
  // actually reached the board.
  const clearWorktreeDrag = useCallback(() => {
    const drag = runtime.worktreePointerDragRef.current
    if (drag?.workspaceBoardDragPreviewRequested && !drag.boardPreviewCommitted) {
      onWorkspaceBoardDragPreviewCancel()
    }
    runtime.clearWorktreeDrag()
  }, [onWorkspaceBoardDragPreviewCancel, runtime])
  const ctx = useMemo<WorktreeDropCommitContext>(
    () => ({
      scrollRef: resolvedScrollRef,
      worktreeDragGroups: session.worktreeDragGroups,
      worktreeDragUnitGroups: session.worktreeDragUnitGroups,
      computeWorktreeDrop: session.computeWorktreeDrop,
      refreshWorktreeDragSession: session.refreshWorktreeDragSession,
      clearWorktreeDrag,
      resolveDraggedWorktreeIds,
      onReorderWorktrees,
      onAssignWorktreesStatus,
      onPinWorktrees,
      lineageParentIdByChildId,
      onNestWorktrees,
      onUnnestWorktrees,
      workspaceBoardOpen,
      onWorkspaceBoardDragPreviewStart,
      onWorkspaceBoardDragPreviewCommit
    }),
    [
      onAssignWorktreesStatus,
      onPinWorktrees,
      onReorderWorktrees,
      lineageParentIdByChildId,
      onNestWorktrees,
      onUnnestWorktrees,
      workspaceBoardOpen,
      onWorkspaceBoardDragPreviewStart,
      onWorkspaceBoardDragPreviewCommit,
      resolveDraggedWorktreeIds,
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
