// @ts-nocheck — Orca port buffer; typecheck when this subsystem is wired.
import { resolveActiveTabOwnerWorktreeId } from '../slices/active-tab-owner-worktree'
import { getTerminalTabOwnerWorktreeId } from '../slices/terminal-tab-owner-index'
import type { TerminalSlice, TerminalStoreGet, TerminalStoreSet } from './terminal-state'

export function createTerminalTabNavigationActions(
  set: TerminalStoreSet,
  get: TerminalStoreGet
): Pick<
  TerminalSlice,
  | 'reorderTabs'
  | 'setTabBarOrder'
  | 'setActiveTab'
  | 'setActiveTabForWorktree'
  | 'getTerminalTabOwnerWorktreeId'
> {
  return {
    reorderTabs: (worktreeId: any, tabIds: any) => {
      set((s: any) => {
        const tabs = s.tabsByWorktree[worktreeId] ?? []
        const tabMap = new Map(tabs.map((t: any) => [t.id, t]))
        const orderedSet = new Set(tabIds)
        const missingTabs = tabs.filter((t: any) => !orderedSet.has(t.id))
        const reordered = [
          ...tabIds.map((id: any) => tabMap.get(id)!).filter(Boolean),
          ...missingTabs
        ].map((tab, i) => ({ ...tab, sortOrder: i }))
        return {
          tabsByWorktree: { ...s.tabsByWorktree, [worktreeId]: reordered }
        }
      })
    },
    setTabBarOrder: (worktreeId: any, order: any) => {
      set((s: any) => {
        // Update unified visual order
        const newTabBarOrder = { ...s.tabBarOrderByWorktree, [worktreeId]: order }
        // Keep terminal tab sortOrder in sync for persistence
        const tabs = s.tabsByWorktree[worktreeId]
        if (!tabs) {
          return { tabBarOrderByWorktree: newTabBarOrder }
        }
        const tabMap = new Map(tabs.map((t: any) => [t.id, t]))
        // Extract terminal IDs in their new relative order
        const terminalIdsInOrder = order.filter((id: any) => tabMap.has(id))
        const orderedSet = new Set(terminalIdsInOrder)
        const missingTabs = tabs.filter((t: any) => !orderedSet.has(t.id))
        const updatedTabs = [
          ...terminalIdsInOrder.map((id: any) => tabMap.get(id)!).filter(Boolean),
          ...missingTabs
        ].map((tab, i) => ({ ...tab, sortOrder: i }))
        return {
          tabBarOrderByWorktree: newTabBarOrder,
          tabsByWorktree: { ...s.tabsByWorktree, [worktreeId]: updatedTabs }
        }
      })
    },
    setActiveTab: (tabId: any) => {
      let tabOwnerWorktreeId: string | null = null
      set((s: any) => {
        // Why: clear bells only for visible tabs; background bells must persist.
        tabOwnerWorktreeId = resolveActiveTabOwnerWorktreeId(
          s.tabsByWorktree,
          s.activeWorktreeId,
          tabId
        )
        const isActiveWorktreeTab =
          tabOwnerWorktreeId !== null && tabOwnerWorktreeId === s.activeWorktreeId
        const nextUnreadTerminalTabs =
          isActiveWorktreeTab && s.unreadTerminalTabs[tabId]
            ? (() => {
                const copy = { ...s.unreadTerminalTabs }
                delete copy[tabId]
                return copy
              })()
            : s.unreadTerminalTabs
        // Why: activeTabId marks the visible tab, so background bells remain unread.
        return {
          activeTabId: isActiveWorktreeTab ? tabId : s.activeTabId,
          // Why: a redundant activation must not reallocate this map — Terminal's
          // active-terminal repair effect depends on it, so a re-activation that
          // can't converge activeTabId (tab id reused by an earlier-scanned
          // worktree) would otherwise re-trigger itself into React error #185.
          activeTabIdByWorktree:
            tabOwnerWorktreeId !== null && s.activeTabIdByWorktree[tabOwnerWorktreeId] !== tabId
              ? { ...s.activeTabIdByWorktree, [tabOwnerWorktreeId]: tabId }
              : s.activeTabIdByWorktree,
          unreadTerminalTabs: nextUnreadTerminalTabs
        }
      })
      const state = get()
      const ownerUnifiedTabs =
        tabOwnerWorktreeId !== null &&
        Object.hasOwn(state.unifiedTabsByWorktree, tabOwnerWorktreeId)
          ? state.unifiedTabsByWorktree[tabOwnerWorktreeId]
          : []
      // Why: a duplicated entity id must activate the same owner chosen above.
      const item =
        ownerUnifiedTabs.find(
          (entry: any) => entry.contentType === 'terminal' && entry.entityId === tabId
        ) ??
        Object.values(state.unifiedTabsByWorktree)
          .flat()
          .find((entry) => entry.contentType === 'terminal' && entry.entityId === tabId)
      if (item) {
        state.activateTab(
          item.id,
          tabOwnerWorktreeId !== null ? { worktreeId: tabOwnerWorktreeId } : undefined
        )
      }
    },
    getTerminalTabOwnerWorktreeId: (tabId: any) =>
      getTerminalTabOwnerWorktreeId(get().tabsByWorktree, tabId),
    setActiveTabForWorktree: (worktreeId: any, tabId: any) => {
      set((s: any) => ({
        activeTabIdByWorktree: {
          ...s.activeTabIdByWorktree,
          [worktreeId]: tabId
        }
      }))
    }
  }
}
