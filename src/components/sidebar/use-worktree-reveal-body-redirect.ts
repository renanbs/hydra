// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/use-workspace-reveal-body-redirect.ts
//
// Reveal requests are handled inside the worktree list, which is unmounted while the
// Agents body is showing. Capture the request, switch to Workspaces, and replay it once
// the list has mounted.
import { useEffect, useRef } from "react";

export const SIDEBAR_REVEAL_REQUEST_EVENT = "hydra:sidebar-reveal-request";

export function useWorktreeRevealBodyRedirect(args: {
  agentsBodyShowing: boolean;
  onShowWorkspaces: () => void;
  onReveal: (path: string | null) => void;
}): void {
  const { agentsBodyShowing, onShowWorkspaces, onReveal } = args;
  const pendingPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!agentsBodyShowing) {
      return;
    }
    const onRequest = (event: Event): void => {
      const path =
        event instanceof CustomEvent && typeof event.detail?.path === "string"
          ? event.detail.path
          : null;
      pendingPathRef.current = path;
      onShowWorkspaces();
    };
    window.addEventListener(SIDEBAR_REVEAL_REQUEST_EVENT, onRequest);
    return () => window.removeEventListener(SIDEBAR_REVEAL_REQUEST_EVENT, onRequest);
  }, [agentsBodyShowing, onShowWorkspaces]);

  useEffect(() => {
    if (agentsBodyShowing) {
      return;
    }
    const pendingPath = pendingPathRef.current;
    if (pendingPath === null) {
      return;
    }
    pendingPathRef.current = null;
    onReveal(pendingPath);
  }, [agentsBodyShowing, onReveal]);
}
