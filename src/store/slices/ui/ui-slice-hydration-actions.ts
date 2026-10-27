// @ts-nocheck — Orca port buffer; typecheck when this subsystem is wired.
import type { UISlice, UISliceGet, UISliceSet } from './ui-slice-contract'
import type { Repo } from '../../../shared/repo-types'
import type { AppState } from '../../types'
import type { PersistedUIState } from '../../../shared/persisted-ui-state-types'
import { normalizeRightSidebarRoute } from '../../right-sidebar-route'
import {
  applyManualRepoOrder,
  normalizeManualRepoOrder
} from '../../../shared/manual-repo-order'
import { normalizeWorkspaceCleanupBrowseState } from '../../../shared/workspace-cleanup-browse-state'
import {
  normalizeExecutionHostScope,
  normalizeExecutionHostOrder,
  normalizeVisibleExecutionHostIds
} from '../../../shared/execution-host'
import { normalizeFeatureInteractions } from '../../../shared/feature-interactions'
import { normalizeContextualTourIds } from '../../../shared/contextual-tours'
import { normalizeFeatureTipIds } from '../../../shared/feature-tips'
import {
  DEFAULT_HIDE_SLEEPING_WORKSPACES,
  normalizeWorktreeCardProperties,
  normalizeAgentActivityDisplayMode
} from '../../../shared/constants'
import {
  normalizeActivityGroupBy,
  normalizeThreadReadFilter
} from '../../../shared/agents-view-thread-filters'
import {
  clampWorkspaceBoardColumnWidth,
  clampWorkspaceBoardOpacity,
  normalizeWorkspaceStatuses
} from '../../../shared/workspace-statuses'
import { PET_SIZE_DEFAULT, PET_SIZE_MAX, PET_SIZE_MIN } from '../../../shared/pet-types'
import { clampMarkdownTocPanelWidth } from '../../../shared/markdown-toc-panel-width'
import { clampCombinedDiffFileTreeWidth } from '../../../shared/combined-diff-file-tree-width'
import { parsePersistedAutomationHostFilter } from '../../../shared/automation-host-filter'
import { normalizeUsagePercentageDisplay } from '../../../shared/usage-percentage-display'
import { normalizeStatusBarUsageMode } from '../../../shared/status-bar-usage-mode'
import { normalizeBrowserPageZoomLevel } from '../../../shared/browser-page-zoom'
import { normalizeKagiSessionLink } from '../../../shared/browser-url'
import { isReleaseChannel } from '../../../shared/release-channel'
import type { StatusBarItem } from '../../../shared/ui-chrome-types'
import {
  filterSetupScriptPromptDismissalsToValidRepos,
  sanitizeSetupScriptPromptDismissals
} from '../../../lib/setup-script-prompt'
import { isBundledPetId, DEFAULT_PET_ID } from '../../../components/pet/pet-models'
import { getRepoHostIdentity } from '../repo-host-identity'
import type { PersistedUIWriteBaseline } from '../persisted-ui-write-baseline'
import {
  capturePersistedUIWriteBaseline,
  diffPersistedUIWriteFields
} from '../persisted-ui-write-baseline'
import {
  hydrateTrustedOrcaHooks,
  hydrateUnexpectedSignoutDismissal,
  normalizeHydratedVisibleWorkspaceHostIds,
  preserveStringArrayIdentity,
  sanitizeHydratedActiveView,
  sanitizePersistedRepoIds,
  sanitizeShowDotfilesByWorktree,
  sanitizeWorkspaceCleanupDismissals,
  sanitizePersistedSidebarWidth,
  hydratedUIPartialMatchesState,
  migrateStatusBarItems,
  clampPetSize
} from './ui-slice-hydration-sanitizers'
import { hydrateAgentReadState, sanitizeTaskResumeState } from './ui-slice-hydration-values'
import { uiPrefsBridge } from '../../ui-prefs-bridge'

