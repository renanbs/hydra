import React from 'react'
import type { WorkspaceStatus } from '../../../shared/worktree/types'
import type { GitWorktreeInfo, HydraProject } from '../types'
import WorkspaceBoardStatusLane from './WorkspaceBoardStatusLane'
import type { WorkspaceBoardLane } from './workspace-board-worktrees'

type WorkspaceBoardLaneGridProps = {
  lanes: readonly WorkspaceBoardLane[]
  /** True while a query narrows the board; the lanes print "matches / total". */
  hasQuery: boolean
  columnWidth: number
  compactCards: boolean
  /** The element the card drag measures its lanes against and hit-tests inside. */
  boardRef: React.RefObject<HTMLDivElement | null>
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
 * Orca's lane row without the virtualizer: this increment renders every lane and
 * every card, so the horizontal scroller owns the overflow and the card drag reads
 * the lanes' live rects instead of a windowed grid's measured window. The grid root
 * is the board the drag hit-tests inside.
 */
export default function WorkspaceBoardLaneGrid({
  lanes,
  hasQuery,
  columnWidth,
  compactCards,
  boardRef,
  dropTargetStatus,
  onCardPointerDownCapture,
  onActivate,
  onSelectSession,
  onContextMenu,
}: WorkspaceBoardLaneGridProps): React.JSX.Element {
  return (
    <div
      ref={boardRef}
      className="flex h-full min-h-0 gap-3"
      data-workspace-board-lane-grid=""
      onPointerDownCapture={onCardPointerDownCapture}
    >
      {lanes.map((lane) => (
        <WorkspaceBoardStatusLane
          key={lane.status.id}
          status={lane.status}
          cards={lane.cards}
          totalCount={lane.totalCount}
          hasQuery={hasQuery}
          columnWidth={columnWidth}
          compactCards={compactCards}
          isDropTarget={dropTargetStatus === lane.status.id}
          onActivate={onActivate}
          onSelectSession={onSelectSession}
          onContextMenu={onContextMenu}
        />
      ))}
    </div>
  )
}
