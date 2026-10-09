import React from 'react'
import type { GitWorktreeInfo, HydraProject } from '../types'
import WorkspaceBoardHeader from './WorkspaceBoardHeader'
import WorkspaceBoardLaneGrid from './WorkspaceBoardLaneGrid'
import WorkspaceBoardSheet from './WorkspaceBoardSheet'
import type { WorkspaceBoardGeometry } from './use-workspace-board-geometry'
import type { WorkspaceBoardLane } from './workspace-board-worktrees'

type WorkspaceBoardDrawerViewProps = {
  open: boolean
  geometry: WorkspaceBoardGeometry
  lanes: readonly WorkspaceBoardLane[]
  columnWidth: number
  compactCards: boolean
  onOpenChange: (open: boolean) => void
  onActivate: (worktree: GitWorktreeInfo) => void
  onSelectSession?: (sessionId: string) => void
  onContextMenu?: (
    event: React.MouseEvent,
    worktree: GitWorktreeInfo,
    project: HydraProject
  ) => void
}

/** Ported from Orca `WorkspaceKanbanDrawerView`, minus the overlay/drag machinery. */
export default function WorkspaceBoardDrawerView({
  open,
  geometry,
  lanes,
  columnWidth,
  compactCards,
  onOpenChange,
  onActivate,
  onSelectSession,
  onContextMenu,
}: WorkspaceBoardDrawerViewProps): React.JSX.Element {
  return (
    <WorkspaceBoardSheet geometry={geometry} open={open} onOpenChange={onOpenChange}>
      <WorkspaceBoardHeader onClose={() => onOpenChange(false)} />
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden p-3">
        <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden scrollbar-sleek">
          <WorkspaceBoardLaneGrid
            lanes={lanes}
            columnWidth={columnWidth}
            compactCards={compactCards}
            onActivate={onActivate}
            onSelectSession={onSelectSession}
            onContextMenu={onContextMenu}
          />
        </div>
      </div>
    </WorkspaceBoardSheet>
  )
}
