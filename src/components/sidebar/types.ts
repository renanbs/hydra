import type { HydraSettings } from "../../shared/settings-types";
import type { WorkspaceDisplayOptions } from "./WorkspaceOptionsMenu";

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
  path: string;
  is_git: boolean;
  current_branch: string;
  worktree_base_path?: string | null;
  imported_worktrees?: string[];
  suppressed_discovery?: boolean;
}

export interface GitWorktreeInfo {
  path: string;
  head_commit: string;
  branch: string;
  is_bare: boolean;
  is_locked: boolean;
  created_at?: number | null;
  status?: string | null;
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
  gitStatus: GitRepoStatus | null;
  gitWorktrees: GitWorktreeInfo[];
  worktreesByProject?: Record<string, GitWorktreeInfo[]>;
  onSelectProject: (proj: HydraProject) => void;
  onRemoveProject: (proj: HydraProject) => void;
  onSelectSession: (id: string) => void;
  onSelectGitWorktree: (wt: GitWorktreeInfo) => void;
  onDeleteGitWorktree: (wt: GitWorktreeInfo, proj?: HydraProject) => void;
  onNewSessionWithAgent?: (agent: AvailableAgent) => void;
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
