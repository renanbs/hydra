import { act, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from '@/store'
import type { WorktreeSession } from '../sidebar/types'
import { AgentDashboardSnapshotPublisher } from './AgentDashboardSnapshotPublisher'

const bridge = vi.hoisted(() => {
  const listeners = new Map<string, (payload: unknown) => void>()
  return {
    listeners,
    AGENT_DASHBOARD_WINDOW_LABEL: 'agent-dashboard',
    AGENT_DASHBOARD_WINDOW_QUERY_KEY: 'window',
    AGENT_DASHBOARD_WINDOW_QUERY_VALUE: 'agent-dashboard',
    AGENT_DASHBOARD_SNAPSHOT_EVENT: 'hydra:agent-dashboard:snapshot',
    AGENT_DASHBOARD_SNAPSHOT_REQUEST_EVENT: 'hydra:agent-dashboard:snapshot-request',
    AGENT_DASHBOARD_CLOSED_EVENT: 'hydra:agent-dashboard:closed',
    AGENT_DASHBOARD_REVEAL_EVENT: 'hydra:agent-dashboard:reveal',
    isTauriRuntime: () => false,
    isAgentDashboardPopoutLocation: () => false,
    openAgentDashboardPopout: vi.fn(async () => 'unavailable' as const),
    emitToAgentDashboardPopout: vi.fn(async () => {}),
    emitToAgentDashboardMain: vi.fn(async () => {}),
    focusAgentDashboardMainWindow: vi.fn(async () => {}),
    isAgentDashboardPopoutOpen: vi.fn(async () => true),
    closeAgentDashboardPopoutWindow: vi.fn(async () => {}),
    listenAgentDashboardEvent: vi.fn(
      async (event: string, handler: (payload: unknown) => void) => {
        listeners.set(event, handler)
        return () => listeners.delete(event)
      }
    ),
  }
})

vi.mock('../../lib/agent-dashboard-popout', () => bridge)

function session(id: string, state: WorktreeSession['state']): WorktreeSession {
  return {
    id,
    project_path: '/repo/a',
    title: `Agent ${id}`,
    branch: 'main',
    state,
    active: false,
    agentName: 'claude',
    executable: 'claude',
    created_at: 1,
    updated_at: 1,
    state_started_at: 1,
  }
}

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

describe('AgentDashboardSnapshotPublisher (D01-028 popout feed)', () => {
  beforeEach(() => {
    resetThreadSlices()
    bridge.listeners.clear()
    bridge.emitToAgentDashboardPopout.mockClear()
  })

  afterEach(resetThreadSlices)

  it('stays silent until the pop-out asks for a snapshot', async () => {
    render(
      <AgentDashboardSnapshotPublisher
        sessions={[session('busy', 'working')]}
        projects={[]}
        onRevealSession={vi.fn()}
      />
    )
    await waitFor(() => expect(bridge.listeners.size).toBe(3))

    expect(bridge.emitToAgentDashboardPopout).not.toHaveBeenCalled()
  })

  it('answers a snapshot request and then keeps the pop-out current', async () => {
    const view = render(
      <AgentDashboardSnapshotPublisher
        sessions={[session('busy', 'working')]}
        projects={[]}
        onRevealSession={vi.fn()}
      />
    )
    await waitFor(() => expect(bridge.listeners.size).toBe(3))

    act(() => {
      bridge.listeners.get('hydra:agent-dashboard:snapshot-request')?.({})
    })

    await waitFor(() =>
      expect(bridge.emitToAgentDashboardPopout).toHaveBeenCalledWith(
        'hydra:agent-dashboard:snapshot',
        expect.objectContaining({ rows: expect.any(Array) })
      )
    )
    const published = bridge.emitToAgentDashboardPopout.mock.calls.find(
      ([event]) => event === 'hydra:agent-dashboard:snapshot'
    )?.[1] as { rows: Array<{ paneKey: string; bucket: string }> }
    expect(published.rows).toEqual([
      expect.objectContaining({ paneKey: 'busy', bucket: 'working' }),
    ])

    view.unmount()
  })

  it('routes a reveal back to the app and stops publishing after close', async () => {
    const onRevealSession = vi.fn()
    render(
      <AgentDashboardSnapshotPublisher
        sessions={[session('busy', 'working')]}
        projects={[]}
        onRevealSession={onRevealSession}
      />
    )
    await waitFor(() => expect(bridge.listeners.size).toBe(3))

    act(() => {
      bridge.listeners.get('hydra:agent-dashboard:reveal')?.({ sessionId: 'session-busy' })
    })
    expect(onRevealSession).toHaveBeenCalledWith('session-busy')

    act(() => {
      bridge.listeners.get('hydra:agent-dashboard:snapshot-request')?.({})
    })
    await waitFor(() => expect(bridge.emitToAgentDashboardPopout).toHaveBeenCalled())
    bridge.emitToAgentDashboardPopout.mockClear()

    act(() => {
      bridge.listeners.get('hydra:agent-dashboard:closed')?.({})
    })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(bridge.emitToAgentDashboardPopout).not.toHaveBeenCalled()
  })
})
