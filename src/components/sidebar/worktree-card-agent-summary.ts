import { normalizeAgentId } from '../workbench/tab-agent'
import type { AgentStatusEntry } from '../../store/agent-status-types'

export interface AgentRow {
  paneKey: string
  agentType?: string
  entry: AgentStatusEntry
  rowSource?: 'live' | 'retained' | 'subagent' | 'session'
  status?: AgentStatusEntry['state']
  state?: AgentStatusEntry['state']
  startedAt?: number
  prompt?: string
  /** Ported identifier: from session or custom rendering info */
  subjectLabel?: string
  /** Displayed icon tag (claude, omp, pi, etc.) */
  displayAgent?: string
  /** Original tool run command or custom title */
  terminalTitle?: string
  isDerivedFromTitle?: boolean
  childAgentCount?: number
  childAgentsExpanded?: boolean
  onToggleChildAgents?: () => void
  lineage?: {
    depth: number
    isFirstSibling: boolean
    isLastSibling: boolean
    childCount: number
  }
}

/** Port of Orca shared/comparable-agent-rows priority table */
export function agentStatusOrder(state?: AgentStatusEntry['state']): number {
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

export function summarizeAgents(agents: AgentRow[]): {
  primaryStatus: AgentStatusEntry['state'] | null
  statusCounts: Record<string, number>
  consolidatedLabel: string
} {
  const statusCounts: Record<string, number> = {}
  let firstProxy: string | null = null

  let blockStop = 0
  let workingStop = 0
  let idleStop = 0
  let doneStop = 0

  for (const a of agents) {
    const st = a.status ?? a.state ?? 'unknown'
    statusCounts[st] = (statusCounts[st] ?? 0) + 1
    if (!firstProxy && a.agentType) firstProxy = a.agentType
    if (agentStatusOrder(st) === 0) blockStop++
    if (agentStatusOrder(st) === 1) workingStop++
    if (agentStatusOrder(st) === 2) idleStop++
    if (agentStatusOrder(st) === 3) doneStop++
  }

  let primaryStatus: AgentStatusEntry['state'] | null = null
  if (blockStop > 0) primaryStatus = 'blocked'
  else if (workingStop > 0) primaryStatus = 'working'
  else if (idleStop > 0) primaryStatus = 'idle'
  else if (doneStop > 0) primaryStatus = 'done'

  // fallback or pick the first seen status if none fit exact sets
  if (!primaryStatus) {
    primaryStatus = (Object.keys(statusCounts)[0] as AgentStatusEntry['state']) || 'unknown'
  }

  const statusLabels: string[] = []
  for (const [k, v] of Object.entries(statusCounts)) {
    if (v > 0) statusLabels.push(`${v} ${k}`)
  }

  const count = agents.length
  let consolidatedLabel = ''
  if (statusLabels.length === 0) {
    consolidatedLabel = 'No agents'
  } else if (statusLabels.length === 1) {
    consolidatedLabel = `${count} ${count === 1 ? 'agent' : 'agents'} ${statusLabels[0].replace(/^\d+\s+/, '')}`
  } else {
    consolidatedLabel = `${count} agents: ${statusLabels.join(', ')}`
  }

  return { primaryStatus, statusCounts, consolidatedLabel }
}

export function buildSummaryAgentGroups(agents: AgentRow[]): Array<{ status: AgentStatusEntry['state']; agents: AgentRow[] }> {
  const map = new Map<AgentStatusEntry['state'], AgentRow[]>()
  for (const a of agents) {
    const ws = a.status ?? a.state ?? 'unknown'
    if (!map.has(ws)) map.set(ws, [])
    map.get(ws)!.push(a)
  }
  
  return [...map.entries()]
    .sort(([a], [b]) => agentStatusOrder(a) - agentStatusOrder(b))
    .map(([status, agents]) => ({ status, agents }))
}

export function selectSummaryGroupIconAgents(agents: AgentRow[], maxCount = 3): AgentRow[] {
  const sorted = [...agents].sort((a, b) => {
    const aNorm = normalizeAgentId(a.agentType || a.displayAgent);
    const bNorm = normalizeAgentId(b.agentType || b.displayAgent);
    const aCount = agents.filter((x) => normalizeAgentId(x.agentType || x.displayAgent) === aNorm).length;
    const bCount = agents.filter((x) => normalizeAgentId(x.agentType || x.displayAgent) === bNorm).length;
    return bCount - aCount;
  });
  
  const out: AgentRow[] = [];
  const seenTypes = new Set<string>();
  for (const a of sorted) {
    const norm = normalizeAgentId(a.agentType || a.displayAgent);
    if (!seenTypes.has(norm)) {
      out.push(a);
      seenTypes.add(norm);
    }
    if (out.length >= maxCount) break;
  }
  return out;
}
