// The sidebar-list drop onto the workspace board: which lane the pointer resolves, the
// registry the board publishes while it is open, and the visual the destination paints.
//
// jsdom has no layout, so every rect is synthetic — the geometry under test is the real
// one, only the rects and the board's measured lane layout are fed by hand.
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, renderHook } from '@testing-library/react'
import type { WorkspaceStatus } from '../../../shared/worktree/types'
import { registerWorkspaceBoardVirtualLaneLayout } from './workspace-board-virtual-lane-layout'
import {
  clearWorkspaceBoardSidebarDropTargetVisual,
  getWorkspaceBoardSidebarDropTarget,
  hasWorkspaceBoardSidebarDropBoard,
  registerWorkspaceBoardSidebarDropBoard,
  updateWorkspaceBoardSidebarDropTargetVisual,
  useWorkspaceBoardSidebarDropTargetStatus
} from './workspace-board-sidebar-drop'

const LANE_STATUS_IDS: WorkspaceStatus[] = ['todo', 'in-progress', 'in-review', 'completed']
const COLUMN_WIDTH = 200
const LANE_GAP = 12
const BOARD_BOTTOM = 600
const BOARD_RIGHT = 848

const LANE_BOUNDS: Record<string, { left: number; right: number }> = {
  todo: { left: 0, right: 200 },
  'in-progress': { left: 212, right: 412 },
  'in-review': { left: 424, right: 624 },
  completed: { left: 636, right: 836 }
}

function fakeRect(rect: {
  left: number
  top: number
  right: number
  bottom: number
}): DOMRect {
  return {
    ...rect,
    width: rect.right - rect.left,
    height: rect.bottom - rect.top,
    x: rect.left,
    y: rect.top,
    toJSON: () => ({})
  } as DOMRect
}

function stubRect(
  element: HTMLElement,
  rect: { left: number; top: number; right: number; bottom: number }
): void {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => fakeRect(rect)
  })
}

function laneMeasurements(): { index: number; start: number; end: number }[] {
  return LANE_STATUS_IDS.map((_status, index) => {
    const start = index * (COLUMN_WIDTH + LANE_GAP)
    return { index, start, end: start + COLUMN_WIDTH }
  })
}

/**
 * A board grid with a stubbed box and the lanes it painted. `paintedStatusIds` is what the
 * virtualizer left mounted — the measured layout can name more lanes than those.
 */
function buildBoard(paintedStatusIds: readonly WorkspaceStatus[]): HTMLElement {
  const board = document.createElement('div')
  board.dataset.workspaceBoardLaneGrid = ''
  stubRect(board, { left: 0, top: 0, right: BOARD_RIGHT, bottom: BOARD_BOTTOM })
  for (const status of paintedStatusIds) {
    const element = document.createElement('section')
    element.dataset.workspaceStatus = status
    const bounds = LANE_BOUNDS[status]!
    stubRect(element, { ...bounds, top: 0, bottom: BOARD_BOTTOM })
    board.appendChild(element)
  }
  document.body.appendChild(board)
  return board
}

function registerMeasuredLanes(board: HTMLElement): void {
  registerWorkspaceBoardVirtualLaneLayout({
    gridElement: board,
    getLaneStatusIds: () => LANE_STATUS_IDS,
    getMeasurements: laneMeasurements
  })
}

function dropIndicator(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-workspace-board-card-drop-indicator]')
}

// Why tracked: the registry is module state, so a test that left a board behind would
// decide the next one's resolution.
let unregisterDropBoard: (() => void) | null = null

function registerBoard(board: HTMLElement): () => void {
  unregisterDropBoard = registerWorkspaceBoardSidebarDropBoard({ boardElement: board })
  return unregisterDropBoard
}

afterEach(() => {
  cleanup()
  clearWorkspaceBoardSidebarDropTargetVisual()
  unregisterDropBoard?.()
  unregisterDropBoard = null
  document.body.innerHTML = ''
})

describe('workspace board sidebar drop registry', () => {
  it('reports no board, and resolves no lane, while nothing is registered', () => {
    const board = buildBoard(LANE_STATUS_IDS)

    expect(hasWorkspaceBoardSidebarDropBoard()).toBe(false)
    expect(getWorkspaceBoardSidebarDropTarget(300, 120)).toBeNull()

    // A registered board is what makes the list's own drag reach it at all.
    const unregister = registerBoard(board)
    expect(hasWorkspaceBoardSidebarDropBoard()).toBe(true)
    expect(getWorkspaceBoardSidebarDropTarget(300, 120)?.status).toBe('in-progress')

    unregister()
    expect(hasWorkspaceBoardSidebarDropBoard()).toBe(false)
    expect(getWorkspaceBoardSidebarDropTarget(300, 120)).toBeNull()
  })

  it('keeps the newest registration when a previous board unregisters late', () => {
    const first = buildBoard(LANE_STATUS_IDS)
    const second = buildBoard(LANE_STATUS_IDS)
    const unregisterFirst = registerBoard(first)
    registerBoard(second)

    unregisterFirst()

    expect(hasWorkspaceBoardSidebarDropBoard()).toBe(true)
    expect(getWorkspaceBoardSidebarDropTarget(300, 120)?.status).toBe('in-progress')
  })

  it('takes its target visual down when the board unregisters mid-drag', () => {
    const board = buildBoard(LANE_STATUS_IDS)
    const unregister = registerBoard(board)
    const target = getWorkspaceBoardSidebarDropTarget(300, 120)
    expect(target).not.toBeNull()
    updateWorkspaceBoardSidebarDropTargetVisual(target)
    expect(dropIndicator()).not.toBeNull()

    unregister()

    // The line lives on the body, so a board that goes away must not leave it behind.
    expect(dropIndicator()).toBeNull()
  })
})