const MAX_LEFT_SIDEBAR_WIDTH = 500
const MAX_RIGHT_SIDEBAR_WIDTH = 4000
const DEFAULT_ON_PORTS_STATUS_BAR_ITEM: StatusBarItem = 'ports'
const DEFAULT_ON_KIMI_STATUS_BAR_ITEM: StatusBarItem = 'kimi'
const DEFAULT_ON_MINIMAX_STATUS_BAR_ITEM: StatusBarItem = 'minimax'
const DEFAULT_ON_ANTIGRAVITY_STATUS_BAR_ITEM: StatusBarItem = 'antigravity'
const DEFAULT_ON_GROK_STATUS_BAR_ITEM: StatusBarItem = 'grok'

function hydrateStatusBarItems(ui: PersistedUIState): StatusBarItem[] {
  let items = migrateStatusBarItems(ui.statusBarItems)
  const defaults = [
    ['_portsStatusBarDefaultAdded', DEFAULT_ON_PORTS_STATUS_BAR_ITEM],
    ['_kimiStatusBarDefaultAdded', DEFAULT_ON_KIMI_STATUS_BAR_ITEM],
    ['_minimaxStatusBarDefaultAdded', DEFAULT_ON_MINIMAX_STATUS_BAR_ITEM],
    ['_antigravityStatusBarDefaultAdded', DEFAULT_ON_ANTIGRAVITY_STATUS_BAR_ITEM],
    ['_grokStatusBarDefaultAdded', DEFAULT_ON_GROK_STATUS_BAR_ITEM]
  ] as const
  for (const [flag, item] of defaults) {
    if (!ui[flag] && !items.includes(item)) {
      items = [...items, item]
    }
  }
  if (typeof window !== 'undefined' && defaults.some(([flag]) => !ui[flag])) {
    uiPrefsBridge
      .set({ statusBarItems: items, ...Object.fromEntries(defaults.map(([flag]) => [flag, true])) })
      .catch(console.error)
  }
  return items
}

