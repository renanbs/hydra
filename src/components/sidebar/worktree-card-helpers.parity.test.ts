import { describe, expect, it } from 'vitest'

import { getWorktreeCardTitleDisplay } from './worktree-card-title-display'
import { isEventTargetInsideCurrentTarget } from './worktree-card-dom-events'
import {
  SUMMARY_STATE_ORDER,
  buildSummaryAgentGroups,
  formatSummaryStateLabel,
  getSummaryAgentDotState,
  summarizeAgentIdentities,
  summarizeAgents,
  type AgentRow
} from './worktree-card-agent-summary'
import {
  MAX_PERSISTED_WORKTREE_AGENT_EXPANSIONS,
  getWorktreeAgentExpansionCountForTests,
  clearWorktreeAgentExpansionStateForTests,
  seedWorktreeAgentExpansionStateForTests
} from './worktree-card-agents-expansion-state'
import { getDisplacedLinkLabels, isIssueFieldDirty } from './worktree-issue-displacement'

function agent(overrides: Partial<AgentRow> = {}): AgentRow {
  return {
    paneKey: 'pane-1',
    entry: { state: 'working', stateStartedAt: 100 } as AgentRow['entry'],
    state: 'working',
    ...overrides
  }
}

describe('worktree card title display (Orca parity)', () => {
  it('keeps a user-authored name even when it is not the branch', () => {
    expect(
      getWorktreeCardTitleDisplay({ storedDisplayName: 'Fix the sidebar', branchName: 'feat/x' })
    ).toBe('Fix the sidebar')
  })

  it('falls through branch-ish stored names to the task subject', () => {
    expect(
      getWorktreeCardTitleDisplay({
        storedDisplayName: 'feat/x',
        branchName: 'feat/x',
        issueTitle: 'Crash on startup'
      })
    ).toBe('Crash on startup')
  })

  it('ignores provider loading placeholders', () => {
    expect(
      getWorktreeCardTitleDisplay({
        storedDisplayName: 'feat/x',
        branchName: 'feat/x',
        reviewTitle: 'Loading PR...',
        linearIssueTitle: 'Do the thing'
      })
    ).toBe('Do the thing')
  })

  it('coerces a nullish title to an empty string', () => {
    expect(getWorktreeCardTitleDisplay({ storedDisplayName: null, branchName: null })).toBe('')
  })
})

describe('worktree card DOM event predicate', () => {
  it('treats a text node inside the container as local', () => {
    const host = document.createElement('div')
    const text = document.createTextNode('hello')
    host.appendChild(text)
    expect(isEventTargetInsideCurrentTarget(host, text)).toBe(true)
  })

  it('rejects portaled content outside the container', () => {
    const host = document.createElement('div')
    const outside = document.createElement('div')
    expect(isEventTargetInsideCurrentTarget(host, outside)).toBe(false)
  })
})

describe('worktree card agent summary (Orca parity)', () => {
  it('uses the Orca state order', () => {
    expect(SUMMARY_STATE_ORDER).toEqual([
      'waiting',
      'blocked',
      'working',
      'monitoring',
      'interrupted',
      'done',
      'unverifiable',
      'idle'
    ])
  })

  it('formats the two non-obvious labels', () => {
    expect(formatSummaryStateLabel('unverifiable')).toBe('not reporting')
    expect(formatSummaryStateLabel('permission')).toBe('needs attention')
  })

  it('groups by dot state, not raw status', () => {
    const groups = buildSummaryAgentGroups([
      agent({ paneKey: 'a' }),
      agent({ paneKey: 'b', entry: { state: 'working', workingMode: 'monitoring' } as AgentRow['entry'] }),
      agent({ paneKey: 'c', entry: { state: 'done', interrupted: true } as AgentRow['entry'] })
    ])
    expect(groups.map((group) => group.state)).toEqual(['working', 'monitoring', 'interrupted'])
  })

  it('renders the collapsed sentence and the identity list', () => {
    const agents = [agent(), agent({ paneKey: 'b' })]
    expect(summarizeAgents(agents, '2 agents')).toBe('All 2 agents working')
    expect(summarizeAgentIdentities(agents)).toBe('Agent working; Agent working')
    expect(getSummaryAgentDotState(agent())).toBe('working')
  })
})

describe('agent expansion LRU (Orca parity)', () => {
  it('drops default entries and bounds the cache', () => {
    clearWorktreeAgentExpansionStateForTests()
    seedWorktreeAgentExpansionStateForTests('plain', {
      collapsedLineageParents: new Set(),
      compactRootListExpanded: false
    })
    expect(getWorktreeAgentExpansionCountForTests()).toBe(0)

    for (let index = 0; index < MAX_PERSISTED_WORKTREE_AGENT_EXPANSIONS + 5; index += 1) {
      seedWorktreeAgentExpansionStateForTests(`wt-${index}`, {
        collapsedLineageParents: new Set(['pane']),
        compactRootListExpanded: true
      })
    }
    expect(getWorktreeAgentExpansionCountForTests()).toBe(MAX_PERSISTED_WORKTREE_AGENT_EXPANSIONS)
    clearWorktreeAgentExpansionStateForTests()
  })
})

describe('issue displacement naming (Orca parity)', () => {
  const snapshot = { linkedIssue: 12, linkedLinearIssue: 'ENG-7' }

  it('ignores an untouched issue field', () => {
    expect(getDisplacedLinkLabels({ draft: snapshot, snapshot, isFolderWorkspace: false })).toBeNull()
    expect(isIssueFieldDirty(snapshot, snapshot)).toBe(false)
  })

  it('names the Linear link a GitHub save drops', () => {
    expect(
      getDisplacedLinkLabels({
        draft: { linkedIssue: 42, linkedLinearIssue: null },
        snapshot,
        isFolderWorkspace: false
      })
    ).toEqual(['Linear ENG-7'])
  })

  it('names both links a cleared field drops', () => {
    expect(
      getDisplacedLinkLabels({
        draft: { linkedIssue: null, linkedLinearIssue: null },
        snapshot,
        isFolderWorkspace: false
      })
    ).toEqual(['Linear ENG-7', 'GitHub #12'])
  })
})
