// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/AutoRenameFailedDialog.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Check, Copy, X } from "lucide-react";

export interface AutoRenameFailedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worktreeId?: string;
  worktreeName: string;
  error: string;
}

export function AutoRenameFailedDialog({
  open,
  onOpenChange,
  worktreeName,
  error,
}: AutoRenameFailedDialogProps): React.JSX.Element | null {
  const [copied, setCopied] = useState(false);
  const copiedResetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copiedResetTimerRef.current !== null) {
        window.clearTimeout(copiedResetTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(error);
      setCopied(true);
      if (copiedResetTimerRef.current !== null) {
        window.clearTimeout(copiedResetTimerRef.current);
      }
      copiedResetTimerRef.current = window.setTimeout(() => {
        copiedResetTimerRef.current = null;
        setCopied(false);
      }, 1500);
    } catch {
      /* best-effort fallback */
    }
  }, [error]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[99998] flex items-center justify-center bg-black/65 backdrop-blur-xs select-none"
      onClick={() => onOpenChange(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-xl bg-[#141518] border border-[#2a2b30] shadow-2xl text-xs text-neutral-200 p-5 space-y-4 max-h-[85vh] flex flex-col"
      >
        <div className="flex items-center justify-between pb-1 border-b border-neutral-800 shrink-0">
          <div className="flex items-center gap-2 text-rose-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <h2 className="text-sm font-semibold tracking-tight">
              Branch auto-name failed
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="p-1 rounded text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-neutral-400 text-[11px] leading-relaxed">
          Hydra couldn't generate a branch name for{" "}
          <span className="font-semibold text-neutral-200">{worktreeName}</span>{" "}
          from the first agent message.
        </p>

        <div className="min-w-0 space-y-1.5 flex-1 flex flex-col">
          <p className="text-[11px] font-medium text-neutral-300">Error output:</p>
          {/* Why: agent-CLI output is literal and often multi-line; the copy control
              floats inside the region so the wrapped text reserves its gutter
              (Orca `pr-9` + `[overflow-wrap:anywhere]`). */}
          <div className="relative min-w-0">
            <button
              type="button"
              onClick={handleCopy}
              className="absolute right-1.5 top-1.5 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-neutral-400 transition hover:bg-neutral-800 hover:text-neutral-200 cursor-pointer"
              aria-label={copied ? "Copied" : "Copy error"}
            >
              {copied ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
            <div className="scrollbar-sleek max-h-[40vh] overflow-auto whitespace-pre-wrap rounded-lg border border-neutral-800 bg-[#0d0e11] py-3 pl-3 pr-9 font-mono text-[11px] leading-4 text-rose-300/90 select-text [overflow-wrap:anywhere]">
              {error}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-neutral-800 shrink-0">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-3.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium text-[11px] transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
