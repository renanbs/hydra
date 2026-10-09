// Destination geometry of a board card drag: which lane the pointer is over, which slot it
// inserts into, where the insertion line paints, and which target a release commits to.
//
// jsdom has no layout, so every rect here is synthetic — the geometry under test is the real
// one, only the rects are fed by hand.
import { describe, expect, it } from 'vitest'
import { registerWorkspaceBoardVirtualCardLayout } from '../workspace-board-virtual-card-layout'
import { registerWorkspaceBoardVirtualLaneLayout } from '../workspace-board-virtual-lane-layout'
import {
  getWorkspaceBoardCardDropTarget,
  resolveWorkspaceBoardCardDropCommitTarget,
  resolveWorkspaceBoardCardDropIndexFromRects,
  resolveWorkspaceBoardCardDropIndicatorY,
  resolveWorkspaceBoardLaneDropRect,
  type WorkspaceBoardCardDropTarget
} from './workspace-board-card-drag-dom'

const LANES = [
  { status: 'todo', left: 0, top: 0, right: 200, bottom: 600 },
  { status: 'in-progress', left: 212, top: 0, right: 412, bottom: 600 },
  { status: 'completed', left: 424, top: 0, right: 624, bottom: 600 }
]

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

describe('workspace board lane drop target', () => {
  it('resolves the lane the pointer is inside', () => {
    expect(resolveWorkspaceBoardLaneDropRect(LANES, 300, 120)?.status).toBe('in-progress')
  })

  it('falls back to the nearest lane when the pointer sits in the gap between lanes', () => {
    // Past the midpoint of the gap the next lane is closer; at the exact midpoint the
    // earlier lane keeps the win, which is what the strict `<` comparison guarantees.
    expect(resolveWorkspaceBoardLaneDropRect(LANES, 206, 120)?.status).toBe('todo')
    expect(resolveWorkspaceBoardLaneDropRect(LANES, 208, 120)?.status).toBe('in-progress')
    expect(resolveWorkspaceBoardLaneDropRect(LANES, 420, 120)?.status).toBe('completed')
  })

  it('resolves nothing above or below the lane row', () => {
    expect(resolveWorkspaceBoardLaneDropRect(LANES, 300, -20)).toBeNull()
    expect(resolveWorkspaceBoardLaneDropRect(LANES, 300, 640)).toBeNull()
  })

  it('resolves nothing when the pointer is past the gap tolerance on the far side', () => {
    expect(resolveWorkspaceBoardLaneDropRect(LANES, 624 + 40, 120)).toBeNull()
  })

  it('follows the lanes as the board scrolls horizontally', () => {
    // Same row, scrolled right: the rects are viewport coordinates, so the lane the
    // pointer sits in is the one whose rect moved under it — not a lane index.
    const scrolled = [
      { status: 'todo', left: -400, top: 0, right: -200, bottom: 600 },
      { status: 'in-progress', left: -188, top: 0, right: 12, bottom: 600 },
      { status: 'completed', left: 24, top: 0, right: 224, bottom: 600 }
    ]

    expect(resolveWorkspaceBoardLaneDropRect(scrolled, 100, 120)?.status).toBe('completed')
    expect(resolveWorkspaceBoardLaneDropRect(scrolled, -100, 120)?.status).toBe('in-progress')
  })
})

describe('workspace board card drop index', () => {
  const cards = [
    { top: 40, bottom: 100, index: 0 },
    { top: 104, bottom: 164, index: 1 },
    { top: 168, bottom: 228, index: 2 }
  ]

  it('inserts before the first card whose midpoint is below the pointer', () => {
    expect(resolveWorkspaceBoardCardDropIndexFromRects(cards, 50)).toBe(0)
    expect(resolveWorkspaceBoardCardDropIndexFromRects(cards, 130)).toBe(1)
    expect(resolveWorkspaceBoardCardDropIndexFromRects(cards, 190)).toBe(2)
  })

  it('inserts at the end when the pointer is below every card midpoint', () => {
    expect(resolveWorkspaceBoardCardDropIndexFromRects(cards, 400)).toBe(3)
  })

  it('reports the lane index of the card, not its rendered position', () => {
    // A lane that only renders part of its cards still reports lane-accurate slots.
    expect(
      resolveWorkspaceBoardCardDropIndexFromRects(
        [
          { top: 40, bottom: 100, index: 5 },
          { top: 104, bottom: 164, index: 6 }
        ],
        130
      )
    ).toBe(6)
    expect(
      resolveWorkspaceBoardCardDropIndexFromRects([{ top: 40, bottom: 100, index: 5 }], 400)
    ).toBe(6)
  })

  it('reports slot 0 for a lane with no cards', () => {
    expect(resolveWorkspaceBoardCardDropIndexFromRects([], 120)).toBe(0)
  })
})

