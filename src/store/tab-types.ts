// src/store/tab-types.ts
import type { TabItem } from '../components/workbench/WorkbenchTabBar'

export interface TerminalTab {
  id: string
  title: string
  customTitle?: string
  type: 'terminal' | 'settings' | 'diff' | 'editor'
  worktreePath: string
  /** ID of the PTY session backing this tab (if terminal) */
  sessionId?: string
  /** Cwd the shell actually sits in */
  cwd?: string
}

export interface TabBarState {
  /** Tabs organized by worktree path */
  tabsByWorktree: Record<string, TerminalTab[]>
  /** The active tab ID for each worktree */
  activeTabIdByWorktree: Record<string, string>
  /** Most recently used tab ids (global) */
  mruTabIds: string[]
}

/** Convert TabItem (App.tsx) to TerminalTab */
export function mapAppTabToStoreTab(appTab: TabItem, worktreePath: string): TerminalTab {
  return {
    id: appTab.id,
    title: appTab.title,
    customTitle: appTab.customTitle,
    type: 'terminal', // fallback
    worktreePath: appTab.cwd || worktreePath,
    sessionId: appTab.sessionId,
    cwd: appTab.cwd
  }
}
