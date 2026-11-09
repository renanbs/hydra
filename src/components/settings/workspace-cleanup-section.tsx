// Cleanup section of the Storage page.
// Hydra-local UI over the ported classification (`use-workspace-cleanup-scan`)
// + decision details: ready candidates with one-click delete (via
// delete_worktree), review candidates with blocker badges, dismissed hidden
// with an unhide-all. No Orca dialog port: the Storage page is the surface.
import { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { toast } from 'sonner'
import { AlertTriangle, RotateCcw, Trash2 } from 'lucide-react'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { translate } from '@/i18n/i18n'
import type { WorkspaceSpaceWorktree } from '@/store/slices/workspace-space-types'
import type { WorkspaceDecisionDetails } from './workspace-space-decision-details'
import {
  clearCleanupDismissals,
  dismissCleanupCandidate,
  listCleanupDismissals,
  useWorkspaceCleanupCandidates,
  type CleanupCandidate
} from './use-workspace-cleanup-scan'
import { formatBytes } from './workspace-space-format'

const BLOCKER_LABELS: Record<string, string> = {
  'main-worktree': 'Main worktree',
  'active-workspace': 'Active workspace',
  'running-terminal': 'Running terminal',
  'live-agent': 'Live agent',
  dirty: 'Dirty files',
  'dirty-files': 'Dirty files',
  'dirty-editor-buffer': 'Unsaved edits',
  'unpushed-commits': 'Unpushed commits',
  'git-status-error': 'Git not checked',
  dismissed: 'Dismissed'
}

function BlockerBadges({ blockers }: { blockers: string[] }): React.JSX.Element | null {
  if (blockers.length === 0) {
    return (
      <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">
        Ready to delete
      </Badge>
    )
  }
  return (
    <span className="flex flex-wrap gap-1">
      {blockers.map((b) => (
        <Badge key={b} variant="outline" className="text-muted-foreground">
          {BLOCKER_LABELS[b] ?? b}
        </Badge>
      ))}
    </span>
  )
}

export function WorkspaceCleanupSection({
  rows,
  detailsById,
  activeWorktreeId,
  isScanning,
  onDeleted
}: {
  rows: readonly WorkspaceSpaceWorktree[]
  detailsById: ReadonlyMap<string, WorkspaceDecisionDetails>
  activeWorktreeId: string | null
  isScanning: boolean
  onDeleted: (paths: string[]) => void
}): React.JSX.Element {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [dismissedCount, setDismissedCount] = useState(0)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    void listCleanupDismissals()
      .then((ids) => {
        setDismissed(new Set(ids))
        setDismissedCount(ids.length)
      })
      .catch(() => {})
  }, [rows.length])

  const candidates = useWorkspaceCleanupCandidates(rows, detailsById, dismissed, activeWorktreeId)
  const visible = candidates.filter(
    (c) => !c.blockers.includes('dismissed') && !c.blockers.includes('main-worktree')
  )
  const ready = visible.filter((c) => c.ready)

  const handleDismiss = async (c: CleanupCandidate): Promise<void> => {
    try {
      const ids = await dismissCleanupCandidate(c.worktree.worktreeId)
      setDismissed(new Set(ids))
      setDismissedCount(ids.length)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error))
    }
  }

  const handleClearDismissed = async (): Promise<void> => {
    try {
      await clearCleanupDismissals()
      setDismissed(new Set())
      setDismissedCount(0)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error))
    }
  }

  const handleDelete = async (c: CleanupCandidate): Promise<void> => {
    if (!window.confirm(`Delete workspace at ${c.worktree.path}? This cannot be undone.`)) {
      return
    }
    setDeleting(c.worktree.worktreeId)
    try {
      await invoke('delete_worktree', {
        repoPath: c.worktree.repoPath,
        worktreePath: c.worktree.path,
        force: false
      })
      onDeleted([c.worktree.path])
      toast.success(translate('auto.components.storage.cleanup.deleted', 'Workspace deleted'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error))
    } finally {
      setDeleting(null)
    }
  }

  if (isScanning && candidates.length === 0) {
    return (
      <div className="rounded-lg border border-border/70 bg-background/30 px-4 py-10 text-center text-sm text-muted-foreground">
        Scanning workspaces for cleanup candidates. You can leave this page.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{ready.length}</span> ready
          <span className="mx-1.5">·</span>
          <span className="font-medium text-foreground">{visible.length}</span> review
          {dismissedCount > 0 && (
            <>
              <span className="mx-1.5">·</span>
              <span>{dismissedCount} dismissed</span>
              <button
                type="button"
                onClick={() => void handleClearDismissed()}
                className="ml-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="size-3" />
                Unhide all
              </button>
            </>
          )}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-lg border border-border/70 bg-background/30 px-4 py-10 text-center text-sm text-muted-foreground">
          {dismissedCount > 0
            ? 'All candidates dismissed. Unhide them to review again.'
            : 'No cleanup candidates. Workspaces with live work, changes, or agents stay protected.'}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border/70 bg-background/30">
          <div className="max-h-[24rem] overflow-y-auto scrollbar-sleek">
            {visible.map((c) => (
              <div
                key={c.worktree.worktreeId}
                className="flex items-center gap-3 border-b border-border/45 px-3 py-2.5 text-sm last:border-b-0 hover:bg-accent/45"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{c.worktree.displayName}</div>
                  <div className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                    {c.worktree.path}
                  </div>
                  <div className="mt-1.5">
                    <BlockerBadges blockers={c.blockers} />
                  </div>
                </div>
                <div className="shrink-0 text-right text-sm tabular-nums">
                  {formatBytes(c.worktree.sizeBytes)}
                  {c.worktree.reclaimableBytes > 0 && (
                    <div className="text-[11px] text-emerald-400">
                      +{formatBytes(c.worktree.reclaimableBytes)} reclaimable
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {!c.ready ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void handleDismiss(c)}
                    >
                      Hide
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={deleting === c.worktree.worktreeId}
                      onClick={() => void handleDelete(c)}
                      className="gap-1.5"
                    >
                      <Trash2 className="size-3.5" />
                      {deleting === c.worktree.worktreeId ? 'Deleting…' : 'Delete'}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
        <AlertTriangle className="mt-0.5 size-3 shrink-0" />
        <span>
          Cleanup never deletes the main worktree, the active workspace, or anything with live
          terminals, agents, unsaved edits, unpushed commits, or unchecked git status. Dismissed
          workspaces stay hidden until unhidden.
        </span>
      </div>
    </div>
  )
}
