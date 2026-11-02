import { useRef, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { 
  ChevronRight, 
  Moon, 
  GitBranch, 
  CalendarClock, 
  SquareTerminal, 
  GitCommitHorizontal,
  MonitorSmartphone,
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
import { planSidebarClearFilters, shouldShowOtherClientFilter } from "./sidebar-filter-actions";
import { toHostSourceMap } from "./rendered-sidebar-worktree-order";
import type { HydraProject } from "./WorktreeSidebar";
import { FilterToggleRow } from "./FilterToggleRow";
import { useOptionalShortcutLabel } from "../../hooks/useShortcutLabel";
import { SidebarRepositoryFilterSection } from "./SidebarRepositoryFilterSection";

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
  if (options.hideWorkspacesFromOtherDevices) count += 1;
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

/** Orca `GROUP_BY_OPTIONS` (sidebar-workspace-option-items.ts): ids are persisted. */
const GROUP_BY_OPTIONS = [
  { id: "none", label: "None" },
  { id: "workspace-status", label: "Status" },
  { id: "pr-status", label: "PR" },
  { id: "repo", label: "Project" },
] as const satisfies readonly { id: GroupByMode; label: string }[];

/** The menu's five modes; ids stay compatible with the persisted prefs. */
const SORT_BY_OPTIONS = [
  { id: "agent-activity", label: "Agent Activity" },
  { id: "name", label: "Name" },
  { id: "recent", label: "Recent" },
  { id: "project", label: "Project" },
  { id: "manual", label: "Manual" },
] as const;

const SORT_BY_LABELS: Record<WorkspaceDisplayOptions["sortBy"], string> = {
  "agent-activity": "Agent Activity",
  smart: "Agent Activity",
  name: "Name",
  recent: "Recent",
  project: "Project",
  manual: "Manual",
};

export interface WorkspaceDisplayOptions {
  groupBy: GroupByMode;
  /** `smart` is the comparator name; the menu keeps showing it as Agent Activity. */
  sortBy: "agent-activity" | "smart" | "name" | "recent" | "project" | "manual";
  hideSleeping: boolean;
  hideDefaultBranch: boolean;
  hideAutomationCreated: boolean;
  hideCliCreated: boolean;
  hideDetachedHead: boolean;
  /** Orca `alwaysShowDefaultBranchWorkspace`: keep the default branch while hiding sleeping. */
  alwaysShowDefaultBranch: boolean;
  /** Orca `hideWorkspacesFromOtherDevices`: sweep workspaces created on other devices. */
  hideWorkspacesFromOtherDevices?: boolean;
  /** Orca `projectOrderBy`: how project headers are ordered in `repo` grouping. */
  projectsOrder?: "manual" | "recent";
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
  /**
   * Orca `clearFilters`: the ONE writer that resets every narrowing filter
   * (`computeClearFilterActions` + host scope), owned by the sidebar shell.
   */
  onClearFilters?: () => void;
}

export function WorkspaceOptionsMenu({
  isOpen,
  triggerRef,
  options,
  projects,
  onClose,
  onOptionsChange,
  onAddProject,
  onClearFilters,
}: WorkspaceOptionsMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 80, left: 240 });
  const [openSubmenu, setOpenSubmenu] = useState<"sort" | "projectOrder" | "cardDisplay" | "show" | "hosts" | null>(null);
  const sleepingShortcut = useOptionalShortcutLabel("sidebar.sleepingWorkspaces.toggle");

  // ─── Host scope (Orca SidebarHostScopeMenuSection) ────────────────────────
  const storeRepos = useAppStore((s) => s.repos);
  const storeSshTargetLabels = useAppStore((s) => s.sshTargetLabels);
  const storeSshConnectionStates = useAppStore((s) => s.sshConnectionStates);
  const storeRuntimeEnvironments = useAppStore((s) => s.runtimeEnvironments);
  const storeRuntimeEnvironmentCatalogHydrated = useAppStore(
    (s) => s.runtimeEnvironmentCatalogHydrated
  );
  const storeSettings = useAppStore((s) => s.settings);
  const visibleWorkspaceHostIds = useAppStore((s) => s.visibleWorkspaceHostIds);
  const storeWorkspaceHostScope = useAppStore((s) => s.workspaceHostScope);
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
    if (!isOpen) setOpenSubmenu(null);
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

  // Orca `showOtherClientFilter`: hidden only once the runtime-environment catalog
  // is hydrated AND knows no other client — never while a sweep is still applied.
  const showOtherClientFilter = shouldShowOtherClientFilter({
    runtimeEnvironmentCatalogHydrated: storeRuntimeEnvironmentCatalogHydrated === true,
    runtimeEnvironmentCount: Array.isArray(storeRuntimeEnvironments)
      ? storeRuntimeEnvironments.length
      : 0,
    hideWorkspacesFromOtherDevices: options.hideWorkspacesFromOtherDevices === true,
  });
  // Orca's badge/footer gate reads the same state Clear Filters resets; host scope
  // is part of this menu, so it counts as an active filter here too.
  const hasAnyFilter =
    countActiveWorkspaceFilters(options) > 0 || visibleWorkspaceHostIds != null;

  /**
   * Orca `clearFilters`. The shell owns the writer when it supplies one; the
   * fallback runs the SAME pure plan, so no surface can invent a different reset.
   */
  const handleResetFilters = () => {
    if (onClearFilters) {
      onClearFilters();
      return;
    }
    const plan = planSidebarClearFilters(options, {
      visibleWorkspaceHostIds: visibleWorkspaceHostIds ?? null,
      workspaceHostScope: storeWorkspaceHostScope,
    });
    if (!plan.changed) return;
    if (plan.displayOptions !== options) onOptionsChange(plan.displayOptions);
    if (plan.resetHostScope) {
      setWorkspaceHostScope(ALL_EXECUTION_HOSTS_SCOPE);
      setVisibleWorkspaceHostIds(null);
    }
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
        <SidebarRepositoryFilterSection
          projects={projects}
          filterRepoIds={options.filterProjectIds ?? []}
          setFilterRepoIds={(filterProjectIds) =>
            onOptionsChange({ ...options, filterProjectIds })
          }
          open={openSubmenu === "show"}
          onOpenChange={(open) => setOpenSubmenu(open ? "show" : null)}
          preserveWorkspaceBoardOpen
        />

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
        <div
          role="group"
          aria-label="Group by"
          className="grid grid-cols-4 gap-1 p-0.5 rounded-lg bg-muted/40 border border-border"
        >
          {GROUP_BY_OPTIONS.map((item) => {
            const isSelected = options.groupBy === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={isSelected}
                data-group-by-option={item.id}
                // Why pointer-down: inside a menu the roving-focus handling can
                // swallow the click that a pointer started, so the intent is
                // committed before focus moves (Orca SidebarGroupByToggle).
                // Keyboard activation (detail 0) commits from the click instead.
                onPointerDownCapture={() =>
                  onOptionsChange({ ...options, groupBy: item.id })
                }
                onClick={(event) => {
                  if (event.detail === 0) {
                    onOptionsChange({ ...options, groupBy: item.id })
                  }
                }}
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
              <span>{SORT_BY_LABELS[options.sortBy]}</span>
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
            </span>
          </div>
          {openSubmenu === "sort" && (
            <div className="absolute left-full top-0 ml-1 w-44 rounded-lg border border-border bg-popover p-1 shadow-xl z-10">
              {SORT_BY_OPTIONS.map((opt) => (
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
                <span>{options.projectsOrder === "recent" ? "Recent" : "Manual"}</span>
                <ChevronRight className="w-3 h-3 text-muted-foreground" />
              </span>
            </div>
            {openSubmenu === "projectOrder" && (
              <div className="absolute left-full top-0 ml-1 w-44 rounded-lg border border-border bg-popover p-1 shadow-xl z-10">
                {([
                  { id: "manual", label: "Manual", hint: "Drag to reorder projects" },
                  { id: "recent", label: "Recent", hint: "Most recent workspace activity" },
                ] as const).map((option) => (
                  <button
                    key={option.id}
                    onClick={() => {
                      // Project order is its own choice, decoupled from workspace
                      // sortBy (Orca `projectOrderBy`).
                      onOptionsChange({ ...options, projectsOrder: option.id });
                      setOpenSubmenu(null);
                    }}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-[11px] cursor-pointer ${
                      (options.projectsOrder ?? "manual") === option.id
                        ? "bg-accent text-foreground font-medium"
                        : "text-popover-foreground hover:bg-accent"
                    }`}
                  >
                    <span>{option.label}</span>
                    {(options.projectsOrder ?? "manual") === option.id ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    ) : null}
                  </button>
                ))}
                <div className="px-2 py-1 text-[10px] text-muted-foreground">
                  {(options.projectsOrder ?? "manual") === "recent"
                    ? "Most recent workspace activity"
                    : "Drag to reorder projects"}
                </div>
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
        {showOtherClientFilter ? (
          <FilterToggleRow
            icon={<MonitorSmartphone className="w-3.5 h-3.5" />}
            label="Hide other-client workspaces"
            ariaLabel="Hide workspaces created from other Hydra clients on shared remote servers"
            checked={options.hideWorkspacesFromOtherDevices ?? false}
            onChange={(hideWorkspacesFromOtherDevices) =>
              onOptionsChange({ ...options, hideWorkspacesFromOtherDevices })
            }
          />
        ) : null}
        <FilterToggleRow
          icon={<GitCommitHorizontal className="w-3.5 h-3.5" />}
          label="Hide detached HEAD"
          checked={options.hideDetachedHead}
          onChange={(hideDetachedHead) => onOptionsChange({ ...options, hideDetachedHead })}
        />

        <div className="flex items-center justify-between gap-2 px-2 pt-1">
          {hasAnyFilter ? (
          <button
            type="button"
            data-sidebar-reset-filters=""
            onClick={handleResetFilters}
            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            Reset filters
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
