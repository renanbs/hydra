// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: orca/src/renderer/src/components/sidebar/worktree-list/viewport/use-scroll-suppression.ts
//
// Tracks the suppression window the virtualizer honours: while the user is driving the
// scroll, TanStack must not write scrollTop from a mid-wheel measurement correction — that
// reads as rubber-banding.
//
// Also owns the reveal settle window (D06-034): a smooth reveal the sidebar issued is cancelled
// by any other scrollTop write, and the scroll-anchor restore writes exactly that.
import { useCallback, useEffect, useRef } from 'react'
import { isRevealScrollSettlingForContainer } from '../../worktree-sidebar-reveal-scroll-settle'

/**
 * Fired by an expanding agent panel so the row may grow in place instead of the virtualizer
 * compensating scrollTop for it. Produced by the compact agent list's disclosure toggle.
 */
export const SUPPRESS_WORKTREE_LIST_SCROLL_ADJUSTMENT_EVENT =
  'hydra-suppress-worktree-list-scroll-adjustment'

export const USER_SCROLL_MEASUREMENT_ADJUSTMENT_SUPPRESS_MS = 500
export const EXPANDING_CARD_MEASUREMENT_ADJUSTMENT_SUPPRESS_MS = 300

export function shouldAdjustWorktreeSidebarMeasuredRowScroll(args: {
  isScrolling: boolean
  now: number
  suppressUntil: number
}): boolean {
  return !args.isScrolling && args.now >= args.suppressUntil
}

export function useWorktreeSidebarScrollSuppression(
  args: {
    /** The scroll container whose issued reveal scrolls must not be interrupted. */
    scrollRef?: { current: Element | null }
  } = {}
) {
  const { scrollRef } = args
  const suppressMeasurementAdjustmentUntilRef = useRef(0)
  const directScrollInputUntilRef = useRef(0)

  const markScrollMovement = useCallback(() => {
    suppressMeasurementAdjustmentUntilRef.current =
      window.performance.now() + USER_SCROLL_MEASUREMENT_ADJUSTMENT_SUPPRESS_MS
  }, [])
  const markDirectScrollInput = useCallback(() => {
    const suppressUntil = window.performance.now() + USER_SCROLL_MEASUREMENT_ADJUSTMENT_SUPPRESS_MS
    suppressMeasurementAdjustmentUntilRef.current = suppressUntil
    directScrollInputUntilRef.current = suppressUntil
  }, [])
  const hasDirectScrollInput = useCallback(
    () => window.performance.now() < directScrollInputUntilRef.current,
    []
  )
  // Why: programmatic scrolls keep measurement correction quiet, but only direct user input
  // blocks an anchor restore — a restore mid-gesture would fight the scroll the user owns.
  // A reveal the sidebar issued is treated the same way: it is our own animation, and the
  // restore's scrollTop write would cancel it mid-flight.
  const shouldSkipScrollAnchorRestore = useCallback(() => {
    const container = scrollRef?.current ?? null
    if (container && isRevealScrollSettlingForContainer(container, container.scrollTop)) {
      return true
    }
    return window.performance.now() < directScrollInputUntilRef.current
  }, [scrollRef])

  useEffect(() => {
    const handleSuppress = (): void => {
      suppressMeasurementAdjustmentUntilRef.current =
        window.performance.now() + EXPANDING_CARD_MEASUREMENT_ADJUSTMENT_SUPPRESS_MS
    }
    window.addEventListener(SUPPRESS_WORKTREE_LIST_SCROLL_ADJUSTMENT_EVENT, handleSuppress)
    return () => {
      window.removeEventListener(SUPPRESS_WORKTREE_LIST_SCROLL_ADJUSTMENT_EVENT, handleSuppress)
    }
  }, [])

  return {
    suppressMeasurementAdjustmentUntilRef,
    markScrollMovement,
    markDirectScrollInput,
    hasDirectScrollInput,
    shouldSkipScrollAnchorRestore
  }
}
