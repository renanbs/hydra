import { act, cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from '@/store'
import { AgentDashboardSidebarHost } from './AgentDashboardSidebarHost'

vi.mock('../dashboard/AgentDashboardDrawer', () => ({
  AgentDashboardDrawer: () => <div data-testid="agent-dashboard-drawer" />,
}))

function renderHost(overrides: { sidebarOpen?: boolean; workspaceBoardOpen?: boolean } = {}) {
  const closeWorkspaceBoard = vi.fn()
  const view = render(
    <AgentDashboardSidebarHost
      sidebarOpen={overrides.sidebarOpen ?? true}
      workspaceBoardOpen={overrides.workspaceBoardOpen ?? false}
      closeWorkspaceBoard={closeWorkspaceBoard}
      sessions={[]}
      projects={[]}
      sidebarRef={{ current: null }}
      onSelectSession={vi.fn()}
    />
  )
  return { closeWorkspaceBoard, view }
}

describe('AgentDashboardSidebarHost (D01-029)', () => {
  beforeEach(() => {
    useAppStore.setState({ agentDashboardDrawerOpen: false })
  })

  afterEach(() => {
    cleanup()
    useAppStore.setState({ agentDashboardDrawerOpen: false })
  })

  it('closes the dashboard when the workspace board opens', async () => {
    useAppStore.setState({ agentDashboardDrawerOpen: true })
    renderHost({ workspaceBoardOpen: true })

    await waitFor(() => expect(useAppStore.getState().agentDashboardDrawerOpen).toBe(false))
  })

  it('closes the workspace board when the dashboard opens', async () => {
    const { closeWorkspaceBoard, view } = renderHost({ workspaceBoardOpen: false })

    act(() => useAppStore.setState({ agentDashboardDrawerOpen: true }))
    view.rerender(
      <AgentDashboardSidebarHost
        sidebarOpen
        workspaceBoardOpen={false}
        closeWorkspaceBoard={closeWorkspaceBoard}
        sessions={[]}
        projects={[]}
        sidebarRef={{ current: null }}
        onSelectSession={vi.fn()}
      />
    )

    await waitFor(() => expect(closeWorkspaceBoard).toHaveBeenCalledOnce())
  })

  it('mounts the drawer only while the sidebar is open', () => {
    const open = renderHost({ sidebarOpen: true })
    expect(open.view.getByTestId('agent-dashboard-drawer')).toBeInTheDocument()
    open.view.unmount()

    const closed = renderHost({ sidebarOpen: false })
    expect(closed.view.queryByTestId('agent-dashboard-drawer')).toBeNull()
  })

  it('clears an open dashboard when the sidebar closes', async () => {
    useAppStore.setState({ agentDashboardDrawerOpen: true })
    renderHost({ sidebarOpen: false })

    await waitFor(() => expect(useAppStore.getState().agentDashboardDrawerOpen).toBe(false))
  })

  it('clears an open dashboard when the sidebar unmounts', async () => {
    useAppStore.setState({ agentDashboardDrawerOpen: true })
    const { view } = renderHost()
    act(() => view.unmount())

    await waitFor(() => expect(useAppStore.getState().agentDashboardDrawerOpen).toBe(false))
  })
})
