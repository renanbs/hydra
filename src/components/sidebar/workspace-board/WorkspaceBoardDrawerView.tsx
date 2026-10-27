import React from 'react'
import type { WorkspaceStatus } from '../../../shared/worktree/types'
import type { GitWorktreeInfo } from '../types'
import WorkspaceBoardHeader from './WorkspaceBoardHeader'
import WorkspaceBoardLaneGrid from './WorkspaceBoardLaneGrid'
import WorkspaceBoardPinDropTarget from './WorkspaceBoardPinDropTarget'
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
  /** Whether a card drag — pointer or native — is over the pin strip, for its hover highlight. */
  pinDropTargetActive: boolean
  /** Native HTML5 drag over a lane (Orca's `onDragOver`): highlights the destination lane. */
  onNativeDragOver: (event: React.DragEvent<HTMLElement>, status: WorkspaceStatus) => void
  onNativeDragLeave: (event: React.DragEvent<HTMLElement>) => void
  /** Native drop on a lane: the lane's status, at the end of the lane (D08-041). */
  onNativeDrop: (event: React.DragEvent<HTMLElement>, status: WorkspaceStatus) => void
  /** Native drag over the pin strip: hover only, the lane highlight stays dark (D08-028). */
  onPinDragOver: (event: React.DragEvent<HTMLElement>) => void
  onPinDragLeave: (event: React.DragEvent<HTMLElement>) => void
  /** Native drop on the pin strip: a pin, never a status (D08-028). */
  onPinDrop: (event: React.DragEvent<HTMLElement>) => void
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
 * Ported from Orca `WorkspaceKanbanDrawerView` (minus the contextual tour, which is not part
 * of this increment).
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
  pinDropTargetActive,
  onNativeDragOver,
  onNativeDragLeave,
  onNativeDrop,
  onPinDragOver,
  onPinDragLeave,
  onPinDrop,
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
        {/* Above the lane row, as Orca places it: the strip is the board's second drop
            destination and answers before the lanes (D08-028). Its native handlers are the
            board's own — the strip pins by payload, never by pointer position. */}
        <WorkspaceBoardPinDropTarget
          open={open}
          isDragOver={pinDropTargetActive}
          onDragOver={onPinDragOver}
          onDragLeave={onPinDragLeave}
          onDrop={onPinDrop}
        />
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
            onNativeDragOver={onNativeDragOver}
            onNativeDragLeave={onNativeDragLeave}
            onNativeDrop={onNativeDrop}
          />
        </div>
      </div>
    </WorkspaceBoardSheet>
  )
}
