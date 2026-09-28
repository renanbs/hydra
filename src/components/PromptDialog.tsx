import React, { useCallback, useEffect, useId, useRef, useState } from "react";

export interface PromptDialogProps {
  open: boolean;
  title: string;
  description?: string;
  initialValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (value: string) => Promise<void> | void;
}

export function PromptDialog({
  open,
  title,
  description,
  initialValue = "",
  placeholder = "",
  confirmLabel = "Save",
  onOpenChange,
  onSubmit,
}: PromptDialogProps): React.JSX.Element | null {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [value, setValue] = useState(initialValue);
  const [submitting, setSubmitting] = useState(false);
  const trimmed = value.trim();

  useEffect(() => {
    if (open) {
      setValue(initialValue);
      setSubmitting(false);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [open, initialValue]);

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
    async (event?: React.SyntheticEvent) => {
      event?.preventDefault();
      if (!trimmed || submitting) return;
      setSubmitting(true);
      try {
        await onSubmit(trimmed);
        onOpenChange(false);
      } catch (error) {
        console.error("Failed to submit prompt:", error);
      } finally {
        setSubmitting(false);
      }
    },
    [onOpenChange, onSubmit, submitting, trimmed]
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
          {description && (
            <p className="text-[11px] text-neutral-400 leading-normal">
              {description}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor={inputId}
              className="text-[11px] font-medium text-neutral-300"
            >
              Name / Value
            </label>
            <input
              ref={inputRef}
              id={inputId}
              type="text"
              value={value}
              placeholder={placeholder}
              onChange={(e) => setValue(e.target.value)}
              disabled={submitting}
              className="w-full h-8 px-2.5 rounded-md bg-[#0e0f11] border border-[#2a2b30] text-xs text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-neutral-400 transition"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              disabled={submitting}
              onClick={() => onOpenChange(false)}
              className="px-3 h-7 rounded-md border border-[#2a2b30] text-neutral-300 hover:bg-[#1f2024] hover:text-neutral-100 transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!trimmed || submitting}
              className="px-3 h-7 rounded-md bg-neutral-100 text-neutral-900 font-medium hover:bg-white transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? "Saving…" : confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
