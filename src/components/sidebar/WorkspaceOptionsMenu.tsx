import { useRef, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { 
  ChevronRight, 
  Moon, 
  GitBranch, 
  CalendarClock, 
  SquareTerminal, 
  GitCommitHorizontal,
  Search,
  X
} from "lucide-react";
import { useAppStore } from "@/store";
import { ALL_EXECUTION_HOSTS_SCOPE, type ExecutionHostId } from "../../shared/execution-host";
import {
  buildSidebarHostOptions,
  buildSidebarHostScopeOptions,
  getSidebarHostHealthLabel,
  getSidebarHostVisibilityLabel,
  shouldShowHostScopeControls,
  type SidebarHostOption,
  type SidebarHostScopeOption,
} from "./sidebar-host-options";
import { toHostSourceMap } from "./rendered-sidebar-worktree-order";
import type { HydraProject } from "./WorktreeSidebar";
import { FilterToggleRow } from "./FilterToggleRow";
import { useOptionalShortcutLabel } from "../../hooks/useShortcutLabel";
import { searchProjects } from "./project-filter-search";

export type GroupByMode = "none" | "workspace-status" | "pr-status" | "repo";

/** Orca `getSidebarActiveFilterCount`: the badge on the options trigger. */
export function countActiveWorkspaceFilters(options: WorkspaceDisplayOptions): number {
  let count = 0;
  if (options.hideSleeping) {
    count += 1;
    // Orca counts the exemption as its own narrowing filter while its parent is on.
    if (!options.alwaysShowDefaultBranch) count += 1;
  }
  if (options.hideDefaultBranch) count += 1;
  if (options.hideAutomationCreated) count += 1;
  if (options.hideCliCreated) count += 1;
  if (options.hideDetachedHead) count += 1;
  count += options.filterProjectIds?.length ?? 0;
  return count;
}

/**
 * Orca `SidebarHostScopeMenuSection.toggleHost`: toggling the last visible host
 * off is refused — a sidebar scoped to zero hosts renders nothing and leaves no
 * affordance to recover, so one host must always stay visible.
 */
export function toggleWorkspaceHostVisibility(args: {
  visibleWorkspaceHostIds: readonly ExecutionHostId[] | null;
  hostIds: readonly ExecutionHostId[];
  hostId: ExecutionHostId;
}): { visibleWorkspaceHostIds: readonly ExecutionHostId[] | null; changed: boolean } {
  if (args.visibleWorkspaceHostIds === null) {
    return { visibleWorkspaceHostIds: [args.hostId], changed: true };
  }
  const next = new Set(args.visibleWorkspaceHostIds);
  if (next.has(args.hostId)) {
    if (next.size <= 1) {
      return { visibleWorkspaceHostIds: args.visibleWorkspaceHostIds, changed: false };
    }
    next.delete(args.hostId);
  } else {
    next.add(args.hostId);
  }
  return {
    visibleWorkspaceHostIds: next.size === args.hostIds.length ? null : [...next],
    changed: true,
  };
}

export interface WorkspaceDisplayOptions {
  groupBy: GroupByMode;
  sortBy: "agent-activity" | "name" | "recent";
  hideSleeping: boolean;
  hideDefaultBranch: boolean;
  hideAutomationCreated: boolean;
  hideCliCreated: boolean;
  hideDetachedHead: boolean;
  /** Orca `alwaysShowDefaultBranchWorkspace`: keep the default branch while hiding sleeping. */
  alwaysShowDefaultBranch: boolean;
  filterProjectIds?: string[];
}

interface WorkspaceOptionsMenuProps {
  isOpen: boolean;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  options: WorkspaceDisplayOptions;
  projects: HydraProject[];
  onClose: () => void;
  onOptionsChange: (newOptions: WorkspaceDisplayOptions) => void;
  /** Opens the Add project dialog from the menu footer (Orca SidebarFilter footer). */
  onAddProject?: () => void;
}

export function WorkspaceOptionsMenu({
  isOpen,
  triggerRef,
  options,
  projects,
  onClose,
  onOptionsChange,
  onAddProject,
}: WorkspaceOptionsMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const projectSearchInputRef = useRef<HTMLInputElement | null>(null);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 80, left: 240 });
  const [openSubmenu, setOpenSubmenu] = useState<"sort" | "projectOrder" | "cardDisplay" | "show" | "hosts" | null>(null);
  const [projectSearch, setProjectSearch] = useState("");
  const [activeProjectIndex, setActiveProjectIndex] = useState(0);
  const sleepingShortcut = useOptionalShortcutLabel("sidebar.sleepingWorkspaces.toggle");

  // ─── Host scope (Orca SidebarHostScopeMenuSection) ────────────────────────
  const storeRepos = useAppStore((s) => s.repos);
  const storeSshTargetLabels = useAppStore((s) => s.sshTargetLabels);
  const storeSshConnectionStates = useAppStore((s) => s.sshConnectionStates);
  const storeRuntimeEnvironments = useAppStore((s) => s.runtimeEnvironments);
  const storeSettings = useAppStore((s) => s.settings);
  const visibleWorkspaceHostIds = useAppStore((s) => s.visibleWorkspaceHostIds);
  const setWorkspaceHostScope = useAppStore((s) => s.setWorkspaceHostScope);
  const setVisibleWorkspaceHostIds = useAppStore((s) => s.setVisibleWorkspaceHostIds);

  const hostOptions = useMemo<SidebarHostOption[]>(
    () =>
      buildSidebarHostOptions({
        repos: storeRepos,
        sshTargetLabels: toHostSourceMap<string>(storeSshTargetLabels) ?? new Map<string, string>(),
        sshConnectionStates: toHostSourceMap(storeSshConnectionStates),
        settings: storeSettings,
        runtimeEnvironments: Array.isArray(storeRuntimeEnvironments)
          ? storeRuntimeEnvironments
          : undefined,
      }),
    [
      storeRepos,
      storeSshTargetLabels,
      storeSshConnectionStates,
      storeSettings,
      storeRuntimeEnvironments,
    ]
  );
  const hostScopeOptions = useMemo(() => buildSidebarHostScopeOptions(hostOptions), [hostOptions]);
  useEffect(() => {
    if (!isOpen) {
      setOpenSubmenu(null);
      setProjectSearch("");
    }
  }, [isOpen]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (
        menuRef.current && 
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("mousedown", handleOutside);
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("mousedown", handleOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose, triggerRef]);

  // Ancoragem 100% igual ao Orca: side="right", align="start", sideOffset=8
  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current || !menuRef.current) return;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const menuRect = menuRef.current.getBoundingClientRect();
    const sideOffset = 8;
    const padding = 12;

    // Posiciona imediatamente à direita do botão acionador
    let left = triggerRect.right + sideOffset;
    let top = triggerRect.top;

    // Se vazar a borda direita da janela, inverte para a esquerda do botão
    if (left + menuRect.width > window.innerWidth - padding) {
      left = Math.max(padding, triggerRect.left - menuRect.width - sideOffset);
    }

    // Se vazar o rodapé da janela, empurra para cima
    if (top + menuRect.height > window.innerHeight - padding) {
      top = Math.max(padding, window.innerHeight - menuRect.height - padding);
    }

    setCoords({ top, left });
  }, [isOpen, triggerRef]);

  if (!isOpen) return null;

  // Orca SidebarRepositoryFilterSection.getProjectFilterVisibilityLabel: o label do
  // submenu "Show → Projects" reflete o filtro ativo — "All projects" sem sufixo,
  // o nome do projeto quando só um está selecionado, ou "N projects". Derivado de
  // `projects` para ids obsoletos (projeto removido) não inflarem a contagem.
  const selectedFilterProjects = options.filterProjectIds?.length
    ? projects.filter((p) => options.filterProjectIds!.includes(p.id))
    : [];
  const filteredProjects = useMemo(
    () => searchProjects(projects, projectSearch),
    [projects, projectSearch]
  );

  const toggleProjectFilter = (projectId: string) => {
    const current = options.filterProjectIds || [];
    const next = current.length === 0
      ? [projectId]
      : current.includes(projectId)
        ? current.filter((id) => id !== projectId)
        : [...current, projectId];
    onOptionsChange({ ...options, filterProjectIds: next });
  };

  const projectFilterLabel =
    selectedFilterProjects.length === 0
      ? "All projects"
      : selectedFilterProjects.length === 1
        ? selectedFilterProjects[0].name
        : `${selectedFilterProjects.length} projects`;

  // ─── Host scope handlers (Orca SidebarHostScopeMenuSection) ───────────────
  const showHostScopeControls = shouldShowHostScopeControls(hostOptions);
  const allHostsVisible = visibleWorkspaceHostIds == null;
  const visibleHostIdSet = new Set<ExecutionHostId>(visibleWorkspaceHostIds ?? []);
  const hostVisibilityLabel = getSidebarHostVisibilityLabel(
    visibleWorkspaceHostIds,
    hostOptions
  );
  // `SidebarHostScopeOption.id` spans `'all'`; the per-host rows exclude it.
  const hostScopes = hostScopeOptions.filter(
    (scope): scope is SidebarHostScopeOption & { id: ExecutionHostId } =>
      scope.id !== ALL_EXECUTION_HOSTS_SCOPE
  );

  const toggleAllHosts = () => {
    if (!allHostsVisible) {
      setWorkspaceHostScope(ALL_EXECUTION_HOSTS_SCOPE);
      return;
    }
    const firstHost = hostOptions[0];
    if (firstHost) setVisibleWorkspaceHostIds([firstHost.id]);
  };

  const toggleHost = (hostId: ExecutionHostId) => {
    const result = toggleWorkspaceHostVisibility({
      visibleWorkspaceHostIds,
      hostIds: hostOptions.map((host) => host.id),
      hostId,
    });
    if (result.changed) setVisibleWorkspaceHostIds(result.visibleWorkspaceHostIds);
  };

  return (
    <div
      ref={menuRef}
      style={{ top: `${coords.top}px`, left: `${coords.left}px` }}
      onClick={(e) => e.stopPropagation()}
      className="fixed w-72 rounded-xl bg-popover border border-border p-2 shadow-2xl z-[99999] text-xs text-popover-foreground select-none space-y-2.5 font-sans"
    >
      {/* Header */}
      <div className="px-2 pt-1 font-semibold text-foreground text-xs">
        Workspace options
      </div>

      {/* Show Section — Orca: host + repo filter */}
      <div className="space-y-1">
        <div className="px-2 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
          Show
        </div>
        {projects.length > 1 ? (
        <div className="relative">
          <div
            onClick={() => {
              const next = openSubmenu === "show" ? null : "show";
              // Orca resets the query when the panel is reopened.
              if (next === "show") setProjectSearch("");
              setOpenSubmenu(next);
            }}
            className={`flex items-center justify-between px-2 py-1 text-[11px] text-popover-foreground hover:bg-accent rounded cursor-pointer transition-colors ${openSubmenu === "show" ? "bg-accent" : ""}`}
          >
            <div className="flex items-center gap-1.5">
              <span>Projects</span>
            </div>
            <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-0.5">
              <span>{projectFilterLabel}</span>
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
            </span>
          </div>
          {openSubmenu === "show" && (
            <div className="absolute left-full top-0 ml-1 w-64 rounded-lg border border-border bg-popover p-1 shadow-xl z-10 max-h-80 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-2 py-1">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                  Projects
                  {selectedFilterProjects.length > 0 && (
                    <span className="ml-1.5 font-medium text-foreground normal-case">· {selectedFilterProjects.length}</span>
                  )}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={(options.filterProjectIds?.length ?? 0) === projects.length}
                    onClick={() =>
                      onOptionsChange({
                        ...options,
                        filterProjectIds: projects.map((project) => project.id),
                      })
                    }
                    className="text-[10px] text-muted-foreground hover:text-foreground font-medium cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    disabled={!options.filterProjectIds?.length}
                    onClick={() => onOptionsChange({ ...options, filterProjectIds: [] })}
                    className="text-[10px] text-muted-foreground hover:text-foreground font-medium cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Clear
                  </button>
                </div>
              </div>
              {options.filterProjectIds?.length ? (
                <div className="flex max-h-16 flex-wrap gap-1 overflow-y-auto px-2 py-1">
                  {options.filterProjectIds.map((id) => {
                    const proj = projects.find((p) => p.id === id);
                    if (!proj) return null;
                    return (
                      <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent border border-border text-[10px] text-foreground">
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: proj.color || "var(--color-emerald-500)" }}
                        />
                        <span className="max-w-[8rem] truncate">{proj.name}</span>
                        <button
                          type="button"
                          aria-label={`Remove ${proj.displayName || proj.name} filter`}
                          onClick={() => {
                            const next = (options.filterProjectIds || []).filter((pid) => pid !== id);
                            onOptionsChange({ ...options, filterProjectIds: next });
                          }}
                          className="ml-1 hover:text-foreground cursor-pointer"
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>
              ) : null}
              <div className="px-1 py-1">
                <div className="relative">
                  <input
                    ref={projectSearchInputRef}
                    autoFocus
                    type="text"
                    value={projectSearch}
                    onChange={(e) => {
                      setProjectSearch(e.target.value);
                      setActiveProjectIndex(0);
                    }}
                    onKeyDown={(e) => {
                      // Orca SidebarFilter pattern: Escape clears a non-empty query
                      // first (keeps the menu open); an empty query lets the menu's
                      // own window-level Escape close run.
                      if (e.key === "Escape" && projectSearch) {
                        e.stopPropagation();
                        setProjectSearch("");
                        return;
                      }
                      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                        e.preventDefault();
                        if (filteredProjects.length === 0) return;
                        const delta = e.key === "ArrowDown" ? 1 : -1;
                        setActiveProjectIndex(
                          (previous) =>
                            (previous + delta + filteredProjects.length) % filteredProjects.length
                        );
                        return;
                      }
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const project = filteredProjects[activeProjectIndex];
                        if (project) toggleProjectFilter(project.id);
                        return;
                      }
                      if (e.key === "Backspace" && !projectSearch) {
                        const selected = options.filterProjectIds ?? [];
                        const last = selected[selected.length - 1];
                        if (last) {
                          e.preventDefault();
                          onOptionsChange({
                            ...options,
                            filterProjectIds: selected.slice(0, -1),
                          });
                        }
                        return;
                      }
                      if (e.key === "ArrowLeft" && e.currentTarget.selectionStart === 0) {
                        e.preventDefault();
                        setOpenSubmenu(null);
                        return;
                      }
                      // Arrows stay local; every other key must not reach the menu typeahead.
                      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") {
                        e.stopPropagation();
                      }
                    }}
                    placeholder="Add project..."
                    className="w-full bg-muted/50 border border-border rounded-md pl-7 pr-6 py-1 text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="absolute left-2 top-1.5 text-muted-foreground pointer-events-none">
                    <Search className="w-3 h-3" />
                  </span>
                  {projectSearch ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setProjectSearch("");
                        projectSearchInputRef.current?.focus();
                      }}
                      aria-label="Clear project search"
                      title="Clear project search"
                      className="absolute right-1.5 top-1 inline-flex size-4 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground hover:bg-accent transition cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto max-h-48 space-y-0.5 px-1">
                {filteredProjects.map((proj, index) => {
                    const isExplicitlySelected = options.filterProjectIds?.includes(proj.id);
                    const showAsSelected = options.filterProjectIds?.length ? isExplicitlySelected : true;
                    const isActive = index === activeProjectIndex;
                    return (
                      <button
                        key={proj.id}
                        data-active-project={isActive || undefined}
                        onClick={() => toggleProjectFilter(proj.id)}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-[11px] text-left transition cursor-pointer ${showAsSelected ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"} ${isActive ? "ring-1 ring-ring/50" : ""}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${showAsSelected ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
                        <span className="truncate">{proj.name}</span>
                        {showAsSelected && options.filterProjectIds?.length ? <span className="ml-auto text-[10px] text-muted-foreground">✓</span> : null}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
        ) : null}

        {/* Hosts — Orca SidebarHostScopeMenuSection: single row, multi-select panel */}
        {showHostScopeControls && (
          <div className="relative">
            <div
              onClick={() => setOpenSubmenu(openSubmenu === "hosts" ? null : "hosts")}
              className={`flex items-center justify-between px-2 py-1 text-[11px] text-popover-foreground hover:bg-accent rounded cursor-pointer transition-colors ${openSubmenu === "hosts" ? "bg-accent" : ""}`}
            >
              <span>Hosts</span>
              <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-0.5">
                <span className="max-w-[7rem] truncate">{hostVisibilityLabel}</span>
                <ChevronRight className="w-3 h-3 text-muted-foreground" />
              </span>
            </div>
            {openSubmenu === "hosts" && (
              <div className="absolute left-full top-0 ml-1 w-56 rounded-lg border border-border bg-popover p-1 shadow-xl z-10">
                <button
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={allHostsVisible}
                  data-host-scope-option="all"
                  onClick={toggleAllHosts}
                  className={`w-full flex items-start gap-2 px-2 py-1.5 rounded text-[11px] text-left transition cursor-pointer ${
                    allHostsVisible ? "bg-accent text-foreground font-medium" : "text-popover-foreground hover:bg-accent"
                  }`}
                >
                  <span className={`mt-1 size-2 shrink-0 rounded-full ${allHostsVisible ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate">All hosts</span>
                    <span className="truncate text-[10px] font-normal text-muted-foreground">
                      Show every host
                    </span>
                  </span>
                </button>
                {hostScopes
                  .map((scope) => {
                    const isVisible = visibleHostIdSet.has(scope.id);
                    // Orca refuses to hide the last visible host.
                    const isLastVisibleHost = !allHostsVisible && isVisible && visibleHostIdSet.size <= 1;
                    return (
                      <button
                        key={scope.id}
                        type="button"
                        role="menuitemcheckbox"
                        aria-checked={isVisible}
                        aria-disabled={isLastVisibleHost}
                        disabled={isLastVisibleHost}
                        data-host-scope-option={scope.id}
                        onClick={() => toggleHost(scope.id)}
                        className={`w-full flex items-start gap-2 px-2 py-1.5 rounded text-[11px] text-left transition cursor-pointer ${
                          isVisible ? "bg-accent text-foreground font-medium" : "text-popover-foreground hover:bg-accent"
                        } ${isLastVisibleHost ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        <span className={`mt-1 size-2 shrink-0 rounded-full ${isVisible ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
                        <span className="flex min-w-0 flex-col gap-0.5">
                          <span className="truncate">{scope.label}</span>
                          <span className="truncate text-[10px] font-normal text-muted-foreground">
                            {scope.detail} · {getSidebarHostHealthLabel(scope.health)}
                          </span>
                        </span>
                      </button>
                    );
                  })}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="h-px bg-border" />

      {/* Group by Toggle Group (Orca SidebarGroupByToggle 100%) */}
      <div className="space-y-1">
        <div className="px-2 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
          Group by
        </div>
        <div className="grid grid-cols-4 gap-1 p-0.5 rounded-lg bg-muted/40 border border-border">
          {[
            { id: "none", label: "None" },
            { id: "workspace-status", label: "Status" },
            { id: "pr-status", label: "PR" },
            { id: "repo", label: "Project" },
          ].map((item) => {
            const isSelected = options.groupBy === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onOptionsChange({ ...options, groupBy: item.id as GroupByMode })}
                className={`py-1 text-[10px] font-medium rounded transition text-center cursor-pointer ${
                  isSelected
                    ? "bg-background text-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sort & Display rows — Orca parity: submenus com radio */}
      <div className="space-y-0.5 text-[11px]">
        <div className="relative">
          <div
            onClick={() => setOpenSubmenu(openSubmenu === "sort" ? null : "sort")}
            className={`flex items-center justify-between px-2 py-1 hover:bg-accent rounded cursor-pointer text-popover-foreground transition-colors ${openSubmenu === "sort" ? "bg-accent" : ""}`}
          >
            <span>Sort by</span>
            <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-0.5">
              <span>{options.sortBy === "agent-activity" ? "Agent Activity" : options.sortBy === "name" ? "Name" : "Recent"}</span>
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
            </span>
          </div>
          {openSubmenu === "sort" && (
            <div className="absolute left-full top-0 ml-1 w-44 rounded-lg border border-border bg-popover p-1 shadow-xl z-10">
              {[
                { id: "agent-activity", label: "Agent Activity" },
                { id: "name", label: "Name" },
                { id: "recent", label: "Recent" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    onOptionsChange({ ...options, sortBy: opt.id as WorkspaceDisplayOptions["sortBy"] });
                    setOpenSubmenu(null);
                  }}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-[11px] transition cursor-pointer ${options.sortBy === opt.id ? "bg-accent text-foreground font-medium" : "text-popover-foreground hover:bg-accent"}`}
                >
                  <span>{opt.label}</span>
                  {options.sortBy === opt.id && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                </button>
              ))}
            </div>
          )}
        </div>
        {options.groupBy === "repo" && (
          <div className="relative">
            <div
              onClick={() => setOpenSubmenu(openSubmenu === "projectOrder" ? null : "projectOrder")}
              className={`flex items-center justify-between px-2 py-1 hover:bg-accent rounded cursor-pointer text-popover-foreground transition-colors ${openSubmenu === "projectOrder" ? "bg-accent" : ""}`}
            >
              <span>Project order</span>
              <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-0.5">
                <span>Manual</span>
                <ChevronRight className="w-3 h-3 text-muted-foreground" />
              </span>
            </div>
            {openSubmenu === "projectOrder" && (
              <div className="absolute left-full top-0 ml-1 w-44 rounded-lg border border-border bg-popover p-1 shadow-xl z-10">
                <button
                  onClick={() => setOpenSubmenu(null)}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded text-[11px] bg-accent text-foreground font-medium cursor-pointer"
                >
                  <span>Manual</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                </button>
                <div className="px-2 py-1 text-[10px] text-muted-foreground">Drag to reorder projects</div>
              </div>
            )}
          </div>
        )}
        <div className="relative">
          <div
            onClick={() => setOpenSubmenu(openSubmenu === "cardDisplay" ? null : "cardDisplay")}
            className={`flex items-center justify-between px-2 py-1 hover:bg-accent rounded cursor-pointer text-popover-foreground transition-colors ${openSubmenu === "cardDisplay" ? "bg-accent" : ""}`}
          >
            <span>Card display</span>
            <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-0.5">
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
            </span>
          </div>
          {openSubmenu === "cardDisplay" && (
            <div className="absolute left-full top-0 ml-1 w-48 rounded-lg border border-border bg-popover p-1 shadow-xl z-10">
              <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase">Card layout</div>
              <button
                onClick={() => setOpenSubmenu(null)}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded text-[11px] bg-accent text-foreground font-medium cursor-pointer"
              >
                <span>Detailed</span>
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              </button>
              <div className="px-2 py-1 text-[10px] text-muted-foreground">Compact via Settings → Appearance</div>
            </div>
          )}
        </div>
      </div>

      <div className="h-px bg-border" />

      {/* Filters Section (Orca SidebarWorkspaceFilterSection 100%) */}
      <div className="space-y-1">
        <div className="px-2 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
          Filters
        </div>

        <FilterToggleRow
          icon={<Moon className="w-3.5 h-3.5" />}
          label="Hide sleeping"
          checked={options.hideSleeping}
          onChange={(hideSleeping) => onOptionsChange({ ...options, hideSleeping })}
          shortcutLabel={sleepingShortcut ?? undefined}
        />

        {/* Why gated: the exemption only matters while sleeping workspaces are
            being swept, so it stays hidden until its parent row is on. */}
        {options.hideSleeping ? (
          <FilterToggleRow
            indented
            icon={<GitBranch className="w-3.5 h-3.5" />}
            label="Except default branch"
            ariaLabel="Keep the default branch visible while hiding sleeping workspaces"
            checked={options.alwaysShowDefaultBranch}
            onChange={(alwaysShowDefaultBranch) =>
              onOptionsChange({ ...options, alwaysShowDefaultBranch })
            }
          />
        ) : null}

        <FilterToggleRow
          icon={<GitBranch className="w-3.5 h-3.5" />}
          label="Hide default branch"
          checked={options.hideDefaultBranch}
          onChange={(hideDefaultBranch) => onOptionsChange({ ...options, hideDefaultBranch })}
        />
        <FilterToggleRow
          icon={<CalendarClock className="w-3.5 h-3.5" />}
          label="Hide automation-created"
          checked={options.hideAutomationCreated}
          onChange={(hideAutomationCreated) =>
            onOptionsChange({ ...options, hideAutomationCreated })
          }
        />
        <FilterToggleRow
          icon={<SquareTerminal className="w-3.5 h-3.5" />}
          label="Hide CLI-created"
          checked={options.hideCliCreated}
          onChange={(hideCliCreated) => onOptionsChange({ ...options, hideCliCreated })}
        />
        <FilterToggleRow
          icon={<GitCommitHorizontal className="w-3.5 h-3.5" />}
          label="Hide detached HEAD"
          checked={options.hideDetachedHead}
          onChange={(hideDetachedHead) => onOptionsChange({ ...options, hideDetachedHead })}
        />

        <div className="flex items-center justify-between gap-2 px-2 pt-1">
          {countActiveWorkspaceFilters(options) > 0 ? (
          <button
            type="button"
            onClick={() =>
              onOptionsChange({
                ...options,
                hideSleeping: false,
                hideDefaultBranch: false,
                hideAutomationCreated: false,
                hideCliCreated: false,
                hideDetachedHead: false,
                alwaysShowDefaultBranch: false,
                filterProjectIds: [],
              })
            }
            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            Clear filters
          </button>
          ) : <span />}
          {onAddProject ? (
            <button
              type="button"
              onClick={onAddProject}
              className="text-[11px] font-medium text-primary hover:text-primary/80 transition-colors cursor-pointer"
            >
              + Add project
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
