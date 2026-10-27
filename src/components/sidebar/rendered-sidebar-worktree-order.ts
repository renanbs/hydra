import type { Worktree, WorkspaceStatusDefinition } from '../../shared/worktree/types'
import type { WorktreeLineage } from '../../shared/worktree/lineage-types'
import type { AppState } from '@/store/types'
import type { Repo } from '../../shared/repo-types'
import type { FolderWorkspace } from '../../shared/folder-workspace-types'
import type { ProjectGroup as SharedProjectGroup } from '../../shared/project-group-types'
import type { ProjectOrderBy } from '../../shared/ui-chrome-types'
import type { WorktreeCardProperty } from '../../shared/ui-chrome-types'
import type { ExecutionHostId, ExecutionHostScope } from '../../shared/execution-host'
import type { WorktreeGroupBy } from './worktree-list/grouping/row-types'
import { getHostDisplayLabelOverrides } from '../../shared/host-setting-overrides'
import { cloneDefaultWorkspaceStatuses } from '../../shared/workspace-statuses'
import {
  ALL_EXECUTION_HOSTS_SCOPE,
  getSettingsFocusedExecutionHostId
} from '../../shared/execution-host'
import { getRepoMapFromState, getWorktreeMapFromState } from '@/store/selectors'
import { getProjectHostSetupProjectionFromState } from '@/store/project-host-setup-selector'
import type { ProjectHostSetupProjection } from '../../shared/project-host-setup-projection'
import { buildRows } from './worktree-list/grouping/build-rows'
import { getPinnedWorktreeDisplayPolicy } from './worktree-list/grouping/row-types'
import type {
  ImportedWorktreesCardCandidate,
  NewExternalWorktreesInboxCandidate
} from './worktree-list/grouping/row-types'
import type { GitWorktreeInfo } from './types'
import { normalizeRuntimePathForComparison } from '../../shared/cross-platform-path'
import { addHostSectionRows, type HostSectionRow } from './host-section-rows'
import { orderHostSectionOptions } from './host-section-order'
import { buildSidebarHostOptions } from './sidebar-host-options'
import { getLogicalRepoOrderRankById } from './project-header-drop'
import { getRenderedWorktreesInSidebarOrder } from './worktree-sidebar-row-preference'
import { selectWorktreeListReviewCacheInputs } from './worktree-list/listing/review-cache-inputs'
import {
  filterFolderWorkspacesForVisibleHosts,
  filterProjectGroupsForVisibleHosts,
  getVisibleSidebarHostIdSet
} from './worktree-list/listing/host-filtering'

const EMPTY_REPO_ID_SET: ReadonlySet<string> = Object.freeze(new Set<string>())
const EMPTY_PENDING_CREATIONS = Object.freeze([]) as never
const EMPTY_PROJECT_HOST_SETUP_PROJECTION: ProjectHostSetupProjection = Object.freeze({
  projects: [],
  setups: []
})
const EMPTY_SSH_TARGET_LABELS: ReadonlyMap<string, string> = Object.freeze(new Map<string, string>())

/**
 * The live store keeps host sources as loose JSON (`{}`, `null`, or a Map) while the
 * ported host registry reads `ReadonlyMap`s. Normalizing here keeps both consumers —
 * the row pipeline and the options menu — on one shape instead of each guarding.
 */
export function toHostSourceMap<V>(value: unknown): ReadonlyMap<string, V> | undefined {
  if (value instanceof Map) {
    return value as ReadonlyMap<string, V>
  }
  if (value && typeof value === 'object') {
    return new Map(Object.entries(value as Record<string, V>))
  }
  return undefined
}

/**
 * The two discovered-worktree notice rows' per-repo candidates. `buildRows` emits a
 * row only for a repo present in one of these maps, so the painted list has to hand
 * them in — an empty bundle is why the inbox disappeared when the row pipeline took
 * over rendering (Orca `use-sidebar-external-worktree-cards.ts`).
 */
