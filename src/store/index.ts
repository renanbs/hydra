import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

import type { TabItem } from '../components/workbench/WorkbenchTabBar'
import type { AgentStatusEntry } from './agent-status-types'

export const EMPTY_TABS: TabItem[] = [];
export interface AppState {
  /** Tabs grouped by workspace (worktree path) */
  tabsByWorktree: Record<string, TabItem[]>
  /** The currently active tab id for each workspace */
  activeTabIdByWorktree: Record<string, string>
  /** Currently active tab ids in MRU order */
  mruTabIds: string[]
  
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

  /** Register or update an agent state */
  upsertAgentStatus: (paneKey: string, entry: AgentStatusEntry) => void
  /** Remove an agent state */
  dropAgentStatus: (paneKey: string) => void

  /** Toggles */
  toggleCompactRootList: (worktreePath: string) => void
  toggleLineageParent: (worktreePath: string, paneKey: string) => void

  /** Load initial data into the store */
  hydrateTabs: (tabsByWorktree: Record<string, TabItem[]>) => void
}

export const useAppStore = create<AppState>()(
  subscribeWithSelector((set) => ({
    tabsByWorktree: {},
    activeTabIdByWorktree: {},
    mruTabIds: [],
    agentStatusByPaneKey: {},
    compactRootListExpandedByWorktree: {},
    collapsedLineageParentsByWorktree: {},

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
