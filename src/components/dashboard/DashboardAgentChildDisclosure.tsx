// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
import React, { useCallback } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "../../lib/utils";

type Props = {
  childAgentCount?: number;
  childAgentsExpanded: boolean;
  onToggleChildAgents?: () => void;
  reserveDisclosureGutter: boolean;
};

export function DashboardAgentChildDisclosure({
  childAgentCount,
  childAgentsExpanded,
  onToggleChildAgents,
  reserveDisclosureGutter,
}: Props) {
  const hasChildDisclosure =
    typeof childAgentCount === "number" &&
    childAgentCount > 0 &&
    typeof onToggleChildAgents === "function";

  const handleToggleChildren = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      onToggleChildAgents?.();
    },
    [onToggleChildAgents]
  );

  if (!hasChildDisclosure) {
    return reserveDisclosureGutter ? (
      <span aria-hidden className="-ml-0.5 inline-block size-3.5 shrink-0" />
    ) : null;
  }

  return (
    <button
      type="button"
      onClick={handleToggleChildren}
      className="-ml-0.5 inline-flex size-3.5 shrink-0 items-center justify-center rounded-sm border border-neutral-700 bg-neutral-900 text-neutral-300 hover:bg-neutral-800 hover:text-white cursor-pointer"
      aria-label={`${childAgentsExpanded ? "Hide" : "Show"} ${childAgentCount} subagents`}
      aria-expanded={childAgentsExpanded}
    >
      <ChevronRight
        className={cn(
          "size-2.5 transition-transform duration-150",
          childAgentsExpanded && "rotate-90"
        )}
      />
    </button>
  );
}
