// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/workspace-lineage-menu-actions.ts
// Sleep eligibility and subtree actions for the worktree context menu.
//
// Deviation from the Orca source: Hydra's sidebar owns `sessions`/`tabs` in App
// state (its terminal pane is App-rendered), while browser tabs live in the
// Orca-ported store slice. `buildHydraSleepActivityMaps` folds both sources into
// Orca's `tabsByWorktree` / `ptyIdsByTabId` / `browserTabsByWorktree` shape so the
// eligibility rules stay the same pure functions the audit requires.
import {
  getWorkspaceDeleteLineage,
  type WorkspaceDeleteLineageRow,
} from './workspace-delete-lineage'

export type SleepActivityMaps = {
  tabsByWorktree: Readonly<Record<string, readonly { id: string }[]>>
  ptyIdsByTabId: Readonly<Record<string, readonly string[]>>
  browserTabsByWorktree: Readonly<Record<string, readonly { id: string }[]>>
}

export type WorkspaceSleepRow = WorkspaceDeleteLineageRow

export type WorkspaceSleepLineage<T extends WorkspaceSleepRow> = {
  descendants: T[]
  targets: T[]
  sleepableTargets: T[]
}

/** Orca `tabHasLivePty`: a tab is alive only while it still owns a PTY id. */
export function tabHasLivePty(
  ptyIdsByTabId: SleepActivityMaps['ptyIdsByTabId'],
  tabId: string
): boolean {
  return (ptyIdsByTabId[tabId] ?? []).length > 0
}

/**
 * Orca `hasSleepableWorkspaceActivity`: there is something to release only when a
 * tab still owns a live PTY, or the workspace still holds browser tabs. A workspace
 * with nothing to close must not offer an enabled Sleep action.
 */
export function hasSleepableWorkspaceActivity(
  worktreeId: string,
  { tabsByWorktree, ptyIdsByTabId, browserTabsByWorktree }: SleepActivityMaps
): boolean {
  const tabs = tabsByWorktree[worktreeId] ?? []
  return (
    tabs.some((tab) => tabHasLivePty(ptyIdsByTabId, tab.id)) ||
    (browserTabsByWorktree[worktreeId] ?? []).length > 0
  )
}

export function getSleepableWorktrees<T extends { id: string }>(
  worktrees: readonly T[],
  activity: SleepActivityMaps
): T[] {
  return worktrees.filter((worktree) => hasSleepableWorkspaceActivity(worktree.id, activity))
}

/**
 * Projected lineage actions for one parent: every descendant (recursive, cycles
 * dropped by `getWorkspaceDeleteLineage`), the sleep targets (parent + descendants)
 * and only the rows that actually have something to release.
 */
export function getWorkspaceSleepLineage<T extends WorkspaceSleepRow>(
  parent: T,
  allRows: readonly T[],
  lineageByPath: Readonly<Record<string, string>> | null | undefined,
  activity: SleepActivityMaps
): WorkspaceSleepLineage<T> {
  const { descendants } = getWorkspaceDeleteLineage(parent, allRows, lineageByPath)
  const targets = [parent, ...descendants]
  return {
    descendants,
    targets,
    sleepableTargets: targets.filter((target) =>
      hasSleepableWorkspaceActivity(target.id, activity)
    ),
  }
}

export type WorkspaceSleepMenuState = {
  /** Multi-context Sleep label (`Sleep N Workspaces` when anything is sleepable). */
  sleepLabel: string
  sleepDisabled: boolean
  /** Descendants of a single context row — the recursive subtree count. */
  descendantCount: number
  subtreeSleepDisabled: boolean
}

/**
 * Orca `use-worktree-context-menu-model`: the Sleep row is enabled only when at
 * least one row in the context still has activity, the subtree row only when one
 * of the slept rows (parent included) does, and the subtree row is hidden entirely
 * for a multi-selection.
 */
export function getWorkspaceSleepMenuState(args: {
  isMultiContext: boolean
  activeContextWorktrees: readonly { id: string }[]
  lineageDescendantCount: number
  sleepableTargets: readonly { id: string }[]
  activity: SleepActivityMaps
}): WorkspaceSleepMenuState {
  const sleepable = getSleepableWorktrees(args.activeContextWorktrees, args.activity)
  const subtreeSleepable = args.sleepableTargets.filter((target) =>
    hasSleepableWorkspaceActivity(target.id, args.activity)
  )
  return {
    sleepLabel:
      args.isMultiContext && sleepable.length > 0
        ? `Sleep ${sleepable.length} Workspace${sleepable.length === 1 ? '' : 's'}`
        : 'Sleep',
    sleepDisabled: sleepable.length === 0,
    descendantCount: args.isMultiContext ? 0 : args.lineageDescendantCount,
    subtreeSleepDisabled: !args.isMultiContext && subtreeSleepable.length === 0,
  }
}

export type HydraSleepSession = {
  id: string
  project_path: string
  state: string
}

export type HydraSleepTab = {
  id: string
  cwd?: string
  sessionId?: string
  splitPanes?: readonly { sessionId: string }[]
  splitSessionIds?: readonly (string | undefined)[]
}

/**
 * Builds the Orca-shaped activity maps from Hydra's two ownership models:
 * - App sessions/tabs: a tab owns the session ids of its panes; a session record
 *   marked `idle` is the result of a previous sleep, so it is not live activity.
 * - Store browser tabs: keyed by workspace key (path or `folder:<id>`).
 */
export function buildHydraSleepActivityMaps(args: {
  sessions: readonly HydraSleepSession[]
  tabs: readonly HydraSleepTab[]
  browserTabsByWorktree: Readonly<Record<string, readonly { id: string }[]>> | null | undefined
}): SleepActivityMaps {
  const tabsByWorktree: Record<string, { id: string }[]> = {}
  const ptyIdsByTabId: Record<string, string[]> = {}

  const pushTab = (worktreeKey: string, tab: { id: string }): void => {
    const tabs = tabsByWorktree[worktreeKey]
    if (tabs) {
      if (!tabs.some((existing) => existing.id === tab.id)) tabs.push(tab)
    } else {
      tabsByWorktree[worktreeKey] = [tab]
    }
  }

  for (const session of args.sessions) {
    if (session.state === 'idle') {
      continue
    }
    pushTab(session.project_path, { id: session.id })
    ptyIdsByTabId[session.id] = [session.id]
  }

  for (const tab of args.tabs) {
    const sessionIds = new Set<string>()
    if (tab.sessionId) sessionIds.add(tab.sessionId)
    for (const pane of tab.splitPanes ?? []) sessionIds.add(pane.sessionId)
    for (const paneSessionId of tab.splitSessionIds ?? []) {
      if (paneSessionId) sessionIds.add(paneSessionId)
    }
    // A tab with no session yet (editor/diff) would not be closed by sleep.
    if (sessionIds.size === 0) continue
    if (tab.cwd) pushTab(tab.cwd, tab)
    ptyIdsByTabId[tab.id] = [...sessionIds]
  }

  const browserTabsByWorktree: Record<string, { id: string }[]> = {}
  for (const [key, value] of Object.entries(args.browserTabsByWorktree ?? {})) {
    browserTabsByWorktree[key] = value.map((entry) => ({ id: entry.id }))
  }

  return { tabsByWorktree, ptyIdsByTabId, browserTabsByWorktree }
}
