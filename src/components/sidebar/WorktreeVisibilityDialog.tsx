// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Parity with Orca `components/sidebar/WorktreeVisibilityDialog.tsx`: the `Non-Hydra
// worktrees` modal stacks Sources (built-in Claude Code/GSD, custom roots, `Other
// locations`) with Show/Hide toggles + a per-source `Use global` link that drops a repo
// override matching Global Settings (for built-ins it also clears the repo's
// `agentWorktreeVisibility` agent-scratch policy), the `Worktree root` add form, the global-settings
// override note, the scan-status/`Try again` line (Orca `WorktreeVisibilityScanStatus`),
// and the `Hidden worktrees (N)` recovery list.
import React, { useCallback, useEffect, useLayoutEffect, useState, useMemo, useRef } from "react";
import { Search, FolderGit2, X, Eye, Plus, Trash2, Settings } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "@/store";
import type { CatalogEnvelope, CatalogRepo } from "@/lib/catalog-types";
import type { GitWorktreeInfo, HydraProject } from "./types";
import {
  resolveWorktreeVisibilityHostTarget,
  useWorktreeVisibilityHostActions,
  type WorktreeVisibilityFetchOptions,
  type WorktreeVisibilityUpdateOptions,
} from "./worktree-visibility-host-target";
import {
  finishVisibilityMutation,
  getActiveVisibilityMutation,
  startVisibilityMutation,
  useVisibilityMutationFence,
  type ActiveVisibilityMutation,
} from "./worktree-visibility-mutation-fence";
import { getRepoCustomWorktreeVisibilitySourceIds } from "./worktree-visibility-repo-sources";
import { createWorktreeVisibilitySourceMutation } from "./worktree-visibility-source-mutation";
import {
  BUILT_IN_WORKTREE_VISIBILITY_SOURCES,
  OTHER_LOCATIONS_SOURCE_LABEL,
  OTHER_LOCATIONS_SOURCE_PATH,
  addCustomWorktreeVisibilitySource,
  buildWorktreeVisibilitySourceRows,
  countWorktreesByVisibilitySource,
  effectiveBuiltInWorktreeSourceVisibility,
  effectiveExternalWorktreeVisibility,
  getWorktreeVisibilitySourceProvenance,
  normalizeCustomWorktreeVisibilitySources,
  normalizeWorktreeVisibilitySourcePreferences,
  removeBuiltInWorktreeSourcePreference,
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
  /**
   * Execution host the modal is mutating (Orca `modalData.hostId`). Two hosts can share the
   * same repo id/path, so the write scope must name the target host or a stale host answers.
   */
  hostId?: string | null;
  hiddenWorktrees: GitWorktreeInfo[];
  /** Global `worktree_visibility_defaults`; rows without a project override read these. */
  visibilityDefaults?: WorktreeVisibilityDefaults;
  onOpenChange: (open: boolean) => void;
  onImported?: (worktreePath: string) => void;
  /** Opens Global Settings so the override note can point at the real control. */
  onOpenGlobalSettings?: () => void;
}

const EMPTY_DEFAULTS: WorktreeVisibilityDefaults = {};

function repoVisibilityConfig(source: HydraProject | CatalogRepo): WorktreeVisibilityRepoConfig {
  return {
    externalWorktreeVisibility: source.externalWorktreeVisibility ?? null,
    externalWorktreeVisibilityLegacy: source.externalWorktreeVisibilityLegacy ?? null,
    agentWorktreeVisibility: source.agentWorktreeVisibility ?? null,
    externalWorktreeDiscoverySuppressedAt: source.externalWorktreeDiscoverySuppressedAt ?? null,
    customWorktreeVisibilitySources: source.customWorktreeVisibilitySources ?? null,
    worktreeVisibilitySourcePreferences: source.worktreeVisibilitySourcePreferences ?? null,
  };
}

