// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Parity with Orca `components/sidebar/WorktreeVisibilityDialog.tsx`: the `Non-Hydra
// worktrees` modal carries four blocks — Source rows (built-in Claude Code/GSD, custom
// roots, `Other locations`) with Show/Hide toggles, a `Worktree root` add form, the
// global-settings override note, and the `Hidden worktrees (N)` recovery list.
import React, { useEffect, useState, useMemo } from "react";
import { Search, FolderGit2, X, Eye, Plus, Trash2, Settings } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import type { GitWorktreeInfo, HydraProject } from "./types";
import {
  BUILT_IN_WORKTREE_VISIBILITY_SOURCES,
  OTHER_LOCATIONS_SOURCE_LABEL,
  OTHER_LOCATIONS_SOURCE_PATH,
  addCustomWorktreeVisibilitySource,
  buildWorktreeSourcePreferenceUpdate,
  buildWorktreeVisibilitySourceRows,
  countWorktreesByVisibilitySource,
  effectiveBuiltInWorktreeSourceVisibility,
  effectiveExternalWorktreeVisibility,
  normalizeCustomWorktreeVisibilitySources,
  removeCustomWorktreeSourcePreference,
  removeCustomWorktreeVisibilitySource,
  resolveCustomWorktreeVisibilitySources,
  worktreeVisibilitySourceRowKey,
  worktreeVisibilitySourceRowVisibility,
  type CustomWorktreeVisibilitySource,
  type ExternalWorktreeVisibility,
  type WorktreeVisibilityDefaults,
  type WorktreeVisibilityRepoConfig,
  type WorktreeVisibilitySourceRow,
} from "@/lib/worktree-visibility-sources";

export interface WorktreeVisibilityDialogProps {
  open: boolean;
  project: HydraProject | null;
  hiddenWorktrees: GitWorktreeInfo[];
  /** Global `worktree_visibility_defaults`; rows without a project override read these. */
  visibilityDefaults?: WorktreeVisibilityDefaults;
  onOpenChange: (open: boolean) => void;
  onImported?: (worktreePath: string) => void;
  /** Opens Global Settings so the override note can point at the real control. */
  onOpenGlobalSettings?: () => void;
}

const EMPTY_DEFAULTS: WorktreeVisibilityDefaults = {};

function repoVisibilityConfig(project: HydraProject): WorktreeVisibilityRepoConfig {
  return {
    externalWorktreeVisibility: project.externalWorktreeVisibility ?? null,
    externalWorktreeVisibilityLegacy: project.externalWorktreeVisibilityLegacy ?? null,
    customWorktreeVisibilitySources: project.customWorktreeVisibilitySources ?? null,
    worktreeVisibilitySourcePreferences: project.worktreeVisibilitySourcePreferences ?? null,
  };
}

function sourceRowLabel(row: WorktreeVisibilitySourceRow): string {
  if (row.kind === "built-in") {
    return (
      BUILT_IN_WORKTREE_VISIBILITY_SOURCES.find((source) => source.id === row.id)?.label ?? row.id
    );
  }
  if (row.kind === "custom") {
    return row.source.rootPath.replace(/[\\/]+$/, "").split(/[\\/]/).filter(Boolean).pop() || row.source.rootPath;
  }
  return OTHER_LOCATIONS_SOURCE_LABEL;
}

function sourceRowPath(row: WorktreeVisibilitySourceRow): string {
  if (row.kind === "built-in") {
    return BUILT_IN_WORKTREE_VISIBILITY_SOURCES.find((source) => source.id === row.id)?.path ?? "";
  }
  if (row.kind === "custom") {
    return `${row.source.rootPath.replace(/[\\/]+$/, "")}/*`;
  }
  return OTHER_LOCATIONS_SOURCE_PATH;
}