describe('workspace board card drop indicator', () => {
  const cards = [
    { top: 40, bottom: 100, index: 0 },
    { top: 104, bottom: 164, index: 1 }
  ]

  it('hangs the line just under the header of an empty lane', () => {
    expect(resolveWorkspaceBoardCardDropIndicatorY([], 0, 8)).toBe(22)
  })

  it('paints above the first card, between two cards, or past the last one', () => {
    expect(resolveWorkspaceBoardCardDropIndicatorY(cards, 0, 8)).toBe(35)
    expect(resolveWorkspaceBoardCardDropIndicatorY(cards, 1, 8)).toBe(102)
    expect(resolveWorkspaceBoardCardDropIndicatorY(cards, 2, 8)).toBe(169)
  })
})

describe('workspace board card drop commit target', () => {
  const tracked: WorkspaceBoardCardDropTarget = {
    status: 'completed',
    dropIndex: 0,
    dropIndicatorY: 40,
    laneRect: { left: 424, top: 0, width: 200 }
  }
  const nothing: WorkspaceBoardCardDropTarget = { status: null, dropIndex: 0 }

  it('keeps a live target', () => {
    expect(
      resolveWorkspaceBoardCardDropCommitTarget({
        currentTarget: tracked,
        latestTrackedTarget: null,
        x: 500,
        y: 60
      })
    ).toBe(tracked)
  })

  it('commits to the last resolved lane when the release trails it by a few pixels', () => {
    expect(
      resolveWorkspaceBoardCardDropCommitTarget({
        currentTarget: nothing,
        latestTrackedTarget: { target: tracked, x: 500, y: 60 },
        x: 503,
        y: 62
      })
    ).toBe(tracked)
  })

  it('refuses to resurrect a lane the pointer left', () => {
    expect(
      resolveWorkspaceBoardCardDropCommitTarget({
        currentTarget: nothing,
        latestTrackedTarget: { target: tracked, x: 500, y: 60 },
        x: 500,
        y: 600
      })
    ).toBe(nothing)
  })

  it('commits nothing when no lane was ever resolved', () => {
    expect(
      resolveWorkspaceBoardCardDropCommitTarget({
        currentTarget: nothing,
        latestTrackedTarget: null,
        x: 500,
        y: 60
      })
    ).toBe(nothing)
  })
})

describe('workspace board card drop target from the board DOM', () => {
  function buildBoard(laneCards: Record<string, number>): HTMLElement {
    const board = document.createElement('div')
    for (const lane of LANES) {
      const element = document.createElement('section')
      element.dataset.workspaceStatus = lane.status
      stubRect(element, lane)
      const cardCount = laneCards[lane.status] ?? 0
      for (let index = 0; index < cardCount; index++) {
        const card = document.createElement('div')
        card.dataset.workspaceBoardCardId = `${lane.status}-${index}`
        card.dataset.workspaceBoardCardIndex = String(index)
        stubRect(card, { left: lane.left, top: 40, right: lane.right, bottom: 100 })
        element.appendChild(card)
      }
      board.appendChild(element)
    }
    return board
  }

  it('reads the lane, the slot and the line position from the lane that owns the pointer', () => {
    const board = buildBoard({ 'in-progress': 1, completed: 1 })

    expect(getWorkspaceBoardCardDropTarget(board, 700, 500)).toEqual({
      status: null,
      dropIndex: 0
    })
    expect(getWorkspaceBoardCardDropTarget(board, 500, 120)).toEqual({
      status: 'completed',
      dropIndex: 1,
      dropIndicatorY: 105,
      laneRect: { left: 424, top: 0, width: 200 }
    })
  })

  it('anchors the line under the header when the destination lane is empty', () => {
    const board = buildBoard({ 'in-progress': 1 })

    expect(getWorkspaceBoardCardDropTarget(board, 100, 120)).toEqual({
      status: 'todo',
      dropIndex: 0,
      dropIndicatorY: 14,
      laneRect: { left: 0, top: 0, width: 200 }
    })
  })
})

