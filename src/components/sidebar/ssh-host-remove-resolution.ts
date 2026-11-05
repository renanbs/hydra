// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/ssh-host-remove-resolution.ts
//
// Classifies what removing an SSH target means for the workspaces still on it, so the
// host-removal dialog can offer the right choice:
//  - connected   → delete host AND its remote worktrees (real git removal)
//  - disconnected → target still configured but not connected; only local cleanup is safe
//  - ghost        → target no longer in the registry; only local cleanup is possible
import type { SshConnectionState } from '../../shared/ssh-types'
import {
  getRepoExecutionHostId,
  getWorktreeExecutionHostId,
  toSshExecutionHostId
} from '../../shared/execution-host'
import type { Repo } from '../../shared/repo-types'
import type { Worktree } from '../../shared/worktree/types'
import {
  omitCatalogRowsAlreadyInStore,
  type SshHostCatalogRow
} from './ssh-host-remove-catalog'

export type SshHostRemoveResolution = {
  targetId: string
  /** Non-main worktrees on this host that a remote delete would remove. */
  workspaceWorktreeIds: string[]
  /** Repo ids whose main/root workspace lives on this host. */
  hostRepoIds: string[]
  /**
   * Catalog rows still on the host that the store does not already represent
   * (repo roots + folder workspaces). This is what keeps the count truthful when
   * the live store composes no repo ring.
   */
  catalogRows: SshHostCatalogRow[]
  workspaceCount: number
  isConnected: boolean
}

/**
 * Counts what still lives on a host being removed, so the removal dialog can say what
 * stays behind instead of guessing.
 *
 * Ownership resolves through the same helpers the sidebar groups rows by — a worktree's
 * own `hostId` wins over its repo's — so the number agrees with the host header's badge
 * rather than introducing a second, drifting convention for "which host owns this".
 * Catalog rows add what the store cannot see; a repo the store also knows is deduped by
 * path so the count (and the cascade) stays one row per workspace.
 */
export function resolveSshHostRemoval(args: {
  targetId: string
  repos: readonly (Pick<Repo, 'id' | 'connectionId' | 'executionHostId'> & {
    path?: string
  })[]
  worktrees: readonly Pick<Worktree, 'id' | 'repoId' | 'isMainWorktree' | 'hostId'>[]
  sshConnectionStates?: ReadonlyMap<string, Pick<SshConnectionState, 'status'> | undefined>
  catalogRows?: readonly SshHostCatalogRow[]
}): SshHostRemoveResolution {
  const hostId = toSshExecutionHostId(args.targetId)
  const repoById = new Map(args.repos.map((repo) => [repo.id, repo]))
  // Why dedupe by id: the store can transiently hold duplicate rows mid host merge, and a
  // doubled row must not inflate the count the user is warned with or delete twice.
  const hostRepoIds = new Set<string>()
  const hostRepoPaths: string[] = []
  for (const repo of args.repos) {
    if (getRepoExecutionHostId(repo) === hostId) {
      hostRepoIds.add(repo.id)
      if (typeof repo.path === 'string') {
        hostRepoPaths.push(repo.path)
      }
    }
  }
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
  const catalogRows = omitCatalogRowsAlreadyInStore({
    catalogRows: args.catalogRows ?? [],
    storeRepoPaths: hostRepoPaths
  })
  return {
    targetId: args.targetId,
    workspaceWorktreeIds: [...worktreeIds],
    hostRepoIds: [...hostRepoIds],
    catalogRows,
    // A repo's main/root workspace counts too — removing the host drops it.
    workspaceCount: worktreeIds.size + hostRepoIds.size + catalogRows.length,
    isConnected: args.sshConnectionStates?.get(args.targetId)?.status === 'connected'
  }
}
