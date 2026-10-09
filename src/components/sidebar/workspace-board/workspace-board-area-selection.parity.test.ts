// The marquee's geometry, without a layout engine: jsdom reports every rect as 0×0, so each
// test stubs the rectangles it wants and the real hit test runs against them. Two properties
// matter and are exercised here — the rectangle must clip to the board, and a card the vertical
// virtualizer never mounted must still be covered.
import { afterEach, describe, expect, it } from 'vitest'
import type { WorkspaceBoardAreaSelectionCardRect } from './workspace-board-area-selection-card-rects'
import { getWorkspaceBoardAreaSelectionCardRects } from './workspace-board-area-selection-card-rects'
import {
  WORKSPACE_BOARD_AREA_SELECTED_ATTR,
  WORKSPACE_BOARD_AREA_SELECTION_AUTO_SCROLL_EDGE_SIZE,
  clearWorkspaceBoardAreaSelectionPreview,
  getWorkspaceBoardAreaSelectionAutoScrollDelta,
  getWorkspaceBoardAreaSelectionCardIds,
  getWorkspaceBoardAreaSelectionRect,
  getWorkspaceBoardAreaSelectionScrollContainer,
  getWorkspaceBoardAreaSelectionScrollStartContentYByElement,
  isWorkspaceBoardScrollbarPointerDown,
  setWorkspaceBoardAreaSelectionOverlayRect,
  shouldIgnoreWorkspaceBoardAreaSelectionStart,
  updateWorkspaceBoardAreaSelectionPreview
} from './workspace-board-area-selection-dom'
import {
  WORKSPACE_BOARD_AREA_SELECTION_DRAG_THRESHOLD,
  shouldCommitWorkspaceBoardAreaSelection
} from './workspace-board-area-selection-state'
import { registerWorkspaceBoardVirtualCardLayout } from './workspace-board-virtual-card-layout'

const BOARD_BOUNDS = { left: 40, top: 100, right: 700, bottom: 700 }
const LANE_BOUNDS = { left: 60, top: 140, right: 340, bottom: 640 }
const SCROLL_TOP = 120
const CARD_HEIGHT = 40
const CARD_GAP = 8

function stubRect(
  element: HTMLElement,
  rect: { left: number; top: number; right: number; bottom: number }
): void {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () =>
      ({
        ...rect,
        width: rect.right - rect.left,
        height: rect.bottom - rect.top,
        x: rect.left,
        y: rect.top,
        toJSON: () => ({})
      }) as DOMRect
  })
}

function makeCardRect(args: {
  id: string
  viewport: { left: number; top: number; right: number; bottom: number }
  scrollContainer?: HTMLElement | null
  contentRect?: WorkspaceBoardAreaSelectionCardRect['contentRect']
  element?: HTMLElement | null
}): WorkspaceBoardAreaSelectionCardRect {
  return {
    id: args.id,
    element: args.element ?? null,
    rect: args.viewport,
    scrollContainer: args.scrollContainer ?? null,
    contentRect: args.contentRect ?? null
  }
}

/**
 * A board with one lane scroller whose card list published a measured layout: three cards, of
 * which only the first is mounted as a DOM card — the other two exist only as measurements,
 * which is exactly the case the marquee has to answer for.
 */
function mountBoardWithMeasuredLane(): { board: HTMLElement; scroller: HTMLElement } {
  const board = document.createElement('div')
  const scroller = document.createElement('div')
  scroller.setAttribute('data-workspace-board-card-scroller', '')
  const spacer = document.createElement('div')
  scroller.appendChild(spacer)
  board.appendChild(scroller)
  document.body.appendChild(board)

  stubRect(scroller, LANE_BOUNDS)
  Object.defineProperty(scroller, 'scrollTop', { configurable: true, writable: true, value: SCROLL_TOP })
  stubRect(spacer, {
    left: LANE_BOUNDS.left,
    top: LANE_BOUNDS.top - SCROLL_TOP,
    right: LANE_BOUNDS.right,
    bottom: LANE_BOUNDS.bottom - SCROLL_TOP
  })

  registerWorkspaceBoardVirtualCardLayout({
    scrollElement: scroller,
    spacerElement: spacer,
    getItemIdentities: () => ['|a', '|b', '|c'],
    getMeasurements: () =>
      Array.from({ length: 3 }, (_, index) => {
        const start = index * (CARD_HEIGHT + CARD_GAP)
        return { index, start, end: start + CARD_HEIGHT }
      })
  })

  // The first card is also painted, so the DOM's exact rect has to win over the measurement.
  const paintedCard = document.createElement('div')
  paintedCard.setAttribute('data-workspace-board-card-id', '|a')
  scroller.appendChild(paintedCard)
  stubRect(paintedCard, {
    left: LANE_BOUNDS.left,
    top: LANE_BOUNDS.top - SCROLL_TOP,
    right: LANE_BOUNDS.right,
    bottom: LANE_BOUNDS.top - SCROLL_TOP + CARD_HEIGHT
  })

  return { board, scroller }
}

