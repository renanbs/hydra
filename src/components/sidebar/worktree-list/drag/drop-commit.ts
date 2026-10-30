// Ported from Orca — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: orca/src/renderer/src/components/sidebar/worktree-list/drag/pointer-commit.ts
// (commit resolution) and `use-document-drop.ts` (the capture-phase fallback).
//
// Every drop path — the pointer gesture, the card's native HTML5 drag and the
// document's capture-phase fallback — resolves the release through this module, so
// one gesture has exactly one commit implementation regardless of which mechanism
// the browser happened to use.
import { getFullDropIndexForWorktreeDragUnit } from '../../worktree-drag-units'
import { isWorkspaceBoardPinDropTarget } from '../../workspace-board/drag/workspace-board-card-drag-dom'
import {
  getWorkspaceBoardSidebarDropTarget,
  type WorkspaceBoardSidebarDropTarget
} from '../../workspace-board/workspace-board-sidebar-drop'
import type { ExecutionHostId } from '../../../../shared/execution-host'
import type { WorktreeDropCommitContext } from './drop-commit-context'
import {
  clearWorktreeLineageDropTargetVisual,
  findWorktreeNestingTarget,
  isWorktreeNestingCardPainted
} from './nesting'
import { clearSidebarSectionDropVisual, findSidebarSectionDropTarget } from './section-drop'

export type WorktreeDropPoint = { x: number; y: number }

/**
 * The nest a release promises only exists while the hovered card is still painted.
 * A parent id that no longer names a card is not a nest: refuse it instead of writing
 * a lineage the user never saw.
 */
export function resolveWorktreeNestCommit(args: {
  nestingTargetId: string | null
  isTargetPainted: (nestingTargetId: string) => boolean
}): string | null {
  const { nestingTargetId } = args
  if (!nestingTargetId || !args.isTargetPainted(nestingTargetId)) {
    return null
  }
  return nestingTargetId
}

/** A release outside the list's horizontal band is a throw-away, not a reorder. */
export function isWorktreeDropPointInsideSidebar(
  ctx: WorktreeDropCommitContext,
  point: WorktreeDropPoint
): boolean {
  const container = ctx.scrollRef.current
  if (!container) {
    return false
  }
  const rect = container.getBoundingClientRect()
  return point.x >= rect.left && point.x <= rect.right
}

export type WorktreeDropCommitArgs = {
  ctx: WorktreeDropCommitContext
  point: WorktreeDropPoint
  /** Every id the gesture drags, including nested descendants. */
  draggedIds: readonly string[]
  /** The subset the group reorder moves (drag units inside the source group). */
  reorderDraggedIds: readonly string[]
  sourceGroupKey: string
  /**
   * The execution host the gesture started on. A workspace id repeats across hosts,
   * so the status/pin write is qualified by it (D03a-021).
   */
  executionHostId?: ExecutionHostId
  /**
   * Pointer releases require the horizontal band: the rows and the terminal beside
   * them share a Y, so a bare Y hit test would reorder from a pointer that is
   * obviously not over the list. The native document path keeps the same rule.
   */
  requireInsideSidebarBand?: boolean
  /** Bookkeeping for the board preview the pointer path opened (D03a-012). */
  onBoardTarget?: (target: WorkspaceBoardSidebarDropTarget) => void
}

/** What a release resolved to, so each path can report the same commit it made. */
export type WorktreeDropCommitOutcome =
  | 'section'
  | 'nest'
  | 'board'
  | 'reorder'
  | 'abandoned'

/** True when the outcome wrote something; an abandoned release only tore the drag down. */
export function isWorktreeDropCommitWrite(outcome: WorktreeDropCommitOutcome): boolean {
  return outcome === 'section' || outcome === 'nest' || outcome === 'board' || outcome === 'reorder'
}

/**
 * Resolves and commits the release. Every path commits through this function; the
 * outcome says which write happened (or that the release was abandoned).
 */
export function commitWorktreeDropAtPoint(
  args: WorktreeDropCommitArgs
): WorktreeDropCommitOutcome {
  const { ctx, point, draggedIds, reorderDraggedIds, sourceGroupKey } = args
  if (!ctx.refreshWorktreeDragSession()) {
    clearWorktreeLineageDropTargetVisual()
    ctx.clearWorktreeDrag()
    return 'abandoned'
  }
  // A section header under the release is a membership write: pinning or moving to
  // the status lane, exactly as the board's own targets do.
  const sectionTarget = findSidebarSectionDropTarget(point.x, point.y)
  if (sectionTarget) {
    clearSidebarSectionDropVisual()
    if (sectionTarget.kind === 'pin') {
      ctx.onPinWorktrees(draggedIds, args.executionHostId)
    } else {
      ctx.onAssignWorktreesStatus(draggedIds, sectionTarget.status, args.executionHostId)
    }
    ctx.clearWorktreeDrag()
    return 'section'
  }
  clearSidebarSectionDropVisual()
  // Why before the reorder slot: a nest is committed against the card under the
  // release point, and the ring the user saw is the promise being kept.
  const nestingTarget = findWorktreeNestingTarget({
    pointerX: point.x,
    pointerY: point.y,
    draggedIds,
    parentIdByChildId: ctx.lineageParentIdByChildId
  })
  const nestParentId = resolveWorktreeNestCommit({
    nestingTargetId: nestingTarget,
    isTargetPainted: isWorktreeNestingCardPainted
  })
  if (nestParentId) {
    clearWorktreeLineageDropTargetVisual()
    ctx.onNestWorktrees(nestParentId, draggedIds)
    ctx.clearWorktreeDrag()
    return 'nest'
  }
  clearWorktreeLineageDropTargetVisual()
  // Why before the band test: the board sits outside the list's horizontal band, so a
  // release over it would otherwise read as a throw-away.
  const boardTarget = getWorkspaceBoardSidebarDropTarget(point.x, point.y)
  if (boardTarget) {
    args.onBoardTarget?.(boardTarget)
    if (isWorkspaceBoardPinDropTarget(boardTarget)) {
      ctx.onPinWorktrees(draggedIds, args.executionHostId)
    } else {
      ctx.onAssignWorktreesStatus(draggedIds, boardTarget.status, args.executionHostId)
    }
    ctx.clearWorktreeDrag()
    return 'board'
  }
  if (args.requireInsideSidebarBand !== false && !isWorktreeDropPointInsideSidebar(ctx, point)) {
    ctx.clearWorktreeDrag()
    return 'abandoned'
  }
  const drop = ctx.computeWorktreeDrop(point.y)
  if (!drop) {
    ctx.clearWorktreeDrag()
    return 'abandoned'
  }
  // A nested row dropped on a reorder line leaves its parent instead of staying in
  // a tree the user just moved it out of.
  const nestedIds = reorderDraggedIds.filter((id) => ctx.lineageParentIdByChildId.has(id))
  if (nestedIds.length > 0) {
    ctx.onUnnestWorktrees(nestedIds)
  }
  ctx.onReorderWorktrees({
    groups: ctx.worktreeDragGroups,
    sourceGroupKey,
    draggedIds: reorderDraggedIds,
    dropIndex: getFullDropIndexForWorktreeDragUnit({
      groups: ctx.worktreeDragUnitGroups,
      sourceGroupKey,
      dropIndex: drop.dropIndex
    })
  })
  ctx.clearWorktreeDrag()
  return 'reorder'
}
