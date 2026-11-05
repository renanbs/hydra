// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: orca/src/renderer/src/components/sidebar/worktree-list/navigation/use-pending-reveal.ts (scroll leg)
//
// Reveal has to go through the virtualizer: the row a reveal names is usually outside the
// mounted window, so the panel's `scrollIntoView` would find nothing in the DOM. Scrolling the
// virtualizer to its index mounts the row first, and the panel's own scroll then settles it.
import { useEffect, useRef } from 'react'
import type { Virtualizer } from '@tanstack/react-virtual'
import type { HostSectionRow } from '../../host-section-rows'
import { findRevealRowIndex } from '../listing/reveal-row-lookup'

export function useWorktreeListRevealScroll(args: {
  rows: readonly HostSectionRow[]
  revealPath: string | null
  virtualizer: Virtualizer<HTMLDivElement, HTMLDivElement>
  markDirectScrollInput: () => void
}): void {
  const { rows, revealPath, virtualizer, markDirectScrollInput } = args
  const lastRevealedPathRef = useRef<string | null>(null)

  useEffect(() => {
    if (revealPath === null) {
      lastRevealedPathRef.current = null
      return
    }
    // Why: the reveal also repaints rows as it goes (collapse expansions land in the same
    // commit); scrolling on every one of those renders would fight the row layout under it.
    if (lastRevealedPathRef.current === revealPath) {
      return
    }
    lastRevealedPathRef.current = revealPath
    const index = findRevealRowIndex(rows, revealPath)
    if (index === -1) {
      return
    }
    // The list is jumping somewhere the user did not scroll to, so the anchor must not
    // restore over it.
    markDirectScrollInput()
    virtualizer.scrollToIndex(index, { align: 'auto' })
  }, [markDirectScrollInput, revealPath, rows, virtualizer])
}
