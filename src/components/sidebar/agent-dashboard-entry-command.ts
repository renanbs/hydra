import type { AgentDashboardPopoutOpenResult } from '../../lib/agent-dashboard-popout'

export type AgentDashboardEntryMode = 'in-window' | 'popout' | undefined

export type AgentDashboardEntryCommandInput = {
  mode: AgentDashboardEntryMode
  drawerOpen: boolean
  openPopout: () => Promise<AgentDashboardPopoutOpenResult>
  setDrawerOpen: (open: boolean) => void
}

/**
 * The entry's single click rule: pop-out mode hands the surface to a second window;
 * every other mode toggles the in-window drawer. When the pop-out cannot be created
 * (browser preview, denied window permission) the drawer opens instead — the click
 * never becomes a no-op.
 */
export function runAgentDashboardEntryCommand(input: AgentDashboardEntryCommandInput): void {
  if (input.mode === 'popout') {
    void input.openPopout().then((result) => {
      if (result === 'unavailable') {
        input.setDrawerOpen(true)
      }
    })
    return
  }
  input.setDrawerOpen(!input.drawerOpen)
}
