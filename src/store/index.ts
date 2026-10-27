import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { invoke } from '@tauri-apps/api/core'

import type { Repo } from '../shared/repo-types'
import type { Worktree } from '../shared/worktree/types'
import type { WorkspaceStatusDefinition } from '../shared/worktree/types'
import { toWorktreeRow } from '../shared/worktree/worktree-row'
import type { CreateWorktreeCallOptions } from './slices/worktrees/create/worktree-create-payload'
import type { GitWorktreeInfo } from '../components/sidebar/types'
import type { TabItem } from '../components/workbench/WorkbenchTabBar'
import type { AgentStatusEntry } from './agent-status-types'
import type { ProjectHostSetupProjection } from '../shared/project-host-setup-projection'
import type { ProviderRateLimits } from '../shared/rate-limit-types'
import type { HydraSettings } from '../shared/settings-types'
import type { KeybindingActionId } from '../shared/keybindings/keybindings-module'
import type {
  VisibleWorkspaceHostIds,
  WorkspaceHostScope,
} from '../shared/ui-chrome-types'
import {
  normalizeExecutionHostScope,
  normalizeVisibleExecutionHostIds,
  type ExecutionHostId,
} from '../shared/execution-host'
import { createUISlice } from './slices/ui'
import { createSshSlice, type SshSlice } from './slices/ssh'

export const EMPTY_TABS: TabItem[] = [];
/**
 * Live store shape.
 *
 * The members the composed UI slice owns (`createUISlice`, spread first in `useAppStore`) are
 * still declared here: `UISlice` is an auto-stub (`any`) on this branch, so an
 * `& UISlice` intersection would erase every check on this object instead of adding the
 * slice's members. What this interface declares is therefore the live store's public type;
 * `store-ui-slice-composition.parity.test.ts` pins the runtime side (the slice's values win,
 * no literal re-declares a slice key).
 *
 * The SSH slice (`createSshSlice`) is composed below and its shape is real (not an `any`
 * stub), so its members are declared by intersection here instead of being re-declared as
 * `any`/placeholder literals. The live store literal spreads it, so the slice is the single
 * source for every ssh* key.
 */
export interface AppState extends SshSlice {
  /** Tabs grouped by workspace (worktree path) */
  tabsByWorktree: Record<string, TabItem[]>
  /** The currently active tab id for each workspace */
  activeTabIdByWorktree: Record<string, string>
  /** Currently active tab ids in MRU order */
  mruTabIds: string[]
  /** Repo list — populated from Hydra's projects list via App.tsx */
  repos: Repo[]
  projects: unknown[]
  projectHostSetups: Record<string, ProjectHostSetupProjection[]>
  /** Active repo id */
  activeRepoId: string | null
  /** All worktrees grouped by owning repo id */
  worktreesByRepo: Record<string, Worktree[]>
  /** Map of worktree id → worktree (for fancy-alert / other shortcuts) */
  worktreesById: Map<string, Worktree>
  
  /** Agent states keyed by paneKey ("worktreeId::tabId::leafId") or WorktreeSession id */
  agentStatusByPaneKey: Record<string, AgentStatusEntry>

  /** Whether the agents section inside the WorktreeCard is expanded or collapsed */
  compactRootListExpandedByWorktree: Record<string, boolean>
  /** Which lineage coordinators inside a card are collapsed */
  collapsedLineageParentsByWorktree: Record<string, Record<string, boolean>>

  // ─── Setters / Mutators ───────────────────────────────────────────────────

  /** Update tabs for a specific workspace */
  setTabsForWorktree: (worktreePath: string, tabs: TabItem[]) => void
  setActiveTabIdForWorktree: (worktreePath: string, tabId: string) => void
  setMruTabIds: (ids: string[]) => void

  /** Granular tab operations */
  addTabToWorktree: (worktreePath: string, tab: TabItem, select?: boolean) => void
  removeTabFromWorktree: (worktreePath: string, tabId: string) => void
  selectTab: (worktreePath: string, tabId: string) => void
  reorderTabs: (worktreePath: string, fromIndex: number, toIndex: number) => void
  setTabCustomTitle: (worktreePath: string, tabId: string, customTitle: string) => void
  updateTab: (worktreePath: string, tabId: string, patch: Partial<TabItem>) => void
  pinTab: (worktreePath: string, tabId: string, isPinned: boolean) => void

  /** Register or update an agent state */
  upsertAgentStatus: (paneKey: string, entry: AgentStatusEntry) => void
  /** Remove an agent state */
  dropAgentStatus: (paneKey: string) => void

  /** Toggles */
  toggleCompactRootList: (worktreePath: string) => void
  toggleLineageParent: (worktreePath: string, paneKey: string) => void

  /** Load initial data into the store */
  hydrateTabs: (tabsByWorktree: Record<string, TabItem[]>) => void

