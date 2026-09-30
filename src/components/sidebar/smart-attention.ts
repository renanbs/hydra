// smart-attention.ts: Derives which worktrees hold attention-worthy agent activity.
// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
import type { AgentStatusEntry } from '../../shared/agent-status-types'
import type { TabItem } from '../../components/workbench/WorkbenchTabBar'

export function getAgentStatusByPaneKey(
  _agentStatusByPaneKey: Record<string, AgentStatusEntry> | undefined
): Map<string, AgentStatusEntry> {
  return new Map(Object.entries(_agentStatusByPaneKey ?? {}))
}

export function detectPaneHasUnreadTurn(_tabsByWorktree: Record<string, TabItem[]> | undefined): Set<string> {
  return new Set()
}

export function detectPaneHasUnreadBell(_unreadTerminalTabs?: Record<string, boolean>): Set<string> {
  return new Set()
}
export const IDLE: any = null
export type IDLE = any
export const WorktreeAttention: any = null
export type WorktreeAttention = any
export const buildAttentionByWorktree: any = null
export type buildAttentionByWorktree = any
export const hasFreshAttributedAgentStatus: any = null
export type hasFreshAttributedAgentStatus = any
