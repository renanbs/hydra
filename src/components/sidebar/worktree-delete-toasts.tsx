// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Sources: components/sidebar/stale-workspace-list-toast.ts,
// components/sidebar/delete-worktree-failure-toast.tsx,
// components/sidebar/delete-worktree-preference-toast.ts,
// components/sidebar/preserved-branch-batch-toast.ts
import { toast } from 'sonner'
import type { WorktreeRemovalTarget } from '../../shared/worktree/removal'
import type { PreservedBranchInfo } from './worktree-delete-parallel'

const STALE_LIST_DESCRIPTION = 'Refresh Space and try again if the workspace list looks stale.'

/** A delete target changed or vanished after the action was selected. */
export function showWorkspaceListChangedToast(): void {
  toast.info('Workspace list changed', { description: STALE_LIST_DESCRIPTION })
}

/** A multi-select delete whose selection resolved to nothing deletable. */
export function showNoDeletableWorkspacesToast(): void {
  toast.info('No deletable workspaces selected', { description: STALE_LIST_DESCRIPTION })
}

/**
 * Orca `persistDeleteWorktreeConfirmSkipPreference`: confirm the saved preference
 * and deep-link to the exact toggle so a skipped destructive confirmation can be
 * undone quickly.
 */
export function showSkipDeleteConfirmToast(
  openSettingsTarget: () => void
): void {
  toast.success("We'll skip this confirmation next time.", {
    description: 'You can change this in Settings.',
    duration: 8000,
    action: {
      label: 'Open Settings',
      onClick: openSettingsTarget,
    },
  })
}

export function showPreservedBranchBatchToast(
  deletedCount: number,
  branches: readonly PreservedBranchInfo[]
): void {
  if (branches.length === 0) return
  const names = branches.map((branch) => branch.branchName)
  toast.info(
    branches.length === 1
      ? '1 branch was preserved'
      : `${branches.length} branches were preserved`,
    {
      description: `${deletedCount} workspace${deletedCount === 1 ? '' : 's'} deleted. Recover: ${names.join(', ')}`,
      duration: 12000,
    }
  )
}

export type DeleteWorktreeFailureToastArgs = {
  target: WorktreeRemovalTarget
  worktreeName: string
  summary: string
  guidance: string | null
  canForceDelete: boolean
  /** The failed removal left changes on disk, so "View" lands on the diff. */
  hasKnownChanges: boolean
  /** A retry may waive an archive-hook refusal (Orca #19334). */
  canDeleteAnyway: boolean
  onViewChanges: () => void
  onForceDelete: () => void
  onDeleteAnyway: () => void
}

function deleteFailureToastId(worktreeId: string): string {
  return `delete-worktree-failure:${worktreeId}`
}

export function showDeleteWorktreeFailureToast(args: DeleteWorktreeFailureToastArgs): void {
  const id = deleteFailureToastId(args.target.id)
  const run = (action: () => void) => () => {
    toast.dismiss(id)
    action()
  }
  // Why custom content: Sonner's native action/cancel slots share the title row
  // and squeeze a multi-line delete error; the three recovery actions need their
  // own row.
  toast.error(args.summary, {
    id,
    duration: Infinity,
    description: (
      <div className="flex w-full flex-col gap-3">
        {args.guidance ? (
          <p className="text-sm leading-5 text-popover-foreground/80">{args.guidance}</p>
        ) : null}
        <div className="flex flex-wrap justify-end gap-2">
          {args.hasKnownChanges ? (
            <button
              type="button"
              onClick={run(args.onViewChanges)}
              className="rounded-md border border-border px-2.5 py-1 text-[11px] font-medium text-foreground transition hover:bg-accent"
            >
              View
            </button>
          ) : null}
          {args.canForceDelete ? (
            <button
              type="button"
              onClick={run(args.onForceDelete)}
              className="rounded-md bg-red-600 px-2.5 py-1 text-[11px] font-medium text-white transition hover:bg-red-500"
            >
              Force Delete
            </button>
          ) : null}
          {args.canDeleteAnyway ? (
            <button
              type="button"
              onClick={run(args.onDeleteAnyway)}
              className="rounded-md bg-red-600/80 px-2.5 py-1 text-[11px] font-medium text-white transition hover:bg-red-600"
            >
              Delete Anyway
            </button>
          ) : null}
        </div>
      </div>
    ),
  })
}
