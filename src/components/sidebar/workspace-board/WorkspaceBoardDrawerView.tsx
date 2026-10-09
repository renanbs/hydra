import React from 'react'
import type { WorkspaceStatus } from '../../../shared/worktree/types'
import type { GitWorktreeInfo, HydraProject } from '../types'
import WorkspaceBoardHeader from './WorkspaceBoardHeader'
import WorkspaceBoardLaneGrid from './WorkspaceBoardLaneGrid'
import WorkspaceBoardSheet from './WorkspaceBoardSheet'
import type { WorkspaceBoardGeometry } from './use-workspace-board-geometry'
import type { WorkspaceBoardStatusActions } from './use-workspace-board-status-actions'
import type { WorkspaceBoardLane } from './workspace-board-worktrees'

type WorkspaceBoardDrawerViewProps = {
  open: boolean
  geometry: WorkspaceBoardGeometry
  lanes: readonly WorkspaceBoardLane[]
  columnWidth: number
  compactCards: boolean
  boardRef: React.RefObject<HTMLDivElement | null>
  dropTargetStatus: WorkspaceStatus | null
  /** The board's status CRUD, owned by the drawer and rendered into the header. */
  statusActions: WorkspaceBoardStatusActions
  /** Board search state, threaded to the header field and the lane counts. */
  query: string
  isFiltering: boolean
  isTooLarge: boolean
  matchCount: number
  totalCount: number
  onQueryChange: (query: string) => void
  onClearQuery: () => void
  onCardPointerDownCapture: (event: React.PointerEvent<HTMLElement>) => void
  onOpenChange: (open: boolean) => void
  onActivate: (worktree: GitWorktreeInfo) => void
  onSelectSession?: (sessionId: string) => void
  onContextMenu?: (
    event: React.MouseEvent,
    worktree: GitWorktreeInfo,
    project: HydraProject
  ) => void
}

/** Ported from Orca `WorkspaceKanbanDrawerView`, minus the overlay/multi-select machinery. */
export default function WorkspaceBoardDrawerView({
  open,
  geometry,
  lanes,
  columnWidth,
  compactCards,
  boardRef,
  dropTargetStatus,
  statusActions,
  query,
  isFiltering,
  isTooLarge,
  matchCount,
  totalCount,
  onQueryChange,
  onClearQuery,
  onCardPointerDownCapture,
  onOpenChange,
  onActivate,
  onSelectSession,
  onContextMenu,
}: WorkspaceBoardDrawerViewProps): React.JSX.Element {
  // Why the drawer owns the lane row's scroller: the lanes are virtualized inside it. It is
  // handed to the grid as an element, not a ref — the grid is a child of this scroller, so its
  // layout effects run before this element's own ref is attached.
  const [laneScrollerElement, setLaneScrollerElement] = React.useState<HTMLDivElement | null>(null)
  return (
    <WorkspaceBoardSheet geometry={geometry} open={open} onOpenChange={onOpenChange}>
      <WorkspaceBoardHeader
        query={query}
        isFiltering={isFiltering}
        isTooLarge={isTooLarge}
        matchCount={matchCount}
        totalCount={totalCount}
        onQueryChange={onQueryChange}
        onClearQuery={onClearQuery}
        onClose={() => onOpenChange(false)}
        statusActions={statusActions}
      />
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden p-3">
        <div
          ref={setLaneScrollerElement}
          data-workspace-board-lanes-scroller=""
          className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden scrollbar-sleek"
        >
          <WorkspaceBoardLaneGrid
            open={open}
            lanes={lanes}
            hasQuery={isFiltering}
            columnWidth={columnWidth}
            compactCards={compactCards}
            boardRef={boardRef}
            laneScrollerElement={laneScrollerElement}
            dropTargetStatus={dropTargetStatus}
            onCardPointerDownCapture={onCardPointerDownCapture}
            onActivate={onActivate}
            onSelectSession={onSelectSession}
            onContextMenu={onContextMenu}
          />
        </div>
      </div>
    </WorkspaceBoardSheet>
  )
}