describe('workspace board marquee commit', () => {
  it('requires a 4px displacement before a press is a marquee', () => {
    expect(WORKSPACE_BOARD_AREA_SELECTION_DRAG_THRESHOLD).toBe(4)
  })

  it('commits a plain click on empty space so the selection clears', () => {
    expect(shouldCommitWorkspaceBoardAreaSelection({ additive: false, started: false })).toBe(true)
  })

  it('ignores a modifier click on empty space so the batch survives', () => {
    expect(shouldCommitWorkspaceBoardAreaSelection({ additive: true, started: false })).toBe(false)
  })

  it('commits a real marquee even in additive mode', () => {
    expect(shouldCommitWorkspaceBoardAreaSelection({ additive: true, started: true })).toBe(true)
    expect(shouldCommitWorkspaceBoardAreaSelection({ additive: false, started: true })).toBe(true)
  })
})

describe('workspace board marquee rectangle', () => {
  it('normalizes a sweep in any direction', () => {
    expect(getWorkspaceBoardAreaSelectionRect(300, 500, 100, 200)).toEqual({
      left: 100,
      top: 200,
      width: 200,
      height: 300
    })
  })

  it('paints the box with a translate3d and hides it when the sweep is gone', () => {
    const overlay = document.createElement('div')
    overlay.classList.add('hidden')

    setWorkspaceBoardAreaSelectionOverlayRect(overlay, {
      left: 20,
      top: 30,
      width: 100,
      height: 40
    })

    expect(overlay.classList.contains('hidden')).toBe(false)
    expect(overlay.style.transform).toBe('translate3d(20px, 30px, 0)')
    expect(overlay.style.width).toBe('100px')
    expect(overlay.style.height).toBe('40px')

    setWorkspaceBoardAreaSelectionOverlayRect(overlay, null)
    expect(overlay.classList.contains('hidden')).toBe(true)
  })
})

describe('workspace board marquee hit testing', () => {
  it('covers a card the virtualizer never mounted, from the lane measured layout', () => {
    const { board } = mountBoardWithMeasuredLane()

    const rects = getWorkspaceBoardAreaSelectionCardRects(board)

    expect(rects.map((card) => card.id)).toEqual(['|a', '|b', '|c'])
    // `|b` and `|c` have no element: only the measurements know where they are.
    expect(rects.find((card) => card.id === '|b')?.element).toBeNull()
    expect(rects.find((card) => card.id === '|b')?.scrollContainer).toBe(
      board.querySelector('[data-workspace-board-card-scroller]')
    )

    // A marquee over the lane's top band covers the painted card and the measured one below it.
    const covered = getWorkspaceBoardAreaSelectionCardIds(rects, {
      left: LANE_BOUNDS.left,
      top: LANE_BOUNDS.top - SCROLL_TOP,
      width: LANE_BOUNDS.right - LANE_BOUNDS.left,
      height: CARD_HEIGHT + CARD_GAP
    })

    expect(covered).toEqual(['|a', '|b'])
  })

  it('covers a card below the mounted window when the lane holds more than it paints', () => {
    const { board } = mountBoardWithMeasuredLane()

    const covered = getWorkspaceBoardAreaSelectionCardIds(
      getWorkspaceBoardAreaSelectionCardRects(board),
      {
        left: LANE_BOUNDS.left,
        top: LANE_BOUNDS.top - SCROLL_TOP,
        width: LANE_BOUNDS.right - LANE_BOUNDS.left,
        height: 1000
      }
    )

    expect(covered).toEqual(['|a', '|b', '|c'])
  })

  it('keeps a card the lane scrolled past, because the sweep is anchored to content', () => {
    const scrollContainer = document.createElement('div')
    // `top-card` has scrolled above the marquee's viewport band, `below` sits under the pointer.
    const cards = [
      makeCardRect({
        id: 'top-card',
        viewport: { left: 20, top: 20, right: 220, bottom: 70 },
        scrollContainer,
        contentRect: { top: 120, bottom: 170, containerTop: 100, scrollTop: 200 }
      }),
      makeCardRect({
        id: 'below-current-pointer',
        viewport: { left: 20, top: 600, right: 220, bottom: 650 },
        scrollContainer,
        contentRect: { top: 700, bottom: 750, containerTop: 100, scrollTop: 200 }
      })
    ]

    const covered = getWorkspaceBoardAreaSelectionCardIds(
      cards,
      { left: 0, top: 230, width: 260, height: 350 },
      { scrollStartContentYByElement: new Map([[scrollContainer, 130]]), currentY: 580 }
    )

    expect(covered).toEqual(['top-card'])
  })

  it('falls back to viewport hit testing for a card outside any lane scroller', () => {
    const covered = getWorkspaceBoardAreaSelectionCardIds(
      [
        makeCardRect({
          id: 'visible-card',
          viewport: { left: 20, top: 250, right: 220, bottom: 300 }
        })
      ],
      { left: 0, top: 230, width: 260, height: 350 }
    )

    expect(covered).toEqual(['visible-card'])
  })

  it('measures the content position the sweep started at, per lane', () => {
    const { scroller } = mountBoardWithMeasuredLane()

    const startContentYByElement = getWorkspaceBoardAreaSelectionScrollStartContentYByElement(
      document.body,
      300
    )

    // 300 - laneTop(140) + scrollTop(120)
    expect(startContentYByElement.get(scroller)).toBe(280)
  })
})

