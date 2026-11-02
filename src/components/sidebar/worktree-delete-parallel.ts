// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/worktree-delete-execution.ts
// Parallel delete pipeline:
// - dedupe by host-qualified identity;
// - mark every target "deleting" before the first invoke leaves the renderer;
// - group per (host, repo) because Git worktree removal shares repo locks only
//   inside one host;
// - delete child-first inside a group (path depth), so a parent's force-delete
//   cannot swallow a live child;
// - serialize overlapping worktree keys through a per-id turn queue;
// - cancel an ancestor whose descendant failed (the child still lives below it);
// - aggregate preserved branches into one toast and transfer focus once.
import {
  isPathInsideOrEqual,
  normalizeRuntimePathForComparison,
} from '../../shared/cross-platform-path'
import {
  composeWorktreeHostIdentity,
  getWorktreeHostIdentity,
} from '../../shared/worktree/host-qualified-identity'
import type { ExecutionHostId } from '../../shared/execution-host'

export type ParallelDeleteTarget = {
  id: string
  instanceId?: string
  hostId?: ExecutionHostId
  path: string
  repoPath: string
  displayName?: string
}

export type PreservedBranchInfo = {
  worktreeId: string
  branchName: string
  hostId?: ExecutionHostId
}

export type ParallelDeleteOutcome =
  | { ok: true; preservedBranch?: PreservedBranchInfo }
  | { ok: false; error: string }

export type ParallelDeletePorts = {
  /** Resolves the live row by host-qualified identity (never the id-only map). */
  resolveLiveTarget: (id: string, hostId: ExecutionHostId | undefined) => ParallelDeleteTarget | undefined
  deleteTarget: (
    target: ParallelDeleteTarget,
    options: { force?: boolean; allowArchiveSkip?: boolean }
  ) => Promise<ParallelDeleteOutcome>
  /**
   * Batch-wide removal options. `force` and the archive waiver belong to the whole
   * batch: a retry must not inherit the options of the attempt that just failed.
   */
  deleteOptions?: { force?: boolean; allowArchiveSkip?: boolean }
  markDeleting: (targets: readonly ParallelDeleteTarget[]) => void
  clearDeleting: (target: ParallelDeleteTarget) => void
  onFailure?: (target: ParallelDeleteTarget, error: string) => void
  onListChanged: () => void
  showPreservedBranches: (
    deletedCount: number,
    branches: readonly PreservedBranchInfo[]
  ) => void
  onDeleted?: (targets: readonly ParallelDeleteTarget[]) => void
  /** Single focus transfer committed after the whole batch settles. */
  commitFocus?: () => void
  /** True when the active workspace row no longer exists in the live list. */
  isActiveWorktreeMissing?: () => boolean
}

export type ParallelDeleteResult = {
  deleted: ParallelDeleteTarget[]
  failed: ParallelDeleteTarget[]
  listChanged: boolean
}

export function isStrictDescendantPath(parentPath: string, childPath: string): boolean {
  return (
    normalizeRuntimePathForComparison(parentPath) !==
      normalizeRuntimePathForComparison(childPath) &&
    isPathInsideOrEqual(parentPath, childPath)
  )
}

/** Deeper paths first so a child that lives inside the parent leaves first. */
export function sortDeleteGroupDeepestFirst<T extends { path: string }>(group: readonly T[]): T[] {
  return [...group].sort((left, right) => right.path.length - left.path.length)
}

/**
 * One turn per worktree id: a queued target can be recreated while an earlier
 * sibling is deleting, and two removals for the same row must not overlap.
 */
export function createDeleteTurnQueue(): <T>(
  worktreeId: string,
  operation: () => Promise<T>
) => Promise<T> {
  const tails = new Map<string, Promise<void>>()
  return async <T>(worktreeId: string, operation: () => Promise<T>): Promise<T> => {
    const previous = tails.get(worktreeId)
    const { promise: turn, resolve: releaseTurn } = Promise.withResolvers<void>()
    const tail = previous ? previous.then(() => turn) : turn
    tails.set(worktreeId, tail)
    if (previous) {
      await previous
    }
    try {
      return await operation()
    } finally {
      releaseTurn()
      if (tails.get(worktreeId) === tail) {
        tails.delete(worktreeId)
      }
    }
  }
}