/** The target host's row as the write returned it — Orca reads the same fields off `updateRepo`'s store row. */
function findCatalogRepoVisibilityConfig(
  envelope: CatalogEnvelope | null | undefined,
  repoPath: string
): WorktreeVisibilityRepoConfig | null {
  const repo = envelope?.repos?.find((candidate) => candidate.path === repoPath);
  return repo ? repoVisibilityConfig(repo) : null;
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
  hostId,
  hiddenWorktrees,
  visibilityDefaults = EMPTY_DEFAULTS,
  onOpenChange,
  onImported,
  onOpenGlobalSettings,
}: WorktreeVisibilityDialogProps): React.JSX.Element | null {
  const [query, setQuery] = useState("");
  const [busyPath, setBusyPath] = useState<string | null>(null);
  const [isToggling, setIsToggling] = useState(false);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [rootDraft, setRootDraft] = useState("");
  // Local mirror of the project's visibility config: the sidebar hands the dialog a
  // snapshot, so writes need a local echo until the next `catalog_get` lands.
  const [draftConfig, setDraftConfig] = useState<WorktreeVisibilityRepoConfig | null>(null);
  // Orca `WorktreeVisibilityScanStatus` state: the dialog re-scans the repo on open and on
  // `Try again`, so the recovery list reflects disk rather than the sidebar's last snapshot.
  const [scanState, setScanState] = useState<"checking" | "ready" | "failed">("ready");
  const [scannedHidden, setScannedHidden] = useState<GitWorktreeInfo[] | null>(null);

  // Orca resolves the target repo + host from the store (`modalData.hostId`); Hydra's modal is
  // props-driven, so the host arrives as `hostId` and the repo row comes from the sidebar's
  // `repos` slice. The scope key is host+repo, keeping two hosts that share id/path distinct.
  const storeRepos = useAppStore((s) => s.repos);
  const storeSettings = useAppStore((s) => s.settings);
  const storeDetectedWorktrees = useAppStore((s) => s.detectedWorktreesByRepo);
  const repoId = project?.id ?? "";
  const {
    repo: targetRepo,
    requestedHostId,
    scope: mutationScope,
  } = useMemo(
    () =>
      resolveWorktreeVisibilityHostTarget(
        {
          repos: storeRepos,
          settings: storeSettings,
          detectedWorktreesByRepo: storeDetectedWorktrees,
        },
        repoId,
        hostId
      ),
    [storeRepos, storeSettings, storeDetectedWorktrees, repoId, hostId]
  );
  const currentScopeRef = useRef(mutationScope);
  useLayoutEffect(() => {
    currentScopeRef.current = mutationScope;
  }, [mutationScope]);

  const fetchTargetWorktrees = useCallback(
    async (_repoId: string, options?: WorktreeVisibilityFetchOptions): Promise<boolean> => {
      const repoPath = project?.path;
      if (!repoPath) return false;
      setScanState("checking");
      try {
        const scan = await invoke<{ hidden?: GitWorktreeInfo[] }>("scan_worktrees", {
          repoPath,
          ...(options?.executionHostId ? { executionHostId: options.executionHostId } : {}),
        });
        if (Array.isArray(scan?.hidden)) {
          setScannedHidden(scan.hidden);
        }
        setScanState("ready");
        return true;
      } catch (err) {
        console.error("Failed to scan worktrees:", err);
        setScanState("failed");
        return false;
      }
    },
    [project?.path]
  );

  // FULL REPLACE, as the Rust command expects: every field is sent so an omitted one would
  // clear it in the catalog. `executionHostId` names the target host when one was resolved.
  const writeTargetRepo = useCallback(
    async (
      _repoId: string,
      nextConfig: WorktreeVisibilityRepoConfig,
      options?: WorktreeVisibilityUpdateOptions
    ) => {
      const repoPath = project?.path;
      if (!repoPath) return null;
      const envelope = await invoke<CatalogEnvelope | null>(
        "catalog_set_worktree_visibility_sources",
        {
          repoPath,
          customSources: nextConfig.customWorktreeVisibilitySources ?? null,
          sourcePreferences: nextConfig.worktreeVisibilitySourcePreferences ?? null,
          externalWorktreeVisibilityLegacy: nextConfig.externalWorktreeVisibilityLegacy ?? null,
          externalWorktreeVisibility: nextConfig.externalWorktreeVisibility ?? null,
          agentWorktreeVisibility: nextConfig.agentWorktreeVisibility ?? null,
          externalWorktreeDiscoverySuppressedAt:
            nextConfig.externalWorktreeDiscoverySuppressedAt ?? null,
          ...(options?.hostId ? { executionHostId: options.hostId } : {}),
        }
      );
      return { repo: findCatalogRepoVisibilityConfig(envelope, repoPath) };
    },
    [project?.path]
  );

  const { refreshTargetRepo, updateTargetRepo } = useWorktreeVisibilityHostActions<
    WorktreeVisibilityRepoConfig,
    { repo: WorktreeVisibilityRepoConfig | null } | null
  >(fetchTargetWorktrees, writeTargetRepo, requestedHostId);

  useVisibilityMutationFence({
    scope: mutationScope,
    repoId,
    currentScopeRef,
    refresh: refreshTargetRepo,
    setActionState: setSourceError,
    setBusyPath,
    setIsToggling,
    setListState: setScanState,
  });

  const refreshWorktreeScan = useCallback(
    () => refreshTargetRepo(repoId, { requireAuthoritative: true }),
    [refreshTargetRepo, repoId]
  );

  useEffect(() => {
    if (!open || !repoId) return;
    // Why: reopening mid-write must not start a scan that can absorb the mutation's
    // confirmation refresh (Orca's open-time `getActiveVisibilityMutation` guard).
    if (getActiveVisibilityMutation(mutationScope)) return;
    setScannedHidden(null);
    void refreshTargetRepo(repoId, { requireAuthoritative: true });
  }, [open, mutationScope, refreshTargetRepo, repoId]);

  useEffect(() => {
    if (open) {
      setQuery("");
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

  // Until a scan lands, the sidebar's snapshot is the best list the dialog has.
  const recoveredWorktrees = scannedHidden ?? hiddenWorktrees;

  // Orca shows `Remove` only for roots the project itself owns; global roots are
  // overridden, not removed. When the store resolved the target row we read its sources,
  // so a sibling host's roots never expose a remove action on this host.
  const repoSourceIds = useMemo(
    () =>
      targetRepo
        ? getRepoCustomWorktreeVisibilitySourceIds(targetRepo)
        : new Set(
            normalizeCustomWorktreeVisibilitySources(project?.customWorktreeVisibilitySources)?.map(
              (source) => source.id
            ) ?? []
          ),
    [targetRepo, project?.customWorktreeVisibilitySources]
  );

  const sourceCounts = useMemo(
    () => countWorktreesByVisibilitySource(recoveredWorktrees, project?.path, customSources),
    [customSources, recoveredWorktrees, project?.path]
  );

  const filteredWorktrees = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return recoveredWorktrees;
    return recoveredWorktrees.filter(
      (wt) => wt.branch.toLowerCase().includes(q) || wt.path.toLowerCase().includes(q)
    );
  }, [recoveredWorktrees, query]);

  /**
   * Orca `commitSourceUpdate`: the write only counts when the target host returned a row
   * that satisfies the mutation's predicate. A host that silently drops the additive
   * `worktreeVisibilitySourcePreferences` fails it, so the dialog never echoes a false
   * success and the rows stay on the host's real state.
   */
  const commitSourceUpdate = useCallback(
    async (
      nextConfig: WorktreeVisibilityRepoConfig,
      isAccepted: (latestRepo: WorktreeVisibilityRepoConfig) => boolean
    ): Promise<boolean> => {
      if (!project || !repoId) return false;
      const mutation: ActiveVisibilityMutation = { kind: "toggle" };
      startVisibilityMutation(mutationScope, mutation);
      setSourceError(null);
      setIsToggling(true);
      try {
        const result = await updateTargetRepo(repoId, nextConfig);
        const latestRepo = result?.repo ?? null;
        if (!result || !latestRepo || !isAccepted(latestRepo)) {
          if (currentScopeRef.current === mutationScope) {
            const requestedPreferences = nextConfig.worktreeVisibilitySourcePreferences ?? undefined;
            setSourceError(
              result &&
                latestRepo &&
                latestRepo.worktreeVisibilitySourcePreferences == null &&
                requestedPreferences != null
                ? "This host doesn't support source-specific worktree visibility. Update Hydra on the host to change this setting."
                : "Could not update worktree visibility. Try again."
            );
          }
          return false;
        }
        setDraftConfig(nextConfig);
        window.dispatchEvent(new CustomEvent("hydra:refresh-projects"));
        // Orca re-reads the repo after a source write, so worktrees that just became shown
        // or hidden move between the sidebar and the recovery list in the same interaction.
        await refreshTargetRepo(repoId, { requireAuthoritative: true });
        return true;
      } catch (err) {
        console.error("Failed to save worktree visibility sources:", err);
        if (currentScopeRef.current === mutationScope) {
          setSourceError("Could not update worktree visibility. Try again.");
        }
        return false;
      } finally {
        finishVisibilityMutation(mutationScope, mutation);
        if (currentScopeRef.current === mutationScope) {
          setIsToggling(false);
        }
      }
    },
    [mutationScope, project, refreshTargetRepo, repoId, updateTargetRepo]
  );

  const handleToggleSource = async (
    row: WorktreeVisibilitySourceRow,
    visibility: ExternalWorktreeVisibility
  ) => {
    // Orca `createWorktreeVisibilitySourceMutation`: the update and its acceptance
    // predicate ship together, so the row only moves once the host confirmed it.
    const mutation = createWorktreeVisibilitySourceMutation(
      config,
      row,
      visibility,
      visibilityDefaults
    );
    await commitSourceUpdate({ ...config, ...mutation.updates }, mutation.isAccepted);
  };

  // Orca `handleUseDefault`: picking the value Global Settings already holds drops this
  // repo's override for that key instead of pinning a duplicate of it.
  const handleUseGlobal = async (row: WorktreeVisibilitySourceRow) => {
    if (!project || isToggling) return;
    if (row.kind === "other") {
      await commitSourceUpdate(
        { ...config, externalWorktreeVisibility: null },
        (latestRepo) => latestRepo.externalWorktreeVisibility == null
      );
      return;
    }
    if (row.kind === "built-in") {
      // Orca `createWorktreeVisibilityUseGlobalMutation`: the built-in row's revert drops
      // BOTH the per-source preference and the repo's agent-scratch policy.
      await commitSourceUpdate(
        {
          ...config,
          agentWorktreeVisibility: null,
          worktreeVisibilitySourcePreferences: removeBuiltInWorktreeSourcePreference(config, row.id),
        },
        (latestRepo) =>
          normalizeWorktreeVisibilitySourcePreferences(
            latestRepo.worktreeVisibilitySourcePreferences
          )?.builtIn?.[row.id] === undefined
      );
      return;
    }
    await commitSourceUpdate(
      {
        ...config,
        worktreeVisibilitySourcePreferences: removeCustomWorktreeSourcePreference(
          config,
          row.source.id
        ),
      },
      (latestRepo) =>
        normalizeWorktreeVisibilitySourcePreferences(
          latestRepo.worktreeVisibilitySourcePreferences
        )?.custom?.[row.source.id] === undefined
    );
  };

  const handleAddSource = async () => {
    const rootPath = rootDraft.trim();
    if (!rootPath || !project || isToggling) return;
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
    await commitSourceUpdate(
      { ...config, customWorktreeVisibilitySources: added.sources },
      (latestRepo) =>
        normalizeCustomWorktreeVisibilitySources(
          latestRepo.customWorktreeVisibilitySources
        )?.some((source) => source.rootPath === rootPath) === true
    );
  };

  const handleRemoveSource = async (source: CustomWorktreeVisibilitySource) => {
    if (!project || isToggling) return;
    await commitSourceUpdate(
      {
        ...config,
        customWorktreeVisibilitySources: removeCustomWorktreeVisibilitySource(customSources, source.id),
        worktreeVisibilitySourcePreferences: removeCustomWorktreeSourcePreference(config, source.id),
      },
      (latestRepo) =>
        !normalizeCustomWorktreeVisibilitySources(
          latestRepo.customWorktreeVisibilitySources
        )?.some((candidate) => candidate.id === source.id) &&
        normalizeWorktreeVisibilitySourcePreferences(
          latestRepo.worktreeVisibilitySourcePreferences
        )?.custom?.[source.id] === undefined
    );
  };

  const handleShow = async (wtPath: string) => {
    if (!project || busyPath) return;
    // The row mutation is fenced like a toggle: dismissing the modal must not drop its state.
    const mutation: ActiveVisibilityMutation = { kind: "row", path: wtPath };
    startVisibilityMutation(mutationScope, mutation);
    setBusyPath(wtPath);
    try {
      await invoke("import_worktree", {
        projectPath: project.path,
        worktreePath: wtPath,
        ...(requestedHostId ? { executionHostId: requestedHostId } : {}),
      });
      onImported?.(wtPath);
      // The sidebar hands the dialog a frozen snapshot, so drop the row locally before the
      // authoritative re-scan lands; Orca refetches the repo here too.
      setScannedHidden((prev) => (prev ?? recoveredWorktrees).filter((wt) => wt.path !== wtPath));
      window.dispatchEvent(new CustomEvent("hydra:refresh-projects"));
      await refreshWorktreeScan();
    } catch (err) {
      console.error("Failed to import worktree:", err);
    } finally {
      finishVisibilityMutation(mutationScope, mutation);
      if (currentScopeRef.current === mutationScope) {
        setBusyPath(null);
      }
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
                const accessibleLabel =
                  row.kind === "custom" ? row.source.rootPath : sourceRowLabel(row);
                const provenance = getWorktreeVisibilitySourceProvenance(
                  config,
                  row,
                  visibilityDefaults,
                  repoSourceIds
                );
                // Orca shows `Use global` only when the override merely matches Global
                // Settings; re-picking that value should revert to inheriting it.
                const matchingOverride =
                  provenance?.kind === "project-override" &&
                  provenance.globalVisibility === visibility;
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
                          disabled={isToggling}
                          aria-label={`Remove ${sourceRowLabel(row)}`}
                          onClick={() => void handleRemoveSource(row.source)}
                          className="p-1 rounded-md text-neutral-500 hover:text-destructive hover:bg-neutral-800 transition cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {matchingOverride && (
                        <button
                          type="button"
                          disabled={isToggling}
                          aria-label={`Use global for ${accessibleLabel}`}
                          onClick={() => void handleUseGlobal(row)}
                          className="px-1 text-[11px] font-medium text-indigo-300 hover:text-indigo-200 transition cursor-pointer disabled:opacity-50"
                        >
                          Use global
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
                            disabled={isToggling}
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
                disabled={isToggling || !rootDraft.trim()}
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

          {/* c2) Scan status + `Try again` (Orca `WorktreeVisibilityScanStatus`) */}
          {scanState !== "ready" && (
            <section aria-label="Worktree scan status" className="space-y-2">
              {scanState === "checking" ? (
                <p aria-live="polite" className="text-[11px] text-neutral-400">
                  Checking…
                </p>
              ) : (
                <div role="alert" className="flex items-center gap-2">
                  <p className="min-w-0 flex-1 text-[11px] text-destructive">
                    Could not list this repo&apos;s worktrees.
                  </p>
                  <button
                    type="button"
                    disabled={isToggling || busyPath !== null}
                    onClick={() => void refreshWorktreeScan()}
                    className="shrink-0 px-2.5 py-1 rounded-lg border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-[11px] font-medium transition cursor-pointer disabled:opacity-50"
                  >
                    Try again
                  </button>
                </div>
              )}
            </section>
          )}

          {/* d) Hidden worktrees (N) */}
          <section aria-labelledby="wv-hidden-heading" className="space-y-2">
            <div>
              <h3 id="wv-hidden-heading" className="text-[13px] font-semibold text-neutral-100">
                Hidden worktrees ({recoveredWorktrees.length})
              </h3>
              <p className="text-[11px] text-neutral-500">
                Show one without enabling its source.
              </p>
            </div>

            {recoveredWorktrees.length > 5 && (
              <div className="relative shrink-0">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 size-3.5 text-neutral-500" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Search ${recoveredWorktrees.length} hidden worktrees...`}
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
            {recoveredWorktrees.length} total hidden worktree
            {recoveredWorktrees.length === 1 ? "" : "s"}
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
