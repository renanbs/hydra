// Orca `runWorktreeDeletesInParallel`: targets on independent repos/hosts can be
// removed concurrently, but removals that share a repo (and its git locks) must stay
// in post-order — a parent's force-delete can swallow a child that still lives inside
// its directory. One list per (repo, host), original order preserved inside it.
export type DeleteDispatchTarget = {
  repoPath: string
  hostId?: string | null
}

/**
 * Dirty-change hydration runs `git status` in this process, so it can only answer for
 * the local owner. A remote target stays "unknown" instead of borrowing a local count.
 */
export function canHydrateDeleteTargetLocally(hostId?: string | null): boolean {
  return !hostId || hostId === 'local'
}

export function groupDeleteTargetsForDispatch<T extends DeleteDispatchTarget>(
  targets: readonly T[]
): T[][] {
  const groups = new Map<string, T[]>()
  for (const target of targets) {
    const key = `${target.repoPath}::${target.hostId ?? ''}`
    const group = groups.get(key)
    if (group) group.push(target)
    else groups.set(key, [target])
  }
  return [...groups.values()]
}