describe('workspace board card drop target over a virtualized lane row', () => {
  const COLUMN_WIDTH = 200
  const LANE_GAP = 12
  const VIRTUAL_LANE_IDS = ['todo', 'in-progress', 'in-review', 'completed'] as const

  function virtualMeasurements(): { index: number; start: number; end: number }[] {
    return VIRTUAL_LANE_IDS.map((_status, index) => {
      const start = index * (COLUMN_WIDTH + LANE_GAP)
      return { index, start, end: start + COLUMN_WIDTH }
    })
  }

  /** A board the virtualizer painted only the first two lanes of. */
  function buildWindowedBoard(): HTMLElement {
    const board = document.createElement('div')
    for (const lane of LANES.slice(0, 2)) {
      const element = document.createElement('section')
      element.dataset.workspaceStatus = lane.status
      stubRect(element, lane)
      const card = document.createElement('div')
      card.dataset.workspaceBoardCardId = `${lane.status}-0`
      card.dataset.workspaceBoardCardIndex = '0'
      stubRect(card, { left: lane.left, top: 40, right: lane.right, bottom: 100 })
      element.appendChild(card)
      board.appendChild(element)
    }
    return board
  }

  it('resolves a lane the virtualizer has outside its window, and the painted ones from their rects', () => {
    const board = buildWindowedBoard()
    registerWorkspaceBoardVirtualLaneLayout({
      gridElement: board,
      getLaneStatusIds: () => [...VIRTUAL_LANE_IDS],
      getMeasurements: virtualMeasurements
    })

    // `completed` is lane 3 of the layout and paints nothing: only the measured slot places it.
    expect(getWorkspaceBoardCardDropTarget(board, 700, 120)).toEqual({
      status: 'completed',
      dropIndex: 0,
      dropIndicatorY: 14,
      laneRect: { left: 636, top: 0, width: 200 }
    })

    // A painted lane keeps its live rect, cards and insertion line.
    expect(getWorkspaceBoardCardDropTarget(board, 300, 60)).toEqual({
      status: 'in-progress',
      dropIndex: 0,
      dropIndicatorY: 35,
      laneRect: { left: 212, top: 0, width: 200 }
    })
  })

  it('resolves nothing outside the row while the grid registered no layout', () => {
    const board = buildWindowedBoard()

    expect(getWorkspaceBoardCardDropTarget(board, 700, 120)).toEqual({
      status: null,
      dropIndex: 0
    })
  })
})

describe('workspace board card drop target with a virtualized card list', () => {
  const CARD_ESTIMATED_HEIGHT = 88
  const CARD_GAP = 8
  const LANE_CARD_COUNT = 10

  /** A lane whose card list painted only its first two cards. */
  function buildPartiallyPaintedLane(): { board: HTMLElement; scroller: HTMLElement } {
    const board = document.createElement('div')
    const laneElement = document.createElement('section')
    laneElement.dataset.workspaceStatus = 'in-progress'
    stubRect(laneElement, { left: 0, top: 0, right: 400, bottom: 600 })
    const scroller = document.createElement('div')
    scroller.dataset.workspaceBoardCardScroller = ''
    for (let index = 0; index < 2; index++) {
      const card = document.createElement('div')
      card.dataset.workspaceBoardCardId = `in-progress-${index}`
      card.dataset.workspaceBoardCardIndex = String(index)
      stubRect(card, { left: 0, top: 40 + index * 64, right: 400, bottom: 100 + index * 64 })
      scroller.appendChild(card)
    }
    laneElement.appendChild(scroller)
    board.appendChild(laneElement)
    return { board, scroller }
  }

  it('resolves a slot past the painted card window from the lane card layout', () => {
    const { board, scroller } = buildPartiallyPaintedLane()
    // jsdom reports the spacer at the origin, so the measured offsets and the painted cards
    // share one coordinate space.
    const spacer = document.createElement('div')
    registerWorkspaceBoardVirtualCardLayout({
      scrollElement: scroller,
      spacerElement: spacer,
      getItemCount: () => LANE_CARD_COUNT,
      getMeasurements: () =>
        Array.from({ length: LANE_CARD_COUNT }, (_, index) => {
          const start = index * (CARD_ESTIMATED_HEIGHT + CARD_GAP)
          return { index, start, end: start + CARD_ESTIMATED_HEIGHT }
        })
    })

    // Slot 3 is past the painted cards: only the measured offsets know where it hangs.
    expect(getWorkspaceBoardCardDropTarget(board, 200, 300)).toEqual({
      status: 'in-progress',
      dropIndex: 3,
      dropIndicatorY: 284,
      laneRect: { left: 0, top: 0, width: 400 }
    })

    // A pointer over a painted card still reads its live rect.
    expect(getWorkspaceBoardCardDropTarget(board, 200, 60)).toEqual({
      status: 'in-progress',
      dropIndex: 0,
      dropIndicatorY: 35,
      laneRect: { left: 0, top: 0, width: 400 }
    })
  })

  it('falls back to the painted cards when the lane registered no card layout', () => {
    const { board } = buildPartiallyPaintedLane()

    expect(getWorkspaceBoardCardDropTarget(board, 200, 300)).toEqual({
      status: 'in-progress',
      dropIndex: 2,
      dropIndicatorY: 169,
      laneRect: { left: 0, top: 0, width: 400 }
    })
  })
})
