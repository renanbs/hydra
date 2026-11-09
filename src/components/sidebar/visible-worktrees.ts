import type { Repo } from '../../shared/repo-types'
import type { TerminalTab } from '../../shared/terminal-tab-types'
import type { WorktreeLineage } from '../../shared/worktree/lineage-types'
export type { SidebarFilterState } from './visible-worktree-kinds'
export {
  isAutomationGeneratedWorkspace,
  isCliCreatedWorkspace,
  isDetachedHeadWorkspace,
  isSleepingSweepExemptionNarrowingList,
  isSleepingSweepExemptWorkspace
} from './visible-worktree-kinds'
export { sidebarHasActiveFilters, computeClearFilterActions } from './sidebar-filter-actions'
export type { ClearFilterActions } from './sidebar-filter-actions'
import {
  isAutomationGeneratedWorkspace,
  isCliCreatedWorkspace,
  isDetachedHeadWorkspace,
  isSleepingSweepExemptWorkspace
} from './visible-worktree-kinds'
import {
  getVisibleWorkspaceHostIdSet,
  worktreeMatchesVisibleHost
} from './visible-worktree-host-scope'
import type { Worktree } from '../../shared/worktree/types'
import { buildWorktreeComparator, sortWorktreesSmart } from './smart-sort'
import { getWorktreeIdsWithLiveAgent, isInactiveWorkspace } from '@/lib/worktree-activity-state'
import { useAppStore } from '@/store'
import { getAllWorktreesFromState, getRepoMapFromState } from '@/store/selectors'
import { edgesToWorktreeLineage } from './worktree-lineage-projection'
import type { AppState } from '@/store'

/** Single-host edge map (child path -> parent path) to the rich records the
 *  grouping/validation pipeline consumes. Instance ids collapse to the
 *  worktree id: paths are stable identities with no cross-host recreates. */
function edgesToWorktreeLineageFromState(state: AppState): Record<string, import('../../shared/worktree/lineage-types').WorktreeLineage> {
  const byPath = new Map<string, { id: string }>()
  for (const list of Object.values(state.worktreesByRepo)) {
    for (const w of list as Array<{ id: string; path: string }>) {
      byPath.set(w.path, { id: w.id })
    }
  }
  return edgesToWorktreeLineage(state.worktreeLineageById as Record<string, string>, byPath)
}
import {
  ALL_EXECUTION_HOSTS_SCOPE,
  getSettingsFocusedExecutionHostId,
  getWorktreeExecutionHostId,
  normalizeExecutionHostId,
  type ExecutionHostId,
  type ExecutionHostScope
} from '../../shared/execution-host'
import {
  getCyclicProjectedWorktreeLineageIds,
  getLineageRenderInfo
} from './worktree-lineage-projection'
import {
  computeRenderedSidebarWorktreeOrder,
  computeRenderedSidebarWorktrees
} from './rendered-sidebar-worktree-order'
import {
  EMPTY_PAIRED_DEVICE_IDS_BY_ENVIRONMENT,
  getPairedDeviceIdsByEnvironment,
  isWorkspaceFromOtherDevice
} from './workspace-creator-visibility'
import { isDefaultBranchWorkspace } from './default-branch-workspace'
import { getLineageAncestorIndex, getSortedWorktreeRankIndex } from './visible-worktree-indexes'
import { getWorktreeHostIdentity } from '../../shared/worktree/host-qualified-identity'

/**
 * Whether the "Hide sleeping" sweep must keep this row (#8873).
 *
 * Why isMainWorktree and not isDefaultBranchWorkspace: the project's primary
 * checkout is the repo's only guaranteed entry point. Folder workspaces and
 * detached-HEAD mains fail the default-branch predicate yet often have no
 * sibling row at all, so sweeping them drops the entire project out of the
 * sidebar, Cmd+J and the board with no way back except changing a filter.
 *
 * Why shared: the sidebar pipeline and the jump palette both apply this, and a
 * second copy is how the two surfaces drift.
 */
