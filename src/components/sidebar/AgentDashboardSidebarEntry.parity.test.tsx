import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from '@/store'
import { DEFAULT_HYDRA_SETTINGS, type HydraSettings } from '@/shared/settings-types'
import { AgentDashboardSidebarEntry } from './AgentDashboardSidebarEntry'
import { SidebarNav } from './SidebarNav'

const dashboardCounts = vi.hoisted(() => ({
  value: { attention: 1, working: 2, done: 3, idle: 4 },
}))

vi.mock('../dashboard/use-agent-dashboard-data', () => ({
  useAgentBucketCounts: () => dashboardCounts.value,
  useAgentDashboardData: () => ({
    threads: [],
    groups: { attention: [], working: [], done: [], idle: [] },
    counts: dashboardCounts.value,
  }),
}))

const openAgentDashboardPopout = vi.hoisted(() => vi.fn(async () => 'opened' as const))
vi.mock('../../lib/agent-dashboard-popout', () => ({ openAgentDashboardPopout }))

function settings(overrides: Partial<HydraSettings> = {}): HydraSettings {
  return { ...DEFAULT_HYDRA_SETTINGS, ...overrides }
}

let currentSettings: HydraSettings

function setDashboardState(overrides: Partial<HydraSettings> = {}): void {
  currentSettings = settings({
    experimentalAgentDashboardPopout: true,
    experimentalAgentDashboardMode: 'in-window',
    experimentalAgentDashboardShowIdle: false,
    ...overrides,
  })
  useAppStore.setState({ agentDashboardDrawerOpen: false })
}

function renderEntry() {
  return render(
    <AgentDashboardSidebarEntry
      sessions={[]}
      projects={[{ id: 'repo_a', name: 'repo', path: '/repo/a' } as never]}
      settings={currentSettings}
    />
  )
}

describe('AgentDashboardSidebarEntry (D01-027)', () => {
  beforeEach(() => {
    dashboardCounts.value = { attention: 1, working: 2, done: 3, idle: 4 }
    openAgentDashboardPopout.mockClear()
    openAgentDashboardPopout.mockResolvedValue('opened')
    setDashboardState()
  })

  afterEach(() => {
    useAppStore.setState({ agentDashboardDrawerOpen: false })
  })

  it('renders the label, the tour target and the three default counters', () => {
    renderEntry()

    expect(screen.getByText('Agent Dashboard')).toBeInTheDocument()
    const entry = screen.getByRole('button', { name: /Agent Dashboard/ })
    expect(entry).toHaveAttribute('data-contextual-tour-target', 'agents-sidebar')
    expect(screen.getByLabelText('Needs You: 1')).toBeInTheDocument()
    expect(screen.getByLabelText('Working: 2')).toBeInTheDocument()
    expect(screen.getByLabelText('Done: 3')).toBeInTheDocument()
    expect(screen.queryByLabelText('Idle: 4')).toBeNull()
  })

  it('uses the question glyph only for Needs You and dots for the other buckets', () => {
    renderEntry()

    expect(screen.getByLabelText('Needs You: 1').querySelector('svg')).not.toBeNull()
    expect(screen.getByLabelText('Working: 2').querySelector('svg')).toBeNull()
    expect(screen.getByLabelText('Working: 2').querySelector('.bg-yellow-500')).not.toBeNull()
    expect(screen.getByLabelText('Done: 3').querySelector('.bg-emerald-500')).not.toBeNull()
  })

  it('shows the idle counter only when the experiment opts in', () => {
    setDashboardState({ experimentalAgentDashboardShowIdle: true })
    renderEntry()

    expect(screen.getByLabelText('Idle: 4')).toBeInTheDocument()
  })

  it('toggles the in-window drawer in the store setter', () => {
    renderEntry()

    fireEvent.click(screen.getByRole('button', { name: /Agent Dashboard/ }))
    expect(useAppStore.getState().agentDashboardDrawerOpen).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: /Agent Dashboard/ }))
    expect(useAppStore.getState().agentDashboardDrawerOpen).toBe(false)
    expect(openAgentDashboardPopout).not.toHaveBeenCalled()
  })

  it('hands off to the pop-out window in popout mode without touching the drawer', () => {
    setDashboardState({ experimentalAgentDashboardMode: 'popout' })
    renderEntry()

    fireEvent.click(screen.getByRole('button', { name: /Agent Dashboard/ }))

    expect(openAgentDashboardPopout).toHaveBeenCalledOnce()
    expect(useAppStore.getState().agentDashboardDrawerOpen).toBe(false)
  })

  it('falls back to the drawer when the pop-out cannot be created', async () => {
    openAgentDashboardPopout.mockResolvedValue('unavailable')
    setDashboardState({ experimentalAgentDashboardMode: 'popout' })
    renderEntry()

    fireEvent.click(screen.getByRole('button', { name: /Agent Dashboard/ }))

    await waitFor(() => expect(useAppStore.getState().agentDashboardDrawerOpen).toBe(true))
  })
})

describe('SidebarNav Agent Dashboard gating (D01-027)', () => {
  beforeEach(() => {
    setDashboardState()
  })

  it('keeps the row unmounted while its experiment is off', () => {
    render(
      <SidebarNav
        settings={settings({ experimentalAgentDashboardPopout: false })}
        onUpdateSettings={vi.fn()}
      />
    )
    expect(screen.queryByText('Agent Dashboard')).toBeNull()
  })

  it('mounts the row only when its experiment is enabled', () => {
    render(
      <SidebarNav
        settings={settings({ experimentalAgentDashboardPopout: true })}
        onUpdateSettings={vi.fn()}
      />
    )
    expect(screen.getByText('Agent Dashboard')).toBeInTheDocument()
  })
})