export function createUiHydrationActions(set: UISliceSet, _get: UISliceGet): Partial<UISlice> {
  return {
    hydratePersistedUI: (ui: any, source = 'sync') =>
      set((s: any) => {
        const manualRepoOrder = normalizeManualRepoOrder(ui.manualRepoOrder)
        const orderedRepos = applyManualRepoOrder(s.repos, manualRepoOrder)
        const validRepoIds = new Set(s.repos.map((repo: any) => repo.id))
        const validRepoHostIdentities = new Set(s.repos.map(getRepoHostIdentity))
        const persistedFilterRepoIds = sanitizePersistedRepoIds(ui.filterRepoIds)
        const persistedAgentsFilterRepoIds = sanitizePersistedRepoIds(ui.agentsFilterRepoIds)
        // Why: pre-rename builds used sidekick* keys; read as fallback only so new pet* writes win after upgrade.
        const customPets = Array.isArray(ui.customPets)
          ? ui.customPets
          : Array.isArray(ui.customSidekicks)
            ? ui.customSidekicks
            : []
        const petId = ui.petId ?? ui.sidekickId
        // Migration: one-shot old-'recent'→'smart' runs in main (_sortBySmartMigrated), not here, so a deliberate 'recent' choice survives restart.
        const sortBy = ui.sortBy
        const statusBarItemsWithGrok = hydrateStatusBarItems(ui)
        const rightSidebarRoute = normalizeRightSidebarRoute(
          ui.rightSidebarTab,
          ui.rightSidebarExplorerView
        )
        const hydrated = {
          // Why: persisted widths may be stale/corrupt/hand-edited; clamp during hydration so invalid values can't break layout.
          sidebarWidth: sanitizePersistedSidebarWidth(
            ui.sidebarWidth,
            s.sidebarWidth,
            MAX_LEFT_SIDEBAR_WIDTH
          ),
          rightSidebarWidth: sanitizePersistedSidebarWidth(
            ui.rightSidebarWidth,
            s.rightSidebarWidth,
            MAX_RIGHT_SIDEBAR_WIDTH
          ),
          markdownTocPanelWidth: clampMarkdownTocPanelWidth(
            ui.markdownTocPanelWidth,
            undefined,
            s.markdownTocPanelWidth
          ),
          combinedDiffFileTreeWidth: clampCombinedDiffFileTreeWidth(
            ui.combinedDiffFileTreeWidth,
            undefined,
            s.combinedDiffFileTreeWidth
          ),
          rightSidebarOpen: typeof ui.rightSidebarOpen === 'boolean' ? ui.rightSidebarOpen : true,
          rightSidebarTab: rightSidebarRoute.rightSidebarTab,
          rightSidebarExplorerView: rightSidebarRoute.rightSidebarExplorerView,
          groupBy: (ui.groupBy as UISlice['groupBy'] | 'parent') === 'parent' ? 'repo' : ui.groupBy,
          sortBy,
          // Why: main-process getUI() already normalized this (defaulting to 'manual'); read it through without migrating.
          projectOrderBy: ui.projectOrderBy,
          // Why: Active-only was retired; force the old flag off so an old profile can't invisibly narrow the workspace list.
          showActiveOnly: false,
          // Why: ignore older positive-form keys so old profiles start from the new default (sleeping workspaces visible).
          showSleepingWorkspaces: !(ui.hideSleepingWorkspaces ?? DEFAULT_HIDE_SLEEPING_WORKSPACES),
          workspaceHostScope: normalizeExecutionHostScope(ui.workspaceHostScope),
          visibleWorkspaceHostIds: normalizeHydratedVisibleWorkspaceHostIds(ui),
          workspaceHostOrder: normalizeExecutionHostOrder(ui.workspaceHostOrder),
          // Why: a malformed or legacy filter value must degrade to All hosts, never throw during hydration.
          automationHostFilter: parsePersistedAutomationHostFilter(ui.automationHostFilter),
          manualRepoOrder,
          // Why: apply the desktop-owned overlay immediately since UI state can arrive after a catalog or from another client.
          repos: orderedRepos,
          hideDefaultBranchWorkspace: ui.hideDefaultBranchWorkspace ?? false,
          hideAutomationGeneratedWorkspaces: ui.hideAutomationGeneratedWorkspaces === true,
          hideCliCreatedWorkspaces: ui.hideCliCreatedWorkspaces === true,
          hideDetachedHeadWorkspaces: ui.hideDetachedHeadWorkspaces === true,
          hideWorkspacesFromOtherDevices: ui.hideWorkspacesFromOtherDevices === true,
          // Why !== false: profiles written before #8873 have no key, and they are
          // precisely the ones showing the bug, so absence must mean "exempt".
          alwaysShowDefaultBranchWorkspace: ui.alwaysShowDefaultBranchWorkspace !== false,
          showDotfilesByWorktree: sanitizeShowDotfilesByWorktree(ui.showDotfilesByWorktree),
          // Why: startup hydrates UI before repo catalogs, so defer repo-filter validation to the all-host refresh.
          filterRepoIds:
            validRepoIds.size === 0
              ? persistedFilterRepoIds
              : persistedFilterRepoIds.filter((repoId: any) => validRepoIds.has(repoId)),
          agentsVisibleHostIds: preserveStringArrayIdentity(
            s.agentsVisibleHostIds,
            normalizeVisibleExecutionHostIds(ui.agentsVisibleHostIds)
          ),
          agentsFilterRepoIds: preserveStringArrayIdentity(
            s.agentsFilterRepoIds,
            validRepoIds.size === 0
              ? persistedAgentsFilterRepoIds
              : persistedAgentsFilterRepoIds.filter((repoId: any) => validRepoIds.has(repoId))
          ),
          agentsShowChildAgents: ui.agentsShowChildAgents === true,
          agentsCompactMode: ui.agentsCompactMode !== false,
          agentsShowSearch: ui.agentsShowSearch !== false,
          agentsReadFilter: normalizeThreadReadFilter(ui.agentsReadFilter),
          agentsGroupBy: normalizeActivityGroupBy(ui.agentsGroupBy),
          collapsedGroups: new Set(ui.collapsedGroups ?? []),
          uiZoomLevel: ui.uiZoomLevel ?? 0,
          editorFontZoomLevel: ui.editorFontZoomLevel ?? 0,
          worktreeCardProperties: normalizeWorktreeCardProperties(ui.worktreeCardProperties),
          _worktreeCardModeDefaulted: ui._worktreeCardModeDefaulted === true,
          agentActivityDisplayMode: normalizeAgentActivityDisplayMode(ui.agentActivityDisplayMode),
          workspaceStatuses: normalizeWorkspaceStatuses(ui.workspaceStatuses),
          workspaceBoardOpacity: clampWorkspaceBoardOpacity(ui.workspaceBoardOpacity),
          workspaceBoardColumnWidth: clampWorkspaceBoardColumnWidth(ui.workspaceBoardColumnWidth),
          syncTaskStatusFromWorkspaceBoard: ui.syncTaskStatusFromWorkspaceBoard === true,
          statusBarItems: statusBarItemsWithGrok,
          statusBarVisible: ui.statusBarVisible ?? true,
          usagePercentageDisplay: normalizeUsagePercentageDisplay(ui.usagePercentageDisplay),
          statusBarUsageMode: normalizeStatusBarUsageMode(ui.statusBarUsageMode),
          // Why: default true so existing users see the pet on first enabling the flag; only an explicit Hide persists false.
          petVisible: ui.petVisible ?? ui.sidekickVisible ?? true,
          petSize: clampPetSize(ui.petSize ?? ui.sidekickSize ?? PET_SIZE_DEFAULT, {
            min: PET_SIZE_MIN,
            max: PET_SIZE_MAX,
            fallback: PET_SIZE_DEFAULT
          }),
          customPets,
          // Why: fall back to default when the persisted id is unknown (e.g. custom pet removed elsewhere) so the overlay renders.
          petId: ((): string => {
            const id = petId
            if (typeof id !== 'string') {
              return DEFAULT_PET_ID
            }
            if (isBundledPetId(id)) {
              return id
            }
            if (customPets.some((m: any) => m.id === id)) {
              return id
            }
            return DEFAULT_PET_ID
          })(),
          dismissedUpdateVersion: ui.dismissedUpdateVersion ?? null,
          ...hydrateUnexpectedSignoutDismissal(s, ui.dismissedUnexpectedSignoutVersion),
          // Why: a persisted value from a build that knew a different channel set
          // would otherwise survive as-is; activeChannel only falls back on null,
          // so an unknown string reaches listBuilds and the segmented control.
          releaseChannelOverride: isReleaseChannel(ui.releaseChannelOverride)
            ? ui.releaseChannelOverride
            : null,
          updateReassuranceSeen: ui.updateReassuranceSeen ?? false,
          osc52ClipboardDefaultOnNoticePending: ui.osc52ClipboardDefaultOnNoticePending === true,
          browserDefaultUrl: ui.browserDefaultUrl ?? null,
          browserDefaultSearchEngine: ui.browserDefaultSearchEngine ?? null,
          browserDefaultZoomLevel: normalizeBrowserPageZoomLevel(ui.browserDefaultZoomLevel),
          browserKagiSessionLink: normalizeKagiSessionLink(ui.browserKagiSessionLink ?? ''),
          taskResumeState: sanitizeTaskResumeState(ui.taskResumeState),
          featureTipsSeenIds: normalizeFeatureTipIds(ui.featureTipsSeenIds),
          featureInteractions: normalizeFeatureInteractions(ui.featureInteractions),
          contextualToursSeenIds: normalizeContextualTourIds(ui.contextualToursSeenIds),
          contextualToursAutoEligible:
            typeof ui.contextualToursAutoEligible === 'boolean'
              ? ui.contextualToursAutoEligible
              : null,
          trustedOrcaHooks: hydrateTrustedOrcaHooks(ui.trustedOrcaHooks, validRepoIds),
          setupScriptPromptDismissedRepoIds:
            validRepoHostIdentities.size === 0
              ? sanitizeSetupScriptPromptDismissals(ui.setupScriptPromptDismissedRepoIds)
              : filterSetupScriptPromptDismissalsToValidRepos(
                  ui.setupScriptPromptDismissedRepoIds,
                  validRepoHostIdentities
                ),
          setupGuideSidebarDismissed: ui.setupGuideSidebarDismissed === true,
          setupGuideBrowserMilestoneMigrated: ui.setupGuideBrowserMilestoneMigrated === true,
          setupGuideBrowserMilestoneLegacyComplete:
            ui.setupGuideBrowserMilestoneLegacyComplete === true,
          browserImportHintHidden: ui.browserImportHintHidden === true,
          mobileEmulatorTabIntroDismissed: ui.mobileEmulatorTabIntroDismissed === true,
          mobileEmulatorAgentSetupDismissed: ui.mobileEmulatorAgentSetupDismissed === true,
          projectOrderManualDefaultNoticeDismissed:
            ui.projectOrderManualDefaultNoticeDismissed === true,
          // Why: treat only explicit true as dismissed so a false from migration still surfaces.
          usagePercentageDisplayChangeNoticeDismissed:
            ui.usagePercentageDisplayChangeNoticeDismissed === true,
          // Why: default false so existing users still see the CTA; only explicit dismissal persists true.
          usageEmptyStateDismissed: ui.usageEmptyStateDismissed === true,
          ...hydrateAgentReadState(ui),
          workspaceCleanupDismissals: sanitizeWorkspaceCleanupDismissals(
            ui.workspaceCleanup?.dismissals
          ),
          // Why the normalizer rather than a cast: this blob is hand-editable and
          // may come from an older or newer build; it degrades field by field
          // instead of bricking the cleanup dialog.
          // Why: a sync broadcast can carry stale browse state while its writer is debounced.
          workspaceCleanupBrowse:
            source === 'startup'
              ? normalizeWorkspaceCleanupBrowseState(ui.workspaceCleanup?.browse)
              : s.workspaceCleanupBrowse,
          // Why: restore only on startup; on 'sync' broadcasts it would clobber the window's current per-window view.
          activeView:
            source === 'startup' ? sanitizeHydratedActiveView(ui.activeView) : s.activeView,
          persistedUIReady: true
        }
        // The incoming payload is authoritative for the writer-owned fields, so it becomes the
        // writer's new diff baseline — but fields with an unflushed local edit (mirror diverged
        // from the previous baseline) keep the local value so a broadcast arriving inside the
        // writer's debounce window can't silently revert what the user just toggled (STA-5781).
        // Order matters: capture the baseline BEFORE overlaying pending edits, or the baseline
        // would equal the pending value, the diff would go empty, and the toggle would be dropped.
        // Note the width sanitizers above fall back to the CURRENT store value only for
        // non-numeric input (numbers are clamped in place), so a captured width can differ
        // from what main holds only for garbage payloads; at worst main keeps an
        // out-of-range width until the next drag re-writes it.
        const nextWriteBaseline = capturePersistedUIWriteBaseline(hydrated)
        const previousBaseline = s.persistedUIWriteBaseline
        if (previousBaseline) {
          const pendingLocalEdits = diffPersistedUIWriteFields(
            capturePersistedUIWriteBaseline(s),
            previousBaseline
          )
          Object.assign(hydrated, pendingLocalEdits)
          // In-flight fields too: a flip-back to the baseline value diffs empty,
          // yet the in-flight write's echo must not revert it (PR#17057 review).
          for (const field of Object.keys(
            s.persistedUIWriteInFlightCounts
          ) as (keyof PersistedUIWriteBaseline)[]) {
            ;(hydrated as Record<string, unknown>)[field] = s[field]
          }
        }
        // Why: return the same ref on identical hydration so App's debounced writer doesn't echo it back to main.
        // The baseline must still advance when it moved (a remote same-field write during an in-flight
        // ack pins the only visibly differing field, and our own echo precedes every ack) — but only
        // the two baseline keys, or every ordinary write's echo would churn the store's collection
        // identities and re-render identity-compared selectors once per write.
        // Why the generation bumps only on baseline movement: an unrelated-field
        // broadcast during an in-flight write would otherwise void that write's
        // fold and cost a redundant trailing re-send of identical values.
        const writeBaselineMoved =
          !previousBaseline ||
          Object.keys(diffPersistedUIWriteFields(nextWriteBaseline, previousBaseline)).length > 0
        const nextWriteBaselineGeneration = writeBaselineMoved
          ? s.persistedUIWriteBaselineGeneration + 1
          : s.persistedUIWriteBaselineGeneration
        if (hydratedUIPartialMatchesState(s, hydrated as Partial<UISlice>)) {
          if (!writeBaselineMoved) {
            return s
          }
          return {
            persistedUIWriteBaseline: nextWriteBaseline,
            persistedUIWriteBaselineGeneration: nextWriteBaselineGeneration
          }
        }
        return {
          ...hydrated,
          persistedUIWriteBaseline: nextWriteBaseline,
          persistedUIWriteBaselineGeneration: nextWriteBaselineGeneration
        } as Partial<AppState>
      }),

    /**
     * Boot hydration for the slice's OWN persistence row (`ui.state`).
     *
     * Why not `hydratePersistedUI(blob)`: that action builds its ~100-field patch from the
     * blob with defaults, so a key the slice never wrote (all of the App-owned `ui.sidebar`
     * fields, every width/route/session field) would be reset to a default instead of kept.
     * It also owns the writer's diff baseline, which only makes sense for a full payload.
     * Here every key is applied individually and only when it is actually present in the
     * blob; the five App-owned keys are in no hydrator at all, so they can never be written.
     */
    hydrateSliceUiPreferences: (snapshot: Record<string, unknown>) =>
      set((s: SliceUiStateSnapshot) => {
        const patch: Record<string, unknown> = {}
        for (const [key, hydrate] of Object.entries(SLICE_UI_STATE_HYDRATORS)) {
          if (Object.prototype.hasOwnProperty.call(snapshot, key)) {
            Object.assign(patch, hydrate(snapshot[key], s, snapshot))
          }
        }
        // The slice's own persistence is now read; every gate keyed on it (feature
        // interactions, contextual tours, the usage notice) can trust the hydrated state.
        patch.persistedUIReady = true
        return patch as Partial<AppState>
      })
  }
}

