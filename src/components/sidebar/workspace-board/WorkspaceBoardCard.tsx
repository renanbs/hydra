import React from 'react'
import { Pin } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { translate } from '@/i18n/i18n'
import { WorktreeCard } from '../WorktreeCard'
import type { WorkspaceBoardCard as WorkspaceBoardCardModel } from './workspace-board-worktrees'

type WorkspaceBoardCardProps = {
  card: WorkspaceBoardCardModel
  compactCards: boolean
  /** True while this card belongs to the board's selection. */
  isSelected: boolean
  /**
   * The board's click gesture. Returns `true` when the click was a selection gesture and the
   * card must not activate (Orca's `onSelectionGesture` contract).
   */
  onSelectionGesture: (event: React.MouseEvent<HTMLElement>, worktreeIdentity: string) => boolean
  onActivate: (worktree: WorkspaceBoardCardModel['worktree']) => void
  onSelectSession?: (sessionId: string) => void
  /**
   * The board's own context menu. It receives the whole card, not just its worktree: the board
   * resolves the assignment targets from the card's identity, and the menu is the sidebar's.
   */
  onContextMenu?: (event: React.MouseEvent, card: WorkspaceBoardCardModel) => void
}

/**
 * Ported from Orca `WorkspaceKanbanCard`: the sidebar's own card, framed with the
 * board's `data-workspace-board-card-*` hooks and the Pinned badge. The frame is what
 * the board's pointer drag lifts, and `data-workspace-board-worktree-path` is how a
 * drop knows which worktree `set_worktree_status` must be written for (the id and the
 * index on the same frame are display and lane-slot hooks).
 *
 * `data-workspace-board-card-selected` is the selection state React owns; the marquee's own
 * ring is written imperatively on the same frame as `data-workspace-board-card-area-selected`
 * while a drag is in flight, so a card can be pre-lit before the commit renders.
 *
 * Why `affiliateListMode`: this card lives in another list, so the card's own
 * rename/delete/drag affordances must not render — they would be inert here. The
 * worktree menu (where a status is assigned) is opened by this frame instead.
 */
function WorkspaceBoardCard({
  card,
  compactCards,
  isSelected,
  onSelectionGesture,
  onActivate,
  onSelectSession,
  onContextMenu,
}: WorkspaceBoardCardProps): React.JSX.Element {
  return (
    <div
      className="relative rounded-lg data-[workspace-board-card-area-selected=true]:ring-1 data-[workspace-board-card-area-selected=true]:ring-worktree-sidebar-ring/40"
      data-workspace-board-card-id={card.identity}
      data-workspace-board-worktree-id={card.worktree.id ?? card.worktree.path}
      data-workspace-board-worktree-path={card.worktree.path}
      data-workspace-board-card-index={card.laneIndex}
      data-workspace-board-card-mode="detailed"
      data-workspace-board-card-selected={isSelected ? 'true' : 'false'}
      onContextMenu={(event) => onContextMenu?.(event, card)}
    >
      {card.isPinned ? (
        <Badge
          variant="outline"
          className="pointer-events-none absolute right-2 top-1.5 z-10 flex size-4 items-center justify-center rounded-full bg-background/90 p-0 text-muted-foreground"
          aria-label={translate('auto.components.sidebar.WorkspaceKanbanCard.cefae8983e', 'Pinned')}
        >
          <Pin className="size-2.5" />
        </Badge>
      ) : null}
      <WorktreeCard
        worktree={card.worktree}
        project={card.project}
        repo={card.project}
        status={card.activityStatus}
        prDisplay={card.prDisplay}
        ports={card.ports}
        sessions={card.sessions}
        isPinned={card.isPinned}
        isUnread={card.isUnread}
        isActive={card.isActive}
        isCurrentWorktree={card.isActive}
        compactCards={compactCards}
        isMultiSelected={isSelected}
        flushSurface
        affiliateListMode
        nativeDragEnabled={false}
        onSelect={onActivate}
        onSelectionGesture={(event) => onSelectionGesture(event, card.identity)}
        onSelectSession={onSelectSession}
      />
    </div>
  )
}

export default React.memo(WorkspaceBoardCard)
