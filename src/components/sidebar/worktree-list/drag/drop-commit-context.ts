// Ported from Orca — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: orca/src/renderer/src/components/sidebar/worktree-list/drag/drop-commit-context.ts
import type { WorktreeDragGroup } from '../../worktree-manual-order'
import type { WorktreeDragUnitGroup } from '../../worktree-drag-units'
import type { WorktreeSidebarDropPreview } from '../../worktree-sidebar-drop-preview'
import type { ExecutionHostId } from '../../../../shared/execution-host'
import type { WorktreeStatusDropRequest } from './use-session'

/** A within-group reorder a drop resolved to, in drag-unit indexes. */
export type WorktreeGroupReorderArgs = {
  groups: readonly WorktreeDragGroup[]
  sourceGroupKey: string
  draggedIds: readonly string[]
  dropIndex: number
}

/** The shared surface every drop path (pointer now, native drag next) commits through. */
export type WorktreeDropCommitContext = {
  scrollRef: React.RefObject<HTMLDivElement | null>
  worktreeDragGroups: readonly WorktreeDragGroup[]
  worktreeDragUnitGroups: readonly WorktreeDragUnitGroup[]
  computeWorktreeDrop: (pointerY: number) => WorktreeSidebarDropPreview | null
  /** Where a card would land inside a status lane the hovered header names. */
  computeWorktreeStatusDrop: (
    request: WorktreeStatusDropRequest
  ) => WorktreeSidebarDropPreview | null
  refreshWorktreeDragSession: () => boolean
  clearWorktreeDrag: () => void
  /**
   * The ids a press actually drags (D03a-002): the list's selection when the pressed row is part
   * of one and it holds more than one, the pressed row alone otherwise — resolved host-qualified
   * by the list, because two hosts can publish the same workspace id.
   */
  resolveDraggedWorktreeIds: (rowKey: string, worktreeId: string) => readonly string[]
  onReorderWorktrees: (args: WorktreeGroupReorderArgs) => void
  /**
   * Writes a persisted workspace status for the dragged workspaces. The workspace board's
   * lane drop is its only caller: the list's own drops reorder, they do not recolour the
   * status column, and the panel bridges the ids onto the app's single status writer.
   * The source host qualifies the write: a workspace id repeats across execution hosts,
   * so a drop must never write another host's row (D03a-021).
   */
  onAssignWorktreesStatus: (
    worktreeIds: readonly string[],
    status: string,
    executionHostId?: ExecutionHostId
  ) => void
  /**
   * Pins the dragged workspaces without touching their status. The board's pin strip drop
   * (D08-028) is its only caller, and the panel bridges the ids onto the app's single pin
   * writer — the same one the row menu uses. Host-qualified for the same reason.
   */
  onPinWorktrees: (worktreeIds: readonly string[], executionHostId?: ExecutionHostId) => void
  /** Persisted lineage parent per child id, the cycle check for a nest drop. */
  lineageParentIdByChildId: ReadonlyMap<string, string>
  /** Nests the dragged workspace(s) under the hovered card (Orca `assignWorktreeParent`). */
  onNestWorktrees: (parentWorktreeId: string, childWorktreeIds: readonly string[]) => void
  /** A reorder drop of nested rows detaches them from their old parent first. */
  onUnnestWorktrees: (childWorktreeIds: readonly string[]) => void
  /** Whether the board is already open (a preview would be redundant). */
  workspaceBoardOpen: boolean
  /** Opens the board as a drag preview on the first frame (Orca D03a-012). */
  onWorkspaceBoardDragPreviewStart: () => void
  /** The pointer entered the board: the preview becomes a user-open board. */
  onWorkspaceBoardDragPreviewCommit: () => void
}
