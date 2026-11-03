import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useAppStore } from '@/store'
import type { WorkspaceStatus } from '../../../shared/worktree/types'
import type { PrDisplay } from '../pr-display'
import type { GitWorktreeInfo, HydraProject, WorkspacePort, WorktreeSession } from '../types'
import type { WorkspaceDisplayOptions } from '../WorkspaceOptionsMenu'
import WorkspaceBoardDrawerView from './WorkspaceBoardDrawerView'
import WorkspaceBoardFilterMenu from './WorkspaceBoardFilterMenu'
import { useWorkspaceBoardAreaSelection } from './use-workspace-board-area-selection'
import { useWorkspaceBoardCardPointerDrag } from './drag/use-workspace-board-card-pointer-drag'
import type { WorkspaceBoardCardDragTarget } from './drag/use-workspace-board-card-pointer-drag'
import { useWorkspaceBoardColumnResize } from './use-workspace-board-column-resize'
import { useWorkspaceBoardGeometry, type WorkspaceBoardGeometry } from './use-workspace-board-geometry'
import { useWorkspaceBoardOutsideDismiss } from './use-workspace-board-outside-dismiss'
import { useWorkspaceBoardRenderLifecycle } from './use-workspace-board-render-lifecycle'
import { useWorkspaceBoardProjection } from './use-workspace-board-projection'
import { useWorkspaceBoardSearch } from './use-workspace-board-search'
import { useWorkspaceBoardSelection } from './use-workspace-board-selection'
import { useWorkspaceBoardShiftWheelScroll } from './use-workspace-board-shift-wheel-scroll'
import { useWorkspaceBoardNativeDrag } from './use-workspace-board-native-drag'
import { useWorkspaceBoardStatusActions } from './use-workspace-board-status-actions'
import { filterWorkspaceBoardLanes } from './workspace-board-search'
import {
  isWorkspaceBoardSelectAllShortcut,
  isWorkspaceBoardTextEntryTarget
} from './workspace-board-keyboard'
import { resolveWorktreeMultiDragSelection } from '../worktree-multi-drag-selection'
import { resolveWorkspaceBoardStatusAssignmentTargets } from './workspace-board-status-assignment'
import type { WorkspaceBoardCard as WorkspaceBoardCardModel } from './workspace-board-worktrees'
import { resolveWorkspaceBoardCardDragCommit } from './drag/use-workspace-board-card-pointer-drag'
import { resolveWorkspaceBoardFullLaneDropIndex } from './workspace-board-filtered-drop-index'
import { registerWorkspaceBoardSidebarDropGroups } from './workspace-board-sidebar-drop'
import { useWorkspaceBoardTaskStatusSync } from './use-workspace-board-task-status-sync'
import { shouldWriteManualOrderForGroupDrop, buildManualOrderUpdatesForGroupDrop } from '../worktree-manual-order'

