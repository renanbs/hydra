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
  SlidersHorizontal,
  Sliders,
  Copy,
  FolderTree
} from "lucide-react";
import { WorkspaceOptionsMenu, type WorkspaceDisplayOptions } from "./WorkspaceOptionsMenu";

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
}: WorktreeSidebarProps) {
  const [filter, setFilter] = useState("");
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set());
  const [activeProjectMenuId, setActiveProjectMenuId] = useState<string | null>(null);
  const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);
  
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
    <div className="flex flex-col h-full bg-[#0e0f12] select-none relative font-sans text-neutral-300">
      {/* 1. TOP NAV STRIP (Orca SidebarNav.tsx) */}
      <div className="px-3 pt-3 pb-2 space-y-1 border-b border-[#1f2024] shrink-0 text-xs">
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40 cursor-pointer transition">
          <GitCommit className="w-3.5 h-3.5 text-neutral-500" />
          <span className="font-medium text-[11px]">Automations</span>
        </div>
        <div className="flex items-center justify-between px-2 py-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40 cursor-pointer transition">
          <div className="flex items-center gap-2.5">
            <FolderGit2 className="w-3.5 h-3.5 text-neutral-500" />
            <span className="font-medium text-[11px]">Agent Dashboard</span>
          </div>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
        </div>
      </div>

      {/* 2. PROJECTS HEADER (Orca SidebarHeader.tsx: 'Projects' + SlidersHorizontal + FolderPlus) */}
      <div className="mt-2.5 flex h-7 min-w-0 items-center justify-between px-3 shrink-0">
        <span className="select-none text-[11px] font-semibold text-neutral-400/90 tracking-wider">
          Projects
        </span>

        <div className="flex shrink-0 items-center gap-0.5">
          {/* Orca SidebarWorkspaceOptionsMenu Trigger com ref */}
          <button
            ref={optionsButtonRef}
            onClick={(e) => {
              e.stopPropagation();
              setOptionsMenuOpen(!optionsMenuOpen);
            }}
            title="Workspace display options"
            className={`p-1 rounded transition cursor-pointer ${
              optionsMenuOpen ? "bg-neutral-800 text-white" : "text-neutral-400 hover:text-white hover:bg-neutral-800/60"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onOpenAddRepoDialog}
            title="Add project (Folder / Clone)"
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800/60 transition cursor-pointer"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3. Filter Search Bar */}
      <div className="p-2 shrink-0">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter projects and workspaces..."
          className="w-full bg-[#121316] border border-[#202126] rounded-md px-2.5 py-1 text-[11px] text-neutral-300 placeholder-neutral-500 focus:outline-none focus:border-emerald-500/50"
        />
      </div>

      {/* 4. ORCA REPO TREE WITH WORKTREES */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-3">
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
            const projectSessions = sessions.filter(
              (s) => s.project_path === proj.path || (!s.project_path && isActiveProject)
            );
            const projectWorktrees = isActiveProject ? gitWorktrees : [];
            const isMenuOpen = activeProjectMenuId === proj.id;

            return (
              <div key={proj.id} className="space-y-1">
                {/* REPO HEADER ROW: [Icon + Project Name]  -----  [ChevronDown/Right] [...] [+] */}
                <div
                  onClick={() => onSelectProject(proj)}
                  className={`group relative flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer transition ${
                    isActiveProject
                      ? "bg-[#18191e] border border-neutral-700/60 text-white font-medium shadow-sm"
                      : "hover:bg-neutral-800/40 text-neutral-300"
                  }`}
                >
                  {/* Left: Project Icon + Display Name */}
                  <div className="flex items-center gap-2 min-w-0">
                    <FolderGit2 className={`w-3.5 h-3.5 shrink-0 ${isActiveProject ? "text-emerald-400" : "text-neutral-500"}`} />
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
                          className="absolute right-0 top-7 w-56 rounded-xl bg-[#141518] border border-[#28292e] p-1.5 shadow-2xl z-50 text-xs space-y-0.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => {
                              setActiveProjectMenuId(null);
                              onOpenSettings();
                            }}
                            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-neutral-800 text-neutral-200 text-left transition cursor-pointer"
                          >
                            <Sliders className="w-3.5 h-3.5 text-neutral-400" />
                            <span className="text-[11px]">Project Settings</span>
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

                          <div className="h-px bg-[#222327] my-1" />

                          <button
                            onClick={() => {
                              setActiveProjectMenuId(null);
                              onRemoveProject(proj);
                            }}
                            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-red-500/20 text-red-400 text-left transition cursor-pointer"
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
                  <div className="pl-3.5 ml-2 border-l border-[#202126] space-y-1 pt-0.5">
                    {/* Worktrees reais do Git no disco */}
                    {projectWorktrees.map((wt) => {
                      const isMain = wt.path === proj.path;
                      return (
                        <div
                          key={wt.path}
                          onClick={() => onSelectGitWorktree(wt)}
                          className="group relative p-2.5 rounded-lg cursor-pointer worktree-sidebar-card-hover text-neutral-300 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-2 h-2 rounded-full border border-neutral-500 shrink-0" />
                            <span className="truncate text-[11px] font-medium text-neutral-200">
                              {proj.name} workspace
                            </span>
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
                          onClick={() => onSelectSession(session.id)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onSessionContextMenu?.(e, session);
                          }}
                          className={`group relative p-2.5 rounded-lg text-xs cursor-pointer select-none ${
                            session.active && isActiveProject
                              ? "worktree-sidebar-card-active text-neutral-100"
                              : "worktree-sidebar-card-hover text-neutral-400 hover:text-neutral-200"
                          }`}
                        >
                          {session.active && isActiveProject && (
                            <div className="absolute left-0 top-2 bottom-2 w-[2px] bg-emerald-500 rounded-r" />
                          )}

                          <div className="flex items-center justify-between mb-1 pl-1">
                            <span className="font-medium truncate text-neutral-100 text-[11px]">
                              {session.title}
                            </span>
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

      {/* 6. Orca Sidebar Footer — version like Orca GeneralUpdateSettingsSection */}
      <div className="h-8 border-t border-[#1f2024] px-3 flex items-center justify-between text-[10px] text-neutral-500 font-mono bg-[#101114] shrink-0">
        <button
          onClick={onOpenSettings}
          title="Open Settings (Ctrl+,)"
          className="flex items-center gap-1.5 hover:text-neutral-300 transition cursor-pointer"
        >
          <Settings className="w-3 h-3 text-neutral-400 hover:text-emerald-400 transition" />
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
