// Ported from Orca — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: orca/src/renderer/src/components/sidebar/project-header-drop.ts,
// `project-group-header-drop.ts` and `host-header-drag.ts` (geometry + commits).
//
// The sidebar reorders three header tiers: the host section cards, the project
// groups and the repository headers. They share one insertion geometry — a line
// between two headers, computed in the list's scroll-content coordinates — and each
// tier commits through its own persisted order.
import type React from 'react'
import type { ProjectOrderBy } from '../../../../shared/ui-chrome-types'
import type { WorktreeGroupBy } from '../grouping/row-types'
import {
  computeWorktreeSidebarHeaderDropPreview,
  type WorktreeSidebarHeaderDragRect
} from '../../worktree-sidebar-header-drop-preview'

export const PROJECT_GROUP_HEADER_DRAG_TYPE = 'application/x-hydra-project-group-header'

/** Which header tiers can reorder right now, and why the others cannot. */
export type SidebarHeaderReorderGates = {
  /** Two headers are needed before an order exists at all. */
  hostSections: boolean
  /** Project groups reorder inside the repo grouping, on each group's own host. */
  projectGroups: boolean
  /** Repo headers only reorder in manual project order, never in Recent. */
  repoHeaders: boolean
}

export function getSidebarHeaderReorderGates(args: {
  groupBy: WorktreeGroupBy
  projectOrderBy: ProjectOrderBy
  hostSectionCount: number
  projectGroupHeaderCount: number
}): SidebarHeaderReorderGates {
  const repoGrouping = args.groupBy === 'repo'
  return {
    hostSections: args.hostSectionCount > 1,
    projectGroups: repoGrouping && args.projectGroupHeaderCount > 0,
    repoHeaders: repoGrouping && args.projectOrderBy === 'manual'
  }
}

/** One measured header slot: its id, its rank in the painted order, and its band. */
export type SidebarHeaderDragRect = WorktreeSidebarHeaderDragRect & { id: string }

function getVirtualRowStart(element: HTMLElement): number | null {
  const virtualRow = element.closest<HTMLElement>('[data-worktree-virtual-row]')
  const rawStart = virtualRow?.getAttribute('data-worktree-virtual-row-start')
  if (rawStart === null || rawStart === undefined) {
    return null
  }
  const start = Number(rawStart)
  return Number.isFinite(start) ? start : null
}

function getNumberAttribute(element: HTMLElement, attribute: string): number | undefined {
  const rawValue = element.getAttribute(attribute)
  if (rawValue === null) {
    return undefined
  }
  const value = Number(rawValue)
  return Number.isFinite(value) ? value : undefined
}

/**
 * Measures the mounted headers of one tier in scroll-content coordinates.
 *
 * Why the row model supplies `orderedIds`: virtualization unmounts off-screen
 * headers, so a loop index over mounted elements would map a drop to the wrong
 * persisted rank. The rank always comes from the painted order.
 */
export function measureSidebarHeaderDragRects(args: {
  container: HTMLElement
  selector: string
  idAttribute: string
  orderedIds: readonly string[]
  sectionEndAttribute?: string
}): SidebarHeaderDragRect[] {
  const containerRect = args.container.getBoundingClientRect()
  const rects: SidebarHeaderDragRect[] = []
  for (const element of args.container.querySelectorAll<HTMLElement>(args.selector)) {
    const id = element.getAttribute(args.idAttribute)
    if (!id) {
      continue
    }
    const headerIndex = args.orderedIds.indexOf(id)
    if (headerIndex < 0) {
      continue
    }
    const rect = element.getBoundingClientRect()
    const virtualRowStart = getVirtualRowStart(element)
    const top =
      virtualRowStart !== null
        ? virtualRowStart +
          rect.top -
          (element.closest<HTMLElement>('[data-worktree-virtual-row]')?.getBoundingClientRect().top ??
            rect.top)
        : rect.top - containerRect.top + args.container.scrollTop
    rects.push({
      id,
      headerIndex,
      top,
      bottom: top + rect.height,
      sectionBottom: args.sectionEndAttribute
        ? getNumberAttribute(element, args.sectionEndAttribute)
        : undefined
    })
  }
  rects.sort((left, right) => left.top - right.top)
  return rects
}

