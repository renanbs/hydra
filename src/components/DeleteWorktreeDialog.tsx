// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// DeleteWorktreeDialog parity: dedicated destructive-confirmation modal (NOT
// window.confirm). Orca flow: sidebar funnel → openModal('delete-worktree') →
// this dialog guards the step the user already chose, with target preview,
// dirty-change counts, "Don't ask again" (persisted only on the primary
// confirm, never on force), Cancel + destructive Delete footer with autofocus
// on the confirm button for the expected "Delete, Enter" keyboard flow.
//
// STA-4343: the confirmed row is an IDENTITY (id + host + instance), not a path.
// The dialog revalidates it against the live list both while rendering (the
// destructive button disables once the target is gone) and once more at confirm,
// because the workspace list can change between opening and confirming. A target
// that vanished or was recreated aborts with a "Workspace list changed" notice
// instead of deleting whichever checkout shares the path.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LoaderCircle, Trash2, Check } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import type { GitWorktreeInfo } from "./sidebar/types";
import type { ExecutionHostId } from "../shared/execution-host";
import type { WorktreeDeleteState } from "../store/slices/worktree-delete-state-types";
import { getDeleteStateForWorktreeHost } from "./sidebar/worktree-delete-state-host-match";
import {
  resolveWorktreeBatchDeleteTargets,
  type WorktreeDeleteIdentity,
  type WorktreeDeleteResolvableTarget,
} from "./sidebar/worktree-delete-request";

export type DeleteWorktreeDialogState = Record<string, WorktreeDeleteState | undefined>;

/**
 * A live row the confirmation revalidates against. The identity fields decide
 * WHICH workspace was confirmed; `path`/`repoPath` build the destructive payload
 * once that exact row is still present.
 */
export type WorktreeDeleteLiveTarget = WorktreeDeleteResolvableTarget & {
  path: string;
  repoPath?: string;
};

