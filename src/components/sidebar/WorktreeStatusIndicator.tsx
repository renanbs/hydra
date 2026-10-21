// Ported from Orca (`renderer/src/components/sidebar/StatusIndicator.tsx`) — the
// plain status dot ladder the worktree/folder rows paint in the left lane:
// working spinner, monitoring icon, permission question, interrupted red dot,
// and the green/grey pair (`done`/`active` green, `inactive` grey).
import React from "react";
import { Activity } from "lucide-react";
import { cn } from "../../lib/utils";
import { translate } from "../../i18n/i18n";
import type { WorktreeStatus } from "../../lib/worktree-status";
import { AgentQuestionIcon } from "../AgentQuestionIcon";
import { AgentWorkingSpinner } from "../AgentStateDot";

/** Orca's `STATUS_LABELS` (`lib/worktree-status.ts`), localized: the sidebar is
 *  translated, so the tooltip/aria label follows the UI locale. Kept local (with the
 *  inline English fallback) so this leaf row does not pull the whole worktree-status
 *  module graph (agent-title classifiers) into consumers and tests.
 *
 *  Orca only labels the agent-derived states; the passive `active`/`inactive` stay
 *  decorative, so they are absent here rather than carrying an empty label. */
const LABEL_BY_STATUS: Partial<Record<WorktreeStatus, { key: string; fallback: string }>> = {
  working: { key: "components.worktreeStatusIndicator.working", fallback: "Working" },
  monitoring: {
    key: "components.worktreeStatusIndicator.monitoring",
    fallback: "Monitoring background tasks",
  },
  permission: { key: "components.worktreeStatusIndicator.permission", fallback: "Needs attention" },
  interrupted: {
    key: "components.worktreeStatusIndicator.interrupted",
    fallback: "Interrupted",
  },
  done: { key: "components.worktreeStatusIndicator.done", fallback: "Done" },
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
  const labelEntry = showLabel ? LABEL_BY_STATUS[status] : undefined;
  const label = labelEntry ? translate(labelEntry.key, labelEntry.fallback) : null;

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
        <AgentQuestionIcon className="size-3" />
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
