// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/add-repo-existing-workspaces-telemetry.ts
//
// D02a-031: count-only telemetry for pre-existing workspaces discovered while
// adding a project. The payload carries bucketed counts only — never branch
// names, paths, or display names (privacy invariant: `JSON.stringify(payload)`
// must not contain user text).
import type { AddRepoExistingWorkspaceSource } from './telemetry-property-schemas'
import type { addRepoExistingWorkspacesDetectedSchema } from './telemetry-repository-event-schemas'
import type { z } from 'zod'

export type AddRepoExistingWorkspacesDetectedProps = z.infer<
  typeof addRepoExistingWorkspacesDetectedSchema
>

const MAX_REPORTED_WORKSPACES = 50

/** Structural subset of the worktree row the builder reads. */
export type ExistingWorkspaceTelemetryWorktree = {
  branch?: string | null
  path: string
  displayName?: string | null
  display_name?: string | null
  isMainWorktree?: boolean
  is_main?: boolean
  isSparse?: boolean
  is_sparse?: boolean
  lastActivityAt?: number | null
}

function countWorkspaces(count: number): number {
  return Math.min(MAX_REPORTED_WORKSPACES, Math.max(0, count))
}

function branchDisplayName(worktree: ExistingWorkspaceTelemetryWorktree): string {
  return (worktree.branch ?? '').replace(/^refs\/heads\//, '')
}

function pathBasename(pathValue: string): string {
  return (
    pathValue
      .replace(/[\\/]+$/, '')
      .split(/[\\/]/)
      .findLast(Boolean) ?? ''
  )
}

function displayNameOf(worktree: ExistingWorkspaceTelemetryWorktree): string {
  return worktree.displayName ?? worktree.display_name ?? ''
}

function isCustomDisplayName(worktree: ExistingWorkspaceTelemetryWorktree): boolean {
  const branchName = branchDisplayName(worktree)
  const pathName = pathBasename(worktree.path)
  const displayName = displayNameOf(worktree)
  return Boolean(
    displayName && displayName !== branchName && displayName !== pathName
  )
}

function isMain(worktree: ExistingWorkspaceTelemetryWorktree): boolean {
  return worktree.isMainWorktree ?? worktree.is_main ?? false
}

function isSparse(worktree: ExistingWorkspaceTelemetryWorktree): boolean {
  return (worktree.isSparse ?? worktree.is_sparse) === true
}

export function buildAddRepoExistingWorkspacesTelemetry(
  source: AddRepoExistingWorkspaceSource | null,
  worktrees: readonly ExistingWorkspaceTelemetryWorktree[]
): Omit<AddRepoExistingWorkspacesDetectedProps, 'nth_repo_added'> | null {
  if (!source || worktrees.length === 0) {
    return null
  }

  const mainWorkspaceCount = worktrees.filter(isMain).length
  const branchNamedWorkspaceCount = worktrees.filter((worktree) =>
    Boolean(branchDisplayName(worktree))
  ).length
  const sparseWorkspaceCount = worktrees.filter(isSparse).length

  return {
    source,
    existing_workspace_count: countWorkspaces(worktrees.length),
    existing_linked_workspace_count: countWorkspaces(worktrees.length - mainWorkspaceCount),
    main_workspace_count: countWorkspaces(mainWorkspaceCount),
    branch_named_workspace_count: countWorkspaces(branchNamedWorkspaceCount),
    detached_workspace_count: countWorkspaces(worktrees.length - branchNamedWorkspaceCount),
    custom_named_workspace_count: countWorkspaces(worktrees.filter(isCustomDisplayName).length),
    sparse_workspace_count: countWorkspaces(sparseWorkspaceCount)
  }
}

export function buildAddRepoExistingWorkspacesDetectedEvent(
  source: AddRepoExistingWorkspaceSource,
  worktrees: readonly ExistingWorkspaceTelemetryWorktree[]
): Omit<AddRepoExistingWorkspacesDetectedProps, 'nth_repo_added'> | null {
  const sortedWorktrees = [...worktrees].sort((a, b) => {
    const aActivity = a.lastActivityAt ?? 0
    const bActivity = b.lastActivityAt ?? 0
    if (aActivity !== bActivity) {
      return bActivity - aActivity
    }
    return displayNameOf(a).localeCompare(displayNameOf(b))
  })
  const payload = buildAddRepoExistingWorkspacesTelemetry(source, sortedWorktrees)
  return payload && shouldTrackAddRepoExistingWorkspacesDetected(payload) ? payload : null
}

export function shouldTrackAddRepoExistingWorkspacesDetected(
  payload: Omit<AddRepoExistingWorkspacesDetectedProps, 'nth_repo_added'> | null
): boolean {
  // Track the import/discovery signal, not mere setup-modal exposure: the main
  // checkout is always a worktree, but only non-main worktrees imply migration.
  if (!payload || payload.existing_linked_workspace_count === 0) {
    return false
  }

  // Clone/create produce a new project during this flow, so their setup step is
  // not evidence of a pre-existing workspace migration opportunity.
  return (
    payload.source === 'local_folder_picker' ||
    payload.source === 'runtime_server_path' ||
    payload.source === 'ssh_remote_path'
  )
}