  // ─── Status bar / settings slices (Orca useStatusBarController parity) ─────
  /** Provider usage rate limits keyed by provider id */
  rateLimits: Record<string, ProviderRateLimits>
  refreshRateLimits: () => Promise<void>
  /** App settings snapshot (HydraSettings) */
  settings: HydraSettings | null
  openSettingsTarget: (target: string | null) => void
  openSettingsPage: (page: string) => void
  /** 'used' | 'remaining' | 'percentage' */
  usagePercentageDisplay: string
  /** Usage bar display mode */
  statusBarUsageMode: string
  setStatusBarUsageMode: (mode: string) => void
  statusBarVisible: boolean
  /** Which status bar items are enabled (claude, codex, ssh, ports, resource-usage, ...) */
  statusBarItems: string[]
  toggleStatusBarItem: (item: string) => void
  /** Resolves once the slice's own persistence write settles (the slice's shape, not the old void stub). */
  recordFeatureInteraction: (feature: string) => Promise<void>
  /** Agent CLI binaries detected on PATH */
  detectedAgentIds: string[]
  ensureDetectedAgents: () => Promise<void>
  refreshDetectedAgents: () => Promise<string[]>
  usageEmptyStateDismissed: boolean
  /** Keybinding overrides by action id (Orca useShortcutLabel parity) */
  keybindings: Partial<Record<KeybindingActionId, string[]>>
  updateSettings: (settings: Partial<HydraSettings>) => void

