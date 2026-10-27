import React from 'react'
import type { WorkspaceStatus } from '../../../shared/worktree/types'
import type { GitWorktreeInfo } from '../types'
import WorkspaceBoardHeader from './WorkspaceBoardHeader'
import WorkspaceBoardLaneGrid from './WorkspaceBoardLaneGrid'
import WorkspaceBoardSheet from './WorkspaceBoardSheet'
import type { WorkspaceBoardGeometry } from './use-workspace-board-geometry'
import type { WorkspaceBoardStatusActions } from './use-workspace-board-status-actions'
import type {
  WorkspaceBoardCard as WorkspaceBoardCardModel,
  WorkspaceBoardLane
} from './workspace-board-worktrees'

type WorkspaceBoardDrawerViewProps = {
  open: boolean
  geometry: WorkspaceBoardGeometry
  lanes: readonly WorkspaceBoardLane[]
  columnWidth: number
  isResizingColumn: boolean
  onColumnResizeStart: (event: React.PointerEvent<HTMLElement>) => void
  onColumnResizeKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void
  compactCards: boolean
  boardRef: React.RefObject<HTMLDivElement | null>
  /**
   * The lane row's scroller, also owned by the drawer: the Shift+wheel scroll writes its
   * `scrollLeft` imperatively, so the resize/scroll hooks and the grid share one element.
   */
  laneScrollerRef: React.RefObject<HTMLDivElement | null>
  /** The marquee's own box, painted imperatively while a selection drag is in flight. */
  areaSelectionOverlayRef: React.RefObject<HTMLDivElement | null>
  dropTargetStatus: WorkspaceStatus | null
  /** The board's status CRUD, owned by the drawer and rendered into the header. */
  statusActions: WorkspaceBoardStatusActions
  /** Board search state, threaded to the header field and the lane counts. */
  query: string
  isFiltering: boolean
  isTooLarge: boolean
  matchCount: number
  totalCount: number
  /** How many of the cards the board shows are selected; the header's count badge. */
  selectedCount: number
  /** The board's selection, by host-qualified card identity. */
  selectedWorktreeIds: ReadonlySet<string>
  /** Opens the workspace composer with the clicked lane's status preselected. */
  onCreateWorktree: (workspaceStatus: WorkspaceStatus) => void
  onQueryChange: (query: string) => void
  onClearQuery: () => void
  onCardPointerDownCapture: (event: React.PointerEvent<HTMLElement>) => void
  onAreaSelectionPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
  onSelectionGesture: (event: React.MouseEvent<HTMLElement>, worktreeIdentity: string) => boolean
  onOpenChange: (open: boolean) => void
  onActivate: (worktree: GitWorktreeInfo) => void
  onSelectSession?: (sessionId: string) => void
  onContextMenu?: (event: React.MouseEvent, card: WorkspaceBoardCardModel) => void
}

/**
 * Ported from Orca `WorkspaceKanbanDrawerView` (minus the pin drop target and the contextual
 * tour, which are not part of this increment).
 *
 * Why the marquee listens on its own surface, below the header: a press on the board's padded
 * area around and between the lanes is the "empty space" a marquee starts from, and the cards
 * inside it own their own presses (`onCardPointerDownCapture`). The marquee's own box is painted
 * inside the lane grid (the board's coordinate space) so its `translate3d` and the hit test
 * measure against the same origin.
 */
export default function WorkspaceBoardDrawerView({
  open,
  geometry,
  lanes,
  columnWidth,
  isResizingColumn,
  onColumnResizeStart,
  onColumnResizeKeyDown,
  compactCards,
  boardRef,
  laneScrollerRef,
  areaSelectionOverlayRef,
  dropTargetStatus,
  statusActions,
  query,
  isFiltering,
  isTooLarge,
  matchCount,
  totalCount,
  selectedCount,
  selectedWorktreeIds,
  onCreateWorktree,
  onQueryChange,
  onClearQuery,
  onCardPointerDownCapture,
  onAreaSelectionPointerDown,
  onSelectionGesture,
  onOpenChange,
  onActivate,
  onSelectSession,
  onContextMenu,
}: WorkspaceBoardDrawerViewProps): React.JSX.Element {
  // Why the drawer owns the lane row's scroller: the lanes are virtualized inside it. It is
  // handed to the grid as an element, not a ref — the grid is a child of this scroller, so its
  // layout effects run before this element's own ref is attached. The same node is published on
  // `laneScrollerRef` for the Shift+wheel scroll, which writes `scrollLeft` imperatively.
  const [laneScrollerElement, setLaneScrollerElement] = React.useState<HTMLDivElement | null>(null)
  const attachLaneScroller = React.useCallback(
    (node: HTMLDivElement | null) => {
      laneScrollerRef.current = node
      setLaneScrollerElement(node)
    },
    [laneScrollerRef]
  )
  return (
    <WorkspaceBoardSheet geometry={geometry} open={open} onOpenChange={onOpenChange}>
      <WorkspaceBoardHeader
        query={query}
        isFiltering={isFiltering}
        isTooLarge={isTooLarge}
        matchCount={matchCount}
        totalCount={totalCount}
        selectedCount={selectedCount}
        onQueryChange={onQueryChange}
        onClearQuery={onClearQuery}
        onClose={() => onOpenChange(false)}
        statusActions={statusActions}
      />
      <div
        data-workspace-board-selection-surface=""
        className="relative flex min-h-0 flex-1 flex-col overflow-hidden p-3"
        onPointerDown={onAreaSelectionPointerDown}
      >
        <div
          ref={attachLaneScroller}
          data-workspace-board-lanes-scroller=""
          className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden scrollbar-sleek"
        >
          <WorkspaceBoardLaneGrid
            open={open}
            lanes={lanes}
            hasQuery={isFiltering}
            columnWidth={columnWidth}
            isResizingColumn={isResizingColumn}
            onColumnResizeStart={onColumnResizeStart}
            onColumnResizeKeyDown={onColumnResizeKeyDown}
            compactCards={compactCards}
            boardRef={boardRef}
            laneScrollerElement={laneScrollerElement}
            dropTargetStatus={dropTargetStatus}
            areaSelectionOverlayRef={areaSelectionOverlayRef}
            selectedWorktreeIds={selectedWorktreeIds}
            onCreateWorktree={onCreateWorktree}
            onSelectionGesture={onSelectionGesture}
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
