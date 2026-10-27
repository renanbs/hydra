import React from 'react'
import { Pin } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { translate } from '@/i18n/i18n'
import { WorktreeCard } from '../WorktreeCard'
import type { GitWorktreeInfo, HydraProject } from '../types'
import type { WorkspaceBoardCard as WorkspaceBoardCardModel } from './workspace-board-worktrees'

type WorkspaceBoardCardProps = {
  card: WorkspaceBoardCardModel
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
 * Ported from Orca `WorkspaceKanbanCard`: the sidebar's own card, framed with the
 * board's `data-workspace-board-card-*` hooks and the Pinned badge. The frame is what
 * the board's pointer drag lifts, and `data-workspace-board-worktree-path` is how a
 * drop knows which worktree `set_worktree_status` must be written for (the id and the
 * index on the same frame are display and lane-slot hooks).
 *
 * Why `affiliateListMode`: this card lives in another list, so the card's own
 * rename/delete/drag affordances must not render — they would be inert here. The
 * worktree menu (where a status is assigned) is opened by this frame instead.
 */
function WorkspaceBoardCard({
  card,
  compactCards,
  onActivate,
  onSelectSession,
  onContextMenu,
}: WorkspaceBoardCardProps): React.JSX.Element {
  return (
    <div
      className="relative rounded-lg"
      data-workspace-board-card-id={card.identity}
      data-workspace-board-worktree-id={card.worktree.id ?? card.worktree.path}
      data-workspace-board-worktree-path={card.worktree.path}
      data-workspace-board-card-index={card.laneIndex}
      data-workspace-board-card-mode="detailed"
      onContextMenu={(event) => onContextMenu?.(event, card.worktree, card.project)}
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
        flushSurface
        affiliateListMode
        nativeDragEnabled={false}
        onSelect={onActivate}
        onSelectSession={onSelectSession}
      />
    </div>
  )
}

export default React.memo(WorkspaceBoardCard)
