import { useState, useRef, useEffect } from "react";
import { 
  GitBranch, 
  Plus, 
  Trash2, 
  FolderGit2, 
  ChevronDown, 
  Settings, 
  GitCommit, 
  FolderPlus,
  Check,
  Layers,
  Clock,
  CheckCircle2,
  ListTodo
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
  title: string;
  branch: string;
  state: "working" | "blocked" | "idle" | "unknown";
  workspace_status?: "todo" | "in-progress" | "in-review" | "completed";
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
  const [groupBy, setGroupBy] = useState<"status" | "all">("status");
  const [isAgentMenuOpen, setIsAgentMenuOpen] = useState(false);
  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false);
  
  const agentMenuRef = useRef<HTMLDivElement | null>(null);
  const projectMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (agentMenuRef.current && !agentMenuRef.current.contains(e.target as Node)) {
        setIsAgentMenuOpen(false);
      }
      if (projectMenuRef.current && !projectMenuRef.current.contains(e.target as Node)) {
        setIsProjectMenuOpen(false);
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredSessions = sessions.filter(
    (s) => s.title.toLowerCase().includes(filter.toLowerCase()) || s.branch.toLowerCase().includes(filter.toLowerCase())
  );

  const filteredGitWorktrees = gitWorktrees.filter(
    (wt) => wt.branch.toLowerCase().includes(filter.toLowerCase()) || wt.path.toLowerCase().includes(filter.toLowerCase())
  );

  // Status lanes canônicos do Orca (workspace-status-defaults.ts)
  const STATUS_LANES = [
    { id: "in-progress", label: "In progress", icon: Clock, color: "text-amber-400" },
    { id: "todo", label: "Todo", icon: ListTodo, color: "text-neutral-400" },
    { id: "completed", label: "Done", icon: CheckCircle2, color: "text-emerald-400" },
  ];

  return (
    <div className="flex flex-col h-full bg-[#0c0d0f] select-none relative font-sans">
      {/* 1. PROJECT / REPO PICKER (Orca SidebarHeader.tsx) */}
      <div className="h-10 border-b border-[#1f2024] px-3 flex items-center justify-between bg-[#101114] shrink-0">
        <div className="relative min-w-0 flex-1" ref={projectMenuRef}>
          <button
            onClick={() => setIsProjectMenuOpen(!isProjectMenuOpen)}
            className="flex items-center gap-2 max-w-full text-left hover:bg-neutral-800/50 px-1.5 py-1 -ml-1 rounded-md transition cursor-pointer"
          >
            <FolderGit2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="font-semibold text-neutral-200 text-xs truncate">
              {activeProject?.name ?? "hydra"}
            </span>
            <ChevronDown className="w-2.5 h-2.5 text-neutral-500 shrink-0" />
          </button>

          {/* Project Switcher Dropdown */}
          {isProjectMenuOpen && (
            <div className="absolute left-0 top-9 w-64 rounded-xl bg-[#141518] border border-[#28292e] p-2 shadow-2xl z-50 text-xs space-y-1">
              <div className="px-2 py-1 text-[10px] uppercase font-bold text-neutral-500 tracking-wider flex items-center justify-between">
                <span>Projects</span>
                <button
                  onClick={() => {
                    setIsProjectMenuOpen(false);
                    onOpenAddRepoDialog();
                  }}
                  className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition cursor-pointer font-medium"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add</span>
                </button>
              </div>

              <div className="max-h-56 overflow-y-auto space-y-0.5">
                {projects.map((proj) => {
                  const isSelected = proj.name === (activeProject?.name ?? "hydra");
                  return (
                    <button
                      key={proj.id}
                      onClick={() => {
                        setIsProjectMenuOpen(false);
                        onSelectProject(proj);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition cursor-pointer ${
                        isSelected ? "bg-neutral-800 text-white font-medium" : "hover:bg-neutral-800/50 text-neutral-300"
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="truncate text-[11px] font-medium">{proj.name}</div>
                        <div className="truncate text-[9px] text-neutral-500 font-mono">{proj.path}</div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[9px] px-1 py-0.2 rounded bg-neutral-900 border border-neutral-800 text-neutral-400 font-mono">
                          {proj.current_branch}
                        </span>
                        {isSelected && <Check className="w-3 h-3 text-emerald-400" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="pt-1.5 border-t border-neutral-800">
                <button
                  onClick={() => {
                    setIsProjectMenuOpen(false);
                    onOpenAddRepoDialog();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-neutral-800 text-emerald-400 text-[11px] font-medium transition cursor-pointer"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>Add Project...</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Current Branch Pill */}
        <span className="text-[10px] text-neutral-400 font-mono px-2 py-0.5 rounded-md bg-[#16171b] border border-[#222327] flex items-center gap-1 shrink-0">
          <GitBranch className="w-2.5 h-2.5 text-emerald-400" />
          <span>{gitStatus?.branch ?? "main"}</span>
        </span>
      </div>

      {/* 2. ORCA WORKSPACES SECTION HEADER (SidebarHeader.tsx) */}
      <div className="mt-1.5 flex h-7 min-w-0 items-center justify-between px-3">
        <div className="flex items-center gap-2">
          <span className="truncate select-none text-[10px] font-bold text-neutral-400 tracking-wider uppercase">
            Workspaces
          </span>
          <button
            onClick={() => setGroupBy((prev) => (prev === "status" ? "all" : "status"))}
            title="Toggle Group by Status"
            className="text-[9px] text-neutral-500 hover:text-neutral-300 font-mono transition cursor-pointer"
          >
            [{groupBy}]
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={onOpenAddRepoDialog}
            title="Add Project"
            className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>

          {/* New Workspace Trigger */}
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

      {/* 3. Filter Search Bar */}
      <div className="p-2 shrink-0">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter workspaces and agents..."
          className="w-full bg-[#121316] border border-[#202126] rounded-lg px-2.5 py-1 text-[11px] text-neutral-300 placeholder-neutral-500 focus:outline-none focus:border-emerald-500/50"
        />
      </div>

      {/* 4. Orca WorktreeList: Grouping by Lanes (build-rows.ts 100%) */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-3">
        {/* Attached Git Worktrees on Disk */}
        {filteredGitWorktrees.length > 0 && (
          <div className="space-y-1">
            <div className="px-1 text-[10px] uppercase font-bold text-neutral-500 tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3 h-3 text-emerald-400" />
                <span>Git Worktrees</span>
              </span>
              <span className="text-[9px] font-mono text-neutral-600">{filteredGitWorktrees.length}</span>
            </div>
            {filteredGitWorktrees.map((wt) => {
              const isMain = wt.path === activeProject?.path;
              return (
                <div
                  key={wt.path}
                  onClick={() => onSelectGitWorktree(wt)}
                  className="group relative p-2.5 rounded-lg cursor-pointer worktree-sidebar-card-hover text-neutral-300"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <GitBranch className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="font-medium truncate text-neutral-100 text-[11px]">
                        {wt.branch || "detached"}
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
                  <div className="text-[10px] text-neutral-500 font-mono truncate pl-5">
                    {wt.path.split("/").pop()} • {wt.head_commit.slice(0, 7)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Workspaces Grouped by Status Lanes (Orca Style) */}
        {groupBy === "status" ? (
          STATUS_LANES.map((lane) => {
            const laneSessions = filteredSessions.filter((s) => {
              const status = s.workspace_status || (s.state === "working" ? "in-progress" : s.state === "idle" ? "completed" : "todo");
              return status === lane.id;
            });

            if (laneSessions.length === 0) return null;

            const LaneIcon = lane.icon;

            return (
              <div key={lane.id} className="space-y-1">
                <div className="px-1 text-[10px] uppercase font-bold text-neutral-500 tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <LaneIcon className={`w-3 h-3 ${lane.color}`} />
                    <span>{lane.label}</span>
                  </span>
                  <span className="text-[9px] font-mono text-neutral-600">{laneSessions.length}</span>
                </div>

                <div className="space-y-1">
                  {laneSessions.map((session) => (
                    <div
                      key={session.id}
                      onClick={() => onSelectSession(session.id)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onSessionContextMenu?.(e, session);
                      }}
                      className={`group relative p-2.5 rounded-lg text-xs cursor-pointer select-none ${
                        session.active
                          ? "worktree-sidebar-card-active text-neutral-100"
                          : "worktree-sidebar-card-hover text-neutral-400 hover:text-neutral-200"
                      }`}
                    >
                      {session.active && (
                        <div className="absolute left-0 top-2 bottom-2 w-[2px] bg-emerald-500 rounded-r" />
                      )}

                      <div className="flex items-center justify-between mb-1 pl-1">
                        <div className="flex items-center gap-2 min-w-0">
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
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          /* Flat view */
          <div className="space-y-1">
            {filteredSessions.map((session) => (
              <div
                key={session.id}
                onClick={() => onSelectSession(session.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onSessionContextMenu?.(e, session);
                }}
                className={`group relative p-2.5 rounded-lg text-xs cursor-pointer select-none ${
                  session.active
                    ? "worktree-sidebar-card-active text-neutral-100"
                    : "worktree-sidebar-card-hover text-neutral-400 hover:text-neutral-200"
                }`}
              >
                {session.active && (
                  <div className="absolute left-0 top-2 bottom-2 w-[2px] bg-emerald-500 rounded-r" />
                )}

                <div className="flex items-center justify-between mb-1 pl-1">
                  <div className="flex items-center gap-2 min-w-0">
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
            ))}
          </div>
        )}
      </div>

      {/* 5. Orca Sidebar Footer */}
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
