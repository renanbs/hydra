import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import AgentDashboardPopoutWindow from './AgentDashboardPopoutWindow'

const popoutBridge = vi.hoisted(() => {
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
      async (_event: string, handler: (payload: unknown) => void) => {
        listeners.set(_event, handler)
        return () => listeners.delete(_event)
      }
    ),
  }
})

vi.mock('../../lib/agent-dashboard-popout', () => popoutBridge)

const SNAPSHOT = {
  rows: [
    {
      paneKey: 'blocked',
      sessionId: 'session-blocked',
      title: 'Fix the flaky test',
      agentType: 'claude',
      state: 'blocked',
      bucket: 'attention',
      worktreePath: '/repo/a',
      projectName: 'repo',
      branch: 'main',
      updatedAt: 30,
      unread: true,
    },
    {
      paneKey: 'busy',
      sessionId: 'session-busy',
      title: 'Ship the parity work',
      agentType: 'claude',
      state: 'working',
      bucket: 'working',
      worktreePath: '/repo/a',
      projectName: 'repo',
      branch: 'main',
      updatedAt: 20,
      unread: false,
    },
  ],
  generatedAt: 100,
}

describe('AgentDashboardPopoutWindow (D01-028 popout)', () => {
  it('requests a snapshot on mount and renders the buckets it receives', async () => {
    popoutBridge.listeners.clear()
    popoutBridge.emitToAgentDashboardMain.mockClear()
    render(<AgentDashboardPopoutWindow />)

    await waitFor(() =>
      expect(popoutBridge.listeners.has('hydra:agent-dashboard:snapshot')).toBe(true)
    )
    expect(popoutBridge.emitToAgentDashboardMain).toHaveBeenCalledWith(
      'hydra:agent-dashboard:snapshot-request'
    )
    expect(screen.getByText('Waiting for the main window…')).toBeInTheDocument()

    act(() => {
      popoutBridge.listeners.get('hydra:agent-dashboard:snapshot')?.(SNAPSHOT)
    })

    expect(screen.getByText('Needs You')).toBeInTheDocument()
    expect(screen.getByText('Working')).toBeInTheDocument()
    expect(screen.getByText('Fix the flaky test')).toBeInTheDocument()
    expect(screen.getByText('Ship the parity work')).toBeInTheDocument()
    expect(screen.queryByText('Waiting for the main window…')).toBeNull()
  })

  it('ignores a malformed snapshot payload', async () => {
    popoutBridge.listeners.clear()
    render(<AgentDashboardPopoutWindow />)
    await waitFor(() =>
      expect(popoutBridge.listeners.has('hydra:agent-dashboard:snapshot')).toBe(true)
    )

    act(() => {
      popoutBridge.listeners.get('hydra:agent-dashboard:snapshot')?.({ rows: 'nope' })
    })

    expect(screen.getByText('Waiting for the main window…')).toBeInTheDocument()
  })

  it('reveals the row in the main window and focuses it', async () => {
    popoutBridge.listeners.clear()
    popoutBridge.emitToAgentDashboardMain.mockClear()
    popoutBridge.focusAgentDashboardMainWindow.mockClear()
    render(<AgentDashboardPopoutWindow />)
    await waitFor(() =>
      expect(popoutBridge.listeners.has('hydra:agent-dashboard:snapshot')).toBe(true)
    )

    act(() => {
      popoutBridge.listeners.get('hydra:agent-dashboard:snapshot')?.(SNAPSHOT)
    })
    fireEvent.click(screen.getByRole('button', { name: /Ship the parity work/ }))

    expect(popoutBridge.emitToAgentDashboardMain).toHaveBeenCalledWith(
      'hydra:agent-dashboard:reveal',
      { sessionId: 'session-busy' }
    )
    expect(popoutBridge.focusAgentDashboardMainWindow).toHaveBeenCalledOnce()
  })

  it('tells the main window when it closes', async () => {
    popoutBridge.listeners.clear()
    popoutBridge.emitToAgentDashboardMain.mockClear()
    const view = render(<AgentDashboardPopoutWindow />)
    await waitFor(() =>
      expect(popoutBridge.listeners.has('hydra:agent-dashboard:snapshot')).toBe(true)
    )

    act(() => view.unmount())

    expect(popoutBridge.emitToAgentDashboardMain).toHaveBeenCalledWith(
      'hydra:agent-dashboard:closed'
    )
  })
})
