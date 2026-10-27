// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// STA-4343: a workspace id is `repoId::path` with no host component, so a repo
// registered on two execution hosts publishes the SAME id twice for two different
// workspaces. A confirmed delete therefore travels as an identity — `id` plus
// the host it was confirmed on — and resolves against the LIVE rows, never the
// id-keyed map (which holds one row per id and would silently delete a sibling).
//
// Deviation from the Orca source: the resolver is generic over the live row it
// returns (`Worktree` at every Orca call site) because Hydra's delete surface
// carries legacy `GitWorktreeInfo` rows rather than store `Worktree`s.
import type { Worktree } from '../../shared/worktree/types'
import { normalizeExecutionHostId } from '../../shared/execution-host'
import type { ExecutionHostId } from '../../shared/execution-host'
import type { WorktreeRemovalTarget } from '../../shared/worktree/removal'

export type WorktreeBatchDeleteOptions = {
  forceConfirm?: boolean
  forceOnConfirm?: boolean
  onDeleted?: (targets: WorktreeRemovalTarget[]) => void
}

/** `hostId` rides along because `id` alone repeats across hosts (STA-4343). */
export type WorktreeDeleteIdentity = Pick<Worktree, 'id' | 'instanceId' | 'hostId'>

export type WorktreeDeleteOptions = {
  expectedInstanceId?: string
  /** Why (STA-4343): the id-keyed map holds one row per `repoId::path`, so a row
   *  that knows its host must say so or the delete lands on the other one. */
  expectedHostId?: ExecutionHostId
}

export function toWorktreeDeleteIdentities(
  worktrees: readonly Pick<Worktree, 'id' | 'instanceId' | 'hostId'>[]
): WorktreeDeleteIdentity[] {
  return worktrees.map(({ id, instanceId, hostId }) => ({ id, instanceId, hostId }))
}

/** The minimum a live row must expose for a confirmed delete to resolve to it. */
export type WorktreeDeleteResolvableTarget = WorktreeDeleteIdentity &
  Pick<Worktree, 'isMainWorktree'>

/** Resolves one confirmed row: the id ALONE is not enough, so the host rides along. */
export type WorktreeDeleteTargetLookup<T extends WorktreeDeleteResolvableTarget = Worktree> = (
  worktreeId: string,
  hostId: ExecutionHostId | undefined
) => T | undefined

export function resolveWorktreeBatchDeleteTargets<T extends WorktreeDeleteResolvableTarget>(
  requestedWorktrees: readonly string[] | readonly WorktreeDeleteIdentity[],
  lookupTarget: WorktreeDeleteTargetLookup<T>
): T[] | null {
  // Why (STA-4343): dedup on (id, host), not id — two hosts can publish the same
  // `repoId::path`, and collapsing them here would silently drop one confirmed row.
  const uniqueRequests = Array.from(
    new Map(
      requestedWorktrees.map((request) => {
        const key = typeof request === 'string' ? request : `${request.hostId ?? ''}|${request.id}`
        return [key, request] as const
      })
    ).values()
  )
  const targets: T[] = []
  for (const request of uniqueRequests) {
    const worktreeId = typeof request === 'string' ? request : request.id
    // A request that names a host resolves on THAT host, so confirming a remote
    // row can never fall through to a local checkout at the same path — and the
    // other host's row stays reachable instead of being masked by the id-keyed map.
    const target =
      lookupTarget(worktreeId, typeof request === 'string' ? undefined : request.hostId) ?? null
    if (typeof request !== 'string' && (!target || target.instanceId !== request.instanceId)) {
      return null
    }
    if (target && !target.isMainWorktree) {
      targets.push(target)
    }
  }
  return targets
}

export function readWorktreeDeleteIdentities(value: unknown): WorktreeDeleteIdentity[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object' || !('id' in entry) || typeof entry.id !== 'string') {
      return []
    }
    const instanceId = 'instanceId' in entry ? entry.instanceId : undefined
    if (instanceId !== undefined && typeof instanceId !== 'string') {
      return []
    }
    const hostId = normalizeExecutionHostId(
      'hostId' in entry && typeof entry.hostId === 'string' ? entry.hostId : null
    )
    return [{ id: entry.id, instanceId, ...(hostId ? { hostId } : {}) }]
  })
}
