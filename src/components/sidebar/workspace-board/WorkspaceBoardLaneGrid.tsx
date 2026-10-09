import React, {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import { useVirtualizer, type Range } from '@tanstack/react-virtual'
import type { WorkspaceStatus } from '../../../shared/worktree/types'
import type { GitWorktreeInfo, HydraProject } from '../types'
import { useWorkspaceBoardLaneHydration } from './use-workspace-board-lane-hydration'
import WorkspaceBoardStatusLane from './WorkspaceBoardStatusLane'
import { registerWorkspaceBoardVirtualLaneLayout } from './workspace-board-virtual-lane-layout'
import {
  registerWorkspaceBoardSidebarDropBoard,
  useWorkspaceBoardSidebarDropTargetStatus
} from './workspace-board-sidebar-drop'
import {
  WORKSPACE_BOARD_LANE_GAP,
  WORKSPACE_BOARD_LANE_OVERSCAN,
  extractWorkspaceBoardLaneRange
} from './workspace-board-virtual-lanes'
import type { WorkspaceBoardLane } from './workspace-board-worktrees'

type WorkspaceBoardLaneGridProps = {
  /** Whether the board is open; hydration only runs while it is. */
  open: boolean
  lanes: readonly WorkspaceBoardLane[]
  /** True while a query narrows the board; the lanes print "matches / total". */
  hasQuery: boolean
  columnWidth: number
  compactCards: boolean
  /** The element the card drag measures its lanes against and hit-tests inside. */
  boardRef: React.RefObject<HTMLDivElement | null>
  /**
   * The lane row's scroller; the virtualizer windows the lanes inside it. An element, not a
   * ref: the grid is a child of that scroller, so its layout effects run before the scroller's
   * own element ref is attached.
   */
  laneScrollerElement: HTMLDivElement | null
  /** Destination lane of the card drag in flight, for the lane highlight. */
  dropTargetStatus: WorkspaceStatus | null
  onCardPointerDownCapture: (event: React.PointerEvent<HTMLElement>) => void
  onActivate: (worktree: GitWorktreeInfo) => void
  onSelectSession?: (sessionId: string) => void
  onContextMenu?: (
    event: React.MouseEvent,
    worktree: GitWorktreeInfo,
    project: HydraProject
  ) => void
}

/**
 * Ported from Orca `WorkspaceKanbanLaneGrid`: the lane row is virtualized on the horizontal
 * axis with overscan 1, and the lane the board is focused on — the card drag's destination, or
 * the lane a focused card belongs to — is force-included in the painted range, so it is never
 * unmounted from under the pointer or the keyboard.
 *
 * Why the grid element is the board's hit-test root: it is the spacer the virtualizer sizes,
 * so a lane outside the window still has a measurable slot here even though it paints nothing.
 * The measured layout is published to the card drag for exactly that reason.
 *
 * Why the lanes are not DOM-measured (Orca does measure them): Orca's column-resize handle
 * changes a lane's width under the virtualizer. This increment ships no resize handle, so the
 * persisted column width *is* the lane width and the virtualizer is re-measured when it
 * changes.
 */
export default function WorkspaceBoardLaneGrid({
  open,
  lanes,
  hasQuery,
  columnWidth,
  compactCards,
  boardRef,
  laneScrollerElement,
  dropTargetStatus,
  onCardPointerDownCapture,
  onActivate,
  onSelectSession,
  onContextMenu,
}: WorkspaceBoardLaneGridProps): React.JSX.Element {
  const [focusedStatusId, setFocusedStatusId] = useState<WorkspaceStatus | null>(null)
  const laneStatusIds = useMemo(() => lanes.map((lane) => lane.status.id), [lanes])
  const laneStatusIdsRef = useRef(laneStatusIds)
  const retainedStatusId = dropTargetStatus ?? focusedStatusId
  const retainedIndex = useMemo(
    () => (retainedStatusId === null ? null : laneStatusIds.indexOf(retainedStatusId)),
    [laneStatusIds, retainedStatusId]
  )
  const estimateLaneSize = useCallback(() => columnWidth, [columnWidth])
  const getLaneKey = useCallback(
    (index: number) => laneStatusIds[index] ?? index,
    [laneStatusIds]
  )
  const rangeExtractor = useCallback(
    (range: Range) => extractWorkspaceBoardLaneRange(range, retainedIndex),
    [retainedIndex]
  )
  const laneVirtualizer = useVirtualizer({
    count: lanes.length,
    getScrollElement: () => laneScrollerElement,
    estimateSize: estimateLaneSize,
    getItemKey: getLaneKey,
    horizontal: true,
    overscan: WORKSPACE_BOARD_LANE_OVERSCAN,
    gap: WORKSPACE_BOARD_LANE_GAP,
    rangeExtractor,
    useFlushSync: false
  })
  useLayoutEffect(() => {
    laneVirtualizer.measure()
  }, [columnWidth, laneVirtualizer])
  useLayoutEffect(() => {
    laneStatusIdsRef.current = laneStatusIds
  }, [laneStatusIds])
  useLayoutEffect(() => {
    const gridElement = boardRef.current
    if (!gridElement) {
      return
    }
    return registerWorkspaceBoardVirtualLaneLayout({
      gridElement,
      getLaneStatusIds: () => laneStatusIdsRef.current,
      getMeasurements: () => laneVirtualizer.measurementsCache
    })
  }, [boardRef, laneVirtualizer])
  // Why gated on `open`: the sheet lingers through its close animation, and a board the
  // user dismissed must not stay a destination for the sidebar list's drag.
  useLayoutEffect(() => {
    const gridElement = boardRef.current
    if (!gridElement || !open) {
      return
    }
    return registerWorkspaceBoardSidebarDropBoard({ boardElement: gridElement })
  }, [boardRef, open])

  const virtualLanes = laneVirtualizer.getVirtualItems()
  const windowLaneIds = useMemo(
    () =>
      virtualLanes.flatMap((virtualLane) => {
        const statusId = laneStatusIds[virtualLane.index]
        return statusId === undefined ? [] : [statusId]
      }),
    [laneStatusIds, virtualLanes]
  )
  const hydratedLaneIds = useWorkspaceBoardLaneHydration({ open, laneIds: windowLaneIds })
  // Why the fallback: a sidebar-list drag publishes its destination lane here — the two
  // drags are one gesture apart, so whichever is live is the lane that paints.
  const sidebarDropTargetStatus = useWorkspaceBoardSidebarDropTargetStatus()
  const laneDropTargetStatus = dropTargetStatus ?? sidebarDropTargetStatus

  return (
    <div
      ref={boardRef}
      className="relative h-full min-h-0 min-w-full"
      data-workspace-board-lane-grid=""
      style={{ width: `${laneVirtualizer.getTotalSize()}px` }}
      onPointerDownCapture={onCardPointerDownCapture}
      onFocusCapture={(event) => {
        const lane = (event.target as Element).closest<HTMLElement>('[data-workspace-status]')
        setFocusedStatusId(lane?.dataset.workspaceStatus ?? null)
      }}
      onBlurCapture={(event) => {
        const nextTarget = event.relatedTarget
        if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
          setFocusedStatusId(null)
        }
      }}
    >
      {virtualLanes.map((virtualLane) => {
        const lane = lanes[virtualLane.index]
        if (!lane) {
          return null
        }
        return (
          <div
            key={virtualLane.key}
            className="absolute left-0 top-0 h-full"
            style={{
              width: `${columnWidth}px`,
              transform: `translateX(${virtualLane.start}px)`
            }}
          >
            <WorkspaceBoardStatusLane
              status={lane.status}
              cards={lane.cards}
              totalCount={lane.totalCount}
              hasQuery={hasQuery}
              renderCards={hydratedLaneIds.has(lane.status.id)}
              columnWidth={columnWidth}
              compactCards={compactCards}
              isDropTarget={laneDropTargetStatus === lane.status.id}
              onActivate={onActivate}
              onSelectSession={onSelectSession}
              onContextMenu={onContextMenu}
            />
          </div>
        )
      })}
    </div>
  )
}