export function WorktreeVisibilityDialog({
  open,
  project,
  hiddenWorktrees,
  visibilityDefaults = EMPTY_DEFAULTS,
  onOpenChange,
  onImported,
  onOpenGlobalSettings,
}: WorktreeVisibilityDialogProps): React.JSX.Element | null {
  const [query, setQuery] = useState("");
  const [busyPath, setBusyPath] = useState<string | null>(null);
  const [savingSource, setSavingSource] = useState(false);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [rootDraft, setRootDraft] = useState("");
  // Local mirror of the project's visibility config: the sidebar hands the dialog a
  // snapshot, so writes need a local echo until the next `catalog_get` lands.
  const [draftConfig, setDraftConfig] = useState<WorktreeVisibilityRepoConfig | null>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setBusyPath(null);
      setSavingSource(false);
      setSourceError(null);
      setRootDraft("");
      setDraftConfig(null);
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

  const config = useMemo<WorktreeVisibilityRepoConfig>(
    () => draftConfig ?? (project ? repoVisibilityConfig(project) : {}),
    [draftConfig, project]
  );

  const customSources = useMemo<CustomWorktreeVisibilitySource[]>(
    () => resolveCustomWorktreeVisibilitySources(config, visibilityDefaults),
    [config, visibilityDefaults]
  );

  const sourceRows = useMemo(
    () => buildWorktreeVisibilitySourceRows(customSources),
    [customSources]
  );

  // Orca shows `Remove` only for roots the project itself owns; global roots are
  // overridden, not removed.
  const repoSourceIds = useMemo(
    () =>
      new Set(
        normalizeCustomWorktreeVisibilitySources(project?.customWorktreeVisibilitySources)?.map(
          (source) => source.id
        ) ?? []
      ),
    [project?.customWorktreeVisibilitySources]
  );

  const sourceCounts = useMemo(
    () => countWorktreesByVisibilitySource(hiddenWorktrees, project?.path, customSources),
    [customSources, hiddenWorktrees, project?.path]
  );

  const filteredWorktrees = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return hiddenWorktrees;
    return hiddenWorktrees.filter(
      (wt) => wt.branch.toLowerCase().includes(q) || wt.path.toLowerCase().includes(q)
    );
  }, [hiddenWorktrees, query]);

  const persistSources = async (nextConfig: WorktreeVisibilityRepoConfig) => {
    if (!project || savingSource) return;
    setSavingSource(true);
    setSourceError(null);
    try {
      // FULL REPLACE: every call carries the complete desired state, so omitting a field
      // would clear it in the catalog.
      await invoke("catalog_set_worktree_visibility_sources", {
        repoPath: project.path,
        customSources: nextConfig.customWorktreeVisibilitySources ?? null,
        sourcePreferences: nextConfig.worktreeVisibilitySourcePreferences ?? null,
        externalWorktreeVisibilityLegacy: nextConfig.externalWorktreeVisibilityLegacy ?? null,
        externalWorktreeVisibility: nextConfig.externalWorktreeVisibility ?? null,
      });
      setDraftConfig(nextConfig);
      window.dispatchEvent(new CustomEvent("hydra:refresh-projects"));
    } catch (err) {
      console.error("Failed to save worktree visibility sources:", err);
      setSourceError("Could not save worktree visibility. Try again.");
    } finally {
      setSavingSource(false);
    }
  };

  const handleToggleSource = async (
    row: WorktreeVisibilitySourceRow,
    visibility: ExternalWorktreeVisibility
  ) => {
    if (row.kind === "other") {
      await persistSources({ ...config, externalWorktreeVisibility: visibility });
      return;
    }
    const match =
      row.kind === "built-in"
        ? ({ kind: "built-in", id: row.id } as const)
        : ({ kind: "custom", id: row.source.id } as const);
    await persistSources({
      ...config,
      worktreeVisibilitySourcePreferences: buildWorktreeSourcePreferenceUpdate(
        config,
        match,
        visibility
      ),
    });
  };

  const handleAddSource = async () => {
    const rootPath = rootDraft.trim();
    if (!rootPath || !project || savingSource) return;
    const id = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).replaceAll("-", "");
    const added = addCustomWorktreeVisibilitySource(config, visibilityDefaults, id, rootPath);
    if (!added.ok) {
      setSourceError(
        added.reason === "duplicate-path"
          ? "That folder is already a worktree root."
          : added.reason === "limit"
            ? "Too many custom worktree roots."
            : "Enter an absolute folder path."
      );
      return;
    }
    setRootDraft("");
    await persistSources({ ...config, customWorktreeVisibilitySources: added.sources });
  };

  const handleRemoveSource = async (source: CustomWorktreeVisibilitySource) => {
    if (!project || savingSource) return;
    await persistSources({
      ...config,
      customWorktreeVisibilitySources: removeCustomWorktreeVisibilitySource(customSources, source.id),
      worktreeVisibilitySourcePreferences: removeCustomWorktreeSourcePreference(config, source.id),
    });
  };

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

        <div className="flex-1 overflow-y-auto space-y-4 min-h-[120px] pr-1">
          {/* a) Sources */}
          <section aria-labelledby="wv-sources-heading" className="space-y-2">
            <div>
              <h3 id="wv-sources-heading" className="text-[13px] font-semibold text-neutral-100">
                Sources
              </h3>
              <p className="text-[11px] text-neutral-500">
                Shown sources include current and future worktrees in the sidebar.
              </p>
            </div>
            <div className="overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950/60">
              {sourceRows.map((row, index) => {
                const visibility = worktreeVisibilitySourceRowVisibility(config, row, visibilityDefaults);
                const count = sourceCounts.get(worktreeVisibilitySourceRowKey(row)) ?? 0;
                return (
                  <div
                    key={worktreeVisibilitySourceRowKey(row)}
                    className={`flex items-center justify-between gap-3 px-3 py-2.5 ${
                      index > 0 ? "border-t border-neutral-800" : ""
                    }`}
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-[13px] font-medium text-neutral-200">
                          {sourceRowLabel(row)}
                        </span>
                        <span className="shrink-0 text-[11px] text-neutral-500">{count} found</span>
                      </div>
                      <div className="truncate font-mono text-[10px] text-neutral-500">
                        {sourceRowPath(row)}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {row.kind === "custom" && repoSourceIds.has(row.source.id) && (
                        <button
                          type="button"
                          disabled={savingSource}
                          aria-label={`Remove ${sourceRowLabel(row)}`}
                          onClick={() => void handleRemoveSource(row.source)}
                          className="p-1 rounded-md text-neutral-500 hover:text-destructive hover:bg-neutral-800 transition cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <div
                        role="group"
                        aria-label={`Visibility for ${sourceRowLabel(row)}`}
                        className="flex items-center rounded-md border border-neutral-800 bg-neutral-900 p-0.5"
                      >
                        {(["show", "hide"] as const).map((option) => (
                          <button
                            key={option}
                            type="button"
                            disabled={savingSource}
                            aria-pressed={visibility === option}
                            onClick={() => void handleToggleSource(row, option)}
                            className={`min-w-11 rounded px-2 py-1 text-[11px] font-medium transition cursor-pointer disabled:opacity-50 ${
                              visibility === option
                                ? "bg-neutral-700 text-neutral-100"
                                : "text-neutral-400 hover:text-neutral-200"
                            }`}
                          >
                            {option === "show" ? "Show" : "Hide"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* b) Worktree root */}
          <section aria-labelledby="wv-root-heading" className="space-y-2">
            <h3 id="wv-root-heading" className="text-[13px] font-semibold text-neutral-100">
              Worktree root
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={rootDraft}
                onChange={(e) => setRootDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleAddSource();
                }}
                placeholder="/path/to/worktrees"
                className="flex-1 h-8 px-3 rounded-lg bg-neutral-950 border border-neutral-800 font-mono text-neutral-100 text-[11px] placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/30 transition"
              />
              <button
                type="button"
                disabled={savingSource || !rootDraft.trim()}
                onClick={() => void handleAddSource()}
                className="inline-flex shrink-0 items-center gap-1 px-3 h-8 rounded-lg border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-medium transition cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
            <p className="text-[11px] text-neutral-500">
              Hydra will recognize worktrees beneath this folder.
            </p>
          </section>

          {/* c) Global-settings override note */}
          <section className="rounded-lg border border-neutral-800 bg-neutral-950/40 p-3 space-y-2">
            <p className="text-[11px] text-neutral-400">
              These sources have a global setting you can override here:
            </p>
            <ul className="space-y-1" aria-label="Global source visibility">
              <li className="flex items-center justify-between text-[11px] text-neutral-400">
                <span>Claude Code</span>
                <span className="font-medium text-neutral-200">
                  {effectiveBuiltInWorktreeSourceVisibility(null, "claude", visibilityDefaults) === "show"
                    ? "Show"
                    : "Hide"}
                </span>
              </li>
              <li className="flex items-center justify-between text-[11px] text-neutral-400">
                <span>GSD</span>
                <span className="font-medium text-neutral-200">
                  {effectiveBuiltInWorktreeSourceVisibility(null, "gsd", visibilityDefaults) === "show"
                    ? "Show"
                    : "Hide"}
                </span>
              </li>
              <li className="flex items-center justify-between text-[11px] text-neutral-400">
                <span>{OTHER_LOCATIONS_SOURCE_LABEL}</span>
                <span className="font-medium text-neutral-200">
                  {effectiveExternalWorktreeVisibility(null, visibilityDefaults) === "show"
                    ? "Show"
                    : "Hide"}
                </span>
              </li>
            </ul>
            <button
              type="button"
              onClick={() => onOpenGlobalSettings?.()}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-indigo-300 hover:text-indigo-200 transition cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
              Manage in Global Settings
            </button>
          </section>

          {/* d) Hidden worktrees (N) */}
          <section aria-labelledby="wv-hidden-heading" className="space-y-2">
            <div>
              <h3 id="wv-hidden-heading" className="text-[13px] font-semibold text-neutral-100">
                Hidden worktrees ({hiddenWorktrees.length})
              </h3>
              <p className="text-[11px] text-neutral-500">
                Show one without enabling its source.
              </p>
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

            <div className="space-y-2">
              {filteredWorktrees.length > 0 ? (
                filteredWorktrees.map((wt) => {
                  const displayPath =
                    wt.path.replace(project.path, "").replace(/^\//, "") || wt.path;
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
                        <div
                          className="font-mono text-[10px] text-neutral-500 truncate"
                          title={wt.path}
                        >
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
          </section>

          {sourceError && (
            <p className="text-[11px] text-destructive" role="alert">
              {sourceError}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-neutral-800 shrink-0 text-[11px] text-neutral-500">
          <span>
            {hiddenWorktrees.length} total hidden worktree
            {hiddenWorktrees.length === 1 ? "" : "s"}
          </span>
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
