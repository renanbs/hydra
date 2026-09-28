// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
import React from "react";
import { Wrench } from "lucide-react";
import { cn } from "../../lib/utils";

type DashboardAgentRowToolStepProps = {
  expanded: boolean;
  showsTool: boolean;
  reservesHeight: boolean;
  toolName: string;
  toolInput?: string;
};

export function DashboardAgentRowToolStep({
  expanded,
  showsTool,
  reservesHeight,
  toolName,
  toolInput,
}: DashboardAgentRowToolStepProps): React.JSX.Element | null {
  if (!showsTool || (!toolName && !reservesHeight)) {
    return null;
  }

  return (
    <div
      data-agent-row-tool-slot=""
      className="mt-0.5 min-w-0 pl-5 text-[10px] leading-snug text-neutral-400"
    >
      {toolName ? (
        <>
          <div
            data-agent-row-tool-header="true"
            className={cn(
              "flex h-[1lh] min-w-0 items-center gap-1",
              !expanded && "overflow-hidden"
            )}
          >
            <Wrench className="size-2.5 shrink-0 text-amber-500/80" />
            <code className="shrink-0 font-mono text-[10px] text-neutral-300 font-medium">{toolName}</code>
            {!expanded && toolInput ? (
              <span className="min-w-0 truncate text-neutral-500 font-mono text-[9px]" title={toolInput}>
                {toolInput}
              </span>
            ) : null}
          </div>
          {toolInput ? (
            <div
              className={cn(
                "grid transition-[grid-template-rows,margin-top] duration-200 ease-out",
                expanded ? "mt-0.5 grid-rows-[1fr]" : "grid-rows-[0fr]"
              )}
            >
              <pre className="min-h-0 overflow-hidden whitespace-pre-wrap break-words font-mono text-[9px] text-neutral-400 bg-neutral-900/60 p-1 rounded border border-neutral-800">
                {toolInput}
              </pre>
            </div>
          ) : null}
        </>
      ) : (
        <span data-agent-row-tool-placeholder="true" aria-hidden className="block h-[1lh]" />
      )}
    </div>
  );
}