export type VisibleWorktreeOptions = {
  filterRepoIds: readonly string[]
  showSleepingWorkspaces: boolean
  tabsByWorktree: Record<string, Pick<TerminalTab, 'id'>[]> | null
  ptyIdsByTabId: Record<string, string[]> | null
  /**
   * Mounted browser pages per worktree, when the caller has them. A worktree
   * with an open page is active even with no live PTY (Orca's
   * `browserTabsByWorktree`); omitted means "no browser pages".
   */
  browserTabsByWorktree?: Record<string, readonly { id: string }[]> | null
  worktreeIdsWithLiveAgent: ReadonlySet<string>
  hideDefaultBranchWorkspace: boolean
  hideAutomationGeneratedWorkspaces: boolean
  hideCliCreatedWorkspaces: boolean
  hideDetachedHeadWorkspaces: boolean
  hideWorkspacesFromOtherDevices: boolean
  pairedDeviceIdsByEnvironment: ReadonlyMap<string, string>
  alwaysShowDefaultBranchWorkspace?: boolean
  repoMap: Map<string, Repo>
  workspaceHostScope: ExecutionHostScope
  visibleWorkspaceHostIds?: readonly ExecutionHostId[] | null
  defaultHostId: ExecutionHostId
  worktreeLineageById: Record<string, import('../../shared/worktree/lineage-types').WorktreeLineage>
  injectLineageAncestors?: boolean
  forcedVisibleWorktreeIds?: readonly string[]
}

/** Every predicate that hides ONE worktree; collapse/order stay out of it. */
function passesSidebarFilterPredicates(worktree: Worktree, opts: VisibleWorktreeOptions): boolean {
  if (worktree.isArchived) return false
  if (
    opts.hideWorkspacesFromOtherDevices &&
    isWorkspaceFromOtherDevice(worktree, opts.pairedDeviceIdsByEnvironment)
  ) {
    return false
  }
  if (opts.hideDefaultBranchWorkspace && isDefaultBranchWorkspace(worktree)) return false
  if (opts.hideAutomationGeneratedWorkspaces && isAutomationGeneratedWorkspace(worktree)) {
    return false
  }
  if (opts.hideCliCreatedWorkspaces && isCliCreatedWorkspace(worktree)) return false
  if (opts.hideDetachedHeadWorkspaces && isDetachedHeadWorkspace(worktree)) return false

  const visibleHostIds =
    opts.visibleWorkspaceHostIds ??
    (opts.workspaceHostScope === ALL_EXECUTION_HOSTS_SCOPE ? null : [opts.workspaceHostScope])
  if (visibleHostIds) {
    const repo = opts.repoMap.get(worktree.repoId)
    if (!repo) return false
    const hostId = getWorktreeExecutionHostId(worktree, repo, opts.defaultHostId)
    if (!visibleHostIds.includes(hostId)) return false
  }

  if (opts.filterRepoIds.length > 0 && !opts.filterRepoIds.includes(worktree.repoId)) {
    return false
  }

  if (!opts.showSleepingWorkspaces) {
    // Why no !hideDefaultBranchWorkspace term: that filter already ran above, so
    // an explicit hide still wins over the exemption.
    const exempt = isSleepingSweepExemptWorkspace(worktree, opts.alwaysShowDefaultBranchWorkspace)
    if (
      !exempt &&
      isInactiveWorkspace(
        worktree.id,
        opts.tabsByWorktree,
        opts.ptyIdsByTabId,
        opts.browserTabsByWorktree,
        opts.worktreeIdsWithLiveAgent
      )
    ) {
      return false
    }
  }

  return true
}

