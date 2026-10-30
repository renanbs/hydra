// Ported from Orca — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: orca/src/renderer/src/components/sidebar/worktree-list/drag/use-header-drag.ts
//
// Reordering the sidebar's three header tiers: host section cards, project groups and
// repository headers. Each tier commits its own persisted order — the host order in
// the UI prefs, a project group's own tab order, and the repo manual order
// host-qualified — and each paints the same floating insertion line.
import { useCallback, useMemo, useRef, useState } from 'react'
import type React from 'react'
import type { ExecutionHostId } from '../../../../shared/execution-host'
import type { ProjectOrderBy } from '../../../../shared/ui-chrome-types'
import type { HostSectionRow } from '../../host-section-rows'
import { getProjectGroupHeaderKey } from '../grouping/group-keys'
import type { WorktreeGroupBy } from '../grouping/row-types'
import {
  computeSidebarHeaderDropPreview,
  getProjectGroupTabOrderForDrop,
  getSidebarHeaderReorderGates,
  measureSidebarHeaderDragRects,
  moveSidebarHeaderIdForDrop,
  pinSidebarScrollTopForHeaderCommit,
  PROJECT_GROUP_HEADER_DRAG_TYPE,
  type SidebarHeaderDragRect,
  type SidebarHeaderReorderGates
} from './header-drag'

export const HOST_SECTION_HEADER_DRAG_TYPE = 'application/x-hydra-host-id'

export type SidebarHeaderDropIndicator = {
  tier: 'host' | 'project-group' | 'repo'
  y: number
}

/**
 * The fields the group tier's commit needs from a project group. Structural on purpose:
 * the list's own group projection is smaller than the store's record.
 */
export type SidebarHeaderProjectGroup = {
  id: string
  name: string
  parentGroupId?: string | null
  tabOrder?: number
}

type SidebarHeaderTier = SidebarHeaderDropIndicator['tier']

type HeaderDropTarget = {
  tier: SidebarHeaderTier
  targetId: string
  dropIndex: number
  y: number
}

export type SidebarHeaderHandlers = {
  onDragStart?: (event: React.DragEvent) => void
  onDragOver?: (event: React.DragEvent) => void
  onDragLeave?: (event: React.DragEvent) => void
  onDrop?: (event: React.DragEvent) => void
  onDragEnd?: () => void
}

export type WorktreeSidebarHeaderDrag = {
  gates: SidebarHeaderReorderGates
  indicator: SidebarHeaderDropIndicator | null
  isDropTarget: (tier: SidebarHeaderTier, id: string) => boolean
  hostHandlers: (hostId: ExecutionHostId) => SidebarHeaderHandlers | undefined
  repoHandlers: (repoId: string) => SidebarHeaderHandlers | undefined
  groupHandlers: (groupId: string) => SidebarHeaderHandlers | undefined
}

const PROJECT_GROUP_KEY_PREFIX = 'project-group:'

function getRenderedIds(args: {
  rows: readonly HostSectionRow[]
  tier: SidebarHeaderTier
}): string[] {
  const ids: string[] = []
  const seen = new Set<string>()
  for (const row of args.rows) {
    if (args.tier === 'host') {
      if (row.type === 'host-header' && !seen.has(row.hostId)) {
        seen.add(row.hostId)
        ids.push(row.hostId)
      }
      continue
    }
    if (row.type !== 'header') continue
    const id =
      args.tier === 'repo'
        ? row.repo?.id
        : typeof row.projectGroup?.id === 'string'
          ? row.projectGroup.id
          : undefined
    if (id && !seen.has(id)) {
      seen.add(id)
      ids.push(id)
    }
  }
  return ids
}

