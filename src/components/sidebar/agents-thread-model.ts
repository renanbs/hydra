// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/activity/activity-thread-builder.ts + activity-thread-grouping.ts
//
// The Agents view is a thread navigator: every live hook row, retained completion and
// headless daemon session becomes one row. A row whose backing session is gone stays
// listed but inert (no sessionId), matching Orca's activateThreadTerminal no-op.
import { latestAgentTurnTimestamp } from '../../store/slices/ui/ui-slice-agent-notification-acknowledgement'
import { migrationUnsupportedToAgentStatusEntry } from '../../lib/migration-unsupported-agent-entry'
import type { AgentRowState } from '../../lib/agent-row-decay-state'
import type {
  AgentStatusEntry,
  AgentStatusOrchestrationContext,
  MigrationUnsupportedPtyEntry
} from '../../shared/agent-status-types'
import { isShellProcess } from '../workbench/tab-agent'
import { applyAgentRowLineage } from './agent-row-lineage'
import type { AgentsGroupBy, WorktreeSession } from './types'
import { buildWorktreeAgentRows } from './worktree-agent-rows'
import {
  selectLiveAgentStatusEntriesForWorktree,
  selectMigrationUnsupportedEntriesForWorktree,
  selectRetainedAgentEntriesForWorktree,
  selectRuntimeAgentOrchestrationForWorktree,
  selectTerminalLayoutsForWorktree,
  type WorktreeAgentRowsState
} from './worktree-agent-row-selectors'
import type {
  WorktreeAgentRowSource,
  WorktreeAgentTab
} from './worktree-agent-row-types'

export type AgentsThread = {
  paneKey: string
  worktreePath: string
  projectPath: string
  projectName: string
  branch: string
  title: string
  agentType: string
  entry: AgentStatusEntry
  state: AgentRowState
  rowSource: WorktreeAgentRowSource
  startedAt: number
  tab: WorktreeAgentTab
  /** Backing workbench/daemon session; absent means the row is inert. */
  sessionId?: string
  /** True while the row's pane/session is still present; drives selection liveness. */
  isLive: boolean
  isRetained: boolean
  isChild: boolean
  unread: boolean
  updatedAt: number
  latestTimestamp: number
}

export type AgentsThreadState = WorktreeAgentRowsState & {
  ptyIdsByTabId?: Record<string, string[]>
  runtimeAgentOrchestrationByPaneKey?: Record<string, AgentStatusOrchestrationContext>
  acknowledgedAgentsByPaneKey?: Record<string, number>
  unreadTerminalPanes?: Record<string, unknown>
  unreadAgentCompletionPanes?: Record<string, unknown>
  manuallyUnreadTurnsByPaneKey?: Record<string, number>
  activityClearedAtByPaneKey?: Record<string, number>
}

export type AgentsThreadInput = {
  state: AgentsThreadState
  sessions: readonly WorktreeSession[]
  projects: readonly { name?: string; path: string }[]
  now?: number
}

const STATE_ORDER: Record<string, number> = {
  blocked: 0,
  waiting: 1,
  working: 2,
  done: 3,
  idle: 4,
  unverifiable: 5
}

function projectForPath(
  projects: AgentsThreadInput['projects'],
  path: string
): { name: string; path: string } | undefined {
  let match: { name: string; path: string } | undefined
  for (const project of projects) {
    if (path === project.path || path.startsWith(`${project.path}/`)) {
      if (!match || project.path.length > match.path.length) {
        match = { name: project.name ?? project.path, path: project.path }
      }
    }
  }
  return match
}

function unreadForThread(args: {
  paneKey: string
  rowState: AgentRowState
  isRetained: boolean
  latestTimestamp: number
  storeState: AgentsThreadState
}): boolean {
  const storeState = args.storeState
  if (storeState.manuallyUnreadTurnsByPaneKey?.[args.paneKey] !== undefined) {
    return true
  }
  if (
    storeState.unreadTerminalPanes?.[args.paneKey] !== undefined ||
    storeState.unreadAgentCompletionPanes?.[args.paneKey] !== undefined
  ) {
    return true
  }
  if (args.rowState !== 'done' && !args.isRetained) {
    return false
  }
  const acknowledged = storeState.acknowledgedAgentsByPaneKey?.[args.paneKey] ?? 0
  const clearedAt = storeState.activityClearedAtByPaneKey?.[args.paneKey] ?? 0
  return args.latestTimestamp > acknowledged && args.latestTimestamp > clearedAt
}

