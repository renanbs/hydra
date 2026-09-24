import type { HydraSettings } from "../../shared/settings-types";

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
  onDeleteGitWorktree: (wt: GitWorktreeInfo) => void;
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
  projectGroupMap?: Record<string, string>;
  projectGroups?: Array<{ id: string; name: string }>;
  compactCards?: boolean;
  onSelectNextSession?: (direction: "up" | "down") => void;
  onSelectPrevSession?: (direction: "up" | "down") => void;
  isModalOpen?: boolean;
  settings?: HydraSettings;
}
