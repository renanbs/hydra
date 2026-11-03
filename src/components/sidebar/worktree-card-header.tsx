// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/worktree-card-header.tsx
import React from 'react'
import { AlertCircle, Server, ServerOff, Star, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { translate } from '@/i18n/i18n'
import { cn } from '../../lib/utils'
import { RepoIconGlyph } from '../repo/repo-icon'
import type { HydraProject } from './types'
import { resolveRepoHeaderColor } from './project-header-color'
import { formatSparseDirectoryPreview, shouldBeginWorktreeRename } from './worktree-card-model'
import type { WorktreeCardPresentation } from './worktree-card-presentation'
import { WorktreeTitleInlineRename } from './WorktreeTitleInlineRename'
import type { WorktreeCardWithExtras } from './worktree-card-controller-extras'

// Why: pinned repo icon and compact inline badge share this chip shell so both repo cues read as the same affordance.
function RepoIdentityChip({
  repo,
  children
}: {
  repo: HydraProject
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="inline-flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-worktree-sidebar-border bg-worktree-sidebar-accent/55"
          aria-label={translate('auto.components.sidebar.WorktreeCard.35ccfe2475', 'Project {{value0}}', {
            value0: repo.displayName || repo.name
          })}
        >
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {repo.displayName || repo.name}
      </TooltipContent>
    </Tooltip>
  )
}

export interface WorktreeCardHeaderProps {
  card: WorktreeCardWithExtras
  presentation: WorktreeCardPresentation
}

/** Orca `parsedRepoHost`: the execution-host kind encoded in the project's host id. */
function resolveRepoHostKind(repo: HydraProject | undefined): 'local' | 'ssh' | 'runtime' {
  const hostId = repo?.executionHostId ?? null
  if (!hostId || hostId === 'local') {
    return 'local'
  }
  if (hostId.startsWith('ssh:')) {
    return 'ssh'
  }
  if (hostId.startsWith('runtime:')) {
    return 'runtime'
  }
  return 'local'
}

export function WorktreeCardHeader({
  card,
  presentation
}: WorktreeCardHeaderProps): React.JSX.Element {
  const {
    worktree,
    repo,
    affiliateListMode,
    renameRowKey,
    compactCards,
    newCardStyle,
    stopQuickActionPointerPropagation,
    isRuntimeDisconnected,
    runtimeHostLabel,
    visibleCardTitle,
    isDeleting,
    showUnreadEmphasis,
    setTitleRenaming,
    handleRenameTitle,
    renameRequest,
    setRenamingWorktreeId,
    titleRenaming,
    handleOpenRenameErrorDialog,
    isFolder,
    handleWorkspaceQuickAction
  } = card
  const {
    showPinnedRepoIcon,
    showInlineRepoBadge,
    showHeaderActions,
    showTitleRowPrimary,
    showDeleteQuickAction,
    showTitleRowIndicators,
    titleRowIndicators,
    titleWrapper,
    cardTitle
  } = presentation

  const renameError =
    typeof worktree.firstAgentMessageRenameError === 'string' &&
    worktree.firstAgentMessageRenameError.length > 0
      ? worktree.firstAgentMessageRenameError
      : typeof worktree.first_agent_message_rename_error === 'string' &&
          worktree.first_agent_message_rename_error.length > 0
        ? worktree.first_agent_message_rename_error
        : null

  const isMain = Boolean(worktree.isMainWorktree || worktree.is_main)
  const isSparse = Boolean(worktree.isSparse || worktree.is_sparse)
  const sparseDirs = worktree.sparseDirectories || worktree.sparse_directories
  const showRuntimeHostGlyph = resolveRepoHostKind(repo) === 'runtime'
  const hostTitle = isRuntimeDisconnected
    ? runtimeHostLabel
      ? translate(
          'auto.components.sidebar.WorktreeCard.runtimeHostDisconnectedNamed',
          '{{hostName}} disconnected',
          { hostName: runtimeHostLabel }
        )
      : translate(
          'auto.components.sidebar.WorktreeCard.runtimeHostDisconnected',
          'Server disconnected'
        )
    : runtimeHostLabel
      ? translate(
          'auto.components.sidebar.WorktreeCard.runtimeHostProjectNamed',
          'Project on {{hostName}}',
          { hostName: runtimeHostLabel }
        )
      : translate('auto.components.sidebar.WorktreeCard.runtimeHostProject', 'Project on server')

  return (
    <div className="flex min-w-0 items-center justify-between gap-2">
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        {showPinnedRepoIcon && repo && (
          <RepoIdentityChip repo={repo}>
            <RepoIconGlyph
              repoIcon={repo.repo_icon}
              color={resolveRepoHeaderColor(repo.color)}
              className="size-full"
              iconClassName="size-3"
            />
          </RepoIdentityChip>
        )}

        {/* Why passive: a runtime ("server") host has no renderer-reachable connect
            API, so the glyph states the host and its health but is not a control. */}
        {showRuntimeHostGlyph ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex shrink-0 items-center" aria-label={hostTitle}>
                {isRuntimeDisconnected ? (
                  <ServerOff className="size-3 text-destructive" />
                ) : (
                  <Server className="size-3 text-muted-foreground" />
                )}
              </span>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              {hostTitle}
            </TooltipContent>
          </Tooltip>
        ) : null}

        {showInlineRepoBadge && repo && (
          <RepoIdentityChip repo={repo}>
            <RepoIconGlyph
              repoIcon={repo.repo_icon}
              color={resolveRepoHeaderColor(repo.color)}
              className="size-full"
              iconClassName="size-3"
            />
          </RepoIdentityChip>
        )}

        {/* Why: unread alert lives in the left status lane; title-row contrast comes from weight and dimmed read titles. */}
        <WorktreeTitleInlineRename
          displayName={cardTitle || visibleCardTitle}
          disabled={isDeleting || affiliateListMode}
          showUnreadEmphasis={showUnreadEmphasis}
          dimReadTitle={newCardStyle}
          className="text-[13px] leading-5"
          editingClassName="flex-1"
          titleWrapper={titleWrapper}
          onEditingChange={affiliateListMode ? undefined : setTitleRenaming}
          onRename={handleRenameTitle}
          beginEditing={
            !affiliateListMode &&
            // Why: entering rename mode flips `titleRenaming`, which swaps the
            // card's hover wrapper and remounts this header — the inline editor's
            // local `editing` state would be lost, so the card-level flag re-opens
            // it on the remount (double-click and `workspace.rename` both rely on
            // this; without it rename from the card is a no-op).
            (titleRenaming ||
              shouldBeginWorktreeRename(renameRequest, worktree.id || worktree.path, renameRowKey))
          }
          onBeginEditingConsumed={affiliateListMode ? undefined : () => setRenamingWorktreeId?.(null)}
        />

        {renameError && !titleRenaming ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onPointerDown={stopQuickActionPointerPropagation}
                onClick={() => handleOpenRenameErrorDialog?.(renameError)}
                onDoubleClick={() => handleOpenRenameErrorDialog?.(renameError)}
                className="inline-flex h-4 shrink-0 items-center gap-0.5 rounded border border-destructive/40 bg-destructive/10 !px-0.5 text-[10px] leading-none font-medium text-destructive hover:bg-destructive/15 hover:text-destructive"
                aria-label="Auto-rename failed: view error"
              >
                <AlertCircle className="size-2.5" />
                <span>rename failed</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              Auto-name failed. Click to see details.
            </TooltipContent>
          </Tooltip>
        ) : null}

        {!compactCards && isMain && !isFolder && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className="inline-flex h-[16px] shrink-0 items-center rounded border-foreground/20 bg-foreground/[0.06] px-1.5 text-[10px] leading-none font-medium text-foreground/70"
              >
                primary
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              Primary worktree (original clone directory)
            </TooltipContent>
          </Tooltip>
        )}

        {isSparse && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className="inline-flex h-[16px] shrink-0 items-center rounded border-amber-500/30 bg-amber-500/5 px-1.5 text-[10px] leading-none font-medium text-amber-700 dark:text-amber-300"
              >
                sparse
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8} className="max-w-72">
              <div className="space-y-1">
                <div>
                  {translate(
                    'auto.components.sidebar.WorktreeCard.0f33af979b',
                    'Partial checkout. Files outside these paths are not on disk.'
                  )}
                </div>
                {sparseDirs && sparseDirs.length > 0 ? (
                  <div className="font-mono text-[11px] opacity-80">
                    {formatSparseDirectoryPreview(sparseDirs)}
                  </div>
                ) : null}
              </div>
            </TooltipContent>
          </Tooltip>
        )}

        {showTitleRowIndicators && titleRowIndicators}
      </div>

      {showHeaderActions && (
        <div className="ml-auto flex shrink-0 items-center justify-center gap-1 pr-1.5">
          {showTitleRowPrimary && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex shrink-0 items-center" aria-label="Primary worktree">
                  <Star className="size-3 fill-amber-400 text-amber-400" />
                </span>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                Primary worktree (original clone directory)
              </TooltipContent>
            </Tooltip>
          )}

          {showDeleteQuickAction && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  data-workspace-board-preserve-open=""
                  onPointerDown={stopQuickActionPointerPropagation}
                  onClick={handleWorkspaceQuickAction}
                  className={cn(
                    'inline-flex size-4 items-center justify-center rounded bg-transparent opacity-0 transition-colors transition-opacity',
                    'group-hover/worktree-card:opacity-100 group-focus-within/worktree-card:opacity-100 focus-visible:opacity-100',
                    'text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:bg-destructive/10 focus-visible:text-destructive'
                  )}
                  aria-label="Delete workspace"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                Delete workspace
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      )}
    </div>
  )
}

export default WorktreeCardHeader
