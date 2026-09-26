// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
import React, { useCallback, useEffect, useId, useRef, useState } from "react";

export interface ProjectGroupNameDialogProps {
  open: boolean;
  title: string;
  description: string;
  initialName?: string;
  confirmLabel?: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string) => Promise<void> | void;
}

export function ProjectGroupNameDialog({
  open,
  title,
  description,
  initialName = "",
  confirmLabel = "Save",
  onOpenChange,
  onSubmit,
}: ProjectGroupNameDialogProps): React.JSX.Element | null {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [name, setName] = useState(initialName);
  const [submitting, setSubmitting] = useState(false);
  const trimmedName = name.trim();

  useEffect(() => {
    if (open) {
      setName(initialName);
      setSubmitting(false);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [open, initialName]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (!submitting) onOpenChange(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, submitting, onOpenChange]);

  const handleSubmit = useCallback(
    async (event?: React.FormEvent<HTMLFormElement>) => {
      event?.preventDefault();
      if (!trimmedName || submitting) return;
      setSubmitting(true);
      try {
        await onSubmit(trimmedName);
        onOpenChange(false);
      } catch (error) {
        console.error("Failed to save project group name:", error);
      } finally {
        setSubmitting(false);
      }
    },
    [onOpenChange, onSubmit, submitting, trimmedName]
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[99998] flex items-center justify-center bg-black/65 backdrop-blur-xs select-none"
      onClick={() => {
        if (!submitting) onOpenChange(false);
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-xl bg-[#141518] border border-[#2a2b30] shadow-2xl text-xs text-neutral-200 p-5 space-y-4"
      >
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-neutral-100 tracking-tight">
            {title}
          </h2>
          <p className="text-[12px] leading-relaxed text-neutral-400">
            {description}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor={inputId}
              className="text-[11px] font-medium text-neutral-400 block"
            >
              Group Name
            </label>
            <input
              ref={inputRef}
              id={inputId}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. MELI, Platform, Infrastructure"
              disabled={submitting}
              className="w-full h-8 px-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/30 transition disabled:opacity-60"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              disabled={submitting}
              onClick={() => onOpenChange(false)}
              className="px-3 py-1.5 rounded-lg border border-neutral-800 bg-neutral-900/60 hover:bg-neutral-800 text-neutral-300 text-xs font-medium transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!trimmedName || submitting}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition shadow-xs cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              {submitting ? "Saving..." : confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
