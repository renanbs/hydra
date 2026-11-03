// Parity guard for the Agents thread model (D05-001/003/004 semantics):
// closed panes stay listed but inert, read state drives the read filter, child rows
// follow agentsShowChildAgents, grouping is shell-owned, and clear-completed plans
// only touch finished threads.
import { describe, expect, it } from 'vitest'
import {
  buildAgentsThreads,
  filterAgentsThreads,
  groupAgentsThreads,
  planClearCompletedThreads,
  type AgentsThreadState
} from './agents-thread-model'
import type { WorktreeSession } from './types'
import type { AgentStatusEntry } from '../../shared/agent-status-types'
import type { TerminalLayoutSnapshot } from '../../shared/terminal-tab-types'

const NOW = 1_700_000_000_000
const TAB_ID = 'tab-live'
const LEAF = '11111111-1111-4111-8111-111111111111'
const CLOSED_LEAF = '22222222-2222-4222-8222-222222222222'
const PANE = `${TAB_ID}:${LEAF}`
const CLOSED_TAB_ID = 'tab-closed'
const CLOSED_PANE = `${CLOSED_TAB_ID}:${CLOSED_LEAF}`

function layout(): TerminalLayoutSnapshot {
  return { root: { type: 'leaf', leafId: LEAF }, activeLeafId: LEAF, expandedLeafId: null }
}

function entry(overrides: Partial<AgentStatusEntry> = {}): AgentStatusEntry {
  return {
    state: 'working',
    prompt: 'Fix the parser',
    updatedAt: NOW,
    stateStartedAt: NOW - 1_000,
    paneKey: PANE,
    stateHistory: [],
    ...overrides
  }
}

function session(overrides: Partial<WorktreeSession> = {}): WorktreeSession {
  return {
    id: 'sess-live',
    project_path: '/repo/wt',
    title: 'Live agent',
    branch: 'feat/x',
    state: 'working',
    active: true,
    agentName: 'claude',
    executable: 'claude',
    created_at: NOW - 5_000,
    updated_at: NOW,
    ...overrides
  }
}

function state(overrides: Partial<AgentsThreadState> = {}): AgentsThreadState {
  return {
    tabsByWorktree: {
      '/repo/wt': [
        {
          id: TAB_ID,
          title: 'Fix the parser',
          sessionId: 'sess-live',
          sortOrder: 0,
          createdAt: NOW - 10_000
        }
      ]
    },
    agentStatusByPaneKey: { [PANE]: entry() },
    retainedAgentsByPaneKey: {
      [CLOSED_PANE]: {
        entry: entry({ paneKey: CLOSED_PANE, state: 'done', prompt: 'Closed task' }),
        worktreeId: '/repo/wt',
        tab: {
          id: CLOSED_TAB_ID,
          ptyId: null,
          worktreeId: '/repo/wt',
          title: 'Closed task',
          customTitle: null,
          color: null,
          sortOrder: 1,
          createdAt: NOW - 20_000
        },
        agentType: 'claude',
        startedAt: NOW - 20_000
      }
    },
    migrationUnsupportedByPtyId: {},
    terminalLayoutsByTabId: { [TAB_ID]: layout() },
    ptyIdsByTabId: { [TAB_ID]: ['pty'] },
    runtimeAgentOrchestrationByPaneKey: {},
    acknowledgedAgentsByPaneKey: {},
    unreadTerminalPanes: {},
    unreadAgentCompletionPanes: {},
    manuallyUnreadTurnsByPaneKey: {},
    activityClearedAtByPaneKey: {},
    ...overrides
  }
}

const PROJECTS = [{ name: 'wt', path: '/repo/wt' }]

