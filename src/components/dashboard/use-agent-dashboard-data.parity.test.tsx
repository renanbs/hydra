import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { JSX } from 'react'
import { useAppStore } from '@/store'
import type { WorktreeSession, HydraProject } from '../sidebar/types'
import { useAgentBucketCounts, useAgentDashboardData } from './use-agent-dashboard-data'

function session(id: string, state: WorktreeSession['state'], agentName = 'claude'): WorktreeSession {
  return {
    id,
    project_path: '/repo/a',
    title: `Agent ${id}`,
    branch: 'main',
    state,
    active: false,
    agentName,
    executable: agentName,
    created_at: 1,
    updated_at: 1,
    state_started_at: 1,
  }
}

const PROJECT: HydraProject = {
  id: 'repo_a',
  name: 'repo',
  path: '/repo/a',
  is_git: true,
  current_branch: 'main',
} as HydraProject

function resetThreadSlices(): void {
  useAppStore.setState({
    tabsByWorktree: {},
    agentStatusByPaneKey: {},
    retainedAgentsByPaneKey: {},
    migrationUnsupportedByPtyId: {},
    runtimeAgentOrchestrationByPaneKey: {},
    terminalLayoutsByTabId: {},
    ptyIdsByTabId: {},
    acknowledgedAgentsByPaneKey: {},
    unreadTerminalPanes: {},
    unreadAgentCompletionPanes: {},
    manuallyUnreadTurnsByPaneKey: {},
    activityClearedAtByPaneKey: {},
  })
}

describe('useAgentBucketCounts (D01-027)', () => {
  beforeEach(resetThreadSlices)

  afterEach(resetThreadSlices)

  it('counts headless agent sessions by bucket', () => {
    function Harness(): JSX.Element {
      const counts = useAgentBucketCounts({
        sessions: [
          session('working', 'working'),
          session('blocked', 'blocked'),
          session('waiting', 'waiting'),
          session('done', 'done'),
          session('idle', 'idle'),
          session('unknown', 'unknown'),
        ],
        projects: [PROJECT],
      })
      return (
        <div data-testid="counts">
          {counts.attention},{counts.working},{counts.done},{counts.idle}
        </div>
      )
    }

    const { getByTestId } = render(<Harness />)
    expect(getByTestId('counts').textContent).toBe('2,1,1,2')
  })

  it('keeps the counts object stable across unrelated writes and rebuilds when a bucket changes', () => {
    const seen: Array<Record<string, number>> = []

    function Harness({ sessions }: { sessions: WorktreeSession[] }): JSX.Element {
      const counts = useAgentBucketCounts({ sessions, projects: [PROJECT] })
      seen.push(counts)
      return <div>{counts.working}</div>
    }

    const view = render(<Harness sessions={[session('working', 'working')]} />)
    const first = seen[seen.length - 1]

    // An unrelated UI write must not rebuild the counts (the shallow read-set holds).
    useAppStore.setState({ activeView: 'tasks' })
    view.rerender(<Harness sessions={[session('working', 'working')]} />)
    expect(seen[seen.length - 1]).toBe(first)

    // A real status change must.
    view.rerender(
      <Harness sessions={[session('working', 'working'), session('done', 'done')]} />
    )
    const latest = seen[seen.length - 1]
    expect(latest).not.toBe(first)
    expect(latest.done).toBe(1)
  })

  it('stays inert while disabled', () => {
    let counts: Record<string, number> | null = null
    function Harness(): JSX.Element {
      counts = useAgentDashboardData({
        sessions: [session('working', 'working')],
        projects: [PROJECT],
        enabled: false,
      }).counts
      return <div />
    }

    render(<Harness />)
    expect(counts).not.toBeNull()
    expect(counts).toMatchObject({ attention: 0, working: 0, done: 0, idle: 0 })
  })
})
