// Parity guard for D05-013: the cached per-worktree activity summary separates
// permission/working/monitoring/interrupted/live-done/retained-done, records stale
// pane ids, and reuses equal summaries across epoch advances.
import { describe, expect, it } from 'vitest'
import { selectWorktreeAgentActivitySummary } from './worktree-agent-activity-summary'
import type { AgentStatusEntry, AgentStatusState } from '../../shared/agent-status-types'

const NOW = Date.now()
const WT = '/repo/wt'
const TAB = 'tab-1'
const LEAF = '11111111-1111-4111-8111-111111111111'
const PANE = `${TAB}:${LEAF}`

function entry(overrides: Partial<AgentStatusEntry> = {}): AgentStatusEntry {
  return {
    state: 'working',
    prompt: 'p',
    updatedAt: NOW,
    stateStartedAt: NOW,
    paneKey: PANE,
    stateHistory: [],
    ...overrides
  }
}

function state(entries: Record<string, AgentStatusEntry>, epoch = 1) {
  return {
    agentStatusEpoch: epoch,
    agentStatusByPaneKey: entries,
    migrationUnsupportedByPtyId: {},
    retainedAgentsByPaneKey: {},
    runtimeAgentOrchestrationByPaneKey: {},
    tabsByWorktree: { [WT]: [{ id: TAB }] }
  }
}

describe('selectWorktreeAgentActivitySummary (D05-013)', () => {
  it('separates permission, working, monitoring, interrupted and done flags', () => {
    const blocked = entry({ state: 'blocked' })
    const working = entry({ state: 'working' })
    const monitoring = entry({ state: 'working', workingMode: 'monitoring' })
    const interrupted = entry({ state: 'done', interrupted: true })
    const done = entry({ state: 'done' })

    expect(
      selectWorktreeAgentActivitySummary(state({ [PANE]: blocked }), WT).hasPermission
    ).toBe(true)
    expect(
      selectWorktreeAgentActivitySummary(state({ [PANE]: working }), WT).hasLiveWorking
    ).toBe(true)
    expect(
      selectWorktreeAgentActivitySummary(state({ [PANE]: monitoring }), WT).hasLiveMonitoring
    ).toBe(true)
    expect(
      selectWorktreeAgentActivitySummary(state({ [PANE]: interrupted }), WT).hasInterrupted
    ).toBe(true)
    expect(selectWorktreeAgentActivitySummary(state({ [PANE]: done }), WT).hasLiveDone).toBe(true)
  })

  it('records stale pane ids without dropping the row identity', () => {
    const stale = entry({ state: 'working' as AgentStatusState, updatedAt: NOW - 31 * 60 * 1000 })
    const summary = selectWorktreeAgentActivitySummary(state({ [PANE]: stale }, 2), WT)
    expect(summary.stalePaneIdsByTabId[TAB]?.has(LEAF)).toBe(true)
    expect(summary.agentStatusPaneIdsByTabId[TAB]).toBeUndefined()
    expect(summary.hasLiveWorking).toBe(false)
  })

  it('reuses the same summary objects for the same epoch and for equal rebuilds', () => {
    const input = state({ [PANE]: entry() }, 3)
    const first = selectWorktreeAgentActivitySummary(input, WT)
    const second = selectWorktreeAgentActivitySummary(input, WT)
    expect(second).toBe(first)

    const nextEpoch = state({ [PANE]: entry() }, 4)
    const third = selectWorktreeAgentActivitySummary(nextEpoch, WT)
    expect(third).toBe(first)
  })
})
