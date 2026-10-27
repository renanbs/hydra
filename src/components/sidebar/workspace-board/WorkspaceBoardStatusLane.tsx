import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'
import type { WorkspaceStatusDefinition } from '../../../shared/worktree/types'
import { getWorkspaceStatusVisualMeta } from '../workspace-status'
import type { GitWorktreeInfo, HydraProject } from '../types'
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
  compactCards: boolean
  /** True while a card drag hovers this lane; the destination lane paints its own ring. */
  isDropTarget?: boolean
  onActivate: (worktree: GitWorktreeInfo) => void
  onSelectSession?: (sessionId: string) => void
  onContextMenu?: (
    event: React.MouseEvent,
    worktree: GitWorktreeInfo,
    project: HydraProject
  ) => void
}

/**
 * Ported from Orca `WorkspaceKanbanStatusLane`: one lane per user-defined
 * `WorkspaceStatus`, with its icon, label, card counter and empty placeholder.
 * The lane root is also the board's drop destination — its rect resolves the target
 * lane and `isDropTarget` paints the highlight while a card hovers it. The lane body is the
 * card list's own scroll element, so the cards are virtualized inside it (`renderCards`
 * gates them until this lane's hydration frame). The column resize handle and the lane's
 * create-workspace buttons are not part of this increment, so they are absent rather than
 * inert.
 */
function WorkspaceBoardStatusLane({
  status,
  cards,
  totalCount,
  hasQuery,
  renderCards,
  columnWidth,
  compactCards,
  isDropTarget = false,
  onActivate,
  onSelectSession,
  onContextMenu,
}: WorkspaceBoardStatusLaneProps): React.JSX.Element {
  // Why state, not a ref: the card list is a child of this body, so its layout effects run
  // before this element's own ref is attached — a ref read there would see `null` and the
  // list would never register its measured layout for the drop geometry.
  const [cardScrollerElement, setCardScrollerElement] = useState<HTMLDivElement | null>(null)
  const meta = getWorkspaceStatusVisualMeta(status)
  // Why: a lane that is empty on its own merits is still "Empty" under a query —
  // only a lane whose cards were filtered away has anything to say about matches.
  const isFiltered = hasQuery && totalCount > 0
  return (
    <section
      data-workspace-status={status.id}
      data-workspace-board-lane-drop-target={isDropTarget ? '' : undefined}
      className={cn(
        'flex h-full min-h-0 min-w-0 shrink-0 flex-col overflow-hidden rounded-md border border-t-2 border-worktree-sidebar-border',
        meta.border,
        meta.laneTint,
        isDropTarget && 'ring-1 ring-inset ring-worktree-sidebar-ring'
      )}
      style={{ width: `${columnWidth}px` }}
    >
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
      </div>
    </section>
  )
}

export default React.memo(WorkspaceBoardStatusLane)
