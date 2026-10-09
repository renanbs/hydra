// Geometry of the virtualized board: which lanes the grid paints, which slot a pointer resolves
// to inside a lane, and where the insertion line hangs when the slot's card is not painted.
// These are the numbers the painted board and the card drag both read, so they are asserted
// directly — jsdom has no layout to assert them through.
import { describe, expect, it } from 'vitest'
import {
  WORKSPACE_BOARD_CARD_GAP,
  WORKSPACE_BOARD_CARD_OVERSCAN,
  WORKSPACE_BOARD_LANE_GAP,
  WORKSPACE_BOARD_LANE_OVERSCAN,
  estimateWorkspaceBoardCardHeight,
  extractWorkspaceBoardLaneRange,
  resolveWorkspaceBoardCardIndexFromMeasurements,
  resolveWorkspaceBoardCardIndicatorYFromMeasurements
} from './workspace-board-virtual-lanes'

describe('workspace board lane window', () => {
  it('keeps overscan 1 of lanes on each side of the visible window', () => {
    expect(
      extractWorkspaceBoardLaneRange({ startIndex: 4, endIndex: 6, overscan: 1, count: 10 }, null)
    ).toEqual([3, 4, 5, 6, 7])
  })

  it('clamps the window to the board edges', () => {
    expect(
      extractWorkspaceBoardLaneRange({ startIndex: 0, endIndex: 1, overscan: 1, count: 3 }, null)
    ).toEqual([0, 1, 2])
  })

  it('retains the focused lane when the window scrolled past it', () => {
    expect(
      extractWorkspaceBoardLaneRange({ startIndex: 6, endIndex: 7, overscan: 1, count: 10 }, 1)
    ).toEqual([1, 5, 6, 7, 8])
  })

  it('does not duplicate a retained lane already inside the window', () => {
    expect(
      extractWorkspaceBoardLaneRange({ startIndex: 4, endIndex: 6, overscan: 1, count: 10 }, 5)
    ).toEqual([3, 4, 5, 6, 7])
  })

  it('ignores a retention index the board does not have', () => {
    const range = { startIndex: 0, endIndex: 1, overscan: 1, count: 3 }
    expect(extractWorkspaceBoardLaneRange(range, null)).toEqual([0, 1, 2])
    expect(extractWorkspaceBoardLaneRange(range, -1)).toEqual([0, 1, 2])
    expect(extractWorkspaceBoardLaneRange(range, 3)).toEqual([0, 1, 2])
  })

  it('keeps the lane gap and overscan the painted row uses', () => {
    expect(WORKSPACE_BOARD_LANE_GAP).toBe(12)
    expect(WORKSPACE_BOARD_LANE_OVERSCAN).toBe(1)
    expect(WORKSPACE_BOARD_CARD_GAP).toBe(8)
    expect(WORKSPACE_BOARD_CARD_OVERSCAN).toBe(6)
  })

  it('seeds a card height per density, for the window before anything measured', () => {
    expect(estimateWorkspaceBoardCardHeight(false)).toBeGreaterThan(
      estimateWorkspaceBoardCardHeight(true)
    )
  })
})

describe('workspace board card slot from the lane measurements', () => {
  const measurements = [
    { index: 0, start: 0, end: 96 },
    { index: 1, start: 104, end: 200 },
    { index: 2, start: 208, end: 304 }
  ]

  it('resolves the first card whose midpoint is below the pointer', () => {
    const resolve = (pointerY: number): number | null =>
      resolveWorkspaceBoardCardIndexFromMeasurements({
        measurements,
        itemCount: 3,
        pointerY,
        spacerTop: 40
      })

    expect(resolve(60)).toBe(0)
    expect(resolve(140)).toBe(1)
    expect(resolve(220)).toBe(2)
  })

  it('resolves the end of the lane below every card', () => {
    expect(
      resolveWorkspaceBoardCardIndexFromMeasurements({
        measurements,
        itemCount: 3,
        pointerY: 900,
        spacerTop: 40
      })
    ).toBe(3)
  })

  it('resolves slot 0 for a lane with no cards', () => {
    expect(
      resolveWorkspaceBoardCardIndexFromMeasurements({
        measurements: [],
        itemCount: 0,
        pointerY: 900,
        spacerTop: 40
      })
    ).toBe(0)
  })

  it('reports nothing while the measurements are behind the lane', () => {
    expect(
      resolveWorkspaceBoardCardIndexFromMeasurements({
        measurements: measurements.slice(0, 2),
        itemCount: 3,
        pointerY: 900,
        spacerTop: 40
      })
    ).toBeNull()
    expect(
      resolveWorkspaceBoardCardIndexFromMeasurements({
        measurements: [{ index: 1, start: 0, end: 96 }],
        itemCount: 1,
        pointerY: 900,
        spacerTop: 40
      })
    ).toBeNull()
  })
})

describe('workspace board insertion line from the lane measurements', () => {
  const measurements = [
    { index: 0, start: 0, end: 96 },
    { index: 1, start: 104, end: 200 },
    { index: 2, start: 208, end: 304 }
  ]
  const indicatorY = (dropIndex: number): number | null =>
    resolveWorkspaceBoardCardIndicatorYFromMeasurements({
      measurements,
      itemCount: 3,
      dropIndex,
      spacerTop: 40
    })

  it('hangs above the first card, between two cards, or past the last one', () => {
    expect(indicatorY(0)).toBe(35)
    expect(indicatorY(1)).toBe(140)
    expect(indicatorY(2)).toBe(244)
    expect(indicatorY(3)).toBe(349)
  })

  it('clamps a slot outside the lane to its edges', () => {
    expect(indicatorY(-4)).toBe(35)
    expect(indicatorY(9)).toBe(349)
  })

  it('reports nothing for a lane with no cards, or with stale measurements', () => {
    expect(
      resolveWorkspaceBoardCardIndicatorYFromMeasurements({
        measurements: [],
        itemCount: 0,
        dropIndex: 0,
        spacerTop: 40
      })
    ).toBeNull()
    expect(
      resolveWorkspaceBoardCardIndicatorYFromMeasurements({
        measurements: measurements.slice(0, 1),
        itemCount: 3,
        dropIndex: 2,
        spacerTop: 40
      })
    ).toBeNull()
  })
})
