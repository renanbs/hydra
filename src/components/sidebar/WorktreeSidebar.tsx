import { useState, useRef, useEffect } from "react";
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
  Folder
} from "lucide-react";

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
  availableAgents: AvailableAgent[];
  projects: HydraProject[];
  activeProject: HydraProject | null;
  gitStatus: GitRepoStatus | null;
  gitWorktrees: GitWorktreeInfo[];
  onSelectProject: (proj: HydraProject) => void;
  onSelectSession: (id: string) => void;
  onSelectGitWorktree: (wt: GitWorktreeInfo) => void;
  onDeleteGitWorktree: (wt: GitWorktreeInfo) => void;
  onNewSessionWithAgent: (agent: AvailableAgent) => void;
  onDeleteSession: (id: string) => void;
  onOpenSettings: () => void;
  onOpenAddRepoDialog: () => void;
  onOpenNewWorkspaceModal: () => void;
  onSessionContextMenu?: (e: React.MouseEvent, session: WorktreeSession) => void;
}

export function WorktreeSidebar({
  sessions,
  availableAgents,
  projects,
  activeProject,
  gitStatus,
  gitWorktrees,
  onSelectProject,
  onSelectSession,
  onSelectGitWorktree,
  onDeleteGitWorktree,
  onNewSessionWithAgent,
  onDeleteSession,
  onOpenSettings,
  onOpenAddRepoDialog,
  onOpenNewWorkspaceModal,
  onSessionContextMenu,
}: WorktreeSidebarProps) {
  const [filter, setFilter] = useState("");
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set());
  const [isAgentMenuOpen, setIsAgentMenuOpen] = useState(false);
  const agentMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (agentMenuRef.current && !agentMenuRef.current.contains(e.target as Node)) {
        setIsAgentMenuOpen(false);
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
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
    <div className="flex flex-col h-full bg-[#0c0d0f] select-none relative font-sans">
      {/* 1. TOP HEADER: PROJECTS & WORKSPACES ACTIONS (Orca SidebarHeader.tsx) */}
      <div className="h-10 border-b border-[#1f2024] px-3 flex items-center justify-between bg-[#101114] shrink-0">
        <span className="truncate select-none text-[11px] font-bold text-neutral-300 tracking-wider uppercase flex items-center gap-1.5">
          <FolderGit2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Projects & Workspaces</span>
        </span>

        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={onOpenAddRepoDialog}
            title="Add Project (Folder / Git / Clone)"
            className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>

          {/* New Workspace Trigger with Agent Fleet Menu */}
          <div className="relative" ref={agentMenuRef}>
            <button
              onClick={() => setIsAgentMenuOpen(!isAgentMenuOpen)}
              title="New Workspace (+)"
              className="flex items-center gap-0.5 p-1 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <ChevronDown className="w-2.5 h-2.5 text-neutral-500" />
            </button>

            {isAgentMenuOpen && (
              <div className="absolute right-0 top-7 w-52 rounded-xl bg-[#141518] border border-[#28292e] p-1.5 shadow-2xl z-50 text-xs space-y-1">
                <div className="px-2 py-1 text-[10px] uppercase font-bold text-neutral-500 tracking-wider">
                  New Workspace
                </div>
                
                <button
                  onClick={() => {
                    setIsAgentMenuOpen(false);
                    onOpenNewWorkspaceModal();
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-neutral-800 text-emerald-400 text-left transition cursor-pointer font-medium"
                >
                  <GitBranch className="w-3.5 h-3.5" />
                  <span>Custom Worktree Branch...</span>
                </button>

                <div className="h-px bg-[#222327] my-1" />

                <div className="px-2 py-0.5 text-[9px] uppercase font-bold text-neutral-500 tracking-wider">
                  Spawn with Agent
                </div>
                {availableAgents.map((agent) => (
                  <button
                    key={agent.id}
                    disabled={!agent.is_installed}
                    onClick={() => {
                      setIsAgentMenuOpen(false);
                      onNewSessionWithAgent(agent);
                    }}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition ${
                      agent.is_installed
                        ? "hover:bg-neutral-800 text-neutral-200 cursor-pointer"
                        : "opacity-40 cursor-not-allowed text-neutral-500"
                    }`}
                  >
                    <span className="truncate">{agent.name}</span>
                    {agent.is_installed ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    ) : (
                      <span className="text-[9px] text-neutral-600 font-mono">missing</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Filter Search Bar */}
      <div className="p-2 shrink-0">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter projects and workspaces..."
          className="w-full bg-[#121316] border border-[#202126] rounded-lg px-2.5 py-1 text-[11px] text-neutral-300 placeholder-neutral-500 focus:outline-none focus:border-emerald-500/50"
        />
      </div>

      {/* 3. ORCA REPO TREE WITH NESTED WORKTREES (build-rows.ts + SectionHeader.tsx 100%) */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-3">
        {projects.length === 0 ? (
          <div className="p-6 text-center text-neutral-500 text-xs space-y-2">
            <p>No projects added.</p>
            <button
              onClick={onOpenAddRepoDialog}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[11px] font-medium transition cursor-pointer"
            >
              <FolderPlus className="w-3 h-3 text-emerald-400" />
              <span>Add Existing Project</span>
            </button>
          </div>
        ) : (
          projects.map((proj) => {
            const isActiveProject = proj.path === activeProject?.path;
            const isCollapsed = collapsedProjects.has(proj.id);
            const projectSessions = sessions.filter(
              (s) => s.project_path === proj.path || (!s.project_path && isActiveProject)
            );
            const projectWorktrees = isActiveProject ? gitWorktrees : [];

            return (
              <div key={proj.id} className="space-y-1">
                {/* A. PROJETO COMO SEÇÃO EXPANSÍVEL (SectionHeader.tsx de Repo) */}
                <div
                  onClick={() => onSelectProject(proj)}
                  className={`group flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer transition ${
                    isActiveProject
                      ? "bg-[#18191e] border border-neutral-700/60 text-white font-medium shadow-sm"
                      : "hover:bg-neutral-800/40 text-neutral-300"
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleProjectCollapse(proj.id);
                      }}
                      className="p-0.5 hover:text-white text-neutral-400 transition"
                    >
                      {isCollapsed ? (
                        <ChevronRight className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </button>
                    <Folder className={`w-3.5 h-3.5 shrink-0 ${isActiveProject ? "text-emerald-400" : "text-neutral-500"}`} />
                    <span className="truncate text-[12px]">{proj.name}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 font-mono text-[9px]">
                    <span className="px-1.5 py-0.2 rounded bg-neutral-900 border border-neutral-800 text-neutral-400 flex items-center gap-0.5">
                      <GitBranch className="w-2 h-2 text-emerald-400" />
                      <span>{proj.current_branch}</span>
                    </span>
                    {isActiveProject && gitStatus && gitStatus.modified_files > 0 && (
                      <span className="px-1 py-0.2 rounded bg-amber-500/20 text-amber-400">
                        +{gitStatus.modified_files}
                      </span>
                    )}
                  </div>
                </div>

                {/* B. WORKTREES E SESSÕES FILHAS DENTRO DESTE PROJETO (Orca Tree View) */}
                {!isCollapsed && (
                  <div className="pl-3.5 ml-2 border-l border-[#222327] space-y-1 pt-0.5">
                    {/* Worktrees reais no disco */}
                    {projectWorktrees.map((wt) => {
                      const isMain = wt.path === proj.path;
                      return (
                        <div
                          key={wt.path}
                          onClick={() => onSelectGitWorktree(wt)}
                          className="group relative p-2 rounded-lg cursor-pointer worktree-sidebar-card-hover text-neutral-300 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <GitBranch className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span className="truncate text-[11px] font-medium text-neutral-200">
                              {wt.branch || "detached"}
                            </span>
                            <span className="text-[9px] text-neutral-600 font-mono">wt</span>
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
                      <div className="py-2 px-1 text-[11px] text-neutral-600 italic">
                        No active worktrees in this project.
                      </div>
                    ) : (
                      projectSessions.map((session) => (
                        <div
                          key={session.id}
                          onClick={() => onSelectSession(session.id)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onSessionContextMenu?.(e, session);
                          }}
                          className={`group relative p-2 rounded-lg text-xs cursor-pointer select-none ${
                            session.active && isActiveProject
                              ? "worktree-sidebar-card-active text-neutral-100"
                              : "worktree-sidebar-card-hover text-neutral-400 hover:text-neutral-200"
                          }`}
                        >
                          {session.active && isActiveProject && (
                            <div className="absolute left-0 top-1.5 bottom-1.5 w-[2px] bg-emerald-500 rounded-r" />
                          )}

                          <div className="flex items-center justify-between mb-0.5 pl-1">
                            <span className="font-medium truncate text-neutral-100 text-[11px]">
                              {session.title}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
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
      </div>

      {/* 4. Orca Sidebar Footer */}
      <div className="h-8 border-t border-[#1f2024] px-3 flex items-center justify-between text-[10px] text-neutral-500 font-mono bg-[#101114] shrink-0">
        <button
          onClick={onOpenSettings}
          title="Open Settings (Ctrl+,)"
          className="flex items-center gap-1.5 hover:text-neutral-300 transition cursor-pointer"
        >
          <Settings className="w-3 h-3 text-neutral-400 hover:text-emerald-400 transition" />
          <span>Settings</span>
        </button>
        {gitStatus?.head_commit && (
          <span className="flex items-center gap-1 text-neutral-400">
            <GitCommit className="w-2.5 h-2.5 text-neutral-500" />
            <span>{gitStatus.head_commit}</span>
          </span>
        )}
      </div>
    </div>
  );
}
