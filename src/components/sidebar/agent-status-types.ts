// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Shared agent status types for inline agent rows, lineage trees, and dashboard views.

import type { AgentStateHistoryEntry } from '../../shared/agent-status-types'

export const AGENT_STATUS_STATES = [
  "working",
  "blocked",
  "waiting",
  "done",
  "idle",
  "unknown",
] as const;

export type AgentStatusState = (typeof AGENT_STATUS_STATES)[number];

export type AgentSubagentState =
  | "working"
  | "blocked"
  | "waiting"
  | "idle"
  | "done"
  | "unverifiable";

export interface AgentSubagentSnapshot {
  id: string;
  agentType?: string;
  model?: string;
  description?: string;
  state: AgentSubagentState;
  startedAt: number;
}

export interface AgentStatusOrchestrationContext {
  taskId?: string;
  dispatchId?: string;
  taskTitle?: string;
  displayName?: string;
  parentTerminalHandle?: string;
  parentPaneKey?: string;
  coordinatorHandle?: string;
}

export interface AgentStatusEntry {
  paneKey: string;
  sessionId: string;
  worktreePath?: string;
  state: AgentStatusState;
  workingMode?: "monitoring";
  prompt: string;
  updatedAt: number;
  stateStartedAt: number;
  agentName?: string;
  agentType?: string;
  model?: string;
  toolName?: string;
  toolInput?: string;
  lastAssistantMessage?: string;
  interrupted?: boolean;
  /** Rolling log of previous states, used to resolve the real completion behind a session-boundary `done`. */
  stateHistory?: AgentStateHistoryEntry[];
  /** True when this `done` is a session boundary, not a completed turn. */
  sessionBoundary?: boolean;
  /** Timestamp (ms) the reported evidence was first observed; falls back to `updatedAt` when absent. */
  evidenceObservedAt?: number;
  orchestration?: AgentStatusOrchestrationContext;
  subagents?: AgentSubagentSnapshot[];
}

export interface AgentLineageMetadata {
  depth: number;
  isFirstSibling: boolean;
  isLastSibling: boolean;
  childCount: number;
}

export interface DashboardAgentRowData {
  paneKey: string;
  tabId: string;
  activationPaneKey?: string;
  startedAt: number;
  state: AgentStatusState;
  agentType?: string;
  entry: AgentStatusEntry;
  rowSource?: "session" | "subagent";
  lineage?: AgentLineageMetadata;
}