export function useWorktreeSidebarHeaderDrag(args: {
  rows: readonly HostSectionRow[]
  groupBy: WorktreeGroupBy
  projectOrderBy: ProjectOrderBy
  scrollRef: React.RefObject<HTMLDivElement | null>
  projectGroups: readonly SidebarHeaderProjectGroup[]
  onReorderHostSections?: (orderedHostIds: ExecutionHostId[]) => void
  onUpdateProjectGroup?: (groupId: string, updates: { tabOrder: number }) => void
  /** Panel handlers for the legacy project drag; the list wraps them, never replaces them. */
  onProjectDragStart?: (event: React.DragEvent, projectId: string) => void
  onProjectDragOver?: (event: React.DragEvent, projectId: string) => void
  onProjectDrop?: (event: React.DragEvent, projectId: string) => void
  onProjectDragEnd?: () => void
  onGroupDragOver?: (event: React.DragEvent, groupId: string) => void
  onGroupDragLeave?: (event: React.DragEvent, groupId: string) => void
  onGroupDrop?: (event: React.DragEvent, groupId: string) => void
}): WorktreeSidebarHeaderDrag {
  const {
    rows,
    groupBy,
    projectOrderBy,
    scrollRef,
    projectGroups,
    onReorderHostSections,
    onUpdateProjectGroup,
    onProjectDragStart,
    onProjectDragOver,
    onProjectDrop,
    onProjectDragEnd,
    onGroupDragOver,
    onGroupDragLeave,
    onGroupDrop
  } = args

  // Host header rows carry `ExecutionHostId`; the shared collector speaks string ids.
  const renderedHostIds = useMemo(
    () => getRenderedIds({ rows, tier: 'host' }) as ExecutionHostId[],
    [rows]
  )
  const renderedRepoIds = useMemo(() => getRenderedIds({ rows, tier: 'repo' }), [rows])
  const renderedGroupIds = useMemo(() => getRenderedIds({ rows, tier: 'project-group' }), [rows])
  const projectGroupById = useMemo(() => {
    const byId = new Map<string, SidebarHeaderProjectGroup>()
    for (const group of projectGroups) {
      byId.set(group.id, group)
    }
    return byId
  }, [projectGroups])

  // Why the extra writer terms: a tier without a commit would paint a drag that lands
  // nowhere, so the gate says "reorder is possible with what this list was given".
  const gates = useMemo(() => {
    const base = getSidebarHeaderReorderGates({
      groupBy,
      projectOrderBy,
      hostSectionCount: renderedHostIds.length,
      projectGroupHeaderCount: renderedGroupIds.length
    })
    return {
      hostSections: base.hostSections && Boolean(onReorderHostSections),
      projectGroups: base.projectGroups && Boolean(onUpdateProjectGroup),
      repoHeaders:
        base.repoHeaders && Boolean(onProjectDragStart) && Boolean(onProjectDrop)
    }
  }, [
    groupBy,
    onProjectDragStart,
    onProjectDrop,
    onReorderHostSections,
    onUpdateProjectGroup,
    projectOrderBy,
    renderedGroupIds.length,
    renderedHostIds.length
  ])

  const [indicator, setIndicator] = useState<SidebarHeaderDropIndicator | null>(null)
  const targetRef = useRef<HeaderDropTarget | null>(null)
  const draggedHostIdRef = useRef<ExecutionHostId | null>(null)
  const draggedRepoIdRef = useRef<string | null>(null)
  const draggedGroupIdRef = useRef<string | null>(null)

  const measure = useCallback(
    (tier: SidebarHeaderTier): SidebarHeaderDragRect[] => {
      const container = scrollRef.current
      if (!container) {
        return []
      }
      if (tier === 'host') {
        return measureSidebarHeaderDragRects({
          container,
          selector: '[data-host-header-id]',
          idAttribute: 'data-host-header-id',
          orderedIds: renderedHostIds
        })
      }
      if (tier === 'repo') {
        return measureSidebarHeaderDragRects({
          container,
          selector: '[data-repo-header-id]',
          idAttribute: 'data-repo-header-id',
          orderedIds: renderedRepoIds,
          sectionEndAttribute: 'data-repo-header-section-end'
        })
      }
      // Group headers paint their row key (`project-group:<id>`), not the group id.
      return measureSidebarHeaderDragRects({
        container,
        selector: '[data-project-group-header-section-end]',
        idAttribute: 'data-section-header-id',
        orderedIds: renderedGroupIds.map(getProjectGroupHeaderKey),
        sectionEndAttribute: 'data-project-group-header-section-end'
      }).map((rect) => ({
        ...rect,
        id: rect.id.startsWith(PROJECT_GROUP_KEY_PREFIX)
          ? rect.id.slice(PROJECT_GROUP_KEY_PREFIX.length)
          : rect.id
      }))
    },
    [renderedGroupIds, renderedHostIds, renderedRepoIds, scrollRef]
  )

  const computeTarget = useCallback(
    (tier: SidebarHeaderTier, pointerY: number): HeaderDropTarget | null => {
      const container = scrollRef.current
      if (!container) {
        return null
      }
      const orderedIds =
        tier === 'host' ? renderedHostIds : tier === 'repo' ? renderedRepoIds : renderedGroupIds
      const preview = computeSidebarHeaderDropPreview({
        pointerY,
        containerTop: container.getBoundingClientRect().top,
        scrollTop: container.scrollTop,
        rects: measure(tier),
        headerCount: orderedIds.length,
        contentBottom: container.scrollHeight
      })
      if (!preview) {
        return null
      }
      const targetId = orderedIds[Math.min(preview.dropIndex, orderedIds.length - 1)]
      if (!targetId) {
        return null
      }
      return { tier, targetId, dropIndex: preview.dropIndex, y: preview.dropIndicatorY }
    },
    [measure, renderedGroupIds, renderedHostIds, renderedRepoIds, scrollRef]
  )

  const setTarget = useCallback((next: HeaderDropTarget | null): void => {
    const previous = targetRef.current
    targetRef.current = next
    if (
      previous?.tier === next?.tier &&
      previous?.targetId === next?.targetId &&
      previous?.dropIndex === next?.dropIndex &&
      previous?.y === next?.y
    ) {
      return
    }
    setIndicator(next ? { tier: next.tier, y: next.y } : null)
  }, [])

  const clearDrag = useCallback((): void => {
    targetRef.current = null
    draggedHostIdRef.current = null
    draggedRepoIdRef.current = null
    draggedGroupIdRef.current = null
    setIndicator(null)
  }, [])

  const pinScrollForCommit = useCallback((): void => {
    const container = scrollRef.current
    if (container) {
      pinSidebarScrollTopForHeaderCommit({ scrollRef, scrollTop: container.scrollTop })
    }
  }, [scrollRef])

  const hostHandlers = useCallback(
    (hostId: ExecutionHostId): SidebarHeaderHandlers | undefined => {
      if (!gates.hostSections || !onReorderHostSections) {
        return undefined
      }
      return {
        onDragStart: (event) => {
          draggedHostIdRef.current = hostId
          event.dataTransfer.effectAllowed = 'move'
          event.dataTransfer.setData(HOST_SECTION_HEADER_DRAG_TYPE, hostId)
        },
        onDragOver: (event) => {
          const dragged = draggedHostIdRef.current
          if (!dragged || dragged === hostId) {
            return
          }
          event.preventDefault()
          event.dataTransfer.dropEffect = 'move'
          setTarget(computeTarget('host', event.clientY))
        },
        onDrop: (event) => {
          const dragged = draggedHostIdRef.current
          if (!dragged) {
            return
          }
          event.preventDefault()
          const target = computeTarget('host', event.clientY)
          clearDrag()
          if (!target) {
            return
          }
          pinScrollForCommit()
          onReorderHostSections(
            moveSidebarHeaderIdForDrop(renderedHostIds, dragged, target.dropIndex)
          )
        },
        onDragEnd: clearDrag
      }
    },
    [clearDrag, computeTarget, gates.hostSections, onReorderHostSections, pinScrollForCommit, renderedHostIds, setTarget]
  )

  const repoHandlers = useCallback(
    (repoId: string): SidebarHeaderHandlers | undefined => {
      if (!gates.repoHeaders) {
        return undefined
      }
      return {
        onDragStart: (event) => {
          draggedRepoIdRef.current = repoId
          onProjectDragStart?.(event, repoId)
        },
        onDragOver: (event) => {
          onProjectDragOver?.(event, repoId)
          const dragged = draggedRepoIdRef.current
          if (!dragged || dragged === repoId) {
            setTarget(null)
            return
          }
          setTarget(computeTarget('repo', event.clientY))
        },
        onDrop: (event) => {
          const dragged = draggedRepoIdRef.current
          if (!dragged) {
            return
          }
          pinScrollForCommit()
          // The panel owns the repo order (its writer also repaints App's list); this
          // list only adds the gate and the floating line.
          onProjectDrop?.(event, repoId)
          clearDrag()
        },
        onDragEnd: () => {
          onProjectDragEnd?.()
          clearDrag()
        }
      }
    },
    [
      clearDrag,
      computeTarget,
      gates.repoHeaders,
      onProjectDragEnd,
      onProjectDragOver,
      onProjectDragStart,
      onProjectDrop,
      pinScrollForCommit,
      setTarget
    ]
  )

  const commitProjectGroupOrder = useCallback(
    (draggedId: string, dropIndex: number): void => {
      if (!onUpdateProjectGroup) {
        return
      }
      const draggedGroup = projectGroupById.get(draggedId)
      const parentGroupId = draggedGroup?.parentGroupId ?? null
      const siblingIds = renderedGroupIds.filter(
        (id) =>
          id !== draggedId &&
          (projectGroupById.get(id)?.parentGroupId ?? null) === parentGroupId
      )
      const targetId = renderedGroupIds[dropIndex]
      const targetIndex = targetId ? siblingIds.indexOf(targetId) : siblingIds.length
      onUpdateProjectGroup(draggedId, {
        tabOrder: getProjectGroupTabOrderForDrop({
          siblingTabOrders: siblingIds.map((id) => projectGroupById.get(id)?.tabOrder ?? 0),
          insertIndex: targetIndex < 0 ? siblingIds.length : targetIndex
        })
      })
    },
    [onUpdateProjectGroup, projectGroupById, renderedGroupIds]
  )

  const groupHandlers = useCallback(
    (groupId: string): SidebarHeaderHandlers | undefined => {
      const panelHandlers: SidebarHeaderHandlers = {
        onDragOver: onGroupDragOver ? (event) => onGroupDragOver(event, groupId) : undefined,
        onDragLeave: onGroupDragLeave ? (event) => onGroupDragLeave(event, groupId) : undefined,
        onDrop: onGroupDrop ? (event) => onGroupDrop(event, groupId) : undefined
      }
      if (!gates.projectGroups) {
        return panelHandlers
      }
      return {
        ...panelHandlers,
        onDragStart: (event) => {
          draggedGroupIdRef.current = groupId
          event.dataTransfer.effectAllowed = 'move'
          event.dataTransfer.setData(PROJECT_GROUP_HEADER_DRAG_TYPE, groupId)
        },
        onDragOver: (event) => {
          const dragged = draggedGroupIdRef.current
          if (!dragged) {
            panelHandlers.onDragOver?.(event)
            return
          }
          if (dragged === groupId) {
            setTarget(null)
            return
          }
          event.preventDefault()
          event.stopPropagation()
          event.dataTransfer.dropEffect = 'move'
          setTarget(computeTarget('project-group', event.clientY))
        },
        onDrop: (event) => {
          const dragged = draggedGroupIdRef.current
          if (!dragged) {
            panelHandlers.onDrop?.(event)
            return
          }
          event.preventDefault()
          event.stopPropagation()
          const target = computeTarget('project-group', event.clientY)
          pinScrollForCommit()
          if (target) {
            commitProjectGroupOrder(dragged, target.dropIndex)
          }
          clearDrag()
        },
        onDragEnd: clearDrag
      }
    },
    [
      clearDrag,
      commitProjectGroupOrder,
      computeTarget,
      gates.projectGroups,
      onGroupDragLeave,
      onGroupDragOver,
      onGroupDrop,
      pinScrollForCommit,
      setTarget
    ]
  )

  const isDropTarget = useCallback(
    (tier: SidebarHeaderTier, id: string) =>
      targetRef.current?.tier === tier && targetRef.current.targetId === id,
    []
  )

  return { gates, indicator, isDropTarget, hostHandlers, repoHandlers, groupHandlers }
}
