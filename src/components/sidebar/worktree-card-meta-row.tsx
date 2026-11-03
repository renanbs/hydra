// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/worktree-card-meta-row.tsx
import React from 'react'
import { GitCommitHorizontal, GitMerge } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { getDetachedHeadTooltip } from '@/lib/worktree-git-identity-display'
import { CacheTimer } from './CacheTimer'
import { WorktreeHostContextBadge } from './WorktreeHostContextBadge'
import { CONFLICT_OPERATION_LABELS } from './WorktreeCardHelpers'
import { TruncatedSidebarLabel } from './truncated-sidebar-label'
import { getDirectoryName } from './worktree-card-model'
import type { WorktreeCardPresentation } from './worktree-card-presentation'
import type { WorktreeCardWithExtras } from './worktree-card-controller-extras'

export interface WorktreeCardMetaRowProps {
  card: WorktreeCardWithExtras
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
    <div className="flex min-w-0 items-center gap-1.5" data-worktree-card-meta-row="">
      <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
        {showRepoBadgeInMetaRow && repo && (
          <div className="flex shrink-0 items-center gap-1.5 rounded-[4px] border border-border bg-accent px-1.5 py-0.5 dark:border-border/60 dark:bg-accent/50">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: repo.color || 'hsl(var(--worktree-sidebar-foreground))' }}
            />
            <span className="max-w-[6rem] truncate text-[10px] leading-none font-semibold text-foreground lowercase">
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
            className="text-[11px] leading-none text-muted-foreground"
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
            className="text-[11px] leading-none text-muted-foreground"
            // Why: whole-card details hover already shows full identity; a nested tooltip would compete for it.
            tooltipEnabled={!hasHoverDetails}
          />
        ) : showDetachedHeadInMetaRow && detachedHeadDisplay ? (
          // Orca `DetachedHeadBadge`: a detached checkout is a warning, not an
          // identity — amber tint, commit glyph, and a tooltip that says so.
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                aria-label={getDetachedHeadTooltip(detachedHeadDisplay)}
                className="h-[16px] max-w-[9rem] shrink-0 gap-1 rounded border-amber-500/30 bg-amber-500/10 px-1.5 text-[10px] leading-none font-medium text-amber-700 dark:text-amber-300"
              >
                <GitCommitHorizontal className="size-2.5" />
                <span className="min-w-0 truncate">Detached HEAD @ {detachedHeadDisplay}</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              {getDetachedHeadTooltip(detachedHeadDisplay)}
            </TooltipContent>
          </Tooltip>
        ) : null}

        {showConflictOperationBadge && conflictOperation && (
          <Badge
            variant="outline"
            className="inline-flex h-[16px] shrink-0 items-center gap-1 rounded border-amber-500/30 bg-amber-500/5 px-1.5 text-[10px] leading-none font-medium text-amber-600 dark:border-amber-400/30 dark:bg-amber-400/5 dark:text-amber-400"
          >
            <GitMerge className="size-2.5" />
            <span>{CONFLICT_OPERATION_LABELS[conflictOperation] || conflictOperation}</span>
          </Badge>
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
