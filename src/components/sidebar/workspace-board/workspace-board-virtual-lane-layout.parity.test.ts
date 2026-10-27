// The lane grid publishes its measured layout for the card drag: a lane the virtualizer has
// outside its window still has a slot to hit-test, and a stale or absent registration falls back
// to the painted lanes' live rects.
import { describe, expect, it } from 'vitest'
import type { WorkspaceStatus } from '../../../shared/worktree/types'
import {
  getWorkspaceBoardVirtualLaneSlots,
  registerWorkspaceBoardVirtualLaneLayout
} from './workspace-board-virtual-lane-layout'

const LANE_IDS: WorkspaceStatus[] = ['todo', 'in-progress', 'in-review', 'completed']
const COLUMN_WIDTH = 200
const LANE_GAP = 12

function measurementsFor(count: number): { index: number; start: number; end: number }[] {
  return Array.from({ length: count }, (_, index) => {
    const start = index * (COLUMN_WIDTH + LANE_GAP)
    return { index, start, end: start + COLUMN_WIDTH }
  })
}

function grid(): HTMLElement {
  const element = document.createElement('div')
  document.body.appendChild(element)
  return element
}

describe('workspace board virtual lane layout', () => {
  it('reports every measured lane slot in content coordinates', () => {
    const element = grid()
    registerWorkspaceBoardVirtualLaneLayout({
      gridElement: element,
      getLaneStatusIds: () => LANE_IDS,
      getMeasurements: () => measurementsFor(LANE_IDS.length)
    })

    expect(getWorkspaceBoardVirtualLaneSlots(element)).toEqual([
      { status: 'todo', index: 0, start: 0, end: 200 },
      { status: 'in-progress', index: 1, start: 212, end: 412 },
      { status: 'in-review', index: 2, start: 424, end: 624 },
      { status: 'completed', index: 3, start: 636, end: 836 }
    ])
  })

  it('reports nothing while the grid registered no layout', () => {
    expect(getWorkspaceBoardVirtualLaneSlots(grid())).toBeNull()
  })

  it('reports nothing while the measurement cache is behind the lane list', () => {
    const element = grid()
    registerWorkspaceBoardVirtualLaneLayout({
      gridElement: element,
      getLaneStatusIds: () => LANE_IDS,
      getMeasurements: () => measurementsFor(2)
    })

    expect(getWorkspaceBoardVirtualLaneSlots(element)).toBeNull()
  })

  it('reports nothing when a measurement is stale or not a number', () => {
    const element = grid()
    const stale = measurementsFor(LANE_IDS.length)
    stale[2] = { index: 5, start: 0, end: 200 }
    registerWorkspaceBoardVirtualLaneLayout({
      gridElement: element,
      getLaneStatusIds: () => LANE_IDS,
      getMeasurements: () => stale
    })
    expect(getWorkspaceBoardVirtualLaneSlots(element)).toBeNull()

    const notANumber = measurementsFor(LANE_IDS.length)
    notANumber[1] = { index: 1, start: Number.NaN, end: 412 }
    registerWorkspaceBoardVirtualLaneLayout({
      gridElement: element,
      getLaneStatusIds: () => LANE_IDS,
      getMeasurements: () => notANumber
    })
    expect(getWorkspaceBoardVirtualLaneSlots(element)).toBeNull()
  })

  it('stops reporting the layout once the grid unregisters', () => {
    const element = grid()
    const unregister = registerWorkspaceBoardVirtualLaneLayout({
      gridElement: element,
      getLaneStatusIds: () => LANE_IDS,
      getMeasurements: () => measurementsFor(LANE_IDS.length)
    })

    unregister()

    expect(getWorkspaceBoardVirtualLaneSlots(element)).toBeNull()
  })

  it('keeps the newest registration when the previous one unregisters late', () => {
    const element = grid()
    const unregisterFirst = registerWorkspaceBoardVirtualLaneLayout({
      gridElement: element,
      getLaneStatusIds: () => LANE_IDS,
      getMeasurements: () => measurementsFor(LANE_IDS.length)
    })
    registerWorkspaceBoardVirtualLaneLayout({
      gridElement: element,
      getLaneStatusIds: () => LANE_IDS.slice(0, 2),
      getMeasurements: () => measurementsFor(2)
    })

    unregisterFirst()

    expect(getWorkspaceBoardVirtualLaneSlots(element)).toHaveLength(2)
  })
})