  // ─── Orca Compat: State Records ───
  activeBrowserTabIdByWorktree: Record<string, any>
  activeGroupIdByWorktree: Record<string, any>
  activeTabTypeByWorktree: Record<string, any>
  agentLaunchConfigByPaneKey: Record<string, any>
  automaticAgentResumeClaimsByTabId: Record<string, any>
  browserPagesByWorkspace: Record<string, any>
  browserSessionProfilesByHostId: Record<string, any>
  browserTabsByWorktree: Record<string, any>
  clientHostedBrowserCloseIntentsByEnvironment: Record<string, any>
  defaultBrowserSessionProfileIdByHostId: Record<string, any>
  deferredSshSessionIdsByTabId: Record<string, any>
  gitStatusHugeByWorktree: Record<string, any>
  groupsByWorktree: Record<string, any>
  localDetectedAgentIdsByContext: Record<string, any>
  manuallyUnreadTurnsByPaneKey: Record<string, any>
  pendingAddressBarFocusByTabId: Record<string, any>
  pendingReconnectPtyIdByTabId: Record<string, any>
  pendingStartupByTabId: Record<string, any>
  ptyIdsByTabId: Record<string, any>
  recentlyClosedBrowserPagesByWorkspace: Record<string, any>
  recentlyClosedBrowserTabsByWorktree: Record<string, any>
  recentlyClosedTabKindsByWorktree: Record<string, any>
  recentlyClosedTerminalTabsByWorktree: Record<string, any>
  runtimePaneTitlesByTabId: Record<string, any>
  runtimeStatusByEnvironmentId: Record<string, any>
  sleepingAgentSessionsByPaneKey: Record<string, any>
  tabBarOrderByWorktree: Record<string, any>
  terminalLayoutsByTabId: Record<string, any>
  unifiedTabsByWorktree: Record<string, any>
  worktreeLineageById: Record<string, any>
  // ─── Orca Compat: Boolean Flags ───
  alwaysShowDefaultBranchWorkspace: boolean
  detectedBrowsersLoaded: boolean
  hideAutomationGeneratedWorkspaces: boolean
  hideCliCreatedWorkspaces: boolean
  hideDefaultBranchWorkspace: boolean
  hideDetachedHeadWorkspaces: boolean
  hideWorkspacesFromOtherDevices: boolean
  isDetectingAgents: boolean
  isDetectingLocalAgentsByContext: boolean
  isDetectingRemoteAgents: boolean
  isDetectingRuntimeAgents: boolean
  isNavigatingHistory: boolean
  isRefreshingAgents: boolean
  isRefreshingLocalAgentsByContext: boolean
  isRefreshingRuntimeAgents: boolean
  runtimeEnvironmentCatalogHydrated: boolean
  runtimeEnvironmentCatalogSettled: boolean
  showSleepingWorkspaces: boolean
  terminalStartupRestorationReady: boolean
  workspaceSessionReady: boolean
  // ─── Orca Compat: Arrays ───
  allWorktrees: any[]
  filterRepoIds: any[]
  remoteDetectedAgentIds: any[]
  removedRuntimeEnvironmentIds: any[]
  runtimeDetectedAgentIds: any[]
  suppressedPtyExitIds: any[]
  transientClearedAgentStatusConnectionIds: Record<string, true>
  /** Which execution hosts the sidebar shows; `null` = all hosts (sticky). */
  visibleWorkspaceHostIds: VisibleWorkspaceHostIds
  // ─── Orca Compat: String IDs ───
  activeBrowserTabId: string | null
  activeFileId: string | null
  activeTabId: string | null
  activeWorkspaceExecutionHostId: string | null
  activeWorktreeId: string | null
  browserAnnotationsByPageId: string | null
  browserCertificateFailuresByPageId: string | null
  defaultBrowserSessionProfileId: string | null
  migrationUnsupportedByPtyId: Record<string, any>
  pendingAddressBarFocusByPageId: string | null
  remoteBrowserPageHandlesByPageId: string | null
  // ─── Orca Compat: Other State ───
  activeTabType: any
  activeView: any
  agentStatusEpoch: number
  browserDefaultUrl: any
  browserSessionProfiles: any[]
  browserUrlHistory: any[]
  detectedWorktreesByRepo: any
  editorFontZoomLevel: number
  folderWorkspaces: any
  linearStatus: any
  linearStatusContextKey: any
  openFiles: Record<string, any>
  projectGroups: any
  rightSidebarExplorerView: any
  rightSidebarTab: any
  runtimeEnvironments: any
  runtimeTerminalQuickCommands: any
  sortBy: 'name' | 'smart' | 'recent' | 'repo' | 'manual'
  /** User-defined workspace statuses (UI slice) — the workspace board's lanes. */
  workspaceStatuses: WorkspaceStatusDefinition[]
  /** Persisted workspace-board lane width (UI slice). */
  workspaceBoardColumnWidth: number
  taskPageData: any
  unreadAgentCompletionPanes: any
  unreadTerminalTabs: any
  workspaceDocHistory: any[]
  /** Presentation/filtering scope for the sidebar; `'all'` = mixed view. */
  workspaceHostScope: WorkspaceHostScope
  worktreeNavHistory: any[]
  worktreeNavHistoryIndex: number
  // ─── Sidebar host scope actions (supplied by the composed UI slice) ───
  // Same normalizers the slice runs; the slice updates local state only — persistence is the
  // App's debounced `ui.sidebar` blob (single writer since 2026-10-08, after the slice adapter
  // stopped mirroring these keys into its `ui.state` row). The App still hydrates the boot value
  // from that blob.
  setWorkspaceHostScope: (scope: WorkspaceHostScope) => void
  setVisibleWorkspaceHostIds: (ids: readonly ExecutionHostId[] | null) => void
  // ─── Orca Compat: Actions ───
  setActiveBrowserPage: (...args: any[]) => any
  setActiveBrowserTab: (...args: any[]) => any
  setActiveFile: (...args: any[]) => any
  setActiveFolderWorkspace: (...args: any[]) => any
  setActiveRepo: (...args: any[]) => any
  setActiveTab: (...args: any[]) => any
  setActiveTabType: (...args: any[]) => any
  setActiveView: (...args: any[]) => any
  setActiveWorktree: (...args: any[]) => any
  setAgentStatus: (...args: any[]) => any
  setBrowserPageCertificateFailure: (...args: any[]) => any
  setBrowserPageUrl: (...args: any[]) => any
  setEditorFontZoomLevel: (...args: any[]) => any
  setExternalMutation: (...args: any[]) => any
  setHideAutomationGeneratedWorkspaces: (...args: any[]) => any
  setHideCliCreatedWorkspaces: (...args: any[]) => any
  setHideDetachedHeadWorkspaces: (...args: any[]) => any
  setPendingLiveDiskVerification: (...args: any[]) => any
  setRemoteBrowserPageHandle: (...args: any[]) => any
  setRuntimeEnvironmentStatus: (...args: any[]) => any
  setRuntimeEnvironments: (...args: any[]) => any
  setSettingsSearchQuery: (...args: any[]) => any
  setTabBarOrder: (...args: any[]) => any
  setTabColor: (...args: any[]) => any
  setTabLabel: (...args: any[]) => any
  setTabLayout: (...args: any[]) => any
  setWorkspacePortScanRefreshing: (...args: any[]) => any
  clearAgentLaunchConfig: (...args: any[]) => any
  clearCodexRestartNotice: (...args: any[]) => any
  clearManuallyUnreadTurns: (...args: any[]) => any
  clearSelfMoveEcho: (...args: any[]) => any
  clearSleepingAgentSession: (...args: any[]) => any
  clearTabPtyId: (...args: any[]) => any
  clearTerminalPaneUnread: (...args: any[]) => any
  clearTerminalTabUnread: (...args: any[]) => any
  clearWorktreeUnread: (...args: any[]) => any
  markAgentCompletionPaneUnread: (...args: any[]) => any
  markCodexRestartNotices: (...args: any[]) => any
  markEnvironmentSshStateStale: (...args: any[]) => any
  markTerminalPaneUnread: (...args: any[]) => any
  markTerminalTabUnread: (...args: any[]) => any
  markUnverifiedPtyLoss: (...args: any[]) => any
  markWorktreeUnread: (...args: any[]) => any
  markWorktreeVisited: (...args: any[]) => any
  createBrowserPage: (...args: any[]) => any
  createBrowserTab: (...args: any[]) => any
  createTab: (...args: any[]) => any
  createUnifiedTab: (...args: any[]) => any
  /** Local-path create; positional contract follows WorktreeSlice['createWorktree']. */
  createWorktree: (...args: unknown[]) => Promise<{ worktree: Worktree }>
  closeBrowserTab: (...args: any[]) => any
  closeFile: (...args: any[]) => any
  closeTab: (...args: any[]) => any
  closeUnifiedTab: (...args: any[]) => any
  acknowledgeAgents: (...args: any[]) => any
  acknowledgedAgentsByPaneKey: Record<string, any>
  activateTab: (...args: any[]) => any
  applyRuntimeHostStatusSnapshot: (...args: any[]) => any
  ensureRemoteDetectedAgents: (...args: any[]) => any
  ensureRuntimeDetectedAgents: (...args: any[]) => any
  fetchBrowserSessionProfiles: (...args: any[]) => any
  fetchDetectedBrowsers: (...args: any[]) => any
  fetchOrcaProfileAuthStatus: (...args: any[]) => any
  focusGroup: (...args: any[]) => any
  hydrateTabsSession: (...args: any[]) => any
  hydrateWorkspaceSession: (...args: any[]) => any
  loadRuntimeTerminalQuickCommands: (...args: any[]) => any
  openFile: (...args: any[]) => any
  purgeStaleRuntimeHostState: (...args: any[]) => any
  queueTabInitialCwd: (...args: any[]) => any
  reconcileWorktreeTabModel: (...args: any[]) => any
  recordClientHostedBrowserCloseIntents: (...args: any[]) => any
  recordTerminalInput: (...args: any[]) => any
  recordWorktreeVisit: (...args: any[]) => any
  refreshRemoteDetectedAgents: (...args: any[]) => any
  refreshRuntimeDetectedAgents: (...args: any[]) => any
  refreshRuntimeEnvironmentStatus: (...args: any[]) => any
  registerAgentLaunchConfig: (...args: any[]) => any
  remountTerminalTabForRecovery: (...args: any[]) => any
  reopenClosedBrowserTab: (...args: any[]) => any
  reopenClosedEditorTab: (...args: any[]) => any
  reopenClosedTerminalTab: (...args: any[]) => any
  replaceWorkspacePortScans: (...args: any[]) => any
  retainEnvironmentSshState: (...args: any[]) => any
  retainRuntimeDetectedAgents: (...args: any[]) => any
  retainRuntimeTerminalQuickCommands: (...args: any[]) => any
  retainedAgentsByPaneKey: Record<string, any>
  revealWorktreeInSidebar: (...args: any[]) => any
  scheduleAgentStatusFreshness: (...args: any[]) => any
  unacknowledgeAgents: (...args: any[]) => any
  updateBrowserPageState: (...args: any[]) => any
  updateTabPtyId: (...args: any[]) => any
  updateTabTitle: (...args: any[]) => any
  // ─── Cross-slice interop the composed UI slice calls ───
  /** nav-history slice (not composed yet) — `open*Page` records a visit. */
  recordViewVisit: (...args: any[]) => any
  /** diffComments slice (not composed yet) — diff-notes menu reads a worktree's notes. */
  getDiffComments: (...args: any[]) => any
  /** editor right-sidebar slice (not composed yet) — diff-notes menu opens Source Control. */
  setRightSidebarTab: (...args: any[]) => any
  setRightSidebarOpen: (...args: any[]) => any
  /** github slice (not composed yet) — the task page prefetches work items. */
  prefetchWorkItems: (...args: any[]) => any
  // ─── Orca Compat: Getters ───
  getActiveTab: (...args: any[]) => any
  getAgentLaunchConfigForStatusMetadata: (...args: any[]) => any
  getFreshFolderWorkspacePathStatus: (...args: any[]) => any
  getKnownWorktreeById: (...args: any[]) => any
}

