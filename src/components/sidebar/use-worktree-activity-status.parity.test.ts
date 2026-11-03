// Parity guard for D04b-008/009: the single and batch activity-status selectors
// share one derivation, so the card dot and the sidebar batch agree; Hydra's
// session reading fills in what the live tab records cannot express.
import { describe, expect, it } from 'vitest'

import {
  selectWorktreeActivityStatus,
  selectWorktreeActivityStatuses,
  type WorktreeActivityState
} from './use-worktree-activity-status'
import type { AgentStatusEntry } from '../../shared/agent-status-types'
import type { WorktreeSession } from './types'

const WT = '/repo/wt'
const OTHER = '/repo/other'
const TAB = 'tab-1'
const PANE = `${TAB}:11111111-1111-4111-8111-111111111111`
const NOW = Date.now()

function agentEntry(overrides: Partial<AgentStatusEntry> = {}): AgentStatusEntry {
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

function session(overrides: Partial<WorktreeSession> = {}): WorktreeSession {
  return { id: 's1', project_path: WT, title: 'agent', state: 'idle', ...overrides } as WorktreeSession
}

function state(overrides: Partial<WorktreeActivityState> = {}): WorktreeActivityState {
  return {
    tabsByWorktree: { [WT]: [{ id: TAB, title: 'zsh' }] },
    browserTabsByWorktree: {},
    runtimePaneTitlesByTabId: {},
    ptyIdsByTabId: {},
    terminalLayoutsByTabId: {},
    agentStatusEpoch: 1,
    agentStatusByPaneKey: {},
    migrationUnsupportedByPtyId: {},
    retainedAgentsByPaneKey: {},
    runtimeAgentOrchestrationByPaneKey: {},
    ...overrides
  }
}

describe('selectWorktreeActivityStatus (D04b-008)', () => {
  it('promotes an explicit permission row above the passive tab state', () => {
    const subject = state({ agentStatusByPaneKey: { [PANE]: agentEntry({ state: 'blocked' }) } })
    expect(selectWorktreeActivityStatus(subject, WT)).toBe('permission')
  })

  it('promotes an explicit working row', () => {
    const subject = state({ agentStatusByPaneKey: { [PANE]: agentEntry() } })
    expect(selectWorktreeActivityStatus(subject, WT)).toBe('working')
  })

  it('reads a live PTY as active', () => {
    const subject = state({ ptyIdsByTabId: { [TAB]: ['pty-1'] } })
    expect(selectWorktreeActivityStatus(subject, WT)).toBe('active')
  })

  it('counts a browser-only workspace as active', () => {
    const subject = state({
      tabsByWorktree: { [WT]: [] },
      browserTabsByWorktree: { [WT]: [{ id: 'browser-1' }] }
    })
    expect(selectWorktreeActivityStatus(subject, WT)).toBe('active')
  })

  it('falls back to the session reading when no live PTY row exists', () => {
    const subject = state()
    expect(
      selectWorktreeActivityStatus(subject, WT, {
        sessions: [session({ state: 'blocked' })],
        hasLiveTerminal: true
      })
    ).toBe('permission')
  })

  it('never lets a passive tab hide a fresh session completion', () => {
    const subject = state({ ptyIdsByTabId: { [TAB]: ['pty-1'] } })
    expect(
      selectWorktreeActivityStatus(subject, WT, {
        sessions: [session({ state: 'done' })],
        hasLiveTerminal: true
      })
    ).toBe('done')
  })
})

describe('selectWorktreeActivityStatuses (D04b-009)', () => {
  it('returns one status per candidate and ignores unrelated worktrees', () => {
    const subject = state({
      tabsByWorktree: {
        [WT]: [{ id: TAB, title: 'zsh' }],
        [OTHER]: [{ id: 'tab-2', title: 'zsh' }]
      },
      ptyIdsByTabId: { [TAB]: ['pty-1'] }
    })
    const statuses = selectWorktreeActivityStatuses(subject, [WT, OTHER])
    expect([...statuses.keys()]).toEqual([WT, OTHER])
    expect(statuses.get(WT)).toBe('active')
    expect(statuses.get(OTHER)).toBe('inactive')
  })

  it('produces equal maps when the monitored statuses did not change', () => {
    const first = selectWorktreeActivityStatuses(state(), [WT])
    const second = selectWorktreeActivityStatuses(
      state({ agentStatusEpoch: 2, tabsByWorktree: { [WT]: [{ id: TAB, title: 'zsh' }] } }),
      [WT]
    )
    expect([...second.entries()]).toEqual([...first.entries()])
    expect(second.get(WT)).toBe(first.get(WT))
  })

  it('applies each candidate fallback independently', () => {
    const statuses = selectWorktreeActivityStatuses(state(), [WT, OTHER], new Map([
      [WT, { sessions: [session({ state: 'working' })], hasLiveTerminal: true }],
      [OTHER, { sessions: [], hasLiveTerminal: false }]
    ]))
    expect(statuses.get(WT)).toBe('working')
    expect(statuses.get(OTHER)).toBe('inactive')
  })
})
