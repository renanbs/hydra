// Repository-scoped settings (D03b-017).
//
// Orca opens the settings page targeting a repo pane from the sidebar's "Project Settings"
// action. Hydra's settings surface is a single app-level modal (no repo pane), so this
// dialog is the sidebar's own repo-scoped surface: it exposes exactly the repo-level
// writers Hydra has today (base worktree path, non-Hydra worktree visibility, removal),
// instead of sending the user to the global modal with no repo context.
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Eye, FolderInput, Save, Settings, Trash2, X } from "lucide-react";
import type { HydraProject } from "./types";

export interface RepoSettingsDialogProps {
  open: boolean;
  project: HydraProject | null;
  /** Opens the repo's non-Hydra worktree visibility dialog (the project's other settings). */
  onOpenWorktreeVisibility?: (project: HydraProject) => void;
  /** Starts the project-removal confirmation flow. */
  onRemoveProject?: (project: HydraProject) => void;
  onOpenChange: (open: boolean) => void;
}

export function RepoSettingsDialog({
  open,
  project,
  onOpenWorktreeVisibility,
  onRemoveProject,
  onOpenChange,
}: RepoSettingsDialogProps): React.JSX.Element | null {
  const [basePathDraft, setBasePathDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !project) return;
    setBasePathDraft(project.worktree_base_path ?? "");
    setError(null);
  }, [open, project]);

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

  if (!open || !project) return null;

  const saveBasePath = async () => {
    try {
      await invoke("set_project_worktree_base", {
        path: project.path,
        basePath: basePathDraft.trim() ? basePathDraft.trim() : null,
      });
      window.dispatchEvent(new CustomEvent("hydra:refresh-projects"));
      onOpenChange(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Project settings for ${project.displayName || project.name}`}
      data-repo-settings-dialog=""
      className="fixed inset-0 z-[99998] flex items-center justify-center bg-black/60 select-none"
      onClick={() => onOpenChange(false)}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-xl border border-worktree-sidebar-border bg-worktree-sidebar p-5 text-xs text-worktree-sidebar-foreground shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Settings className="size-4 text-worktree-sidebar-foreground/70" />
            <div>
              <h2 className="text-sm font-semibold tracking-tight">
                {project.displayName || project.name}
              </h2>
              <p className="mt-0.5 break-all font-mono text-[10px] text-muted-foreground">
                {project.path}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close project settings"
            onClick={() => onOpenChange(false)}
            className="rounded p-1 text-muted-foreground transition hover:bg-worktree-sidebar-accent hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        {error ? (
          <p className="mt-3 rounded bg-destructive/10 px-2 py-1.5 text-[11px] text-destructive">
            {error}
          </p>
        ) : null}

        <label className="mt-4 block space-y-1">
          <span className="flex items-center gap-1.5 text-[11px] font-medium">
            <FolderInput className="size-3.5 text-muted-foreground" />
            Base worktrees path
          </span>
          <input
            value={basePathDraft}
            onChange={(event) => setBasePathDraft(event.target.value)}
            placeholder="Default: beside the repository"
            aria-label="Base worktrees path"
            className="w-full rounded-md border border-worktree-sidebar-border bg-worktree-sidebar-foreground/5 px-2 py-1.5 text-[11px] outline-none focus:border-worktree-sidebar-ring/60"
          />
          <span className="block text-[10px] text-muted-foreground">
            Where new workspaces for this project are created by default.
          </span>
        </label>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void saveBasePath()}
            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-2.5 py-1.5 text-[11px] font-medium text-white transition hover:bg-emerald-500"
          >
            <Save className="size-3.5" />
            Save
          </button>
          {onOpenWorktreeVisibility ? (
            <button
              type="button"
              onClick={() => {
                onOpenWorktreeVisibility(project);
                onOpenChange(false);
              }}
              className="inline-flex items-center gap-1.5 rounded-md border border-worktree-sidebar-border px-2.5 py-1.5 text-[11px] transition hover:bg-worktree-sidebar-accent"
            >
              <Eye className="size-3.5" />
              Non-Hydra worktrees…
            </button>
          ) : null}
          {onRemoveProject ? (
            <button
              type="button"
              onClick={() => {
                onRemoveProject(project);
                onOpenChange(false);
              }}
              className="ml-auto inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] text-destructive transition hover:bg-destructive/10"
            >
              <Trash2 className="size-3.5" />
              Remove project
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
