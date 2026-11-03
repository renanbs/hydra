// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/dashboard/DashboardAgentRow.tsx
import React, { useState, useCallback } from "react";
import { cn } from "../../lib/utils";
import { AgentStateDot, type AgentDotState } from "../AgentStateDot";
import { AgentBrandIcon } from "../AgentIcon";
import { DashboardAgentChildDisclosure } from "./DashboardAgentChildDisclosure";
import { DashboardAgentRowToolStep } from "./DashboardAgentRowToolStep";
import { DashboardAgentRowMessage } from "./DashboardAgentRowMessage";
import type { DashboardAgentRowData } from "../sidebar/agent-status-types";

function formatTimeAgo(ts: number, now: number): string {
  const delta = Math.max(0, now - ts);
  if (delta < 60_000) return "just now";
  const mins = Math.floor(delta / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

type Props = {
  agent: DashboardAgentRowData;
  /** Navigate to this agent's tab; the card closes over its worktree. */
  onActivate: (sessionId: string) => void;
  /** Clears the row's agent status and retained snapshot. */
  onDismiss?: (paneKey: string) => void;
  now: number;
  /** Bold the prompt until the user visits its tab (Orca `isUnvisited`). */
  isUnvisited?: boolean;
  /** Inline card rows pass 'sm' so the dot reads apart from the agent icon. */
  stateDotSize?: "sm" | "md";
  /** Inline rows jump straight to the agent, so the expand chevron is redundant. */
  hideExpand?: boolean;
  isFocusedPane?: boolean;
  childAgentCount?: number;
  childAgentsExpanded?: boolean;
  onToggleChildAgents?: () => void;
  reserveDisclosureGutter?: boolean;
  hideLineageConnectors?: boolean;
  sendTargetStatus?: "eligible" | "disabled" | "sending";
  sendTargetDisabledReason?: string;
  onSendTargetClick?: (paneKey: string) => void;
};

export const DashboardAgentRow = React.memo(function DashboardAgentRow({
  agent,
  onActivate,
  onDismiss,
  now,
  isUnvisited = false,
  stateDotSize = "md",
  hideExpand = false,
  isFocusedPane = false,
  childAgentCount,
  childAgentsExpanded = false,
  onToggleChildAgents,
  reserveDisclosureGutter = false,
  hideLineageConnectors = false,
  sendTargetStatus,
  sendTargetDisabledReason,
  onSendTargetClick,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  const handleActivate = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onActivate(agent.entry.sessionId);
    },
    [onActivate, agent.entry.sessionId]
  );

  // Why: in send-target mode a row click picks the agent instead of navigating.
  const handleSendTargetClickCapture = useCallback(
    (e: React.MouseEvent) => {
      if (!sendTargetStatus) {
        return;
      }
      const target = e.target;
      if (
        target instanceof Element &&
        target.closest('button, a, input, textarea, select, [role="button"]')
      ) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      if (sendTargetStatus === "eligible") {
        onSendTargetClick?.(agent.paneKey);
      }
    },
    [agent.paneKey, onSendTargetClick, sendTargetStatus]
  );

  const handleDismiss = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDismiss?.(agent.paneKey);
    },
    [agent.paneKey, onDismiss]
  );

  const handleToggleExpanded = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded((prev) => !prev);
  }, []);

  const hasChildDisclosure =
    typeof childAgentCount === "number" &&
    childAgentCount > 0 &&
    typeof onToggleChildAgents === "function";

  const lineage = agent.lineage;
  const isLineageChild = lineage?.depth === 1;
  const lineageChildCount = lineage?.childCount ?? 0;
  const participatesInLineage = isLineageChild || lineageChildCount > 0;

  const dotState: AgentDotState =
    agent.entry.interrupted
      ? "interrupted"
      : agent.state === "working" && agent.entry.workingMode === "monitoring"
      ? "monitoring"
      : agent.state === "unknown"
      ? "unverifiable"
      : agent.state;

  const isWorking = agent.state === "working";
  const showsTool = Boolean(agent.entry.toolName && (agent.state === "working" || agent.state === "waiting"));
  const toolName = showsTool ? (agent.entry.toolName?.trim() ?? "") : "";
  const toolInput = showsTool ? (agent.entry.toolInput?.trim() ?? "") : "";
  const lastAssistantMessage = agent.entry.lastAssistantMessage?.trim() ?? "";

  const startedAt = agent.startedAt > 0 ? agent.startedAt : null;
  const timeAgo = startedAt ? formatTimeAgo(startedAt, now) : null;
  const displayLabel = agent.entry.prompt || agent.entry.agentName || "Agent session";

  return (
    <div
      onClick={handleActivate}
      onClickCapture={handleSendTargetClickCapture}
      className={cn(
        "group/agent-row relative flex flex-col py-1 transition-colors rounded-sm cursor-pointer select-none",
        isLineageChild ? "pl-5 pr-1.5" : "px-1.5",
        isFocusedPane
          ? "bg-neutral-800/80 text-white"
          : "hover:bg-neutral-800/50 text-neutral-300 hover:text-neutral-100"
      )}
      role={participatesInLineage ? "treeitem" : undefined}
      aria-level={participatesInLineage ? (lineage?.depth ?? 0) + 1 : undefined}
      title={sendTargetDisabledReason}
    >
      {/* Connector lines for tree hierarchy */}
      {lineageChildCount > 0 && !hideLineageConnectors ? (
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-[-0.5rem] left-[11px] top-[1rem] border-l-[1.5px] border-neutral-700"
        />
      ) : null}
      {isLineageChild && !hideLineageConnectors ? (
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-[-1px] left-[11px] top-[-1px] w-2.5"
        >
          <span
            className={cn(
              "absolute left-0 border-l-[1.5px] border-neutral-700",
              lineage?.isFirstSibling ? "top-[-0.75rem]" : "top-[-1px]",
              lineage?.isLastSibling
                ? lineage?.isFirstSibling
                  ? "h-[1.4rem]"
                  : "h-[calc(0.6rem+1px)]"
                : "bottom-[-1px]"
            )}
          />
          <span className="absolute left-0 top-[0.6rem] w-1.5 border-t-[1.5px] border-neutral-700" />
        </span>
      ) : null}

      <div className="flex items-center gap-1.5 min-w-0">
        <DashboardAgentChildDisclosure
          childAgentCount={childAgentCount}
          childAgentsExpanded={childAgentsExpanded}
          onToggleChildAgents={onToggleChildAgents}
          reserveDisclosureGutter={reserveDisclosureGutter}
        />

        <AgentStateDot state={dotState} size={stateDotSize} />

        {agent.rowSource !== "subagent" && (
          <span className="inline-flex shrink-0">
            <AgentBrandIcon agentId={agent.agentType || agent.entry.agentName || "agent"} size={13} />
          </span>
        )}

        <span
          className={cn(
            "block min-w-0 flex-1 overflow-hidden truncate text-[11px] leading-snug",
            isUnvisited
              ? "font-semibold text-neutral-100"
              : isFocusedPane
                ? "font-normal text-neutral-200"
                : "font-normal text-neutral-300"
          )}
          title={displayLabel}
        >
          {displayLabel}
        </span>

        {/* Collapsed child count badge */}
        {hasChildDisclosure && !childAgentsExpanded && (
          <span className="shrink-0 text-[10px] font-mono text-neutral-500">
            +{childAgentCount}
          </span>
        )}

        {onDismiss && agent.rowSource !== "subagent" && (
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss agent"
            className="shrink-0 rounded p-0.5 text-neutral-500 opacity-0 transition-opacity hover:text-neutral-200 focus-visible:opacity-100 group-hover/agent-row:opacity-100"
          >
            <span aria-hidden>×</span>
          </button>
        )}

        {timeAgo && (
          <span
            className={cn(
              "shrink-0 text-[10px] text-neutral-500 font-mono transition-colors",
              hideExpand ? "" : "cursor-pointer hover:text-neutral-300"
            )}
            onClick={hideExpand ? undefined : handleToggleExpanded}
            title={hideExpand ? undefined : expanded ? "Collapse details" : "Expand details"}
          >
            {timeAgo}
          </span>
        )}
      </div>

      <DashboardAgentRowToolStep
        expanded={expanded}
        showsTool={showsTool}
        reservesHeight={isWorking}
        toolName={toolName}
        toolInput={toolInput}
      />

      <DashboardAgentRowMessage
        expanded={expanded}
        isInterrupted={agent.entry.interrupted}
        lastAssistantMessage={lastAssistantMessage}
      />
    </div>
  );
});
