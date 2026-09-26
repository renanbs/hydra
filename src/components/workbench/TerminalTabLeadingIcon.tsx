// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Reference: src/renderer/src/components/tab-bar/TerminalTabLeadingIcon.tsx

import React from "react";
import { Bell } from "lucide-react";
import { AgentBrandIcon } from "../AgentIcon";
import { ShellIcon } from "./shell-icons";

export interface TerminalTabLeadingIconProps {
  agent: string | null;
  activityStatus?: string | null;
  shell?: string | null;
  showUnreadActivity?: boolean;
  isActive?: boolean;
}

export function TerminalTabAgentIdentityIcon({
  agent,
  isActive = true,
  className = "",
}: {
  agent: string;
  isActive?: boolean;
  className?: string;
}): React.JSX.Element {
  return (
    <span
      className={`inline-flex shrink-0 ${!isActive ? "opacity-70" : ""} ${className}`}
      data-agent-icon={agent}
      aria-hidden
    >
      <AgentBrandIcon agentId={agent} size={14} />
    </span>
  );
}

export function TerminalTabLeadingIcon({
  agent,
  activityStatus,
  shell,
  showUnreadActivity = false,
  isActive = true,
}: TerminalTabLeadingIconProps): React.JSX.Element {
  if (showUnreadActivity) {
    return (
      <span
        data-testid="tab-activity-bell"
        aria-label="Unread agent completion"
        className="mr-1 inline-flex shrink-0 items-center gap-1"
      >
        <Bell className="w-3 h-3 text-amber-500 fill-amber-500/30 drop-shadow-sm shrink-0" />
        {agent ? <TerminalTabAgentIdentityIcon agent={agent} isActive={isActive} /> : null}
      </span>
    );
  }

  // Active activity status: working / blocked / waiting / done
  if (activityStatus && activityStatus !== "idle" && activityStatus !== "unknown") {
    return (
      <span
        data-testid="tab-agent-activity-indicator"
        data-agent-activity-status={activityStatus}
        className="mr-1 inline-flex shrink-0 items-center gap-1"
      >
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${
            activityStatus === "working"
              ? "bg-amber-400 animate-pulse"
              : activityStatus === "blocked"
              ? "bg-red-400 ring-2 ring-red-500/30"
              : activityStatus === "waiting"
              ? "bg-orange-400 animate-pulse"
              : activityStatus === "done"
              ? "bg-blue-400"
              : "bg-emerald-400"
          }`}
          title={`Herdr State: ${activityStatus}`}
        />
        {agent ? <TerminalTabAgentIdentityIcon agent={agent} isActive={isActive} /> : null}
      </span>
    );
  }

  if (agent) {
    return (
      <TerminalTabAgentIdentityIcon agent={agent} isActive={isActive} className="mr-1 shrink-0" />
    );
  }

  return (
    <span
      className={`mr-1 inline-flex shrink-0 ${isActive ? "" : "opacity-70"}`}
      data-shell-icon={shell ?? "generic"}
      aria-hidden
    >
      <ShellIcon shell={shell} size={14} />
    </span>
  );
}
