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
}
