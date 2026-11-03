import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from '@/store'
import { DEFAULT_HYDRA_SETTINGS, type HydraSettings } from '@/shared/settings-types'
import { AgentDashboardDrawer } from './AgentDashboardDrawer'

function thread(paneKey: string, state: string, extra: Record<string, unknown> = {}) {
  const entry = {
    paneKey,
    sessionId: `session-${paneKey}`,
    state: state === 'unverifiable' ? 'idle' : state,
    prompt: `Agent ${paneKey}`,
    terminalTitle: `Agent ${paneKey}`,
    updatedAt: 10,
    stateStartedAt: 10,
    ...(extra.entry as object),
  }
  return {
    paneKey,
    worktreePath: '/repo/a',
    projectPath: '/repo/a',
    projectName: 'repo',
    branch: 'main',
    title: `Agent ${paneKey}`,
    agentType: 'claude',
    entry,
    state,
    rowSource: 'live',
    startedAt: 1,
    tab: { id: paneKey, worktreeId: '/repo/a', title: `Agent ${paneKey}` },
    sessionId: `session-${paneKey}`,
    isLive: true,
    isRetained: false,
    isChild: false,
    unread: false,
    updatedAt: 10,
    latestTimestamp: 10,
    ...extra,
  }
}

const dashboardData = vi.hoisted(() => ({ value: null as unknown }))

vi.mock('./use-agent-dashboard-data', () => ({
  useAgentDashboardData: () => dashboardData.value,
}))

let showIdleSetting = false

function setOpen(open: boolean, showIdle = false): void {
  showIdleSetting = showIdle
  useAppStore.setState({ agentDashboardDrawerOpen: open })
}

function drawerSettings(): HydraSettings {
  return {
    ...DEFAULT_HYDRA_SETTINGS,
    experimentalAgentDashboardPopout: true,
    experimentalAgentDashboardShowIdle: showIdleSetting,
  }
}

function renderDrawer(onSelectSession = vi.fn()) {
  const view = render(
    <AgentDashboardDrawer
      sessions={[]}
      projects={[]}
      sidebarRef={{ current: null }}
      onSelectSession={onSelectSession}
      settings={drawerSettings()}
    />
  )
  return { onSelectSession, view }
}

describe('AgentDashboardDrawer (D01-028)', () => {
  beforeEach(() => {
    dashboardData.value = {
      threads: [],
      groups: {
        attention: [thread('needs', 'blocked')],
        working: [thread('busy', 'working')],
        done: [thread('fin', 'done')],
        idle: [thread('quiet', 'idle')],
      },
      counts: { attention: 1, working: 1, done: 1, idle: 1 },
    }
  })

  afterEach(() => {
    useAppStore.setState({ agentDashboardDrawerOpen: false })
  })

  it('lists agents grouped by bucket while open', () => {
    setOpen(true)
    renderDrawer()

    expect(screen.getByText('Agent Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Needs You')).toBeInTheDocument()
    expect(screen.getByText('Working')).toBeInTheDocument()
    expect(screen.getByText('Done')).toBeInTheDocument()
    // Idle is opt-in on the experiment flag.
    expect(screen.queryByText('Idle')).toBeNull()
    expect(screen.getByText('Agent busy')).toBeInTheDocument()
  })

  it('shows the idle bucket when the experiment opts in', () => {
    setOpen(true, true)
    renderDrawer()

    expect(screen.getByText('Idle')).toBeInTheDocument()
    expect(screen.getByText('Agent quiet')).toBeInTheDocument()
  })

  it('reveals a row session and closes itself', () => {
    setOpen(true)
    const { onSelectSession } = renderDrawer()

    fireEvent.click(screen.getByRole('button', { name: /Agent busy/ }))

    expect(onSelectSession).toHaveBeenCalledWith('session-busy')
    expect(useAppStore.getState().agentDashboardDrawerOpen).toBe(false)
  })

  it('closes on Escape', () => {
    setOpen(true)
    renderDrawer()

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(useAppStore.getState().agentDashboardDrawerOpen).toBe(false)
  })

  it('renders the empty state when no bucket has agents', () => {
    dashboardData.value = {
      threads: [],
      groups: { attention: [], working: [], done: [], idle: [] },
      counts: { attention: 0, working: 0, done: 0, idle: 0 },
    }
    setOpen(true)
    renderDrawer()

    expect(screen.getByText('No agents yet.')).toBeInTheDocument()
  })
})
