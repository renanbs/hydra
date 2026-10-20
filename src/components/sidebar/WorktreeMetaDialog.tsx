// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Parity with Orca's worktree metadata editor: display name, linked issue/review and
// free-form notes persisted in `worktree_metadata`. The dialog edits a draft and only
// the Save handler writes, so Cancel never touches the store.
import { useEffect, useRef, useState } from "react";
import type { WorktreeMetadataDraft } from "./worktree-metadata-types";

export interface WorktreeMetaDialogProps {
  open: boolean;
  worktreeName: string;
  initial: WorktreeMetadataDraft;
  onOpenChange: (open: boolean) => void;
  onSave: (draft: WorktreeMetadataDraft) => void;
}

function parsePositiveInteger(value: string): number | null | undefined {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed.replace(/^#/, ""));
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export function WorktreeMetaDialog({
  open,
  worktreeName,
  initial,
  onOpenChange,
  onSave,
}: WorktreeMetaDialogProps): React.JSX.Element | null {
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [linkedIssue, setLinkedIssue] = useState(
    initial.linkedIssue == null ? "" : String(initial.linkedIssue)
  );
  const [linkedPR, setLinkedPR] = useState(initial.linkedPR == null ? "" : String(initial.linkedPR));
  const [linkedLinearIssue, setLinkedLinearIssue] = useState(initial.linkedLinearIssue ?? "");
  const [comment, setComment] = useState(initial.comment);
  const [error, setError] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  // Why a ref: the caller rebuilds `initial` every render; seeding on that identity
  // would wipe the draft mid-typing. Seed only when the dialog opens.
  const initialRef = useRef(initial);
  initialRef.current = initial;

  useEffect(() => {
    if (!open) return;
    const seed = initialRef.current;
    setDisplayName(seed.displayName);
    setLinkedIssue(seed.linkedIssue == null ? "" : String(seed.linkedIssue));
    setLinkedPR(seed.linkedPR == null ? "" : String(seed.linkedPR));
    setLinkedLinearIssue(seed.linkedLinearIssue ?? "");
    setComment(seed.comment);
    setError(null);
    requestAnimationFrame(() => nameInputRef.current?.focus());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;

  const submit = () => {
    const issue = parsePositiveInteger(linkedIssue);
    const pullRequest = parsePositiveInteger(linkedPR);
    if (issue === undefined || pullRequest === undefined) {
      setError("Issue and review must be positive numbers.");
      return;
    }
    const linear = linkedLinearIssue.trim();
    onSave({
      displayName: displayName.trim() || worktreeName,
      comment,
      linkedIssue: issue,
      linkedPR: pullRequest,
      linkedLinearIssue: linear || null,
    });
  };

  const fieldClass =
    "w-full rounded border border-[#3f3f46] bg-[#0f1012] px-2 py-1.5 text-[12px] text-neutral-200 outline-none focus:border-neutral-500";

  return (
    <div
      className="fixed inset-0 z-[99998] flex items-center justify-center bg-black/65 backdrop-blur-xs select-none"
      onClick={() => onOpenChange(false)}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-xl border border-[#2a2b30] bg-[#141518] p-5 text-xs text-neutral-200 shadow-2xl"
      >
        <h2 className="text-sm font-semibold tracking-tight text-neutral-100">
          Workspace metadata
        </h2>
        <p className="mt-1 text-[11px] text-neutral-500">{worktreeName}</p>

        <div className="mt-3 space-y-2.5">
          <label className="block">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
              Display name
            </span>
            <input
              ref={nameInputRef}
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className={fieldClass}
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                Issue
              </span>
              <input
                value={linkedIssue}
                onChange={(event) => setLinkedIssue(event.target.value)}
                placeholder="123"
                inputMode="numeric"
                className={fieldClass}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                Review
              </span>
              <input
                value={linkedPR}
                onChange={(event) => setLinkedPR(event.target.value)}
                placeholder="456"
                inputMode="numeric"
                className={fieldClass}
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
              Linear
            </span>
            <input
              value={linkedLinearIssue}
              onChange={(event) => setLinkedLinearIssue(event.target.value)}
              placeholder="ENG-123"
              className={fieldClass}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
              Notes
            </span>
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              rows={3}
              className={`${fieldClass} resize-none`}
            />
          </label>
        </div>

        {error && (
          <p role="alert" className="mt-2 text-[11px] text-red-400">
            {error}
          </p>
        )}

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded border border-[#3f3f46] px-4 py-1.5 font-medium text-neutral-200 transition hover:bg-neutral-800 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            className="rounded bg-emerald-600 px-4 py-1.5 font-medium text-white transition hover:bg-emerald-500 cursor-pointer"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