export type WorkspaceBoardDrawerProps = {
  /** Whether the user has the board open (the sheet's own `open` state). */
  open: boolean
  /** Whether the drawer may stay mounted; outlives `open` by the close animation. */
  renderedOpen: boolean
  /** A sidebar drag opened the board as a preview — not a user open until it commits. */
  dragPreview?: boolean
  /** A board-owned menu is open; outside presses and Escape leave the board alone. */
  preserveOpenForMenu?: boolean
  /** Reports the board header filter menu's open state to the panel that owns it. */
  onMenuOpenChange?: (open: boolean) => void
  /** Every project, unfiltered: the header filter's repo list must stay complete. */
  filterProjects?: readonly HydraProject[]
  /** The sidebar's display-options writer, shared with the header filter menu. */
  onDisplayOptionsChange?: (options: WorkspaceDisplayOptions) => void
  onAddProject?: () => void
  onClearFilters?: () => void
  onUpdateSettings?: (patch: { compact_worktree_cards: boolean }) => void
  /** Switches the sidebar sort to `manual` when a board drop writes a manual order. */
  onSwitchToManualSort?: () => void
  /**
   * Applies a board manual order: the ordered worktree ids become the project
   * arrays' order (Hydra's persisted manual order), preserving rows the board hides.
   */
  onApplyManualOrder?: (orderedWorktreeIds: readonly string[]) => void
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
   * sidebar projects from). The board's card drops commit through it — the pointer drag and
   * the native lane drop both — so the board never grows a second writer for the same column.
   */
  onAssignWorktreeStatus: (worktreePath: string, status: WorkspaceStatus) => void | Promise<void>
  /**
   * The app's own pin write (`set_worktree_flags` with `is_pinned`). A card dropped on the
   * board's pin strip commits through it — by pointer or by native HTML5 drop — so the board
   * never grows a second writer for the pin, and a pin drop never writes a status (D08-028).
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
  dragPreview = false,
  preserveOpenForMenu = false,
  onMenuOpenChange,
  filterProjects,
  onDisplayOptionsChange,
  onAddProject,
  onClearFilters,
  onUpdateSettings,
  onSwitchToManualSort,
  onApplyManualOrder,
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
  const {
    lanes,
    boardDragGroups,
    laneFullWorktreeIds,
    worktreeById,
    columnWidth: committedColumnWidth,
  } = useWorkspaceBoardProjection({
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
    sortBy: displayOptions.sortBy,
  })
  const setWorkspaceBoardColumnWidth = useAppStore((state) => state.setWorkspaceBoardColumnWidth)
  const { columnWidth, isResizingColumn, onColumnResizeStart, onColumnResizeKeyDown } =
    useWorkspaceBoardColumnResize(committedColumnWidth, setWorkspaceBoardColumnWidth)
  const boardRef = useRef<HTMLDivElement | null>(null)
  const laneScrollerRef = useRef<HTMLDivElement | null>(null)
  const areaSelectionOverlayRef = useRef<HTMLDivElement | null>(null)
  // The ONE bridge between a drag's ids and the app's writers: the drags speak workspace ids
  // (Orca's `Worktree.id`, the ids the sidebar's own drag publishes), the app's status and pin
  // writers key on workspace paths. The index drops ids two hosts share rather than guessing
  // which host's row a write belongs to.
  const pinWorktrees = useCallback(
    (worktreeIds: readonly string[]) => {
      let wrote = false
      for (const worktreeId of worktreeIds) {
        const card = worktreeById.get(worktreeId)
        if (card) {
          wrote = true
          void onPinWorktree(card.worktree.path)
        }
      }
      if (wrote) {
        void useAppStore.getState().recordFeatureInteraction('workspace-board-actions')
      }
    },
    [onPinWorktree, worktreeById]
  )
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
  // The lane as the board currently paints it, in the drag's vocabulary. The commit
  // boundary translates a rendered slot through this onto `laneFullWorktreeIds`.
  const renderedLaneWorktreeIds = useMemo(
    () =>
      new Map(
        filtered.lanes.map((lane) => [
          lane.status.id,
          lane.cards.map((card) => card.worktreeId),
        ])
      ),
    [filtered.lanes]
  )
  const {
    selectedWorktreeIds,
    selectionAnchorId,
    updateSelectionForGesture,
    updateSelectionForArea,
    selectForContextMenu,
    selectAllVisible,
    clearSelection
  } = useWorkspaceBoardSelection({ open, boardCards, visibleCards })
  const { handleAreaSelectionPointerDown } = useWorkspaceBoardAreaSelection({
    open,
    boardRef,
    overlayRef: areaSelectionOverlayRef,
    selectedWorktreeIds,
    selectionAnchorId,
    updateSelectionForArea
  })
  // The batch a card press moves: one target per worktree, carrying the lane it was lifted
  // from and the path the app's writers key on. Host-qualified, so the id→path bridge never
  // confuses two hosts' rows with the same workspace id.
  const dragTargetByIdentity = useMemo(() => {
    const byIdentity = new Map<string, WorkspaceBoardCardDragTarget>()
    for (const lane of lanes) {
      for (const card of lane.cards) {
        byIdentity.set(card.identity, {
          identity: card.identity,
          worktreeId: card.worktreeId,
          worktreePath: card.worktree.path,
          status: lane.status.id
        })
      }
    }
    return byIdentity
  }, [lanes])
  const resolveCardDragTargets = useCallback(
    (draggedWorktreeId: string, draggedWorktreeIdentity: string) => {
      const batch = resolveWorktreeMultiDragSelection({
        draggedWorktreeId,
        draggedWorktreeIdentity,
        selectedWorktreeIdentities: selectedWorktreeIds,
        surfaceWorktrees: boardCards.map((card) => ({
          worktreeId: card.worktreeId,
          identity: card.identity
        }))
      })
      const targets: WorkspaceBoardCardDragTarget[] = []
      for (const candidate of batch) {
        const target = dragTargetByIdentity.get(candidate.identity)
        if (target) {
          targets.push(target)
        }
      }
      return targets
    },
    [boardCards, dragTargetByIdentity, selectedWorktreeIds]
  )
  const recordBoardAction = useCallback(() => {
    void useAppStore.getState().recordFeatureInteraction('workspace-board-actions')
  }, [])

  const maybeSyncTaskStatuses = useWorkspaceBoardTaskStatusSync({ worktreeById })

  /**
   * Writes the slot's manual order when the gesture is an intentional reorder.
   *
   * Why the translation: the hit test counts rendered cards, and a query hides
   * members; manual-order math runs against the full lane.
   */
  const writeManualOrderForBoardDrop = useCallback(
    (args: {
      worktreeIds: readonly string[]
      status: WorkspaceStatus
      dropIndex: number
      sourceStatuses: readonly (WorkspaceStatus | null)[]
    }): void => {
      const shouldWrite = shouldWriteManualOrderForGroupDrop({
        sortBy: displayOptions.sortBy,
        sourceGroupKeys: args.sourceStatuses.filter(
          (status): status is WorkspaceStatus => status !== null
        ),
        targetGroupKey: args.status,
      })
      if (!shouldWrite || !onApplyManualOrder) {
        return
      }
      const fullLaneIds = laneFullWorktreeIds.get(args.status) ?? []
      const fullDropIndex = resolveWorkspaceBoardFullLaneDropIndex({
        fullLaneIds,
        renderedIds: renderedLaneWorktreeIds.get(args.status) ?? [],
        filteredDropIndex: args.dropIndex,
      })
      const { changed, orderedIds } = buildManualOrderUpdatesForGroupDrop({
        groups: boardDragGroups,
        targetGroupKey: args.status,
        draggedIds: args.worktreeIds,
        dropIndex: fullDropIndex,
        now: Date.now(),
        allWorktreeIds: boardDragGroups.flatMap((group) => group.worktreeIds),
      })
      if (!changed) {
        return
      }
      // Why switch: the placement the user just made only stays visible in Manual.
      onSwitchToManualSort?.()
      onApplyManualOrder(orderedIds)
    },
    [
      boardDragGroups,
      displayOptions.sortBy,
      laneFullWorktreeIds,
      onApplyManualOrder,
      onSwitchToManualSort,
      renderedLaneWorktreeIds,
    ]
  )

  /** Commits a pointer-drag batch into a lane: statuses, slot order and telemetry, once. */
  const handleDropWorktrees = useCallback(
    (args: {
      targets: readonly WorkspaceBoardCardDragTarget[]
      status: WorkspaceStatus
      dropIndex: number
    }): void => {
      let wrote = false
      for (const target of args.targets) {
        const commitStatus = resolveWorkspaceBoardCardDragCommit({
          sourceStatus: target.status,
          targetStatus: args.status,
        })
        if (!commitStatus) {
          continue
        }
        wrote = true
        void onAssignWorktreeStatus(target.worktreePath, commitStatus)
      }
      // A same-lane drop only reorders; the manual-order rule decides whether that
      // is a write, and a cross-lane drop that actually moved cards also qualifies.
      const changedWorktreeIds = args.targets
        .filter((target) => target.status !== args.status)
        .map((target) => target.worktreeId)
      writeManualOrderForBoardDrop({
        worktreeIds: args.targets.map((target) => target.worktreeId),
        status: args.status,
        dropIndex: args.dropIndex,
        sourceStatuses: args.targets.map((target) => target.status),
      })
      maybeSyncTaskStatuses(changedWorktreeIds, args.status)
      if (wrote) {
        recordBoardAction()
      }
    },
    [
      maybeSyncTaskStatuses,
      onAssignWorktreeStatus,
      recordBoardAction,
      writeManualOrderForBoardDrop,
    ]
  )

  /** Pins a pointer-drag batch in one pass: a pin write per card, one telemetry record. */
  const handlePinWorktrees = useCallback(
    (targets: readonly WorkspaceBoardCardDragTarget[]): void => {
      if (targets.length === 0) {
        return
      }
      for (const target of targets) {
        void onPinWorktree(target.worktreePath)
      }
      recordBoardAction()
    },
    [onPinWorktree, recordBoardAction]
  )

  /**
   * A lane drop that carries no slot (native HTML5, or a lane released at the end):
   * the destination status, the end of the lane as the order slot.
   */
  const commitWorktreeIdsAtEndOfStatus = useCallback(
    (worktreeIds: readonly string[], status: WorkspaceStatus): void => {
      const targets: WorkspaceBoardCardDragTarget[] = []
      for (const worktreeId of worktreeIds) {
        const card = worktreeById.get(worktreeId)
        if (!card) {
          continue
        }
        targets.push({
          identity: card.identity,
          worktreeId: card.worktreeId,
          worktreePath: card.worktree.path,
          status: card.worktree.status ?? null,
        })
      }
      if (targets.length === 0) {
        return
      }
      const renderedDropIndex = renderedLaneWorktreeIds.get(status)?.length ?? 0
      handleDropWorktrees({ targets, status, dropIndex: renderedDropIndex })
    },
    [handleDropWorktrees, renderedLaneWorktreeIds, worktreeById]
  )

  // Orca's shape: the native drag owns the board's lane/strip highlight state and the pointer
  // drag publishes into it, so both gestures paint the same destination.
  const nativeDrag = useWorkspaceBoardNativeDrag({
    open,
    boardRef,
    onDropWorktreesAtEndOfStatus: commitWorktreeIdsAtEndOfStatus,
    onPinWorktrees: pinWorktrees
  })
  const { onCardPointerDownCapture, isPointerDragActiveRef } =
    useWorkspaceBoardCardPointerDrag({
      open,
      boardRef,
      onDropWorktrees: handleDropWorktrees,
      onPinWorktrees: handlePinWorktrees,
      resolveCardDragTargets,
      onDragTargetChange: nativeDrag.setDragOverStatus,
      onPinDragTargetChange: nativeDrag.setPinDragOver
    })
  useWorkspaceBoardShiftWheelScroll(boardRef, laneScrollerRef, open, isPointerDragActiveRef)

  // The board's full lane order is what the sidebar's manual-order math runs against.
  // Registered while open: the sheet lingers through its close animation, and a board
  // the user dismissed must not stay a drop destination.
  useLayoutEffect(() => {
    if (!open) {
      return
    }
    return registerWorkspaceBoardSidebarDropGroups(boardDragGroups)
  }, [boardDragGroups, open])

  // The board header paints immediately; its cards mount one frame later.
  const renderCards = useWorkspaceBoardRenderLifecycle({
    boardRef,
    clearSelection,
    open,
    selectedCount: selectedWorktreeIds.size,
  })

  // Orca `useWorkspaceKanbanOutsideDismiss`: a canvas press to the right of the sheet
  // closes the board, while board-owned menus/dialogs/toasts and the sidebar keep it.
  useWorkspaceBoardOutsideDismiss({
    open,
    boardRef,
    preserveOpenForMenu,
    onOpenChange,
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

  const headerFilter =
    onDisplayOptionsChange && filterProjects ? (
      <WorkspaceBoardFilterMenu
        options={displayOptions}
        projects={filterProjects}
        onOptionsChange={onDisplayOptionsChange}
        onAddProject={onAddProject}
        onClearFilters={onClearFilters}
        onUpdateSettings={onUpdateSettings}
        onMenuOpenChange={onMenuOpenChange}
      />
    ) : null

  return (
    <WorkspaceBoardDrawerView
      open={open}
      dragPreview={dragPreview}
      preserveOpenForMenu={preserveOpenForMenu}
      geometry={geometry}
      lanes={filtered.lanes}
      renderCards={renderCards}
      laneFullWorktreeIds={laneFullWorktreeIds}
      columnWidth={columnWidth}
      isResizingColumn={isResizingColumn}
      onColumnResizeStart={onColumnResizeStart}
      onColumnResizeKeyDown={onColumnResizeKeyDown}
      compactCards={compactCards}
      boardRef={boardRef}
      laneScrollerRef={laneScrollerRef}
      areaSelectionOverlayRef={areaSelectionOverlayRef}
      dropTargetStatus={nativeDrag.dragOverStatus}
      pinDropTargetActive={nativeDrag.pinDragOver}
      onNativeDragOver={nativeDrag.handleDragOver}
      onNativeDragLeave={nativeDrag.handleDragLeave}
      onNativeDrop={nativeDrag.handleDrop}
      onPinDragOver={nativeDrag.handlePinDragOver}
      onPinDragLeave={nativeDrag.handlePinDragLeave}
      onPinDrop={nativeDrag.handlePinDrop}
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
      headerFilter={headerFilter}
    />
  )
}
