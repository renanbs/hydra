// Clears the workspaces on an SSH host that is being removed, before the target itself.
//
// `forget-local` is fully backed by `ssh_forget_workspace`: Hydra's records go,
// remote files stay. `delete-remote` runs `ssh_remote_delete_worktree` on the
// host (git worktree remove + prune, force-only directory deletion) for every
// workspace, then drops the local rows. A workspace that fails keeps the host:
// a partially deleted remote host is worse than a kept one.
import { invoke } from '@tauri-apps/api/core'
import { deleteSshWorktree } from '@/store/ssh-remote-bridge'
import { removeCatalogRepo } from '@/lib/catalog-client'
import type { SshHostRemoveResolution } from './ssh-host-remove-resolution'

export type ClearSshHostWorkspacesResult = {
  /** Workspace ids that could not be cleared. Non-empty keeps the SSH target in place. */
  failedIds: string[]
  /** First failure message, for the dialog to explain why the host was kept. */
  error: string | null
  /** Branches the host kept because a worktree removal never deletes them. */
  preservedBranches: string[]
}

type WorkspaceRow = { id: string; path: string; repoPath: string }

export async function clearSshHostWorkspaces(args: {
  resolution: SshHostRemoveResolution
  worktrees: readonly WorkspaceRow[]
  repos: readonly { id: string; path: string }[]
  mode: 'delete-remote' | 'forget-local'
}): Promise<ClearSshHostWorkspacesResult> {
  const failedIds: string[] = []
  const preservedBranches: string[] = []
  let error: string | null = null
  const worktreesById = new Map(args.worktrees.map((row) => [row.id, row]))
  const reposById = new Map(args.repos.map((row) => [row.id, row]))
  const connectionId = args.resolution.targetId

  for (const worktreeId of args.resolution.workspaceWorktreeIds) {
    const row = worktreesById.get(worktreeId)
    if (!row) {
      failedIds.push(worktreeId)
      error ??= `Workspace ${worktreeId} is no longer loaded.`
      continue
    }
    try {
      if (args.mode === 'delete-remote') {
        if (!row.repoPath) {
          throw new Error(`Workspace ${worktreeId} has no owning repository on the host.`)
        }
        // Why force: the user opted into "Also delete these workspaces", and the
        // local delete path treats that as the Force Delete confirmation.
        const outcome = await deleteSshWorktree({
          connectionId,
          repoPath: row.repoPath,
          worktreePath: row.path,
          force: true
        })
        for (const branch of outcome.preservedBranches) {
          preservedBranches.push(branch.branchName)
        }
        await invoke('ssh_forget_workspace', {
          connectionId,
          worktreePath: row.path
        })
      } else {
        await invoke('ssh_forget_workspace', {
          connectionId,
          worktreePath: row.path
        })
      }
    } catch (err) {
      failedIds.push(worktreeId)
      error ??= err instanceof Error ? err.message : String(err)
    }
  }

  // Why abort before the repo rows: a failed worktree keeps the host, so dropping its
  // root row now would leave the kept host with no row to retry from.
  if (failedIds.length > 0) {
    return { failedIds, error, preservedBranches }
  }

  for (const repoId of args.resolution.hostRepoIds) {
    const repo = reposById.get(repoId)
    if (!repo) {
      failedIds.push(repoId)
      error ??= `Project ${repoId} is no longer loaded.`
      continue
    }
    try {
      // Why: catalog removal only drops Hydra's registration; the checkout (local
      // or remote) is untouched by the row deletion itself.
      await removeCatalogRepo(repo.path, connectionId)
    } catch (err) {
      failedIds.push(repoId)
      error ??= err instanceof Error ? err.message : String(err)
    }
  }

  // Why abort before the catalog rows too: each remaining row is another workspace the
  // kept host can retry, and a partially cleared host is harder to reason about.
  if (failedIds.length > 0) {
    return { failedIds, error, preservedBranches }
  }

  // Why last: a catalog repo root must not disappear while a child worktree or a store
  // repo row still points at it. Catalog rows the store already knows were deduped by the
  // resolution, so each workspace is removed once.
  for (const row of args.resolution.catalogRows ?? []) {
    try {
      if (row.kind === 'folder') {
        // Local-only forget: it drops the catalog folder row, closes any session bound
        // to the path, and never touches the remote directory.
        await invoke('ssh_forget_workspace', {
          connectionId,
          worktreePath: row.path
        })
      } else {
        // Host-scoped: two hosts can hold the same absolute path.
        await removeCatalogRepo(row.path, connectionId)
      }
    } catch (err) {
      failedIds.push(row.id)
      error ??= err instanceof Error ? err.message : String(err)
    }
  }

  return { failedIds, error, preservedBranches }
}
