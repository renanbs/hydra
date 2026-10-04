// Parity guard for the Orca port of `smart-attention.ts`.
//
// Before the port this module exported `null` for `IDLE`, `buildAttentionByWorktree` and
// `hasFreshAttributedAgentStatus`, so `smart-sort.ts` threw a TypeError on every cold/warm smart
// sort (docs/audits/orca-sidebar-parity/domains/D09-filters-sort.gaps.md:42-45). These specs pin
// the ported behaviour: the symbols are real functions, and they resolve the same classes Orca does.
import { describe, expect, it } from 'vitest'
import {
  AGENT_STATUS_STALE_AFTER_MS,
  type AgentStatusEntry
} from '../../shared/agent-status-types'
import type { Worktree } from '../../shared/worktree/types'
import {
  IDLE,
  buildAttentionByWorktree,
  buildExplicitEntriesByTabId,
  hasFreshAttributedAgentStatus
} from './smart-attention'
import { sortWorktreesSmart } from './smart-sort'

const NOW = new Date('2026-10-03T12:00:00.000Z').getTime()
const LEAF_1 = '11111111-1111-4111-8111-111111111111'

function makeEntry(overrides: Partial<AgentStatusEntry> & { paneKey: string }): AgentStatusEntry {
  return {
    state: 'working',
    prompt: '',
    updatedAt: NOW - 30_000,
    stateStartedAt: NOW - 30_000,
    stateHistory: [],
    ...overrides
  }
}

function makeWorktree(id: string, sortOrder: number, lastActivityAt: number): Worktree {
  return {
    id,
    repoId: 'repo-1',
    path: `/tmp/${id}`,
    head: 'abc123',
    branch: `refs/heads/${id}`,
    isBare: false,
    isMainWorktree: false,
    displayName: id,
    comment: '',
    linkedIssue: null,
    linkedPR: null,
    linkedLinearIssue: null,
    isArchived: false,
    isUnread: false,
    isPinned: false,
    sortOrder,
    lastActivityAt
  }
}

describe('sortWorktreesSmart (regression: stub TypeError)', () => {
  it('sorts cold with no agent status and no live PTY without throwing', () => {
    const a = makeWorktree('wt-a', 1, 100)
    const b = makeWorktree('wt-b', 2, 200)
    const tabsByWorktree = {
      'wt-a': [{ id: 'tab-a', title: 'Terminal 1' }],
      'wt-b': [{ id: 'tab-b', title: 'Terminal 2' }]
    }

    // `agentStatusByPaneKey: {}` used to reach `hasFreshAttributedAgentStatus === null` here.
    const sorted = sortWorktreesSmart([a, b], tabsByWorktree, new Map(), {}, {}, {})

    // Cold start is deterministic: persisted sortOrder descending.
    expect(sorted.map((worktree) => worktree.id)).toEqual(['wt-b', 'wt-a'])
    expect(
      sortWorktreesSmart([a, b], tabsByWorktree, new Map(), {}, {}, {}).map((w) => w.id)
    ).toEqual(['wt-b', 'wt-a'])
  })

  it('sorts warm with a live PTY and no agent status without throwing', () => {
    const a = makeWorktree('wt-a', 1, 100)
    const b = makeWorktree('wt-b', 2, 200)
    const tabsByWorktree = {
      'wt-a': [{ id: 'tab-a', title: 'Terminal 1' }],
      'wt-b': [{ id: 'tab-b', title: 'Terminal 2' }]
    }

    // A live PTY takes the warm branch, which reaches `buildAttentionByWorktree` (null in the
    // stub) and the comparator's `IDLE` fallback for every all-idle worktree.
    const sorted = sortWorktreesSmart([a, b], tabsByWorktree, new Map(), {}, {}, { 'tab-a': ['pty-1'] })

    expect(sorted.map((worktree) => worktree.id)).toEqual(['wt-b', 'wt-a'])
  })
})

describe('hasFreshAttributedAgentStatus', () => {
  it('is false with no status rows at all', () => {
    expect(hasFreshAttributedAgentStatus({}, NOW, {})).toBe(false)
  })

  it('is true for a fresh row stamped with its worktree', () => {
    const entry = makeEntry({
      paneKey: `tab-a:${LEAF_1}`,
      worktreeId: 'wt-a',
      updatedAt: NOW - 60_000,
      stateStartedAt: NOW - 60_000
    })

    expect(hasFreshAttributedAgentStatus({ [entry.paneKey]: entry }, NOW, {})).toBe(true)
  })

  it('is true for a fresh unstamped row mapping to a mirrored tab', () => {
    const entry = makeEntry({
      paneKey: `tab-a:${LEAF_1}`,
      updatedAt: NOW - 60_000,
      stateStartedAt: NOW - 60_000
    })

    expect(
      hasFreshAttributedAgentStatus({ [entry.paneKey]: entry }, NOW, {
        'wt-a': [{ id: 'tab-a', title: 'Terminal 1' }]
      })
    ).toBe(true)
  })

  it('is false once the row is older than the 30 min stale window', () => {
    const entry = makeEntry({
      paneKey: `tab-a:${LEAF_1}`,
      worktreeId: 'wt-a',
      updatedAt: NOW - AGENT_STATUS_STALE_AFTER_MS - 1,
      stateStartedAt: NOW - AGENT_STATUS_STALE_AFTER_MS - 1
    })

    expect(hasFreshAttributedAgentStatus({ [entry.paneKey]: entry }, NOW, {})).toBe(false)
  })
})

describe('buildAttentionByWorktree', () => {
  it('keys the map by worktree id and resolves a fresh blocked row as Class 1', () => {
    const worktree = makeWorktree('wt-a', 0, 0)
    const paneKeyValue = `tab-a:${LEAF_1}`
    const entry = makeEntry({
      paneKey: paneKeyValue,
      worktreeId: 'wt-a',
      tabId: 'tab-a',
      state: 'blocked',
      stateStartedAt: NOW - 5_000,
      updatedAt: NOW - 1_000
    })

    const attention = buildAttentionByWorktree([worktree], {}, { [paneKeyValue]: entry }, {}, {}, NOW)

    expect([...attention.keys()]).toEqual(['wt-a'])
    expect(attention.get('wt-a')).toEqual({
      cls: 1,
      attentionTimestamp: NOW - 5_000,
      cause: 'blocked'
    })
  })

  it('resolves IDLE for a worktree with no tabs and no attributed rows', () => {
    const attention = buildAttentionByWorktree([makeWorktree('wt-a', 0, 0)], {}, {}, {}, {}, NOW)

    expect(attention.get('wt-a')).toEqual(IDLE)
  })

  it('indexes status rows by the paneKey tab id', () => {
    const paneKeyValue = `tab-a:${LEAF_1}`
    const entry = makeEntry({ paneKey: paneKeyValue })

    const byTab = buildExplicitEntriesByTabId({ [paneKeyValue]: entry })

    expect([...byTab.keys()]).toEqual(['tab-a'])
    expect(byTab.get('tab-a')).toEqual([entry])
  })
})

describe('smart-attention port guard', () => {
  it('exports functions instead of the null stub', () => {
    expect(typeof buildAttentionByWorktree).toBe('function')
    expect(typeof hasFreshAttributedAgentStatus).toBe('function')
    expect(IDLE).toEqual({ cls: 5, attentionTimestamp: 0 })
  })
})
