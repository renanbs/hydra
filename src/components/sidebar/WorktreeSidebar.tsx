import { useState, useRef, useEffect } from "react";
import { 
  GitBranch, 
  Plus, 
  Trash2, 
  FolderGit2,
  ChevronDown,
  Settings,
  GitCommit
} from "lucide-react";

export interface AvailableAgent {
  id: string;
  name: string;
  executable: string;
  is_installed: boolean;
}

export interface WorktreeSession {
  id: string;
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
  gitStatus: GitRepoStatus | null;
  onSelectSession: (id: string) => void;
  onNewSessionWithAgent: (agent: AvailableAgent) => void;
  onDeleteSession: (id: string) => void;
  onOpenSettings: () => void;
}

export function WorktreeSidebar({
  sessions,
  availableAgents,
  gitStatus,
  onSelectSession,
  onNewSessionWithAgent,
  onDeleteSession,
  onOpenSettings,
}: WorktreeSidebarProps) {
  const [filter, setFilter] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = sessions.filter(
    (s) => s.title.toLowerCase().includes(filter.toLowerCase()) || s.branch.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-[#0e0f11] select-none relative">
      {/* Repository / Project Header (Orca Style) */}
      <div className="h-9 border-b border-[#222] px-3 flex items-center justify-between bg-[#111214] shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FolderGit2 className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
          <span className="font-semibold text-neutral-200 text-xs truncate">hydra</span>
          <span className="text-[10px] text-neutral-400 font-mono px-1.5 py-0.5 rounded bg-neutral-800 flex items-center gap-1 shrink-0">
            <GitBranch className="w-2.5 h-2.5 text-emerald-400" />
            <span>{gitStatus?.branch ?? "main"}</span>
          </span>
          {gitStatus && gitStatus.modified_files > 0 && (
            <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-400 font-mono shrink-0">
              +{gitStatus.modified_files}
            </span>
          )}
        </div>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            title="Launch Agent Fleet (+)"
            className="flex items-center gap-0.5 p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition shrink-0"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <ChevronDown className="w-2.5 h-2.5 text-neutral-500" />
          </button>

          {/* Detected Agents Dropdown */}
          {isMenuOpen && (
            <div className="absolute right-0 top-7 w-48 rounded-lg bg-[#141518] border border-[#26272b] p-1.5 shadow-2xl z-50 text-xs space-y-0.5">
              <div className="px-2 py-1 text-[10px] uppercase font-bold text-neutral-500 tracking-wider">
                Detected Agents
              </div>
              {availableAgents.map((agent) => (
                <button
                  key={agent.id}
                  disabled={!agent.is_installed}
                  onClick={() => {
                    setIsMenuOpen(false);
                    onNewSessionWithAgent(agent);
                  }}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-left transition ${
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

      {/* Filter / Search Worktrees */}
      <div className="p-2 border-b border-[#222] bg-[#0e0f11] shrink-0">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter agents and branches..."
          className="w-full bg-[#141518] border border-[#222] rounded px-2 py-1 text-[11px] text-neutral-300 placeholder-neutral-600 focus:outline-none focus:border-emerald-500/50"
        />
      </div>

      {/* Agent Fleet / Worktrees List */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
        {filtered.length === 0 ? (
          <div className="p-4 text-center text-neutral-500 text-xs">
            No active sessions found.
          </div>
        ) : (
          filtered.map((session) => (
            <div
              key={session.id}
              onClick={() => onSelectSession(session.id)}
              className={`group relative p-2 rounded text-xs cursor-pointer border transition-all ${
                session.active
                  ? "bg-[#141518] border-neutral-700/80 text-neutral-100 shadow-sm"
                  : "bg-transparent border-transparent text-neutral-400 hover:bg-neutral-900 hover:text-neutral-300"
              }`}
            >
              {session.active && (
                <div className="absolute left-0 top-1.5 bottom-1.5 w-[2px] bg-emerald-500 rounded-r" />
              )}

              <div className="flex items-center justify-between mb-1 pl-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-medium truncate text-neutral-200 text-[11px]">
                    {session.title}
                  </span>
                </div>
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
                  <GitBranch className="w-2.5 h-2.5" />
                  {session.branch}
                </span>
                <span className="text-neutral-400 text-[9px] bg-neutral-800/80 px-1 py-0.2 rounded">
                  {session.agentName}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Sidebar Footer with Git Commit + Settings */}
      <div className="h-8 border-t border-[#222] px-3 flex items-center justify-between text-[10px] text-neutral-500 font-mono bg-[#111214] shrink-0">
        <button
          onClick={onOpenSettings}
          title="Open Settings (Ctrl+,)"
          className="flex items-center gap-1 hover:text-neutral-300 transition cursor-pointer"
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
