// Ported from Orca (`renderer/src/components/sidebar/StatusIndicator.tsx`) — the
// plain status dot ladder the worktree/folder rows paint in the left lane:
// working spinner, monitoring icon, permission question, interrupted red dot,
// and the green/grey pair (`done`/`active` green, `inactive` grey).
import React from "react";
import { Activity, MessageCircleQuestion } from "lucide-react";
import { cn } from "../../lib/utils";
import type { WorktreeStatus } from "../../lib/worktree-status";
import { AgentWorkingSpinner } from "../AgentStateDot";

/** Orca's `STATUS_LABELS` (`lib/worktree-status.ts`). Kept local so this row does not
 * pull the whole worktree-status module graph (agent-title classifiers) into leaf
 * consumers and tests. */
const STATUS_LABEL: Partial<Record<WorktreeStatus, string>> = {
  active: "Active",
  working: "Working",
  monitoring: "Monitoring background tasks",
  permission: "Needs attention",
  interrupted: "Interrupted",
  done: "Done",
  inactive: "Inactive",
};

/** Statuses whose dot carries Orca's label tooltip. */
const HAS_LABEL: Partial<Record<WorktreeStatus, true>> = {
  working: true,
  monitoring: true,
  permission: true,
  interrupted: true,
  done: true,
};

export interface WorktreeStatusIndicatorProps {
  status: WorktreeStatus;
  className?: string;
  /** `false` keeps the dot decorative (rows that already carry the label). */
  showLabel?: boolean;
}

export function WorktreeStatusIndicator({
  status,
  className,
  showLabel = true,
}: WorktreeStatusIndicatorProps): React.JSX.Element {
  const label = showLabel && HAS_LABEL[status] ? STATUS_LABEL[status] : null;

  let indicator: React.JSX.Element;
  if (status === "working") {
    indicator = (
      <span className={cn("inline-flex size-3 shrink-0 items-center justify-center", className)}>
        <AgentWorkingSpinner className="size-2" />
      </span>
    );
  } else if (status === "monitoring") {
    indicator = (
      <span className={cn("inline-flex size-3 shrink-0 items-center justify-center", className)}>
        <Activity className="size-3 text-yellow-500" aria-hidden="true" />
      </span>
    );
  } else if (status === "interrupted") {
    indicator = (
      <span className={cn("inline-flex size-3 shrink-0 items-center justify-center", className)}>
        <span className="block size-1.5 rounded-full bg-red-500" />
      </span>
    );
  } else if (status === "permission") {
    indicator = (
      <span className={cn("inline-flex size-3 shrink-0 items-center justify-center", className)}>
        <MessageCircleQuestion className="size-3 text-amber-500" aria-hidden="true" />
      </span>
    );
  } else {
    indicator = (
      <span className={cn("inline-flex size-3 shrink-0 items-center justify-center", className)}>
        {/* Green covers hook-reported `done` and the heuristic `active` (terminal
            open, quiet); `inactive` stays grey — Orca StatusIndicator.tsx:82-105. */}
        <span
          className={cn(
            "block size-2 rounded-full",
            status === "done" || status === "active" ? "bg-emerald-500" : "bg-neutral-500/40"
          )}
        />
      </span>
    );
  }

  return (
    <span title={label ?? undefined} aria-label={label ?? undefined} role="img">
      {indicator}
    </span>
  );
}

export default WorktreeStatusIndicator;
