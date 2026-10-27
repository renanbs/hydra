// Ported from Orca — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: orca/src/renderer/src/components/sidebar/worktree-list/drag/use-session.ts
import { useCallback, useMemo, useRef } from 'react'
import type { HostSectionRow } from '../../host-section-rows'
import { expandDraggedWorktreeIdsForVisibleLineage } from '../../worktree-manual-order'
import { getWorktreeDragUnitGroups, type WorktreeDragUnitGroup } from '../../worktree-drag-units'
import {
  getWorktreeSidebarDragRectsForGroup,
  refreshWorktreeSidebarDragSession,
  type WorktreeSidebarDragSession
} from '../../worktree-sidebar-drag-autoscroll'
import {
  shouldReevaluateWorktreeSidebarDropAnchor,
  type WorktreeSidebarDropAnchor
} from '../../worktree-sidebar-drag-geometry'
import {
  computeWorktreeSidebarDropPreview,
  type WorktreeSidebarDropPreview
} from '../../worktree-sidebar-drop-preview'
import type { WorktreeDragGroup } from '../../worktree-manual-order'
import { PINNED_GROUP_KEY } from '../grouping/group-keys'
import { getNaturalWorktreeIds } from '../../natural-worktree-ids'
import { getWorktreeDragGroups, getWorktreeDragIndexes } from './groups'

/** The `space-y-1` gap between painted rows, replayed as the layout gap while dragging. */
const WORKTREE_LIST_ROW_GAP_PX = 4

/** Geometry and identity a drag needs: groups, drag units, row indexes and drop math. */
export type WorktreeDragSession = {
  worktreeDragSessionRef: React.RefObject<WorktreeSidebarDragSession | null>
  worktreeDragGroups: WorktreeDragGroup[]
  worktreeDragUnitGroups: WorktreeDragUnitGroup[]
  groupKeyByRowKey: Map<string, string>
  groupIndexByRowKey: Map<string, number>
  getReorderDraggedIds: (draggedIds: readonly string[]) => string[]
  getReorderUnitDraggedIds: (
    sourceGroupKey: string,
    reorderDraggedIds: readonly string[]
  ) => readonly string[]
  refreshWorktreeDragSession: () => boolean
  computeWorktreeDrop: (pointerY: number) => WorktreeSidebarDropPreview | null
}

/**
 * Owns the geometry side of a sidebar row drag: which groups exist, which ids travel
 * together, and where the insertion line lands for a given pointer position.
 */
export function useWorktreeDragSession(args: {
  rows: readonly HostSectionRow[]
  scrollRef: React.RefObject<HTMLDivElement | null>
}): WorktreeDragSession {
  const { rows, scrollRef } = args
  const worktreeDragSessionRef = useRef<WorktreeSidebarDragSession | null>(null)

  const worktreeDragGroups = useMemo(() => getWorktreeDragGroups(rows), [rows])
  const worktreeDragUnitGroups = useMemo(() => getWorktreeDragUnitGroups(rows), [rows])
  const naturalDragWorktreeIds = useMemo(() => getNaturalWorktreeIds(rows), [rows])
  const worktreeLineageDragRows = useMemo(
    () =>
      rows
        .filter((row) => row.type === 'item')
        .filter(
          (row) =>
            row.sectionKey !== PINNED_GROUP_KEY || !naturalDragWorktreeIds.has(row.worktree.id)
        )
        .map((row) => ({ worktreeId: row.worktree.id, depth: row.depth })),
    [naturalDragWorktreeIds, rows]
  )
  const getReorderDraggedIds = useCallback(
    (draggedIds: readonly string[]) =>
      expandDraggedWorktreeIdsForVisibleLineage(worktreeLineageDragRows, draggedIds),
    [worktreeLineageDragRows]
  )
  const getReorderUnitDraggedIds = useCallback(
    (sourceGroupKey: string, reorderDraggedIds: readonly string[]) => {
      const group = worktreeDragUnitGroups.find((candidate) => candidate.key === sourceGroupKey)
      if (!group) {
        return reorderDraggedIds
      }
      const unitIds = new Set(group.worktreeIds)
      const filtered = reorderDraggedIds.filter((worktreeId) => unitIds.has(worktreeId))
      return filtered.length > 0 ? filtered : reorderDraggedIds
    },
    [worktreeDragUnitGroups]
  )
  const { groupKeyByRowKey, groupIndexByRowKey } = useMemo(
    () => getWorktreeDragIndexes(rows),
    [rows]
  )
  const refreshWorktreeDragSession = useCallback((): boolean => {
    const session = worktreeDragSessionRef.current
    const container = scrollRef.current
    if (!session || !container) {
      return false
    }

    const refreshedSession = refreshWorktreeSidebarDragSession({
      session,
      groups: worktreeDragGroups,
      unitGroups: worktreeDragUnitGroups,
      rects: getWorktreeSidebarDragRectsForGroup(container, session.sourceGroupKey)
    })
    worktreeDragSessionRef.current = refreshedSession
    return refreshedSession !== null
  }, [scrollRef, worktreeDragGroups, worktreeDragUnitGroups])
  const computeWorktreeDrop = useCallback(
    (pointerY: number): WorktreeSidebarDropPreview | null => {
      const session = worktreeDragSessionRef.current
      const container = scrollRef.current
      if (!session || !container) {
        return null
      }
      const group = worktreeDragUnitGroups.find(
        (candidate) => candidate.key === session.sourceGroupKey
      )
      if (!group) {
        return null
      }
      const scrollTop = container.scrollTop
      // Why: only real pointer or scroll movement should re-decide the slot; a
      // card growing under a still pointer must not move it.
      const anchor = shouldReevaluateWorktreeSidebarDropAnchor({
        anchor: session.anchor,
        pointerY,
        scrollTop
      })
        ? null
        : session.anchor
      const preview = computeWorktreeSidebarDropPreview({
        pointerY,
        containerTop: container.getBoundingClientRect().top,
        scrollTop,
        rects: session.rects,
        groupIds: group.worktreeIds,
        draggedIds: session.reorderUnitDraggedIds,
        draggingWorktreeId: session.draggingWorktreeId,
        fallbackGap: WORKTREE_LIST_ROW_GAP_PX,
        grab: session.grab,
        anchor
      })
      worktreeDragSessionRef.current = {
        ...session,
        anchor: preview
          ? ({ beforeWorktreeId: preview.dropAnchorId, pointerY, scrollTop } satisfies WorktreeSidebarDropAnchor)
          : null
      }
      return preview
    },
    [scrollRef, worktreeDragUnitGroups]
  )

  // Why: consumers pass session-derived callbacks into memoised rows; a fresh object
  // every render would defeat those bail-outs.
  return useMemo(
    () => ({
      worktreeDragSessionRef,
      worktreeDragGroups,
      worktreeDragUnitGroups,
      groupKeyByRowKey,
      groupIndexByRowKey,
      getReorderDraggedIds,
      getReorderUnitDraggedIds,
      refreshWorktreeDragSession,
      computeWorktreeDrop
    }),
    [
      computeWorktreeDrop,
      getReorderDraggedIds,
      getReorderUnitDraggedIds,
      groupIndexByRowKey,
      groupKeyByRowKey,
      refreshWorktreeDragSession,
      worktreeDragGroups,
      worktreeDragUnitGroups
    ]
  )
}
