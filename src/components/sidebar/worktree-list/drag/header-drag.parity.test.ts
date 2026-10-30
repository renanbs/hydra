// D03a-020 / D03a-092: the three header tiers' reorder gates, the insertion
// geometry each floating line is drawn from, and the tab-order commit a project
// group drop persists.
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  computeSidebarHeaderDropPreview,
  getProjectGroupTabOrderForDrop,
  getSidebarHeaderReorderGates,
  measureSidebarHeaderDragRects,
  moveSidebarHeaderIdForDrop,
  pinSidebarScrollTopForHeaderCommit
} from './header-drag'

function rect(top: number, bottom: number, left = 0, right = 300): DOMRect {
  return {
    left,
    right,
    top,
    bottom,
    width: right - left,
    height: bottom - top,
    x: left,
    y: top,
    toJSON: () => ({})
  } as DOMRect
}

function headerRow(container: HTMLElement, id: string, start: number): HTMLElement {
  const virtualRow = document.createElement('div')
  virtualRow.setAttribute('data-worktree-virtual-row', '')
  virtualRow.setAttribute('data-worktree-virtual-row-start', String(start))
  virtualRow.getBoundingClientRect = () => rect(start, start + 44)
  const header = document.createElement('div')
  header.setAttribute('data-host-header-id', id)
  header.setAttribute('data-project-group-header-section-end', String(start + 120))
  header.setAttribute('data-section-header-id', `project-group:${id}`)
  header.getBoundingClientRect = () => rect(start, start + 28)
  virtualRow.appendChild(header)
  container.appendChild(virtualRow)
  return header
}

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

describe('header tier reorder gates (D03a-020)', () => {
  it('requires at least two host sections', () => {
    expect(
      getSidebarHeaderReorderGates({
        groupBy: 'repo',
        projectOrderBy: 'manual',
        hostSectionCount: 1,
        projectGroupHeaderCount: 2
      }).hostSections
    ).toBe(false)
    expect(
      getSidebarHeaderReorderGates({
        groupBy: 'repo',
        projectOrderBy: 'manual',
        hostSectionCount: 2,
        projectGroupHeaderCount: 2
      }).hostSections
    ).toBe(true)
  })

  it('reorders project groups only in the repo grouping', () => {
    expect(
      getSidebarHeaderReorderGates({
        groupBy: 'repo',
        projectOrderBy: 'manual',
        hostSectionCount: 1,
        projectGroupHeaderCount: 1
      }).projectGroups
    ).toBe(true)
    expect(
      getSidebarHeaderReorderGates({
        groupBy: 'status',
        projectOrderBy: 'manual',
        hostSectionCount: 1,
        projectGroupHeaderCount: 1
      }).projectGroups
    ).toBe(false)
  })

  it('reorders repo headers only in repo grouping with manual project order', () => {
    const base = { hostSectionCount: 1, projectGroupHeaderCount: 0 }
    expect(getSidebarHeaderReorderGates({ ...base, groupBy: 'repo', projectOrderBy: 'manual' }).repoHeaders).toBe(true)
    expect(getSidebarHeaderReorderGates({ ...base, groupBy: 'repo', projectOrderBy: 'recent' }).repoHeaders).toBe(false)
    expect(getSidebarHeaderReorderGates({ ...base, groupBy: 'none', projectOrderBy: 'manual' }).repoHeaders).toBe(false)
  })
})

describe('header insertion geometry (D03a-092)', () => {
  it('turns a pointer position into one slot and one floating line', () => {
    const container = document.createElement('div')
    container.getBoundingClientRect = () => rect(0, 400)
    headerRow(container, 'local', 0)
    headerRow(container, 'ssh:a', 44)
    headerRow(container, 'ssh:b', 88)
    const orderedIds = ['local', 'ssh:a', 'ssh:b']

    const rects = measureSidebarHeaderDragRects({
      container,
      selector: '[data-host-header-id]',
      idAttribute: 'data-host-header-id',
      orderedIds
    })
    expect(rects.map((entry) => entry.headerIndex)).toEqual([0, 1, 2])

    // Above the second header's midpoint: insertion slot before it.
    const preview = computeSidebarHeaderDropPreview({
      pointerY: 50,
      containerTop: 0,
      scrollTop: 0,
      rects,
      headerCount: orderedIds.length,
      contentBottom: 400
    })
    expect(preview?.dropIndex).toBe(1)
    expect(preview?.dropIndicatorY).toBe(40)
  })
})

describe('header order commits (D03a-021)', () => {
  it('moves a header id to the drop slot and keeps host-qualified duplicates together', () => {
    expect(moveSidebarHeaderIdForDrop(['a', 'b', 'c'], 'a', 2)).toEqual(['b', 'a', 'c'])
    expect(moveSidebarHeaderIdForDrop(['a', 'b', 'c'], 'c', 0)).toEqual(['c', 'a', 'b'])
    expect(moveSidebarHeaderIdForDrop(['a', 'b', 'b', 'c'], 'b', 4)).toEqual(['a', 'c', 'b', 'b'])
    expect(moveSidebarHeaderIdForDrop(['a', 'b'], 'ghost', 1)).toEqual(['a', 'b'])
  })

  it('lands a project group between its painted neighbours', () => {
    expect(getProjectGroupTabOrderForDrop({ siblingTabOrders: [10, 20], insertIndex: 1 })).toBe(15)
    expect(getProjectGroupTabOrderForDrop({ siblingTabOrders: [10, 20], insertIndex: 0 })).toBe(9)
    expect(getProjectGroupTabOrderForDrop({ siblingTabOrders: [10, 20], insertIndex: 2 })).toBe(21)
    expect(getProjectGroupTabOrderForDrop({ siblingTabOrders: [], insertIndex: 0 })).toBe(0)
  })
})

describe('anchor correction suppression (D03a-020)', () => {
  it('restores the scrollTop the user had across the commit layout passes', () => {
    const frames: FrameRequestCallback[] = []
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frames.push(callback)
      return frames.length
    })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})

    const container = document.createElement('div')
    container.scrollTop = 10
    const scrollRef = { current: container }
    const cancel = pinSidebarScrollTopForHeaderCommit({ scrollRef, scrollTop: 10, frames: 2 })

    container.scrollTop = 44
    frames[0]?.(0)
    container.scrollTop = 60
    frames[1]?.(0)

    expect(container.scrollTop).toBe(10)
    cancel()
  })
})
