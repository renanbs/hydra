import React, { useState } from 'react'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { WorkspaceStatus, WorkspaceStatusDefinition } from '../../../shared/worktree/types'
import {
  WORKSPACE_BOARD_COLUMN_WIDTH_MAX,
  WORKSPACE_BOARD_COLUMN_WIDTH_MIN
} from '../../../shared/workspace-statuses'
import { getWorkspaceStatusVisualMeta } from '../workspace-status'
import type { GitWorktreeInfo } from '../types'
import WorkspaceBoardStatusLaneCardList from './WorkspaceBoardStatusLaneCardList'
import type { WorkspaceBoardCard as WorkspaceBoardCardModel } from './workspace-board-worktrees'

type WorkspaceBoardStatusLaneProps = {
  status: WorkspaceStatusDefinition
  cards: readonly WorkspaceBoardCardModel[]
  /** Lane membership before the search filter; the badge's denominator under a query. */
  totalCount: number
  /** True while a query narrows the board — switches the badge to "matches / total". */
  hasQuery: boolean
  /**
   * True once this lane's cards have been hydrated. The lane shell always paints; its cards
   * mount one lane per animation frame (D08-020), and until then the lane must not claim to be
   * "Empty" when it is only still loading.
   */
  renderCards: boolean
  columnWidth: number
  /** True while this board owns the width gesture; the handle paints its active state. */
  isResizingColumn: boolean
  compactCards: boolean
  /** True while a card drag hovers this lane; the destination lane paints its own ring. */
  isDropTarget?: boolean
  /** The board's selection, by host-qualified card identity. */
  selectedWorktreeIds: ReadonlySet<string>
  /**
   * Opens the workspace composer with this lane's status preselected (Orca
   * `useWorkspaceKanbanCreateWorktree`). The header and the lane footer both call it.
   */
  onCreateWorktree: (workspaceStatus: WorkspaceStatus) => void
  onSelectionGesture: (event: React.MouseEvent<HTMLElement>, worktreeIdentity: string) => boolean
  onActivate: (worktree: GitWorktreeInfo) => void
  onSelectSession?: (sessionId: string) => void
  onContextMenu?: (event: React.MouseEvent, card: WorkspaceBoardCardModel) => void
  onColumnResizeStart: (event: React.PointerEvent<HTMLElement>) => void
  onColumnResizeKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void
}

/**
 * Ported from Orca `WorkspaceKanbanStatusLane`: one lane per user-defined
 * `WorkspaceStatus`, with its icon, label, card counter and empty placeholder.
 * The lane root is also the board's drop destination — its rect resolves the target
 * lane and `isDropTarget` paints the highlight while a card hovers it. The lane body is the
 * card list's own scroll element, so the cards are virtualized inside it (`renderCards`
 * gates them until this lane's hydration frame). Its right edge carries the column resize
 * handle (D08-022); each lane also carries its create-workspace affordance — the header
 * `+` and the full-width footer `+` (D08-021/D08-030), both wired to the composer.
 */