describe('workspace board marquee auto-scroll', () => {
  it(`enters the ${WORKSPACE_BOARD_AREA_SELECTION_AUTO_SCROLL_EDGE_SIZE}px bottom edge`, () => {
    const delta = getWorkspaceBoardAreaSelectionAutoScrollDelta({
      pointerY: 585,
      containerTop: 100,
      containerBottom: 600,
      scrollTop: 40,
      scrollHeight: 1200,
      clientHeight: 500
    })

    expect(delta).toBeGreaterThan(0)
  })

  it('enters the top edge upwards while content exists above', () => {
    const delta = getWorkspaceBoardAreaSelectionAutoScrollDelta({
      pointerY: 112,
      containerTop: 100,
      containerBottom: 600,
      scrollTop: 40,
      scrollHeight: 1200,
      clientHeight: 500
    })

    expect(delta).toBeLessThan(0)
  })

  it('stays still away from the edges and at either limit', () => {
    const awayFromEdges = getWorkspaceBoardAreaSelectionAutoScrollDelta({
      pointerY: 350,
      containerTop: 100,
      containerBottom: 600,
      scrollTop: 40,
      scrollHeight: 1200,
      clientHeight: 500
    })
    const atBottomLimit = getWorkspaceBoardAreaSelectionAutoScrollDelta({
      pointerY: 585,
      containerTop: 100,
      containerBottom: 600,
      scrollTop: 700,
      scrollHeight: 1200,
      clientHeight: 500
    })
    const atTopLimit = getWorkspaceBoardAreaSelectionAutoScrollDelta({
      pointerY: 110,
      containerTop: 100,
      containerBottom: 600,
      scrollTop: 0,
      scrollHeight: 1200,
      clientHeight: 500
    })
    const noOverflow = getWorkspaceBoardAreaSelectionAutoScrollDelta({
      pointerY: 585,
      containerTop: 100,
      containerBottom: 600,
      scrollTop: 0,
      scrollHeight: 500,
      clientHeight: 500
    })

    expect(awayFromEdges).toBe(0)
    expect(atBottomLimit).toBe(0)
    expect(atTopLimit).toBe(0)
    expect(noOverflow).toBe(0)
  })

  it('picks the lane scroller under the pointer column, nearest on Y', () => {
    const board = document.createElement('div')
    const leftLane = document.createElement('div')
    leftLane.setAttribute('data-workspace-board-card-scroller', '')
    const rightLane = document.createElement('div')
    rightLane.setAttribute('data-workspace-board-card-scroller', '')
    board.append(leftLane, rightLane)
    stubRect(leftLane, { left: 0, top: 100, right: 200, bottom: 600 })
    stubRect(rightLane, { left: 220, top: 100, right: 420, bottom: 600 })

    expect(getWorkspaceBoardAreaSelectionScrollContainer(board, 100, 300)).toBe(leftLane)
    expect(getWorkspaceBoardAreaSelectionScrollContainer(board, 300, 300)).toBe(rightLane)
    // Far below both lanes: no auto-scroll target.
    expect(getWorkspaceBoardAreaSelectionScrollContainer(board, 100, 900)).toBeNull()
  })

  it('ignores presses on scrollbars and on anything interactive', () => {
    const scroller = document.createElement('div')
    Object.defineProperty(scroller, 'scrollHeight', { configurable: true, value: 900 })
    Object.defineProperty(scroller, 'clientHeight', { configurable: true, value: 400 })
    stubRect(scroller, { left: 0, top: 0, right: 200, bottom: 400 })

    expect(
      isWorkspaceBoardScrollbarPointerDown({
        target: scroller,
        clientX: 195,
        clientY: 200
      })
    ).toBe(true)
    expect(
      isWorkspaceBoardScrollbarPointerDown({ target: scroller, clientX: 100, clientY: 200 })
    ).toBe(false)

    const button = document.createElement('button')
    const card = document.createElement('div')
    card.setAttribute('data-workspace-board-card-id', '|a')
    expect(shouldIgnoreWorkspaceBoardAreaSelectionStart(button)).toBe(true)
    expect(shouldIgnoreWorkspaceBoardAreaSelectionStart(card)).toBe(true)
    expect(
      shouldIgnoreWorkspaceBoardAreaSelectionStart(card.querySelector('button') ?? button)
    ).toBe(true)

    const laneRoot = document.createElement('div')
    expect(shouldIgnoreWorkspaceBoardAreaSelectionStart(laneRoot)).toBe(false)
    expect(shouldIgnoreWorkspaceBoardAreaSelectionStart(null)).toBe(false)
  })
})

