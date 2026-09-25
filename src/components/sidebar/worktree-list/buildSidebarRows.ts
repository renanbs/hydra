// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Row projection for the workspaces sidebar. Orca reference: src/renderer/src/components/sidebar/worktree-list/grouping/build-rows.ts
// (single projection → single viewport). The Hydra data model is project → worktree → session, so
// the projection emits project-header rows, worktree rows, nested/orphan session rows, hidden-pill
// rows, empty rows and status-header rows — no Orca files are imported here.
import type { GitWorktreeInfo, HydraProject, WorktreeSession } from "../types";
import type { SidebarProjectionInput, SidebarRow, SidebarStatusState } from "./types";

/**
 * Pure projection: displayProjects (+ sessions, worktrees, filters) → SidebarRow[].
 * Zero React, zero hooks — all predicates and sorts arrive as injected inputs so the
 * result depends only on `input` (testable, memo-friendly).
 *
 * groupBy modes (Orca SidebarGroupByToggle parity):
 *  - "repo": the project tree (project-header → worktree → nested/orphan session). The original
 *    projection — preserved byte-for-byte.
 *  - "none": flat lanes. Worktrees from every project + sessions, without project-header rows.
 *  - "workspace-status": attention view. ONLY session rows grouped under status-header rows
 *    (blocked → waiting → working → done → idle → unknown). Worktrees without sessions do not
 *    appear: the mode is about agent attention, and a dormant worktree is not an agent.
 */
export function buildSidebarRows(input: SidebarProjectionInput): SidebarRow[] {
  if (input.displayOptions.groupBy === "none") return buildFlatRows(input);
  if (input.displayOptions.groupBy === "workspace-status") return buildStatusRows(input);
  return buildRepoRows(input);
}

/** Attention order of the status groups (Orca semantics: blocked demands eyes first). */
const STATUS_GROUP_ORDER: readonly SidebarStatusState[] = ["blocked", "waiting", "working", "done", "idle", "unknown"];

/**
 * Buckets a session state into a status group. Uses a `switch` (not a Record lookup) so the
 * runtime strings emitted by the daemon (e.g. "waiting"/"done") are claims, never
 * index-by-shape: extending WorktreeSession["state"] (PR-7) needs no change here.
 */
function statusBucketOf(state: WorktreeSession["state"]): SidebarStatusState {
  switch (state) {
    case "blocked":
    case "waiting":
    case "working":
    case "done":
    case "idle":
      return state;
    default:
      return "unknown";
  }
}

/** Extracted filtering/sort helpers shared by the "repo" and "none" projections. */
interface ProjectFilterScope {
  lowerFilter: string;
  displayOptions: SidebarProjectionInput["displayOptions"];
  matchesFilter: (session: WorktreeSession) => boolean;
  isDefaultBranchWt: SidebarProjectionInput["isDefaultBranchWt"];
  isDetachedHeadWt: SidebarProjectionInput["isDetachedHeadWt"];
  isAutomationCreatedWt: SidebarProjectionInput["isAutomationCreatedWt"];
  isCliCreatedWt: SidebarProjectionInput["isCliCreatedWt"];
  isSleepingWorktree: SidebarProjectionInput["isSleepingWorktree"];
}

function makeMatchesFilter(lowerFilter: string): (session: WorktreeSession) => boolean {
  return (s) =>
    !lowerFilter ||
    s.title.toLowerCase().includes(lowerFilter) ||
    s.branch.toLowerCase().includes(lowerFilter) ||
    s.agentName.toLowerCase().includes(lowerFilter);
}

function applyDisplayFiltersToWorktree(scope: ProjectFilterScope, wt: GitWorktreeInfo, proj: HydraProject): boolean {
  const { displayOptions } = scope;
  if (displayOptions.hideDefaultBranch && scope.isDefaultBranchWt(wt, proj)) return true;
  if (displayOptions.hideDetachedHead && scope.isDetachedHeadWt(wt)) return true;
  if (displayOptions.hideAutomationCreated && scope.isAutomationCreatedWt(wt)) return true;
  if (displayOptions.hideCliCreated && scope.isCliCreatedWt(wt)) return true;
  if (displayOptions.hideSleeping && scope.isSleepingWorktree(wt, proj)) return true;
  return false;
}

/** Sessions belonging to a project — same matching rule as the repo-mode projection. */
function sessionsOfProject(input: SidebarProjectionInput, proj: HydraProject, isActive: boolean): WorktreeSession[] {
  const rawProjectWorktrees = input.getWorktreesForProject(proj);
  return input.sessions.filter(
    (s) =>
      s.project_path === proj.path ||
      (!s.project_path && isActive) ||
      rawProjectWorktrees.some((wt) => wt.path === s.project_path) ||
      s.project_path.startsWith(proj.path + "/")
  );
}

/**
 * Original tree projection (groupBy: "repo"): project-header → worktree → nested session,
 * orphan sessions, hidden-pill and empty rows. When persisted project groups exist
 * (PR-12), member projects nest under a group-header row; without a group map the tree
 * is byte-for-byte the pre-PR-12 projection.
 * Orca reference: grouping/build-rows.ts repo path.
 */