function buildWorktreeThreads(
  input: AgentsThreadInput,
  worktreePath: string,
  sessionsById: ReadonlyMap<string, WorktreeSession>
): AgentsThread[] {
  const state = input.state
  const now = input.now ?? Date.now()
  const tabs = state.tabsByWorktree?.[worktreePath] ?? []
  const migrationEntries = selectMigrationUnsupportedEntriesForWorktree(
    state,
    worktreePath
  ).flatMap((unsupported: MigrationUnsupportedPtyEntry) => {
    const entry = migrationUnsupportedToAgentStatusEntry(unsupported)
    return entry ? [entry] : []
  })
  const entries = [...selectLiveAgentStatusEntriesForWorktree(state, worktreePath), ...migrationEntries]

  const rows = applyAgentRowLineage(
    buildWorktreeAgentRows({
      tabs,
      entries,
      retained: selectRetainedAgentEntriesForWorktree(state, worktreePath),
      ptyIdsByTabId: state.ptyIdsByTabId,
      terminalLayoutsByTabId: selectTerminalLayoutsForWorktree(state, worktreePath),
      runtimeAgentOrchestrationByPaneKey: selectRuntimeAgentOrchestrationForWorktree(
        state,
        worktreePath
      ),
      now
    })
  )

  const project = projectForPath(input.projects, worktreePath)
  const projectPath = project?.path ?? worktreePath
  const branch = input.sessions.find((session) => session.project_path === worktreePath)?.branch ?? ''

  return rows.map((row) => {
    const latestTimestamp = latestAgentTurnTimestamp(row.entry)
    const sessionId =
      row.sessionId ?? row.tab.sessionId ?? (sessionsById.has(row.tab.id) ? row.tab.id : undefined)
    const isRetained = row.rowSource === 'retained'
    const paneIsPresent =
      tabs.some((tab) => tab.id === row.tab.id) ||
      state.agentStatusByPaneKey?.[row.paneKey] !== undefined
    const isLive = !isRetained && paneIsPresent
    return {
      paneKey: row.paneKey,
      worktreePath,
      projectPath,
      projectName: project?.name ?? worktreePath,
      branch,
      title: row.entry.prompt || row.entry.terminalTitle || row.tab.title || row.paneKey,
      agentType: row.agentType ?? 'unknown',
      entry: row.entry,
      state: row.state,
      rowSource: row.rowSource,
      startedAt: row.startedAt,
      tab: row.tab,
      sessionId,
      isLive,
      isRetained,
      isChild: row.lineage.depth > 0,
      unread: unreadForThread({
        paneKey: row.paneKey,
        rowState: row.state,
        isRetained,
        latestTimestamp,
        storeState: state
      }),
      updatedAt: row.entry.updatedAt,
      latestTimestamp
    }
  })
}

/** Headless daemon sessions with no row in the worktree pipeline. */
function buildHeadlessThreads(
  input: AgentsThreadInput,
  coveredPaneKeys: ReadonlySet<string>,
  coveredSessionIds: ReadonlySet<string>
): AgentsThread[] {
  const threads: AgentsThread[] = []
  for (const session of input.sessions) {
    if (coveredSessionIds.has(session.id) || coveredPaneKeys.has(session.id)) {
      continue
    }
    if (isShellProcess(session.agentName || session.executable)) {
      continue
    }
    const startedAt = session.state_started_at ?? session.created_at ?? input.now ?? Date.now()
    const rowState: AgentRowState =
      session.state === 'working' || session.state === 'blocked' ||
      session.state === 'waiting' || session.state === 'done'
        ? session.state
        : 'idle'
    const entryState: AgentStatusEntry['state'] =
      rowState === 'working' || rowState === 'blocked' || rowState === 'waiting'
        ? rowState
        : 'done'
    const project = projectForPath(input.projects, session.project_path)
    const entry: AgentStatusEntry = {
      paneKey: session.id,
      state: entryState,
      prompt: session.title,
      updatedAt: session.updated_at ?? startedAt,
      stateStartedAt: startedAt,
      stateHistory: [],
      agentType: session.agentName || session.executable
    }
    const latestTimestamp = latestAgentTurnTimestamp(entry)
    threads.push({
      paneKey: session.id,
      worktreePath: session.project_path,
      projectPath: project?.path ?? session.project_path,
      projectName: project?.name ?? session.project_path,
      branch: session.branch,
      title: session.title,
      agentType: session.agentName || session.executable,
      entry,
      state: rowState,
      rowSource: 'live',
      startedAt,
      tab: {
        id: session.id,
        ptyId: null,
        worktreeId: session.project_path,
        title: session.title,
        customTitle: null,
        color: null,
        sortOrder: Number.MAX_SAFE_INTEGER,
        createdAt: startedAt,
        sessionId: session.id
      },
      sessionId: session.id,
      isLive: true,
      isRetained: false,
      isChild: false,
      unread: unreadForThread({
        paneKey: session.id,
        rowState,
        isRetained: false,
        latestTimestamp,
        storeState: input.state
      }),
      updatedAt: entry.updatedAt,
      latestTimestamp
    })
  }
  return threads
}

