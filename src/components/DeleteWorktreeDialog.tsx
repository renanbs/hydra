// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// DeleteWorktreeDialog parity: dedicated destructive-confirmation modal (NOT
// window.confirm). Orca flow: sidebar funnel → openModal('delete-worktree') →
// this dialog guards the step the user already chose, with target preview,
// dirty-change counts, "Don't ask again" (persisted only on the primary
// confirm, never on force), Cancel + destructive Delete footer with autofocus
// on the confirm button for the expected "Delete, Enter" keyboard flow.
import { useEffect, useMemo, useRef, useState } from "react";
import { LoaderCircle, Trash2, Check } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import type { GitWorktreeInfo } from "./sidebar/types";

export interface DeleteWorktreeDialogState {
  /** id-keyed progress per worktree (Orca: deleteStateByWorktreeId) */
  [worktreePath: string]: { isDeleting: boolean; error: string | null };
}

interface DeleteWorktreeDialogProps {
  open: boolean;
  worktrees: GitWorktreeInfo[];
  isMainWorktree: boolean;
  deleteStateByWorktreeId: DeleteWorktreeDialogState;
  /** dirty-change counts per worktree path, hydrated by the parent */
  dirtyChangeCountsByWorktreeId: Record<string, number | null>;
  onPersistSkipConfirmPreference: () => void;
  onClose: () => void;
  onDeleted: (deletedPaths: string[]) => void;
  onForceDeleted: (deletedPath: string) => void;
  repoPath: string;
}

