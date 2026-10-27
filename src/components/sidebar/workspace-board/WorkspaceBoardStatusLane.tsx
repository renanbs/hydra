import React from 'react'
import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'
import type { WorkspaceStatusDefinition } from '../../../shared/worktree/types'
import { getWorkspaceStatusVisualMeta } from '../workspace-status'
import type { GitWorktreeInfo, HydraProject } from '../types'
import WorkspaceBoardCard from './WorkspaceBoardCard'
import type { WorkspaceBoardCard as WorkspaceBoardCardModel } from './workspace-board-worktrees'

type WorkspaceBoardStatusLaneProps = {
  status: WorkspaceStatusDefinition
  cards: readonly WorkspaceBoardCardModel[]
  columnWidth: number
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
 * Ported from Orca `WorkspaceKanbanStatusLane`: one lane per user-defined
 * `WorkspaceStatus`, with its icon, label, card counter and empty placeholder.
 * The column resize handle, the lane's create-workspace buttons and the drop
 * targets are not part of this increment, so they are absent rather than inert.
 */
function WorkspaceBoardStatusLane({
  status,
  cards,
  columnWidth,
  compactCards,
  onActivate,
  onSelectSession,
  onContextMenu,
}: WorkspaceBoardStatusLaneProps): React.JSX.Element {
  const meta = getWorkspaceStatusVisualMeta(status)
  return (
    <section
      data-workspace-status={status.id}
      className={cn(
        'flex h-full min-h-0 min-w-0 shrink-0 flex-col overflow-hidden rounded-md border border-t-2 border-worktree-sidebar-border',
        meta.border,
        meta.laneTint
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
            {cards.length}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overflow-x-hidden px-1.5 py-2 scrollbar-sleek">
        {cards.length > 0 ? (
          cards.map((card) => (
            <WorkspaceBoardCard
              key={card.identity}
              card={card}
              compactCards={compactCards}
              onActivate={onActivate}
              onSelectSession={onSelectSession}
              onContextMenu={onContextMenu}
            />
          ))
        ) : (
          <div className="flex h-20 items-center justify-center rounded-md border border-dashed border-border/70 text-[11px] text-muted-foreground">
            {translate('auto.components.sidebar.WorkspaceKanbanStatusLane.8ad104642b', 'Empty')}
          </div>
        )}
      </div>
    </section>
  )
}

export default React.memo(WorkspaceBoardStatusLane)
