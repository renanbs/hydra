// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/dashboard/useDashboardData.ts (DashboardAgentRow)
//
// Hydra's sidebar builds rows from the canonical shared agent-status model instead
// of the legacy components/sidebar/agent-status-types.ts duplicate, so every row
// carries the same hook fields (stateHistory, subagents, orchestration) the store
// actually writes.
import type { AgentRowState } from '../../lib/agent-row-decay-state'
import type { AgentStatusEntry, AgentType } from '../../shared/agent-status-types'
import type { TerminalTab } from '../../shared/terminal-tab-types'

/** Workbench tabs also carry their backing session id at runtime (TabItem), which the
 *  sidebar uses to reveal the agent's panel; the shared tab type does not declare it. */
export type WorktreeAgentTab = TerminalTab & { sessionId?: string }

/** What the store actually holds: `tabsByWorktree` is typed as workbench `TabItem[]`,
 *  while terminal tabs are created with the full `TerminalTab` record. Every field the
 *  row pipeline reads is optional here and normalized once in `toWorktreeAgentTab`. */
export type WorktreeAgentTabInput = {
  id: string
  title?: string
  sessionId?: string
  ptyId?: string | null
  worktreeId?: string
  customTitle?: string | null
  color?: string | null
  sortOrder?: number
  createdAt?: number
  launchAgent?: TerminalTab['launchAgent']
}

export function toWorktreeAgentTab(tab: WorktreeAgentTabInput): WorktreeAgentTab {
  return {
    id: tab.id,
    ptyId: tab.ptyId ?? null,
    worktreeId: tab.worktreeId ?? '',
    title: tab.title ?? '',
    customTitle: tab.customTitle ?? null,
    color: tab.color ?? null,
    sortOrder: tab.sortOrder ?? 0,
    createdAt: tab.createdAt ?? 0,
    launchAgent: tab.launchAgent,
    sessionId: tab.sessionId
  }
}

export type WorktreeAgentRowSource = 'live' | 'retained' | 'subagent'

/** Ported row shape. `startedAt: 0` is load-bearing for title-derived rows — see
 *  `buildTitleDerivedAgentRow` — so consumers must not substitute a clock there. */
export type WorktreeAgentRow = {
  paneKey: string
  entry: AgentStatusEntry
  tab: WorktreeAgentTab
  agentType: AgentType
  rowSource: WorktreeAgentRowSource
  state: AgentRowState
  startedAt: number
  /** In-process subagent children have no pane of their own; activation targets the parent. */
  activationPaneKey?: string
  /** Hydra workbench session backing the row's tab. The shell's reveal handler is
   *  session-based, so a row without one is listed but inert (its pane is gone). */
  sessionId?: string
}

export type AgentRowLineagePresentation = {
  depth: 0 | 1
  parentPaneKey?: string
  isFirstSibling: boolean
  isLastSibling: boolean
  childCount: number
}

export type WorktreeAgentRowWithLineage = WorktreeAgentRow & {
  lineage: AgentRowLineagePresentation
}

/** Runtime workbench tabs carry their backing session id, which the shared tab type
 *  does not declare; the cast is the single place that reads it. */
export function worktreeAgentTabSessionId(tab: TerminalTab): string | undefined {
  return (tab as WorktreeAgentTab).sessionId
}