describe('buildAgentsThreads (D05-001/003)', () => {
  it('keeps a closed retained pane listed but inert and marks the live row live', () => {
    const threads = buildAgentsThreads({
      state: state(),
      sessions: [session()],
      projects: PROJECTS,
      now: NOW
    })
    const live = threads.find((thread) => thread.paneKey === PANE)
    const closed = threads.find((thread) => thread.paneKey === CLOSED_PANE)
    expect(live?.isLive).toBe(true)
    expect(live?.sessionId).toBe('sess-live')
    expect(closed).toBeDefined()
    expect(closed?.isLive).toBe(false)
    expect(closed?.sessionId).toBeUndefined()
    expect(closed?.isRetained).toBe(true)
    expect(closed?.projectName).toBe('wt')
  })

  it('marks retained completions unread until acknowledged', () => {
    const threads = buildAgentsThreads({
      state: state(),
      sessions: [session()],
      projects: PROJECTS,
      now: NOW
    })
    const closed = threads.find((thread) => thread.paneKey === CLOSED_PANE)
    expect(closed?.unread).toBe(true)

    const acknowledged = buildAgentsThreads({
      state: state({ acknowledgedAgentsByPaneKey: { [CLOSED_PANE]: NOW } }),
      sessions: [session()],
      projects: PROJECTS,
      now: NOW
    }).find((thread) => thread.paneKey === CLOSED_PANE)
    expect(acknowledged?.unread).toBe(false)
  })

  it('hides completed threads below their cleared-at cutoff', () => {
    const threads = buildAgentsThreads({
      state: state({ activityClearedAtByPaneKey: { [CLOSED_PANE]: NOW } }),
      sessions: [session()],
      projects: PROJECTS,
      now: NOW
    })
    expect(threads.some((thread) => thread.paneKey === CLOSED_PANE)).toBe(false)
  })
})

describe('filtering and grouping (D05-001/004)', () => {
  const threads = () =>
    buildAgentsThreads({ state: state(), sessions: [session()], projects: PROJECTS, now: NOW })

  it('filters unread-only and query text', () => {
    const all = threads()
    expect(filterAgentsThreads(all, { query: '', readFilter: 'all', groupBy: 'state', showChildAgents: true })).toHaveLength(2)
    expect(filterAgentsThreads(all, { query: '', readFilter: 'unread', groupBy: 'state', showChildAgents: true })).toHaveLength(1)
    expect(filterAgentsThreads(all, { query: 'closed', readFilter: 'all', groupBy: 'state', showChildAgents: true })).toHaveLength(1)
    // Both rows belong to the same worktree, so the branch matches both.
    expect(filterAgentsThreads(all, { query: 'feat/x', readFilter: 'all', groupBy: 'state', showChildAgents: true })).toHaveLength(2)
  })

  it('drops child rows when agentsShowChildAgents is off', () => {
    const parent = entry({
      subagents: [{ id: 'sub-1', description: 'reviewer', state: 'working', startedAt: NOW }]
    })
    const withChild = buildAgentsThreads({
      state: state({ agentStatusByPaneKey: { [PANE]: parent } }),
      sessions: [session()],
      projects: PROJECTS,
      now: NOW
    })
    expect(withChild.some((thread) => thread.isChild)).toBe(true)
    expect(
      filterAgentsThreads(withChild, {
        query: '',
        readFilter: 'all',
        groupBy: 'state',
        showChildAgents: false
      }).some((thread) => thread.isChild)
    ).toBe(false)
  })

  it('groups by state in attention order and by project alphabetically', () => {
    const byState = groupAgentsThreads(threads(), 'state')
    expect(byState.map((group) => group.label)).toEqual(['working', 'done'])
    const byProject = groupAgentsThreads(threads(), 'project')
    expect(byProject.map((group) => group.label)).toEqual(['wt'])
  })

  it('plans clear-completed cutoffs and retained dismissals for finished rows only', () => {
    const threadsInPlay = threads()
    const plan = planClearCompletedThreads(threadsInPlay, state(), NOW)
    expect(Object.keys(plan.cutoffs)).toEqual([CLOSED_PANE])
    expect(plan.retainedPaneKeys).toEqual([CLOSED_PANE])
  })
})
