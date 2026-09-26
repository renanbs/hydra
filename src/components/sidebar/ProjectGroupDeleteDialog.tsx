// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
import React, { useCallback, useEffect, useRef, useState } from "react";
import { FolderGit2 } from "lucide-react";

export interface ProjectGroupDeleteDialogProps {
  open: boolean;
  groupName: string;
  projectCount: number;
  projectNames?: string[];
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void> | void;
}

export function ProjectGroupDeleteDialog({
  open,
  groupName,
  projectCount,
  projectNames = [],
  onOpenChange,
  onConfirm,
}: ProjectGroupDeleteDialogProps): React.JSX.Element | null {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (open) {
      setDeleting(false);
      requestAnimationFrame(() => {
        confirmButtonRef.current?.focus();
      });
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (!deleting) onOpenChange(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, deleting, onOpenChange]);

  const handleConfirm = useCallback(async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to delete project group:", error);
    } finally {
      setDeleting(false);
    }
  }, [deleting, onConfirm, onOpenChange]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[99998] flex items-center justify-center bg-black/65 backdrop-blur-xs select-none"
      onClick={() => {
        if (!deleting) onOpenChange(false);
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-xl bg-[#141518] border border-[#2a2b30] shadow-2xl text-xs text-neutral-200 p-5 space-y-4"
      >
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-neutral-100 tracking-tight">
            Delete Project Group
          </h2>
          <p className="text-[12px] leading-relaxed text-neutral-400">
            Delete group{" "}
            <span className="break-all font-medium text-neutral-200">
              {groupName}
            </span>
            .
          </p>
        </div>

        {projectCount > 0 && (
          <div className="space-y-2 text-xs">
            {projectNames.length > 0 && (
              <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-2.5 space-y-1.5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.05em] text-neutral-400">
                  Contained projects ({projectCount})
                </div>
                <ul className="space-y-1">
                  {projectNames.slice(0, 4).map((projectName, index) => (
                    <li
                      key={`${projectName}:${index}`}
                      className="flex items-center gap-1.5 truncate text-[11px] text-neutral-300"
                      title={projectName}
                    >
                      <FolderGit2 className="w-3 h-3 text-neutral-500 shrink-0" />
                      <span className="truncate">{projectName}</span>
                    </li>
                  ))}
                  {projectNames.length > 4 && (
                    <li className="text-[10px] text-neutral-400 pl-4.5">
                      +{projectNames.length - 4} more
                    </li>
                  )}
                </ul>
              </div>
            )}

            <div className="text-[11px] text-neutral-400">
              Project folders on disk are not deleted. Member projects will remain in the sidebar, ungrouped.
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            disabled={deleting}
            onClick={() => onOpenChange(false)}
            className="px-3 py-1.5 rounded-lg border border-neutral-800 bg-neutral-900/60 hover:bg-neutral-800 text-neutral-300 text-xs font-medium transition cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            disabled={deleting}
            onClick={handleConfirm}
            className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium transition shadow-xs cursor-pointer disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete Group"}
          </button>
        </div>
      </div>
    </div>
  );
}
