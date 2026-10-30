// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: orca/src/renderer/src/components/sidebar/worktree-list/navigation/use-pending-reveal.ts (scroll leg)
//
// Reveal has to go through the virtualizer: the row a reveal names is usually outside the
// mounted window, so the panel's `scrollIntoView` would find nothing in the DOM. Scrolling the
// virtualizer to its index mounts the row first, and the panel's own scroll then settles it.
import { useEffect, useRef } from 'react'
import type { Virtualizer } from '@tanstack/react-virtual'
import type { RenderRow } from '../listing/render-row'
import { findRevealRowIndex, rowKeyMatchesRenderRow } from '../listing/reveal-row-lookup'

/** Orca `MAX_REVEAL_RETRIES`: a reveal may race the commit that expands a
 *  collapsed section, so the row only exists a frame or two later. */
const MAX_REVEAL_RETRIES = 8

function scrollToIndexSoon(
  resolveIndex: () => number,
  virtualizer: Virtualizer<HTMLDivElement, HTMLDivElement>,
  markDirectScrollInput: () => void,
  onIssued?: () => void
): () => void {
  let retries = 0
  let frame = 0
  const attempt = () => {
    const index = resolveIndex()
    if (index >= 0) {
      markDirectScrollInput()
      virtualizer.scrollToIndex(index, { align: 'auto' })
      onIssued?.()
      return
    }
    if (retries >= MAX_REVEAL_RETRIES) {
      onIssued?.()
      return
    }
    retries += 1
    frame = requestAnimationFrame(attempt)
  }
  frame = requestAnimationFrame(attempt)
  return () => cancelAnimationFrame(frame)
}

export function useWorktreeListRevealScroll(args: {
  rows: readonly RenderRow[]
  revealPath: string | null
  revealRowKey?: string | null
  virtualizer: Virtualizer<HTMLDivElement, HTMLDivElement>
  markDirectScrollInput: () => void
  onRevealIssued?: () => void
}): void {
  const { rows, revealPath, revealRowKey, virtualizer, markDirectScrollInput, onRevealIssued } = args
  const lastRevealedPathRef = useRef<string | null>(null)
  const lastRevealedRowKeyRef = useRef<string | null>(null)

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
    const cancel = scrollToIndexSoon(
      () => findRevealRowIndex(rows, revealPath),
      virtualizer,
      markDirectScrollInput,
      () => {
        lastRevealedPathRef.current = revealPath
      }
    )
    return cancel
  }, [markDirectScrollInput, revealPath, rows, virtualizer])

  // Reveal by row key (headers included): the same retry window, plus the caller's
  // chance to clear the pending request once a scroll was issued.
  useEffect(() => {
    if (!revealRowKey) {
      lastRevealedRowKeyRef.current = null
      return
    }
    if (lastRevealedRowKeyRef.current === revealRowKey) {
      return
    }
    const cancel = scrollToIndexSoon(
      () => rows.findIndex((row) => rowKeyMatchesRenderRow(row, revealRowKey)),
      virtualizer,
      markDirectScrollInput,
      () => {
        lastRevealedRowKeyRef.current = revealRowKey
        onRevealIssued?.()
      }
    )
    return cancel
  }, [markDirectScrollInput, onRevealIssued, revealRowKey, rows, virtualizer])
}
