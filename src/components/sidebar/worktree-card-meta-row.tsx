// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
import React from 'react'
import { GitMerge } from 'lucide-react'

import { CacheTimer } from './CacheTimer'
import { WorktreeHostContextBadge } from './WorktreeHostContextBadge'
import { CONFLICT_OPERATION_LABELS } from './WorktreeCardHelpers'
import { TruncatedSidebarLabel } from './truncated-sidebar-label'
import { getDirectoryName } from './worktree-card-model'
import type { WorktreeCardPresentation } from './worktree-card-presentation'
import type { WorktreeCardController } from './use-worktree-card-controller'

export interface WorktreeCardMetaRowProps {
  card: WorktreeCardController
  presentation: WorktreeCardPresentation
}

export function WorktreeCardMetaRow({
  card,
  presentation
}: WorktreeCardMetaRowProps): React.JSX.Element {
  const {
    worktree,
    repo,
    hostContextLabel,
    identityDisplay,
    isFolder,
    newCardStyle,
    branch,
    detachedHeadDisplay,
    conflictOperation,
    cacheStartedAt,
    cacheTtlMs
  } = card
  const {
    showRepoBadgeInMetaRow,
    showHostContextBadge,
    showIdentityInNewCard,
    hasHoverDetails,
    showBranch,
    showDetachedHeadInMetaRow,
    showConflictOperationBadge,
    showMetaRowDetails,
    detailsAndPorts
  } = presentation

  return (
    <div className="flex items-center gap-1.5 min-w-0" data-worktree-card-meta-row="">
      <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
        {showRepoBadgeInMetaRow && repo && (
          <div className="flex items-center gap-1.5 shrink-0 px-1.5 py-0.5 rounded-[4px] bg-accent border border-border dark:bg-accent/50 dark:border-border/60">
            <span
              className="size-2 rounded-full shrink-0"
              style={{ backgroundColor: repo.color || 'hsl(var(--worktree-sidebar-foreground))' }}
            />
            <span className="text-[10px] font-semibold text-foreground truncate max-w-[6rem] leading-none lowercase">
              {repo.displayName || repo.name}
            </span>
          </div>
        )}

        {showHostContextBadge && hostContextLabel && (
          <WorktreeHostContextBadge label={hostContextLabel} />
        )}

        {showIdentityInNewCard ? (
          <TruncatedSidebarLabel
            text={identityDisplay || ''}
            className="text-[11px] text-muted-foreground leading-none"
            tooltipEnabled={!hasHoverDetails}
          />
        ) : isFolder && !newCardStyle ? (
          <span
            className="min-w-0 truncate font-mono text-[11px] leading-none text-muted-foreground"
            title={worktree.path}
          >
            {getDirectoryName(worktree.path)}
          </span>
        ) : showBranch ? (
          <TruncatedSidebarLabel
            text={branch}
            className="text-[11px] text-muted-foreground leading-none"
            // Why: whole-card details hover already shows full identity; a nested tooltip would compete for it.
            tooltipEnabled={!hasHoverDetails}
          />
        ) : showDetachedHeadInMetaRow && detachedHeadDisplay ? (
          <span className="h-[16px] px-1.5 text-[10px] font-mono rounded bg-accent text-muted-foreground inline-flex items-center">
            {detachedHeadDisplay}
          </span>
        ) : null}

        {showConflictOperationBadge && conflictOperation && (
          <span className="h-[16px] px-1.5 text-[10px] font-medium rounded shrink-0 gap-1 text-amber-600 border border-amber-500/30 bg-amber-500/5 dark:text-amber-400 dark:border-amber-400/30 dark:bg-amber-400/5 leading-none inline-flex items-center">
            <GitMerge className="size-2.5" />
            <span>{CONFLICT_OPERATION_LABELS[conflictOperation] || conflictOperation}</span>
          </span>
        )}

        {cacheStartedAt != null && <CacheTimer startedAt={cacheStartedAt} ttlMs={cacheTtlMs} />}
      </div>

      {showMetaRowDetails && (
        <div className="ml-auto flex shrink-0 items-center gap-1 pr-1.5">{detailsAndPorts}</div>
      )}
    </div>
  )
}

export default WorktreeCardMetaRow