export interface DeleteWorktreeDialogProps {
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
  /**
   * Identity snapshot captured when the dialog opened (Orca
   * `modalData.worktreeDeleteIdentities`). Omitted by legacy callers that only
   * know the path; the identities are then derived from `worktrees`.
   */
  deleteTargets?: readonly WorktreeDeleteIdentity[];
  /**
   * Live workspace rows (Orca `getWorktreeOnHostFromState`). When provided, the
   * confirmed identity is resolved against them on render and again at confirm.
   */
  liveWorktrees?: readonly WorktreeDeleteLiveTarget[];
  /** Fired when a confirmed target no longer matches the live list. */
  onStaleTargets?: () => void;
  /**
   * Publishes the in-progress state for the confirmed rows as the removal is
   * dispatched, so the sidebar card paints its overlay while it runs (Orca
   * `markWorktreesDeleting`, called by `runWorktreeDeletesInParallel`).
   */
  onDeleteStart?: (targets: readonly WorktreeDeleteIdentity[]) => void;
  /**
   * Releases what `onDeleteStart` published once every invoke settled — success,
   * backend refusal or failure. Without it a refused removal would leave the card
   * inert (the regression this dialog's own state cannot clear).
   */
  onDeleteSettled?: (targets: readonly WorktreeDeleteIdentity[]) => void;
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
  deleteTargets,
  liveWorktrees,
  onStaleTargets,
  onDeleteStart,
  onDeleteSettled,
}: DeleteWorktreeDialogProps) {
  const [dontAskAgain, setDontAskAgain] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isDeletingLocal, setIsDeletingLocal] = useState(false);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  const isBatchDelete = worktrees.length > 1;

  // Why: the id is `repoId::path`; the fallback keeps a legacy caller whose
  // payload predates `id` on the same identity the live list uses.
  const identities = useMemo<WorktreeDeleteIdentity[]>(
    () =>
      deleteTargets && deleteTargets.length > 0
        ? deleteTargets.map((target) => ({ ...target }))
        : worktrees.map((wt) => ({ id: wt.id ?? `${repoPath}::${wt.path}` })),
    [deleteTargets, repoPath, worktrees]
  );

  const lookupLiveTarget = useCallback(
    (worktreeId: string, hostId: ExecutionHostId | undefined): WorktreeDeleteLiveTarget | undefined => {
      if (!liveWorktrees) return undefined;
      return hostId
        ? liveWorktrees.find((row) => row.id === worktreeId && row.hostId === hostId)
        : liveWorktrees.find((row) => row.id === worktreeId);
    },
    [liveWorktrees]
  );

  const validationEnabled = liveWorktrees != null;
  const missingTargets =
    validationEnabled &&
    identities.some((identity) => lookupLiveTarget(identity.id, identity.hostId) === undefined);

  const deleteStates = useMemo(
    () =>
      identities.map((identity) => getDeleteStateForWorktreeHost(identity, deleteStateByWorktreeId) ?? null),
    [deleteStateByWorktreeId, identities]
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
  // Why (Orca DeleteWorktreeDialog.tsx:206-213): a target that vanished before
  // the user could confirm must not leave a destructive affordance armed. Close
  // with the stale-list notice instead of deleting a namesake.
  useEffect(() => {
    if (!open || !validationEnabled || isDeleting) return;
    if (identities.length === 0 || !missingTargets) return;
    onStaleTargets?.();
    onClose();
  }, [identities.length, isDeleting, missingTargets, onClose, onStaleTargets, open, validationEnabled]);

  if (!open) return null;

  // Orca onOpenAutoFocus parity: focus the confirm button, not the first
  // tabbable control, so "Delete, Enter" works from the keyboard.
  requestAnimationFrame(() => confirmButtonRef.current?.focus());

  const handleDelete = (force = false) => {
    if (worktrees.length === 0) return;
    // Why: re-read the live list at the confirm step. The render-time check only
    // guards what is painted; this is the only check that sees a list that
    // changed between opening and this click.
    const confirmedTargets = validationEnabled
      ? resolveWorktreeBatchDeleteTargets(identities, lookupLiveTarget)
      : null;
    if (validationEnabled && (!confirmedTargets || confirmedTargets.length !== identities.length)) {
      onStaleTargets?.();
      onClose();
      return;
    }
    if (dontAskAgain && allowSkipConfirm && !force) onPersistSkipConfirmPreference();
    setIsDeletingLocal(true);
    setLocalError(null);

    const payloads = confirmedTargets
      ? confirmedTargets.map((target) => ({
          path: target.path,
          repoPath: target.repoPath ?? repoPath,
          hostId: target.hostId,
        }))
      : worktrees.map((wt) => ({
          path: wt.path,
          repoPath,
          hostId: undefined as ExecutionHostId | undefined,
        }));

    const deletedPaths: string[] = [];
    const failures: { path: string; error: string }[] = [];
    let pending = payloads.length;
    // Orca `markWorktreesDeleting`: the sidebar card owns the in-progress feedback,
    // so publish before the first invoke leaves the renderer.
    onDeleteStart?.(identities);
    for (const payload of payloads) {
      // Why: `hostId` rides along so the backend can route a destructive removal
      // to the host the user confirmed (STA-4343); the payload stays path-complete
      // for the current command signature.
      invoke("delete_worktree", {
        repoPath: payload.repoPath,
        worktreePath: payload.path,
        ...(payload.hostId ? { hostId: payload.hostId } : {}),
      })
        .then(() => {
          deletedPaths.push(payload.path);
          if (force && deletedPaths.length === 1) onForceDeleted(payload.path);
        })
        .catch((err) => {
          failures.push({ path: payload.path, error: String(err) });
        })
        .finally(() => {
          pending -= 1;
          if (pending === 0) {
            setIsDeletingLocal(false);
            // Release the card in the same settle that stops the dialog spinner:
            // a refused removal must leave the row clickable again.
            onDeleteSettled?.(identities);
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
          {worktrees.map((wt, index) => {
            const dirty = dirtyChangeCountsByWorktreeId[wt.path] ?? null;
            const state = deleteStates[index] ?? null;
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
              disabled={isDeleting || missingTargets}
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
