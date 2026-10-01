import type { HydraSettings } from "../../shared/settings-types";
import type { RepoIcon } from "../../shared/repo-icon";
import type { WorkspaceDisplayOptions } from "./WorkspaceOptionsMenu";
import type { AgentSubagentSnapshot } from "./agent-status-types";
import type { ProjectGroup } from "./worktree-list/types";

export type { ProjectGroup };

// ─── PR-14: sidebar prefs (SQLite sidebar_prefs, key "ui.sidebar") ──────────
// O blob merged é um JSON plano; todos os campos são opcionais para que um blob
// parcial hidrate campo a campo com fallback para os defaults atuais.
export type SidebarBody = "workspaces" | "agents";
export type AgentsStatusFilter = "all" | "blocked" | "waiting" | "working" | "done" | "idle";
export type AgentsGroupBy = "state" | "project";

export interface SidebarPrefsSnapshot {
  sidebarBody?: SidebarBody;
  collapsedProjects?: string[];
  collapsedGroups?: string[];
  pinnedProjects?: string[];
  unreadProjects?: string[];
  pinnedWorktrees?: string[];
  unreadWorktrees?: string[];
  projectGroupMap?: Record<string, string>;
  projectGroups?: Array<{ id: string; name: string }>;
  displayOptions?: WorkspaceDisplayOptions;
  agentsReadFilter?: AgentsStatusFilter;
  agentsGroupBy?: AgentsGroupBy;
}

/** Fatia das prefs que o SidebarShell detém localmente e reporta ao App no change. */
export interface SidebarShellPrefs {
  sidebarBody: SidebarBody;
  collapsedProjects: string[];
  collapsedGroups: string[];
  displayOptions: WorkspaceDisplayOptions;
  agentsReadFilter: AgentsStatusFilter;
  agentsGroupBy: AgentsGroupBy;
}

export interface AvailableAgent {
  id: string;
  name: string;
  executable: string;
  is_installed: boolean;
}

export interface HydraProject {
  id: string;
  name: string;
  displayName?: string;
  path: string;
  is_git: boolean;
  current_branch: string;
  color?: string;
  worktree_base_path?: string | null;
  imported_worktrees?: string[];
  suppressed_discovery?: boolean;
  repo_icon?: RepoIcon | null;
}

export interface GitWorktreeInfo {
  id?: string;
  path: string;
  head_commit: string;
  branch: string;
  is_bare: boolean;
  is_locked: boolean;
  is_main?: boolean;
  isMainWorktree?: boolean;
  created_at?: number | null;
  status?: string | null;
  display_name?: string | null;
  displayName?: string | null;
  first_agent_message_rename_error?: string | null;
  firstAgentMessageRenameError?: string | null;
  is_sparse?: boolean;
  isSparse?: boolean;
  sparse_directories?: string[];
  sparseDirectories?: string[];
  isUnread?: boolean;
}

export interface WorkspacePort {
  port: number;
  host: string;
  pid?: number | null;
  process_name?: string | null;
  worktree_path: string;
}

export interface WorktreeReviewStatus {
  pr_number?: number | null;
  title?: string | null;
  state?: "open" | "merged" | "closed" | "draft";
  url?: string | null;
  has_failing_checks?: boolean;
}

export interface WorktreeSession {
  id: string;
  project_path: string;
  title: string;
  branch: string;
  // Herdr wire contract (Rust PR-6): working | blocked | waiting | idle | done | unknown.
  // Unknown strings still arrive on legacy records — consumers must treat anything
  // outside this union as neutral/idle (default branches), never crash on it.
  state: "working" | "blocked" | "waiting" | "idle" | "done" | "unknown";
  active: boolean;
  agentName: string;
  executable: string;
  created_at?: number | null;
  updated_at?: number | null;
  /** Epoch ms the current state began (Rust `agent:state` payload field). Optional: absent on records created before PR-6. */
  state_started_at?: number;
  tool_name?: string;
  tool_input?: string;
  last_assistant_message?: string;
  parent_pane_key?: string;
  coordinator_handle?: string;
  subagents?: AgentSubagentSnapshot[];
}

export interface GitRepoStatus {
  branch: string;
  modified_files: number;
  is_clean: boolean;
  head_commit: string;
}

export interface WorktreeSidebarProps {
  sessions: WorktreeSession[];
  availableAgents?: AvailableAgent[];
  projects: HydraProject[];
  activeProject: HydraProject | null;
  activeWorktreePath?: string | null;
  /**
   * Reveal target identity (Orca currentSidebarWorktreeId parity): derived from the
   * ACTIVE WORKBENCH TAB (its session project_path / cwd), not from sidebar selection.
   * Optional — when undefined the sidebar falls back to activeWorktreePath.
   */
  revealTargetPath?: string | null;
  gitStatus: GitRepoStatus | null;
  gitWorktrees: GitWorktreeInfo[];
  worktreesByProject?: Record<string, GitWorktreeInfo[]>;
  onSelectProject: (proj: HydraProject) => void;
  onRemoveProject: (proj: HydraProject) => void;
  onSelectSession: (id: string) => void;
  onSelectGitWorktree: (wt: GitWorktreeInfo) => void;
  onDeleteGitWorktree: (wt: GitWorktreeInfo, proj?: HydraProject) => void;
  onNewSessionWithAgent?: (agent: AvailableAgent) => void;
  onRenameWorktreeTitle?: (worktreePath: string, newTitle: string) => Promise<void> | void;
  onDeleteSession: (id: string) => void;
  onOpenSettings: () => void;
  onOpenAddRepoDialog: () => void;
  onOpenNewWorkspaceModal: (proj?: HydraProject) => void;
  onSessionContextMenu?: (e: React.MouseEvent, session: WorktreeSession) => void;
  onProjectContextMenu?: (e: React.MouseEvent, project: HydraProject) => void;
  onWorktreeContextMenu?: (e: React.MouseEvent, worktree: GitWorktreeInfo, project: HydraProject) => void;
  onReorderSessions?: (sessions: WorktreeSession[]) => void;
  onReorderProjects?: (projects: HydraProject[]) => void;
  onReorderWorktrees?: (worktrees: GitWorktreeInfo[], projectPath?: string) => void;
  pinnedProjects?: Set<string>;
  unreadProjects?: Set<string>;
  pinnedWorktrees?: Set<string>;
  unreadWorktrees?: Set<string>;
  hiddenWorktreesByProject?: Record<string, GitWorktreeInfo[]>;
  projectGroupMap?: Record<string, string>;
  projectGroups?: Array<{ id: string; name: string }>;
  folderWorkspaces?: Array<{ id: string; projectGroupId: string; name: string; folderPath: string }>;
  compactCards?: boolean;
  onSelectNextSession?: (direction: "up" | "down") => void;
  onSelectPrevSession?: (direction: "up" | "down") => void;
  isModalOpen?: boolean;
  settings?: HydraSettings;
  // PR-14: one-shot hydration do snapshot SQLite (aplicado uma vez quando cada
  // prop chega: undefined → valor; o App nunca re-emite) + notificação de mudança
  // para a persistência debounced que o App centraliza.
  initialSidebarBody?: SidebarBody;
  initialCollapsedProjects?: string[];
  initialCollapsedGroups?: string[];
  initialDisplayOptions?: WorkspaceDisplayOptions;
  initialAgentsReadFilter?: AgentsStatusFilter;
  initialAgentsGroupBy?: AgentsGroupBy;
  onSidebarPrefsChange?: (prefs: SidebarShellPrefs) => void;
}
