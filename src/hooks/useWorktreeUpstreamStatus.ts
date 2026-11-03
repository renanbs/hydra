// Fetches a mounted card's upstream divergence once per (repo, path, head).
//
// The scan deliberately does not pay a rev-list per worktree, so the card asks
// the host when it mounts. The cache key includes the head commit: a new commit
// invalidates the numbers without polling, and every card sharing a checkout
// reuses the same response.
import { useEffect, useState } from 'react'
import {
  getWorktreeUpstreamStatus,
  type WorktreeUpstreamStatus
} from '../lib/worktree-upstream-status'

const upstreamStatusCache = new Map<string, WorktreeUpstreamStatus>()

function cacheKey(
  repoPath: string,
  worktreePath: string,
  head: string | null | undefined
): string {
  return `${repoPath}\u0000${worktreePath}\u0000${head ?? ''}`
}

export function useWorktreeUpstreamStatus(args: {
  repoPath: string | null | undefined
  worktreePath: string
  head?: string | null
  /** False for folder rows and workspaces owned by another host. */
  enabled?: boolean
}): WorktreeUpstreamStatus | null {
  const { repoPath, worktreePath, head, enabled = true } = args
  const key =
    enabled && repoPath && worktreePath ? cacheKey(repoPath, worktreePath, head) : ''
  const [status, setStatus] = useState<WorktreeUpstreamStatus | null>(() =>
    key ? (upstreamStatusCache.get(key) ?? null) : null
  )

  useEffect(() => {
    if (!key || !repoPath) {
      setStatus(null)
      return
    }
    const cached = upstreamStatusCache.get(key)
    if (cached) {
      setStatus(cached)
      return
    }
    let cancelled = false
    void getWorktreeUpstreamStatus(repoPath, worktreePath)
      .then((next) => {
        upstreamStatusCache.set(key, next)
        if (!cancelled) setStatus(next)
      })
      .catch(() => {
        // Why quiet: a branch with no upstream or a removed checkout is normal;
        // the chips simply do not render. The command contract keeps that case
        // as `0/0`, so a rejection means the host could not read the checkout.
        if (!cancelled) setStatus(null)
      })
    return () => {
      cancelled = true
    }
  }, [key, repoPath, worktreePath])

  return status
}
