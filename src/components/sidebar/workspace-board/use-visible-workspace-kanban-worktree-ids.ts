// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/use-visible-workspace-kanban-worktree-ids.ts
//
// The workspace board's visible set: exactly the workspaces the sidebar's filters
// leave on screen, keyed by host-qualified identity so two hosts publishing the
// same workspace id cannot vouch for each other. Lineage ancestors are never
// injected — the board has no nested presentation, so a filtered-out parent must
// not reappear there as an ordinary card.
import { useMemo } from 'react'
import { useAppStore } from '@/store'
import { getAllWorktreesFromState, getRepoMapFromState } from '@/store/selectors'
import {
  getSettingsFocusedExecutionHostId,
  type ExecutionHostId,
} from '@/shared/execution-host'
import type { Repo } from '@/shared/repo-types'
import type { Worktree } from '@/shared/worktree/types'
import { getWorktreeHostIdentity } from '@/shared/worktree/host-qualified-identity'
import { computeVisibleWorktrees } from '../visible-worktrees'
import { useLiveAgentWorktreeIds } from '../use-live-agent-worktree-ids'
import {
  EMPTY_PAIRED_DEVICE_IDS_BY_ENVIRONMENT,
  getPairedDeviceIdsByEnvironment,
} from '../workspace-creator-visibility'

const EMPTY_WORKTREE_ID_SET: ReadonlySet<string> = new Set()

/**
 * `null` means the live store has no worktree projection to filter against yet.
 * Hydra's sidebar still paints from app-level scan rows in some boot states, so
 * an empty store must not be read as "every workspace is hidden" — the board
 * then falls back to its own visible-set callback instead of blanking.
 */
export type VisibleWorkspaceKanbanWorktreeIds = ReadonlySet<string> | null

export function useVisibleWorkspaceKanbanWorktreeIds(args?: {
  /** The board's own order; omitted falls back to the repo store's order. */
  allWorktrees?: readonly Worktree[]
  repoMap?: Map<string, Repo>
}): VisibleWorkspaceKanbanWorktreeIds {
  const worktreesByRepo = useAppStore((state) => state.worktreesByRepo)
  const showSleepingWorkspaces = useAppStore((state) => state.showSleepingWorkspaces)
  const hideDefaultBranchWorkspace = useAppStore((state) => state.hideDefaultBranchWorkspace)
  const hideAutomationGeneratedWorkspaces = useAppStore(
    (state) => state.hideAutomationGeneratedWorkspaces
  )
  const hideCliCreatedWorkspaces = useAppStore((state) => state.hideCliCreatedWorkspaces)
  const hideDetachedHeadWorkspaces = useAppStore((state) => state.hideDetachedHeadWorkspaces)
  const hideWorkspacesFromOtherDevices = useAppStore(
    (state) => state.hideWorkspacesFromOtherDevices
  )
  const runtimeEnvironments = useAppStore((state) =>
    state.hideWorkspacesFromOtherDevices ? state.runtimeEnvironments : null
  )
  const runtimeStatusByEnvironmentId = useAppStore((state) =>
    state.hideWorkspacesFromOtherDevices ? state.runtimeStatusByEnvironmentId : null
  )
  const alwaysShowDefaultBranchWorkspace = useAppStore(
    (state) => state.alwaysShowDefaultBranchWorkspace
  )
  const workspaceHostScope = useAppStore((state) => state.workspaceHostScope)
  const visibleWorkspaceHostIds = useAppStore((state) => state.visibleWorkspaceHostIds)
  const settings = useAppStore((state) => state.settings)
  const filterRepoIds = useAppStore((state) => state.filterRepoIds)
  const tabsByWorktree = useAppStore((state) =>
    !showSleepingWorkspaces ? state.tabsByWorktree : null
  )
  const ptyIdsByTabId = useAppStore((state) =>
    !showSleepingWorkspaces ? state.ptyIdsByTabId : null
  )
  const browserTabsByWorktree = useAppStore((state) =>
    !showSleepingWorkspaces ? state.browserTabsByWorktree : null
  )
  // The shared sample: the board and the list read the same epoch-keyed set.
  const worktreeIdsWithLiveAgent = useLiveAgentWorktreeIds(showSleepingWorkspaces)
  const storeRepos = useAppStore((state) => state.repos)
  // Why memoized on `repos`: the selector helper builds a fresh Map per call, and a
  // new identity every render would re-run the visibility memo forever.
  const storeRepoMap = useMemo(() => getRepoMapFromState({ repos: storeRepos }), [storeRepos])
  const repoMap = args?.repoMap ?? storeRepoMap
  const sortedIds = useMemo(() => {
    const source = args?.allWorktrees ?? getAllWorktreesFromState({ worktreesByRepo })
    return source.map((worktree) => worktree.id)
  }, [args?.allWorktrees, worktreesByRepo])

  return useMemo(() => {
    if (sortedIds.length === 0) {
      return args?.allWorktrees ? EMPTY_WORKTREE_ID_SET : null
    }
    // Why: the board's lanes come from the sidebar callback, but visibility must
    // match the sidebar filters exactly, so hidden workspaces never reappear here.
    return new Set(
      computeVisibleWorktrees(worktreesByRepo, sortedIds, {
        filterRepoIds: filterRepoIds as readonly string[],
        showSleepingWorkspaces,
        tabsByWorktree,
        ptyIdsByTabId,
        browserTabsByWorktree,
        worktreeIdsWithLiveAgent,
        hideDefaultBranchWorkspace,
        hideAutomationGeneratedWorkspaces,
        hideCliCreatedWorkspaces,
        hideDetachedHeadWorkspaces,
        hideWorkspacesFromOtherDevices,
        pairedDeviceIdsByEnvironment: hideWorkspacesFromOtherDevices
          ? getPairedDeviceIdsByEnvironment(runtimeEnvironments, runtimeStatusByEnvironmentId)
          : EMPTY_PAIRED_DEVICE_IDS_BY_ENVIRONMENT,
        alwaysShowDefaultBranchWorkspace,
        repoMap,
        workspaceHostScope,
        visibleWorkspaceHostIds,
        defaultHostId: getSettingsFocusedExecutionHostId(settings),
        worktreeLineageById: {},
        // Why: the board has no nested lineage presentation. Ancestor injection
        // would make filtered-out parents appear as ordinary cards.
        injectLineageAncestors: false,
      }).map((worktree) => getWorktreeHostIdentity(worktree))
    )
  }, [
    alwaysShowDefaultBranchWorkspace,
    browserTabsByWorktree,
    filterRepoIds,
    hideAutomationGeneratedWorkspaces,
    hideCliCreatedWorkspaces,
    hideDefaultBranchWorkspace,
    hideDetachedHeadWorkspaces,
    hideWorkspacesFromOtherDevices,
    ptyIdsByTabId,
    repoMap,
    runtimeEnvironments,
    runtimeStatusByEnvironmentId,
    settings,
    showSleepingWorkspaces,
    sortedIds,
    tabsByWorktree,
    visibleWorkspaceHostIds,
    workspaceHostScope,
    worktreeIdsWithLiveAgent,
    worktreesByRepo,
  ])
}

/** The execution-host id a workspace belongs to, for callers that filter by host. */
export type { ExecutionHostId }