export function DeleteWorktreeDialog({
  open,
  worktrees,
  isMainWorktree,
  deleteStateByWorktreeId,
  dirtyChangeCountsByWorktreeId,
  onPersistSkipConfirmPreference,
  onClose,
  onDeleted,
  onForceDeleted,
  repoPath,
}: DeleteWorktreeDialogProps) {
  const [dontAskAgain, setDontAskAgain] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isDeletingLocal, setIsDeletingLocal] = useState(false);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  const isBatchDelete = worktrees.length > 1;
  const deleteStates = useMemo(
    () => worktrees.map((wt) => deleteStateByWorktreeId[wt.path] ?? null),
    [deleteStateByWorktreeId, worktrees]
  );
  const isDeleting = isDeletingLocal || deleteStates.some((s) => s?.isDeleting);
  const firstError = !isBatchDelete ? (deleteStates[0]?.error ?? null) : null;
  const effectiveError = localError || firstError;
  const canForceDelete = !isBatchDelete && effectiveError != null;
  const allowSkipConfirm = !isBatchDelete && !isMainWorktree && !canForceDelete;

  const label = isDeleting
    ? canForceDelete
      ? "Force Deleting..."
      : "Deleting..."
    : isBatchDelete
      ? `Delete ${worktrees.length} Workspaces`
      : canForceDelete
        ? "Force Delete"
        : "Delete Workspace";
  // Why: one-shot dialog intent; reset as soon as the dialog closes so a later
  // delete never inherits a cancelled choice (Orca DeleteWorktreeDialog.tsx:186-191).
  useEffect(() => {
    if (!open) {
      if (dontAskAgain) setDontAskAgain(false);
      setLocalError(null);
      setIsDeletingLocal(false);
    }
  }, [open, dontAskAgain]);
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (!isDeleting) onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, isDeleting, onClose]);

  if (!open) return null;

  // Orca onOpenAutoFocus parity: focus the confirm button, not the first
  // tabbable control, so "Delete, Enter" works from the keyboard.
  requestAnimationFrame(() => confirmButtonRef.current?.focus());

  const handleDelete = (force = false) => {
    if (worktrees.length === 0) return;
    if (dontAskAgain && allowSkipConfirm && !force) onPersistSkipConfirmPreference();
    setIsDeletingLocal(true);
    setLocalError(null);

    const deletedPaths: string[] = [];
    const failures: { path: string; error: string }[] = [];
    let pending = worktrees.length;
    for (const wt of worktrees) {
      invoke("delete_worktree", { repoPath, worktreePath: wt.path })
        .then(() => {
          deletedPaths.push(wt.path);
          if (force && deletedPaths.length === 1) onForceDeleted(wt.path);
        })
        .catch((err) => {
          failures.push({ path: wt.path, error: String(err) });
        })
        .finally(() => {
          pending -= 1;
          if (pending === 0) {
            setIsDeletingLocal(false);
            if (failures.length === 0) {
              onClose();
              if (deletedPaths.length > 0) onDeleted(deletedPaths);
            } else {
              setLocalError(failures.map((f) => f.error).join("\n"));
            }
          }
        });
    }
  };

  return (
    <div
      className="fixed inset-0 z-[99998] flex items-center justify-center bg-black/65 backdrop-blur-xs select-none"
      onClick={() => { if (!isDeleting) onClose(); }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl bg-[#141518] border border-[#2a2b30] shadow-2xl text-xs text-neutral-200 p-5"
      >
        {/* Orca DialogHeader parity */}
        <h2 className="text-sm font-semibold text-neutral-100 tracking-tight">
          {isBatchDelete ? "Delete Workspaces" : "Delete Workspace"}
        </h2>
        <p className="mt-1.5 text-[12px] leading-relaxed text-neutral-400">
          Remove{" "}
          <span className="break-all font-medium text-foreground">
            {isBatchDelete ? `${worktrees.length} workspaces` : (worktrees[0]?.branch || worktrees[0]?.path)}
          </span>{" "}
          from git and delete its workspace folder.
        </p>

        {/* Orca DeleteWorktreeTargetPreview parity: path + dirty-change count */}
        <div className="mt-3 space-y-1">
          {worktrees.map((wt) => {
            const dirty = dirtyChangeCountsByWorktreeId[wt.path] ?? null;
            const state = deleteStateByWorktreeId[wt.path];
            return (
              <div key={wt.path} className="flex items-center justify-between gap-3 p-2 rounded bg-neutral-950 border border-neutral-800">
                <div className="flex items-center gap-2 min-w-0">
                  <Trash2 className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  <span className="truncate font-mono text-[11px] text-neutral-300" title={wt.path}>{wt.path}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {dirty != null && dirty > 0 && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      {dirty} uncommitted
                    </span>
                  )}
                  {state?.isDeleting && <LoaderCircle className="w-3 h-3 animate-spin text-neutral-400" />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Orca DeleteWorktreeWarningPanels parity: error panel */}
        {effectiveError && (
          <div className="mt-3 p-2.5 rounded bg-red-500/15 border border-red-500/30 text-red-400 text-[11px]">
            <p className="font-medium mb-1">Delete failed:</p>
            <p className="font-mono break-all whitespace-pre-wrap">{effectiveError}</p>
          </div>
        )}
        {isMainWorktree && (
          <div className="mt-3 p-2.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[11px]">
            Git does not allow removing the main worktree.
          </div>
        )}

        {/* Orca DeleteWorktreeSkipConfirmOption parity */}
        {allowSkipConfirm && !isDeleting && (
          <button
            type="button"
            role="checkbox"
            aria-checked={dontAskAgain}
            onClick={() => setDontAskAgain((prev) => !prev)}
            className="mt-3 flex items-center gap-2 rounded-sm px-1 py-1 text-xs text-neutral-300 transition-colors hover:text-neutral-100 cursor-pointer"
          >
            <span className={`flex size-4 items-center justify-center rounded-sm border transition-colors ${dontAskAgain ? "border-emerald-500 bg-emerald-500 text-white" : "border-neutral-600 bg-transparent"}`}>
              {dontAskAgain ? <Check className="size-3" strokeWidth={3} /> : null}
            </span>
            Don't ask again
          </button>
        )}

        {/* Orca DialogFooter parity: Cancel + destructive Delete, autofocus confirm */}
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => { if (!isDeleting) onClose(); }}
            disabled={isDeleting}
            className="px-4 py-1.5 rounded border border-[#3f3f46] text-neutral-200 font-medium transition hover:bg-neutral-800 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {isMainWorktree ? "Close" : "Cancel"}
          </button>
          {!isMainWorktree && (
            <button
              ref={confirmButtonRef}
              type="button"
              onClick={() => handleDelete(canForceDelete)}
              disabled={isDeleting}
              className="px-4 py-1.5 rounded bg-red-600 hover:bg-red-500 text-white font-medium transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
            >
              {isDeleting ? <LoaderCircle className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
              {label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