describe('workspace board marquee preview', () => {
  afterEach(() => {
    document.body.replaceChildren()
  })

  it('rings exactly the cards the sweep covers, additively when asked', () => {
    const first = document.body.appendChild(document.createElement('div'))
    const second = document.body.appendChild(document.createElement('div'))
    const cards = [
      makeCardRect({
        id: '|a',
        viewport: { left: 0, top: 0, right: 100, bottom: 40 },
        element: first
      }),
      makeCardRect({
        id: '|b',
        viewport: { left: 0, top: 50, right: 100, bottom: 90 },
        element: second
      })
    ]
    const previewIds = new Set<string>()

    updateWorkspaceBoardAreaSelectionPreview(cards, previewIds, new Set(), false, ['|a'])
    expect(first.getAttribute(WORKSPACE_BOARD_AREA_SELECTED_ATTR)).toBe('true')
    expect(second.getAttribute(WORKSPACE_BOARD_AREA_SELECTED_ATTR)).toBeNull()

    updateWorkspaceBoardAreaSelectionPreview(cards, previewIds, new Set(['|b']), true, ['|a'])
    expect(second.getAttribute(WORKSPACE_BOARD_AREA_SELECTED_ATTR)).toBe('true')

    // A non-additive sweep drops the preview from the card it no longer covers.
    updateWorkspaceBoardAreaSelectionPreview(cards, previewIds, new Set(), false, [])
    expect(first.getAttribute(WORKSPACE_BOARD_AREA_SELECTED_ATTR)).toBeNull()
    expect(second.getAttribute(WORKSPACE_BOARD_AREA_SELECTED_ATTR)).toBeNull()
    expect(previewIds.size).toBe(0)
  })

  it('re-applies the ring to a card the virtualizer remounted under the same id', () => {
    const remounted = document.body.appendChild(document.createElement('div'))
    const previewIds = new Set<string>()
    const cards = [
      makeCardRect({
        id: '|a',
        viewport: { left: 0, top: 0, right: 100, bottom: 40 },
        element: remounted
      })
    ]

    updateWorkspaceBoardAreaSelectionPreview(cards, previewIds, new Set(), false, ['|a'])
    remounted.removeAttribute(WORKSPACE_BOARD_AREA_SELECTED_ATTR)

    updateWorkspaceBoardAreaSelectionPreview(cards, previewIds, new Set(), false, ['|a'])

    expect(remounted.getAttribute(WORKSPACE_BOARD_AREA_SELECTED_ATTR)).toBe('true')
  })

  it('clears the ring from the elements it painted', () => {
    const card = document.body.appendChild(document.createElement('div'))
    card.setAttribute(WORKSPACE_BOARD_AREA_SELECTED_ATTR, 'true')
    const previewIds = new Set(['|a'])

    clearWorkspaceBoardAreaSelectionPreview(
      [
        makeCardRect({
          id: '|a',
          viewport: { left: 0, top: 0, right: 100, bottom: 40 },
          element: card
        })
      ],
      previewIds
    )

    expect(card.getAttribute(WORKSPACE_BOARD_AREA_SELECTED_ATTR)).toBeNull()
    expect(previewIds.size).toBe(0)
  })
})
