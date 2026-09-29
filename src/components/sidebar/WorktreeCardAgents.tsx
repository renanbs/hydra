// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Inline agent list rendered inside WorktreeCard showing active tools and subagent trees.

import React, { useMemo, useState, useEffect, useCallback } from "react";
import { DashboardAgentRow } from "../dashboard/DashboardAgentRow";
import { buildAgentRowLineageTree } from "./agent-row-lineage-model";
import { isShellProcess } from "../workbench/tab-agent";
import type { DashboardAgentRowData } from "./agent-status-types";
import type { WorktreeSession } from "./types";

interface WorktreeCardAgentsProps {
  worktreePath: string;
  sessions: WorktreeSession[];
  onSelectSession: (id: string) => void;
  activeSessionId?: string | null;
  className?: string;
}

export const WorktreeCardAgents = React.memo(function WorktreeCardAgents({
  worktreePath: _worktreePath,
  sessions,
  onSelectSession,
  activeSessionId,
  className,
}: WorktreeCardAgentsProps) {
  // Mount timer only if there are active sessions
  const [now, setNow] = useState(() => Date.now());
  const [expandedCoordinators, setExpandedCoordinators] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (sessions.length === 0) return;
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 20_000);
    return () => clearInterval(interval);
  }, [sessions.length]);

  const toggleCoordinator = useCallback((key: string) => {
    setExpandedCoordinators((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }, []);

  // Convert WorktreeSession[] to DashboardAgentRowData[]
  const agentRows: DashboardAgentRowData[] = useMemo(() => {
    const list: DashboardAgentRowData[] = [];

    for (const session of sessions) {
      if (isShellProcess(session.agentName || session.executable)) {
        continue;
      }
      const paneKey = session.id;
      const startedAt = session.state_started_at ?? session.created_at ?? Date.now();

      // Root row for session
      const rootRow: DashboardAgentRowData = {
        paneKey,
        tabId: session.id,
        activationPaneKey: session.id,
        startedAt,
        state: session.state,
        agentType: session.agentName || session.executable,
        rowSource: "session",
        entry: {
          paneKey,
          sessionId: session.id,
          worktreePath: session.project_path,
          state: session.state,
          prompt: session.title,
          updatedAt: session.updated_at ?? Date.now(),
          stateStartedAt: startedAt,
          agentName: session.agentName,
          toolName: session.tool_name,
          toolInput: session.tool_input,
          lastAssistantMessage: session.last_assistant_message,
          orchestration: {
            parentPaneKey: session.parent_pane_key,
            coordinatorHandle: session.coordinator_handle,
          },
          subagents: session.subagents,
        },
      };
      list.push(rootRow);

      // In-process subagents attached to this session
      const subagents = session.subagents;
      if (Array.isArray(subagents)) {
        for (const sub of subagents) {
          list.push({
            paneKey: `${session.id}_${sub.id}`,
            tabId: session.id,
            activationPaneKey: session.id,
            startedAt: sub.startedAt,
            state: sub.state === "unverifiable" ? "unknown" : sub.state,
            agentType: sub.agentType,
            rowSource: "subagent",
            entry: {
              paneKey: `${session.id}_${sub.id}`,
              sessionId: session.id,
              worktreePath: session.project_path,
              state: sub.state === "unverifiable" ? "unknown" : sub.state,
              prompt: sub.description || `${sub.agentType || "Subagent"} (${sub.id})`,
              updatedAt: Date.now(),
              stateStartedAt: sub.startedAt,
              agentName: sub.agentType,
              orchestration: {
                parentPaneKey: session.id,
              },
            },
          });
        }
      }
    }

    return list;
  }, [sessions]);

  // Build hierarchical lineage tree
  const lineageTree = useMemo(() => {
    return buildAgentRowLineageTree(agentRows);
  }, [agentRows]);

  if (agentRows.length === 0) {
    return null;
  }

  const { rootRows, childrenByParentPaneKey } = lineageTree;

  return (
    <div
      data-worktree-card-agents=""
      onClick={(e) => e.stopPropagation()}
      className={`mt-0.5 flex flex-col gap-0.5 ${className ?? ""}`}
    >
      {rootRows.map((rootRow) => {
        const childRows = childrenByParentPaneKey.get(rootRow.paneKey) ?? [];
        const hasChildren = childRows.length > 0;
        const isExpanded = expandedCoordinators[rootRow.paneKey] ?? false;

        const rootLineage = hasChildren
          ? {
              depth: 0,
              isFirstSibling: true,
              isLastSibling: true,
              childCount: childRows.length,
            }
          : undefined;

        return (
          <React.Fragment key={rootRow.paneKey}>
            <DashboardAgentRow
              agent={{ ...rootRow, lineage: rootLineage }}
              onActivate={onSelectSession}
              now={now}
              isFocusedPane={rootRow.entry.sessionId === activeSessionId}
              childAgentCount={childRows.length}
              childAgentsExpanded={isExpanded}
              onToggleChildAgents={hasChildren ? () => toggleCoordinator(rootRow.paneKey) : undefined}
            />

            {/* Render indented child rows when coordinator is expanded */}
            {hasChildren && isExpanded && (
              <div data-agent-lineage-children="" className="worktree-agent-lineage-children ml-3 pl-1.5 border-l border-neutral-700/50 flex flex-col gap-0.5">
                {childRows.map((childRow, idx) => {
                  const isFirst = idx === 0;
                  const isLast = idx === childRows.length - 1;

                  return (
                    <DashboardAgentRow
                      key={childRow.paneKey}
                      agent={{
                        ...childRow,
                        lineage: {
                          depth: 1,
                          isFirstSibling: isFirst,
                          isLastSibling: isLast,
                          childCount: 0,
                        },
                      }}
                      onActivate={onSelectSession}
                      now={now}
                      isFocusedPane={childRow.entry.sessionId === activeSessionId}
                      hideLineageConnectors={false}
                    />
                  );
                })}
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
});