/** The fields the slice's hydrators read off the live state. */
type SliceUiStateSnapshot = { repos: Repo[] } & Record<string, unknown>

function readPersistedCustomPets(snapshot: Record<string, unknown>): { id?: unknown }[] {
  const value = Array.isArray(snapshot.customPets)
    ? snapshot.customPets
    : Array.isArray(snapshot.customSidekicks)
      ? snapshot.customSidekicks
      : []
  return value.filter(
    (model): model is { id?: unknown } => typeof model === 'object' && model !== null
  )
}

/**
 * One entry per `ui.state` key the slice writes (the source of truth is the set of
 * `uiPrefsBridge.set({...})` call sites). Each hydrator receives the raw persisted value,
 * the live state and the whole snapshot, and returns the field patch — reusing the exact
 * normalizers `hydratePersistedUI` already uses for the same field.
 *
 * The five keys the App owns through its `ui.sidebar` blob (`workspaceHostScope`,
 * `visibleWorkspaceHostIds`, `collapsedGroups`, `agentsReadFilter`, `agentsGroupBy`) are
 * deliberately absent: the App hydrates those from its own blob, and a second writer here
 * is the bug the single-writer guard pins.
 */
const SLICE_UI_STATE_HYDRATORS: Record<
  string,
  (
    value: unknown,
    state: SliceUiStateSnapshot,
    snapshot: Record<string, unknown>
  ) => Record<string, unknown>