describe('workspace board sidebar drop target', () => {
  it('resolves the lane the pointer is inside, its slot and the line position', () => {
    const board = buildBoard(LANE_STATUS_IDS)
    registerBoard(board)

    expect(getWorkspaceBoardSidebarDropTarget(300, 120)).toEqual({
      status: 'in-progress',
      dropIndex: 0,
      dropIndicatorY: 14,
      laneRect: { left: 212, top: 0, width: 200 }
    })
  })

  it('resolves nothing above or below the lane row', () => {
    const board = buildBoard(LANE_STATUS_IDS)
    registerBoard(board)

    expect(getWorkspaceBoardSidebarDropTarget(300, -20)).toBeNull()
    expect(getWorkspaceBoardSidebarDropTarget(300, BOARD_BOTTOM + 20)).toBeNull()
  })

  it('resolves nothing inside the sidebar next to the board edge, and follows the lane gap', () => {
    const board = buildBoard(LANE_STATUS_IDS)
    registerBoard(board)
    // The sidebar sits left of the board: same row, but not a lane.
    stubRect(board, { left: 200, top: 0, right: 1048, bottom: BOARD_BOTTOM })
    for (const element of board.querySelectorAll<HTMLElement>('[data-workspace-status]')) {
      const bounds = LANE_BOUNDS[element.dataset.workspaceStatus ?? '']!
      stubRect(element, {
        left: bounds.left + 200,
        right: bounds.right + 200,
        top: 0,
        bottom: BOARD_BOTTOM
      })
    }

    // 190 is left of the board but within the lane hit test's own gap tolerance.
    expect(getWorkspaceBoardSidebarDropTarget(190, 120)).toBeNull()
    // Inside the board, the gap between lanes still lands on the nearest one.
    expect(getWorkspaceBoardSidebarDropTarget(406, 120)?.status).toBe('todo')
    expect(getWorkspaceBoardSidebarDropTarget(408, 120)?.status).toBe('in-progress')
    // Past the last lane by more than the tolerance: nothing.
    expect(getWorkspaceBoardSidebarDropTarget(1090, 120)).toBeNull()
  })

  it('resolves a lane the virtualizer has outside its window, from the measured layout', () => {
    const board = buildBoard(LANE_STATUS_IDS.slice(0, 2))
    registerBoard(board)

    // Without the measured layout the two painted lanes are all there is.
    expect(getWorkspaceBoardSidebarDropTarget(700, 120)).toBeNull()

    registerMeasuredLanes(board)

    // `completed` is lane 3 of the layout and paints nothing: only the measured slot places it.
    expect(getWorkspaceBoardSidebarDropTarget(700, 120)).toEqual({
      status: 'completed',
      dropIndex: 0,
      dropIndicatorY: 14,
      laneRect: { left: 636, top: 0, width: 200 }
    })
    // A painted lane keeps its live rect.
    expect(getWorkspaceBoardSidebarDropTarget(300, 120)?.laneRect).toEqual({
      left: 212,
      top: 0,
      width: 200
    })
  })
})

describe('workspace board sidebar drop visual', () => {
  it('publishes the destination lane and paints the insertion line, then clears both', () => {
    const board = buildBoard(LANE_STATUS_IDS)
    registerBoard(board)
    const { result } = renderHook(() => useWorkspaceBoardSidebarDropTargetStatus())
    expect(result.current).toBeNull()

    const target = getWorkspaceBoardSidebarDropTarget(700, 120)
    expect(target).not.toBeNull()
    act(() => updateWorkspaceBoardSidebarDropTargetVisual(target))

    expect(result.current).toBe('completed')
    expect(dropIndicator()).toHaveAttribute('data-workspace-board-card-drop-status', 'completed')
    expect(dropIndicator()?.style.transform).toBe('translate3d(644px, 14px, 0)')

    act(() => updateWorkspaceBoardSidebarDropTargetVisual(null))

    expect(result.current).toBeNull()
    expect(dropIndicator()).toBeNull()
  })

  it('keeps the published lane when the same frame resolves it again', () => {
    const board = buildBoard(LANE_STATUS_IDS)
    registerBoard(board)
    const { result } = renderHook(() => useWorkspaceBoardSidebarDropTargetStatus())
    const target = getWorkspaceBoardSidebarDropTarget(300, 120)

    act(() => updateWorkspaceBoardSidebarDropTargetVisual(target))
    const published = result.current
    act(() => updateWorkspaceBoardSidebarDropTargetVisual(target))

    expect(result.current).toBe(published)
    expect(result.current).toBe('in-progress')
  })
})
