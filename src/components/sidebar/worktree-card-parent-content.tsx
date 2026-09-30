// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
import React from 'react'
import { cn } from '../../lib/utils'
import { WorktreeCardHeader } from './worktree-card-header'
import { WorktreeCardMetaRow } from './worktree-card-meta-row'
import { WorktreeCardDetailsHover } from './WorktreeCardDetailsHover'
import { WorktreeCardAgents } from './WorktreeCardAgents'
import type { WorktreeCardPresentation } from './worktree-card-presentation'
import type { WorktreeCardController } from './use-worktree-card-controller'

export interface WorktreeCardParentContentProps {
  card: WorktreeCardController
  presentation: WorktreeCardPresentation
}

export function WorktreeCardParentContent({
  card,
  presentation
}: WorktreeCardParentContentProps): React.JSX.Element {
  const {
    worktree,
    project,
    repo = project,
    ports,
    workspacePorts = ports || [],
    review,
    sessions,
    onSelectSession,
    activeSessionId,
    titleRenaming,
    newCardStyle,
    lineageChildren,
    showInlineAgentList
  } = card
  const { titleOnlyCard, parentContentMarginLeft } = presentation

  const identityContent = (
    <div
      className="group/worktree-card flex w-full min-w-0 flex-col gap-1.5"
      data-worktree-card-hover-trigger=""
    >
      <WorktreeCardHeader card={card} presentation={presentation} />
      {presentation.hasMetaRow && <WorktreeCardMetaRow card={card} presentation={presentation} />}
    </div>
  )

  const activeProject = repo || project

  // Why: status glyphs and agent rows own their tooltips; only identity content should open the larger details card.
  const identityContentWithHover =
    presentation.hasHoverDetails && !titleRenaming && activeProject ? (
      <WorktreeCardDetailsHover
        worktree={worktree}
        project={activeProject}
        ports={workspacePorts}
        review={review}
      >
        {identityContent}
      </WorktreeCardDetailsHover>
    ) : (
      identityContent
    )

  return (
    <div
      className={cn(
        'flex w-full min-w-0 gap-0.5 pl-0',
        titleOnlyCard ? 'items-center' : 'items-start'
      )}
      style={
        parentContentMarginLeft < 0 ? { marginLeft: `${parentContentMarginLeft}px` } : undefined
      }
      data-worktree-card-parent-content=""
    >
      {/* Content area */}
      <div
        className={cn(
          'flex min-w-0 flex-1 flex-col gap-1.5',
          // Why: inline agent rows intentionally outdent into the card gutter; inner elements handle truncation.
          showInlineAgentList || (!newCardStyle && lineageChildren)
            ? 'overflow-visible'
            : 'overflow-hidden'
        )}
      >
        {identityContentWithHover}

        {onSelectSession && sessions && sessions.length > 0 && (
          <div className="pl-4.5">
            <WorktreeCardAgents
              worktreePath={worktree.path}
              sessions={sessions}
              onSelectSession={onSelectSession}
              activeSessionId={activeSessionId}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default WorktreeCardParentContent
