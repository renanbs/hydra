import { startTransition, useEffect, useLayoutEffect, useRef, useState } from 'react'

/** Stable empty set: a fresh one per render would re-render every lane for nothing. */
const EMPTY_HYDRATED_LANE_IDS: ReadonlySet<string> = new Set<string>()

/**
 * Progressive hydration of the board's lanes: the grid paints the lane shells as soon as it
 * opens, and one lane's cards mount per animation frame, inside a transition. Opening a board
 * with hundreds of rich cards then costs a frame each instead of one blocking render.
 *
 * Ported from Orca `use-workspace-kanban-render-lifecycle` + the per-lane effect of
 * `WorkspaceKanbanLaneGrid`: the first frame hydrates the first lane (Orca's extra
 * `renderCards` frame only delayed the sheet's first card), and only lanes inside the
 * virtualizer's window are hydrated — a lane that scrolls out drops its cards again, so the
 * set stays bounded by the window, not by the board.
 */
export function useWorkspaceBoardLaneHydration(args: {
  open: boolean
  laneIds: readonly string[]
}): ReadonlySet<string> {
  const { open, laneIds } = args
  const [hydratedLaneIds, setHydratedLaneIds] =
    useState<ReadonlySet<string>>(EMPTY_HYDRATED_LANE_IDS)
  const hydratedLaneIdsRef = useRef(hydratedLaneIds)
  const laneIdsRef = useRef(laneIds)
  useLayoutEffect(() => {
    hydratedLaneIdsRef.current = hydratedLaneIds
    laneIdsRef.current = laneIds
  }, [hydratedLaneIds, laneIds])

  useEffect(() => {
    if (!open) {
      setHydratedLaneIds(EMPTY_HYDRATED_LANE_IDS)
      return
    }
    const windowLaneIds = new Set(laneIds)
    setHydratedLaneIds((current) => {
      const retained = new Set(Array.from(current).filter((laneId) => windowLaneIds.has(laneId)))
      return retained.size === current.size ? current : retained
    })
    const missingLaneIds = laneIds.filter((laneId) => !hydratedLaneIdsRef.current.has(laneId))
    let nextIndex = 0
    let frameId = 0
    const hydrateNextLane = (): void => {
      const laneId = missingLaneIds[nextIndex]
      nextIndex += 1
      if (laneId === undefined) {
        return
      }
      startTransition(() => {
        setHydratedLaneIds((current) => {
          // Why: the window may have moved while this frame was queued; hydrating a lane
          // that is no longer mounted would add an id nothing can paint.
          if (!laneIdsRef.current.includes(laneId)) {
            return current
          }
          return new Set(current).add(laneId)
        })
      })
      if (nextIndex < missingLaneIds.length) {
        frameId = window.requestAnimationFrame(hydrateNextLane)
      }
    }
    if (missingLaneIds.length > 0) {
      frameId = window.requestAnimationFrame(hydrateNextLane)
    }
    return () => window.cancelAnimationFrame(frameId)
  }, [laneIds, open])

  return hydratedLaneIds
}
