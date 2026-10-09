import React from 'react'
import type { GitWorktreeInfo, HydraProject } from '../types'
import WorkspaceBoardStatusLane from './WorkspaceBoardStatusLane'
import type { WorkspaceBoardLane } from './workspace-board-worktrees'

type WorkspaceBoardLaneGridProps = {
  lanes: readonly WorkspaceBoardLane[]
  columnWidth: number
  compactCards: boolean
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
 * every card, so the horizontal scroller owns the overflow instead of a windowed
 * grid (which would need the drag/drop and measurement machinery it is missing).
 */
export default function WorkspaceBoardLaneGrid({
  lanes,
  columnWidth,
  compactCards,
  onActivate,
  onSelectSession,
  onContextMenu,
}: WorkspaceBoardLaneGridProps): React.JSX.Element {
  return (
    <div className="flex h-full min-h-0 gap-3" data-workspace-board-lane-grid="">
      {lanes.map((lane) => (
        <WorkspaceBoardStatusLane
          key={lane.status.id}
          status={lane.status}
          cards={lane.cards}
          columnWidth={columnWidth}
          compactCards={compactCards}
          onActivate={onActivate}
          onSelectSession={onSelectSession}
          onContextMenu={onContextMenu}
        />
      ))}
    </div>
  )
}
