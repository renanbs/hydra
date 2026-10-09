import { defaultRangeExtractor, type Range, type VirtualItem } from '@tanstack/react-virtual'

/**
 * Geometry of the virtualized workspace board: the horizontal lane strip and the vertical
 * card list inside one lane. These are the numbers the painted board and the card drag both
 * read, so they live here as pure functions — `jsdom` has no layout and the drag's hit test
 * must agree with what the virtualizers measured.
 *
 * Ported from Orca `workspace-kanban-lane-range` + the constants of `WorkspaceKanbanLaneGrid`
 * and `WorkspaceKanbanLaneCardList`.
 */

/** Horizontal gap between lanes; matches the `gap-3` the lane row painted before virtualization. */
export const WORKSPACE_BOARD_LANE_GAP = 12

/** Lanes kept mounted beyond the visible window, as in Orca. */
export const WORKSPACE_BOARD_LANE_OVERSCAN = 1

/** Vertical gap between cards; matches the `space-y-2` the lane body painted before virtualization. */
export const WORKSPACE_BOARD_CARD_GAP = 8

/** Cards kept mounted beyond the visible window, as in Orca. */
export const WORKSPACE_BOARD_CARD_OVERSCAN = 6

/** Height of the card list's own window when nothing has measured yet, in px. */
const CARD_INDICATOR_GAP_PX = 5

/**
 * First-window estimate for a board card. Board cards are the sidebar's rich `WorktreeCard`
 * (variable height), so this is only the seed: every painted card reports its real height
 * through the virtualizer's `measureElement` and replaces the estimate.
 */
export function estimateWorkspaceBoardCardHeight(compactCards: boolean): number {
  return compactCards ? 56 : 88
}

/**
 * The indexes the lane grid paints: the visible window plus overscan, with the retained lane
 * force-included when it falls outside the window.
 *
 * Why retention: the lane a card drag is over must stay mounted — its live rects are what the
 * drop's insertion line is measured from — and a lane the user focused must not be unmounted
 * under the keyboard.
 */
export function extractWorkspaceBoardLaneRange(
  range: Range,
  retainedIndex: number | null
): number[] {
  const indexes = defaultRangeExtractor(range)
  if (
    retainedIndex === null ||
    retainedIndex < 0 ||
    retainedIndex >= range.count ||
    indexes.includes(retainedIndex)
  ) {
    return indexes
  }
  return [...indexes, retainedIndex].sort((left, right) => left - right)
}

/** One item of a virtualizer's measurement cache, as the drag geometry reads it. */
export type WorkspaceBoardVirtualMeasurement = Pick<VirtualItem, 'index' | 'start' | 'end'>

export function isValidWorkspaceBoardVirtualMeasurement(
  measurement: WorkspaceBoardVirtualMeasurement | undefined,
  index: number
): measurement is WorkspaceBoardVirtualMeasurement {
  return Boolean(
    measurement &&
    measurement.index === index &&
    Number.isFinite(measurement.start) &&
    Number.isFinite(measurement.end) &&
    measurement.end >= measurement.start
  )
}

/**
 * Slot the pointer sits above, in the lane's own index space, from the card list's measured
 * offsets: the first card whose midpoint is below the pointer wins, otherwise the end of the
 * lane. Every item is measured, painted or not, so a slot past the painted window still
 * resolves — and `null` means the measurements are stale and the caller must fall back to the
 * painted cards.
 */
export function resolveWorkspaceBoardCardIndexFromMeasurements(args: {
  measurements: readonly WorkspaceBoardVirtualMeasurement[]
  itemCount: number
  pointerY: number
  spacerTop: number
}): number | null {
  const { measurements, itemCount, pointerY, spacerTop } = args
  if (itemCount === 0) {
    return 0
  }
  if (measurements.length < itemCount) {
    return null
  }
  for (let index = 0; index < itemCount; index++) {
    const measurement = measurements[index]
    if (!isValidWorkspaceBoardVirtualMeasurement(measurement, index)) {
      return null
    }
    if (pointerY < spacerTop + (measurement.start + measurement.end) / 2) {
      return index
    }
  }
  return itemCount
}

/**
 * Viewport Y of the insertion line for a slot no painted card owns: above the card that owns
 * the slot, in the gap before it, or past the last card. `null` when the measurements cannot
 * answer, so the caller keeps the painted-card geometry.
 */
export function resolveWorkspaceBoardCardIndicatorYFromMeasurements(args: {
  measurements: readonly WorkspaceBoardVirtualMeasurement[]
  itemCount: number
  dropIndex: number
  spacerTop: number
}): number | null {
  const { measurements, itemCount, dropIndex, spacerTop } = args
  if (itemCount === 0) {
    return null
  }
  if (measurements.length < itemCount) {
    return null
  }
  const index = Math.max(0, Math.min(itemCount, dropIndex))
  if (index === 0) {
    const first = measurements[0]
    return isValidWorkspaceBoardVirtualMeasurement(first, 0)
      ? spacerTop + first.start - CARD_INDICATOR_GAP_PX
      : null
  }
  if (index === itemCount) {
    const lastIndex = itemCount - 1
    const last = measurements[lastIndex]
    return isValidWorkspaceBoardVirtualMeasurement(last, lastIndex)
      ? spacerTop + last.end + CARD_INDICATOR_GAP_PX
      : null
  }
  const previous = measurements[index - 1]
  const next = measurements[index]
  if (
    !isValidWorkspaceBoardVirtualMeasurement(previous, index - 1) ||
    !isValidWorkspaceBoardVirtualMeasurement(next, index)
  ) {
    return null
  }
  return spacerTop + (previous.end + next.start) / 2
}
