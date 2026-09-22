import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { List } from "react-window";
import { 
  GitBranch, 
  Plus, 
  Trash2, 
  FolderGit2, 
  ChevronDown, 
  ChevronRight,
  Settings, 
  GitCommit, 
  FolderPlus,
  MoreHorizontal,
  Sliders,
  Copy,
  FolderTree,
  GripVertical,
  Terminal
} from "lucide-react";
import { WorkspaceOptionsMenu, type WorkspaceDisplayOptions } from "./WorkspaceOptionsMenu";
import { SidebarHeader } from "./SidebarHeader";
import { SidebarAgentsList } from "./SidebarAgentsList";
import { AgentBrandIcon } from "../AgentIcon";
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
  state: "working" | "blocked" | "idle" | "unknown";
  active: boolean;
  agentName: string;
  executable: string;
  created_at?: number | null;
  updated_at?: number | null;
}

export interface GitRepoStatus {
  branch: string;
  modified_files: number;
  is_clean: boolean;
  head_commit: string;
}

interface WorktreeSidebarProps {
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

export function WorktreeSidebar({
  sessions,
  projects,
  activeProject,
  gitStatus,
  gitWorktrees,
  worktreesByProject,
  onSelectProject,
  onRemoveProject,
  onSelectSession,
  onSelectGitWorktree,
  onDeleteGitWorktree,
  onDeleteSession,
  onOpenSettings,
  onOpenAddRepoDialog,
  onOpenNewWorkspaceModal,
  onSessionContextMenu,
  onProjectContextMenu,
  onWorktreeContextMenu,
  onReorderSessions,
  onReorderProjects,
  onReorderWorktrees,
  pinnedProjects,
  unreadProjects,
  pinnedWorktrees,
  unreadWorktrees,
  projectGroupMap,
  projectGroups,
  compactCards = false,
  onSelectNextSession,
  onSelectPrevSession,
  isModalOpen = false,
  settings,
}: WorktreeSidebarProps) {
  const [filter, setFilter] = useState("");
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set());
  const [focusedSessionId, setFocusedSessionId] = useState<string | null>(null);
  const [activeProjectMenuId, setActiveProjectMenuId] = useState<string | null>(null);
  const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);
  const [sidebarBody, setSidebarBody] = useState<"workspaces" | "agents">("workspaces");
  const [focusedWorktreePath, setFocusedWorktreePath] = useState<string | null>(null);
  const [focusedProjectId, setFocusedProjectId] = useState<string | null>(null);
  
  // Ref para ancoragem exata do botão SlidersHorizontal
  const optionsButtonRef = useRef<HTMLButtonElement | null>(null);

  const [displayOptions, setDisplayOptions] = useState<WorkspaceDisplayOptions>(() => {
    try {
      const saved = localStorage.getItem("hydra:display_options");
      if (saved) return JSON.parse(saved) as WorkspaceDisplayOptions;
    } catch {}
    return {
      groupBy: "repo",
      sortBy: "agent-activity",
      hideSleeping: false,
      hideDefaultBranch: false,
      hideAutomationCreated: false,
      hideCliCreated: false,
      hideDetachedHead: false,
    };
  });
  useEffect(() => {
    try {
      localStorage.setItem("hydra:display_options", JSON.stringify(displayOptions));
    } catch {}
  }, [displayOptions]);

  // ---- Sprint 3 P0: helpers for displayOptions + worktreesByProject ----
  const getWorktreesForProject = useCallback((proj: HydraProject): GitWorktreeInfo[] => {
    if (worktreesByProject && worktreesByProject[proj.path]) return worktreesByProject[proj.path];
    if (proj.path === activeProject?.path) return gitWorktrees;
    return [];
  }, [worktreesByProject, gitWorktrees, activeProject]);

  const isDefaultBranchWt = useCallback((wt: GitWorktreeInfo, proj: HydraProject): boolean => {
    const b = wt.branch?.trim() ?? "";
    if (!b) return false;
    const defaultBranch = proj.current_branch?.trim() ?? "main";
    return b === defaultBranch || b === "main" || b === "master";
  }, []);

  const isDetachedHeadWt = useCallback((wt: GitWorktreeInfo): boolean => {
    const b = (wt.branch ?? "").trim();
    return b === "" || b === "HEAD" || b === "(detached)";
  }, []);

  const isAutomationCreatedWt = useCallback((wt: GitWorktreeInfo): boolean => {
    const b = (wt.branch ?? "").toLowerCase();
    return b.startsWith("workspace-") || b.includes("automation") || b.includes("agent-") || b.startsWith("feat/automation");
  }, []);

  const isCliCreatedWt = useCallback((wt: GitWorktreeInfo): boolean => {
    const b = (wt.branch ?? "").trim();
    if (!b) return false;
    if (b === "main" || b === "master") return false;
    if (b.includes("workspace-") || b.includes("automation")) return false;
    return !b.includes("/");
  }, []);

  const isSleepingWorktree = useCallback((wt: GitWorktreeInfo, proj: HydraProject): boolean => {
    const wtSessions = sessions.filter((s) => s.project_path === wt.path || (!s.project_path && wt.path === proj.path));
    if (wtSessions.length === 0) return wt.path !== proj.path;
    return wtSessions.every((s) => s.state === "idle");
  }, [sessions]);

  const sortWorktreesByOption = useCallback((wts: GitWorktreeInfo[], _proj: HydraProject): GitWorktreeInfo[] => {
    if (displayOptions.sortBy === "name") {
      return [...wts].sort((a, b) => (a.branch || a.path).localeCompare(b.branch || b.path));
    }
    if (displayOptions.sortBy === "recent") {
      return [...wts].sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0));
    }
    // agent-activity: working > blocked > idle, then most recent session
    return [...wts].sort((a, b) => {
      const aSess = sessions.filter((s) => s.project_path === a.path);
      const bSess = sessions.filter((s) => s.project_path === b.path);
      const rank = (sess: WorktreeSession[]) => sess.some((s) => s.state === "working") ? 0 : sess.some((s) => s.state === "blocked") ? 1 : sess.some((s) => s.state === "idle") ? 2 : 3;
      const ra = rank(aSess);
      const rb = rank(bSess);
      if (ra !== rb) return ra - rb;
      const aRecent = Math.max(...aSess.map((s) => s.updated_at ?? s.created_at ?? 0), (a.created_at ?? 0) * 1000);
      const bRecent = Math.max(...bSess.map((s) => s.updated_at ?? s.created_at ?? 0), (b.created_at ?? 0) * 1000);
      return bRecent - aRecent;
    });
  }, [sessions, displayOptions.sortBy]);

  const sortSessionsByOption = useCallback((sess: WorktreeSession[]): WorktreeSession[] => {
    if (displayOptions.sortBy === "name") {
      return [...sess].sort((a, b) => a.title.localeCompare(b.title));
    }
    if (displayOptions.sortBy === "recent") {
      return [...sess].sort((a, b) => (b.updated_at ?? b.created_at ?? 0) - (a.updated_at ?? a.created_at ?? 0));
    }
    const rank = (s: WorktreeSession) => s.state === "working" ? 0 : s.state === "blocked" ? 1 : s.state === "idle" ? 2 : 3;
    return [...sess].sort((a, b) => {
      const ra = rank(a);
      const rb = rank(b);
      if (ra !== rb) return ra - rb;
      return (b.updated_at ?? b.created_at ?? 0) - (a.updated_at ?? a.created_at ?? 0);
    });
  }, [displayOptions.sortBy]);

  const SessionAgentIcon = ({ agentName, size }: { agentName: string; size: number }) => {
    const lower = agentName.toLowerCase();
    if (["bash", "sh", "zsh", "shell", "terminal"].includes(lower)) {
      return <Terminal className="shrink-0 text-neutral-500" style={{ width: size, height: size }} />;
    }
    return <AgentBrandIcon agentId={agentName} size={size} />;
  };

  const formatAge = (ts?: number | null): string | null => {
    if (!ts) return null;
    const millis = ts < 10000000000 ? ts * 1000 : ts;
    const diff = Date.now() - millis;
    if (diff < 0) return null;
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return `${sec}s`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h`;
    const days = Math.floor(hr / 24);
    if (days < 7) return `${days}d`;
    if (days < 30) return `${Math.floor(days / 7)}w`;
    const months = Math.floor(days / 30);
    return `${months}mo`;
  };

  // Drag and Drop state
  const [draggedSessionId, setDraggedSessionId] = useState<string | null>(null);
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());
  const [lastClickedSessionId, setLastClickedSessionId] = useState<string | null>(null);
  const [draggedWorktreePath, setDraggedWorktreePath] = useState<string | null>(null);
  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);
  const [sessionDropTarget, setSessionDropTarget] = useState<{ id: string; position: "top" | "bottom" } | null>(null);
  const [worktreeDropTarget, setWorktreeDropTarget] = useState<{ path: string; position: "top" | "bottom" } | null>(null);
  const [projectDropTarget, setProjectDropTarget] = useState<{ id: string; position: "top" | "bottom" } | null>(null);

  const reorderList = <T,>(list: T[], fromIndex: number, toIndex: number, position: "top" | "bottom"): T[] => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= list.length || toIndex >= list.length) return list;
    const result = [...list];
    const [removed] = result.splice(fromIndex, 1);
    let insertIndex = toIndex;
    if (position === "bottom" && fromIndex > toIndex) insertIndex = toIndex + 1;
    else if (position === "top" && fromIndex < toIndex) insertIndex = toIndex - 1;
    result.splice(Math.max(0, Math.min(insertIndex, result.length)), 0, removed);
    return result;
  };

  const handleSessionDragStart = (e: React.DragEvent, id: string) => {
    e.stopPropagation();
    setDraggedSessionId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/x-hydra-session-id", id);
  };
  const handleSessionDragOver = (e: React.DragEvent, targetId: string) => {
    if (!draggedSessionId || draggedSessionId === targetId) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const isTop = e.clientY - rect.top < rect.height / 2;
    setSessionDropTarget({ id: targetId, position: isTop ? "top" : "bottom" });
  };
  const handleSessionDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceId = draggedSessionId || e.dataTransfer.getData("application/x-hydra-session-id");
    if (sourceId && sourceId !== targetId && onReorderSessions) {
      const fromIdx = sessions.findIndex((s) => s.id === sourceId);
      const toIdx = sessions.findIndex((s) => s.id === targetId);
      if (fromIdx !== -1 && toIdx !== -1) {
        const next = reorderList(sessions, fromIdx, toIdx, sessionDropTarget?.position ?? "bottom");
        onReorderSessions(next);
      }
    }
    setDraggedSessionId(null);
    setSessionDropTarget(null);
  };

  const handleSessionClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const shiftKey = e.shiftKey;
    const ctrlKey = e.ctrlKey || e.metaKey;
    
    if (ctrlKey) {
      // Toggle selection
      setSelectedSessions(prev => {
        const n = new Set(prev);
        if (n.has(id)) n.delete(id);
        else n.add(id);
        return n;
      });
      setLastClickedSessionId(id);
      return;
    }
    
    if (shiftKey && lastClickedSessionId) {
      // Shift+Click: select range between last clicked and current
      const currentIdx = sessions.findIndex(s => s.id === id);
      const lastIdx = sessions.findIndex(s => s.id === lastClickedSessionId);
      if (currentIdx === -1 || lastIdx === -1) return;
      
      const [start, end] = currentIdx < lastIdx ? [currentIdx, lastIdx] : [lastIdx, currentIdx];
      const newSelection = new Set<string>();
      for (let i = start; i <= end; i++) {
        newSelection.add(sessions[i].id);
      }
      setSelectedSessions(newSelection);
      setLastClickedSessionId(id);
      // Also select the current session in the workbench
      onSelectSession(id);
      return;
    }
    
    // Default: single click — activate session only, clear batch selection
    // Batch delete bar only appears after explicit Ctrl/Shift multi-select
    setSelectedSessions(new Set());
    setLastClickedSessionId(id);
    onSelectSession(id);
  };

  const handleWorktreeDragStart = (e: React.DragEvent, path: string) => {
    e.stopPropagation();
    setDraggedWorktreePath(path);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/x-hydra-worktree-path", path);
  };
  const handleWorktreeDragOver = (e: React.DragEvent, targetPath: string) => {
    if (!draggedWorktreePath || draggedWorktreePath === targetPath) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const isTop = e.clientY - rect.top < rect.height / 2;
    setWorktreeDropTarget({ path: targetPath, position: isTop ? "top" : "bottom" });
  };
  const findProjectForWorktree = useCallback((path: string): HydraProject | undefined => {
    for (const proj of projects) {
      const wts = getWorktreesForProject(proj);
      if (wts.some((w) => w.path === path)) return proj;
    }
    // fallback: path inside project dir
    for (const proj of projects) {
      if (path === proj.path || path.startsWith(proj.path + "/")) return proj;
    }
    return undefined;
  }, [projects, getWorktreesForProject]);

  const handleWorktreeDrop = (e: React.DragEvent, targetPath: string) => {
    e.preventDefault();
    e.stopPropagation();
    const sourcePath = draggedWorktreePath || e.dataTransfer.getData("application/x-hydra-worktree-path");
    if (sourcePath && sourcePath !== targetPath && onReorderWorktrees) {
      const sourceProj = findProjectForWorktree(sourcePath);
      const targetProj = findProjectForWorktree(targetPath);
      // Only reorder within same project
      if (sourceProj && targetProj && sourceProj.path === targetProj.path) {
        const list = getWorktreesForProject(sourceProj);
        const fromIdx = list.findIndex((w) => w.path === sourcePath);
        const toIdx = list.findIndex((w) => w.path === targetPath);
        if (fromIdx !== -1 && toIdx !== -1) {
          const next = reorderList(list, fromIdx, toIdx, worktreeDropTarget?.position ?? "bottom");
          onReorderWorktrees(next, sourceProj.path);
        }
      } else if (!sourceProj && !targetProj) {
        // fallback to global gitWorktrees (active project only, legacy)
        const fromIdx = gitWorktrees.findIndex((w) => w.path === sourcePath);
        const toIdx = gitWorktrees.findIndex((w) => w.path === targetPath);
        if (fromIdx !== -1 && toIdx !== -1) {
          const next = reorderList(gitWorktrees, fromIdx, toIdx, worktreeDropTarget?.position ?? "bottom");
          onReorderWorktrees(next);
        }
      }
    }
    setDraggedWorktreePath(null);
    setWorktreeDropTarget(null);
  };

  const handleProjectDragStart = (e: React.DragEvent, id: string) => {
    e.stopPropagation();
    setDraggedProjectId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/x-hydra-project-id", id);
  };
  const handleProjectDragOver = (e: React.DragEvent, targetId: string) => {
    if (!draggedProjectId || draggedProjectId === targetId) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const isTop = e.clientY - rect.top < rect.height / 2;
    setProjectDropTarget({ id: targetId, position: isTop ? "top" : "bottom" });
  };
  const handleProjectDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceId = draggedProjectId || e.dataTransfer.getData("application/x-hydra-project-id");
    if (sourceId && sourceId !== targetId && onReorderProjects) {
      const fromIdx = projects.findIndex((p) => p.id === sourceId);
      const toIdx = projects.findIndex((p) => p.id === targetId);
      if (fromIdx !== -1 && toIdx !== -1) {
        const next = reorderList(projects, fromIdx, toIdx, projectDropTarget?.position ?? "bottom");
        onReorderProjects(next);
      }
    }
    setDraggedProjectId(null);
    setProjectDropTarget(null);
  };
  const handleSessionDragEnd = () => {
    setDraggedSessionId(null);
    setSessionDropTarget(null);
  };
  const handleWorktreeDragEnd = () => {
    setDraggedWorktreePath(null);
    setWorktreeDropTarget(null);
  };
  const handleProjectDragEnd = () => {
    setDraggedProjectId(null);
    setProjectDropTarget(null);
  };
  const [appVersion, setAppVersion] = useState<string | null>(null);
  useEffect(() => {
    invoke<string>("get_app_version").then(setAppVersion).catch(()=>{});
  }, []);

  useEffect(() => {
    const handleClickOutside = () => {
      setActiveProjectMenuId(null);
    };
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Arrow key navigation between sessions, worktrees, projects (when no modal/input has focus)
      if (isModalOpen) return;
      const target = e.target as HTMLElement;
      const isInputFocused = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || Boolean(target.isContentEditable);

      if (isInputFocused) return;

      // Collect all focusable items in order: projects -> worktrees -> sessions
      const allFocusable: Array<{ type: "project" | "worktree" | "session"; id: string }> = [];
      
      projects.forEach((proj) => {
        allFocusable.push({ type: "project", id: proj.id });
        const isCollapsed = collapsedProjects.has(proj.id);
        const projectWorktrees = getWorktreesForProject(proj);
        const isActiveForSessions = proj.path === activeProject?.path;
        if (!isCollapsed) {
          projectWorktrees.forEach((wt) => {
            allFocusable.push({ type: "worktree", id: wt.path });
            const wtSessions = sessions.filter((s) => s.project_path === wt.path || (!s.project_path && wt.path === proj.path));
            wtSessions.forEach((s) => allFocusable.push({ type: "session", id: s.id }));
          });
        }
        // Sessions not under worktrees (orphan or when no worktrees)
        if (!isCollapsed) {
          const projectSessions = sessions.filter(
            (s) => s.project_path === proj.path 
              || (!s.project_path && isActiveForSessions)
              || projectWorktrees.some((wt) => wt.path === s.project_path)
              || s.project_path.startsWith(proj.path + "/")
          );
          projectSessions.forEach((s) => {
            if (!allFocusable.some((f) => f.type === "session" && f.id === s.id)) {
              allFocusable.push({ type: "session", id: s.id });
            }
          });
        }
      });

      // Escape: clear focus + clear batch selection
      if (e.key === "Escape") {
        e.preventDefault();
        setFocusedSessionId(null);
        setFocusedWorktreePath(null);
        setFocusedProjectId(null);
        setSelectedSessions(new Set());
        return;
      }

      // Enter / Space: activate focused item
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (focusedSessionId) {
          onSelectSession(focusedSessionId);
        } else if (focusedWorktreePath) {
          let wt: GitWorktreeInfo | undefined = gitWorktrees.find((w) => w.path === focusedWorktreePath);
          if (!wt && worktreesByProject) {
            for (const list of Object.values(worktreesByProject)) {
              wt = list.find((w) => w.path === focusedWorktreePath);
              if (wt) break;
            }
          }
          if (wt) onSelectGitWorktree(wt);
        } else if (focusedProjectId) {
          const proj = projects.find((p) => p.id === focusedProjectId);
          if (proj) onSelectProject(proj);
        }
        return;
      }

      // F2: Rename focused session
      if (e.key === "F2" && focusedSessionId) {
        e.preventDefault();
        const session = sessions.find((s) => s.id === focusedSessionId);
        if (session) {
          const newTitle = window.prompt("Enter new session title:", session.title);
          if (newTitle && newTitle.trim()) {
            invoke("save_session_record", { record: { id: session.id, project_path: session.project_path, title: newTitle.trim(), branch: session.branch, agent_name: session.agentName, executable: session.executable, created_at: Date.now(), updated_at: Date.now() } }).catch(console.error);
            // Parent App will handle the session update via the invoke callback
          }
        }
        return;
      }

      // Arrow navigation
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const direction = e.key === "ArrowDown" ? "down" : "up";
        const currentFocused = focusedSessionId || focusedWorktreePath || focusedProjectId;
        
        if (!currentFocused) {
          // No focus - start with first item
          const first = allFocusable[0];
          if (first) {
            if (first.type === "session") setFocusedSessionId(first.id);
            else if (first.type === "worktree") setFocusedWorktreePath(first.id);
            else setFocusedProjectId(first.id);
            if (first.type === "session") {
              onSelectNextSession?.(direction);
            }
          }
          return;
        }

        const currentIdx = allFocusable.findIndex((f) => f.id === currentFocused);
        if (currentIdx === -1) return;

        const nextIdx = direction === "down" ? currentIdx + 1 : currentIdx - 1;
        if (nextIdx < 0 || nextIdx >= allFocusable.length) return;

        const next = allFocusable[nextIdx];
        if (next.type === "session") {
          setFocusedSessionId(next.id);
          setFocusedWorktreePath(null);
          setFocusedProjectId(null);
          onSelectNextSession?.(direction);
        } else if (next.type === "worktree") {
          setFocusedWorktreePath(next.id);
          setFocusedSessionId(null);
          setFocusedProjectId(null);
        } else {
          setFocusedProjectId(next.id);
          setFocusedSessionId(null);
          setFocusedWorktreePath(null);
        }
        return;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sessions, projects, gitWorktrees, worktreesByProject, getWorktreesForProject, activeProject, collapsedProjects, onSelectNextSession, onSelectPrevSession, onSelectSession, onSelectGitWorktree, onSelectProject, onSessionContextMenu, isModalOpen, focusedSessionId, focusedWorktreePath, focusedProjectId]);

  const toggleProjectCollapse = (projectId: string) => {
    setCollapsedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  };

  // Virtualization: flatten workspaces view into rows for react-window (500+ sessions)
  type FlatRow =
    | { type: "project-header"; proj: HydraProject; isActive: boolean; isCollapsed: boolean; isMenuOpen: boolean }
    | { type: "worktree"; wt: GitWorktreeInfo; proj: HydraProject }
    | { type: "session"; session: WorktreeSession; proj: HydraProject; wt?: GitWorktreeInfo; isOrphan?: boolean; isNested: boolean }
    | { type: "empty"; proj: HydraProject; message: string }
    | { type: "hidden-pill"; proj: HydraProject; hiddenCount: number };

  const flatRows: FlatRow[] = useMemo(() => {
    if (sidebarBody !== "workspaces" || projects.length === 0) return [];
    const rows: FlatRow[] = [];
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

    for (const proj of projects) {
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
  }, [projects, sessions, gitWorktrees, worktreesByProject, getWorktreesForProject, activeProject, collapsedProjects, activeProjectMenuId, filter, sidebarBody, displayOptions, isDefaultBranchWt, isDetachedHeadWt, isAutomationCreatedWt, isCliCreatedWt, isSleepingWorktree, sortWorktreesByOption, sortSessionsByOption]);

  const getRowHeight = useCallback(
    (index: number) => {
      const row = flatRows[index];
      if (!row) return 40;
      if (row.type === "project-header") return 40;
      if (row.type === "worktree") return compactCards ? 32 : 44;
      if (row.type === "session") return compactCards ? 52 : 68;
      if (row.type === "empty") return 32;
      if (row.type === "hidden-pill") return 28;
      return 40;
    },
    [flatRows, compactCards]
  );

  // Use virtualization when rows > 30 or any project has >50 sessions (500+ scenario)
  const useVirtualization = flatRows.length > 30 || sessions.length > 50;

  // Row component for react-window virtualization
  const VirtualRow = ({ index, style, ariaAttributes }: { index: number; style: React.CSSProperties; ariaAttributes?: any }) => {
    const row = flatRows[index];
    if (!row) return null;
    // Common style for virtual row positioning
    const rowStyle: React.CSSProperties = { ...style, left: 0, right: 0, width: "100%" };

    if (row.type === "project-header") {
      const { proj, isActive, isCollapsed, isMenuOpen } = row;
      return (
        <div style={rowStyle} {...ariaAttributes} className="px-2" >
          <div
            draggable={true}
            onDragStart={(e) => handleProjectDragStart(e, proj.id)}
            onDragOver={(e) => handleProjectDragOver(e, proj.id)}
            onDrop={(e) => handleProjectDrop(e, proj.id)}
            onDragEnd={handleProjectDragEnd}
            onClick={() => onSelectProject(proj)}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onProjectContextMenu?.(e, proj);
            }}
            className={`group relative flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer transition ${
              draggedProjectId === proj.id ? "opacity-30" : ""
            } ${
              isActive
                ? "bg-worktree-sidebar-accent text-worktree-sidebar-accent-foreground border border-worktree-sidebar-border/60 font-medium shadow-xs"
                : "hover:bg-worktree-sidebar-accent/50 text-worktree-sidebar-foreground/80 border border-transparent"
            } ${focusedProjectId === proj.id ? "border-indigo-500/50 ring-indigo-500/20 bg-worktree-sidebar-accent/30" : ""}`}
          >
            {projectDropTarget?.id === proj.id && (
              <div
                className={`absolute left-1 right-1 h-[2px] bg-emerald-500 rounded-full z-20 pointer-events-none shadow-[0_0_8px_rgba(16,185,129,0.9)] ${
                  projectDropTarget.position === "top" ? "-top-0.5" : "-bottom-0.5"
                }`}
              />
            )}
            <div className="flex items-center gap-2 min-w-0">
              <GripVertical className="w-3 h-3 text-neutral-600 opacity-0 group-hover:opacity-60 hover:!opacity-100 cursor-grab active:cursor-grabbing shrink-0" />
              <FolderGit2 className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-emerald-400" : "text-neutral-500"}`} />
              {pinnedProjects?.has(proj.id) && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Pinned" />}
              {unreadProjects?.has(proj.id) && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 animate-pulse" title="Unread" />}
              {projectGroupMap?.[proj.id] && (() => { const g = projectGroups?.find((x) => x.id === projectGroupMap[proj.id]); return <span className="text-[8px] px-1 py-0.2 rounded bg-neutral-800 text-neutral-400 shrink-0 truncate max-w-[60px]" title={g?.name ?? projectGroupMap[proj.id]}>{(g?.name ?? projectGroupMap[proj.id]).slice(0,12)}</span>; })()}
              <span className="truncate text-[12px] font-semibold tracking-tight">{proj.name}</span>
            </div>
            <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => toggleProjectCollapse(proj.id)}
                title={isCollapsed ? "Expand workspaces" : "Collapse workspaces"}
                className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition cursor-pointer"
              >
                {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveProjectMenuId(isMenuOpen ? null : proj.id);
                  }}
                  title="Project actions"
                  className={`p-1 rounded transition cursor-pointer ${isMenuOpen ? "bg-neutral-800 text-white" : "text-neutral-400 hover:text-white hover:bg-neutral-800"}`}
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
                {isMenuOpen && (
                  <div className="absolute right-0 top-7 w-56 rounded-xl bg-popover border border-border p-1.5 shadow-2xl z-50 text-xs space-y-0.5 text-popover-foreground" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => { setActiveProjectMenuId(null); onOpenSettings(); }} className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-muted text-popover-foreground text-left transition cursor-pointer"><Sliders className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-[11px]">Project Settings</span></button>
                    <button onClick={async () => { setActiveProjectMenuId(null); const cur = (proj.worktree_base_path ?? "") as string; const input = window.prompt("Worktree base path (relative to project or absolute).\nEx: .worktrees  ou  /home/you/src/worktrees\nLeave empty to use global workspaceDir:", cur); if (input === null) return; const trimmed = input.trim(); try { await invoke("set_project_worktree_base", { path: proj.path, basePath: trimmed ? trimmed : null }); window.dispatchEvent(new CustomEvent("hydra:refresh-projects")); } catch (e) { console.error(e); } }} className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-neutral-800 text-neutral-200 text-left transition cursor-pointer"><FolderTree className="w-3.5 h-3.5 text-emerald-400" /><span className="text-[11px]">Worktree Base: {proj.worktree_base_path || "global"}</span></button>
                    <button onClick={() => { setActiveProjectMenuId(null); navigator.clipboard.writeText(proj.path); }} className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-neutral-800 text-neutral-200 text-left transition cursor-pointer"><Copy className="w-3.5 h-3.5 text-neutral-400" /><span className="text-[11px]">Copy Project Path</span></button>
                    <button onClick={() => { setActiveProjectMenuId(null); onOpenNewWorkspaceModal(proj); }} className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-neutral-800 text-neutral-200 text-left transition cursor-pointer"><FolderTree className="w-3.5 h-3.5 text-neutral-400" /><span className="text-[11px]">New Worktree from Project</span></button>
                    <div className="h-px bg-border my-1" />
                    <button onClick={() => { setActiveProjectMenuId(null); onRemoveProject(proj); }} className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-red-500/10 text-red-400 text-left transition cursor-pointer"><Trash2 className="w-3.5 h-3.5" /><span className="text-[11px]">Remove Project</span></button>
                  </div>
                )}
              </div>
              <button onClick={() => { onSelectProject(proj); onOpenNewWorkspaceModal(proj); }} title={`New workspace for ${proj.name}`} className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition cursor-pointer"><Plus className="w-3.5 h-3.5 text-emerald-400" /></button>
            </div>
          </div>
        </div>
      );
    }

    if (row.type === "worktree") {
      const { wt, proj } = row;
      const isMain = wt.path === proj.path;
      const wtSessions = sessions.filter((s) => s.project_path === wt.path || (!s.project_path && isMain));
      return (
        <div style={rowStyle} {...ariaAttributes} className="px-2 pl-6">
          <div
            draggable={true}
            onDragStart={(e) => handleWorktreeDragStart(e, wt.path)}
            onDragOver={(e) => handleWorktreeDragOver(e, wt.path)}
            onDrop={(e) => handleWorktreeDrop(e, wt.path)}
            onDragEnd={handleWorktreeDragEnd}
            onClick={() => onSelectGitWorktree(wt)}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onWorktreeContextMenu?.(e, wt, proj);
            }}
            className={`group relative ${compactCards ? "py-1.5 px-2 text-[11px]" : "p-2.5"} rounded-lg cursor-pointer worktree-sidebar-card-hover text-worktree-sidebar-foreground/80 hover:text-worktree-sidebar-foreground flex items-center justify-between transition-all ml-2 border-l border-worktree-sidebar-border pl-3 ${
              draggedWorktreePath === wt.path ? "opacity-30" : ""
            } ${focusedWorktreePath === wt.path ? "border-indigo-500/50 ring-indigo-500/20 bg-worktree-sidebar-accent/30" : ""}`}
          >
            {worktreeDropTarget?.path === wt.path && (
              <div className={`absolute left-1 right-1 h-[2px] bg-emerald-500 rounded-full z-20 pointer-events-none shadow-[0_0_8px_rgba(16,185,129,0.9)] ${worktreeDropTarget.position === "top" ? "-top-0.5" : "-bottom-0.5"}`} />
            )}
            <div className="flex items-center gap-2 min-w-0">
              <GripVertical className="w-3 h-3 text-neutral-600 opacity-0 group-hover:opacity-60 hover:!opacity-100 cursor-grab active:cursor-grabbing shrink-0" />
              {pinnedWorktrees?.has(wt.path) && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Pinned" />}
              {unreadWorktrees?.has(wt.path) && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 animate-pulse" title="Unread" />}
              <GitBranch className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="truncate text-[11px] font-medium text-neutral-200" title={wt.branch || proj.name}>{wt.branch || proj.name}</span>
              {isMain && <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-900/40 border border-emerald-800/50 text-emerald-300 shrink-0 font-semibold">primary</span>}
              {wtSessions.length > 0 && <span className="text-[9px] px-1.5 py-0.2 rounded bg-neutral-800 border border-neutral-700 text-neutral-400 shrink-0 font-mono">{wtSessions.length} {wtSessions.length === 1 ? "agent" : "agents"}</span>}
              {formatAge(wt.created_at) && <span className="text-[9px] px-1 py-0.2 rounded bg-neutral-800/50 text-neutral-500 shrink-0 font-mono">{formatAge(wt.created_at)}</span>}
              {wt.status && <span className="text-[8px] px-1.5 py-0.5 rounded bg-red-900/30 border border-red-800/50 text-red-400 shrink-0" title={wt.status}>{wt.status}</span>}
            </div>
            {!isMain && (
              <button onClick={(e) => { e.stopPropagation(); onDeleteGitWorktree(wt); }} title="Delete worktree from disk" className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-neutral-700 text-neutral-400 hover:text-red-400 transition"><Trash2 className="w-3 h-3" /></button>
            )}
          </div>
        </div>
      );
    }

    if (row.type === "session") {
      const { session, proj, isNested } = row;
      const isActiveProject = proj.path === activeProject?.path;
      const indentClass = isNested ? "ml-8 pl-2 border-l border-worktree-sidebar-border/40" : "ml-6 pl-2 border-l border-worktree-sidebar-border";
      return (
        <div style={rowStyle} {...ariaAttributes} className={`px-2 ${indentClass}`}>
          <div
            draggable={true}
            onDragStart={(e) => handleSessionDragStart(e, session.id)}
            onDragOver={(e) => handleSessionDragOver(e, session.id)}
            onDrop={(e) => handleSessionDrop(e, session.id)}
            onDragEnd={handleSessionDragEnd}
            onClick={(e) => handleSessionClick(e, session.id)}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSessionContextMenu?.(e, session);
            }}
            className={`group relative ${compactCards ? "py-1.5 px-2" : "p-2.5"} rounded-lg text-xs cursor-pointer select-none transition-all ${
              draggedSessionId === session.id ? "opacity-30 scale-[0.98]" : ""
            } ${
              session.active && isActiveProject
                ? "bg-worktree-sidebar-accent text-worktree-sidebar-accent-foreground border border-worktree-sidebar-border shadow-xs"
                : "worktree-sidebar-card-hover text-worktree-sidebar-foreground/70 hover:text-worktree-sidebar-foreground"
            } ${focusedSessionId === session.id ? "border-indigo-500/50 ring-indigo-500/20" : ""} ${
              selectedSessions.has(session.id) ? "bg-indigo-500/20 select-none" : ""
            }`}
          >
            {sessionDropTarget?.id === session.id && (
              <div className={`absolute left-1 right-1 h-[2px] bg-emerald-500 rounded-full z-20 pointer-events-none shadow-[0_0_8px_rgba(16,185,129,0.9)] ${sessionDropTarget.position === "top" ? "-top-0.5" : "-bottom-0.5"}`} />
            )}
            {session.active && isActiveProject && <div className="absolute left-0 top-2 bottom-2 w-[2px] bg-emerald-500 rounded-r" />}
            <div className="flex items-center justify-between mb-1 pl-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <GripVertical className="w-3 h-3 text-neutral-600 opacity-0 group-hover:opacity-60 hover:!opacity-100 cursor-grab active:cursor-grabbing shrink-0" />
                {(pinnedWorktrees?.has(session.id) || pinnedWorktrees?.has(session.project_path)) && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Pinned" />}
                {unreadWorktrees?.has(session.id) && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 animate-pulse" title="Unread" />}
                <SessionAgentIcon agentName={session.agentName} size={12} />
                <span className="font-medium truncate text-neutral-100 text-[11px]">{session.title}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className={`w-2 h-2 rounded-full shrink-0 ${session.state === "working" ? "bg-amber-400 animate-pulse" : session.state === "blocked" ? "bg-red-400 ring-2 ring-red-500/30" : "bg-emerald-400"}`} title={`Herdr State: ${session.state}`} />
                <button onClick={(e) => { e.stopPropagation(); onDeleteSession(session.id); }} className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-neutral-800 text-neutral-500 hover:text-red-400 transition"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] text-neutral-500 pl-1 font-mono">
              <span className="flex items-center gap-1 truncate"><GitBranch className="w-2.5 h-2.5 text-neutral-400" />{session.branch}</span>
              <span className="flex items-center gap-1">
                {formatAge(session.updated_at ?? session.created_at) && <span className="text-[9px] text-neutral-500 font-mono">{formatAge(session.updated_at ?? session.created_at)}</span>}
                <span className="flex items-center gap-1 text-neutral-400 text-[9px] bg-neutral-900 border border-neutral-800 px-1.5 py-0.2 rounded"><SessionAgentIcon agentName={session.agentName} size={10} />{session.agentName}</span>
              </span>
            </div>
          </div>
        </div>
      );
    }

    if (row.type === "hidden-pill") {
      const { hiddenCount } = row;
      return (
        <div style={rowStyle} {...ariaAttributes} className="px-2 pl-6">
          <button
            onClick={() => {
              setDisplayOptions({ groupBy: "repo", sortBy: "agent-activity", hideSleeping: false, hideDefaultBranch: false, hideAutomationCreated: false, hideCliCreated: false, hideDetachedHead: false });
            }}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-worktree-sidebar-border bg-worktree-sidebar-accent/30 text-[10px] font-medium text-worktree-sidebar-foreground/60 hover:text-worktree-sidebar-foreground hover:bg-worktree-sidebar-accent/50 hover:border-worktree-sidebar-border transition cursor-pointer ml-2"
            title="Clear filters to show hidden worktrees"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400/60" />
            <span>{hiddenCount} hidden {hiddenCount === 1 ? "worktree" : "worktrees"}</span>
            <span className="text-[9px] text-worktree-sidebar-foreground/40">— click to show</span>
          </button>
        </div>
      );
    }

    if (row.type === "empty") {
      return (
        <div style={rowStyle} {...ariaAttributes} className="px-2 pl-6">
          <div className="py-2 px-2 text-[11px] text-neutral-600 italic ml-2 border-l border-worktree-sidebar-border pl-3">No active worktrees in this project.</div>
        </div>
      );
    }

    return null;
  };

  const sidebarTintStyle = (() => {
    if (settings?.left_sidebar_appearance_mode === "tinted" && settings.left_sidebar_tint_color) {
      const color = settings.left_sidebar_tint_color;
      const opacity = settings.left_sidebar_tint_opacity ?? 0.1;
      return { backgroundColor: `color-mix(in srgb, ${color} ${Math.round(opacity * 100)}%, #121316)` } as const;
    }
    return {};
  })();

  return (
    <div className="flex flex-col h-full bg-worktree-sidebar select-none relative font-sans text-worktree-sidebar-foreground" style={sidebarTintStyle}>
      {/* 1. SIDEBAR HEADER (Orca SidebarHeader.tsx with Bell toggle) */}
      <SidebarHeader
        sidebarBody={sidebarBody}
        setSidebarBody={setSidebarBody}
        onOpenAddRepoDialog={onOpenAddRepoDialog}
        onOpenNewWorkspaceModal={onOpenNewWorkspaceModal}
        optionsButtonRef={optionsButtonRef}
        optionsMenuOpen={optionsMenuOpen}
        setOptionsMenuOpen={setOptionsMenuOpen}
        projects={projects}
      />

      {/* 3. Filter Search Bar - only show in workspaces view */}
      {sidebarBody === "workspaces" && (
        <div className="p-2 shrink-0">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter projects and workspaces..."
            className="w-full bg-worktree-sidebar-accent/50 border border-worktree-sidebar-border rounded-md px-2.5 py-1 text-[11px] text-worktree-sidebar-foreground placeholder:text-worktree-sidebar-foreground/40 focus:outline-none focus:ring-1 focus:ring-worktree-sidebar-ring"
          />
        </div>
      )}

      {/* 4. MAIN CONTENT AREA - Conditional: Workspaces Tree OR Agents List — virtualized when >30 rows (500+ sessions) */}
      {sidebarBody === "workspaces" ? (
        projects.length === 0 ? (
          <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-3">
            <div className="p-6 text-center text-neutral-500 text-xs space-y-3">
              <p className="text-neutral-400 font-medium">No projects added yet.</p>
              <p className="text-[11px] text-neutral-500">Add an existing project from disk to begin working with agents.</p>
              <button
                onClick={onOpenAddRepoDialog}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-medium transition cursor-pointer"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>Add Existing Project</span>
              </button>
            </div>
          </div>
        ) : useVirtualization ? (
          <div className="flex-1 min-h-0 overflow-hidden">
            <List
              rowCount={flatRows.length}
              rowHeight={getRowHeight}
              rowComponent={VirtualRow}
              // @ts-ignore
              rowProps={{}}
              style={{ height: "100%", width: "100%" }}
              className="py-2"
              overscanCount={8}
            />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-3">
            {projects.map((proj) => {
                const isActiveProject = proj.path === activeProject?.path;
                const isCollapsed = collapsedProjects.has(proj.id);
                const rawProjectWorktrees = getWorktreesForProject(proj);
                const projectSessionsRaw = sessions.filter(
                  (s) => s.project_path === proj.path 
                    || (!s.project_path && isActiveProject)
                    || rawProjectWorktrees.some((wt) => wt.path === s.project_path)
                    || s.project_path.startsWith(proj.path + "/")
                );
                // Sprint 3: apply displayOptions filtering (same as flatRows)
                const displayFilteredWts = rawProjectWorktrees.filter((wt) => {
                  if (displayOptions.hideDefaultBranch && isDefaultBranchWt(wt, proj)) return false;
                  if (displayOptions.hideDetachedHead && isDetachedHeadWt(wt)) return false;
                  if (displayOptions.hideAutomationCreated && isAutomationCreatedWt(wt)) return false;
                  if (displayOptions.hideCliCreated && isCliCreatedWt(wt)) return false;
                  if (displayOptions.hideSleeping && isSleepingWorktree(wt, proj)) return false;
                  return true;
                });
                const lowerFilter = filter.trim().toLowerCase();
                const matchesFilter = (s: WorktreeSession) => !lowerFilter || s.title.toLowerCase().includes(lowerFilter) || s.branch.toLowerCase().includes(lowerFilter) || s.agentName.toLowerCase().includes(lowerFilter);
                const projectSessionsUnsorted = displayOptions.hideSleeping ? projectSessionsRaw.filter((s) => s.state !== "idle" && (!lowerFilter || matchesFilter(s))) : (lowerFilter ? projectSessionsRaw.filter(matchesFilter) : projectSessionsRaw);
                const projectWorktreesUnsorted = lowerFilter ? displayFilteredWts.filter((wt) => wt.branch.toLowerCase().includes(lowerFilter) || projectSessionsUnsorted.some((s) => s.project_path === wt.path)) : displayFilteredWts;
                const hiddenCount = rawProjectWorktrees.length - projectWorktreesUnsorted.length;
                const projectWorktrees = sortWorktreesByOption(projectWorktreesUnsorted, proj);
                const projectSessions = sortSessionsByOption(projectSessionsUnsorted);
                const isMenuOpen = activeProjectMenuId === proj.id;

                return (
                  <div key={proj.id} className="space-y-1">
                    {/* REPO HEADER ROW: [Icon + Project Name]  -----  [ChevronDown/Right] [...] [+] */}
                    <div
                      draggable={true}
                      onDragStart={(e) => handleProjectDragStart(e, proj.id)}
                      onDragOver={(e) => handleProjectDragOver(e, proj.id)}
                      onDrop={(e) => handleProjectDrop(e, proj.id)}
                      onDragEnd={handleProjectDragEnd}
                      onClick={() => onSelectProject(proj)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onProjectContextMenu?.(e, proj);
                      }}
                      className={`group relative flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer transition ${
                        draggedProjectId === proj.id ? "opacity-30" : ""
                      } ${
                        isActiveProject
                          ? "bg-worktree-sidebar-accent text-worktree-sidebar-accent-foreground border border-worktree-sidebar-border/60 font-medium shadow-xs"
                          : "hover:bg-worktree-sidebar-accent/50 text-worktree-sidebar-foreground/80 border border-transparent"
                      } ${
                        focusedProjectId === proj.id
                          ? "border-indigo-500/50 ring-indigo-500/20 bg-worktree-sidebar-accent/30"
                          : ""
                      }`}
                    >
                      {projectDropTarget?.id === proj.id && (
                        <div
                          className={`absolute left-1 right-1 h-[2px] bg-emerald-500 rounded-full z-20 pointer-events-none shadow-[0_0_8px_rgba(16,185,129,0.9)] ${
                            projectDropTarget.position === "top" ? "-top-0.5" : "-bottom-0.5"
                          }`}
                        />
                      )}
                      {/* Left: Project Icon + Display Name */}
                      <div className="flex items-center gap-2 min-w-0">
                        <GripVertical className="w-3 h-3 text-neutral-600 opacity-0 group-hover:opacity-60 hover:!opacity-100 cursor-grab active:cursor-grabbing shrink-0" />
                        <FolderGit2 className={`w-3.5 h-3.5 shrink-0 ${isActiveProject ? "text-emerald-400" : "text-neutral-500"}`} />
                        {pinnedProjects?.has(proj.id) && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Pinned" />}
                        {unreadProjects?.has(proj.id) && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 animate-pulse" title="Unread" />}
                        {projectGroupMap?.[proj.id] && (() => { const g = projectGroups?.find((x) => x.id === projectGroupMap[proj.id]); return <span className="text-[8px] px-1 py-0.2 rounded bg-neutral-800 text-neutral-400 shrink-0 truncate max-w-[60px]" title={g?.name ?? projectGroupMap[proj.id]}>{(g?.name ?? projectGroupMap[proj.id]).slice(0,12)}</span>; })()}
                        <span className="truncate text-[12px] font-semibold tracking-tight">{proj.name}</span>
                      </div>

                      {/* Right Cluster: Chevron Toggle | Options Ellipsis '...' | Plus '+' */}
                      <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        {/* ARROW 1: Collapse/Expand Chevron */}
                        <button
                          onClick={() => toggleProjectCollapse(proj.id)}
                          title={isCollapsed ? "Expand workspaces" : "Collapse workspaces"}
                          className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition cursor-pointer"
                        >
                          {isCollapsed ? (
                            <ChevronRight className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* ARROW 2: Project Actions Menu ('...') */}
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveProjectMenuId(isMenuOpen ? null : proj.id);
                            }}
                            title="Project actions"
                            className={`p-1 rounded transition cursor-pointer ${
                              isMenuOpen ? "bg-neutral-800 text-white" : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                            }`}
                          >
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </button>

                          {isMenuOpen && (
                            <div 
                              className="absolute right-0 top-7 w-56 rounded-xl bg-popover border border-border p-1.5 shadow-2xl z-50 text-xs space-y-0.5 text-popover-foreground"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => {
                                  setActiveProjectMenuId(null);
                                  onOpenSettings();
                                }}
                                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-muted text-popover-foreground text-left transition cursor-pointer"
                              >
                                <Sliders className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="text-[11px]">Project Settings</span>
                              </button>
                              <button
                                onClick={async () => {
                                  setActiveProjectMenuId(null);
                                  const cur = (proj.worktree_base_path ?? "") as string;
                                  const input = window.prompt(
                                    "Worktree base path (relative to project or absolute).\nEx: .worktrees  ou  /home/you/src/worktrees\nLeave empty to use global workspaceDir:",
                                    cur
                                  );
                                  if (input === null) return;
                                  const trimmed = input.trim();
                                  try {
                                    await invoke("set_project_worktree_base", { path: proj.path, basePath: trimmed ? trimmed : null });
                                    // Evita reload que mata PTYs shadow buffer — emite evento para o parent recarregar lista
                                    window.dispatchEvent(new CustomEvent("hydra:refresh-projects"));
                                  } catch (e) { console.error(e); }
                                }}
                                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-neutral-800 text-neutral-200 text-left transition cursor-pointer"
                              >
                                <FolderTree className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-[11px]">Worktree Base: {proj.worktree_base_path || "global"}</span>
                              </button>

                              <button
                                onClick={() => {
                                  setActiveProjectMenuId(null);
                                  navigator.clipboard.writeText(proj.path);
                                }}
                                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-neutral-800 text-neutral-200 text-left transition cursor-pointer"
                              >
                                <Copy className="w-3.5 h-3.5 text-neutral-400" />
                                <span className="text-[11px]">Copy Project Path</span>
                              </button>

                              <button
                                onClick={() => {
                                  setActiveProjectMenuId(null);
                                  onOpenNewWorkspaceModal(proj);
                                }}
                                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-neutral-800 text-neutral-200 text-left transition cursor-pointer"
                              >
                                <FolderTree className="w-3.5 h-3.5 text-neutral-400" />
                                <span className="text-[11px]">New Worktree from Project</span>
                              </button>

                              <div className="h-px bg-border my-1" />
                              <button
                                onClick={() => {
                                  setActiveProjectMenuId(null);
                                  onRemoveProject(proj);
                                }}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span className="text-[11px]">Remove Project</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* ARROW 3: Create Workspace '+' -> Orca NewWorkspaceComposer */}
                        <button
                          onClick={() => {
                            onSelectProject(proj);
                            onOpenNewWorkspaceModal(proj);
                          }}
                          title={`New workspace for ${proj.name}`}
                          className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 text-emerald-400" />
                        </button>
                      </div>
                    </div>

                    {/* WORKTREE ROWS ANINHADAS DENTRO DO PROJETO */}
                    {!isCollapsed && (
                      <div className="pl-3.5 ml-2 border-l border-worktree-sidebar-border space-y-2 pt-0.5">
                        {projectWorktrees.length === 0 && projectSessions.length === 0 ? (
                          hiddenCount > 0 ? (
                            <button
                              onClick={() => {
                                setDisplayOptions({ groupBy: "repo", sortBy: "agent-activity", hideSleeping: false, hideDefaultBranch: false, hideAutomationCreated: false, hideCliCreated: false, hideDetachedHead: false });
                              }}
                              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-worktree-sidebar-border bg-worktree-sidebar-accent/30 text-[10px] font-medium text-worktree-sidebar-foreground/60 hover:text-worktree-sidebar-foreground hover:bg-worktree-sidebar-accent/50 hover:border-worktree-sidebar-border transition cursor-pointer"
                              title="Clear filters to show hidden worktrees"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400/60" />
                              <span>{hiddenCount} hidden {hiddenCount === 1 ? "worktree" : "worktrees"}</span>
                              <span className="text-[9px] text-worktree-sidebar-foreground/40">— click to show</span>
                            </button>
                          ) : (
                            <div className="py-2 px-2 text-[11px] text-neutral-600 italic">
                              No active worktrees in this project.
                            </div>
                          )
                        ) : projectWorktrees.length > 0 ? (
                          <>
                            {projectWorktrees.map((wt) => {
                              const isMain = wt.path === proj.path;
                              const wtSessions = projectSessions.filter(
                                (s) => s.project_path === wt.path || (!s.project_path && isMain)
                              );
                              return (
                                <div key={wt.path} className="space-y-1">
                                  <div
                                    draggable={true}
                                    onDragStart={(e) => handleWorktreeDragStart(e, wt.path)}
                                    onDragOver={(e) => handleWorktreeDragOver(e, wt.path)}
                                    onDrop={(e) => handleWorktreeDrop(e, wt.path)}
                                    onDragEnd={handleWorktreeDragEnd}
                                    onClick={() => onSelectGitWorktree(wt)}
                                    onContextMenu={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      onWorktreeContextMenu?.(e, wt, proj);
                                    }}
                                    className={`group relative ${compactCards ? "py-1.5 px-2 text-[11px]" : "p-2.5"} rounded-lg cursor-pointer worktree-sidebar-card-hover text-worktree-sidebar-foreground/80 hover:text-worktree-sidebar-foreground flex items-center justify-between transition-all ${
                                      draggedWorktreePath === wt.path ? "opacity-30" : ""
                                    } ${
                                      focusedWorktreePath === wt.path
                                        ? "border-indigo-500/50 ring-indigo-500/20 bg-worktree-sidebar-accent/30"
                                        : ""
                                    }`}
                                  >
                                    {worktreeDropTarget?.path === wt.path && (
                                      <div
                                        className={`absolute left-1 right-1 h-[2px] bg-emerald-500 rounded-full z-20 pointer-events-none shadow-[0_0_8px_rgba(16,185,129,0.9)] ${
                                          worktreeDropTarget.position === "top" ? "-top-0.5" : "-bottom-0.5"
                                        }`}
                                      />
                                    )}
                                    <div className="flex items-center gap-2 min-w-0">
                                      <GripVertical className="w-3 h-3 text-neutral-600 opacity-0 group-hover:opacity-60 hover:!opacity-100 cursor-grab active:cursor-grabbing shrink-0" />
                                      {pinnedWorktrees?.has(wt.path) && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Pinned" />}
                                      {unreadWorktrees?.has(wt.path) && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 animate-pulse" title="Unread" />}
                                      <GitBranch className="w-3 h-3 text-emerald-400 shrink-0" />
                                      <span className="truncate text-[11px] font-medium text-neutral-200" title={wt.branch || proj.name}>
                                        {wt.branch || proj.name}
                                      </span>
                                      {isMain && (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-900/40 border border-emerald-800/50 text-emerald-300 shrink-0 font-semibold">
                                          primary
                                        </span>
                                      )}
                                      {wtSessions.length > 0 && (
                                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-neutral-800 border border-neutral-700 text-neutral-400 shrink-0 font-mono">
                                          {wtSessions.length} {wtSessions.length === 1 ? "agent" : "agents"}
                                        </span>
                                      )}
                                      {formatAge(wt.created_at) && <span className="text-[9px] px-1 py-0.2 rounded bg-neutral-800/50 text-neutral-500 shrink-0 font-mono">{formatAge(wt.created_at)}</span>}
                                      {wt.status && <span className="text-[8px] px-1.5 py-0.5 rounded bg-red-900/30 border border-red-800/50 text-red-400 shrink-0" title={wt.status}>{wt.status}</span>}
                                    </div>
                                    {!isMain && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onDeleteGitWorktree(wt);
                                        }}
                                        title="Delete worktree from disk"
                                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-neutral-700 text-neutral-400 hover:text-red-400 transition"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                  {wtSessions.length > 0 && (
                                    <div className="ml-2 pl-2 border-l border-worktree-sidebar-border/40 space-y-1">
                                      {wtSessions.map((session) => (
                                        <div
                                          key={session.id}
                                          draggable={true}
                                          onDragStart={(e) => handleSessionDragStart(e, session.id)}
                                          onDragOver={(e) => handleSessionDragOver(e, session.id)}
                                          onDrop={(e) => handleSessionDrop(e, session.id)}
                                          onDragEnd={handleSessionDragEnd}
                                          onClick={() => onSelectSession(session.id)}
                                          onContextMenu={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            onSessionContextMenu?.(e, session);
                                          }}
                                          className={`group relative ${compactCards ? "py-1.5 px-2" : "p-2.5"} rounded-lg text-xs cursor-pointer select-none transition-all ${
                                            draggedSessionId === session.id ? "opacity-30 scale-[0.98]" : ""
                                          } ${
                                            session.active && isActiveProject
                                              ? "bg-worktree-sidebar-accent text-worktree-sidebar-accent-foreground border border-worktree-sidebar-border shadow-xs"
                                              : "worktree-sidebar-card-hover text-worktree-sidebar-foreground/70 hover:text-worktree-sidebar-foreground"
                                          } ${
                                            focusedSessionId === session.id
                                              ? "border-indigo-500/50 ring-indigo-500/20"
                                              : ""
                                          }`}
                                        >
                                          {sessionDropTarget?.id === session.id && (
                                            <div
                                              className={`absolute left-1 right-1 h-[2px] bg-emerald-500 rounded-full z-20 pointer-events-none shadow-[0_0_8px_rgba(16,185,129,0.9)] ${
                                                sessionDropTarget.position === "top" ? "-top-0.5" : "-bottom-0.5"
                                              }`}
                                            />
                                          )}
                                          {session.active && isActiveProject && (
                                            <div className="absolute left-0 top-2 bottom-2 w-[2px] bg-emerald-500 rounded-r" />
                                          )}
                                          <div className="flex items-center justify-between mb-1 pl-1">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                              <GripVertical className="w-3 h-3 text-neutral-600 opacity-0 group-hover:opacity-60 hover:!opacity-100 cursor-grab active:cursor-grabbing shrink-0" />
                                              {(pinnedWorktrees?.has(session.id) || pinnedWorktrees?.has(session.project_path)) && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Pinned" />}
                                              {unreadWorktrees?.has(session.id) && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 animate-pulse" title="Unread" />}
                                              <SessionAgentIcon agentName={session.agentName} size={12} />
                                              <span className="font-medium truncate text-neutral-100 text-[11px]">
                                                {session.title}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                              <span
                                                className={`w-2 h-2 rounded-full shrink-0 ${
                                                  session.state === "working"
                                                    ? "bg-amber-400 animate-pulse"
                                                    : session.state === "blocked"
                                                      ? "bg-red-400 ring-2 ring-red-500/30"
                                                      : "bg-emerald-400"
                                                }`}
                                                title={`Herdr State: ${session.state}`}
                                              />
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  onDeleteSession(session.id);
                                                }}
                                                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-neutral-800 text-neutral-500 hover:text-red-400 transition"
                                              >
                                                <Trash2 className="w-3 h-3" />
                                              </button>
                                            </div>
                                          </div>
                                          <div className="flex items-center justify-between text-[10px] text-neutral-500 pl-1 font-mono">
                                            <span className="flex items-center gap-1 truncate">
                                              <GitBranch className="w-2.5 h-2.5 text-neutral-400" />
                                              {session.branch}
                                            </span>
                                            <span className="flex items-center gap-1">
                                              {formatAge(session.updated_at ?? session.created_at) && <span className="text-[9px] text-neutral-500 font-mono">{formatAge(session.updated_at ?? session.created_at)}</span>}
                                              <span className="flex items-center gap-1 text-neutral-400 text-[9px] bg-neutral-900 border border-neutral-800 px-1.5 py-0.2 rounded"><SessionAgentIcon agentName={session.agentName} size={10} />{session.agentName}</span>
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            {(() => {
                              const orphanSessions = projectSessions.filter(
                                (s) => !projectWorktrees.some((wt) => wt.path === s.project_path) && !(!s.project_path && projectWorktrees.some((wt) => wt.path === proj.path))
                              );
                              if (orphanSessions.length === 0) return null;
                              return (
                                <div className="space-y-1 pt-1 border-t border-worktree-sidebar-border/30">
                                  {orphanSessions.map((session) => (
                                    <div
                                      key={session.id}
                                      draggable={true}
                                      onDragStart={(e) => handleSessionDragStart(e, session.id)}
                                      onDragOver={(e) => handleSessionDragOver(e, session.id)}
                                      onDrop={(e) => handleSessionDrop(e, session.id)}
                                      onDragEnd={handleSessionDragEnd}
                                      onClick={() => onSelectSession(session.id)}
                                      onContextMenu={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onSessionContextMenu?.(e, session);
                                      }}
                                      className={`group relative ${compactCards ? "py-1.5 px-2" : "p-2.5"} rounded-lg text-xs cursor-pointer select-none transition-all ${
                                        draggedSessionId === session.id ? "opacity-30 scale-[0.98]" : ""
                                      } ${
                                        session.active && isActiveProject
                                          ? "bg-worktree-sidebar-accent text-worktree-sidebar-accent-foreground border border-worktree-sidebar-border shadow-xs"
                                          : "worktree-sidebar-card-hover text-worktree-sidebar-foreground/70 hover:text-worktree-sidebar-foreground"
                                      } ${
                                        focusedSessionId === session.id
                                          ? "border-indigo-500/50 ring-indigo-500/20"
                                          : ""
                                      }`}
                                    >
                                      {sessionDropTarget?.id === session.id && (
                                        <div
                                          className={`absolute left-1 right-1 h-[2px] bg-emerald-500 rounded-full z-20 pointer-events-none shadow-[0_0_8px_rgba(16,185,129,0.9)] ${
                                            sessionDropTarget.position === "top" ? "-top-0.5" : "-bottom-0.5"
                                          }`}
                                        />
                                      )}
                                      {session.active && isActiveProject && (
                                        <div className="absolute left-0 top-2 bottom-2 w-[2px] bg-emerald-500 rounded-r" />
                                      )}
                                      <div className="flex items-center justify-between mb-1 pl-1">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                          <GripVertical className="w-3 h-3 text-neutral-600 opacity-0 group-hover:opacity-60 hover:!opacity-100 cursor-grab active:cursor-grabbing shrink-0" />
                                          <SessionAgentIcon agentName={session.agentName} size={12} />
                                          <span className="font-medium truncate text-neutral-100 text-[11px]">{session.title}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                          <span className={`w-2 h-2 rounded-full shrink-0 ${session.state === "working" ? "bg-amber-400 animate-pulse" : session.state === "blocked" ? "bg-red-400 ring-2 ring-red-500/30" : "bg-emerald-400"}`} title={`Herdr State: ${session.state}`} />
                                          <button onClick={(e) => { e.stopPropagation(); onDeleteSession(session.id); }} className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-neutral-800 text-neutral-500 hover:text-red-400 transition"><Trash2 className="w-3 h-3" /></button>
                                        </div>
                                      </div>
                                      <div className="flex items-center justify-between text-[10px] text-neutral-500 pl-1 font-mono">
                                        <span className="flex items-center gap-1 truncate"><GitBranch className="w-2.5 h-2.5 text-neutral-400" />{session.branch}</span>
                                        <span className="flex items-center gap-1 text-neutral-400 text-[9px] bg-neutral-900 border border-neutral-800 px-1.5 py-0.2 rounded"><SessionAgentIcon agentName={session.agentName} size={10} />{session.agentName}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              );
                            })()}
                            {hiddenCount > 0 && (
                              <button
                                onClick={() => {
                                  setDisplayOptions({ groupBy: "repo", sortBy: "agent-activity", hideSleeping: false, hideDefaultBranch: false, hideAutomationCreated: false, hideCliCreated: false, hideDetachedHead: false });
                                }}
                                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-worktree-sidebar-border bg-worktree-sidebar-accent/30 text-[10px] font-medium text-worktree-sidebar-foreground/60 hover:text-worktree-sidebar-foreground hover:bg-worktree-sidebar-accent/50 hover:border-worktree-sidebar-border transition cursor-pointer"
                                title="Clear filters to show hidden worktrees"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400/60" />
                                <span>{hiddenCount} hidden {hiddenCount === 1 ? "worktree" : "worktrees"}</span>
                                <span className="text-[9px] text-worktree-sidebar-foreground/40">— click to show</span>
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                          {projectSessions.map((session) => (
                            <div
                              key={session.id}
                              draggable={true}
                              onDragStart={(e) => handleSessionDragStart(e, session.id)}
                              onDragOver={(e) => handleSessionDragOver(e, session.id)}
                              onDrop={(e) => handleSessionDrop(e, session.id)}
                              onDragEnd={handleSessionDragEnd}
                              onClick={(e) => handleSessionClick(e, session.id)}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onSessionContextMenu?.(e, session);
                              }}
                              className={`group relative ${compactCards ? "py-1.5 px-2" : "p-2.5"} rounded-lg text-xs cursor-pointer select-none transition-all ${
                                draggedSessionId === session.id ? "opacity-30 scale-[0.98]" : ""
                              } ${
                                session.active && isActiveProject
                                  ? "bg-worktree-sidebar-accent text-worktree-sidebar-accent-foreground border border-worktree-sidebar-border shadow-xs"
                                  : "worktree-sidebar-card-hover text-worktree-sidebar-foreground/70 hover:text-worktree-sidebar-foreground"
                              } ${
                                focusedSessionId === session.id
                                  ? "border-indigo-500/50 ring-indigo-500/20"
                                  : ""
                              } ${
                                selectedSessions.has(session.id)
                                  ? "bg-indigo-500/20 select-none"
                                  : ""
                              }`}
                            >
                              {sessionDropTarget?.id === session.id && (
                                <div
                                  className={`absolute left-1 right-1 h-[2px] bg-emerald-500 rounded-full z-20 pointer-events-none shadow-[0_0_8px_rgba(16,185,129,0.9)] ${
                                    sessionDropTarget.position === "top" ? "-top-0.5" : "-bottom-0.5"
                                  }`}
                                />
                              )}
                              {session.active && isActiveProject && (
                                <div className="absolute left-0 top-2 bottom-2 w-[2px] bg-emerald-500 rounded-r" />
                              )}
                              <div className="flex items-center justify-between mb-1 pl-1">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <GripVertical className="w-3 h-3 text-neutral-600 opacity-0 group-hover:opacity-60 hover:!opacity-100 cursor-grab active:cursor-grabbing shrink-0" />
                                  {(pinnedWorktrees?.has(session.id) || pinnedWorktrees?.has(session.project_path)) && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Pinned" />}
                                  {unreadWorktrees?.has(session.id) && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 animate-pulse" title="Unread" />}
                                  <SessionAgentIcon agentName={session.agentName} size={12} />
                                  <span className="font-medium truncate text-neutral-100 text-[11px]">{session.title}</span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className={`w-2 h-2 rounded-full shrink-0 ${session.state === "working" ? "bg-amber-400 animate-pulse" : session.state === "blocked" ? "bg-red-400 ring-2 ring-red-500/30" : "bg-emerald-400"}`} title={`Herdr State: ${session.state}`} />
                                  <button onClick={(e) => { e.stopPropagation(); onDeleteSession(session.id); }} className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-neutral-800 text-neutral-500 hover:text-red-400 transition"><Trash2 className="w-3 h-3" /></button>
                                </div>
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-neutral-500 pl-1 font-mono">
                                <span className="flex items-center gap-1 truncate"><GitBranch className="w-2.5 h-2.5 text-neutral-400" />{session.branch}</span>
                                <span className="flex items-center gap-1 text-neutral-400 text-[9px] bg-neutral-900 border border-neutral-800 px-1.5 py-0.2 rounded"><SessionAgentIcon agentName={session.agentName} size={10} />{session.agentName}</span>
                              </div>
                            </div>
                          ))}
                          {hiddenCount > 0 && (
                            <button
                              onClick={() => {
                                setDisplayOptions({ groupBy: "repo", sortBy: "agent-activity", hideSleeping: false, hideDefaultBranch: false, hideAutomationCreated: false, hideCliCreated: false, hideDetachedHead: false });
                              }}
                              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-worktree-sidebar-border bg-worktree-sidebar-accent/30 text-[10px] font-medium text-worktree-sidebar-foreground/60 hover:text-worktree-sidebar-foreground hover:bg-worktree-sidebar-accent/50 hover:border-worktree-sidebar-border transition cursor-pointer mt-2"
                              title="Clear filters to show hidden worktrees"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400/60" />
                              <span>{hiddenCount} hidden {hiddenCount === 1 ? "worktree" : "worktrees"}</span>
                              <span className="text-[9px] text-worktree-sidebar-foreground/40">— click to show</span>
                            </button>
                          )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )
      ) : (
        <SidebarAgentsList
          sessions={sessions}
          projects={projects}
          onSelectSession={onSelectSession}
          onDeleteSession={onDeleteSession}
          compactCards={compactCards}
          isModalOpen={isModalOpen}
        />
      )}

      {/* 5. Orca Workspace Options Menu Overlay com ancoragem precisa */}
      <WorkspaceOptionsMenu
        isOpen={optionsMenuOpen}
        triggerRef={optionsButtonRef}
        options={displayOptions}
        projects={projects}
        onClose={() => setOptionsMenuOpen(false)}
        onOptionsChange={setDisplayOptions}
      />

      {/* 5b. Batch delete bar — only for explicit multi-select (Ctrl/Shift), never on single click */}
      {selectedSessions.size > 1 && (
        <div className="border-t border-red-500/20 bg-red-500/5 px-3 py-2 flex items-center justify-between text-[11px] shrink-0">
          <span className="text-red-300 font-medium">{selectedSessions.size} selected</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSelectedSessions(new Set())}
              className="px-2 py-1 rounded text-worktree-sidebar-foreground/60 hover:bg-worktree-sidebar-accent hover:text-worktree-sidebar-foreground transition cursor-pointer"
            >
              Clear
            </button>
            <button
              onClick={() => {
                selectedSessions.forEach((id) => onDeleteSession(id));
                setSelectedSessions(new Set());
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/20 transition cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      )}

      {/* 6. Orca Sidebar Footer */}
      <div className="h-8 border-t border-worktree-sidebar-border px-3 flex items-center justify-between text-[10px] text-worktree-sidebar-foreground/50 font-mono bg-worktree-sidebar shrink-0">
        <button
          onClick={onOpenSettings}
          title="Open Settings (Ctrl+,)"
          className="flex items-center gap-1.5 hover:text-worktree-sidebar-foreground transition cursor-pointer"
        >
          <Settings className="w-3 h-3 text-worktree-sidebar-foreground/50 hover:text-emerald-400 transition" />
          <span>Settings</span>
        </button>
        <div className="flex items-center gap-2">
          {appVersion && (
            <span className="text-[10px] text-neutral-500" title={`Hydra v${appVersion}`}>v{appVersion}</span>
          )}
          {gitStatus?.head_commit && (
            <span className="flex items-center gap-1 text-neutral-400">
              <GitCommit className="w-2.5 h-2.5 text-neutral-500" />
              <span>{gitStatus.head_commit.slice(0,7)}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
