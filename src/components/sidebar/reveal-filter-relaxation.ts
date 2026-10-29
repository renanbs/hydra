// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/worktree-list/listing/use-filters.ts (`revealWorkspaceFilters`)
//
// Revealing a workspace must not silently fail because a filter hides it. Orca
// relaxes only the filters that actually block the target and leaves the rest of
// the user's display options alone.
import type { WorkspaceDisplayOptions } from './WorkspaceOptionsMenu'

export type RevealTargetTraits = {
  path: string
  projectId: string
  isMainWorktree: boolean
  automationCreated: boolean
  cliCreated: boolean
  detachedHead: boolean
}

export type RevealRelaxation = {
  displayOptions: WorkspaceDisplayOptions
  changed: boolean
}

/** Flags this helper is allowed to relax; the caller persists them afterwards. */
export function relaxFiltersForReveal(
  displayOptions: WorkspaceDisplayOptions,
  target: RevealTargetTraits
): RevealRelaxation {
  let next = displayOptions
  const relax = (patch: Partial<WorkspaceDisplayOptions>): void => {
    next = { ...next, ...patch }
  }

  if (displayOptions.hideAutomationCreated && target.automationCreated) {
    relax({ hideAutomationCreated: false })
  }
  if (displayOptions.hideCliCreated && target.cliCreated) {
    relax({ hideCliCreated: false })
  }
  if (displayOptions.hideDetachedHead && target.detachedHead) {
    relax({ hideDetachedHead: false })
  }
  // Orca's `isDefaultBranchWorkspace` is the primary checkout of the project.
  if (displayOptions.hideDefaultBranch && target.isMainWorktree) {
    relax({ hideDefaultBranch: false })
  }
  if (displayOptions.filterProjectIds?.length && !displayOptions.filterProjectIds.includes(target.projectId)) {
    relax({ filterProjectIds: [...displayOptions.filterProjectIds, target.projectId] })
  }

  return { displayOptions: next, changed: next !== displayOptions }
}
