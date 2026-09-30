// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Inline agent list rendered inside WorktreeCard showing active tools and subagent trees.

import React, { useMemo } from "react";
import { useAppStore, EMPTY_TABS } from "../../store/index";
import { detectAgentStatusFromTitle, getAgentLabelFromTitle } from "../../lib/agent-title-detection";
import { isShellProcess, normalizeAgentId } from "../workbench/tab-agent";
import { WorktreeCompactAgentsList } from "./worktree-card-compact-agents";
import type { AgentRow } from "./worktree-card-agent-summary";
import type { WorktreeSession } from "./types";

interface WorktreeCardAgentsProps {
  worktreePath: string;
  sessions?: WorktreeSession[];
  onSelectSession: (id: string) => void;
  activeSessionId?: string | null;
  className?: string;
}

export const WorktreeCardAgents = React.memo(function WorktreeCardAgents({
  worktreePath,
  sessions = [],
  onSelectSession,
  activeSessionId,
}: WorktreeCardAgentsProps) {
  // Subscribe to live workbench tabs in this worktree from Zustand store
  const tabsInWorktree = useAppStore((s) => s.tabsByWorktree[worktreePath] ?? EMPTY_TABS);
  const agentStatusByPaneKey = useAppStore((s) => s.agentStatusByPaneKey);

  // Orca parity: Agent rows are primarily bound 1:1 to the tabs open in THIS worktree!
  const agentRows: AgentRow[] = useMemo(() => {
    const list: AgentRow[] = [];
    const seenTabIds = new Set<string>();
    const seenSessionIds = new Set<string>();

    // 1. Process active workbench tabs in this worktree
    for (const tab of tabsInWorktree) {
      if (seenTabIds.has(tab.id)) continue;
      seenTabIds.add(tab.id);

      // Match against backing session if exists
      const backingSession = sessions.find(
        (s) => (tab.sessionId && s.id === tab.sessionId) || s.id === tab.id
      );

      if (backingSession) {
        seenSessionIds.add(backingSession.id);
      }
      if (tab.sessionId) {
        seenSessionIds.add(tab.sessionId);
      }

      // Check if this tab is an agent (explicit tab agent, backing session agent, or title-derived)
      const tabAgentName = tab.agentName || tab.agentId;
      const sessionAgentName = backingSession?.agentName;
      const titleAgentName = getAgentLabelFromTitle(tab.title);

      const resolvedAgentType =
        (tabAgentName && !isShellProcess(tabAgentName) ? tabAgentName : null) ||
        (sessionAgentName && !isShellProcess(sessionAgentName) ? sessionAgentName : null) ||
        titleAgentName;

      // Plain shell terminals are NOT agents (Orca parity)
      if (!resolvedAgentType || isShellProcess(resolvedAgentType)) {
        continue;
      }

      const canonicalAgent = normalizeAgentId(resolvedAgentType);
      const liveStatus =
        agentStatusByPaneKey[tab.id]?.state ||
        (tab.sessionId ? agentStatusByPaneKey[tab.sessionId]?.state : undefined) ||
        (backingSession ? backingSession.state : undefined) ||
        detectAgentStatusFromTitle(tab.title) ||
        "idle";

      const prompt =
        (tab.title && tab.title !== resolvedAgentType ? tab.title : backingSession?.title) ||
        tab.title ||
        resolvedAgentType;

      const startedAt =
        backingSession?.state_started_at ?? backingSession?.created_at ?? Date.now();

      const activationId = tab.sessionId || tab.id;

      const row: AgentRow = {
        paneKey: activationId,
        agentType: canonicalAgent,
        displayAgent: resolvedAgentType,
        status: liveStatus,
        state: liveStatus,
        startedAt,
        prompt,
        rowSource: backingSession ? "session" : "live",
        entry: {
          paneKey: activationId,
          sessionId: activationId,
          worktreePath,
          state: liveStatus,
          prompt,
          updatedAt: backingSession?.updated_at ?? Date.now(),
          stateStartedAt: startedAt,
          agentType: resolvedAgentType,
          toolName: backingSession?.tool_name,
          toolInput: backingSession?.tool_input,
          lastAssistantMessage: backingSession?.last_assistant_message,
        },
      };

      if (backingSession?.subagents && backingSession.subagents.length > 0) {
        row.childAgentCount = backingSession.subagents.length;
      }

      list.push(row);
    }

    // 2. Headless background sessions in this worktree without a UI tab
    // (Only actively working background agents, never dead historical records)
    for (const session of sessions) {
      if (
        seenSessionIds.has(session.id) ||
        seenTabIds.has(session.id) ||
        isShellProcess(session.agentName || session.executable)
      ) {
        continue;
      }

      // Only display unattached sessions if they are actively working
      if (session.state !== "working" && session.state !== "blocked" && session.state !== "waiting") {
        continue;
      }

      const canonicalAgent = normalizeAgentId(session.agentName || session.executable);
      const startedAt = session.state_started_at ?? session.created_at ?? Date.now();
      const liveStatus = agentStatusByPaneKey[session.id]?.state ?? session.state;

      list.push({
        paneKey: session.id,
        agentType: canonicalAgent,
        displayAgent: session.agentName || session.executable,
        status: liveStatus,
        state: liveStatus,
        startedAt,
        prompt: session.title,
        rowSource: "session",
        entry: {
          paneKey: session.id,
          sessionId: session.id,
          worktreePath: session.project_path,
          state: liveStatus,
          prompt: session.title,
          updatedAt: session.updated_at ?? Date.now(),
          stateStartedAt: startedAt,
          agentType: session.agentName,
          toolName: session.tool_name,
          toolInput: session.tool_input,
          lastAssistantMessage: session.last_assistant_message,
        },
      });
    }

    // Orca parity: Consolidate multiple tabs of the same agent into a single representative row!
    // Opening multiple tabs of OMP or Claude in the same worktree represents that agent once in the sidebar.
    const consolidatedByAgent = new Map<string, AgentRow>();

    for (const row of list) {
      const agentKey = row.agentType || "unknown";
      const existing = consolidatedByAgent.get(agentKey);
      if (!existing) {
        consolidatedByAgent.set(agentKey, row);
        continue;
      }

      // Status priority: active work outranks idle
      const priorityOrder = (st?: string) => {
        if (st === "blocked" || st === "waiting") return 0;
        if (st === "working") return 1;
        if (st === "done") return 2;
        if (st === "idle") return 3;
        return 4;
      };

      const existingPrio = priorityOrder(existing.status);
      const newPrio = priorityOrder(row.status);

      if (newPrio < existingPrio) {
        consolidatedByAgent.set(agentKey, row);
      } else if (newPrio === existingPrio) {
        const isNewDescriptive = Boolean(row.prompt && row.prompt !== row.agentType && row.prompt !== row.displayAgent);
        const isExistingGeneric = !existing.prompt || existing.prompt === existing.agentType || existing.prompt === existing.displayAgent;
        if (isNewDescriptive && isExistingGeneric) {
          consolidatedByAgent.set(agentKey, row);
        }
      }
    }

    return Array.from(consolidatedByAgent.values());
  }, [sessions, tabsInWorktree, agentStatusByPaneKey, worktreePath]);

  if (agentRows.length === 0) {
    return null;
  }

  return (
    <WorktreeCompactAgentsList
      worktreePath={worktreePath}
      agents={agentRows}
      onSelectSession={onSelectSession}
      activeSessionId={activeSessionId}
    />
  );
});
