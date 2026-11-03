// Orca agent-send target picker: after a review-notes "Send", the workspace's
// running agents become the delivery targets. Eligible panes send; disabled panes
// explain why; sending/error states stay inside this popover.
import React, { useMemo } from "react";
import { Send, X } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useAppStore } from "@/store";
import { deriveRunningAgentSendTargets } from "@/lib/running-agent-targets";
import { formatAgentTypeLabel } from "@/lib/agent-status";
import {
  EMPTY_SEND_TARGET_CONTROL_INPUTS,
  EMPTY_SEND_TARGET_INPUTS,
  selectSendTargetControlInputs,
  selectSendTargetInputs,
} from "./worktree-card-send-target-inputs";

export function AgentSendTargetPicker(): React.JSX.Element | null {
  const mode = useAppStore((s) => s.agentSendPopoverTargetMode);
  const closeMode = useAppStore((s) => s.closeAgentSendPopoverTargetMode);
  const sendToTarget = useAppStore((s) => s.sendPromptToSidebarAgentTarget);
  const targetWorktreeId = mode?.worktreeId ?? null;

  // Why the narrow selector: an inactive picker must not re-render on every
  // pane-title / agent-status write app-wide, and the active one needs those
  // maps to stay live while it is open.
  const sendTargetInputs = useAppStore(
    useShallow((s) =>
      targetWorktreeId ? selectSendTargetInputs(s, targetWorktreeId) : EMPTY_SEND_TARGET_INPUTS
    )
  );
  const { agentStatusEpoch } = useAppStore(
    useShallow((s) =>
      targetWorktreeId
        ? selectSendTargetControlInputs(s, targetWorktreeId)
        : EMPTY_SEND_TARGET_CONTROL_INPUTS
    )
  );

  const targets = useMemo(() => {
    void agentStatusEpoch;
    if (!targetWorktreeId) return [];
    // Re-derive instead of trusting a snapshot: eligibility can drop while the
    // popover is open (the pane exits, the agent dies).
    return deriveRunningAgentSendTargets(sendTargetInputs, targetWorktreeId);
  }, [agentStatusEpoch, sendTargetInputs, targetWorktreeId]);

  if (!mode) return null;

  return (
    <div
      data-agent-send-target-picker
      className="absolute inset-x-2 bottom-12 z-40 rounded-lg border border-border bg-popover p-2 text-[11px] shadow-xl"
    >
      <div className="mb-1 flex items-center justify-between text-muted-foreground">
        <span>Send notes to</span>
        <button
          type="button"
          aria-label="Close target picker"
          onClick={() => closeMode(mode.id, mode.instanceId)}
        >
          <X className="size-3" />
        </button>
      </div>
      {targets.length === 0 ? (
        <div className="px-1 py-2 text-muted-foreground">
          No running agents in this workspace.
        </div>
      ) : (
        <div className="flex flex-col gap-0.5">
          {targets.map((target) => {
            const isSending = mode.sendingPaneKey === target.paneKey;
            const disabled = target.status !== "eligible";
            return (
              <button
                key={target.paneKey}
                type="button"
                disabled={disabled || isSending || mode.status === "sending"}
                title={
                  disabled
                    ? target.disabledReason ?? "This agent cannot receive notes right now"
                    : `Send to ${formatAgentTypeLabel(target.entry.agentType)}`
                }
                onClick={() => void sendToTarget(target.paneKey)}
                className="flex items-center gap-1.5 rounded px-1.5 py-1 text-left hover:bg-accent disabled:opacity-50"
              >
                <Send className="size-3 shrink-0" />
                <span className="min-w-0 flex-1 truncate">
                  {target.entry.terminalTitle?.trim() ||
                    formatAgentTypeLabel(target.entry.agentType)}
                </span>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {isSending ? "Sending…" : disabled ? "Unavailable" : ""}
                </span>
              </button>
            );
          })}
        </div>
      )}
      {mode.status === "error" && mode.error ? (
        <div className="mt-1 text-destructive">{String(mode.error)}</div>
      ) : null}
    </div>
  );
}
