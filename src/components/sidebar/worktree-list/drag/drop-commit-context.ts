// Ported from Orca — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: orca/src/renderer/src/components/sidebar/worktree-list/drag/drop-commit-context.ts
import type { WorktreeDragGroup } from '../../worktree-manual-order'
import type { WorktreeDragUnitGroup } from '../../worktree-drag-units'
import type { WorktreeSidebarDropPreview } from '../../worktree-sidebar-drop-preview'

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
  refreshWorktreeDragSession: () => boolean
  clearWorktreeDrag: () => void
  onReorderWorktrees: (args: WorktreeGroupReorderArgs) => void
  /**
   * Writes a persisted workspace status for the dragged workspaces. The workspace board's
   * lane drop is its only caller: the list's own drops reorder, they do not recolour the
   * status column, and the panel bridges the ids onto the app's single status writer.
   */
  onAssignWorktreesStatus: (worktreeIds: readonly string[], status: string) => void
  /**
   * Pins the dragged workspaces without touching their status. The board's pin strip drop
   * (D08-028) is its only caller, and the panel bridges the ids onto the app's single pin
   * writer — the same one the row menu uses.
   */
  onPinWorktrees: (worktreeIds: readonly string[]) => void
}
