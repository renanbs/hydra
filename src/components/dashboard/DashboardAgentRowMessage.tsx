// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
import React from "react";
import { cn } from "../../lib/utils";

type DashboardAgentRowMessageProps = {
  expanded: boolean;
  isInterrupted?: boolean;
  lastAssistantMessage?: string;
};

export function DashboardAgentRowMessage({
  expanded,
  isInterrupted = false,
  lastAssistantMessage,
}: DashboardAgentRowMessageProps): React.JSX.Element | null {
  if (!isInterrupted && !lastAssistantMessage) {
    return null;
  }

  return (
    <div className="mt-0.5 flex min-w-0 items-start gap-1.5 pl-5 text-[10px] leading-snug">
      {isInterrupted ? (
        <span className="shrink-0 text-red-400 font-medium" title="Interrupted by user">
          interrupted
        </span>
      ) : null}
      {lastAssistantMessage ? (
        <div
          className={cn(
            "min-w-0 flex-1 overflow-hidden text-neutral-400",
            expanded ? "whitespace-pre-wrap break-words" : "truncate whitespace-nowrap"
          )}
          title={!expanded ? lastAssistantMessage : undefined}
        >
          {lastAssistantMessage}
        </div>
      ) : null}
    </div>
  );
}
