import { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
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
  GripVertical
} from "lucide-react";
import { WorkspaceOptionsMenu, type WorkspaceDisplayOptions } from "./WorkspaceOptionsMenu";
import { SidebarHeader } from "./SidebarHeader";
import { SidebarAgentsList } from "./SidebarAgentsList";

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
  onReorderWorktrees?: (worktrees: GitWorktreeInfo[]) => void;
  pinnedProjects?: Set<string>;
  unreadProjects?: Set<string>;
  pinnedWorktrees?: Set<string>;
  unreadWorktrees?: Set<string>;
  projectGroupMap?: Record<string, string>;
  projectGroups?: Array<{ id: string; name: string }>;
  compactCards?: boolean;
}

export function WorktreeSidebar({
  sessions,
  projects,
  activeProject,
  gitStatus,
  gitWorktrees,
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
}: WorktreeSidebarProps) {
  const [filter, setFilter] = useState("");
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set());
  const [activeProjectMenuId, setActiveProjectMenuId] = useState<string | null>(null);
  const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);
  const [sidebarBody, setSidebarBody] = useState<"workspaces" | "agents">("workspaces");
  
  // Ref para ancoragem exata do botão SlidersHorizontal
  const optionsButtonRef = useRef<HTMLButtonElement | null>(null);

  const [displayOptions, setDisplayOptions] = useState<WorkspaceDisplayOptions>({
    groupBy: "repo",
    sortBy: "agent-activity",
    hideSleeping: false,
    hideDefaultBranch: false,
    hideAutomationCreated: false,
    hideCliCreated: false,
    hideDetachedHead: false,
  });
  // Drag and Drop state
  const [draggedSessionId, setDraggedSessionId] = useState<string | null>(null);
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
  const handleWorktreeDrop = (e: React.DragEvent, targetPath: string) => {
    e.preventDefault();
    e.stopPropagation();
    const sourcePath = draggedWorktreePath || e.dataTransfer.getData("application/x-hydra-worktree-path");
    if (sourcePath && sourcePath !== targetPath && onReorderWorktrees) {
      const fromIdx = gitWorktrees.findIndex((w) => w.path === sourcePath);
      const toIdx = gitWorktrees.findIndex((w) => w.path === targetPath);
      if (fromIdx !== -1 && toIdx !== -1) {
        const next = reorderList(gitWorktrees, fromIdx, toIdx, worktreeDropTarget?.position ?? "bottom");
        onReorderWorktrees(next);
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

  const toggleProjectCollapse = (projectId: string) => {
    setCollapsedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full bg-worktree-sidebar select-none relative font-sans text-worktree-sidebar-foreground">
      {/* 1. TOP NAV STRIP (Orca SidebarNav.tsx) */}
      <div className="px-3 pt-3 pb-2 space-y-1 border-b border-worktree-sidebar-border shrink-0 text-xs">
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-worktree-sidebar-foreground/60 hover:text-worktree-sidebar-foreground hover:bg-worktree-sidebar-accent/60 cursor-pointer transition">
          <GitCommit className="w-3.5 h-3.5 text-worktree-sidebar-foreground/50" />
          <span className="font-medium text-[11px]">Automations</span>
        </div>
        <div className="flex items-center justify-between px-2 py-1.5 rounded-lg text-worktree-sidebar-foreground/60 hover:text-worktree-sidebar-foreground hover:bg-worktree-sidebar-accent/60 cursor-pointer transition">
          <div className="flex items-center gap-2.5">
            <FolderGit2 className="w-3.5 h-3.5 text-worktree-sidebar-foreground/50" />
            <span className="font-medium text-[11px]">Agent Dashboard</span>
          </div>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
        </div>
      </div>

      {/* 2. SIDEBAR HEADER (Orca SidebarHeader.tsx with Bell toggle) */}
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

      {/* 4. MAIN CONTENT AREA - Conditional: Workspaces Tree OR Agents List */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-3">
        {sidebarBody === "workspaces" ? (
          <>
            {projects.length === 0 ? (
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
            ) : (
              projects.map((proj) => {
                const isActiveProject = proj.path === activeProject?.path;
                const isCollapsed = collapsedProjects.has(proj.id);
                const projectWorktrees = isActiveProject ? gitWorktrees : [];
                const projectSessions = sessions.filter(
                  (s) => s.project_path === proj.path 
                    || (!s.project_path && isActiveProject)
                    || projectWorktrees.some((wt) => wt.path === s.project_path)
                    || s.project_path.startsWith(proj.path)
                );
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
                      <div className="pl-3.5 ml-2 border-l border-worktree-sidebar-border space-y-1 pt-0.5">
                        {projectWorktrees.map((wt) => {
                          const isMain = wt.path === proj.path;
                          return (
                            <div
                              key={wt.path}
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
                                <span className="truncate text-[11px] font-medium text-neutral-200">
                                  {wt.branch || proj.name}
                                </span>
                                {isMain && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 shrink-0">
                                    default
                                  </span>
                                )}
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
                          );
                        })}

                        {/* Sessões e Frotas de Agentes deste Projeto */}
                        {projectSessions.length === 0 && projectWorktrees.length === 0 ? (
                          <div className="py-2 px-2 text-[11px] text-neutral-600 italic">
                            No active worktrees in this project.
                          </div>
                        ) : (
                          projectSessions.map((session) => (
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
                                <span className="text-neutral-400 text-[9px] bg-neutral-900 border border-neutral-800 px-1.5 py-0.2 rounded">
                                  {session.agentName}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </>
        ) : (
          <SidebarAgentsList
            sessions={sessions}
            projects={projects}
            onSelectSession={onSelectSession}
            onDeleteSession={onDeleteSession}
            compactCards={compactCards}
          />
        )}
      </div>

      {/* 5. Orca Workspace Options Menu Overlay com ancoragem precisa */}
      <WorkspaceOptionsMenu
        isOpen={optionsMenuOpen}
        triggerRef={optionsButtonRef}
        options={displayOptions}
        projects={projects}
        onClose={() => setOptionsMenuOpen(false)}
        onOptionsChange={setDisplayOptions}
      />

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
