// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
import React from "react";
import { Activity, CircleCheck, CircleDashed, MessageCircleQuestion } from "lucide-react";
import { cn } from "../lib/utils";

export type AgentDotState =
  | "working"
  | "monitoring"
  | "blocked"
  | "waiting"
  | "interrupted"
  | "failed"
  | "done"
  | "idle"
  | "unverifiable"
  | "permission";

export function agentStateLabel(state: AgentDotState): string {
  switch (state) {
    case "working":
      return "Working";
    case "monitoring":
      return "Monitoring background tasks";
    case "blocked":
      return "Blocked";
    case "waiting":
      return "Waiting for input";
    case "interrupted":
      return "Interrupted";
    case "failed":
      return "Failed";
    case "done":
      return "Done";
    case "idle":
      return "Idle";
    case "unverifiable":
      return "No recent update";
    case "permission":
      return "Needs attention";
  }
}

export function AgentWorkingSpinner({ className }: { className?: string }): React.JSX.Element {
  return (
    <span
      className={cn(
        "inline-block rounded-full border-2 border-yellow-500 border-t-transparent animate-spin motion-reduce:animate-none motion-reduce:border-t-yellow-500",
        className
      )}
      aria-hidden="true"
    />
  );
}

type AgentStateDotProps = {
  state: AgentDotState;
  size?: "sm" | "md";
  className?: string;
  title?: string | null;
};

export const AgentStateDot = React.memo(function AgentStateDot({
  state,
  size = "sm",
  className,
  title,
}: AgentStateDotProps): React.JSX.Element {
  const box = size === "md" ? "h-3 w-3" : "h-2.5 w-2.5";
  const inner = size === "md" ? "size-2" : "size-1.5";
  const icon = size === "md" ? "size-3" : "size-2.5";
  const tooltipLabel = title === null ? undefined : (title ?? agentStateLabel(state));

  let indicator: React.JSX.Element;

  if (state === "working") {
    indicator = (
      <span className={cn("inline-flex shrink-0 items-center justify-center", box, className)}>
        <AgentWorkingSpinner className={inner} />
      </span>
    );
  } else if (state === "monitoring") {
    indicator = (
      <span className={cn("inline-flex shrink-0 items-center justify-center", box, className)}>
        <Activity className={cn("text-yellow-500", icon)} aria-hidden="true" />
      </span>
    );
  } else if (state === "done") {
    indicator = (
      <span className={cn("inline-flex shrink-0 items-center justify-center", box, className)}>
        <CircleCheck className={cn("text-emerald-500", icon)} aria-hidden="true" />
      </span>
    );
  } else if (state === "unverifiable") {
    indicator = (
      <span className={cn("inline-flex shrink-0 items-center justify-center", box, className)}>
        <CircleDashed className={cn("text-amber-500", icon)} aria-hidden="true" />
      </span>
    );
  } else if (state === "permission" || state === "waiting") {
    indicator = (
      <span className={cn("inline-flex shrink-0 items-center justify-center", box, className)}>
        <MessageCircleQuestion className={cn("text-amber-500", icon)} aria-hidden="true" />
      </span>
    );
  } else {
    indicator = (
      <span className={cn("inline-flex shrink-0 items-center justify-center", box, className)}>
        <span
          className={cn(
            "block rounded-full",
            inner,
            state === "blocked" || state === "interrupted" || state === "failed"
              ? "bg-red-500"
              : "bg-neutral-500/40"
          )}
        />
      </span>
    );
  }

  return (
    <span title={tooltipLabel} className="inline-flex shrink-0 items-center justify-center">
      {indicator}
    </span>
  );
});