export async function runWorktreeDeletesInParallel(
  targets: readonly ParallelDeleteTarget[],
  ports: ParallelDeletePorts
): Promise<ParallelDeleteResult> {
  // A destructive command must run once per identity even if a refresh duplicated rows.
  const uniqueTargets = Array.from(
    new Map(targets.map((target) => [getWorktreeHostIdentity(target), target])).values()
  )
  if (uniqueTargets.length === 0) {
    return { deleted: [], failed: [], listChanged: false }
  }

  // Immediate feedback: every card shows progress before the first invoke.
  ports.markDeleting(uniqueTargets)

  const groups = new Map<string, ParallelDeleteTarget[]>()
  for (const target of uniqueTargets) {
    const groupIdentity = composeWorktreeHostIdentity(target.hostId, target.repoPath)
    const group = groups.get(groupIdentity)
    if (group) group.push(target)
    else groups.set(groupIdentity, [target])
  }

  const preservedBranches: PreservedBranchInfo[] = []
  let listChanged = false
  const runInTurn = createDeleteTurnQueue()

  const groupResults = await Promise.all(
    [...groups.values()].map(async (group) => {
      const deletedInGroup: ParallelDeleteTarget[] = []
      const failedInGroup: ParallelDeleteTarget[] = []
      for (const target of sortDeleteGroupDeepestFirst(group)) {
        await runInTurn(target.id, async () => {
          const current = ports.resolveLiveTarget(target.id, target.hostId)
          if (!current || current.instanceId !== target.instanceId) {
            // Why: a queued row can be recreated while an earlier repo sibling deletes.
            ports.clearDeleting(target)
            listChanged = true
            return
          }
          if (failedInGroup.some((failed) => isStrictDescendantPath(target.path, failed.path))) {
            ports.clearDeleting(target)
            return
          }
          const outcome = await ports.deleteTarget(current, ports.deleteOptions ?? {})
          if (outcome.ok) {
            if (outcome.preservedBranch) {
              preservedBranches.push(outcome.preservedBranch)
            }
            deletedInGroup.push(target)
          } else {
            failedInGroup.push(target)
            ports.onFailure?.(target, outcome.error)
          }
        })
      }
      return { deleted: deletedInGroup, failed: failedInGroup }
    })
  )

  if (listChanged) {
    ports.onListChanged()
  }

  const deleted = groupResults.flatMap((group) => group.deleted)
  const failed = groupResults.flatMap((group) => group.failed)

  if (uniqueTargets.length > 1 && deleted.length + failed.length === uniqueTargets.length) {
    const targetOrder = new Map(
      uniqueTargets.map((target, index) => [getWorktreeHostIdentity(target), index])
    )
    preservedBranches.sort(
      (left, right) =>
        (targetOrder.get(
          getWorktreeHostIdentity({ id: left.worktreeId, hostId: left.hostId })
        ) ?? Number.MAX_SAFE_INTEGER) -
        (targetOrder.get(
          getWorktreeHostIdentity({ id: right.worktreeId, hostId: right.hostId })
        ) ?? Number.MAX_SAFE_INTEGER)
    )
  }
  if (preservedBranches.length > 0) {
    // Why one toast: a batch that preserved a branch per target would otherwise
    // stack N identical notifications.
    ports.showPreservedBranches(deleted.length, preservedBranches)
  }

  if (deleted.length > 0) {
    ports.onDeleted?.(deleted)
  }
  // Intermediate focus can spawn a terminal in another target that is still queued.
  if (ports.isActiveWorktreeMissing?.() !== false) {
    ports.commitFocus?.()
  }

  return { deleted, failed, listChanged }
}
