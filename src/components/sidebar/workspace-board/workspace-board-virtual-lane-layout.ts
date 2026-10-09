import type { VirtualItem } from '@tanstack/react-virtual'
import type { WorkspaceStatus } from '../../../shared/worktree/types'

/**
 * The lane grid publishes its measured layout here so the card drag can hit-test lanes the
 * virtualizer has not painted. Without it, resolving a drop would require every lane to be
 * mounted — which is exactly what virtualization removes.
 *
 * Ported from Orca `workspace-kanban-virtual-lane-layout`, scoped to the horizontal lane axis:
 * the vertical axis of a lane's own cards has its own registration
 * (`workspace-board-virtual-card-layout`).
 */

type WorkspaceBoardVirtualLaneLayoutRegistration = {
  gridElement: HTMLElement
  getLaneStatusIds: () => readonly WorkspaceStatus[]
  getMeasurements: () => readonly Pick<VirtualItem, 'index' | 'start' | 'end'>[]
}

/** One lane slot in the grid's content coordinates. */
export type WorkspaceBoardVirtualLaneSlot = {
  status: WorkspaceStatus
  index: number
  start: number
  end: number
}

const laneLayouts = new WeakMap<HTMLElement, WorkspaceBoardVirtualLaneLayoutRegistration>()

export function registerWorkspaceBoardVirtualLaneLayout(args: {
  gridElement: HTMLElement
  getLaneStatusIds: () => readonly WorkspaceStatus[]
  getMeasurements: () => readonly Pick<VirtualItem, 'index' | 'start' | 'end'>[]
}): () => void {
  const registration: WorkspaceBoardVirtualLaneLayoutRegistration = {
    gridElement: args.gridElement,
    getLaneStatusIds: args.getLaneStatusIds,
    getMeasurements: args.getMeasurements
  }
  laneLayouts.set(args.gridElement, registration)
  return () => {
    if (laneLayouts.get(args.gridElement) === registration) {
      laneLayouts.delete(args.gridElement)
    }
  }
}

/**
 * Every lane the grid measured — painted or not — in content coordinates. `null` while the
 * grid has not registered or the measurement cache is behind the lane list, so the caller
 * keeps reading the painted lanes' live rects.
 */
export function getWorkspaceBoardVirtualLaneSlots(
  gridElement: HTMLElement
): WorkspaceBoardVirtualLaneSlot[] | null {
  const registration = laneLayouts.get(gridElement)
  if (!registration) {
    return null
  }
  const laneStatusIds = registration.getLaneStatusIds()
  const measurements = registration.getMeasurements()
  if (measurements.length < laneStatusIds.length) {
    return null
  }
  const slots: WorkspaceBoardVirtualLaneSlot[] = []
  for (let index = 0; index < laneStatusIds.length; index++) {
    const measurement = measurements[index]
    const status = laneStatusIds[index]
    if (
      !status ||
      !measurement ||
      measurement.index !== index ||
      !Number.isFinite(measurement.start) ||
      !Number.isFinite(measurement.end)
    ) {
      return null
    }
    slots.push({ status, index, start: measurement.start, end: measurement.end })
  }
  return slots
}
