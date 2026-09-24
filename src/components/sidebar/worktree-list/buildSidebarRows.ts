// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Row projection for the workspaces sidebar. Orca reference: src/renderer/src/components/sidebar/worktree-list/grouping/build-rows.ts
// (single projection → single viewport). The Hydra data model is project → worktree → session, so
// the projection emits project-header rows, worktree rows, nested/orphan session rows, hidden-pill
// rows and empty rows — no Orca files are imported here.
import type { GitWorktreeInfo, HydraProject, WorktreeSession } from "../types";
import type { SidebarProjectionInput, SidebarRow } from "./types";

/**
 * Pure projection: displayProjects (+ sessions, worktrees, filters) → SidebarRow[].
 * Zero React, zero hooks — all predicates and sorts arrive as injected inputs so the
 * result depends only on `input` (testable, memo-friendly).
 *
 * Filtering stages per project (same semantics as the former inline useMemo):
 *  1. worktree displayOptions (hide default branch / detached head / automation / cli / sleeping)
 *  2. text filter over sessions, and over worktrees whose branch or own sessions match
 *  3. hiddenCount = worktrees hidden by 1+2, surfaced as a "N hidden worktrees" pill row
 *  4. a project survives the text filter when its name, one of its sessions, or one of its
 *     visible worktrees' branches matches — unless it has hidden worktrees (the pill must show)
 */
export function buildSidebarRows(input: SidebarProjectionInput): SidebarRow[] {
  const {
    displayProjects,
    projects,
    sessions,
    activeProject,
    collapsedProjects,
    activeProjectMenuId,
    filter,
    displayOptions,
    getWorktreesForProject,
    isDefaultBranchWt,
    isDetachedHeadWt,
    isAutomationCreatedWt,
    isCliCreatedWt,
    isSleepingWorktree,
    sortWorktreesByOption,
    sortSessionsByOption,
  } = input;
  if (projects.length === 0) return [];
  const rows: SidebarRow[] = [];
  const lowerFilter = filter.trim().toLowerCase();
  const matchesFilter = (s: WorktreeSession) =>
    !lowerFilter ||
    s.title.toLowerCase().includes(lowerFilter) ||
    s.branch.toLowerCase().includes(lowerFilter) ||
    s.agentName.toLowerCase().includes(lowerFilter);
  const projectMatches = (proj: HydraProject, projectSessions: WorktreeSession[], projectWorktrees: GitWorktreeInfo[]) => {
    if (!lowerFilter) return true;
    if (proj.name.toLowerCase().includes(lowerFilter)) return true;
    if (projectSessions.some(matchesFilter)) return true;
    if (projectWorktrees.some((wt) => wt.branch.toLowerCase().includes(lowerFilter))) return true;
    return false;
  };

  const applyDisplayFiltersToWorktree = (wt: GitWorktreeInfo, proj: HydraProject): boolean => {
    if (displayOptions.hideDefaultBranch && isDefaultBranchWt(wt, proj)) return true;
    if (displayOptions.hideDetachedHead && isDetachedHeadWt(wt)) return true;
    if (displayOptions.hideAutomationCreated && isAutomationCreatedWt(wt)) return true;
    if (displayOptions.hideCliCreated && isCliCreatedWt(wt)) return true;
    if (displayOptions.hideSleeping && isSleepingWorktree(wt, proj)) return true;
    return false;
  };

  for (const proj of displayProjects) {
    const isActive = proj.path === activeProject?.path;
    const isCollapsed = collapsedProjects.has(proj.id);
    const isMenuOpen = activeProjectMenuId === proj.id;
    const rawProjectWorktrees = getWorktreesForProject(proj);
    const projectSessions = sessions.filter(
      (s) =>
        s.project_path === proj.path ||
        (!s.project_path && isActive) ||
        rawProjectWorktrees.some((wt) => wt.path === s.project_path) ||
        s.project_path.startsWith(proj.path + "/")
    );
    // Apply displayOptions filtering to worktrees (pre-text filter)
    const displayFilteredWorktrees = rawProjectWorktrees.filter((wt) => !applyDisplayFiltersToWorktree(wt, proj));
    const hiddenByDisplay = rawProjectWorktrees.length - displayFilteredWorktrees.length;
    // Text filter stage
    const filteredSessionsBase = lowerFilter ? projectSessions.filter(matchesFilter) : projectSessions;
    // hideSleeping also filters idle orphan sessions
    const filteredSessions = displayOptions.hideSleeping
      ? filteredSessionsBase.filter((s) => s.state !== "idle")
      : filteredSessionsBase;
    const filteredWorktrees = lowerFilter
      ? displayFilteredWorktrees.filter((wt) => wt.branch.toLowerCase().includes(lowerFilter) || filteredSessions.some((s) => s.project_path === wt.path))
      : displayFilteredWorktrees;

    const sortedWorktrees = sortWorktreesByOption(filteredWorktrees, proj);
    const sortedSessions = sortSessionsByOption(filteredSessions);

    const hiddenByText = displayFilteredWorktrees.length - filteredWorktrees.length;
    const hiddenCount = hiddenByDisplay + hiddenByText;

    if (!projectMatches(proj, sortedSessions, sortedWorktrees) && hiddenCount === 0) {
      // Keep project visible if it has hidden worktrees (so pill can show) even when filter hides all
      if (rawProjectWorktrees.length === 0 && projectSessions.length === 0 && !lowerFilter) {
        // no content and no filter -> still show? We'll keep project header anyway if it has raw worktrees hidden?
      } else if (hiddenCount === 0) continue;
    }
    // If project has only hidden worktrees and no visible, still show header + pill
    rows.push({ type: "project-header", proj, isActive, isCollapsed, isMenuOpen });

    if (isCollapsed) {
      if (hiddenCount > 0) rows.push({ type: "hidden-pill", proj, hiddenCount });
      continue;
    }

    if (sortedWorktrees.length > 0) {
      for (const wt of sortedWorktrees) {
        rows.push({ type: "worktree", wt, proj });
        const wtSessions = sortedSessions.filter((s) => s.project_path === wt.path || (!s.project_path && wt.path === proj.path));
        for (const s of wtSessions) {
          rows.push({ type: "session", session: s, proj, wt, isNested: true });
        }
      }
      const orphanSessions = sortedSessions.filter(
        (s) => !sortedWorktrees.some((wt) => wt.path === s.project_path) && !(!s.project_path && sortedWorktrees.some((wt) => wt.path === proj.path))
      );
      for (const s of orphanSessions) {
        rows.push({ type: "session", session: s, proj, isOrphan: true, isNested: false });
      }
      if (hiddenCount > 0) rows.push({ type: "hidden-pill", proj, hiddenCount });
    } else {
      if (sortedSessions.length === 0) {
        if (hiddenCount > 0) {
          rows.push({ type: "hidden-pill", proj, hiddenCount });
        } else {
          rows.push({ type: "empty", proj, message: "No active worktrees in this project." });
        }
      } else {
        for (const s of sortedSessions) {
          rows.push({ type: "session", session: s, proj, isNested: false });
        }
        if (hiddenCount > 0) rows.push({ type: "hidden-pill", proj, hiddenCount });
      }
    }
  }
  return rows;
}