export interface ExternalWorktreeNoticeCandidates {
  importedWorktreesByRepo: ReadonlyMap<string, ImportedWorktreesCardCandidate>
  newExternalWorktreesInboxByRepo: ReadonlyMap<string, NewExternalWorktreesInboxCandidate>
}

const EMPTY_EXTERNAL_WORKTREE_NOTICE_CANDIDATES: ExternalWorktreeNoticeCandidates =
  Object.freeze({
    importedWorktreesByRepo: new Map<string, ImportedWorktreesCardCandidate>(),
    newExternalWorktreesInboxByRepo: new Map<string, NewExternalWorktreesInboxCandidate>()
  })

/**
 * Ported from Orca's `buildImportedWorktreesCardCandidates` +
 * `buildNewExternalWorktreesInboxCandidates`: one candidate per repo that has
 * discovered worktrees the user has not acknowledged.
 *
 * Why the source differs from Orca: Orca reads `detectedWorktreesByRepo` (a scan
 * result carrying `visible`/`ownership` per worktree); Hydra's renderer keeps the
 * `scan_worktrees` hidden list keyed by **project path** (`App.tsx` →
 * `WorktreeList.hiddenWorktreesByProject`), so the caller resolves each repo's slice
 * and the pipeline reads the repo's own phase state.
 *
 * Two-phase gate (Orca `worktree-list/rows/notice-rows.tsx`): the expandable notice is
 * the *first* phase, so it only gets a candidate while the repo's prompt has not
 * completed; once `externalWorktreeVisibilityPromptDismissedAt` is set the compact
 * pill takes over, minus the baseline paths the user already acknowledged with
 * `Keep hidden`. A suppressed repo (`externalWorktreeDiscoverySuppressedAt`, Hydra's
 * `suppressed_discovery`) opts out of both phases, exactly like Orca's builders.
 *
 * The lines re-check their own half of the gate (count, phase, suppression), so a
 * candidate here never forces a surface the user opted out of.
 */
export function buildExternalWorktreeNoticeCandidates(args: {
  repos: readonly Repo[]
  hiddenWorktreesByProjectPath: Readonly<Record<string, readonly GitWorktreeInfo[]>>
}): ExternalWorktreeNoticeCandidates {
  const importedWorktreesByRepo = new Map<string, ImportedWorktreesCardCandidate>()
  const newExternalWorktreesInboxByRepo = new Map<string, NewExternalWorktreesInboxCandidate>()
  for (const repo of args.repos) {
    const hiddenWorktrees = args.hiddenWorktreesByProjectPath[repo.path] ?? []
    if (hiddenWorktrees.length === 0) continue
    if (repo.externalWorktreeDiscoverySuppressedAt != null) continue
    if (repo.externalWorktreeVisibilityPromptDismissedAt == null) {
      importedWorktreesByRepo.set(repo.id, { repo, hiddenWorktrees })
      continue
    }
    const baseline = new Set(
      (repo.externalWorktreeInboxBaselinePaths ?? []).map(normalizeRuntimePathForComparison)
    )
    const inboxWorktrees = hiddenWorktrees.filter(
      (worktree) => !baseline.has(normalizeRuntimePathForComparison(worktree.path))
    )
    if (inboxWorktrees.length > 0) {
      newExternalWorktreesInboxByRepo.set(repo.id, { repo, inboxWorktrees })
    }
  }
  return { importedWorktreesByRepo, newExternalWorktreesInboxByRepo }
}

/**
 * The inputs the row pipeline reads. Narrower than the whole store so the mounted
 * sidebar (WorktreeList), which owns its own data as props, can feed the pipeline
 * without pretending to be the entire store. `AppState` satisfies it structurally,
 * so the Cmd+1–9 callers pass the store unchanged.
 *
 * `workspaceStatuses`/`projectOrderBy`/`workspaceHostOrder` are optional because
 * the live store does not carry them; the defaults below are Orca's.
 */