/**
 * Narrows the trailing `createWorktree` bag without an unchecked cast: only an
 * object (not the branch/name positional slots) can carry call options.
 */
function isCreateWorktreeCallOptions(value: unknown): value is CreateWorktreeCallOptions {
  return value !== null && typeof value === 'object'
}

export const useAppStore = create<AppState>()(
  subscribeWithSelector((set, get, store) => ({
    // The ported UI slice owns every key it defines (sortBy/groupBy, host scope, pets,
    // port scans, activity ack, tours, persistence, hydration, ...). It is spread first
    // and nothing below re-declares a key it provides, so the slice is the only source.
    // `UISlice` is still an auto-stub (`any`) in this branch, so the slice's shape is
    // asserted at runtime by store-ui-slice-composition.parity.test.ts, not by tsc.
    ...createUISlice(set, get, store),
    // The SSH slice is composed directly: its shape is real (see `SshSlice`), so the
    // live literal must not re-declare any key it provides.
    ...createSshSlice(set, get, store),
    tabsByWorktree: {},
    activeTabIdByWorktree: {},
    mruTabIds: [],
    repos: [],
    activeRepoId: null,
    worktreesByRepo: {},
    worktreesById: new Map(),
    projects: [],
    projectHostSetups: {},
    agentStatusByPaneKey: {},
    compactRootListExpandedByWorktree: {},
    collapsedLineageParentsByWorktree: {},

    // ─── Status bar / settings slices (Orca useStatusBarController parity) ───
    // Everything the UI slice owns now comes from the spread above. What stays here belongs
    // to slices this store does not compose yet (`createRateLimitSlice`,
    // `createSettingsSlice`, `createDetectedAgentsSlice`).
    rateLimits: {},
    refreshRateLimits: () => Promise.resolve(),
    settings: null,
    detectedAgentIds: [],
    ensureDetectedAgents: () => Promise.resolve(),
    refreshDetectedAgents: () => Promise.resolve([]),
    keybindings: {},
    updateSettings: () => {},

    activeBrowserTabIdByWorktree: {},
    activeGroupIdByWorktree: {},
    activeTabTypeByWorktree: {},
    agentLaunchConfigByPaneKey: {},
    automaticAgentResumeClaimsByTabId: {},
    browserPagesByWorkspace: {},
    browserSessionProfilesByHostId: {},
    browserTabsByWorktree: {},
    clientHostedBrowserCloseIntentsByEnvironment: {},
    defaultBrowserSessionProfileIdByHostId: {},
    deferredSshSessionIdsByTabId: {},
    gitStatusHugeByWorktree: {},
    groupsByWorktree: {},
    localDetectedAgentIdsByContext: {},
    pendingAddressBarFocusByTabId: {},
    pendingReconnectPtyIdByTabId: {},
    pendingStartupByTabId: {},
    ptyIdsByTabId: {},
    recentlyClosedBrowserPagesByWorkspace: {},
    recentlyClosedBrowserTabsByWorktree: {},
    recentlyClosedTabKindsByWorktree: {},
    recentlyClosedTerminalTabsByWorktree: {},
    runtimePaneTitlesByTabId: {},
    runtimeStatusByEnvironmentId: {},
    sleepingAgentSessionsByPaneKey: {},
    tabBarOrderByWorktree: {},
    terminalLayoutsByTabId: {},
    unifiedTabsByWorktree: {},
    worktreeLineageById: {},
    detectedBrowsersLoaded: false,
    isDetectingAgents: false,
    isDetectingLocalAgentsByContext: false,
    isDetectingRemoteAgents: false,
    isDetectingRuntimeAgents: false,
    isNavigatingHistory: false,
    isRefreshingAgents: false,
    isRefreshingLocalAgentsByContext: false,
    isRefreshingRuntimeAgents: false,
    runtimeEnvironmentCatalogHydrated: false,
    runtimeEnvironmentCatalogSettled: false,
    terminalStartupRestorationReady: false,
    workspaceSessionReady: false,
    allWorktrees: [],
    remoteDetectedAgentIds: [],
    removedRuntimeEnvironmentIds: [],
    runtimeDetectedAgentIds: [],
    suppressedPtyExitIds: [],
    transientClearedAgentStatusConnectionIds: {},
    activeBrowserTabId: null,
    activeFileId: null,
    activeTabId: null,
    activeWorkspaceExecutionHostId: null,
    activeWorktreeId: null,
    browserAnnotationsByPageId: null,
    browserCertificateFailuresByPageId: null,
    defaultBrowserSessionProfileId: null,
    migrationUnsupportedByPtyId: {},
    pendingAddressBarFocusByPageId: null,
    remoteBrowserPageHandlesByPageId: null,
    activeTabType: null,
    agentStatusEpoch: 0,
    browserSessionProfiles: [],
    browserUrlHistory: [],
    detectedWorktreesByRepo: null,
    folderWorkspaces: null,
    linearStatus: null,
    linearStatusContextKey: null,
    openFiles: {},
    projectGroups: null,
    rightSidebarExplorerView: null,
    rightSidebarTab: null,
    runtimeEnvironments: null,
    runtimeTerminalQuickCommands: null,
    unreadAgentCompletionPanes: {},
    unreadTerminalTabs: null,
    workspaceDocHistory: [],
    worktreeNavHistory: [],
    worktreeNavHistoryIndex: 0,
    setActiveBrowserPage: () => {},
    setActiveBrowserTab: () => {},
    setActiveFile: () => {},
    setActiveFolderWorkspace: () => {},
    setActiveRepo: () => {},
    setActiveTab: () => {},
    setActiveTabType: () => {},
    setActiveWorktree: () => {},
    setAgentStatus: () => {},
    setBrowserPageCertificateFailure: () => {},
    setBrowserPageUrl: () => {},
    setExternalMutation: () => {},
    setPendingLiveDiskVerification: () => {},
    setRemoteBrowserPageHandle: () => {},
    setRuntimeEnvironmentStatus: () => {},
    setRuntimeEnvironments: () => {},
    setSettingsSearchQuery: () => {},
    setTabBarOrder: () => {},
    setTabColor: () => {},
    setTabLabel: () => {},
    setTabLayout: () => {},
    clearAgentLaunchConfig: () => {},
    clearCodexRestartNotice: () => {},
    clearSelfMoveEcho: () => {},
    clearSleepingAgentSession: () => {},
    clearTabPtyId: () => {},
    clearTerminalPaneUnread: () => {},
    clearTerminalTabUnread: () => {},
    clearWorktreeUnread: () => {},
    markAgentCompletionPaneUnread: () => {},
    markCodexRestartNotices: () => {},
    markEnvironmentSshStateStale: () => {},
    markTerminalPaneUnread: () => {},
    markTerminalTabUnread: () => {},
    markUnverifiedPtyLoss: () => {},
    markWorktreeUnread: () => {},
    markWorktreeVisited: () => {},
    createBrowserPage: () => {},
    createBrowserTab: () => {},
    createTab: () => {},
    createUnifiedTab: () => {},
    createWorktree: async (...args: unknown[]) => {
      // Local-only path. Runtime/SSH targets, conflict-retry policy, base-ref
      // toasts and the created_with_agent fallback tab are out of scope.
      // Positional contract mirrors WorktreeSlice['createWorktree']
      // (src/store/slices/worktree-helpers.ts): [0] repoId, [1] name,
      // [10] createdWithAgent, last arg = CreateWorktreeCallOptions.
      const repoId = args[0]
      const name = args[1]
      if (typeof repoId !== 'string' || typeof name !== 'string') {
        throw new Error('createWorktree: repoId and name are required')
      }
      const createdWithAgentArg = args[10]
      const createdWithAgent =
        typeof createdWithAgentArg === 'string' ? createdWithAgentArg : undefined
      const lastArg = args[args.length - 1]
      const options = isCreateWorktreeCallOptions(lastArg) ? lastArg : undefined
      const provenanceKind = options?.automationProvenanceRequest
        ? 'created-by-automation'
        : undefined

      const repo = get().repos.find((candidate) => candidate.id === repoId)
      if (!repo) {
        throw new Error(`createWorktree: unknown repo id "${repoId}"`)
      }

      const worktreePath = await invoke<string>('create_worktree', {
        repoPath: repo.path,
        branchName: name,
        newBranch: true,
        createdWithAgent,
        provenanceKind,
      })

      // Re-read the repo through the same scan the sidebar hydrates from so the
      // persisted provenance kind is projected into the store rows; `hidden`
      // rows stay out of `worktreesByRepo` exactly like the sidebar scan.
      const scan = await invoke<{ visible: GitWorktreeInfo[] }>('scan_worktrees', {
        repoPath: repo.path,
      })
      const rows = scan.visible.map((row) =>
        toWorktreeRow(row, {
          repoId,
          ...(repo.executionHostId ? { hostId: repo.executionHostId } : {}),
        })
      )
      set((s) => ({ worktreesByRepo: { ...s.worktreesByRepo, [repoId]: rows } }))

      const worktree = rows.find((candidate) => candidate.path === worktreePath)
      if (!worktree) {
        throw new Error(
          `createWorktree: created worktree "${worktreePath}" missing from scan_worktrees`
        )
      }
      return { worktree }
    },
    closeBrowserTab: () => {},
    closeFile: () => {},
    closeTab: () => {},
    closeUnifiedTab: () => {},
    activateTab: () => {},
    applyRuntimeHostStatusSnapshot: () => {},
    ensureRemoteDetectedAgents: () => {},
    ensureRuntimeDetectedAgents: () => {},
    fetchBrowserSessionProfiles: () => {},
    fetchDetectedBrowsers: () => {},
    fetchOrcaProfileAuthStatus: () => {},
    focusGroup: () => {},
    hydrateTabsSession: () => {},
    hydrateWorkspaceSession: () => {},
    loadRuntimeTerminalQuickCommands: () => {},
    openFile: () => {},
    purgeStaleRuntimeHostState: () => {},
    queueTabInitialCwd: () => {},
    reconcileWorktreeTabModel: () => {},
    recordClientHostedBrowserCloseIntents: () => {},
    recordTerminalInput: () => {},
    recordWorktreeVisit: () => {},
    refreshRemoteDetectedAgents: () => {},
    refreshRuntimeDetectedAgents: () => {},
    refreshRuntimeEnvironmentStatus: () => {},
    registerAgentLaunchConfig: () => {},
    remountTerminalTabForRecovery: () => {},
    reopenClosedBrowserTab: () => {},
    reopenClosedEditorTab: () => {},
    reopenClosedTerminalTab: () => {},
    retainEnvironmentSshState: () => {},
    retainRuntimeDetectedAgents: () => {},
    retainRuntimeTerminalQuickCommands: () => {},
    retainedAgentsByPaneKey: {},
    scheduleAgentStatusFreshness: () => {},
    updateBrowserPageState: () => {},
    updateTabPtyId: () => {},
    updateTabTitle: () => {},
    // ─── Cross-slice interop the composed UI slice calls ───
    // The UI slice's page/menu actions call into slices this store does not compose yet
    // (worktree-nav-history, diffComments, github, editor right-sidebar). Their owners are
    // still un-composed, so keep the live store's stub shape: without it those actions throw
    // on an undefined call. Each entry goes away when its own slice is composed.
    recordViewVisit: () => {},
    getDiffComments: () => [],
    setRightSidebarTab: () => {},
    setRightSidebarOpen: () => {},
    prefetchWorkItems: () => {},
    getActiveTab: () => null,
    getAgentLaunchConfigForStatusMetadata: () => null,
    getFreshFolderWorkspacePathStatus: () => null,
    getKnownWorktreeById: () => null,

    setTabsForWorktree: (worktreePath, tabs) =>
      set((s) => {
        const existing = s.tabsByWorktree[worktreePath];
        if (existing === tabs) return s;
        if (
          existing &&
          existing.length === tabs.length &&
          existing.every((t, i) => t.id === tabs[i].id && t.title === tabs[i].title)
        ) {
          return s;
        }
        return {
          tabsByWorktree: { ...s.tabsByWorktree, [worktreePath]: tabs },
        };
      }),

    setActiveTabIdForWorktree: (worktreePath, tabId) =>
      set((s) => {
        if (s.activeTabIdByWorktree[worktreePath] === tabId) return s;
        return {
          activeTabIdByWorktree: { ...s.activeTabIdByWorktree, [worktreePath]: tabId },
          mruTabIds: [tabId, ...s.mruTabIds.filter((id) => id !== tabId)],
        };
      }),

    setMruTabIds: (ids) => set({ mruTabIds: ids }),

    // `setWorkspaceHostScope` / `setVisibleWorkspaceHostIds` used to live here as a
    // bare-set port. The UI slice now owns them: same normalizers, local state only —
    // no `ui.state` write since 2026-10-08, the App's `ui.sidebar` blob is the single
    // writer. The App hydrates the boot value from that blob via
    // `hydrateWorkspaceHostScopePreference` below.

    addTabToWorktree: (worktreePath, tab, select = true) =>
      set((s) => {
        const currentTabs = s.tabsByWorktree[worktreePath] ?? [];
        const exists = currentTabs.some((t) => t.id === tab.id);
        const nextTabs = exists
          ? currentTabs.map((t) => (t.id === tab.id ? { ...t, ...tab } : t))
          : [...currentTabs, tab];

        if (!select) {
          return {
            tabsByWorktree: { ...s.tabsByWorktree, [worktreePath]: nextTabs },
          };
        }

        return {
          tabsByWorktree: { ...s.tabsByWorktree, [worktreePath]: nextTabs },
          activeTabIdByWorktree: { ...s.activeTabIdByWorktree, [worktreePath]: tab.id },
          mruTabIds: [tab.id, ...s.mruTabIds.filter((id) => id !== tab.id)],
        };
      }),

    removeTabFromWorktree: (worktreePath, tabId) =>
      set((s) => {
        const currentTabs = s.tabsByWorktree[worktreePath] ?? [];
        const tabIndex = currentTabs.findIndex((t) => t.id === tabId);
        if (tabIndex === -1) return s;

        const nextTabs = currentTabs.filter((t) => t.id !== tabId);
        const nextMru = s.mruTabIds.filter((id) => id !== tabId);

        const isActive = s.activeTabIdByWorktree[worktreePath] === tabId;
        let nextActiveId = s.activeTabIdByWorktree[worktreePath];

        if (isActive) {
          if (nextTabs.length === 0) {
            nextActiveId = "";
          } else {
            // Prefer adjacent tab (tab at the same index if valid, else previous tab)
            const adjacentTab = nextTabs[tabIndex] ?? nextTabs[tabIndex - 1] ?? nextTabs[0];
            nextActiveId = adjacentTab ? adjacentTab.id : "";
          }
        }

        return {
          tabsByWorktree: { ...s.tabsByWorktree, [worktreePath]: nextTabs },
          activeTabIdByWorktree: { ...s.activeTabIdByWorktree, [worktreePath]: nextActiveId },
          mruTabIds: nextMru,
        };
      }),

    selectTab: (worktreePath, tabId) =>
      set((s) => {
        if (s.activeTabIdByWorktree[worktreePath] === tabId) return s;
        return {
          activeTabIdByWorktree: { ...s.activeTabIdByWorktree, [worktreePath]: tabId },
          mruTabIds: [tabId, ...s.mruTabIds.filter((id) => id !== tabId)],
        };
      }),

    reorderTabs: (worktreePath, fromIndex, toIndex) =>
      set((s) => {
        const currentTabs = s.tabsByWorktree[worktreePath] ?? [];
        if (
          fromIndex < 0 ||
          fromIndex >= currentTabs.length ||
          toIndex < 0 ||
          toIndex >= currentTabs.length ||
          fromIndex === toIndex
        ) {
          return s;
        }
        const nextTabs = [...currentTabs];
        const [moved] = nextTabs.splice(fromIndex, 1);
        nextTabs.splice(toIndex, 0, moved);
        return {
          tabsByWorktree: { ...s.tabsByWorktree, [worktreePath]: nextTabs },
        };
      }),

    setTabCustomTitle: (worktreePath, tabId, customTitle) =>
      set((s) => {
        const currentTabs = s.tabsByWorktree[worktreePath] ?? [];
        const nextTabs = currentTabs.map((t) =>
          t.id === tabId ? { ...t, customTitle } : t
        );
        return {
          tabsByWorktree: { ...s.tabsByWorktree, [worktreePath]: nextTabs },
        };
      }),

    updateTab: (worktreePath, tabId, patch) =>
      set((s) => {
        const currentTabs = s.tabsByWorktree[worktreePath] ?? [];
        const nextTabs = currentTabs.map((t) =>
          t.id === tabId ? { ...t, ...patch } : t
        );
        return {
          tabsByWorktree: { ...s.tabsByWorktree, [worktreePath]: nextTabs },
        };
      }),

    pinTab: (worktreePath, tabId, isPinned) =>
      set((s) => {
        const currentTabs = s.tabsByWorktree[worktreePath] ?? [];
        const targetTab = currentTabs.find((t) => t.id === tabId);
        if (!targetTab) return s;

        const updated = currentTabs.map((t) =>
          t.id === tabId ? { ...t, isPinned } : t
        );

        // Stable sort: pinned tabs first, then unpinned tabs, preserving relative order
        const pinned = updated.filter((t) => t.isPinned);
        const unpinned = updated.filter((t) => !t.isPinned);
        const sorted = [...pinned, ...unpinned];

        return {
          tabsByWorktree: { ...s.tabsByWorktree, [worktreePath]: sorted },
        };
      }),

    upsertAgentStatus: (paneKey, entry) =>
      set((s) => ({
        agentStatusByPaneKey: { ...s.agentStatusByPaneKey, [paneKey]: entry },
      })),

    dropAgentStatus: (paneKey) =>
      set((s) => {
        const next = { ...s.agentStatusByPaneKey }
        delete next[paneKey]
        return { agentStatusByPaneKey: next }
      }),

    toggleCompactRootList: (worktreePath) =>
      set((s) => ({
        compactRootListExpandedByWorktree: {
          ...s.compactRootListExpandedByWorktree,
          [worktreePath]: !s.compactRootListExpandedByWorktree[worktreePath],
        },
      })),

    toggleLineageParent: (worktreePath, paneKey) =>
      set((s) => {
        const previous: Record<string, boolean> = s.collapsedLineageParentsByWorktree[worktreePath] ?? {}
        const isNowCollapsed = !previous[paneKey]
        return {
          collapsedLineageParentsByWorktree: {
            ...s.collapsedLineageParentsByWorktree,
            [worktreePath]: {
              ...previous,
              [paneKey]: isNowCollapsed,
            },
          },
        }
      }),

    hydrateTabs: (tabsByWorktree) => set({ tabsByWorktree }),
  }))
)

/**
 * Boot hydration for the `ui.sidebar` blob's host-scope keys. Applies both store
 * setters in order (scope, then ids) so their normalizers reconcile a partial or
 * legacy blob; an absent key falls back to the live-store default — `'all'` /
 * `null` (all hosts). Safe to call with a raw, unvalidated blob.
 */
export function hydrateWorkspaceHostScopePreference(blob: {
  workspaceHostScope?: unknown
  visibleWorkspaceHostIds?: unknown
}): void {
  const workspaceHostScope = normalizeExecutionHostScope(
    typeof blob.workspaceHostScope === 'string' ? blob.workspaceHostScope : null
  )
  const visibleWorkspaceHostIds = normalizeVisibleExecutionHostIds(
    Array.isArray(blob.visibleWorkspaceHostIds)
      ? (blob.visibleWorkspaceHostIds as string[])
      : null
  )
  const store = useAppStore.getState()
  store.setWorkspaceHostScope(workspaceHostScope)
  store.setVisibleWorkspaceHostIds(visibleWorkspaceHostIds)
}
