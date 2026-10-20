// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Parity with Orca `components/sidebar/RemoveFolderDialog.tsx`: removing a project
// from Hydra is not a disk deletion, and the copy has to say where the files stay
// (local disk, SSH host, or the VM recipe's own policy) before the user confirms.
import { useEffect, useRef } from "react";
import { Trash2 } from "lucide-react";

export type RemoveProjectHostDescription =
  | { kind: "local" }
  | { kind: "ssh"; label: string }
  | { kind: "vm" };

export interface RemoveFolderDialogProps {
  open: boolean;
  projectName: string;
  host: RemoveProjectHostDescription;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

function descriptionFor(
  host: RemoveProjectHostDescription
): { before: string; after: string } {
  if (host.kind === "vm") {
    return {
      before: "This removes ",
      after:
        " from Hydra. Its VM recipe determines whether the environment and its files are permanently deleted.",
    };
  }
  if (host.kind === "ssh") {
    return {
      before: "This only removes ",
      after: ` from Hydra. Its files stay on ${host.label} — re-add that SSH host to recover it.`,
    };
  }
  return {
    before: "This only removes ",
    after: " from Hydra. It is still on your disk.",
  };
}

export function RemoveFolderDialog({
  open,
  projectName,
  host,
  onOpenChange,
  onConfirm,
}: RemoveFolderDialogProps): React.JSX.Element | null {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

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

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => cancelButtonRef.current?.focus());
    }
  }, [open]);

  if (!open) return null;

  const { before, after } = descriptionFor(host);

  return (
    <div
      className="fixed inset-0 z-[99998] flex items-center justify-center bg-black/65 backdrop-blur-xs select-none"
      onClick={() => onOpenChange(false)}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-sm rounded-xl border border-[#2a2b30] bg-[#141518] p-5 text-xs text-neutral-200 shadow-2xl"
      >
        <h2 className="text-sm font-semibold tracking-tight text-neutral-100">Remove Project</h2>
        <p className="mt-1.5 text-[12px] leading-relaxed text-neutral-400">
          {before}
          <span className="break-all font-medium text-foreground">{projectName}</span>
          {after}
        </p>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded border border-[#3f3f46] px-4 py-1.5 font-medium text-neutral-200 transition hover:bg-neutral-800 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex items-center gap-1.5 rounded bg-red-600 px-4 py-1.5 font-medium text-white transition hover:bg-red-500 cursor-pointer"
          >
            <Trash2 className="size-3.5" />
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