/**
 * Orca `worktreePassesSidebarFilters`: filter-only visibility for ONE worktree.
 *
 * Why it exists next to the batch pipeline: a reveal target inside a collapsed
 * group is hidden by the GROUP, not by a filter, and the batch pipeline applies
 * grouping/elision afterwards (`rendered-sidebar-worktree-order.ts`). Asking the
 * predicate keeps the two answers from drifting.
 *
 * Why host-qualified: worktree ids are not host-qualified (STA-4343), so an
 * id-only match would let a visible local twin vouch for a filtered remote row.
 */
export function worktreePassesSidebarFilters(args: {
  worktree: Worktree
  options: VisibleWorktreeOptions
  executionHostId?: ExecutionHostId
}): boolean {
  const { worktree, options } = args
  if (!passesSidebarFilterPredicates(worktree, options)) return false
  if (!args.executionHostId) return true
  const repo = options.repoMap.get(worktree.repoId)
  if (!repo) return false
  return (
    normalizeExecutionHostId(
      getWorktreeExecutionHostId(worktree, repo, options.defaultHostId)
    ) === normalizeExecutionHostId(args.executionHostId)
  )
}

export function computeVisibleWorktrees(
  worktreesByRepo: Record<string, Worktree[]>,
  sortedIds: string[],
  opts: VisibleWorktreeOptions
): Worktree[] {
  // Why: sidebar lineage is structural. Archived workspaces stay hidden, but
  // every other valid ancestor can bypass filters so children never orphan.
  const lineageAncestorById = getLineageAncestorIndex(worktreesByRepo)
  // The ONE filter set: the batch path and the per-worktree predicate share it.
  let all: Worktree[] = getAllWorktreesFromState({ worktreesByRepo }).filter((worktree) =>
    passesSidebarFilterPredicates(worktree, opts)
  )

  if (opts.forcedVisibleWorktreeIds && opts.forcedVisibleWorktreeIds.length > 0) {
    const includedIds = new Set(all.map((worktree) => worktree.id))
    for (const worktreeId of opts.forcedVisibleWorktreeIds) {
      const worktree = lineageAncestorById.get(worktreeId)
      if (worktree && !includedIds.has(worktreeId)) {
        includedIds.add(worktreeId)
        all.push(worktree)
      }
    }
  }

  // Apply cached sort order. Items not yet in the cache (e.g. brand-new
  // worktrees before the next sortEpoch bump) are appended at the end.
  const orderIndex = getSortedWorktreeRankIndex(sortedIds)
  all.sort((a, b) => {
    const ai = orderIndex.get(a.id) ?? Infinity
    const bi = orderIndex.get(b.id) ?? Infinity
    return ai - bi
  })

  return opts.injectLineageAncestors === false
    ? all
    : addVisibleLineageAncestors(all, lineageAncestorById, opts.worktreeLineageById)
}

function addVisibleLineageAncestors(
  worktrees: Worktree[],
  worktreeById: Map<string, Worktree>,
  lineageById: Record<string, WorktreeLineage>
): Worktree[] {
  const result: Worktree[] = []
  const included = new Set<string>()
  const visiting = new Set<string>()
  const cyclicLineageIds = getCyclicProjectedWorktreeLineageIds(lineageById, worktreeById)

  const addWithAncestors = (worktree: Worktree): void => {
    const identity = getWorktreeHostIdentity(worktree)
    if (included.has(identity) || visiting.has(identity)) {
      return
    }
    visiting.add(identity)
    const lineage = getLineageRenderInfo(worktree, lineageById, worktreeById, cyclicLineageIds)
    if (lineage.state === 'valid') {
      // Why: sidebar lineage is structural. If a filtered child is visible,
      // its valid parent must be rendered too so the hierarchy remains legible.
      addWithAncestors(lineage.parent)
    }
    visiting.delete(identity)
    if (!included.has(identity)) {
      included.add(identity)
      result.push(worktree)
    }
  }

  for (const worktree of worktrees) {
    addWithAncestors(worktree)
  }
  return result
}