export interface SidebarRowsState {
  settings: AppState['settings']
  visibleWorkspaceHostIds: readonly ExecutionHostId[] | null
  workspaceHostScope: ExecutionHostScope
  projectGroups: readonly SharedProjectGroup[]
  groupBy: WorktreeGroupBy
  worktreeCardProperties: readonly WorktreeCardProperty[]
  repos: Repo[]
  worktreesByRepo: Record<string, Worktree[]>
  collapsedGroups: Set<string>
  worktreeLineageById: Readonly<Record<string, WorktreeLineage>>
  folderWorkspaces: readonly FolderWorkspace[]
  prCache: AppState['prCache']
  hostedReviewCache: AppState['hostedReviewCache']
  sshTargetLabels: AppState['sshTargetLabels']
  sshConnectionStates: AppState['sshConnectionStates']
  runtimeEnvironments: AppState['runtimeEnvironments']
  runtimeStatusByEnvironmentId: AppState['runtimeStatusByEnvironmentId']
  /**
   * Optional: the Orca project/host-setup projection inputs. Omitted on the
   * painted path (Hydra's project groups come from `projectGroupMap`), and the
   * projection builder's normalizer is still an auto-stub, so it is only called
   * when a caller actually supplies them.
   */
  projects?: AppState['projects']
  projectHostSetups?: AppState['projectHostSetups']
  /** Optional: the live store does not carry it; the default is Orca's. */
  workspaceStatuses?: readonly WorkspaceStatusDefinition[]
  /** Optional: the live store does not carry it; the default is Orca's. */
  projectOrderBy?: ProjectOrderBy
  /** Optional: the live store does not carry it; the default is Orca's. */
  workspaceHostOrder?: readonly ExecutionHostId[]
}

/**
 * The sidebar's row model: grouped sections (Pinned, All, status/PR/repo lanes,
 * host sections) plus the item/notice/folder rows inside them. This is the single
 * grouping engine — the painted list must not re-derive lanes on its own.
 */
