// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Parity with Orca `components/sidebar/NonGitFolderDialog.tsx`: a folder that is not a
// Git repository can still be opened as a project, but the user must know that editor,
// terminal and search work while Git features stay unavailable.
import { useEffect } from "react";
import { FolderOpen } from "lucide-react";

export interface NonGitFolderDialogProps {
  open: boolean;
  folderPath: string;
  /** Where the path was verified: local, a named SSH host, or a runtime. */
  hostLabel?: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function NonGitFolderDialog({
  open,
  folderPath,
  hostLabel = null,
  onOpenChange,
  onConfirm,
}: NonGitFolderDialogProps): React.JSX.Element | null {
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

  return (
    <div
      className="fixed inset-0 z-[99998] flex items-center justify-center bg-black/65 backdrop-blur-xs select-none"
      onClick={() => onOpenChange(false)}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-sm rounded-xl border border-[#2a2b30] bg-[#141518] p-5 text-xs text-neutral-200 shadow-2xl"
      >
        <div className="flex items-start gap-2">
          <FolderOpen className="mt-0.5 size-4 shrink-0 text-amber-400" />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold tracking-tight text-neutral-100">
              Not a Git repository
            </h2>
            <p className="mt-1.5 text-[12px] leading-relaxed text-neutral-400">
              The editor, terminal and search work in this folder, but Git features
              (branches, worktrees, diffs) stay unavailable
              {hostLabel ? ` on ${hostLabel}` : " on this host"}.
            </p>
          </div>
        </div>

        <div className="mt-3 break-all rounded border border-[#2a2b30] bg-[#191a1e] px-3 py-2 font-mono text-[11px] text-neutral-300">
          {folderPath}
        </div>

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
            onClick={onConfirm}
            className="rounded bg-emerald-600 px-4 py-1.5 font-medium text-white transition hover:bg-emerald-500 cursor-pointer"
          >
            Open as folder project
          </button>
        </div>
      </div>
    </div>
  );
}
