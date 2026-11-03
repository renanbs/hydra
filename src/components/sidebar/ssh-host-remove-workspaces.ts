// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/ssh-host-remove-workspaces.ts
//
// Clears the workspaces on an SSH host that is being removed, before the target itself.
//
// `forget-local` is fully backed by `ssh_forget_workspace`: Orca's records go, remote files
// stay. `delete-remote` needs a connected host and a remote worktree deletion path, which
// Hydra has no backend for (`delete_worktree` is local-only and no SSH execution command
// exists) — it fails loudly so the dialog keeps the host instead of reporting a half-removal.
import { invoke } from '@tauri-apps/api/core'
import type { SshHostRemoveResolution } from './ssh-host-remove-resolution'

export type ClearSshHostWorkspacesResult = {
  /** Workspace ids that could not be cleared. Non-empty keeps the SSH target in place. */
  failedIds: string[]
  /** First failure message, for the dialog to explain why the host was kept. */
  error: string | null
}

export class SshRemoteDeletionUnavailableError extends Error {
  constructor() {
    super('Remote worktree deletion needs an SSH execution backend that this build does not have.')
    this.name = 'SshRemoteDeletionUnavailableError'
  }
}

type WorkspaceRow = { id: string; path: string; repoPath: string }

export async function clearSshHostWorkspaces(args: {
  resolution: SshHostRemoveResolution
  worktrees: readonly WorkspaceRow[]
  repos: readonly { id: string; path: string }[]
  mode: 'delete-remote' | 'forget-local'
}): Promise<ClearSshHostWorkspacesResult> {
  const failedIds: string[] = []
  let error: string | null = null
  const worktreesById = new Map(args.worktrees.map((row) => [row.id, row]))
  const reposById = new Map(args.repos.map((row) => [row.id, row]))

  for (const worktreeId of args.resolution.workspaceWorktreeIds) {
    const row = worktreesById.get(worktreeId)
    if (!row) {
      failedIds.push(worktreeId)
      error ??= `Workspace ${worktreeId} is no longer loaded.`
      continue
    }
    try {
      if (args.mode === 'forget-local') {
        await invoke('ssh_forget_workspace', {
          connectionId: args.resolution.targetId,
          worktreePath: row.path
        })
      } else {
        // Why: fail before mutating anything — a partially deleted remote host is worse
        // than a kept one, and this build has no remote git backend.
        throw new SshRemoteDeletionUnavailableError()
      }
    } catch (err) {
      failedIds.push(worktreeId)
      error ??= err instanceof Error ? err.message : String(err)
    }
  }

  for (const repoId of args.resolution.hostRepoIds) {
    const repo = reposById.get(repoId)
    if (!repo) {
      failedIds.push(repoId)
      error ??= `Project ${repoId} is no longer loaded.`
      continue
    }
    try {
      // Why: catalog removal only drops Orca's registration; the checkout (local or
      // remote) is untouched, which is exactly what a host removal promises.
      await invoke('catalog_remove_repo', { path: repo.path })
    } catch (err) {
      failedIds.push(repoId)
      error ??= err instanceof Error ? err.message : String(err)
    }
  }

  return { failedIds, error }
}
