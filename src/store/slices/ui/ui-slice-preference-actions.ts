import type { UISlice, UISliceGet, UISliceSet } from './ui-slice-contract'
import {
  DEFAULT_AGENTS_GROUP_BY,
  DEFAULT_AGENTS_READ_FILTER
} from '../../../shared/agents-view-thread-filters'
import {
  DEFAULT_AGENT_ACTIVITY_DISPLAY_MODE,
  DEFAULT_SHOW_SLEEPING_WORKSPACES,
  DEFAULT_STATUS_BAR_ITEMS,
  DEFAULT_WORKTREE_CARD_PROPERTIES,
  getWorktreeCardModeUpdates,
  normalizeAgentActivityDisplayMode,
  normalizeWorktreeCardProperties
} from '../../../shared/constants'
import {
  DEFAULT_USAGE_PERCENTAGE_DISPLAY,
  normalizeUsagePercentageDisplay
} from '../../../shared/usage-percentage-display'
import {
  DEFAULT_STATUS_BAR_USAGE_MODE,
  normalizeStatusBarUsageMode
} from '../../../shared/status-bar-usage-mode'
import type { WorkspaceHostScope } from '../../../shared/ui-chrome-types'
import {
  normalizeExecutionHostOrder,
  normalizeExecutionHostScope,
  normalizeVisibleExecutionHostIds
} from '../../../shared/execution-host'
import {
  ALL_AUTOMATION_HOSTS_FILTER,
  toPersistedAutomationHostFilter
} from '../../../shared/automation-host-filter'
import {
  clampWorkspaceBoardColumnWidth,
  clampWorkspaceBoardOpacity,
  cloneDefaultWorkspaceStatuses,
  normalizeWorkspaceStatuses,
  WORKSPACE_BOARD_COLUMN_WIDTH_DEFAULT
} from '../../../shared/workspace-statuses'
import { uiPrefsBridge } from '../../ui-prefs-bridge'

