// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
import React from 'react'
import { AlertCircle, Star, Trash2 } from 'lucide-react'

import { cn } from '../../lib/utils'
import { RepoIconGlyph } from '../repo/repo-icon'
import type { HydraProject } from './types'
import { formatSparseDirectoryPreview, shouldBeginWorktreeRename } from './worktree-card-model'
import type { WorktreeCardPresentation } from './worktree-card-presentation'
import { WorktreeTitleInlineRename } from './WorktreeTitleInlineRename'
import type { WorktreeCardController } from './use-worktree-card-controller'

function RepoIdentityChip({
  repo,
  children
}: {
  repo: HydraProject
  children?: React.ReactNode
}): React.JSX.Element {
  return (
    <span
      className="inline-flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-worktree-sidebar-border bg-worktree-sidebar-accent/55"
      title={`Project ${repo.displayName || repo.name}`}
      aria-label={`Project ${repo.displayName || repo.name}`}
    >
      {children ?? (
        <span
          className="size-2 rounded-full"
          style={{ backgroundColor: repo.color || 'hsl(var(--worktree-sidebar-foreground))' }}
        />
      )}
    </span>
  )
}

export interface WorktreeCardHeaderProps {
  card: WorktreeCardController
  presentation: WorktreeCardPresentation
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
    handleDelete,
    handleWorkspaceQuickAction = handleDelete
  } = card
  const {
    showPinnedRepoIcon,
    showInlineRepoBadge,
    showHeaderActions,
    showTitleRowPrimary,
    showDeleteQuickAction,
    showTitleRowIndicators,
    titleRowIndicators,
    titleWrapper
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

  return (
    <div className="flex min-w-0 items-center justify-between gap-2">
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        {showPinnedRepoIcon && repo && (
          <RepoIdentityChip repo={repo}>
            <RepoIconGlyph
              repoIcon={repo.repo_icon}
              className="size-full"
              iconClassName="size-3"
            />
          </RepoIdentityChip>
        )}

        {showInlineRepoBadge && repo && (
          <RepoIdentityChip repo={repo}>
            <RepoIconGlyph
              repoIcon={repo.repo_icon}
              className="size-full"
              iconClassName="size-3"
            />
          </RepoIdentityChip>
        )}

        {/* Why: unread alert lives in the left status lane; title-row contrast comes from weight and dimmed read titles. */}
        <WorktreeTitleInlineRename
          displayName={visibleCardTitle}
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
          <button
            type="button"
            onPointerDown={stopQuickActionPointerPropagation}
            onClick={() => handleOpenRenameErrorDialog?.(renameError)}
            onDoubleClick={() => handleOpenRenameErrorDialog?.(renameError)}
            className="h-4 shrink-0 inline-flex items-center gap-0.5 rounded !px-0.5 text-[10px] font-medium leading-none text-destructive border border-destructive/40 bg-destructive/10 hover:bg-destructive/15 hover:text-destructive"
            aria-label="Auto-rename failed: view error"
            title="Auto-name failed. Click to see details."
          >
            <AlertCircle className="size-2.5" />
            <span>rename failed</span>
          </button>
        ) : null}

        {!compactCards && isMain && !isFolder && (
          <span
            className="h-[16px] px-1.5 text-[10px] font-medium rounded shrink-0 leading-none text-foreground/70 border border-foreground/20 bg-foreground/[0.06] inline-flex items-center"
            title="Primary worktree (original clone directory)"
          >
            primary
          </span>
        )}

        {isSparse && (
          <span
            className="h-[16px] px-1.5 text-[10px] font-medium rounded shrink-0 leading-none text-amber-700 dark:text-amber-300 border border-amber-500/30 bg-amber-500/5 inline-flex items-center"
            title={
              sparseDirs && sparseDirs.length > 0
                ? `Partial checkout:\n${formatSparseDirectoryPreview(sparseDirs)}`
                : 'Partial checkout. Files outside these paths are not on disk.'
            }
          >
            sparse
          </span>
        )}

        {showTitleRowIndicators && titleRowIndicators}
      </div>

      {showHeaderActions && (
        <div className="ml-auto flex shrink-0 items-center justify-center gap-1 pr-1.5">
          {showTitleRowPrimary && (
            <span
              className="shrink-0 inline-flex items-center"
              aria-label="Primary worktree"
              title="Primary worktree (original clone directory)"
            >
              <Star className="size-3 fill-amber-400 text-amber-400" />
            </span>
          )}

          {showDeleteQuickAction && (
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
              title="Delete workspace"
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default WorktreeCardHeader
