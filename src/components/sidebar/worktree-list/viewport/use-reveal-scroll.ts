// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: orca/src/renderer/src/components/sidebar/worktree-list/navigation/use-pending-reveal.ts (scroll leg)
//
// Reveal has to go through the virtualizer: the row a reveal names is usually outside the
// mounted window, so the panel's `scrollIntoView` would find nothing in the DOM. Scrolling the
// virtualizer to its index mounts the row first; the element reveal then frames it with the
// sticky-header inset and animates it, instead of leaving the card flush under the header.
import { useEffect, useRef } from 'react'
import type { Virtualizer } from '@tanstack/react-virtual'
import type { RenderRow } from '../listing/render-row'
import { getRenderRowKey } from '../listing/render-row'
import { findRevealRowIndex, rowKeyMatchesRenderRow } from '../listing/reveal-row-lookup'
import { revealMountedSidebarRowElement } from '../navigation/mounted-row-reveal'
import { markRevealScrollIssued } from '../../worktree-sidebar-reveal-scroll-settle'

/** Orca `MAX_REVEAL_RETRIES`: a reveal may race the commit that expands a
 *  collapsed section, so the row only exists a frame or two later. */
const MAX_REVEAL_RETRIES = 8

function scrollToIndexSoon(args: {
  resolveIndex: () => number
  rows: readonly RenderRow[]
  virtualizer: Virtualizer<HTMLDivElement, HTMLDivElement>
  markDirectScrollInput: () => void
  onIssued?: () => void
}): () => void {
  const { resolveIndex, rows, virtualizer, markDirectScrollInput, onIssued } = args
  let retries = 0
  let frame = 0
  const attempt = () => {
    const index = resolveIndex()
    if (index >= 0) {
      markDirectScrollInput()
      virtualizer.scrollToIndex(index, { align: 'auto' })
      const container = virtualizer.scrollElement
      const row = rows[index]
      const rowKey = row === undefined ? null : getRenderRowKey(row)
      if (!container || !rowKey) {
        onIssued?.()
        return
      }
      // Why the follow-up frame: `scrollToIndex` schedules the row's mount in the next
      // commit, so the element it names does not exist yet in this one.
      frame = requestAnimationFrame(() => {
        revealMountedSidebarRowElement(container, rowKey, 'smooth', (targetTop) => {
          markRevealScrollIssued(container, targetTop)
        })
        onIssued?.()
      })
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
    const cancel = scrollToIndexSoon({
      resolveIndex: () => findRevealRowIndex(rows, revealPath),
      rows,
      virtualizer,
      markDirectScrollInput,
      onIssued: () => {
        lastRevealedPathRef.current = revealPath
      }
    })
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
    const cancel = scrollToIndexSoon({
      resolveIndex: () => rows.findIndex((row) => rowKeyMatchesRenderRow(row, revealRowKey)),
      rows,
      virtualizer,
      markDirectScrollInput,
      onIssued: () => {
        lastRevealedRowKeyRef.current = revealRowKey
        onRevealIssued?.()
      }
    })
    return cancel
  }, [markDirectScrollInput, onRevealIssued, revealRowKey, rows, virtualizer])
}
