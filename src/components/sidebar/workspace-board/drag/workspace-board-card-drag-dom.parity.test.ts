// Destination geometry of a board card drag: which lane the pointer is over, which slot it
// inserts into, where the insertion line paints, and which target a release commits to.
//
// jsdom has no layout, so every rect here is synthetic — the geometry under test is the real
// one, only the rects are fed by hand.
import { describe, expect, it } from 'vitest'
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
