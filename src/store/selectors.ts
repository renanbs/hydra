import { useAppStore } from './index'
import { useShallow } from 'zustand/react/shallow'
import type { AppState } from './index'
import type { Repo } from '../shared/repo-types'
import type { TerminalTab } from '../shared/terminal-tab-types'
import type { Worktree } from '../shared/worktree/types'
import type { ExecutionHostId } from '../shared/execution-host'
import { FLOATING_TERMINAL_WORKTREE_ID } from '../shared/constants'

const EMPTY_TABS: TerminalTab[] = []
const EMPTY_UNIFIED_TABS: NonNullable<AppState['tabsByWorktree'][string]> = []

type FloatingVisibleTabCountCache = {
  tabs: NonNullable<AppState['tabsByWorktree'][string]>
  count: number
}

let floatingVisibleTabCountCache: FloatingVisibleTabCountCache | null = null

export function selectFloatingVisibleTabCount(state: Pick<AppState, 'tabsByWorktree'>): number {
  const tabs = state.tabsByWorktree[FLOATING_TERMINAL_WORKTREE_ID] ?? EMPTY_UNIFIED_TABS

  const cached = floatingVisibleTabCountCache
  if (cached && cached.tabs === tabs) {
    return cached.count
  }

  const count = tabs.length
  floatingVisibleTabCountCache = { tabs, count }
  return count
}

export function resetFloatingVisibleTabCountSelectorCacheForTest(): void {
  floatingVisibleTabCountCache = null
}

type FloatingWorkspaceUnreadCache = {
  tabs: NonNullable<AppState['tabsByWorktree'][string]>
  hasUnread: boolean
}

let floatingWorkspaceUnreadCache: FloatingWorkspaceUnreadCache | null = null

export function selectFloatingWorkspaceHasUnread(state: Pick<AppState, 'tabsByWorktree'>): boolean {
  const tabs = state.tabsByWorktree[FLOATING_TERMINAL_WORKTREE_ID] ?? EMPTY_TABS
  const cached = floatingWorkspaceUnreadCache
  if (cached && cached.tabs === tabs) {
    return cached.hasUnread
  }

  const hasUnread = false
  floatingWorkspaceUnreadCache = { tabs, hasUnread }
  return hasUnread
}

export function resetFloatingWorkspaceUnreadSelectorCacheForTest(): void {
  floatingWorkspaceUnreadCache = null
}

export function getAllWorktreesFromState(state: Pick<AppState, 'worktreesByRepo'>): Worktree[] {
  return getCachedAllWorktrees(state.worktreesByRepo)
}

export function getWorktreeMapFromState(
  state: Pick<AppState, 'worktreesByRepo'>
): Map<string, Worktree> {
  return getCachedWorktreeMap(state.worktreesByRepo)
}

export function getWorktreeOnHostFromState(
  _state: Pick<AppState, keyof AppState>,
  _worktreeId: string,
  _hostId?: ExecutionHostId
): Worktree | undefined {
  return undefined
}

export function getHasAnyWorktreesFromState(_state: Pick<AppState, keyof AppState>): boolean {
  return false
}

export function getRepoMapFromState(state: Pick<AppState, 'repos'>): Map<string, Repo> {
  return getCachedRepoMap(state.repos)
}

function selectRepoByIdForActiveWorkspace(
  state: Pick<AppState, 'activeRepoId' | 'repos'>,
  repoId: string | null
): Repo | null {
  if (!repoId) {
    return null
  }
  const repo = state.repos.find((r) => r.id === repoId) ?? null
  return repo
}

function getCachedAllWorktrees(worktreesByRepo: Record<string, Worktree[]>): Worktree[] {
  return Object.values(worktreesByRepo).flat()
}

function getCachedWorktreeMap(worktreesByRepo: Record<string, Worktree[]>): Map<string, Worktree> {
  const map = new Map<string, Worktree>()
  for (const tree of Object.values(worktreesByRepo).flat()) {
    map.set(tree.id, tree)
  }
  return map
}

function getCachedRepoMap(repos: Repo[]): Map<string, Repo> {
  const map = new Map<string, Repo>()
  for (const repo of repos) {
    map.set(repo.id, repo)
  }
  return map
}

export const useRepos = () => useAppStore((s) => s.repos)
export const useActiveRepo = () =>
  useAppStore(useShallow((s) => selectRepoByIdForActiveWorkspace(s as Pick<AppState, 'activeRepoId' | 'repos'>, s.activeRepoId)))
export const useRepoMap = () => useAppStore((s) => getCachedRepoMap(s.repos as Repo[]))
export const useAllWorktrees = () => useAppStore((s) => getCachedAllWorktrees(s.worktreesByRepo))
export const useWorktreeMap = () => useAppStore((s) => getCachedWorktreeMap(s.worktreesByRepo))
