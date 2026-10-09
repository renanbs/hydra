import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import type React from 'react'

/** Viewport-space box the board sheet occupies, derived from the sidebar itself. */
export type WorkspaceBoardGeometry = {
  left: number
  top: number
  bottom: number
}

const ZERO_GEOMETRY: WorkspaceBoardGeometry = { left: 0, top: 0, bottom: 0 }

/**
 * Why measure instead of recompute: the board is a fixed-position companion panel
 * while the sidebar is a flex child, so its left edge is the sidebar's own right
 * edge. Reading that box keeps the board aligned with the real chrome (titlebar
 * above, status bar below) and with live resize drafts, which never reach React
 * state.
 */
export function useWorkspaceBoardGeometry(
  sidebarRef: React.RefObject<HTMLElement | null>,
  enabled: boolean
): WorkspaceBoardGeometry {
  const [geometry, setGeometry] = useState<WorkspaceBoardGeometry>(ZERO_GEOMETRY)

  const measure = useCallback(() => {
    const rect = sidebarRef.current?.getBoundingClientRect()
    if (!rect) return
    setGeometry({
      left: rect.right,
      top: rect.top,
      bottom: Math.max(0, window.innerHeight - rect.bottom),
    })
  }, [sidebarRef])

  useLayoutEffect(() => {
    if (!enabled) return
    measure()
  }, [enabled, measure])

  useEffect(() => {
    if (!enabled) return
    window.addEventListener('resize', measure)
    // jsdom has no ResizeObserver; without it the board still opens, it just does
    // not track a resize draft — which is all the browser ever needed anyway.
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => measure())
    if (observer && sidebarRef.current) {
      observer.observe(sidebarRef.current)
    }
    return () => {
      window.removeEventListener('resize', measure)
      observer?.disconnect()
    }
  }, [enabled, measure, sidebarRef])

  return geometry
}
