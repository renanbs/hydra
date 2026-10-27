// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: orca/src/renderer/src/components/sidebar/worktree-list/viewport/use-group-toggle.ts
//
// Collapsing a section changes the list's total height, so the anchor is snapshotted first —
// otherwise the row under the pointer jumps out from under the click that collapsed another.
//
// Adapted to Hydra: Orca also mints a per-lineage-group toggle handler cache here; Hydra paints
// no lineage folds, so the port keeps the anchored toggle.
import { useCallback } from 'react'
import type React from 'react'
import { VIRTUALIZED_SCROLL_ANCHOR_RECORD_EVENT } from '@/hooks/useVirtualizedScrollAnchor'

export function useGroupToggleWithScrollAnchor<TRow>(args: {
  scrollRef: React.RefObject<HTMLDivElement | null>
  toggleGroup: (row: TRow) => void
}): {
  toggleGroupWithScrollAnchor: (row: TRow) => void
} {
  const { scrollRef, toggleGroup } = args
  const recordScrollAnchor = useCallback(() => {
    scrollRef.current?.dispatchEvent(new Event(VIRTUALIZED_SCROLL_ANCHOR_RECORD_EVENT))
  }, [scrollRef])
  const toggleGroupWithScrollAnchor = useCallback(
    (row: TRow) => {
      recordScrollAnchor()
      toggleGroup(row)
    },
    [recordScrollAnchor, toggleGroup]
  )

  return { toggleGroupWithScrollAnchor }
}
