// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
import React, { useEffect, useState, useMemo } from "react";
import { Search, FolderGit2, X, Eye } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import type { GitWorktreeInfo, HydraProject } from "./types";

export interface WorktreeVisibilityDialogProps {
  open: boolean;
  project: HydraProject | null;
  hiddenWorktrees: GitWorktreeInfo[];
  onOpenChange: (open: boolean) => void;
  onImported?: (worktreePath: string) => void;
}

export function WorktreeVisibilityDialog({
  open,
  project,
  hiddenWorktrees,
  onOpenChange,
  onImported,
}: WorktreeVisibilityDialogProps): React.JSX.Element | null {
  const [query, setQuery] = useState("");
  const [busyPath, setBusyPath] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setBusyPath(null);
    }
  }, [open]);

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

  const filteredWorktrees = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return hiddenWorktrees;
    return hiddenWorktrees.filter(
      (wt) =>
        wt.branch.toLowerCase().includes(q) ||
        wt.path.toLowerCase().includes(q)
    );
  }, [hiddenWorktrees, query]);

  const handleShow = async (wtPath: string) => {
    if (!project || busyPath) return;
    setBusyPath(wtPath);
    try {
      await invoke("import_worktree", {
        projectPath: project.path,
        worktreePath: wtPath,
      });
      onImported?.(wtPath);
      window.dispatchEvent(new CustomEvent("hydra:refresh-projects"));
    } catch (err) {
      console.error("Failed to import worktree:", err);
    } finally {
      setBusyPath(null);
    }
  };

  if (!open || !project) return null;

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
          <div>
            <h2 className="text-sm font-semibold text-neutral-100 tracking-tight">
              Non-Hydra worktrees
            </h2>
            <p className="text-[12px] text-neutral-400">
              {project.name} — Worktrees detected on disk outside configured workspace roots.
            </p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {hiddenWorktrees.length > 5 && (
          <div className="relative shrink-0">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 size-3.5 text-neutral-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${hiddenWorktrees.length} hidden worktrees...`}
              className="w-full h-8 pl-8 pr-3 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/30 transition"
            />
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-2 min-h-[120px] max-h-[360px] pr-1">
          {filteredWorktrees.length > 0 ? (
            filteredWorktrees.map((wt) => {
              const displayPath = wt.path.replace(project.path, "").replace(/^\//, "") || wt.path;
              const isBusy = busyPath === wt.path;
              return (
                <div
                  key={wt.path}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border border-neutral-800 bg-neutral-950/60 hover:bg-neutral-900/60 transition"
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-1.5 font-medium text-[13px] text-neutral-200 truncate">
                      <FolderGit2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">{wt.branch || "unnamed"}</span>
                    </div>
                    <div className="font-mono text-[10px] text-neutral-500 truncate" title={wt.path}>
                      {displayPath}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleShow(wt.path)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition cursor-pointer disabled:opacity-50"
                  >
                    <Eye className="w-3.5 h-3.5 text-neutral-400" />
                    <span>{isBusy ? "Showing..." : "Show"}</span>
                  </button>
                </div>
              );
            })
          ) : (
            <div className="py-8 text-center text-neutral-500 text-xs">
              No hidden worktrees found.
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-neutral-800 shrink-0 text-[11px] text-neutral-500">
          <span>{hiddenWorktrees.length} total hidden worktree{hiddenWorktrees.length === 1 ? "" : "s"}</span>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-3.5 py-1.5 rounded-lg border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-medium transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
