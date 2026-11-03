// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/SidebarRepositoryFilterSection.tsx
//
// The Projects filter is its own section so more than one surface can own it: the
// workspace options menu passes its painted `displayOptions` ids, and any other
// view can pass its own allow-list through the same controlled props (Orca reuses
// this section from the Agents view). Query state lives in the panel, so reopening
// the submenu always starts from an unfiltered list.
import { useMemo } from "react";
import { ChevronRight } from "lucide-react";
import type { HydraProject } from "./types";
import { SidebarProjectFilterPanel } from "./SidebarProjectFilterPanel";

/** Orca `getProjectFilterVisibilityLabel`: the submenu trigger's right-hand value. */
export function getProjectFilterVisibilityLabel(
  selectedProjects: readonly Pick<HydraProject, "displayName" | "name">[]
): string {
  if (selectedProjects.length === 0) return "All projects";
  if (selectedProjects.length === 1) {
    const only = selectedProjects[0];
    return only?.displayName || only?.name || "Projects";
  }
  return `${selectedProjects.length} projects`;
}

export type SidebarRepositoryFilterSectionProps = {
  projects: readonly HydraProject[];
  /** Controlled allow-list; empty disables the filter. */
  filterRepoIds: readonly string[];
  setFilterRepoIds: (ids: string[]) => void;
  /** Submenu open state, owned by the surrounding menu. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preserveWorkspaceBoardOpen?: boolean;
};

export function SidebarRepositoryFilterSection({
  projects,
  filterRepoIds,
  setFilterRepoIds,
  open,
  onOpenChange,
  preserveWorkspaceBoardOpen = false,
}: SidebarRepositoryFilterSectionProps) {
  // Why derive from the live projects: ids left behind by a removed project must
  // not inflate the count or make an applied filter look active.
  const selectedRepoIdSet = useMemo(
    () => new Set(projects.filter((project) => filterRepoIds.includes(project.id)).map((p) => p.id)),
    [projects, filterRepoIds]
  );
  const selectedProjects = useMemo(
    () => projects.filter((project) => selectedRepoIdSet.has(project.id)),
    [projects, selectedRepoIdSet]
  );
  const availableProjects = useMemo(
    () => projects.filter((project) => !selectedRepoIdSet.has(project.id)),
    [projects, selectedRepoIdSet]
  );
  const selectedCount = selectedProjects.length;
  const hasRepoFilter = selectedCount > 0;

  // Orca hides the row when there is nothing to choose between; the menu's
  // "Add project" footer stays the recovery path for the 0/1-project state.
  if (projects.length <= 1) return null;

  return (
    <div className="relative">
      <div
        role="menuitem"
        aria-haspopup="menu"
        aria-expanded={open}
        data-project-filter-trigger=""
        onClick={() => onOpenChange(!open)}
        className={`flex cursor-pointer items-center justify-between rounded px-2 py-1 text-[11px] text-popover-foreground transition-colors hover:bg-accent ${
          open ? "bg-accent" : ""
        }`}
      >
        <span>Projects</span>
        <span className="flex items-center gap-0.5 font-mono text-[10px] text-muted-foreground">
          <span data-project-filter-visibility="" className="max-w-[7rem] truncate">
            {getProjectFilterVisibilityLabel(selectedProjects)}
          </span>
          <ChevronRight className="size-3 text-muted-foreground" />
        </span>
      </div>
      {open ? (
        <div
          data-project-filter-submenu=""
          {...(preserveWorkspaceBoardOpen ? { "data-workspace-board-preserve-open": "" } : {})}
          className="absolute left-full top-0 z-10 ml-1 flex max-h-80 w-64 flex-col overflow-hidden rounded-lg border border-border bg-popover p-1 shadow-xl"
        >
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-[10px] font-semibold uppercase text-muted-foreground">
              Projects
              {hasRepoFilter ? (
                <span className="ml-1.5 font-medium normal-case text-foreground">
                  · {selectedCount}
                </span>
              ) : null}
            </span>
            <div className="flex items-center gap-1">
              {/* Orca `SidebarFilter` bulk actions, kept beside the section's Clear
                  because Hydra fuses both surfaces into one menu. */}
              <button
                type="button"
                disabled={projects.length > 0 && selectedCount === projects.length}
                onClick={() => setFilterRepoIds(projects.map((project) => project.id))}
                className="cursor-pointer text-[10px] font-medium text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
              >
                Select all
              </button>
              <button
                type="button"
                disabled={!hasRepoFilter}
                onClick={() => setFilterRepoIds([])}
                className="cursor-pointer text-[10px] font-medium text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
              >
                Clear
              </button>
            </div>
          </div>
          <SidebarProjectFilterPanel
            availableRepos={availableProjects}
            selectedRepos={selectedProjects}
            hasRepoFilter={hasRepoFilter}
            filterRepoIds={filterRepoIds}
            setFilterRepoIds={setFilterRepoIds}
          />
        </div>
      ) : null}
    </div>
  );
}
