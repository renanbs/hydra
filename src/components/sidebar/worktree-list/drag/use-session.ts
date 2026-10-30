// Ported from Orca — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: orca/src/renderer/src/components/sidebar/worktree-list/drag/use-session.ts
import { useCallback, useMemo, useRef } from 'react'
import type { HostSectionRow } from '../../host-section-rows'
import { expandDraggedWorktreeIdsForVisibleLineage } from '../../worktree-manual-order'
import { getWorktreeDragUnitGroups, type WorktreeDragUnitGroup } from '../../worktree-drag-units'
import {
  getWorktreeSidebarDragRectsForGroup,
  refreshWorktreeSidebarDragSession,
  type WorktreeSidebarDragRect,
  type WorktreeSidebarDragSession
} from '../../worktree-sidebar-drag-autoscroll'
import {
  shouldReevaluateWorktreeSidebarDropAnchor,
  type WorktreeSidebarDragGrab,
  type WorktreeSidebarDropAnchor
} from '../../worktree-sidebar-drag-geometry'
import {
  computeWorktreeSidebarDropPreview,
  type WorktreeSidebarDropPreview
} from '../../worktree-sidebar-drop-preview'
import type { WorktreeDragGroup } from '../../worktree-manual-order'
import { PINNED_GROUP_KEY } from '../grouping/group-keys'
import { getWorkspaceStatusGroupKey } from '../../workspace-status'
import { getNaturalWorktreeIds } from '../../natural-worktree-ids'
import { getWorktreeDragGroups, getWorktreeDragIndexes } from './groups'

/** The `space-y-1` gap between painted rows, replayed as the layout gap while dragging. */
const WORKTREE_LIST_ROW_GAP_PX = 4

/** A status lane the pointer hovers: where the card would land inside that lane. */
export type WorktreeStatusDropRequest = {
  pointerY: number
  status: string
  draggedIds: readonly string[]
}

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
  computeWorktreeStatusDrop: (
    request: WorktreeStatusDropRequest
  ) => WorktreeSidebarDropPreview | null
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
  // Why: cross-group hovers hit-test a group the session never captured, so hold
  // that group's drop decision separately or a card expanding in the target group
  // moves the insertion line under a still pointer.
  const statusDropAnchorsRef = useRef<Map<string, WorktreeSidebarDropAnchor>>(new Map())

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
  const computeWorktreeDropForGroup = useCallback(
    (dropArgs: {
      pointerY: number
      groupKey: string
      rects: readonly WorktreeSidebarDragRect[]
      draggedIds: readonly string[]
      draggingWorktreeId?: string | null
      grab?: WorktreeSidebarDragGrab | null
      anchor?: WorktreeSidebarDropAnchor | null
    }): WorktreeSidebarDropPreview | null => {
      const container = scrollRef.current
      if (!container) {
        return null
      }
      const group = worktreeDragUnitGroups.find(
        (candidate) => candidate.key === dropArgs.groupKey
      )
      if (!group) {
        return null
      }
      return computeWorktreeSidebarDropPreview({
        pointerY: dropArgs.pointerY,
        containerTop: container.getBoundingClientRect().top,
        scrollTop: container.scrollTop,
        rects: dropArgs.rects,
        groupIds: group.worktreeIds,
        draggedIds: dropArgs.draggedIds,
        draggingWorktreeId: dropArgs.draggingWorktreeId,
        fallbackGap: WORKTREE_LIST_ROW_GAP_PX,
        grab: dropArgs.grab,
        anchor: dropArgs.anchor
      })
    },
    [scrollRef, worktreeDragUnitGroups]
  )
  const computeWorktreeDrop = useCallback(
    (pointerY: number): WorktreeSidebarDropPreview | null => {
      const session = worktreeDragSessionRef.current
      const container = scrollRef.current
      if (!session || !container) {
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
      const preview = computeWorktreeDropForGroup({
        pointerY,
        groupKey: session.sourceGroupKey,
        rects: session.rects,
        draggedIds: session.reorderUnitDraggedIds,
        draggingWorktreeId: session.draggingWorktreeId,
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
    [computeWorktreeDropForGroup, scrollRef]
  )
  // Why the held anchor: a cross-status hover targets a group the session never
  // captured, so its slot needs the same anti-jitter memory as the source group's.
  const computeWorktreeStatusDrop = useCallback(
    (request: WorktreeStatusDropRequest): WorktreeSidebarDropPreview | null => {
      const container = scrollRef.current
      if (!container) {
        return null
      }
      const groupKey = getWorkspaceStatusGroupKey(request.status)
      const session = worktreeDragSessionRef.current
      const scrollTop = container.scrollTop
      const heldAnchor = statusDropAnchorsRef.current.get(groupKey) ?? null
      const anchor = shouldReevaluateWorktreeSidebarDropAnchor({
        anchor: heldAnchor,
        pointerY: request.pointerY,
        scrollTop
      })
        ? null
        : heldAnchor
      const preview = computeWorktreeDropForGroup({
        pointerY: request.pointerY,
        groupKey,
        rects: getWorktreeSidebarDragRectsForGroup(container, groupKey),
        draggedIds: request.draggedIds,
        draggingWorktreeId: session?.draggingWorktreeId ?? null,
        grab: session?.grab ?? null,
        anchor
      })
      if (preview) {
        statusDropAnchorsRef.current.set(groupKey, {
          beforeWorktreeId: preview.dropAnchorId,
          pointerY: request.pointerY,
          scrollTop
        })
      } else {
        statusDropAnchorsRef.current.delete(groupKey)
      }
      return preview
    },
    [computeWorktreeDropForGroup, scrollRef]
  )

  // Why: consumers pass session-derived callbacks into memoised rows; a fresh object
  // every render would defeat those bail-outs.
  return useMemo(
    () => ({
      worktreeDragSessionRef,
      statusDropAnchorsRef,
      worktreeDragGroups,
      worktreeDragUnitGroups,
      groupKeyByRowKey,
      groupIndexByRowKey,
      getReorderDraggedIds,
      getReorderUnitDraggedIds,
      refreshWorktreeDragSession,
      computeWorktreeDrop,
      computeWorktreeStatusDrop
    }),
    [
      computeWorktreeDrop,
      computeWorktreeStatusDrop,
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
