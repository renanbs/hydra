import { describe, expect, it } from 'vitest'
import { dashboardBucketForState } from './dashboard-bucket'
import {
  countAgentBuckets,
  countAgentThreadsByBucket,
  groupAgentThreadsByBucket,
  toAgentDashboardPopoutRows,
} from './agent-dashboard-groups'
import type { AgentsThread } from '../sidebar/agents-thread-model'
import { EMPTY_DASHBOARD_BUCKET_COUNTS } from '../../shared/dashboard-buckets'

function thread(overrides: Partial<AgentsThread> & { paneKey: string; state: AgentsThread['state'] }): AgentsThread {
  return {
    worktreePath: '/repo/a',
    projectPath: '/repo/a',
    projectName: 'repo',
    branch: 'main',
    title: `Agent ${overrides.paneKey}`,
    agentType: 'claude',
    rowSource: 'live',
    startedAt: 1,
    isLive: true,
    isRetained: false,
    isChild: false,
    unread: false,
    updatedAt: 10,
    latestTimestamp: 10,
    tab: {
      id: overrides.paneKey,
      ptyId: null,
      worktreeId: '/repo/a',
      title: `Agent ${overrides.paneKey}`,
      customTitle: null,
      color: null,
      sortOrder: 0,
      createdAt: 1,
      sessionId: overrides.paneKey,
    },
    entry: {
      paneKey: overrides.paneKey,
      sessionId: overrides.paneKey,
      state: overrides.state === 'unverifiable' ? 'idle' : overrides.state,
      prompt: `Agent ${overrides.paneKey}`,
      updatedAt: 10,
      stateStartedAt: 10,
    },
    ...overrides,
  }
}

describe('dashboard bucket mapping (D01-027)', () => {
  it('folds blocked and waiting into Needs You, and unverifiable into idle', () => {
    expect(dashboardBucketForState('blocked')).toBe('attention')
    expect(dashboardBucketForState('waiting')).toBe('attention')
    expect(dashboardBucketForState('working')).toBe('working')
    expect(dashboardBucketForState('done')).toBe('done')
    expect(dashboardBucketForState('idle')).toBe('idle')
    expect(dashboardBucketForState('unknown')).toBe('idle')
    expect(dashboardBucketForState('unverifiable')).toBe('idle')
  })

  it('groups by bucket, most recent first inside each bucket', () => {
    const groups = groupAgentThreadsByBucket([
      thread({ paneKey: 'a', state: 'working', latestTimestamp: 10 }),
      thread({ paneKey: 'b', state: 'working', latestTimestamp: 30 }),
      thread({ paneKey: 'c', state: 'blocked' }),
      thread({ paneKey: 'd', state: 'done' }),
      thread({ paneKey: 'e', state: 'idle' }),
    ])

    expect(groups.attention.map((row) => row.paneKey)).toEqual(['c'])
    expect(groups.working.map((row) => row.paneKey)).toEqual(['b', 'a'])
    expect(groups.done.map((row) => row.paneKey)).toEqual(['d'])
    expect(groups.idle.map((row) => row.paneKey)).toEqual(['e'])
  })

  it('counts the four buckets and reuses the frozen empty counts when nothing is tracked', () => {
    expect(countAgentThreadsByBucket([])).toBe(EMPTY_DASHBOARD_BUCKET_COUNTS)
    expect(countAgentBuckets(groupAgentThreadsByBucket([]))).toBe(EMPTY_DASHBOARD_BUCKET_COUNTS)

    const counts = countAgentThreadsByBucket([
      thread({ paneKey: 'a', state: 'blocked' }),
      thread({ paneKey: 'b', state: 'waiting' }),
      thread({ paneKey: 'c', state: 'working' }),
      thread({ paneKey: 'd', state: 'done' }),
      thread({ paneKey: 'e', state: 'idle' }),
    ])
    expect(counts).toEqual({ attention: 2, working: 1, done: 1, idle: 1 })
    expect(countAgentBuckets(groupAgentThreadsByBucket([
      thread({ paneKey: 'a', state: 'blocked' }),
      thread({ paneKey: 'b', state: 'waiting' }),
      thread({ paneKey: 'c', state: 'working' }),
      thread({ paneKey: 'd', state: 'done' }),
      thread({ paneKey: 'e', state: 'idle' }),
    ]))).toEqual(counts)
  })

  it('projects plain rows for the pop-out payload', () => {
    const [row] = toAgentDashboardPopoutRows([
      thread({ paneKey: 'a', state: 'done', sessionId: 'session-a', unread: true }),
    ])
    expect(row).toMatchObject({
      paneKey: 'a',
      sessionId: 'session-a',
      title: 'Agent a',
      state: 'done',
      bucket: 'done',
      projectName: 'repo',
      branch: 'main',
      unread: true,
    })
  })
})
