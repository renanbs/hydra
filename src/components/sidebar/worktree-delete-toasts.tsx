// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Sources: components/sidebar/stale-workspace-list-toast.ts,
// components/sidebar/delete-worktree-failure-toast.tsx,
// components/sidebar/delete-worktree-preference-toast.ts,
// components/sidebar/preserved-branch-batch-toast.ts
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { WorktreeRemovalTarget } from '../../shared/worktree/removal'
import type { ForceDeleteWorktreeBranchResult } from '../../shared/worktree/create-types'
import { getRepoIdFromWorktreeId } from '../../shared/worktree/id'
import { useAppStore } from '@/store'
import { Button } from '@/components/ui/button'
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

const BRANCH_REPO_DELETE_CONCURRENCY = 4

export type ActionablePreservedBranch = PreservedBranchInfo & { expectedHead: string }

type PreservedBranchDeleteResult = {
  branch: ActionablePreservedBranch
  result: { ok: true } & ForceDeleteWorktreeBranchResult | { ok: false; error: string }
}

/** Modal-store fields the toast needs; the live store exposes them through the UI slice. */
type PreservedBranchStore = {
  openModal: (modal: string, data?: Record<string, unknown>) => void
  forceDeletePreservedBranch: (
    worktreeId: string,
    branchName: string,
    expectedHead: string,
    options?: { suppressToast?: boolean; hostId?: string; runtimeEnvironmentId?: string }
  ) => Promise<({ ok: true } & ForceDeleteWorktreeBranchResult) | { ok: false; error: string }>
  repos: readonly { id: string; displayName: string }[]
}

function getPreservedBranchStore(): PreservedBranchStore {
  // Reason: the composed UI/worktree slices are typed as `any` on this branch; the
  // two methods are the runtime contract asserted by the capability tests.
  return useAppStore.getState() as unknown as PreservedBranchStore
}

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  operation: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let nextIndex = 0
  const worker = async (): Promise<void> => {
    while (nextIndex < items.length) {
      const index = nextIndex
      nextIndex += 1
      results[index] = await operation(items[index])
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  )
  return results
}

function PreservedBranchBatchToastBody({
  branches,
  onReview
}: {
  branches: readonly PreservedBranchInfo[]
  onReview: () => void
}): React.JSX.Element {
  const actionableCount = branches.filter((branch) => branch.expectedHead).length
  return (
    <div className="flex w-[300px] max-w-[calc(100vw-96px)] flex-col gap-3">
      <p className="min-w-0 break-words text-sm leading-5 text-popover-foreground/80">
        Git kept {branches.length} local branches because they may contain unmerged commits. Kept
        branches do not retain workspace folders; their commits remain in the repository. Orca may
        continue freeing workspace disk space in the background.
      </p>
      {actionableCount > 0 ? (
        <Button type="button" variant="destructive" size="sm" className="w-full" onClick={onReview}>
          <Trash2 className="size-3.5" />
          Review {actionableCount} Branches
        </Button>
      ) : null}
    </div>
  )
}

export function showPreservedBranchBatchToast(
  deletedCount: number,
  branches: readonly PreservedBranchInfo[]
): void {
  if (branches.length === 0) return
  const actionableCount = branches.filter((branch) => branch.expectedHead).length
  const toastId = `preserved-branch-batch:${branches[0].worktreeId}:${branches.length}`
  const onReview = (): void => {
    getPreservedBranchStore().openModal('preserved-branch-review', { branches })
    toast.dismiss(toastId)
  }

  toast.warning(
    `${deletedCount} workspace${deletedCount === 1 ? '' : 's'} removed, ${branches.length} branch${branches.length === 1 ? '' : 'es'} kept`,
    {
      id: toastId,
      description: <PreservedBranchBatchToastBody branches={branches} onReview={onReview} />,
      dismissible: true,
      ...(actionableCount > 0 ? { duration: Infinity } : {})
    }
  )
}

