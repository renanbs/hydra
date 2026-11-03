// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/WorktreeCardAgents.tsx
// Inline agent list rendered inside WorktreeCard showing active tools and subagent trees.

import React, { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { isShellProcess, normalizeAgentId } from "../workbench/tab-agent";
import { WorktreeCompactAgentsList } from "./worktree-card-compact-agents";
import { useWorktreeAgentRows } from "./use-worktree-agent-rows";
import { useAppStore } from "../../store";
import { selectAcknowledgedAgentTimes } from "./worktree-card-agent-ack-inputs";
import { useFocusedAgentPaneKey } from "./focused-agent-row-highlight";
import type { AgentRow } from "./worktree-card-agent-summary";
import type { WorktreeAgentRowWithLineage } from "./worktree-agent-row-types";
import type {
  AgentStatusEntry,
  AgentStatusState,
  AgentSubagentSnapshot
} from "../../shared/agent-status-types";
import type { TerminalTab } from "../../shared/terminal-tab-types";
import type { WorktreeSession } from "./types";

interface WorktreeCardAgentsProps {
  worktreePath: string;
  sessions?: WorktreeSession[];
  onSelectSession: (id: string) => void;
  activeSessionId?: string | null;
  className?: string;
}

const IS_TERMINAL_STATE: Record<string, true> = {
  working: true,
  blocked: true,
  waiting: true,
  done: true
};

function sessionRowState(state: WorktreeSession["state"]): AgentStatusState | "idle" {
  return state === "working" || state === "blocked" || state === "waiting" || state === "done"
    ? state
    : "idle";
}

/** Daemon sessions still carry the legacy child-state union (`done` included); the
 *  canonical snapshot model only knows live child states, so a settled child reads idle. */
function toSharedSubagents(
  subagents: WorktreeSession["subagents"]
): AgentSubagentSnapshot[] | undefined {
  if (!subagents || subagents.length === 0) {
    return undefined;
  }
  return subagents.map((subagent) => ({
    id: subagent.id,
    agentType: subagent.agentType,
    model: subagent.model,
    description: subagent.description,
    state: subagent.state === "done" ? "idle" : subagent.state,
    startedAt: subagent.startedAt
  }));
}

/** A headless daemon session with no workbench tab is still a live agent row.
 *  Why entry.state is the narrow hook union: the row's `state` carries the richer
 *  daemon state; the entry only needs to satisfy the status model. */
function sessionAgentRow(session: WorktreeSession): AgentRow {
  const startedAt = session.state_started_at ?? session.created_at ?? Date.now();
  const rowState = sessionRowState(session.state);
  const subagents = toSharedSubagents(session.subagents);
  const tab: TerminalTab & { sessionId?: string } = {
    id: session.id,
    ptyId: null,
    worktreeId: session.project_path,
    title: session.title,
    customTitle: null,
    color: null,
    sortOrder: Number.MAX_SAFE_INTEGER,
    createdAt: startedAt,
    sessionId: session.id
  };
  const entry: AgentStatusEntry = {
    paneKey: session.id,
    state: IS_TERMINAL_STATE[rowState] === true ? (rowState as AgentStatusState) : "done",
    prompt: session.title,
    updatedAt: session.updated_at ?? Date.now(),
    stateStartedAt: startedAt,
    stateHistory: [],
    agentType: session.agentName || session.executable,
    toolName: session.tool_name,
    toolInput: session.tool_input,
    lastAssistantMessage: session.last_assistant_message,
    ...(session.parent_pane_key || session.coordinator_handle
      ? {
          orchestration: {
            taskId: session.id,
            dispatchId: session.id,
            parentPaneKey: session.parent_pane_key,
            coordinatorHandle: session.coordinator_handle
          }
        }
      : {}),
    ...(subagents ? { subagents } : {})
  };
  return {
    paneKey: session.id,
    entry,
    tab,
    agentType: normalizeAgentId(session.agentName || session.executable),
    displayAgent: session.agentName || session.executable,
    rowSource: "live",
    state: rowState,
    startedAt,
    sessionId: session.id,
    prompt: session.title
  };
}

function rowKeySet(rows: readonly AgentRow[]): Set<string> {
  const keys = new Set<string>();
  for (const row of rows) {
    keys.add(row.paneKey);
    keys.add(row.tab?.id ?? "");
    if (row.sessionId) {
      keys.add(row.sessionId);
    }
    if (row.tab && (row.tab as TerminalTab & { sessionId?: string }).sessionId) {
      keys.add((row.tab as TerminalTab & { sessionId?: string }).sessionId as string);
    }
  }
  return keys;
}

/** Enriches pipeline rows with the UI-only fields the compact list reads:
 *  session activation, subagent disclosure counts. */
function toAgentRows(
  rows: WorktreeAgentRowWithLineage[],
  sessions: WorktreeSession[]
): AgentRow[] {
  const covered = rowKeySet(rows);
  const childCountByParent = new Map<string, number>();
  for (const row of rows) {
    const parent = row.lineage?.parentPaneKey;
    if (parent) {
      childCountByParent.set(parent, (childCountByParent.get(parent) ?? 0) + 1);
    }
  }

  const pipelineRows: AgentRow[] = rows.map((row) => ({
    ...row,
    displayAgent: row.entry.agentType ?? row.agentType,
    terminalTitle: row.entry.terminalTitle ?? row.tab.title,
    isDerivedFromTitle:
      row.entry.observation?.origin === "title" || row.startedAt === 0,
    childAgentCount: childCountByParent.get(row.paneKey) ?? undefined
  }));

  const headlessRows = sessions
    .filter(
      (session) =>
        !covered.has(session.id) &&
        !isShellProcess(session.agentName || session.executable)
    )
    .map(sessionAgentRow);

  if (headlessRows.length === 0) {
    return pipelineRows;
  }
  return [...pipelineRows, ...headlessRows];
}

export const WorktreeCardAgents = React.memo(function WorktreeCardAgents({
  worktreePath,
  sessions = [],
  onSelectSession,
  activeSessionId,
  className,
}: WorktreeCardAgentsProps) {
  const rows = useWorktreeAgentRows(worktreePath, true);

  const agentRows = useMemo(() => toAgentRows(rows, sessions), [rows, sessions]);
  const focusedAgentPaneKey = useFocusedAgentPaneKey(worktreePath);
  // Why: acknowledgement writes are app-global; project only this card's rows so
  // unrelated worktree activity does not rerender every agent body.
  const acknowledgedAgentTimes = useAppStore(
    useShallow((s) => selectAcknowledgedAgentTimes(s, agentRows))
  );
  const unvisitedByPaneKey = useMemo(() => {
    const out: Record<string, boolean> = {};
    for (const [index, agent] of agentRows.entries()) {
      const ackAt = acknowledgedAgentTimes[index] ?? 0;
      out[agent.paneKey] = ackAt < agent.entry.stateStartedAt;
    }
    return out;
  }, [agentRows, acknowledgedAgentTimes]);

  if (agentRows.length === 0) {
    return null;
  }

  return (
    <WorktreeCompactAgentsList
      worktreePath={worktreePath}
      agents={agentRows}
      onSelectSession={onSelectSession}
      activeSessionId={activeSessionId}
      focusedAgentPaneKey={focusedAgentPaneKey}
      unvisitedByPaneKey={unvisitedByPaneKey}
      className={className}
    />
  );
});