/** The floating insertion line for a pointer hovering one tier's headers. */
export function computeSidebarHeaderDropPreview(args: {
  pointerY: number
  containerTop: number
  scrollTop: number
  rects: readonly SidebarHeaderDragRect[]
  headerCount: number
  contentBottom?: number
}): { dropIndex: number; dropIndicatorY: number } | null {
  return computeWorktreeSidebarHeaderDropPreview({
    pointerY: args.pointerY,
    containerTop: args.containerTop,
    scrollTop: args.scrollTop,
    rects: args.rects,
    headerCount: args.headerCount,
    getId: (rect) => rect.id,
    contentBottom: args.contentBottom
  })
}

/**
 * Moves a header id to an insertion index. Every occurrence of the id travels
 * together: a repo mounted on two hosts paints one merged header, so splitting its
 * occurrences would persist a cross-host split project.
 */
export function moveSidebarHeaderIdForDrop<T extends string>(
  orderedIds: readonly T[],
  draggedId: T,
  dropIndex: number
): T[] {
  const blockSize = orderedIds.filter((id) => id === draggedId).length
  if (blockSize === 0) {
    return [...orderedIds]
  }
  const removedBeforeInsert = orderedIds
    .slice(0, Math.max(0, Math.min(dropIndex, orderedIds.length)))
    .filter((id) => id === draggedId).length
  const remaining = orderedIds.filter((id) => id !== draggedId)
  const insertAt = Math.max(0, Math.min(remaining.length, dropIndex - removedBeforeInsert))
  const next = remaining.slice()
  next.splice(insertAt, 0, ...(Array<T>(blockSize).fill(draggedId)))
  return next
}

/**
 * A tab order that lands between two neighbours. Legacy duplicate ranks leave no
 * numeric slot, so the drop takes the neighbour's rank plus one — deterministic and
 * still ordered on the next paint.
 */
export function getProjectGroupTabOrderForDrop(args: {
  siblingTabOrders: readonly number[]
  insertIndex: number
}): number {
  const { siblingTabOrders } = args
  if (siblingTabOrders.length === 0) {
    return 0
  }
  const index = Math.max(0, Math.min(siblingTabOrders.length, args.insertIndex))
  const before = siblingTabOrders[index - 1]
  const after = siblingTabOrders[index]
  if (before === undefined && after === undefined) {
    return 0
  }
  if (before === undefined) {
    return (after as number) - 1
  }
  if (after === undefined) {
    return before + 1
  }
  if (after > before) {
    return before + (after - before) / 2
  }
  return before + 1
}

/**
 * Reordering headers keeps the scroll position the user already has. The virtualizer
 * may correct scrollTop as the moved rows remeasure; pinning the value across the
 * commit's layout passes is the anchor-correction suppression (Orca
 * `suppressScrollCorrectionForHeaderCommit`).
 */
export function pinSidebarScrollTopForHeaderCommit(args: {
  scrollRef: React.RefObject<HTMLDivElement | null>
  scrollTop: number
  frames?: number
}): () => void {
  let remaining = args.frames ?? 2
  let frameId: number | null = null
  let cancelled = false
  const restore = (): void => {
    if (cancelled) {
      return
    }
    const container = args.scrollRef.current
    if (container && container.scrollTop !== args.scrollTop) {
      container.scrollTop = args.scrollTop
    }
    remaining -= 1
    frameId = remaining > 0 ? window.requestAnimationFrame(restore) : null
  }
  frameId = window.requestAnimationFrame(restore)
  return () => {
    cancelled = true
    if (frameId !== null) {
      window.cancelAnimationFrame(frameId)
    }
  }
}
