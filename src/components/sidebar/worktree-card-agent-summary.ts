// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/worktree-card-agent-summary.ts
import type { AgentDotState } from '../AgentStateDot'
import { formatAgentTypeLabel } from '../../shared/agent-type-label'
import { normalizeAgentId } from '../workbench/tab-agent'
import type { AgentRowState } from '../../lib/agent-row-decay-state'
import type { AgentStatusEntry, AgentType } from '../../shared/agent-status-types'
import { agentRowDotState } from '../../lib/agent-row-dot-state'
import type {
  AgentRowLineagePresentation,
  WorktreeAgentRowSource,
  WorktreeAgentTab
} from './worktree-agent-row-types'

/**
 * UI row shape. Built from the canonical `WorktreeAgentRow` pipeline but kept
 * structurally permissive because Orca-derived row components also accept
 * synthetic rows (and their tests construct minimal fixtures).
 */
export interface AgentRow {
  paneKey: string
  entry: AgentStatusEntry
  agentType?: AgentType
  tab?: WorktreeAgentTab
  rowSource?: WorktreeAgentRowSource
  /** Legacy alias for `state`, read by summary grouping. */
  status?: AgentRowState
  state?: AgentRowState
  startedAt?: number
  prompt?: string
  /** Ported identifier: from session or custom rendering info */
  subjectLabel?: string
  /** Displayed icon tag (claude, omp, pi, etc.) */
  displayAgent?: string
  /** Original tool run command or custom title */
  terminalTitle?: string
  isDerivedFromTitle?: boolean
  /** Hydra session backing this row; absent means the pane is gone (inert row). */
  sessionId?: string
  activationPaneKey?: string
  childAgentCount?: number
  childAgentsExpanded?: boolean
  onToggleChildAgents?: () => void
  lineage?: AgentRowLineagePresentation
}

/** Port of Orca shared/comparable-agent-rows priority table */
export function agentStatusOrder(state?: AgentRowState | 'unknown'): number {
  switch (state) {
    case 'blocked':
    case 'waiting':
      return 0
    case 'working':
      return 1
    case 'idle':
      return 2
    case 'done':
      return 3
    default:
      return 4
  }
}

/**
 * Orca `SUMMARY_STATE_ORDER`: reporting states first, then the two that mean
 * "we cannot tell", with true idle last. The dots read top-to-bottom as urgency.
 */
export const SUMMARY_STATE_ORDER: AgentDotState[] = [
  'waiting',
  'blocked',
  'working',
  'monitoring',
  'interrupted',
  'done',
  // Why: below every reporting state, above true idle — the pane is still held.
  'unverifiable',
  'idle'
]

/** Orca `getAgentDotState`: an interrupt wins, otherwise the state (+ monitoring). */
export function getSummaryAgentDotState(agent: AgentRow): AgentDotState {
  if (agent.entry.interrupted === true) {
    return 'interrupted'
  }
  return agentRowDotState((agent.status ?? agent.state ?? agent.entry.state) as AgentRowState, agent.entry.workingMode)
}

/** Orca `formatSummaryStateLabel`: the sentence fragment a state contributes. */
export function formatSummaryStateLabel(state: AgentDotState): string {
  switch (state) {
    case 'waiting':
      return 'waiting'
    case 'blocked':
      return 'blocked'
    case 'interrupted':
      return 'interrupted'
    case 'failed':
      return 'failed'
    case 'working':
      return 'working'
    case 'monitoring':
      return 'monitoring'
    case 'done':
      return 'done'
    case 'idle':
      return 'idle'
    case 'unverifiable':
      return 'not reporting'
    case 'permission':
      return 'needs attention'
  }
}

export interface SummaryAgentGroup {
  state: AgentDotState
  agents: AgentRow[]
}

export function buildSummaryAgentGroups(agents: AgentRow[]): SummaryAgentGroup[] {
  const groups = new Map<AgentDotState, AgentRow[]>()
  for (const agent of agents) {
    const dotState = getSummaryAgentDotState(agent)
    const group = groups.get(dotState)
    if (group) {
      group.push(agent)
    } else {
      groups.set(dotState, [agent])
    }
  }
  return SUMMARY_STATE_ORDER.flatMap((state) => {
    const groupAgents = groups.get(state)
    return groupAgents ? [{ state, agents: groupAgents }] : []
  })
}

/**
 * The sentence the collapsed summary announces, e.g. `All 3 agents working` or
 * `3 agents: 2 working, 1 blocked`.
 */
export function summarizeAgents(agents: AgentRow[], subjectLabel: string): string {
  const counts = new Map<AgentDotState, number>()
  for (const agent of agents) {
    const dotState = getSummaryAgentDotState(agent)
    counts.set(dotState, (counts.get(dotState) ?? 0) + 1)
  }
  const parts = SUMMARY_STATE_ORDER.flatMap((state) => {
    const count = counts.get(state) ?? 0
    if (count === 0) {
      return []
    }
    return `${count} ${formatSummaryStateLabel(state)}`
  })
  if (parts.length === 1) {
    const onlyStatusLabel = parts[0].replace(/^\d+\s+/, '')
    return agents.length === 1
      ? `${subjectLabel} ${onlyStatusLabel}`
      : `All ${subjectLabel} ${onlyStatusLabel}`
  }
  return `${subjectLabel}: ${parts.join(', ')}`
}

/** Orca `summarizeAgentIdentities`: one `Claude working` clause per agent. */
export function summarizeAgentIdentities(agents: AgentRow[]): string {
  return agents
    .map((agent) => {
      const agentLabel = formatAgentTypeLabel(agent.agentType)
      const stateLabel = formatSummaryStateLabel(getSummaryAgentDotState(agent))
      return `${agentLabel} ${stateLabel}`
    })
    .join('; ')
}

/** Orca `selectSummaryGroupIconAgents`: one icon per agent type, most common first. */
export function selectSummaryGroupIconAgents(agents: AgentRow[], maxCount: number): AgentRow[] {
  const groups = new Map<string, { agents: AgentRow[]; firstIndex: number }>()
  agents.forEach((agent, index) => {
    const key = normalizeAgentId(agent.agentType ?? agent.displayAgent)
    const group = groups.get(key)
    if (group) {
      group.agents.push(agent)
    } else {
      groups.set(key, { agents: [agent], firstIndex: index })
    }
  })
  const sortedGroups = [...groups.values()].sort(
    (a, b) => b.agents.length - a.agents.length || a.firstIndex - b.firstIndex
  )
  const selected: AgentRow[] = []
  for (const group of sortedGroups) {
    if (selected.length >= maxCount) {
      break
    }
    selected.push(group.agents[0])
  }
  return selected
}
