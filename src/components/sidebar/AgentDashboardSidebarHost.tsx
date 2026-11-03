// Ported from Orca `components/sidebar/AgentDashboardSidebarHost.tsx`.
//
// Why this coordination lives outside the drawer: the drawer only knows its own open
// flag. The sidebar and the Workspace Board are separate surfaces, and this host is
// the one place that sees all three and enforces their exclusivity.
import type React from 'react'
import { useEffect } from 'react'
import type { HydraProject, WorktreeSession } from './types'
import type { HydraSettings } from '../../shared/settings-types'
import { readSidebarUiState, useSidebarUiStore } from './sidebar-ui-store'
import { AgentDashboardDrawer } from '../dashboard/AgentDashboardDrawer'

export type AgentDashboardSidebarHostProps = {
  /** False when the sidebar is collapsed; the drawer is mounted only while it is true. */
  sidebarOpen: boolean
  /** The Workspace Board's open flag; the two companion panels never coexist. */
  workspaceBoardOpen: boolean
  closeWorkspaceBoard: () => void
  sessions: readonly WorktreeSession[]
  projects: readonly HydraProject[]
  sidebarRef: React.RefObject<HTMLElement | null>
  onSelectSession: (id: string) => void
  settings?: HydraSettings | null
}

export function AgentDashboardSidebarHost({
  sidebarOpen,
  workspaceBoardOpen,
  closeWorkspaceBoard,
  sessions,
  projects,
  sidebarRef,
  onSelectSession,
  settings,
}: AgentDashboardSidebarHostProps): React.JSX.Element | null {
  const drawerOpen = useSidebarUiStore((state) => state.agentDashboardDrawerOpen)
  const setDrawerOpen = useSidebarUiStore((state) => state.setAgentDashboardDrawerOpen)

  useEffect(() => {
    if (!sidebarOpen && drawerOpen) {
      setDrawerOpen(false)
    }
  }, [drawerOpen, setDrawerOpen, sidebarOpen])

  useEffect(() => {
    if (drawerOpen) {
      closeWorkspaceBoard()
    }
  }, [closeWorkspaceBoard, drawerOpen])

  useEffect(() => {
    if (workspaceBoardOpen) {
      setDrawerOpen(false)
    }
  }, [setDrawerOpen, workspaceBoardOpen])

  // Why: Hydra closes the sidebar by unmounting it (no persistent host), so the
  // sidebarOpen effect above may never see the transition. Closing on unmount is
  // what keeps a hidden drawer from reopening with the sidebar.
  useEffect(
    () => () => {
      if (readSidebarUiState().agentDashboardDrawerOpen) {
        setDrawerOpen(false)
      }
    },
    [setDrawerOpen]
  )

  return sidebarOpen ? (
    <AgentDashboardDrawer
      sessions={sessions}
      projects={projects}
      sidebarRef={sidebarRef}
      onSelectSession={onSelectSession}
      settings={settings}
    />
  ) : null
}