function buildRepoRows(input: SidebarProjectionInput): SidebarRow[] {
  const {
    displayProjects,
    projects,
    activeProject,
    collapsedProjects,
    activeProjectMenuId,
    filter,
    displayOptions,
    getWorktreesForProject,
    sortWorktreesByOption,
    sortSessionsByOption,
  } = input;
  if (projects.length === 0) return [];
  const rows: SidebarRow[] = [];
  const lowerFilter = filter.trim().toLowerCase();
  const matchesFilter = makeMatchesFilter(lowerFilter);
  const scope: ProjectFilterScope = {
    lowerFilter,
    displayOptions,
    matchesFilter,
    isDefaultBranchWt: input.isDefaultBranchWt,
    isDetachedHeadWt: input.isDetachedHeadWt,
    isAutomationCreatedWt: input.isAutomationCreatedWt,
    isCliCreatedWt: input.isCliCreatedWt,
    isSleepingWorktree: input.isSleepingWorktree,
  };
  const projectMatches = (proj: HydraProject, projectSessions: WorktreeSession[], projectWorktrees: GitWorktreeInfo[]) => {
    if (!lowerFilter) return true;
    if (proj.name.toLowerCase().includes(lowerFilter)) return true;
    if (projectSessions.some(matchesFilter)) return true;
    if (projectWorktrees.some((wt) => wt.branch.toLowerCase().includes(lowerFilter))) return true;
    return false;
  };

  /** One project's block: header + worktrees/sessions/pills — the original repo-map body. */
  const emitProject = (proj: HydraProject, inGroup: boolean): void => {
    const isActive = proj.path === activeProject?.path;
    const isCollapsed = collapsedProjects.has(proj.id);
    const isMenuOpen = activeProjectMenuId === proj.id;
    const rawProjectWorktrees = getWorktreesForProject(proj);
    const projectSessions = sessionsOfProject(input, proj, isActive);
    // Apply displayOptions filtering to worktrees (pre-text filter)
    const displayFilteredWorktrees = rawProjectWorktrees.filter((wt) => !applyDisplayFiltersToWorktree(scope, wt, proj));
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
      } else if (hiddenCount === 0) return;
    }
    // If project has only hidden worktrees and no visible, still show header + pill
    rows.push({ type: "project-header", proj, isActive, isCollapsed, isMenuOpen, inGroup });

    if (isCollapsed) {
      if (hiddenCount > 0) rows.push({ type: "hidden-pill", proj, hiddenCount });
      return;
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
  };

  // PR-12 (Orca Project Groups): repo mode only — a group section anchors at the position
  // of its first member in the project order, and later members join it there instead of
  // rendering twice. A collapsed group emits only its header. With an empty map/list (or
  // groupsEnabled === false) the projection is byte-for-byte the pre-PR-12 tree; the
  // "none"/"workspace-status" projections never see groups by construction.
  const projectGroups = input.groupsEnabled === false ? [] : (input.projectGroups ?? []);
  const projectGroupMap = input.projectGroupMap ?? {};
  const groupById = new Map(projectGroups.map((g) => [g.id, g]));
  const hasVisibleGroupedProject = displayProjects.some((p) => {
    const gid = projectGroupMap[p.id];
    return gid !== undefined && groupById.has(gid);
  });
  if (projectGroups.length === 0 || !hasVisibleGroupedProject) {
    for (const proj of displayProjects) emitProject(proj, false);
    return rows;
  }

  const emittedGroups = new Set<string>();
  for (const proj of displayProjects) {
    const gid = projectGroupMap[proj.id];
    const group = gid !== undefined ? groupById.get(gid) : undefined;
    if (!group) {
      emitProject(proj, false);
      continue;
    }
    if (emittedGroups.has(group.id)) continue;
    emittedGroups.add(group.id);
    const members = displayProjects.filter((p) => projectGroupMap[p.id] === group.id);
    // count = total sessions in the group, deduped by id — a session can belong to two
    // projects (nested paths) and the chip must not double-count it. Na mesma passada
    // (PR-16): hasUnread agrega o unread de cada membro — projeto (unreadProjects),
    // worktree (path) ou sessão (id) em unreadWorktrees — para o dot do header; a
    // agregação roda mesmo com o grupo colapsado (membros fora da tela).
    const sessionIds = new Set<string>();
    let hasUnread = false;
    const unreadProjects = input.unreadProjects;
    const unreadWorktrees = input.unreadWorktrees;
    for (const member of members) {
      const memberIsActive = member.path === activeProject?.path;
      if (unreadProjects?.has(member.id)) hasUnread = true;
      if (unreadWorktrees && unreadWorktrees.size > 0) {
        for (const wt of getWorktreesForProject(member)) {
          if (unreadWorktrees.has(wt.path)) { hasUnread = true; break; }
        }
      }
      for (const s of sessionsOfProject(input, member, memberIsActive)) {
        sessionIds.add(s.id);
        if (unreadWorktrees?.has(s.id)) hasUnread = true;
      }
    }
    const isCollapsed = input.collapsedGroups?.has(group.id) ?? group.isCollapsed ?? false;
    rows.push({ type: "group-header", group, count: sessionIds.size, isCollapsed, hasUnread });
    if (isCollapsed) continue;
    for (const member of members) emitProject(member, true);
  }
  return rows;
}

