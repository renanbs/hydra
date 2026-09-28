// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
import React from "react";
import { Plug } from "lucide-react";
import type { WorkspacePort } from "./types";

export interface WorktreeCardPortsTriggerProps {
  ports: WorkspacePort[];
  onClick?: (e: React.MouseEvent) => void;
}

export function WorktreeCardPortsTrigger({
  ports,
  onClick,
}: WorktreeCardPortsTriggerProps): React.JSX.Element | null {
  if (!ports || ports.length === 0) {
    return null;
  }

  const portsLabel = ports.map((p) => `:${p.port}`).join(", ");
  const tooltipText = `${ports.length} live ${
    ports.length === 1 ? "port" : "ports"
  } (${portsLabel})`;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-emerald-950/50 border border-emerald-800/60 hover:bg-emerald-900/50 text-emerald-300 transition cursor-pointer leading-tight"
      title={tooltipText}
      aria-label={tooltipText}
    >
      <Plug className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
      <span className="font-mono text-[9px] font-medium tabular-nums">
        {ports.length === 1 ? `:${ports[0].port}` : `${ports.length} ports`}
      </span>
    </button>
  );
}