export function computeVisibleWorktreeIds(
  worktreesByRepo: Record<string, Worktree[]>,
  sortedIds: string[],
  opts: VisibleWorktreeOptions
): string[] {
  return computeVisibleWorktrees(worktreesByRepo, sortedIds, opts).map((worktree) => worktree.id)
}

/**
 * Module-level cache of the visible worktree IDs as last computed by
 * WorktreeList's render pipeline.
 *
 * Why: WorktreeList freezes its sort order via sortedIds / sortEpoch useMemo
 * and only re-sorts when sortEpoch bumps. If getVisibleWorktreeIds()
 * recomputes sort order from a live Zustand snapshot, the Cmd+1–9 shortcut
 * could target a different worktree than what's rendered at that sidebar
 * position. By caching the IDs that WorktreeList actually rendered, the
 * shortcut numbering always matches the sidebar card order.
 *
 * Why null vs []: [] is a real rendered order (everything collapsed/filtered);
 * null means WorktreeList is unmounted.
 */
let _publishedVisibleIds: string[] | null = null
export type VisibleWorktreeShortcutTarget = {
  id: string
  executionHostId?: Worktree['hostId']
}
let _publishedVisibleShortcutTargets: VisibleWorktreeShortcutTarget[] | null = null

export function setVisibleWorktreeIds(ids: string[] | null): void {
  _publishedVisibleIds = ids
}

export function setVisibleWorktreeShortcutTargets(
  targets: VisibleWorktreeShortcutTarget[] | null
): void {
  _publishedVisibleShortcutTargets = targets
}

/**
 * Compute the visible worktree IDs on-demand from the current Zustand store
 * state. Called by the App-level Cmd+1–9 handler (not a React hook — reads
 * store snapshot at call time).
 *
 * If WorktreeList is mounted, returns the exact IDs it rendered. Otherwise
 * recomputes the order the sidebar *would* render from the same row pipeline,
 * so a closed sidebar numbers workspaces the same way an open one does (#9497).
 */
export function buildVisibleWorktreeOptionsFromState(
  state: ReturnType<typeof useAppStore.getState>,
  repoMap: Map<string, Repo>
): VisibleWorktreeOptions {
  // Why: the agent-send picker targets a worktree a filter may hide; the shortcut
  // path owes it the same forced visibility the painted list gives it.
  const agentSendTargetWorktreeId = state.agentSendPopoverTargetMode?.worktreeId
  return {
    filterRepoIds: state.filterRepoIds,
    showSleepingWorkspaces: state.showSleepingWorkspaces,
    tabsByWorktree: state.tabsByWorktree,
    ptyIdsByTabId: state.ptyIdsByTabId,
    browserTabsByWorktree: state.browserTabsByWorktree,
    worktreeIdsWithLiveAgent: getWorktreeIdsWithLiveAgent(
      state.agentStatusByPaneKey,
      state.tabsByWorktree,
      Date.now()
    ),
    hideDefaultBranchWorkspace: state.hideDefaultBranchWorkspace,
    hideAutomationGeneratedWorkspaces: state.hideAutomationGeneratedWorkspaces,
    hideCliCreatedWorkspaces: state.hideCliCreatedWorkspaces,
    hideDetachedHeadWorkspaces: state.hideDetachedHeadWorkspaces,
    hideWorkspacesFromOtherDevices: state.hideWorkspacesFromOtherDevices,
    pairedDeviceIdsByEnvironment: state.hideWorkspacesFromOtherDevices
      ? getPairedDeviceIdsByEnvironment(
          state.runtimeEnvironments,
          state.runtimeStatusByEnvironmentId
        )
      : EMPTY_PAIRED_DEVICE_IDS_BY_ENVIRONMENT,
    alwaysShowDefaultBranchWorkspace: state.alwaysShowDefaultBranchWorkspace,
    repoMap,
    workspaceHostScope: state.workspaceHostScope,
    visibleWorkspaceHostIds: state.visibleWorkspaceHostIds,
    defaultHostId: getSettingsFocusedExecutionHostId(state.settings),
    worktreeLineageById: edgesToWorktreeLineageFromState(state),
    forcedVisibleWorktreeIds: agentSendTargetWorktreeId ? [agentSendTargetWorktreeId] : undefined
  }
}

