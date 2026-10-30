import { ALL_EXECUTION_HOSTS_SCOPE } from '../../shared/execution-host'
import { DEFAULT_SHOW_SLEEPING_WORKSPACES } from '../../shared/constants'
import type { SidebarFilterState } from './visible-worktree-kinds'
import type { WorkspaceDisplayOptions } from './WorkspaceOptionsMenu'
import type { ExecutionHostId, ExecutionHostScope } from '../../shared/execution-host'

/**
 * Whether the sidebar is currently filtered, and what "clear filters" should undo.
 *
 * Split out of visible-worktrees to keep that file under the line cap; this is
 * about the filter CHROME, not about which rows survive filtering.
 */

export function sidebarHasActiveFilters(state: SidebarFilterState): boolean {
  return (
    state.showSleepingWorkspaces !== DEFAULT_SHOW_SLEEPING_WORKSPACES ||
    state.filterRepoIds.length > 0 ||
    state.hideDefaultBranchWorkspace ||
    state.hideAutomationGeneratedWorkspaces ||
    state.hideCliCreatedWorkspaces ||
    state.hideDetachedHeadWorkspaces ||
    state.hideWorkspacesFromOtherDevices ||
    // Why: turning this off is the only way to narrow the list below the
    // default, so Clear Filters must be able to undo it like any other filter.
    state.alwaysShowDefaultBranchWorkspace === false ||
    state.visibleWorkspaceHostIds != null ||
    (state.workspaceHostScope != null && state.workspaceHostScope !== ALL_EXECUTION_HOSTS_SCOPE)
  )
}

/** Describes which mutators the Clear Filters button must invoke, separated
 *  from the mutators themselves so the decision logic is testable. */
export type ClearFilterActions = {
  resetShowSleepingWorkspaces: boolean
  resetFilterRepoIds: boolean
  resetHideDefaultBranchWorkspace: boolean
  resetHideAutomationGeneratedWorkspaces: boolean
  resetHideCliCreatedWorkspaces: boolean
  resetHideDetachedHeadWorkspaces: boolean
  resetHideWorkspacesFromOtherDevices: boolean
  resetAlwaysShowDefaultBranchWorkspace: boolean
  resetVisibleWorkspaceHostIds: boolean
}

/**
 * Determines which sidebar filters the Clear Filters button needs to reset.
 * Returning an explicit action plan (rather than just calling the setters)
 * keeps the pure decision separate from the impure mutations, so tests can
 * verify the logic without mounting the component.
 *
 * Why reset only the ones that are set: keeps Clear Filters from churning
 * UI state (and the debounced ui.set write-back) on every click when the
 * flag was already off.
 */
export function computeClearFilterActions(state: SidebarFilterState): ClearFilterActions {
  return {
    resetShowSleepingWorkspaces: state.showSleepingWorkspaces !== DEFAULT_SHOW_SLEEPING_WORKSPACES,
    resetFilterRepoIds: state.filterRepoIds.length > 0,
    resetHideDefaultBranchWorkspace: state.hideDefaultBranchWorkspace,
    resetHideAutomationGeneratedWorkspaces: state.hideAutomationGeneratedWorkspaces,
    resetHideCliCreatedWorkspaces: state.hideCliCreatedWorkspaces,
    resetHideDetachedHeadWorkspaces: state.hideDetachedHeadWorkspaces,
    resetHideWorkspacesFromOtherDevices: state.hideWorkspacesFromOtherDevices,
    resetAlwaysShowDefaultBranchWorkspace: state.alwaysShowDefaultBranchWorkspace === false,
    resetVisibleWorkspaceHostIds:
      state.visibleWorkspaceHostIds != null ||
      (state.workspaceHostScope != null && state.workspaceHostScope !== ALL_EXECUTION_HOSTS_SCOPE)
  }
}

/**
 * Shared pure utility that computes the ordered list of visible (non-archived,
 * non-filtered) worktree IDs. Both the App-level Cmd+1–9 handler and
 * WorktreeList's render pipeline consume this function so the numbering and
 * card order can never diverge.
 *
 * Why a shared function: if the filter/sort pipeline lived in two places, a
 * new filter added in one but not the other would silently break the mapping
 * between badge numbers and the Cmd+N shortcut target.
 */

export type SidebarClearPlan = {
  /** Display options after the selective reset (same object when nothing changed). */
  displayOptions: WorkspaceDisplayOptions
  resetHostScope: boolean
  changed: boolean
}

/**
 * Selective Clear Filters for the shell's options state: maps the option blob onto
 * the filter state Orca's `computeClearFilterActions` reads, then patches only the
 * flags that were actually narrowing the list. Persisting is the caller's job.
 */
export function planSidebarClearFilters(
  displayOptions: WorkspaceDisplayOptions,
  hostState: {
    visibleWorkspaceHostIds: readonly ExecutionHostId[] | null
    workspaceHostScope: ExecutionHostScope
  }
): SidebarClearPlan {
  const actions = computeClearFilterActions({
    showSleepingWorkspaces: !displayOptions.hideSleeping,
    filterRepoIds: displayOptions.filterProjectIds ?? [],
    hideDefaultBranchWorkspace: displayOptions.hideDefaultBranch,
    hideAutomationGeneratedWorkspaces: displayOptions.hideAutomationCreated,
    hideCliCreatedWorkspaces: displayOptions.hideCliCreated,
    hideDetachedHeadWorkspaces: displayOptions.hideDetachedHead,
    hideWorkspacesFromOtherDevices: false,
    alwaysShowDefaultBranchWorkspace: displayOptions.alwaysShowDefaultBranch,
    visibleWorkspaceHostIds: hostState.visibleWorkspaceHostIds,
    workspaceHostScope: hostState.workspaceHostScope,
  })
  const patches: Partial<WorkspaceDisplayOptions> = {}
  if (actions.resetShowSleepingWorkspaces) patches.hideSleeping = false
  if (actions.resetFilterRepoIds) patches.filterProjectIds = []
  if (actions.resetHideDefaultBranchWorkspace) patches.hideDefaultBranch = false
  if (actions.resetHideAutomationGeneratedWorkspaces) patches.hideAutomationCreated = false
  if (actions.resetHideCliCreatedWorkspaces) patches.hideCliCreated = false
  if (actions.resetHideDetachedHeadWorkspaces) patches.hideDetachedHead = false
  if (actions.resetAlwaysShowDefaultBranchWorkspace) patches.alwaysShowDefaultBranch = true
  const changed = Object.keys(patches).length > 0 || actions.resetVisibleWorkspaceHostIds
  return {
    displayOptions: Object.keys(patches).length > 0 ? { ...displayOptions, ...patches } : displayOptions,
    resetHostScope: actions.resetVisibleWorkspaceHostIds,
    changed,
  }
}
