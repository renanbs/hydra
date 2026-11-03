import { describe, expect, it, vi } from 'vitest'
import { runAgentDashboardEntryCommand } from './agent-dashboard-entry-command'

describe('runAgentDashboardEntryCommand (D01-028)', () => {
  it('toggles the in-window drawer', () => {
    const setDrawerOpen = vi.fn()
    runAgentDashboardEntryCommand({
      mode: 'in-window',
      drawerOpen: false,
      openPopout: vi.fn(async () => 'opened' as const),
      setDrawerOpen,
    })
    expect(setDrawerOpen).toHaveBeenCalledWith(true)

    runAgentDashboardEntryCommand({
      mode: undefined,
      drawerOpen: true,
      openPopout: vi.fn(async () => 'opened' as const),
      setDrawerOpen,
    })
    expect(setDrawerOpen).toHaveBeenLastCalledWith(false)
  })

  it('opens the pop-out without touching the drawer when the window opens', async () => {
    const setDrawerOpen = vi.fn()
    const openPopout = vi.fn(async () => 'opened' as const)

    runAgentDashboardEntryCommand({
      mode: 'popout',
      drawerOpen: false,
      openPopout,
      setDrawerOpen,
    })

    await vi.waitFor(() => expect(openPopout).toHaveBeenCalledOnce())
    expect(setDrawerOpen).not.toHaveBeenCalled()
  })

  it('falls back to the drawer when the pop-out is unavailable', async () => {
    const setDrawerOpen = vi.fn()

    runAgentDashboardEntryCommand({
      mode: 'popout',
      drawerOpen: false,
      openPopout: vi.fn(async () => 'unavailable' as const),
      setDrawerOpen,
    })

    await vi.waitFor(() => expect(setDrawerOpen).toHaveBeenCalledWith(true))
  })
})