export function computeSidebarRows(
  state: SidebarRowsState,
  visibleWorktrees: readonly Worktree[],
  externalWorktreeNoticeCandidates: ExternalWorktreeNoticeCandidates = EMPTY_EXTERNAL_WORKTREE_NOTICE_CANDIDATES
): HostSectionRow[] {
  const defaultHostId = getSettingsFocusedExecutionHostId(state.settings)
  const pinnedDisplayPolicy = getPinnedWorktreeDisplayPolicy(state.settings)
  const projection =
    state.projects && state.projectHostSetups
      ? getProjectHostSetupProjectionFromState(state)
      : EMPTY_PROJECT_HOST_SETUP_PROJECTION
  const visibleHostIdSet = getVisibleSidebarHostIdSet(
    state.visibleWorkspaceHostIds,
    state.workspaceHostScope
  )
  const projectGroups = state.projectGroups
  const { prCache } = selectWorktreeListReviewCacheInputs(
    state,
    state.groupBy,
    state.worktreeCardProperties
  )

  const { importedWorktreesByRepo, newExternalWorktreesInboxByRepo } =
    externalWorktreeNoticeCandidates
  // Why: a repo whose worktrees are all hidden has no visible group, so without a
  // placeholder the pipeline would drop its section — and with it the notice row that
  // is the only way back to those worktrees (Orca's `getEmptyProjectPlaceholderRepoIds`
  // covers the same repos). Already-grouped repos ignore the id.
  const noticeRepoIds = new Set([
    ...importedWorktreesByRepo.keys(),
    ...newExternalWorktreesInboxByRepo.keys()
  ])

  const rows = buildRows(
    state.groupBy,
    [...visibleWorktrees],
    getRepoMapFromState(state),
    prCache,
    state.collapsedGroups,
    getLogicalRepoOrderRankById(state.repos.map((repo) => repo.id)),
    state.workspaceStatuses ?? cloneDefaultWorkspaceStatuses(),
    state.projectOrderBy ?? 'manual',
    state.worktreeLineageById,
    getWorktreeMapFromState(state),
    true,
    state.settings,
    filterProjectGroupsForVisibleHosts(projectGroups, visibleHostIdSet, defaultHostId),
    noticeRepoIds.size > 0 ? noticeRepoIds : EMPTY_REPO_ID_SET,
    importedWorktreesByRepo,
    newExternalWorktreesInboxByRepo,
    EMPTY_PENDING_CREATIONS,
    { projects: projection.projects, projectHostSetups: projection.setups },
    filterFolderWorkspacesForVisibleHosts(
      state.folderWorkspaces,
      projectGroups,
      visibleHostIdSet,
      defaultHostId
    ),
    // Why the settings overrides: notice rows qualify their labels with the same
    // user-facing host name the host headers show (`getNoticeHostContextLabels` reads
    // this map), so two hosts sharing an id or a label still read distinctly. It never
    // feeds row order.
    getHostDisplayLabelOverrides(state.settings),
    defaultHostId,
    pinnedDisplayPolicy
  )

  // Why lazy: with no host filter, addHostSectionRows is a pass-through, so skip building the whole host registry on a keystroke.
  // Deliberately a superset of its internal guards — on <=1 host it still no-ops, wasting only the registry build.
  const needsHostSections =
    state.workspaceHostScope !== ALL_EXECUTION_HOSTS_SCOPE || state.visibleWorkspaceHostIds != null
  const sectionRows = needsHostSections
    ? addHostSectionRows({
        rows,
        hostOptions: orderHostSectionOptions(
          buildSidebarHostOptions({
            repos: state.repos,
            sshTargetLabels: toHostSourceMap<string>(state.sshTargetLabels) ?? EMPTY_SSH_TARGET_LABELS,
            sshConnectionStates: toHostSourceMap(state.sshConnectionStates),
            settings: state.settings,
            runtimeEnvironments: Array.isArray(state.runtimeEnvironments)
              ? state.runtimeEnvironments
              : undefined,
            runtimeStatusByEnvironmentId: toHostSourceMap(state.runtimeStatusByEnvironmentId),
            hostLabelOverrides: getHostDisplayLabelOverrides(state.settings)
          }),
          state.workspaceHostOrder ?? []
        ),
        workspaceHostScope: state.workspaceHostScope,
        visibleWorkspaceHostIds: state.visibleWorkspaceHostIds,
        defaultHostId,
        collapsedHostKeys: state.collapsedGroups,
        forceCollapseHosts: false,
        preferProjectGrouping: true
      })
    : rows

  return sectionRows
}

/**
 * Orders already-filtered worktrees the way the sidebar would render them, for
 * Cmd+1–9 numbering while WorktreeList is unmounted (#9497).
 *
 * Why replay the pipeline: a flat list drops grouping, pinning, main-worktree
 * hoisting and collapse elision, so the shortcut numbered the wrong card.
 * Why worktrees are passed in: keeps the dependency on visible-worktrees.ts
 * one-way, since test suites mock that module's path.
 */
export function computeRenderedSidebarWorktrees(
  state: AppState,
  visibleWorktrees: readonly Worktree[]
): Worktree[] {
  return getRenderedWorktreesInSidebarOrder(
    computeSidebarRows(state, visibleWorktrees),
    getPinnedWorktreeDisplayPolicy(state.settings)
  )
}

export function computeRenderedSidebarWorktreeOrder(
  state: AppState,
  visibleWorktrees: readonly Worktree[]
): string[] {
  return Array.from(
    new Set(computeRenderedSidebarWorktrees(state, visibleWorktrees).map((worktree) => worktree.id))
  )
}