export function buildAgentsThreads(input: AgentsThreadInput): AgentsThread[] {
  const sessionsById = new Map(input.sessions.map((session) => [session.id, session] as const))
  const worktreePaths = new Set<string>()
  for (const path of Object.keys(input.state.tabsByWorktree ?? {})) {
    worktreePaths.add(path)
  }
  for (const retained of Object.values(input.state.retainedAgentsByPaneKey ?? {})) {
    worktreePaths.add(retained.worktreeId)
  }
  for (const session of input.sessions) {
    if (session.project_path) {
      worktreePaths.add(session.project_path)
    }
  }

  const threads: AgentsThread[] = []
  const coveredPaneKeys = new Set<string>()
  const coveredSessionIds = new Set<string>()
  for (const path of worktreePaths) {
    for (const thread of buildWorktreeThreads(input, path, sessionsById)) {
      threads.push(thread)
      coveredPaneKeys.add(thread.paneKey)
      if (thread.sessionId) {
        coveredSessionIds.add(thread.sessionId)
      }
    }
  }
  threads.push(...buildHeadlessThreads(input, coveredPaneKeys, coveredSessionIds))

  // Why: cleared completed threads stop rendering until their next turn.
  return threads.filter(
    (thread) =>
      !(thread.state === 'done' || thread.isRetained) ||
      thread.latestTimestamp > (input.state.activityClearedAtByPaneKey?.[thread.paneKey] ?? 0)
  )
}

export type AgentsThreadFilters = {
  query: string
  readFilter: 'all' | 'unread'
  groupBy: AgentsGroupBy
  showChildAgents: boolean
}

export function filterAgentsThreads(
  threads: readonly AgentsThread[],
  filters: AgentsThreadFilters
): AgentsThread[] {
  const query = filters.query.trim().toLowerCase()
  return threads.filter((thread) => {
    if (!filters.showChildAgents && thread.isChild) {
      return false
    }
    if (filters.readFilter === 'unread' && !thread.unread) {
      return false
    }
    if (!query) {
      return true
    }
    return (
      thread.title.toLowerCase().includes(query) ||
      thread.agentType.toLowerCase().includes(query) ||
      thread.branch.toLowerCase().includes(query) ||
      thread.projectName.toLowerCase().includes(query)
    )
  })
}

export type AgentsThreadGroup = {
  key: string
  label: string
  state?: AgentRowState
  threads: AgentsThread[]
}

export function groupAgentsThreads(
  threads: readonly AgentsThread[],
  groupBy: AgentsGroupBy
): AgentsThreadGroup[] {
  const groups = new Map<string, AgentsThreadGroup>()
  for (const thread of threads) {
    const isProject = groupBy === 'project'
    const key = isProject ? thread.projectPath : thread.state
    let group = groups.get(key)
    if (!group) {
      group = {
        key,
        label: isProject ? thread.projectName : thread.state,
        ...(isProject ? {} : { state: thread.state }),
        threads: []
      }
      groups.set(key, group)
    }
    group.threads.push(thread)
  }

  const ordered = [...groups.values()]
  if (groupBy === 'project') {
    ordered.sort((a, b) => a.label.localeCompare(b.label))
  } else {
    ordered.sort(
      (a, b) => (STATE_ORDER[a.key] ?? 9) - (STATE_ORDER[b.key] ?? 9)
    )
  }
  for (const group of ordered) {
    group.threads.sort(
      (a, b) =>
        (STATE_ORDER[a.state] ?? 9) - (STATE_ORDER[b.state] ?? 9) ||
        b.updatedAt - a.updatedAt ||
        a.paneKey.localeCompare(b.paneKey)
    )
  }
  return ordered
}

export type ClearCompletedPatch = {
  cutoffs: Record<string, number>
  retainedPaneKeys: string[]
}

/** Orca `planClearCompletedActivity`: completed/interrupted rows only; retained snapshots
 *  are dismissed, live completions get a cleared-at cutoff so they stay hidden until the
 *  next turn. */
export function planClearCompletedThreads(
  threads: readonly AgentsThread[],
  state: AgentsThreadState,
  now: number = Date.now()
): ClearCompletedPatch {
  const cutoffs: Record<string, number> = {}
  const retainedPaneKeys: string[] = []
  for (const thread of threads) {
    if (thread.state !== 'done' && !thread.isRetained) {
      continue
    }
    const previous = state.activityClearedAtByPaneKey?.[thread.paneKey] ?? null
    const latest = Math.max(previous ?? 0, thread.latestTimestamp)
    cutoffs[thread.paneKey] = latest > 0 ? latest : now
    if (state.retainedAgentsByPaneKey?.[thread.paneKey]) {
      retainedPaneKeys.push(thread.paneKey)
    }
  }
  return { cutoffs, retainedPaneKeys }
}
