import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { useAppStore } from '@/store'
import type { WorkspaceStatus } from '../../../shared/worktree/types'
import type { PrDisplay } from '../pr-display'
import type { GitWorktreeInfo, HydraProject, WorkspacePort, WorktreeSession } from '../types'
import type { WorkspaceDisplayOptions } from '../WorkspaceOptionsMenu'
import WorkspaceBoardDrawerView from './WorkspaceBoardDrawerView'
import { useWorkspaceBoardAreaSelection } from './use-workspace-board-area-selection'
import { useWorkspaceBoardCardPointerDrag } from './drag/use-workspace-board-card-pointer-drag'
import { useWorkspaceBoardColumnResize } from './use-workspace-board-column-resize'
import { useWorkspaceBoardGeometry, type WorkspaceBoardGeometry } from './use-workspace-board-geometry'
import { useWorkspaceBoardProjection } from './use-workspace-board-projection'
import { useWorkspaceBoardSearch } from './use-workspace-board-search'
import { useWorkspaceBoardSelection } from './use-workspace-board-selection'
import { useWorkspaceBoardShiftWheelScroll } from './use-workspace-board-shift-wheel-scroll'
import { useWorkspaceBoardStatusActions } from './use-workspace-board-status-actions'
import { filterWorkspaceBoardLanes } from './workspace-board-search'
import {
  isWorkspaceBoardSelectAllShortcut,
  isWorkspaceBoardTextEntryTarget
} from './workspace-board-selection'
import { resolveWorkspaceBoardStatusAssignmentTargets } from './workspace-board-status-assignment'
import type { WorkspaceBoardCard as WorkspaceBoardCardModel } from './workspace-board-worktrees'

export type WorkspaceBoardDrawerProps = {
  /** Whether the user has the board open (the sheet's own `open` state). */
  open: boolean
  /** Whether the drawer may stay mounted; outlives `open` by the close animation. */
  renderedOpen: boolean
  /** The sidebar's own element, measured for the sheet's viewport box. */
  sidebarRef: React.RefObject<HTMLElement | null>
  displayProjects: readonly HydraProject[]
  getProjectWorktrees: (project: HydraProject) => GitWorktreeInfo[]
  sessions: readonly WorktreeSession[]
  displayOptions: WorkspaceDisplayOptions
  activeWorktreePath?: string | null
  liveWorkspacePaths?: ReadonlySet<string>
  pinnedWorktreePaths?: ReadonlySet<string>
  unreadWorktreePaths?: ReadonlySet<string>
  portsByWorktree?: ReadonlyMap<string, WorkspacePort[]>
  prByPath?: Readonly<Record<string, PrDisplay>>
  compactCards: boolean
  /**
   * Every workspace of every project, unfiltered. The board's lanes read the sidebar's
   * visible set, but removing a status has to migrate the workspaces the sidebar hides
   * too, so the CRUD gets the unfiltered list.
   */
  allWorktrees: readonly GitWorktreeInfo[]
  /**
   * The app's own status write (`set_worktree_status` + the local worktree maps the
   * sidebar projects from). The board's card drop commits through it — the board never
   * grows a second writer for the same column.
   */
  onAssignWorktreeStatus: (worktreePath: string, status: WorkspaceStatus) => void | Promise<void>
  /**
   * The app's own pin write (`set_worktree_flags` with `is_pinned`). A card dropped on the
   * board's pin strip commits through it — the board never grows a second writer for the
   * pin, and a pin drop never writes a status (D08-028).
   */
  onPinWorktree: (worktreePath: string) => void
  /**
   * Opens the workspace composer (the sidebar's own modal) with the clicked lane's status
   * preselected (D08-021/D08-030). The board never grows a second modal mechanism; the
   * app owns the composer and clears the preselected status when it closes.
   */
  onCreateWorktree: (workspaceStatus: WorkspaceStatus) => void
  onOpenChange: (open: boolean) => void
  onSelectWorktree: (worktree: GitWorktreeInfo) => void
  onSelectSession?: (sessionId: string) => void
  /**
   * The sidebar's worktree menu, which is also the board card's menu. The fourth argument is
   * the board's selection-aware target list: the status the user picks applies to the whole
   * set when the right-clicked card is part of it (Orca's `activeContextWorktrees`).
   */
  onWorktreeContextMenu?: (
    event: React.MouseEvent,
    worktree: GitWorktreeInfo,
    project: HydraProject,
    targetWorktreePaths?: readonly string[]
  ) => void
}

