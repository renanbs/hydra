// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: renderer/src/components/status-bar/workspace-space-worktree-row.tsx
// Adaptations: Hydra decision/helpers paths; no Server/isRemote/isSparse badges
// (single-host local model — those fields don't exist); no HoverCard port
// (readiness detail in title tooltip); no force-delete recovery button
// (delete errors surface via badge; force path is the row delete with force).
import { useCallback, useState } from 'react'
import { AlertTriangle, GitBranch, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMountedRef } from '@/hooks/useMountedRef'
import type { WorkspaceSpaceWorktree } from '@/store/slices/workspace-space-types'
import { formatBytes, getWorkspaceSpaceBranchLabel } from './workspace-space-format'
import { translate } from '@/i18n/i18n'
import type { WorkspaceDecisionDetails } from './workspace-space-decision-details'
import { CheckButton } from './workspace-space-selection-controls'
import { WorkspaceSpaceSizeBar } from './workspace-space-breakdown-list'
import { WorkspaceSpaceStatusBadge } from './workspace-space-status-badge'

export function WorkspaceSpaceWorktreeRow({
  worktree,
  maxSize,
  selected,
  inspected,
  decisionDetails,
  deleteState,
  onToggleSelected,
  onInspect,
  onOpenWorkspace,
  onDelete
}: {
  worktree: WorkspaceSpaceWorktree
  maxSize: number
  selected: boolean
  inspected: boolean
  decisionDetails: WorkspaceDecisionDetails
  deleteState?: { isDeleting?: boolean; error?: string | null }
  onToggleSelected: () => void
  onInspect: () => void
  onOpenWorkspace: () => void
  onDelete: () => void
}): React.JSX.Element {
  const [deleting, setDeleting] = useState(false)
  const mountedRef = useMountedRef()
  const isDeleting = deleteState?.isDeleting ?? deleting
  const deleteError = deleteState?.error ?? null

  const handleDelete = useCallback(() => {
    setDeleting(true)
    try {
      onDelete()
    } finally {
      if (mountedRef.current) {
        setDeleting(false)
      }
    }
  }, [mountedRef, onDelete])

  const readinessTitle = [
    decisionDetails.branchStatus,
    decisionDetails.reviewLabel,
    decisionDetails.issueLabel,
    decisionDetails.linearIssueLabel,
    decisionDetails.changedFileCount === null
      ? 'git status not checked'
      : `${decisionDetails.changedFileCount} changed files`,
    `${decisionDetails.activeAgentCount} active agents`,
    `${decisionDetails.liveTerminalCount} live terminals`
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div
      role="button"
      tabIndex={0}
      aria-busy={isDeleting}
      onClick={onInspect}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') {
          return
        }
        event.preventDefault()
        onInspect()
      }}
      title={readinessTitle}
      className={cn(
        'grid w-full cursor-pointer grid-cols-[1.75rem_minmax(0,1.25fr)_minmax(9rem,0.55fr)_8rem_9.5rem] items-center gap-3 border-b border-border/45 px-3 py-2.5 text-left text-sm transition-colors last:border-b-0 hover:bg-accent/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        inspected && 'bg-accent/55',
        isDeleting && 'cursor-wait opacity-50 grayscale hover:bg-transparent'
      )}
    >
      <CheckButton
        checked={selected}
        disabled={worktree.isMainWorktree}
        label={translate(
          'auto.components.status.bar.WorkspaceSpaceManagerPanel.0d1c78d749',
          'Select {{value0}}',
          { value0: worktree.displayName }
        )}
        onClick={onToggleSelected}
      />

      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onOpenWorkspace()
            }}
            className="min-w-0 truncate font-medium hover:underline"
            title={`Open ${worktree.path}`}
          >
            {worktree.displayName}
          </button>
          {!worktree.isMainWorktree && decisionDetails && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                handleDelete()
              }}
              disabled={isDeleting}
              className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-destructive/15 hover:text-destructive disabled:opacity-50"
              title="Delete workspace"
            >
              <Trash2 className="size-3" />
            </button>
          )}
        </div>
        <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          <GitBranch className="size-3 shrink-0" />
          <span className="truncate">{getWorkspaceSpaceBranchLabel(worktree)}</span>
        </div>
        <div className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
          {worktree.path}
        </div>
        {deleteError ? (
          <div className="mt-2 flex min-w-0 items-start gap-2 rounded-md border border-destructive/35 bg-destructive/8 px-2 py-1.5 text-[11px] text-destructive">
            <AlertTriangle className="mt-0.5 size-3 shrink-0" />
            <span className="min-w-0 flex-1 break-words" title={deleteError}>
              {deleteError}
            </span>
          </div>
        ) : null}
      </div>

      <div className="min-w-0 text-xs">
        <div className="truncate font-medium">{worktree.repoDisplayName}</div>
        <div className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
          {worktree.repoPath}
        </div>
      </div>

      <div className="min-w-0 space-y-1.5">
        <div className="text-right text-sm font-medium tabular-nums">
          {worktree.status === 'ok' ? formatBytes(worktree.sizeBytes) : '—'}
        </div>
        <WorkspaceSpaceSizeBar value={worktree.sizeBytes} max={maxSize} />
      </div>

      <div className="flex justify-end">
        <WorkspaceSpaceStatusBadge
          worktree={worktree}
          decisionDetails={decisionDetails}
          deleteState={deleteState}
        />
      </div>
    </div>
  )
}
