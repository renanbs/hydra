// Orca `use-sort-order.ts` (settle leg): the sidebar's sort epoch is a signal, not a
// command. Attention scores decay with time, so recomputing the painted order on every
// bump makes rows jump under the pointer while the user is reading them. This hook feeds
// the epoch through `createSortSettleGate`, which applies Smart/Recent bumps only after
// `SORT_SETTLE_MS` and lets structural changes and Manual drag/drop through immediately.
//
// Why a hook and not inline component state: the gate is timer-backed and must be
// disposed on unmount, and unit tests need to drive it without mounting the sidebar.
import { useEffect, useRef, useState } from 'react'
import {
  createSortSettleGate,
  type SortBy,
  type SortSettleGate
} from '../../smart-sort'

export function useSettledSortEpoch(args: {
  sortBy: SortBy
  sortEpoch: number
  worktreeCount: number
}): number {
  const { sortBy, sortEpoch, worktreeCount } = args
  const [appliedSortEpoch, setAppliedSortEpoch] = useState(sortEpoch)
  const gateRef = useRef<SortSettleGate | null>(null)
  if (gateRef.current === null) {
    gateRef.current = createSortSettleGate((epoch) => setAppliedSortEpoch(epoch))
  }

  useEffect(() => {
    gateRef.current?.request({ sortBy, sortEpoch, worktreeCount })
  }, [sortBy, sortEpoch, worktreeCount])

  useEffect(() => {
    const gate = gateRef.current
    return () => gate?.dispose()
  }, [])

  return appliedSortEpoch
}
