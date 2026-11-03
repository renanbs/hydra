import { describe, expect, it } from 'vitest'
import {
  parseWorkspaceLaneFullIds,
  resolveWorkspaceBoardFullLaneDropIndex,
  serializeWorkspaceLaneFullIds,
  WORKSPACE_LANE_FULL_IDS_DELIMITER,
} from './workspace-board-filtered-drop-index'

describe('workspace lane full ids channel (D08-026)', () => {
  it('serializes with a delimiter no path can contain and round-trips', () => {
    const ids = ['repo::/home/a,b:c', 'repo::/var/x\ny', '']
    const serialized = serializeWorkspaceLaneFullIds(ids)

    expect(serialized).toBe(ids.join(WORKSPACE_LANE_FULL_IDS_DELIMITER))
    expect(parseWorkspaceLaneFullIds(serialized ?? undefined)).toEqual(ids)
  })

  it('distinguishes an unpublished lane from an empty published lane', () => {
    expect(parseWorkspaceLaneFullIds(undefined)).toBeNull()
    expect(parseWorkspaceLaneFullIds('')).toEqual([])
  })

  it('refuses to publish an id that already contains the delimiter', () => {
    expect(
      serializeWorkspaceLaneFullIds([`bad${WORKSPACE_LANE_FULL_IDS_DELIMITER}id`])
    ).toBeNull()
  })
})

describe('filtered drop index translation (D08-039)', () => {
  const full = ['a', 'b', 'c', 'd', 'e', 'f']

  it('returns the slot directly when the lane is not filtered', () => {
    expect(
      resolveWorkspaceBoardFullLaneDropIndex({
        fullLaneIds: full,
        renderedIds: full,
        filteredDropIndex: 3,
      })
    ).toBe(3)
  })

  it('maps a slot between rendered matches onto the full lane', () => {
    // Rendered: a, c, f. Slot 1 means "above c", which is index 2 in the lane.
    expect(
      resolveWorkspaceBoardFullLaneDropIndex({
        fullLaneIds: full,
        renderedIds: ['a', 'c', 'f'],
        filteredDropIndex: 1,
      })
    ).toBe(2)
  })

  it('maps the head and tail branches to the first/last match', () => {
    expect(
      resolveWorkspaceBoardFullLaneDropIndex({
        fullLaneIds: full,
        renderedIds: ['b', 'e'],
        filteredDropIndex: 0,
      })
    ).toBe(1)
    expect(
      resolveWorkspaceBoardFullLaneDropIndex({
        fullLaneIds: full,
        renderedIds: ['b', 'e'],
        filteredDropIndex: 5,
      })
    ).toBe(5)
  })

  it('appends when the query hid every card of the lane', () => {
    expect(
      resolveWorkspaceBoardFullLaneDropIndex({
        fullLaneIds: full,
        renderedIds: [],
        filteredDropIndex: 0,
      })
    ).toBe(full.length)
  })

  it('falls back to the lane head or tail for a stale rendered id', () => {
    expect(
      resolveWorkspaceBoardFullLaneDropIndex({
        fullLaneIds: full,
        renderedIds: ['gone', 'e'],
        filteredDropIndex: 0,
      })
    ).toBe(0)
    expect(
      resolveWorkspaceBoardFullLaneDropIndex({
        fullLaneIds: full,
        renderedIds: ['b', 'gone'],
        filteredDropIndex: 2,
      })
    ).toBe(full.length)
  })
})
