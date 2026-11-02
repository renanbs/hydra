// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/worktree-parent-eligibility.ts
//
// Hydra's lineage is written by path (`worktreeLineage: childPath -> parentPath`), so the cycle
// walk runs over paths. The rules are Orca's: same repository, same instance, never archived,
// never the parent the row already has, and never a candidate whose ancestor chain reaches the
// child (a transitive cycle) or already sits inside a broken loop.
import type { ExecutionHostId } from '../../shared/execution-host'
import type { WorktreeStatus } from '../../lib/worktree-status'

/** One row of the parent picker: identity + the fields both eligibility and painting read. */
export type WorktreeParentPickerCandidate = {
  /** Stable row key (Orca's `Worktree.id` shape: `${repoId}::${path}`). */
  id: string
  /** Absolute workspace path — the key Hydra's lineage writer records. */
  path: string
  displayName: string
  branch: string
  repoId: string
  projectId: string
  hostId?: ExecutionHostId
  isArchived: boolean
  /** Repo chrome the row paints: badge label/colour and the remote connection, if any. */
  repoLabel: string
  repoBadgeColor?: string
  connectionId?: string | null
  /** Activity dot for the candidate (same signal the sidebar card paints). */
  status: WorktreeStatus
  /** The workspace the app currently shows as active. */
  isActive: boolean
}

export function collectCyclicWorktreeParentPaths(
  lineageByPath: Readonly<Record<string, string | undefined>>
): Set<string> {
  const cyclic = new Set<string>()
  for (const start of Object.keys(lineageByPath)) {
    if (cyclic.has(start)) {
      continue
    }
    const chain: string[] = []
    const indexByPath = new Map<string, number>()
    let current: string | undefined = start
    while (current !== undefined && !cyclic.has(current)) {
      const loopStart = indexByPath.get(current)
      if (loopStart !== undefined) {
        for (let index = loopStart; index < chain.length; index += 1) {
          const path = chain[index]
          if (path !== undefined) {
            cyclic.add(path)
          }
        }
        break
      }
      indexByPath.set(current, chain.length)
      chain.push(current)
      current = lineageByPath[current]
    }
  }
  return cyclic
}

/**
 * Whether `candidate` may become `child`'s parent at all.
 *
 * A stale link the row already points at is rejected here too: re-selecting the parent it has
 * is not an edit, and writing it would only bump metadata.
 */
export function canAssignWorktreeParent(args: {
  childPath: string
  candidatePath: string
  lineageByPath: Readonly<Record<string, string | undefined>>
  cyclicChildPaths?: ReadonlySet<string>
}): boolean {
  const { childPath, candidatePath, lineageByPath } = args
  if (childPath === candidatePath) {
    return false
  }
  if (lineageByPath[childPath] === candidatePath) {
    return false
  }
  const cyclicChildPaths =
    args.cyclicChildPaths ?? collectCyclicWorktreeParentPaths(lineageByPath)
  const visited = new Set<string>()
  let current: string | undefined = candidatePath
  while (current !== undefined) {
    // A candidate already inside a broken loop cannot anchor a healthy edge.
    if (visited.has(current) || cyclicChildPaths.has(current)) {
      return false
    }
    visited.add(current)
    if (current === childPath) {
      return false
    }
    current = lineageByPath[current]
  }
  return true
}

export function isEligibleWorktreeParent(args: {
  child: WorktreeParentPickerCandidate
  candidateParent: WorktreeParentPickerCandidate
  lineageByPath: Readonly<Record<string, string | undefined>>
  cyclicChildPaths?: ReadonlySet<string>
}): boolean {
  const { child, candidateParent } = args
  return (
    candidateParent.repoId === child.repoId &&
    child.hostId !== undefined &&
    candidateParent.hostId === child.hostId &&
    candidateParent.projectId === child.projectId &&
    !candidateParent.isArchived &&
    canAssignWorktreeParent({
      childPath: child.path,
      candidatePath: candidateParent.path,
      lineageByPath: args.lineageByPath,
      cyclicChildPaths: args.cyclicChildPaths
    })
  )
}

export function getEligibleWorktreeParents(args: {
  child: WorktreeParentPickerCandidate
  candidates: readonly WorktreeParentPickerCandidate[]
  lineageByPath: Readonly<Record<string, string | undefined>>
  cyclicChildPaths?: ReadonlySet<string>
}): WorktreeParentPickerCandidate[] {
  const cyclicChildPaths =
    args.cyclicChildPaths ?? collectCyclicWorktreeParentPaths(args.lineageByPath)
  return args.candidates.filter((candidateParent) =>
    isEligibleWorktreeParent({
      child: args.child,
      candidateParent,
      lineageByPath: args.lineageByPath,
      cyclicChildPaths
    })
  )
}