> = {
  groupBy: (value) => ({ groupBy: value === 'parent' ? 'repo' : value }),
  workspaceHostOrder: (value) => ({ workspaceHostOrder: normalizeExecutionHostOrder(value) }),
  automationHostFilter: (value) => ({
    automationHostFilter: parsePersistedAutomationHostFilter(value)
  }),
  agentsVisibleHostIds: (value) => ({
    agentsVisibleHostIds: normalizeVisibleExecutionHostIds(value)
  }),
  agentsFilterRepoIds: (value) => ({ agentsFilterRepoIds: sanitizePersistedRepoIds(value) }),
  agentsShowChildAgents: (value) => ({ agentsShowChildAgents: value === true }),
  agentsCompactMode: (value) => ({ agentsCompactMode: value !== false }),
  agentsShowSearch: (value) => ({ agentsShowSearch: value !== false }),
  worktreeCardProperties: (value) => ({
    worktreeCardProperties: normalizeWorktreeCardProperties(value)
  }),
  _worktreeCardModeDefaulted: (value) => ({ _worktreeCardModeDefaulted: value === true }),
  agentActivityDisplayMode: (value) => ({
    agentActivityDisplayMode: normalizeAgentActivityDisplayMode(value)
  }),
  workspaceStatuses: (value) => ({ workspaceStatuses: normalizeWorkspaceStatuses(value) }),
  workspaceBoardOpacity: (value) => ({ workspaceBoardOpacity: clampWorkspaceBoardOpacity(value) }),
  workspaceBoardColumnWidth: (value) => ({
    workspaceBoardColumnWidth: clampWorkspaceBoardColumnWidth(value)
  }),
  syncTaskStatusFromWorkspaceBoard: (value) => ({
    syncTaskStatusFromWorkspaceBoard: value === true
  }),
  statusBarItems: (value) => ({ statusBarItems: migrateStatusBarItems(value) }),
  statusBarVisible: (value) => ({ statusBarVisible: value ?? true }),
  usagePercentageDisplay: (value) => ({
    usagePercentageDisplay: normalizeUsagePercentageDisplay(value)
  }),
  usagePercentageDisplayChangeNoticeDismissed: (value) => ({
    usagePercentageDisplayChangeNoticeDismissed: value === true
  }),
  statusBarUsageMode: (value) => ({ statusBarUsageMode: normalizeStatusBarUsageMode(value) }),
  featureTipsSeenIds: (value) => ({ featureTipsSeenIds: normalizeFeatureTipIds(value) }),
  featureInteractions: (value) => ({
    featureInteractions: normalizeFeatureInteractions(value)
  }),
  contextualToursSeenIds: (value) => ({
    contextualToursSeenIds: normalizeContextualTourIds(value)
  }),
  contextualToursAutoEligible: (value) => ({
    contextualToursAutoEligible: typeof value === 'boolean' ? value : null
  }),
  taskResumeState: (value) => ({ taskResumeState: sanitizeTaskResumeState(value) }),
  manualRepoOrder: (value, state) => {
    const manualRepoOrder = normalizeManualRepoOrder(value)
    return { manualRepoOrder, repos: applyManualRepoOrder(state.repos, manualRepoOrder) }
  },
  workspaceCleanup: (value) => {
    const cleanup = typeof value === 'object' && value !== null ? value : {}
    return {
      workspaceCleanupDismissals: sanitizeWorkspaceCleanupDismissals(
        Reflect.get(cleanup, 'dismissals')
      ),
      workspaceCleanupBrowse: normalizeWorkspaceCleanupBrowseState(
        Reflect.get(cleanup, 'browse')
      )
    }
  },
  trustedOrcaHooks: (value, state) => ({
    trustedOrcaHooks: hydrateTrustedOrcaHooks(value, new Set(state.repos.map((repo) => repo.id)))
  }),
  setupScriptPromptDismissedRepoIds: (value, state) => {
    const validRepoHostIdentities = new Set(state.repos.map(getRepoHostIdentity))
    return {
      setupScriptPromptDismissedRepoIds:
        validRepoHostIdentities.size === 0
          ? sanitizeSetupScriptPromptDismissals(value)
          : filterSetupScriptPromptDismissalsToValidRepos(value, validRepoHostIdentities)
    }
  },
  setupGuideSidebarDismissed: (value) => ({ setupGuideSidebarDismissed: value === true }),
  setupGuideBrowserMilestoneMigrated: (value) => ({
    setupGuideBrowserMilestoneMigrated: value === true
  }),
  setupGuideBrowserMilestoneLegacyComplete: (value) => ({
    setupGuideBrowserMilestoneLegacyComplete: value === true
  }),
  browserImportHintHidden: (value) => ({ browserImportHintHidden: value === true }),
  mobileEmulatorTabIntroDismissed: (value) => ({
    mobileEmulatorTabIntroDismissed: value === true
  }),
  mobileEmulatorAgentSetupDismissed: (value) => ({
    mobileEmulatorAgentSetupDismissed: value === true
  }),
  projectOrderManualDefaultNoticeDismissed: (value) => ({
    projectOrderManualDefaultNoticeDismissed: value === true
  }),
  usageEmptyStateDismissed: (value) => ({ usageEmptyStateDismissed: value === true }),
  petVisible: (value) => ({ petVisible: value ?? true }),
  petSize: (value) => ({
    petSize: clampPetSize(value, {
      min: PET_SIZE_MIN,
      max: PET_SIZE_MAX,
      fallback: PET_SIZE_DEFAULT
    })
  }),
  customPets: (_value, _state, snapshot) => ({ customPets: readPersistedCustomPets(snapshot) }),
  petId: (value, _state, snapshot) => {
    const id = value ?? snapshot.sidekickId
    if (typeof id !== 'string') {
      return { petId: DEFAULT_PET_ID }
    }
    if (isBundledPetId(id) || readPersistedCustomPets(snapshot).some((model) => model.id === id)) {
      return { petId: id }
    }
    return { petId: DEFAULT_PET_ID }
  },
  dismissedUpdateVersion: (value) => ({ dismissedUpdateVersion: value ?? null }),
  dismissedUnexpectedSignoutVersion: (value, state) =>
    hydrateUnexpectedSignoutDismissal(state, value),
  releaseChannelOverride: (value) => ({
    releaseChannelOverride: isReleaseChannel(value) ? value : null
  }),
  updateReassuranceSeen: (value) => ({ updateReassuranceSeen: value ?? false }),
  osc52ClipboardDefaultOnNoticePending: (value) => ({
    osc52ClipboardDefaultOnNoticePending: value === true
  }),
  browserDefaultUrl: (value) => ({ browserDefaultUrl: value ?? null }),
  browserDefaultSearchEngine: (value) => ({ browserDefaultSearchEngine: value ?? null }),
  browserDefaultZoomLevel: (value) => ({
    browserDefaultZoomLevel: normalizeBrowserPageZoomLevel(value)
  }),
  browserKagiSessionLink: (value) => ({
    browserKagiSessionLink: normalizeKagiSessionLink(typeof value === 'string' ? value : '')
  })
}
