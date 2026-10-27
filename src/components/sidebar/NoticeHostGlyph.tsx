// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Parity with Orca `components/sidebar/NoticeHostGlyph.tsx` — the host indicator every
// discovery-notice row wears. Deliberately the one host glyph vocabulary the run-target
// rows already use (a monitor for this computer, a server for anything remote), plus the
// worktree card's "Project on …" tooltip. Every row gets one, including local, so no row
// is the odd one out.
import React from "react";
import { Monitor, Server } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAppStore } from "@/store";
import {
  LOCAL_EXECUTION_HOST_ID,
  parseExecutionHostId,
  type ExecutionHostId,
} from "../../shared/execution-host";
import { translate } from "@/i18n/i18n";
import {
  isDisconnectedRuntimeHostState,
  runtimeHostConnectionStateForEntry,
} from "../../runtime/runtime-host-connection-state";

export interface NoticeHostGlyphProps {
  hostId: ExecutionHostId;
  hostLabel: string;
  keyboardFocusable: boolean;
}

export default function NoticeHostGlyph({
  hostId,
  hostLabel,
  keyboardFocusable,
}: NoticeHostGlyphProps): React.JSX.Element | null {
  const host = parseExecutionHostId(hostId);
  // Why the shared derivation, not raw truthiness: an absent entry means "not probed
  // yet", which is not the same verdict as a probe that came back unreachable.
  const isDisconnected = useAppStore((s) => {
    if (host?.kind !== "runtime") {
      return false;
    }
    return isDisconnectedRuntimeHostState(
      runtimeHostConnectionStateForEntry(s.runtimeStatusByEnvironmentId?.get(host.environmentId))
    );
  });

  if (!host) {
    return null;
  }

  const tooltip = isDisconnected
    ? translate(
        "auto.components.sidebar.NoticeHostGlyph.hostDisconnected",
        "{{hostName}} disconnected",
        { hostName: hostLabel }
      )
    : host.kind === "ssh"
      ? translate(
          "auto.components.sidebar.NoticeHostGlyph.sshHostProject",
          "Project on SSH host {{hostName}}",
          { hostName: hostLabel }
        )
      : host.kind === "local"
        ? translate(
            "auto.components.sidebar.NoticeHostGlyph.localHostProject",
            "Project on this host"
          )
        : translate(
            "auto.components.sidebar.NoticeHostGlyph.runtimeHostProject",
            "Project on {{hostName}}",
            { hostName: hostLabel }
          );

  // Orca `host-row-icon.tsx` vocabulary: the local machine isn't a server, so a monitor
  // glyph reads as "this computer"; anything else is remote.
  const HostIcon = hostId === LOCAL_EXECUTION_HOST_ID ? Monitor : Server;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          aria-label={keyboardFocusable ? tooltip : undefined}
          className="inline-flex shrink-0 items-center rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-worktree-sidebar-ring"
          data-notice-host-kind={host.kind}
          role={keyboardFocusable ? "img" : undefined}
          tabIndex={keyboardFocusable ? 0 : undefined}
        >
          <HostIcon
            className={`size-3 shrink-0 ${
              isDisconnected ? "text-destructive" : "text-muted-foreground"
            }`}
          />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={4}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}
