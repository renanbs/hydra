// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/use-worktree-context-menu-model.tsx and
// components/sidebar/WorktreeContextMenuView.tsx
//
// Hydra keeps one App-owned menu (single portal, one close-all channel), so this
// module is the pure policy/model half: it derives every label, gate and remote URL
// the view paints. App wires the actions; `WorktreeContextMenuView` paints the items.
import type { WorktreeDeleteState } from '../../store/slices/worktree-delete-state-types'

export type WorktreeDeleteMenuLabelArgs = {
  isDeleting: boolean
  isMultiContext: boolean
  /** Rows in the batch that can actually be deleted (resolvable, not main). */
  deleteTargetCount: number
  lineageDescendantCount: number
  removesProject: boolean
  folderWorkspace?: boolean
}

/**
 * Orca's variable delete label. A pending removal wins over the row shape so the
 * user never sees a second clickable "Delete" while the first is still running.
 */
export function getWorktreeDeleteMenuLabel(args: WorktreeDeleteMenuLabelArgs): string {
  if (args.isDeleting) {
    return 'Deleting…'
  }
  if (args.isMultiContext) {
    return args.deleteTargetCount > 0
      ? `Delete ${args.deleteTargetCount} Workspace${args.deleteTargetCount === 1 ? '' : 's'}`
      : 'Delete Selected'
  }
  if (args.folderWorkspace) {
    return 'Remove Workspace'
  }
  if (args.removesProject) {
    return 'Remove Project from Hydra'
  }
  if (args.lineageDescendantCount > 0) {
    return 'Delete with Descendants…'
  }
  return 'Delete'
}

export type WorktreeDeleteMenuStateArgs = {
  isMultiContext: boolean
  isDeleting: boolean
  isMainWorktree: boolean
  removesProject: boolean
  repoResolved: boolean
  deleteTargetCount: number
}

export type WorktreeDeleteMenuState = {
  label: string
  disabled: boolean
  title?: string
}

export function getWorktreeDeleteMenuState(
  args: WorktreeDeleteMenuStateArgs,
  labelArgs: Partial<
    Pick<WorktreeDeleteMenuLabelArgs, 'lineageDescendantCount' | 'folderWorkspace'>
  > = {}
): WorktreeDeleteMenuState {
  // Why: a main checkout whose project row no longer resolves has no git removal
  // path AND no "Remove Project" fallback — name the missing project instead.
  const missingProject = !args.isMultiContext && args.isMainWorktree && !args.repoResolved
  const baseDeletable = args.isMultiContext
    ? args.deleteTargetCount > 0
    : !args.isMainWorktree && args.repoResolved
  const disabled = args.isDeleting || !baseDeletable
  return {
    label: getWorktreeDeleteMenuLabel({
      isDeleting: args.isDeleting,
      isMultiContext: args.isMultiContext,
      deleteTargetCount: args.deleteTargetCount,
      lineageDescendantCount: labelArgs.lineageDescendantCount ?? 0,
      removesProject: args.removesProject,
      folderWorkspace: labelArgs.folderWorkspace ?? false
    }),
    disabled,
    title: missingProject
      ? 'The project could not be found'
      : args.isDeleting
        ? 'A selected workspace is already being deleted'
        : !baseDeletable
          ? 'This workspace is not attached to a resolvable repository'
          : undefined
  }
}

export function shouldShowWorktreeUpdateItem(isMultiContext: boolean): boolean {
  return !isMultiContext
}

/** Copy Path, Pin/Unpin and Mark Read only speak to one workspace, like Orca. */
export function shouldShowSingleContextWorktreeItems(isMultiContext: boolean): boolean {
  return !isMultiContext
}

export function isWorktreeContextMenuItemDisabled(
  deleteState: Pick<WorktreeDeleteState, 'isDeleting'> | null | undefined
): boolean {
  return deleteState?.isDeleting ?? false
}

/**
 * At least one workspace in a multi-selection may still carry a parent link; the
 * batch "Remove from Parent" row is offered only then.
 */
export function hasAnyContextLineageParent(
  paths: readonly string[],
  lineageByPath: Readonly<Record<string, string | null | undefined>>
): boolean {
  return paths.some((path) => Boolean(lineageByPath[path]?.trim()))
}

export type WorktreeRemoteWebUrls = {
  repositoryUrl: string
  openBranchUrl: string
  createPullRequestUrl: string
  pullRequestUrl: string | null
}

/**
 * `canonicalKey` is the repo identity the store already normalized
 * (`host/owner/repo`). The menu refuses to guess an owner/repo, so a missing or
 * malformed key yields no remote Git rows at all instead of a dead GitHub link.
 */
export function getWorktreeRemoteWebUrls(args: {
  canonicalKey?: string | null
  branch?: string | null
  prNumber?: number | null
}): WorktreeRemoteWebUrls | null {
  const canonicalKey = args.canonicalKey?.trim().replace(/^\/+/, '')
  if (!canonicalKey) {
    return null
  }
  const [host, owner, repoSegment, ...rest] = canonicalKey.split('/')
  const repo = repoSegment?.replace(/\.git$/i, '')
  if (!host || !owner || !repo || rest.length > 0) {
    return null
  }
  const repositoryUrl = `https://${host}/${owner}/${repo}`
  const branch = args.branch?.trim()
  const hasBranch = Boolean(branch && branch !== 'HEAD' && !branch.startsWith('(HEAD detached'))
  const openBranchUrl = hasBranch
    ? `${repositoryUrl}/tree/${encodeURIComponent(branch as string)}`
    : repositoryUrl
  const createPullRequestUrl = hasBranch
    ? `${repositoryUrl}/compare/${encodeURIComponent(branch as string)}?expand=1`
    : `${repositoryUrl}/compare`
  const prNumber = args.prNumber
  return {
    repositoryUrl,
    openBranchUrl,
    createPullRequestUrl,
    pullRequestUrl:
      typeof prNumber === 'number' && Number.isInteger(prNumber) && prNumber > 0
        ? `${repositoryUrl}/pull/${prNumber}`
        : null
  }
}