/**
 * Flat projection (groupBy: "none"): every project's worktrees as top-level lanes plus its
 * sessions, with no project-header rows. Orca renders a single "All worktrees" header; Hydra's
 * data model keeps each worktree's project on the row instead. The repo-mode gates are
 * preserved per project — a project survives only through its own matching content (or its
 * hidden worktrees, whose pill still needs a place to surface).
 */
function buildFlatRows(input: SidebarProjectionInput): SidebarRow[] {
  const { displayProjects, projects, filter, displayOptions, sortWorktreesByOption, sortSessionsByOption } = input;
  if (projects.length === 0) return [];
  const rows: SidebarRow[] = [];
  const lowerFilter = filter.trim().toLowerCase();
  const matchesFilter = makeMatchesFilter(lowerFilter);
  const scope: ProjectFilterScope = {
    lowerFilter,
    displayOptions,
    matchesFilter,
    isDefaultBranchWt: input.isDefaultBranchWt,
    isDetachedHeadWt: input.isDetachedHeadWt,
    isAutomationCreatedWt: input.isAutomationCreatedWt,
    isCliCreatedWt: input.isCliCreatedWt,
    isSleepingWorktree: input.isSleepingWorktree,
  };

  for (const proj of displayProjects) {
    const isActive = proj.path === input.activeProject?.path;
    const rawProjectWorktrees = input.getWorktreesForProject(proj);
    const projectSessions = sessionsOfProject(input, proj, isActive);
    const displayFilteredWorktrees = rawProjectWorktrees.filter((wt) => !applyDisplayFiltersToWorktree(scope, wt, proj));
    const hiddenByDisplay = rawProjectWorktrees.length - displayFilteredWorktrees.length;
    const filteredSessionsBase = lowerFilter ? projectSessions.filter(matchesFilter) : projectSessions;
    // hideSleeping also filters idle sessions (same semantics as the repo tree)
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

    // Same survival gate as the repo tree, minus the project-name branch: with no
    // project-header to render, a project visible only by name matches nothing here.
    const projectMatches = lowerFilter
      ? projectSessions.some(matchesFilter) || filteredWorktrees.length > 0 || hiddenCount > 0
      : true;
    if (!projectMatches) continue;

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
      // No worktrees survive: sessions still render (top level), the hidden pill still
      // surfaces, and the repo-mode "empty" placeholder dies with the header it captioned.
      for (const s of sortedSessions) {
        rows.push({ type: "session", session: s, proj, isNested: false });
      }
      if (hiddenCount > 0) rows.push({ type: "hidden-pill", proj, hiddenCount });
    }
  }
  return rows;
}

/**
 * Attention projection (groupBy: "workspace-status"): ONLY session rows grouped under
 * status-header rows in attention order. Worktree rows do not exist in this mode — a worktree
 * with no sessions is a dormant agent, invisible to an attention view (deliberate: this mode
 * is about where agents need eyes, not about repo layout).
 */
function buildStatusRows(input: SidebarProjectionInput): SidebarRow[] {
  const { displayProjects, projects, filter, displayOptions, sortSessionsByOption, activeProject } = input;
  if (projects.length === 0) return [];
  const lowerFilter = filter.trim().toLowerCase();
  const matchesFilter = makeMatchesFilter(lowerFilter);
  const groups = new Map<SidebarStatusState, Array<{ session: WorktreeSession; proj: HydraProject }>>();
  const seenSessionIds = new Set<string>();

  for (const proj of displayProjects) {
    const isActive = proj.path === activeProject?.path;
    for (const s of sessionsOfProject(input, proj, isActive)) {
      if (seenSessionIds.has(s.id)) continue; // a session can match two projects — keep the first
      if (lowerFilter && !matchesFilter(s)) continue;
      if (displayOptions.hideSleeping && s.state === "idle") continue;
      seenSessionIds.add(s.id);
      const bucket = statusBucketOf(s.state);
      const list = groups.get(bucket);
      if (list) list.push({ session: s, proj });
      else groups.set(bucket, [{ session: s, proj }]);
    }
  }

  const rows: SidebarRow[] = [];
  for (const state of STATUS_GROUP_ORDER) {
    const bucket = groups.get(state);
    if (!bucket || bucket.length === 0) continue;
    const projBySessionId = new Map(bucket.map((entry) => [entry.session.id, entry.proj]));
    const sorted = sortSessionsByOption(bucket.map((entry) => entry.session));
    rows.push({ type: "status-header", state, count: sorted.length });
    for (const s of sorted) {
      const proj = projBySessionId.get(s.id);
      if (proj) rows.push({ type: "session", session: s, proj, isNested: false });
    }
  }
  return rows;
}
