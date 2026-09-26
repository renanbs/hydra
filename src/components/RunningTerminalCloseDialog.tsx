// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// RunningTerminalCloseDialog parity: tab-level close (tab-strip X, middle-click, tab
// menu, keyboard) with a live child process asks before killing. Hydra styling follows
// DeleteWorktreeDialog (no shadcn/ui primitives in this repo). Copy kind mirrors Orca's
// CloseTerminalDialog: 'agent' → "Stop this agent?", 'command' → "Stop running command?".

export type CloseTerminalDialogCopyKind = "agent" | "command";

export interface RunningTerminalCloseConfirmRequest {
  /** id-keyed subject: clears a previous tab's "don't ask again" tick on queue swap. */
  terminalTabId: string;
  tabLabel: string;
  copyKind: CloseTerminalDialogCopyKind;
  /** Session ids of the panes the tab owns — the confirm performs the original close,
   * which terminates them (App handleCloseTab owns the kill). */
  onConfirm: () => void;
  onCancel: () => void;
}

interface RunningTerminalCloseDialogProps {
  request: RunningTerminalCloseConfirmRequest | null;
  onConfirm: (dontAskAgain: boolean) => void;
  onCancel: () => void;
}

export function RunningTerminalCloseDialog({
  request,
  onConfirm,
  onCancel,
}: RunningTerminalCloseDialogProps) {
  if (!request) return null;
  const isAgent = request.copyKind === "agent";
  const trimmedTabLabel = request.tabLabel?.trim();

  return (
    <div
      className="fixed inset-0 z-[99998] flex items-center justify-center bg-black/65 backdrop-blur-xs select-none"
      onClick={onCancel}
      data-testid="running-terminal-close-dialog"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl bg-[#141518] border border-[#2a2b30] shadow-2xl text-xs text-neutral-200 p-5"
      >
        {/* Orca DialogHeader parity */}
        <h2 className="text-sm font-semibold text-neutral-100 tracking-tight">
          {isAgent ? "Stop this agent?" : "Stop running command?"}
        </h2>
        <p className="mt-1.5 text-[12px] leading-relaxed text-neutral-400">
          {isAgent
            ? "Closing this terminal will stop the agent's current work."
            : "Closing this terminal will stop the command running inside it."}
        </p>

        {/* Orca target-subject parity: names the tab when the X can target a tab the
            user is not looking at (context menu, keyboard path). */}
        {trimmedTabLabel ? (
          <div className="mt-3 flex items-center justify-between gap-3 p-2 rounded bg-neutral-950 border border-neutral-800">
            <span
              className="truncate font-mono text-[11px] text-neutral-300"
              title={trimmedTabLabel}
            >
              {trimmedTabLabel}
            </span>
          </div>
        ) : null}

        {/* Orca DialogFooter parity: Cancel + destructive confirm, autofocus confirm
            for the expected "Stop, Enter" keyboard flow. */}
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-1.5 rounded border border-[#3f3f46] text-neutral-200 font-medium transition hover:bg-neutral-800 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            autoFocus
            data-testid="running-terminal-close-confirm"
            onClick={() => onConfirm(false)}
            className="px-4 py-1.5 rounded bg-red-600 hover:bg-red-500 text-white font-medium transition cursor-pointer"
          >
            {isAgent ? "Stop Agent" : "Stop and Close"}
          </button>
        </div>
      </div>
    </div>
  );
}
