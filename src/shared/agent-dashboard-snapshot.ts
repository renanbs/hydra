// Serializable shape published from the main window to the Agent Dashboard pop-out.
// The pop-out has its own store, so everything it renders must be plain data — no
// store slices, Maps or class instances cross the Tauri event boundary.
import type { DashboardBucket } from './dashboard-buckets'

/** Row states the dashboard renders; mirrors `AgentRowState` without importing lib/. */
export type AgentDashboardRowState =
  | 'working'
  | 'blocked'
  | 'waiting'
  | 'done'
  | 'idle'
  | 'unverifiable'

export type AgentDashboardPopoutRow = {
  paneKey: string
  /** Backing workbench/daemon session; absent means the row is inert. */
  sessionId?: string
  title: string
  agentType: string
  state: AgentDashboardRowState
  bucket: DashboardBucket
  worktreePath: string
  projectName: string
  branch: string
  updatedAt: number
  /** A completed turn the user has not visited yet. */
  unread: boolean
}

export type AgentDashboardPopoutSnapshot = {
  rows: AgentDashboardPopoutRow[]
  /** Epoch ms the snapshot was built in the main window. */
  generatedAt: number
}

export function isAgentDashboardPopoutSnapshot(
  value: unknown
): value is AgentDashboardPopoutSnapshot {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const candidate = value as Partial<AgentDashboardPopoutSnapshot>
  return Array.isArray(candidate.rows) && typeof candidate.generatedAt === 'number'
}
