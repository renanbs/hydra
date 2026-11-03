// Parity guard for the D05 row pipeline (Orca components/sidebar/worktree-agent-rows.ts).
// Proves the behaviours the gap audit listed: retained rows are fixed done, subagent
// children get NUL keys + parent activation, title rows carry the fixed authority and a
// zero start, orphan entries synthesize a fallback tab, decay splits on live PTY, and the
// final order is deterministic.
import { describe, expect, it } from 'vitest'
import { buildWorktreeAgentRows } from './worktree-agent-rows'
import { compareWorktreeAgentRows } from './worktree-agent-row-order'
import { TITLE_DERIVED_AGENT_ROW_AUTHORITY_ID } from './worktree-title-derived-agent-rows'
import type { AgentStatusEntry } from '../../shared/agent-status-types'
import type { TerminalLayoutSnapshot, TerminalTab } from '../../shared/terminal-tab-types'
import type { RetainedAgentEntry } from '../../store/slices/agent-status-contract'

const NOW = 1_700_000_000_000
const TAB_ID = 'tab-1'
const LEAF = '11111111-1111-4111-8111-111111111111'
const LEAF_2 = '22222222-2222-4222-8222-222222222222'
const PANE = `${TAB_ID}:${LEAF}`

function tab(overrides: Partial<TerminalTab> = {}): TerminalTab {
  return {
    id: TAB_ID,
    ptyId: 'pty-1',
    worktreeId: '/repo/wt',
    title: 'Terminal',
    customTitle: null,
    color: null,
    sortOrder: 3,
    createdAt: NOW - 10_000,
    ...overrides
  }
}

function entry(overrides: Partial<AgentStatusEntry> = {}): AgentStatusEntry {
  return {
    state: 'working',
    prompt: 'Fix it',
    updatedAt: NOW,
    stateStartedAt: NOW - 5_000,
    paneKey: PANE,
    stateHistory: [],
    ...overrides
  }
}

function layout(): TerminalLayoutSnapshot {
  return {
    root: { type: 'leaf', leafId: LEAF },
    activeLeafId: LEAF,
    expandedLeafId: null
  }
}

function baseArgs(overrides: Partial<Parameters<typeof buildWorktreeAgentRows>[0]> = {}) {
  return {
    tabs: [tab()],
    entries: [] as AgentStatusEntry[],
    retained: [] as RetainedAgentEntry[],
    ptyIdsByTabId: { [TAB_ID]: ['pty-1'] },
    terminalLayoutsByTabId: { [TAB_ID]: layout() },
    now: NOW,
    ...overrides
  }
}

describe('buildWorktreeAgentRows (D05-005/006/019/020)', () => {
  it('keeps retained snapshots fixed at done and preserves their original start', () => {
    const retained: RetainedAgentEntry = {
      entry: entry({ state: 'working', paneKey: `${TAB_ID}:${LEAF_2}` }),
      worktreeId: '/repo/wt',
      tab: tab({ id: 'tab-closed' }),
      agentType: 'claude',
      startedAt: 1234
    }
    const rows = buildWorktreeAgentRows(baseArgs({ retained: [retained], ptyIdsByTabId: {} }))
    expect(rows).toHaveLength(1)
    expect(rows[0].rowSource).toBe('retained')
    expect(rows[0].state).toBe('done')
    expect(rows[0].startedAt).toBe(1234)
  })

  it('synthesizes a fallback tab for an attributed entry whose tab is absent', () => {
    const rows = buildWorktreeAgentRows(
      baseArgs({
        tabs: [],
        entries: [
          entry({
            worktreeId: '/repo/wt',
            terminalTitle: 'Agent worker',
            stateStartedAt: 999,
            stateHistory: [{ state: 'working', prompt: 'p', startedAt: 500 }]
          })
        ]
      })
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].tab.id).toBe(TAB_ID)
    expect(rows[0].tab.ptyId).toBeNull()
    expect(rows[0].tab.sortOrder).toBe(Number.MAX_SAFE_INTEGER)
    expect(rows[0].startedAt).toBe(500)
    expect(rows[0].tab.createdAt).toBe(500)
  })

  it('derives deterministic order by start, tab order, created time, then pane key', () => {
    const a = { paneKey: 'b', startedAt: 1, tab: tab({ sortOrder: 0, createdAt: 0 }) }
    const b = { paneKey: 'a', startedAt: 1, tab: tab({ sortOrder: 0, createdAt: 0 }) }
    const c = { paneKey: 'c', startedAt: 1, tab: tab({ sortOrder: 0, createdAt: 1 }) }
    const ordered = [c, a, b].sort(compareWorktreeAgentRows)
    expect(ordered.map((row) => row.paneKey)).toEqual(['a', 'b', 'c'])
  })
})

describe('decay and subagent rows (D05-007/010)', () => {
  it('decays stale working to unverifiable with a live PTY and idle without one', () => {
    const stale = entry({ updatedAt: NOW - 31 * 60 * 1000 })
    const withPty = buildWorktreeAgentRows(baseArgs({ entries: [stale] }))
    expect(withPty[0].state).toBe('unverifiable')

    const withoutPty = buildWorktreeAgentRows(
      baseArgs({ entries: [stale], ptyIdsByTabId: {} })
    )
    expect(withoutPty[0].state).toBe('idle')
  })

  it('keeps done terminal even past the stale window', () => {
    const done = entry({ state: 'done', updatedAt: NOW - 31 * 60 * 1000 })
    const rows = buildWorktreeAgentRows(baseArgs({ entries: [done] }))
    expect(rows[0].state).toBe('done')
  })

  it('builds NUL-keyed child rows that activate the parent and inherit its staleness', () => {
    const parent = entry({
      subagents: [{ id: 's1', description: 'pr-reviewer', state: 'working', startedAt: 42 }]
    })
    const fresh = buildWorktreeAgentRows(baseArgs({ entries: [parent] }))
    const freshChild = fresh.find((row) => row.rowSource === 'subagent')
    expect(freshChild?.paneKey).toBe(`${PANE}\u0000subagent:s1`)
    expect(freshChild?.activationPaneKey).toBe(PANE)
    expect(freshChild?.state).toBe('working')

    const staleChild = buildWorktreeAgentRows(
      baseArgs({
        entries: [{ ...parent, updatedAt: NOW - 31 * 60 * 1000 }],
        ptyIdsByTabId: {}
      })
    ).find((row) => row.rowSource === 'subagent')
    expect(staleChild?.state).toBe('unverifiable')
  })
})

describe('title-derived rows (D05-008)', () => {
  it('projects a live title into a fixed-authority row with a zero start', () => {
    const rows = buildWorktreeAgentRows(
      baseArgs({
        entries: [],
        tabs: [tab({ title: '✳ Claude Code' })]
      })
    )
    const row = rows.find((candidate) => candidate.entry.observation?.origin === 'title')
    expect(row).toBeDefined()
    expect(row?.startedAt).toBe(0)
    expect(row?.entry.observation?.authorityId).toBe(TITLE_DERIVED_AGENT_ROW_AUTHORITY_ID)
    expect(row?.paneKey).toBe(PANE)
    expect(row?.tab.id).toBe(TAB_ID)
  })

  it('maps a permission title to waiting', () => {
    const rows = buildWorktreeAgentRows(
      baseArgs({
        tabs: [tab({ title: 'Claude Code needs permission to edit' })]
      })
    )
    const row = rows.find((candidate) => candidate.entry.observation?.origin === 'title')
    expect(row?.state).toBe('waiting')
  })
})