export function createUiPreferenceActions(set: UISliceSet, get: UISliceGet): Partial<UISlice> {
  return {
    sidebarBody: 'workspaces',
    setSidebarBody: (body: any) => set({ sidebarBody: body }),

    groupBy: 'repo',
    // Why: group keys are mode-specific, so clear collapsed state on mode switch — stale keys are meaningless and accumulate.
    setGroupBy: (g: any) => {
      uiPrefsBridge.set({ groupBy: g, collapsedGroups: [] }).catch(console.error)
      set({ groupBy: g, collapsedGroups: new Set<string>() })
    },

    sortBy: 'recent',
    setSortBy: (s: any) => set({ sortBy: s }),

    // Why: bare set — persists only via the App's debounced `ui.sidebar` writer, not on its own.
    projectOrderBy: 'manual',
    setProjectOrderBy: (p: any) => set({ projectOrderBy: p }),

    showActiveOnly: false,
    setShowActiveOnly: (v: any) => set({ showActiveOnly: v }),

    showSleepingWorkspaces: DEFAULT_SHOW_SLEEPING_WORKSPACES,
    setShowSleepingWorkspaces: (v: any) => set({ showSleepingWorkspaces: v }),

    workspaceHostScope: 'all',
    // Why: host scope is presentation/filtering only — must never trigger resource teardown (terminals, browser pages).
    setWorkspaceHostScope: (scope: any) => {
      const normalized = normalizeExecutionHostScope(scope)
      const visibleWorkspaceHostIds = normalized === 'all' ? null : [normalized]
      set({ workspaceHostScope: normalized, visibleWorkspaceHostIds })
      uiPrefsBridge.set({ workspaceHostScope: normalized, visibleWorkspaceHostIds })
        .catch(console.error)
    },
    visibleWorkspaceHostIds: null,
    setVisibleWorkspaceHostIds: (ids: any) => {
      const normalized = normalizeVisibleExecutionHostIds(ids)
      // Why: workspaceHostScope stays the compat/default-host signal for creation flows; visibility can now be multi-select.
      let workspaceHostScope: WorkspaceHostScope = get().workspaceHostScope
      if (normalized === null) {
        workspaceHostScope = 'all'
      } else if (normalized.length === 1) {
        workspaceHostScope = normalized[0]
      }
      set({ visibleWorkspaceHostIds: normalized, workspaceHostScope })
      uiPrefsBridge.set({ visibleWorkspaceHostIds: normalized, workspaceHostScope })
        .catch(console.error)
    },
    workspaceHostOrder: [],
    setWorkspaceHostOrder: (ids: any) => {
      const workspaceHostOrder = normalizeExecutionHostOrder(ids)
      set({ workspaceHostOrder })
      uiPrefsBridge.set({ workspaceHostOrder }).catch(console.error)
    },
    automationHostFilter: ALL_AUTOMATION_HOSTS_FILTER,
    setAutomationHostFilter: (filter: any) => {
      uiPrefsBridge.set({ automationHostFilter: toPersistedAutomationHostFilter(filter) })
        .catch(console.error)
      set({ automationHostFilter: filter })
    },
    manualRepoOrder: [],

    hideDefaultBranchWorkspace: false,
    setHideDefaultBranchWorkspace: (v: any) => set({ hideDefaultBranchWorkspace: v }),
    hideAutomationGeneratedWorkspaces: false,
    setHideAutomationGeneratedWorkspaces: (v: any) => set({ hideAutomationGeneratedWorkspaces: v }),
    hideCliCreatedWorkspaces: false,
    setHideCliCreatedWorkspaces: (v: any) => set({ hideCliCreatedWorkspaces: v }),
    hideDetachedHeadWorkspaces: false,
    setHideDetachedHeadWorkspaces: (v: any) => set({ hideDetachedHeadWorkspaces: v }),
    hideWorkspacesFromOtherDevices: false,
    setHideWorkspacesFromOtherDevices: (v: any) => set({ hideWorkspacesFromOtherDevices: v }),
    alwaysShowDefaultBranchWorkspace: true,
    setAlwaysShowDefaultBranchWorkspace: (v: any) => set({ alwaysShowDefaultBranchWorkspace: v }),

    showDotfilesByWorktree: {},
    setShowDotfilesForWorktree: (worktreeId: any, showDotfiles: any) =>
      set((s: any) => {
        if (!worktreeId) {
          return s
        }
        const current = s.showDotfilesByWorktree[worktreeId] ?? true
        if (current === showDotfiles) {
          return s
        }
        const next = { ...s.showDotfilesByWorktree }
        // Why: showing dotfiles is the default; only persist worktree-level opt-outs.
        if (showDotfiles) {
          delete next[worktreeId]
        } else {
          next[worktreeId] = false
        }
        return { showDotfilesByWorktree: next }
      }),
    toggleShowDotfilesForWorktree: (worktreeId: any) =>
      set((s: any) => {
        if (!worktreeId) {
          return s
        }
        const nextShowDotfiles = !(s.showDotfilesByWorktree[worktreeId] ?? true)
        const next = { ...s.showDotfilesByWorktree }
        if (nextShowDotfiles) {
          delete next[worktreeId]
        } else {
          next[worktreeId] = false
        }
        return { showDotfilesByWorktree: next }
      }),

    filterRepoIds: [],
    setFilterRepoIds: (ids: any) => set({ filterRepoIds: ids }),

    agentsVisibleHostIds: null,
    setAgentsVisibleHostIds: (ids: any) => {
      const agentsVisibleHostIds = normalizeVisibleExecutionHostIds(ids)
      set({ agentsVisibleHostIds })
      uiPrefsBridge.set({ agentsVisibleHostIds }).catch(console.error)
    },
    agentsFilterRepoIds: [],
    setAgentsFilterRepoIds: (ids: any) => {
      set({ agentsFilterRepoIds: ids })
      uiPrefsBridge.set({ agentsFilterRepoIds: [...ids] }).catch(console.error)
    },
    agentsShowChildAgents: false,
    setAgentsShowChildAgents: (v: any) => {
      set({ agentsShowChildAgents: v })
      uiPrefsBridge.set({ agentsShowChildAgents: v }).catch(console.error)
    },
    agentsCompactMode: true,
    setAgentsCompactMode: (v: any) => {
      set({ agentsCompactMode: v })
      uiPrefsBridge.set({ agentsCompactMode: v }).catch(console.error)
    },
    agentsShowSearch: true,
    setAgentsShowSearch: (v: any) => {
      set({ agentsShowSearch: v })
      uiPrefsBridge.set({ agentsShowSearch: v }).catch(console.error)
    },
    agentsReadFilter: DEFAULT_AGENTS_READ_FILTER,
    setAgentsReadFilter: (v: any) => {
      set({ agentsReadFilter: v })
      uiPrefsBridge.set({ agentsReadFilter: v }).catch(console.error)
    },
    agentsGroupBy: DEFAULT_AGENTS_GROUP_BY,
    setAgentsGroupBy: (v: any) => {
      set({ agentsGroupBy: v })
      uiPrefsBridge.set({ agentsGroupBy: v }).catch(console.error)
    },

    collapsedGroups: new Set<string>(),
    toggleCollapsedGroup: (key: any) =>
      set((s: any) => {
        const next = new Set(s.collapsedGroups)
        if (next.has(key)) {
          next.delete(key)
        } else {
          next.add(key)
        }
        uiPrefsBridge.set({ collapsedGroups: [...next] }).catch(console.error)
        return { collapsedGroups: next }
      }),

    worktreeCardProperties: [...DEFAULT_WORKTREE_CARD_PROPERTIES],
    _worktreeCardModeDefaulted: true,
    setWorktreeCardMode: (mode: any) => {
      const updates = getWorktreeCardModeUpdates(mode)
      set((s: any) => ({
        settings: s.settings ? { ...s.settings, ...updates.settings } : s.settings,
        worktreeCardProperties: updates.ui.worktreeCardProperties,
        _worktreeCardModeDefaulted: true
      }))
      void Promise.all([
        window.api.settings.set(updates.settings).then((nextSettings: any) => {
          if (nextSettings) {
            set({ settings: nextSettings })
          }
        }),
        uiPrefsBridge.set(updates.ui)
      ]).catch(console.error)
    },
    setWorktreeCardProperties: (properties: any) => {
      const normalized = normalizeWorktreeCardProperties(properties)
      set({ worktreeCardProperties: normalized, _worktreeCardModeDefaulted: false })
      uiPrefsBridge.set({ worktreeCardProperties: normalized, _worktreeCardModeDefaulted: false })
        .catch(console.error)
    },
    agentActivityDisplayMode: DEFAULT_AGENT_ACTIVITY_DISPLAY_MODE,
    setAgentActivityDisplayMode: (mode: any) => {
      const normalized = normalizeAgentActivityDisplayMode(mode)
      uiPrefsBridge.set({ agentActivityDisplayMode: normalized }).catch(console.error)
      set({ agentActivityDisplayMode: normalized })
    },

    workspaceStatuses: cloneDefaultWorkspaceStatuses(),
    setWorkspaceStatuses: (statuses: any) => {
      const normalized = normalizeWorkspaceStatuses(statuses)
      uiPrefsBridge.set({ workspaceStatuses: normalized }).catch(console.error)
      set({ workspaceStatuses: normalized })
    },

    workspaceBoardOpacity: 1,
    setWorkspaceBoardOpacity: (opacity: any) => {
      const clamped = clampWorkspaceBoardOpacity(opacity)
      uiPrefsBridge.set({ workspaceBoardOpacity: clamped }).catch(console.error)
      set({ workspaceBoardOpacity: clamped })
    },

    workspaceBoardColumnWidth: WORKSPACE_BOARD_COLUMN_WIDTH_DEFAULT,
    setWorkspaceBoardColumnWidth: (width: any) => {
      const clamped = clampWorkspaceBoardColumnWidth(width)
      uiPrefsBridge.set({ workspaceBoardColumnWidth: clamped }).catch(console.error)
      set({ workspaceBoardColumnWidth: clamped })
    },

    syncTaskStatusFromWorkspaceBoard: false,
    setSyncTaskStatusFromWorkspaceBoard: (enabled: any) => {
      uiPrefsBridge.set({ syncTaskStatusFromWorkspaceBoard: enabled }).catch(console.error)
      set({ syncTaskStatusFromWorkspaceBoard: enabled })
    },

    statusBarItems: [...DEFAULT_STATUS_BAR_ITEMS],
    toggleStatusBarItem: (item: any) =>
      set((s: any) => {
        const current = s.statusBarItems || DEFAULT_STATUS_BAR_ITEMS
        const updated = current.includes(item)
          ? current.filter((i: any) => i !== item)
          : [...current, item]
        uiPrefsBridge.set({ statusBarItems: updated }).catch(console.error)
        return { statusBarItems: updated }
      }),

    agentDashboardDrawerOpen: false,
    setAgentDashboardDrawerOpen: (open: any) => set({ agentDashboardDrawerOpen: open }),
    statusBarVisible: true,
    setStatusBarVisible: (v: any) => {
      uiPrefsBridge.set({ statusBarVisible: v }).catch(console.error)
      set({ statusBarVisible: v })
    },
    usagePercentageDisplay: DEFAULT_USAGE_PERCENTAGE_DISPLAY,
    setUsagePercentageDisplay: (display: any) => {
      const normalized = normalizeUsagePercentageDisplay(display)
      // Why: changing the control is the discovery path, so permanently dismiss the one-time change notice.
      uiPrefsBridge.set({
        usagePercentageDisplay: normalized,
        usagePercentageDisplayChangeNoticeDismissed: true
      }).catch(console.error)
      set({
        usagePercentageDisplay: normalized,
        usagePercentageDisplayChangeNoticeDismissed: true
      })
    },
    statusBarUsageMode: DEFAULT_STATUS_BAR_USAGE_MODE,
    setStatusBarUsageMode: (mode: any) => {
      const normalized = normalizeStatusBarUsageMode(mode)
      uiPrefsBridge.set({ statusBarUsageMode: normalized }).catch(console.error)
      set({ statusBarUsageMode: normalized })
    }
  }
}