function WorkspaceBoardStatusLane({
  status,
  cards,
  totalCount,
  hasQuery,
  renderCards,
  columnWidth,
  isResizingColumn,
  compactCards,
  isDropTarget = false,
  selectedWorktreeIds,
  onCreateWorktree,
  onSelectionGesture,
  onActivate,
  onSelectSession,
  onContextMenu,
  onColumnResizeStart,
  onColumnResizeKeyDown,
}: WorkspaceBoardStatusLaneProps): React.JSX.Element {
  // Why state, not a ref: the card list is a child of this body, so its layout effects run
  // before this element's own ref is attached — a ref read there would see `null` and the
  // list would never register its measured layout for the drop geometry.
  const [cardScrollerElement, setCardScrollerElement] = useState<HTMLDivElement | null>(null)
  const meta = getWorkspaceStatusVisualMeta(status)
  // Orca spells this tooltip `New workspace in ${status.label}`; localized here so the
  // label the user renamed the status to still lands inside the sentence.
  const createTooltip = translate(
    'auto.components.sidebar.WorkspaceKanbanStatusLane.4031918ca7',
    'New workspace in {{value0}}',
    { value0: status.label }
  )
  // Why: a lane that is empty on its own merits is still "Empty" under a query —
  // only a lane whose cards were filtered away has anything to say about matches.
  const isFiltered = hasQuery && totalCount > 0
  return (
    <section
      data-workspace-status={status.id}
      data-workspace-board-lane-drop-target={isDropTarget ? '' : undefined}
      className={cn(
        'group/lane relative flex h-full min-h-0 min-w-0 shrink-0 flex-col overflow-hidden rounded-md border border-t-2 border-worktree-sidebar-border',
        meta.border,
        meta.laneTint,
        isDropTarget && 'ring-1 ring-inset ring-worktree-sidebar-ring'
      )}
      style={{ width: `${columnWidth}px` }}
    >
      <div
        data-workspace-board-column-resize-handle=""
        role="separator"
        aria-orientation="vertical"
        aria-label={translate(
          'auto.components.sidebar.WorkspaceKanbanStatusLane.3611d1ae7f',
          'Resize workspace board columns'
        )}
        aria-valuemin={WORKSPACE_BOARD_COLUMN_WIDTH_MIN}
        aria-valuemax={WORKSPACE_BOARD_COLUMN_WIDTH_MAX}
        aria-valuenow={columnWidth}
        tabIndex={0}
        className={cn(
          'absolute right-0 top-0 z-20 h-9 w-2 cursor-col-resize outline-none',
          'focus-visible:ring-1 focus-visible:ring-worktree-sidebar-ring'
        )}
        onPointerDown={onColumnResizeStart}
        onKeyDown={onColumnResizeKeyDown}
        onClick={(event) => event.stopPropagation()}
      >
        <span
          className={cn(
            'absolute inset-y-2 left-1/2 w-px -translate-x-1/2 rounded-full bg-transparent transition-colors',
            'group-hover/lane:bg-worktree-sidebar-ring/55 group-focus-visible:bg-worktree-sidebar-ring',
            isResizingColumn && 'bg-worktree-sidebar-ring'
          )}
        />
      </div>
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border/70 py-0 pl-3 pr-2">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <meta.icon className={cn('size-3.5 shrink-0', meta.tone)} />
          <div className="min-w-0 truncate text-[12px] font-semibold text-foreground">
            {status.label}
          </div>
          <div
            data-workspace-board-lane-count=""
            className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium leading-none text-muted-foreground"
          >
            {isFiltered ? `${cards.length} / ${totalCount}` : cards.length}
          </div>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="size-6 shrink-0 text-muted-foreground"
              aria-label={createTooltip}
              onClick={() => onCreateWorktree(status.id)}
            >
              <Plus className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={6}>
            {createTooltip}
          </TooltipContent>
        </Tooltip>
      </div>

      <div
        ref={setCardScrollerElement}
        data-workspace-board-card-scroller=""
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-1.5 py-2 scrollbar-sleek"
      >
        {cards.length > 0 ? (
          renderCards ? (
            <WorkspaceBoardStatusLaneCardList
              cards={cards}
              scrollerElement={cardScrollerElement}
              compactCards={compactCards}
              selectedWorktreeIds={selectedWorktreeIds}
              onSelectionGesture={onSelectionGesture}
              onActivate={onActivate}
              onSelectSession={onSelectSession}
              onContextMenu={onContextMenu}
            />
          ) : null
        ) : (
          <div className="flex h-20 items-center justify-center rounded-md border border-dashed border-border/70 text-[11px] text-muted-foreground">
            {isFiltered
              ? translate('auto.components.sidebar.WorkspaceKanbanStatusLane.2df01a03ff', 'No matches')
              : translate('auto.components.sidebar.WorkspaceKanbanStatusLane.8ad104642b', 'Empty')}
          </div>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="secondary"
              size="xs"
              className={cn(
                'mt-2 h-7 w-full can-hover:opacity-0 transition-opacity',
                'group-hover/lane:opacity-100 group-focus-within/lane:opacity-100'
              )}
              aria-label={createTooltip}
              onClick={() => onCreateWorktree(status.id)}
            >
              <Plus className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={6}>
            {createTooltip}
          </TooltipContent>
        </Tooltip>
      </div>
    </section>
  )
}

export default React.memo(WorkspaceBoardStatusLane)
