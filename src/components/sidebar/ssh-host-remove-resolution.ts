import {
  getRepoExecutionHostId,
  getWorktreeExecutionHostId,
  toSshExecutionHostId
} from '../../shared/execution-host'
import type { Repo } from '../../shared/repo-types'
import type { Worktree } from '../../shared/worktree/types'

export type SshHostRemoveResolution = {
  targetId: string
  /**
   * Workspaces that live on this host: every non-main worktree under one of its repos,
   * plus one for each repo root (the root workspace is a workspace too).
   */
  workspaceCount: number
}

/**
 * Counts what still lives on a host being removed, so the removal dialog can say what
 * stays behind instead of guessing.
 *
 * Ownership resolves through the same helpers the sidebar groups rows by — a worktree's
 * own `hostId` wins over its repo's — so the number agrees with the host header's badge
 * rather than introducing a second, drifting convention for "which host owns this".
 */
export function resolveSshHostRemoval(args: {
  targetId: string
  repos: readonly Pick<Repo, 'id' | 'connectionId' | 'executionHostId'>[]
  worktrees: readonly Pick<Worktree, 'id' | 'repoId' | 'isMainWorktree' | 'hostId'>[]
}): SshHostRemoveResolution {
  const hostId = toSshExecutionHostId(args.targetId)
  const repoById = new Map(args.repos.map((repo) => [repo.id, repo]))
  const hostRepoIds = new Set<string>()
  for (const repo of args.repos) {
    if (getRepoExecutionHostId(repo) === hostId) {
      hostRepoIds.add(repo.id)
    }
  }
  // Why dedupe by id: the store can transiently hold duplicate rows mid host merge, and a
  // doubled row must not inflate the count the user is warned with.
  const worktreeIds = new Set<string>()
  for (const worktree of args.worktrees) {
    if (worktree.isMainWorktree) {
      continue
    }
    if (getWorktreeExecutionHostId(worktree, repoById.get(worktree.repoId)) !== hostId) {
      continue
    }
    worktreeIds.add(worktree.id)
  }
  return { targetId: args.targetId, workspaceCount: worktreeIds.size + hostRepoIds.size }
}
