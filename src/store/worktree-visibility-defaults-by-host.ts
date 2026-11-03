// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: store/worktree-visibility-defaults-by-host.ts
//
// D11-005: different execution hosts carry different visibility policies. A runtime
// host hydrates its own `worktreeVisibilityDefaults`; local and SSH hosts share the
// focused settings' defaults. Resolving that here keeps the dialog from reading the
// globally focused host's policy for a repo that lives somewhere else.
import { getRepoExecutionHostId, parseExecutionHostId } from '../shared/execution-host'
import type { WorktreeVisibilityDefaults } from '../shared/global-settings-types'

export type WorktreeVisibilityDefaultsByHost = Partial<
  Record<string, WorktreeVisibilityDefaults | null>
>

/**
 * The two spellings the renderer carries for the same value: the Orca-port slices
 * read `worktreeVisibilityDefaults`; Hydra's persisted settings type uses
 * `worktree_visibility_defaults`.
 */
export type VisibilityDefaultsSettings = {
  worktreeVisibilityDefaults?: WorktreeVisibilityDefaults
  worktree_visibility_defaults?: WorktreeVisibilityDefaults
}

/** The repo fields the resolver needs; a structural subset of `Repo`. */
export type RepoVisibilityOwner = {
  connectionId?: string | null
  executionHostId?: string | null
}

/**
 * Orca `getRepoOwnerWorktreeVisibilityDefaults`.
 *
 * Why runtime hosts read their by-host entry first: their global settings are
 * hydrated separately, so falling back to the focused settings would apply another
 * server's policy.
 */
export function getRepoOwnerWorktreeVisibilityDefaults(
  repo: RepoVisibilityOwner,
  settings: VisibilityDefaultsSettings | null | undefined,
  defaultsByHost: WorktreeVisibilityDefaultsByHost | undefined
): WorktreeVisibilityDefaults | undefined {
  const hostId = getRepoExecutionHostId(repo)
  if (parseExecutionHostId(hostId)?.kind === 'runtime') {
    return defaultsByHost?.[hostId] ?? undefined
  }
  return (
    defaultsByHost?.local ??
    settings?.worktreeVisibilityDefaults ??
    settings?.worktree_visibility_defaults
  )
}
