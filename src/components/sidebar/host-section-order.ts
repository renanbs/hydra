import type { ExecutionHostId } from '../../shared/execution-host'
import type { HostSectionOption } from './host-section-rows'

export function orderHostSectionOptions(
  hostOptions: readonly HostSectionOption[],
  workspaceHostOrder: readonly ExecutionHostId[] = []
): HostSectionOption[] {
  if (workspaceHostOrder.length === 0 || hostOptions.length <= 1) {
    return [...hostOptions]
  }
  const hostById = new Map(hostOptions.map((host) => [host.id, host]))
  const ordered: HostSectionOption[] = []
  const seen = new Set<ExecutionHostId>()
  for (const hostId of workspaceHostOrder) {
    const host = hostById.get(hostId)
    if (!host || seen.has(host.id)) {
      continue
    }
    ordered.push(host)
    seen.add(host.id)
  }
  // Why: persisted order is only a preference for hosts the user has seen;
  // newly-discovered SSH/runtime hosts should still appear without needing a
  // migration or explicit reset.
  for (const host of hostOptions) {
    if (seen.has(host.id)) {
      continue
    }
    ordered.push(host)
  }
  return ordered
}

/**
 * Orca `handleReorderHostSections`: move `draggedHostId` to `targetHostId`'s slot
 * and return the complete order. Missing ids leave the order untouched (the
 * header may have collapsed between drag start and drop).
 */
export function moveHostSectionForDrop(
  order: readonly ExecutionHostId[],
  draggedHostId: ExecutionHostId,
  targetHostId: ExecutionHostId
): ExecutionHostId[] {
  if (draggedHostId === targetHostId) {
    return [...order]
  }
  const fromIndex = order.indexOf(draggedHostId)
  const toIndex = order.indexOf(targetHostId)
  if (fromIndex < 0 || toIndex < 0) {
    return [...order]
  }
  const next = [...order]
  next.splice(fromIndex, 1)
  next.splice(toIndex, 0, draggedHostId)
  return next
}
