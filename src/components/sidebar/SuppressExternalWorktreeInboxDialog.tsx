// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Parity with Orca `components/sidebar/SuppressExternalWorktreeInboxDialog.tsx`:
// opting out of discovery is permanent for the repo, so it asks first and points at
// the settings section that can re-enable it.
import { useEffect } from "react";

export interface SuppressExternalWorktreeInboxDialogProps {
  open: boolean;
  repoDisplayName: string;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onOpenRecovery: () => void;
}

export function SuppressExternalWorktreeInboxDialog({
  open,
  repoDisplayName,
  pending,
  onOpenChange,
  onConfirm,
  onOpenRecovery,
}: SuppressExternalWorktreeInboxDialogProps): React.JSX.Element | null {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) {
        event.preventDefault();
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, pending, onOpenChange]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[99998] flex items-center justify-center bg-black/65 backdrop-blur-xs select-none"
      onClick={() => {
        if (!pending) onOpenChange(false);
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-lg rounded-xl border border-[#2a2b30] bg-[#141518] p-5 text-xs text-neutral-200 shadow-2xl"
      >
        <h2 className="text-sm font-semibold tracking-tight text-neutral-100">
          Hide external worktrees?
        </h2>
        <p className="mt-1.5 text-[12px] leading-relaxed text-neutral-400">
          External worktrees will not be shown in the sidebar or this list anymore for{" "}
          <span className="break-all font-medium text-foreground">{repoDisplayName}</span>,
          including ones created later.
        </p>

        <div className="mt-3 rounded border border-[#2a2b30] bg-[#191a1e] px-3 py-2 text-[11px] leading-relaxed text-neutral-400">
          You can turn this back on later from project settings.
          <button
            type="button"
            onClick={onOpenRecovery}
            className="mt-1 block font-medium text-foreground underline underline-offset-2 cursor-pointer"
          >
            Open Non-Orca worktrees settings
          </button>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => onOpenChange(false)}
            className="rounded border border-[#3f3f46] px-4 py-1.5 font-medium text-neutral-200 transition hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onConfirm}
            className="rounded bg-red-600 px-4 py-1.5 font-medium text-white transition hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {pending ? "Hiding…" : "Hide external worktrees"}
          </button>
        </div>
      </div>
    </div>
  );
}
