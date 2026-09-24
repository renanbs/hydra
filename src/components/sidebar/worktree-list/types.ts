// Sidebar row projection model — Hydra data model, Orca-parity projection contract.
// The SidebarRow union is the flat vocabulary consumed by the single virtualized
// viewport; buildSidebarRows.ts is the pure function that produces it.
import type { GitWorktreeInfo, HydraProject, WorktreeSession } from "../types";
import type { WorkspaceDisplayOptions } from "../WorkspaceOptionsMenu";

/** Union of every row the workspaces sidebar viewport can render. */
export type SidebarRow =
  | { type: "project-header"; proj: HydraProject; isActive: boolean; isCollapsed: boolean; isMenuOpen: boolean }
  | { type: "worktree"; wt: GitWorktreeInfo; proj: HydraProject }
  | { type: "session"; session: WorktreeSession; proj: HydraProject; wt?: GitWorktreeInfo; isOrphan?: boolean; isNested: boolean }
  | { type: "empty"; proj: HydraProject; message: string }
  | { type: "hidden-pill"; proj: HydraProject; hiddenCount: number };

/** Text-filter predicate over a session (title, branch or agent name). */
export type MatchesFilter = (session: WorktreeSession) => boolean;

/** Worktree universe accessor for a project (worktreesByProject map or active-project fallback). */
export type GetWorktreesForProject = (proj: HydraProject) => GitWorktreeInfo[];

/** True when the worktree sits on the project's default branch. */
export type IsDefaultBranchWt = (wt: GitWorktreeInfo, proj: HydraProject) => boolean;

/** True when the worktree has a detached HEAD. */
export type IsDetachedHeadWt = (wt: GitWorktreeInfo) => boolean;

/** True when the worktree looks automation-created (branch naming). */
export type IsAutomationCreatedWt = (wt: GitWorktreeInfo) => boolean;

/** True when the worktree looks hand-CLI-created (bare branch name, no slash). */
export type IsCliCreatedWt = (wt: GitWorktreeInfo) => boolean;

/** True when the worktree has no live (non-idle) sessions. */
export type IsSleepingWorktree = (wt: GitWorktreeInfo, proj: HydraProject) => boolean;

/** Sorts a project's worktrees according to the display options. */
export type SortWorktreesByOption = (wts: GitWorktreeInfo[], proj: HydraProject) => GitWorktreeInfo[];

/** Sorts sessions according to the display options. */
export type SortSessionsByOption = (sess: WorktreeSession[]) => WorktreeSession[];

/** Pure inputs of the sidebar row projection. All predicates/sorts are injected so the builder stays pure. */
export interface SidebarProjectionInput {
  /** Projects after the "Projects → Show" filter — the projection's iteration universe. */
  displayProjects: HydraProject[];
  /** Full project list; an empty list short-circuits to zero rows. */
  projects: HydraProject[];
  sessions: WorktreeSession[];
  /** Worktrees of the active project (legacy single-project source). */
  gitWorktrees: GitWorktreeInfo[];
  /** Worktrees per project path; takes precedence over gitWorktrees. */
  worktreesByProject?: Record<string, GitWorktreeInfo[]>;
  activeProject: HydraProject | null;
  collapsedProjects: Set<string>;
  activeProjectMenuId: string | null;
  /** Free-text filter over titles, branches and agent names. */
  filter: string;
  displayOptions: WorkspaceDisplayOptions;
  /** Density hint; not read by the current projection (row heights own density). */
  compactCards?: boolean;
  getWorktreesForProject: GetWorktreesForProject;
  isDefaultBranchWt: IsDefaultBranchWt;
  isDetachedHeadWt: IsDetachedHeadWt;
  isAutomationCreatedWt: IsAutomationCreatedWt;
  isCliCreatedWt: IsCliCreatedWt;
  isSleepingWorktree: IsSleepingWorktree;
  sortWorktreesByOption: SortWorktreesByOption;
  sortSessionsByOption: SortSessionsByOption;
}
