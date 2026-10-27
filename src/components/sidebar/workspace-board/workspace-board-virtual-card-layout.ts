import type { VirtualItem } from '@tanstack/react-virtual'
import {
  resolveWorkspaceBoardCardIndexFromMeasurements,
  resolveWorkspaceBoardCardIndicatorYFromMeasurements
} from './workspace-board-virtual-lanes'

/**
 * A lane's card list publishes its measured layout here, keyed by the lane's own scroll
 * element. The card drag reads it to resolve an insertion slot whose card is outside the
 * painted window: the vertical axis of D08-024 is virtualized too, so the last painted card
 * is not the end of the lane.
 *
 * Ported from Orca `workspace-kanban-virtual-lane-layout`.
 */

type WorkspaceBoardVirtualCardLayoutRegistration = {
  scrollElement: HTMLElement
  spacerElement: HTMLElement
  getItemCount: () => number
  getMeasurements: () => readonly Pick<VirtualItem, 'index' | 'start' | 'end'>[]
}

const cardLayouts = new WeakMap<HTMLElement, WorkspaceBoardVirtualCardLayoutRegistration>()

export function registerWorkspaceBoardVirtualCardLayout(args: {
  scrollElement: HTMLElement
  spacerElement: HTMLElement
  getItemCount: () => number
  getMeasurements: () => readonly Pick<VirtualItem, 'index' | 'start' | 'end'>[]
}): () => void {
  const registration: WorkspaceBoardVirtualCardLayoutRegistration = {
    scrollElement: args.scrollElement,
    spacerElement: args.spacerElement,
    getItemCount: args.getItemCount,
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
  return cardLayouts.get(scrollElement)?.getItemCount() ?? null
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
  const itemCount = registration.getItemCount()
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
