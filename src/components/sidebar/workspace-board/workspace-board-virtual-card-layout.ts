import type { VirtualItem } from '@tanstack/react-virtual'
import {
  isValidWorkspaceBoardVirtualMeasurement,
  resolveWorkspaceBoardCardIndexFromMeasurements,
  resolveWorkspaceBoardCardIndicatorYFromMeasurements
} from './workspace-board-virtual-lanes'

/**
 * A lane's card list publishes its measured layout here, keyed by the lane's own scroll
 * element. Two callers read it: the card drag, which resolves an insertion slot whose card is
 * outside the painted window (the vertical axis of D08-024 is virtualized too, so the last
 * painted card is not the end of the lane), and the marquee's hit test, which needs the
 * rectangles of cards the virtualizer has not mounted.
 *
 * Ported from Orca `workspace-kanban-virtual-lane-layout`.
 */

type WorkspaceBoardVirtualCardLayoutRegistration = {
  scrollElement: HTMLElement
  spacerElement: HTMLElement
  getItemIdentities: () => readonly string[]
  getMeasurements: () => readonly Pick<VirtualItem, 'index' | 'start' | 'end'>[]
}

/** One card slot: painted or not, in viewport coordinates plus the lane's content space. */
export type WorkspaceBoardVirtualCardItemRect = {
  id: string
  index: number
  left: number
  top: number
  right: number
  bottom: number
  /** `top`/`bottom` rebased into the lane's own content coordinates. */
  contentTop: number
  contentBottom: number
}

type WorkspaceBoardVirtualCardLayoutSnapshot = {
  registration: WorkspaceBoardVirtualCardLayoutRegistration
  itemIdentities: readonly string[]
  measurements: readonly Pick<VirtualItem, 'index' | 'start' | 'end'>[]
}

const cardLayouts = new WeakMap<HTMLElement, WorkspaceBoardVirtualCardLayoutRegistration>()

export function registerWorkspaceBoardVirtualCardLayout(args: {
  scrollElement: HTMLElement
  spacerElement: HTMLElement
  getItemIdentities: () => readonly string[]
  getMeasurements: () => readonly Pick<VirtualItem, 'index' | 'start' | 'end'>[]
}): () => void {
  const registration: WorkspaceBoardVirtualCardLayoutRegistration = {
    scrollElement: args.scrollElement,
    spacerElement: args.spacerElement,
    getItemIdentities: args.getItemIdentities,
    getMeasurements: args.getMeasurements
  }
  cardLayouts.set(args.scrollElement, registration)
  return () => {
    if (cardLayouts.get(args.scrollElement) === registration) {
      cardLayouts.delete(args.scrollElement)
    }
  }
}

/** How many cards the lane holds, painted or not; `null` when the lane registered no list. */
export function getWorkspaceBoardVirtualCardItemCount(scrollElement: HTMLElement): number | null {
  return cardLayouts.get(scrollElement)?.getItemIdentities().length ?? null
}

/**
 * Every card slot the lane measured — painted or not — in viewport coordinates. The marquee
 * hit-tests these instead of the DOM, so a card the virtualizer left outside its window still
 * counts under the rectangle, and `contentTop`/`contentBottom` let a lane that scrolls
 * mid-drag keep answering with the content positions the user dragged across.
 *
 * `null` when the lane registered no list or the measurement cache is behind the card list,
 * so the caller falls back to the painted cards' live rects.
 */
export function getWorkspaceBoardVirtualCardItemRects(
  scrollElement: HTMLElement
): WorkspaceBoardVirtualCardItemRect[] | null {
  const snapshot = getVirtualCardLayoutSnapshot(scrollElement)
  if (!snapshot) {
    return null
  }

  const spacerRect = snapshot.registration.spacerElement.getBoundingClientRect()
  const containerRect = snapshot.registration.scrollElement.getBoundingClientRect()
  const contentOffset = spacerRect.top - containerRect.top + scrollElement.scrollTop
  const rects: WorkspaceBoardVirtualCardItemRect[] = []
  for (let index = 0; index < snapshot.itemIdentities.length; index++) {
    const measurement = snapshot.measurements[index]
    if (!isValidWorkspaceBoardVirtualMeasurement(measurement, index)) {
      return null
    }
    rects.push({
      id: snapshot.itemIdentities[index]!,
      index,
      left: spacerRect.left,
      top: spacerRect.top + measurement.start,
      right: spacerRect.right,
      bottom: spacerRect.top + measurement.end,
      contentTop: contentOffset + measurement.start,
      contentBottom: contentOffset + measurement.end
    })
  }
  return rects
}

/**
 * The slot the pointer sits in and the insertion line's viewport Y, from the card list's
 * measured offsets. `null` when the lane registered no list or the measurements are stale,
 * so the caller keeps the painted cards' geometry.
 */
export function resolveWorkspaceBoardVirtualCardSlot(args: {
  scrollElement: HTMLElement
  pointerY: number
}): { dropIndex: number; dropIndicatorY: number } | null {
  const registration = cardLayouts.get(args.scrollElement)
  if (!registration) {
    return null
  }
  const itemCount = registration.getItemIdentities().length
  const measurements = registration.getMeasurements()
  const spacerTop = registration.spacerElement.getBoundingClientRect().top
  const dropIndex = resolveWorkspaceBoardCardIndexFromMeasurements({
    measurements,
    itemCount,
    pointerY: args.pointerY,
    spacerTop
  })
  if (dropIndex === null) {
    return null
  }
  const dropIndicatorY = resolveWorkspaceBoardCardIndicatorYFromMeasurements({
    measurements,
    itemCount,
    dropIndex,
    spacerTop
  })
  if (dropIndicatorY === null) {
    return null
  }
  return { dropIndex, dropIndicatorY }
}

function getVirtualCardLayoutSnapshot(
  scrollElement: HTMLElement
): WorkspaceBoardVirtualCardLayoutSnapshot | null {
  const registration = cardLayouts.get(scrollElement)
  if (!registration) {
    return null
  }
  const itemIdentities = registration.getItemIdentities()
  const measurements = registration.getMeasurements()
  return measurements.length >= itemIdentities.length
    ? { registration, itemIdentities, measurements }
    : null
}