/**
 * Ported from Orca `WorkspaceKanbanDrawer`: the linger gate keeps the sheet
 * mounted through its exit animation, and everything below it — the projection
 * and the cards — only exists while the board is rendered, so a closed board
 * costs nothing.
 */
export default function WorkspaceBoardDrawer(
  props: WorkspaceBoardDrawerProps
): React.JSX.Element | null {
  const geometry = useWorkspaceBoardGeometry(props.sidebarRef, props.renderedOpen)
  if (!props.renderedOpen) {
    return null
  }
  return <WorkspaceBoardDrawerContent {...props} geometry={geometry} />
}

function WorkspaceBoardDrawerContent({
  open,
  displayProjects,
  getProjectWorktrees,
  sessions,
  displayOptions,
  activeWorktreePath,
  liveWorkspacePaths,
  pinnedWorktreePaths,
  unreadWorktreePaths,
  portsByWorktree,
  prByPath,
  compactCards,
  allWorktrees,
  onAssignWorktreeStatus,
  onPinWorktree,
  onCreateWorktree,
  onOpenChange,
  onSelectWorktree,
  onSelectSession,
  onWorktreeContextMenu,
  geometry,
}: WorkspaceBoardDrawerProps & {
  geometry: WorkspaceBoardGeometry
}): React.JSX.Element {
  const { lanes, columnWidth: committedColumnWidth } = useWorkspaceBoardProjection({
    displayProjects,
    getProjectWorktrees,
    sessions,
    displayOptions,
    activeWorktreePath,
    liveWorkspacePaths,
    pinnedWorktreePaths,
    unreadWorktreePaths,
    portsByWorktree,
    prByPath,
  })
  const setWorkspaceBoardColumnWidth = useAppStore((state) => state.setWorkspaceBoardColumnWidth)
  const { columnWidth, isResizingColumn, onColumnResizeStart, onColumnResizeKeyDown } =
    useWorkspaceBoardColumnResize(committedColumnWidth, setWorkspaceBoardColumnWidth)
  const boardRef = useRef<HTMLDivElement | null>(null)
  const laneScrollerRef = useRef<HTMLDivElement | null>(null)
  const areaSelectionOverlayRef = useRef<HTMLDivElement | null>(null)
  const { onCardPointerDownCapture, dropTargetStatus, pinDropTargetActive, isPointerDragActiveRef } =
    useWorkspaceBoardCardPointerDrag({
      open,
      boardRef,
      onAssignWorktreeStatus,
      onPinWorktree,
    })
  useWorkspaceBoardShiftWheelScroll(boardRef, laneScrollerRef, open, isPointerDragActiveRef)
  const statusActions = useWorkspaceBoardStatusActions({ allWorktrees, onAssignWorktreeStatus })
  const boardCards = useMemo(() => lanes.flatMap((lane) => lane.cards), [lanes])
  const { query, setQuery, clearQuery, matchingWorktreeIds, isFiltering, isQueryTooLarge } =
    useWorkspaceBoardSearch({ open, cards: boardCards })
  const filtered = useMemo(
    () => filterWorkspaceBoardLanes(lanes, matchingWorktreeIds),
    [lanes, matchingWorktreeIds]
  )
  const visibleCards = useMemo(
    () => filtered.lanes.flatMap((lane) => lane.cards),
    [filtered.lanes]
  )
  const {
    selectedWorktreeIds,
    selectionAnchorId,
    updateSelectionForGesture,
    updateSelectionForArea,
    selectForContextMenu,
    selectAllVisible
  } = useWorkspaceBoardSelection({ open, boardCards, visibleCards })
  const { handleAreaSelectionPointerDown } = useWorkspaceBoardAreaSelection({
    open,
    boardRef,
    overlayRef: areaSelectionOverlayRef,
    selectedWorktreeIds,
    selectionAnchorId,
    updateSelectionForArea
  })

  // Orca counts the *rendered* selection in the header: a card a search hides is still
  // selected, but the badge describes what the user can see and act on.
  const selectedVisibleCount = useMemo(() => {
    let count = 0
    for (const card of visibleCards) {
      if (selectedWorktreeIds.has(card.identity)) {
        count += 1
      }
    }
    return count
  }, [selectedWorktreeIds, visibleCards])

  const handleCardContextMenu = useCallback(
    (event: React.MouseEvent, card: WorkspaceBoardCardModel) => {
      if (!onWorktreeContextMenu) {
        return
      }
      const selected = selectForContextMenu(card.identity)
      // Why the narrowing: a batch assignment must not write a status to a card the search
      // hides — the user cannot see it, count it, or undo it from here.
      const visibleIdentities = new Set(visibleCards.map((visible) => visible.identity))
      onWorktreeContextMenu(
        event,
        card.worktree,
        card.project,
        resolveWorkspaceBoardStatusAssignmentTargets({
          clickedWorktreePath: card.worktree.path,
          selectedWorktreePaths: selected
            .filter((candidate) => visibleIdentities.has(candidate.identity))
            .map((candidate) => candidate.worktree.path)
        })
      )
    },
    [onWorktreeContextMenu, selectForContextMenu, visibleCards]
  )

  // Why a document listener: the board's cards are not tab stops, so a focused-descendant
  // handler would make `Mod+A` reachable only by tabbing through the sheet. The scope guard
  // keeps the shortcut with whatever surface actually owns focus (the sidebar's listbox, a
  // terminal, the search field).
  useEffect(() => {
    if (!open) {
      return
    }
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (
        !isWorkspaceBoardSelectAllShortcut(event) ||
        isWorkspaceBoardTextEntryTarget(event.target)
      ) {
        return
      }
      const sheet = boardRef.current?.closest<HTMLElement>('[data-workspace-board-sheet]')
      const active = document.activeElement
      if (active instanceof HTMLElement && active !== document.body && !sheet?.contains(active)) {
        return
      }
      event.preventDefault()
      selectAllVisible()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [boardRef, open, selectAllVisible])

  // Orca `handleWorktreeActivate`: opening a workspace from the board closes it.
  const handleActivate = useCallback(
    (worktree: GitWorktreeInfo) => {
      onSelectWorktree(worktree)
      onOpenChange(false)
    },
    [onOpenChange, onSelectWorktree]
  )

  return (
    <WorkspaceBoardDrawerView
      open={open}
      geometry={geometry}
      lanes={filtered.lanes}
      columnWidth={columnWidth}
      isResizingColumn={isResizingColumn}
      onColumnResizeStart={onColumnResizeStart}
      onColumnResizeKeyDown={onColumnResizeKeyDown}
      compactCards={compactCards}
      boardRef={boardRef}
      laneScrollerRef={laneScrollerRef}
      areaSelectionOverlayRef={areaSelectionOverlayRef}
      dropTargetStatus={dropTargetStatus}
      pinDropTargetActive={pinDropTargetActive}
      statusActions={statusActions}
      query={query}
      isFiltering={isFiltering}
      isTooLarge={isQueryTooLarge}
      matchCount={filtered.matchCount}
      totalCount={filtered.totalCount}
      selectedCount={selectedVisibleCount}
      selectedWorktreeIds={selectedWorktreeIds}
      onCreateWorktree={onCreateWorktree}
      onQueryChange={setQuery}
      onClearQuery={clearQuery}
      onCardPointerDownCapture={onCardPointerDownCapture}
      onAreaSelectionPointerDown={handleAreaSelectionPointerDown}
      onSelectionGesture={updateSelectionForGesture}
      onOpenChange={onOpenChange}
      onActivate={handleActivate}
      onSelectSession={onSelectSession}
      onContextMenu={handleCardContextMenu}
    />
  )
}