export async function forceDeletePreservedBranchBatch(
  branches: readonly ActionablePreservedBranch[]
): Promise<void> {
  if (branches.length === 0) return
  const store = getPreservedBranchStore()
  const progressToastId = `force-delete-branch-batch:${branches[0].worktreeId}:${branches.length}`
  toast.loading(`Deleting local branches: ${branches.length}`, { id: progressToastId })
  const branchesByRepo = new Map<string, ActionablePreservedBranch[]>()
  for (const branch of branches) {
    const repoId = getRepoIdFromWorktreeId(branch.worktreeId)
    const repoBranches = branchesByRepo.get(repoId)
    if (repoBranches) repoBranches.push(branch)
    else branchesByRepo.set(repoId, [branch])
  }
  const groupResults = await mapWithConcurrency(
    [...branchesByRepo.values()],
    BRANCH_REPO_DELETE_CONCURRENCY,
    async (repoBranches) => {
      const results: PreservedBranchDeleteResult[] = []
      for (const branch of repoBranches) {
        results.push({
          branch,
          result: await store.forceDeletePreservedBranch(
            branch.worktreeId,
            branch.branchName,
            branch.expectedHead,
            {
              suppressToast: true,
              ...(branch.hostId ? { hostId: branch.hostId } : {}),
              ...(branch.runtimeEnvironmentId
                ? { runtimeEnvironmentId: branch.runtimeEnvironmentId }
                : {})
            }
          )
        })
      }
      return results
    }
  )
  const results = groupResults.flat()
  const failures = results.filter((result) => !result.result.ok)
  if (failures.length === 0) {
    toast.success(`Local branches deleted: ${branches.length}`, { id: progressToastId })
    return
  }
  const deletedCount = branches.length - failures.length
  const description = failures
    .map(({ branch, result }) => (result.ok ? '' : `${branch.branchName}: ${result.error}`))
    .filter(Boolean)
    .join('; ')
  const failedBranches = failures.map(({ branch }) => branch)
  toast.error(`${deletedCount} deleted, ${failures.length} not deleted`, {
    id: progressToastId,
    description: (
      <div className="flex w-[300px] max-w-[calc(100vw-96px)] flex-col gap-3">
        <p className="min-w-0 break-words text-sm leading-5 text-popover-foreground/80">
          {description}
        </p>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="w-full"
          onClick={() => {
            void forceDeletePreservedBranchBatch(failedBranches)
          }}
        >
          <Trash2 className="size-3.5" />
          Retry {failedBranches.length} Branches
        </Button>
      </div>
    ),
    duration: Infinity,
    dismissible: true
  })
}

export type PreservedBranchWorktree = {
  displayName?: string
  isMainWorktree?: boolean
}

function PreservedBranchToastBody({
  description,
  forceDeleteLabel,
  onForceDelete
}: {
  description: string
  forceDeleteLabel: string | undefined
  onForceDelete: (() => void) | undefined
}): React.JSX.Element {
  return (
    <div className="flex w-[300px] max-w-[calc(100vw-96px)] flex-col gap-3">
      <p className="min-w-0 break-words text-sm leading-5 text-popover-foreground/80">
        {description}
      </p>
      {forceDeleteLabel && onForceDelete ? (
        <div className="flex min-w-0 overflow-hidden">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="w-full min-w-0"
            onClick={onForceDelete}
          >
            <Trash2 className="size-3.5" />
            <span className="truncate">{forceDeleteLabel}</span>
          </Button>
        </div>
      ) : null}
    </div>
  )
}

/**
 * Single preserved-branch toast: distinguishes deleting the repo's main
 * workspace from removing a secondary worktree, and offers the guarded force
 * delete only when the removal reported a concrete head.
 */
export function showPreservedBranchToast(
  preservedBranch: PreservedBranchInfo | undefined,
  worktree: PreservedBranchWorktree | undefined,
  onForceDelete: (branchName: string, expectedHead: string) => void
): void {
  if (!preservedBranch?.branchName) return
  const isWorkspace = worktree?.isMainWorktree === true
  const targetName = worktree?.displayName?.trim()
  const expectedHead = preservedBranch.expectedHead
  const toastId = `preserved-branch:${preservedBranch.branchName}:${expectedHead ?? 'unknown'}`
  const description = targetName
    ? `Git could not safely delete branch "${preservedBranch.branchName}" after deleting ${
        isWorkspace ? 'workspace' : 'worktree'
      } "${targetName}", so Orca kept it to avoid losing local commits.`
    : `Git could not safely delete branch "${preservedBranch.branchName}", so Orca kept it to avoid losing local commits.`
  const forceDelete = expectedHead
    ? (): void => {
        onForceDelete(preservedBranch.branchName, expectedHead)
        toast.dismiss(toastId)
      }
    : undefined

  toast.warning(isWorkspace ? 'Workspace deleted, branch kept' : 'Worktree deleted, branch kept', {
    id: toastId,
    description: (
      <PreservedBranchToastBody
        description={description}
        forceDeleteLabel={expectedHead ? 'Force Delete Branch' : undefined}
        onForceDelete={forceDelete}
      />
    ),
    dismissible: true,
    ...(expectedHead ? { duration: Infinity } : {})
  })
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