export function getVisibleWorktreeIds(): string[] {
  // Prefer the published IDs that mirror the rendered sidebar order.
  if (_publishedVisibleIds) {
    return _publishedVisibleIds
  }

  const state = useAppStore.getState()
  const allWorktrees = getAllWorktreesFromState(state).filter((w) => !w.isArchived)

  // Hoist repoMap so it's built once and reused across all branches below.
  const repoMap = getRepoMapFromState(state)

  let sortedIds: string[]

  if (state.sortBy === 'smart') {
    sortedIds = sortWorktreesSmart(
      allWorktrees,
      state.tabsByWorktree,
      repoMap,
      state.agentStatusByPaneKey,
      state.runtimePaneTitlesByTabId,
      state.ptyIdsByTabId,
      state.migrationUnsupportedByPtyId,
      state.terminalLayoutsByTabId
    ).map((w) => w.id)
  } else {
    // Why empty map: non-smart branches don't read attentionByWorktree, but
    // the param is required to keep smart-mode callers honest at the type level.
    const sorted = [...allWorktrees].sort(
      buildWorktreeComparator(state.sortBy, repoMap, Date.now(), new Map())
    )
    sortedIds = sorted.map((w) => w.id)
  }

  const visibleIds = computeVisibleWorktreeIds(
    state.worktreesByRepo,
    sortedIds,
    buildVisibleWorktreeOptionsFromState(state, repoMap)
  )

  const visibleIdRank = new Map(visibleIds.map((id, index) => [id, index]))
  const visibleHostIds = getVisibleWorkspaceHostIdSet(state)
  const defaultHostId = getSettingsFocusedExecutionHostId(state.settings)
  const visibleWorktrees = allWorktrees
    .filter(
      (worktree) =>
        visibleIdRank.has(worktree.id) &&
        worktreeMatchesVisibleHost(worktree, visibleHostIds, repoMap, defaultHostId)
    )
    .sort((a, b) => (visibleIdRank.get(a.id) ?? 0) - (visibleIdRank.get(b.id) ?? 0))
  // Why the row pipeline: grouping, pinning and main-worktree hoisting reorder cards, so a flat sort numbers the wrong workspace.
  return computeRenderedSidebarWorktreeOrder(state, visibleWorktrees)
}

export function getVisibleWorktreeShortcutTargets(): VisibleWorktreeShortcutTarget[] {
  if (_publishedVisibleShortcutTargets) {
    return _publishedVisibleShortcutTargets
  }
  const state = useAppStore.getState()
  const visibleIds = getVisibleWorktreeIds()
  const visibleIdRank = new Map(visibleIds.map((id, index) => [id, index]))
  const repoMap = getRepoMapFromState(state)
  const visibleHostIds = getVisibleWorkspaceHostIdSet(state)
  const defaultHostId = getSettingsFocusedExecutionHostId(state.settings)
  const worktrees = getAllWorktreesFromState(state)
    .filter(
      (worktree) =>
        !worktree.isArchived &&
        visibleIdRank.has(worktree.id) &&
        worktreeMatchesVisibleHost(worktree, visibleHostIds, repoMap, defaultHostId)
    )
    .sort((a, b) => (visibleIdRank.get(a.id) ?? 0) - (visibleIdRank.get(b.id) ?? 0))
  return computeRenderedSidebarWorktrees(state, worktrees).map((worktree) => ({
    id: worktree.id,
    ...(worktree.hostId ? { executionHostId: worktree.hostId } : {})
  }))
}
