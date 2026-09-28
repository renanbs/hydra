import { useEffect, useState, useMemo } from "react";
import { Command } from "cmdk";
import { 
  GitBranch, 
  Terminal, 
  FolderGit2, 
  Search, 
  Sparkles, 
  Plus, 
  Settings,
  Folder
} from "lucide-react";
import type { HydraProject, GitWorktreeInfo } from "./sidebar/types";
import type { WorktreeSession } from "./sidebar/WorktreeSidebar";

export interface WorktreeJumpPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  projects: HydraProject[];
  activeProject: HydraProject | null;
  worktreesByProject: Record<string, GitWorktreeInfo[]>;
  sessions: WorktreeSession[];
  onSelectProject: (proj: HydraProject) => void;
  onSelectWorktree: (wt: GitWorktreeInfo, proj?: HydraProject) => void;
  onSelectSession: (session: WorktreeSession) => void;
  onNewWorkspace?: () => void;
  onNewTerminal?: () => void;
  onOpenSettings?: () => void;
}

export function WorktreeJumpPalette({
  isOpen,
  onClose,
  projects,
  activeProject,
  worktreesByProject,
  sessions,
  onSelectProject,
  onSelectWorktree,
  onSelectSession,
  onNewWorkspace,
  onNewTerminal,
  onOpenSettings,
}: WorktreeJumpPaletteProps) {
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setSearch("");
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Aggregate worktrees with project context
  const allWorktreeEntries = useMemo(() => {
    const entries: Array<{
      worktree: GitWorktreeInfo;
      project: HydraProject;
      displayName: string;
      branchName: string;
      agentSession?: WorktreeSession;
      isCurrent: boolean;
    }> = [];

    for (const project of projects) {
      const list = worktreesByProject[project.path] || [];
      for (const wt of list) {
        const branchName = wt.branch || "detached";
        const displayName = wt.display_name || branchName;
        const agentSession = sessions.find((s) => s.project_path === wt.path);
        const isCurrent = activeProject?.path === project.path && (agentSession?.active || false);

        entries.push({
          worktree: wt,
          project,
          displayName,
          branchName,
          agentSession,
          isCurrent,
        });
      }
    }
    return entries;
  }, [projects, worktreesByProject, sessions, activeProject]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[99998] flex items-start justify-center pt-[min(12vh,5rem)] bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-[680px] max-w-[94vw] max-h-[min(85vh,640px)] flex flex-col rounded-xl border border-neutral-700/60 bg-neutral-900/95 shadow-[0_26px_84px_rgba(0,0,0,0.5)] backdrop-blur-xl text-neutral-200 overflow-hidden"
      >
        <Command label="Worktree Jump Palette" className="flex flex-col h-full w-full">
          {/* Header search input */}
          <div className="flex items-center gap-3 px-4 border-b border-neutral-800 bg-neutral-900/60">
            <Search className="w-4 h-4 text-neutral-400 shrink-0" />
            <Command.Input
              autoFocus
              value={search}
              onValueChange={setSearch}
              placeholder="Jump to worktree, branch, fleet session, or project... (Ctrl+J)"
              className="w-full h-12 bg-transparent text-xs text-neutral-100 placeholder:text-neutral-500 focus:outline-none font-sans"
            />
            {search && (
              <button 
                onClick={() => setSearch("")}
                className="text-[10px] text-neutral-500 hover:text-neutral-300 font-mono px-1.5 py-0.5 rounded bg-neutral-800"
              >
                Clear
              </button>
            )}
          </div>

          {/* List of matching targets */}
          <Command.List className="flex-1 max-h-[460px] overflow-y-auto p-2 space-y-1 focus:outline-none scrollbar-thin scrollbar-thumb-neutral-700">
            <Command.Empty className="py-8 text-center text-neutral-500 text-xs">
              No matching worktrees, sessions, or projects found.
            </Command.Empty>

            {/* Worktrees & Branches */}
            {allWorktreeEntries.length > 0 && (
              <Command.Group 
                heading="Worktrees & Git Branches" 
                className="text-[10px] uppercase font-semibold text-neutral-400 px-2 py-1 tracking-wider"
              >
                {allWorktreeEntries.map((entry) => {
                  const key = `wt-${entry.project.id}-${entry.worktree.path}`;
                  const state = entry.agentSession?.state;
                  return (
                    <Command.Item
                      key={key}
                      value={`${entry.displayName} ${entry.branchName} ${entry.project.name} ${entry.worktree.path}`}
                      onSelect={() => {
                        onSelectWorktree(entry.worktree, entry.project);
                        onClose();
                      }}
                      className="group flex items-center justify-between px-2.5 py-2 rounded-lg text-neutral-300 hover:bg-neutral-800/80 data-[selected=true]:bg-neutral-800 data-[selected=true]:text-white cursor-pointer transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <GitBranch className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[12px] font-medium text-neutral-200 group-hover:text-white truncate">
                              {entry.displayName}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400 border border-neutral-700/50 shrink-0">
                              {entry.project.name}
                            </span>
                            {entry.displayName !== entry.branchName && (
                              <span className="text-[10px] text-neutral-500 font-mono truncate">
                                ({entry.branchName})
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-neutral-500 font-mono truncate max-w-[420px]">
                            {entry.worktree.path}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {state && (
                          <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium border bg-neutral-800/50 border-neutral-700">
                            <span 
                              className={`w-1.5 h-1.5 rounded-full ${
                                state === "working" 
                                  ? "bg-emerald-400 animate-pulse" 
                                  : state === "blocked" 
                                  ? "bg-amber-400" 
                                  : "bg-neutral-400"
                              }`} 
                            />
                            <span className="capitalize text-neutral-300">{state}</span>
                          </div>
                        )}
                        {entry.isCurrent && (
                          <span className="text-[9px] uppercase tracking-wider font-semibold text-blue-400 bg-blue-950/60 border border-blue-800/60 px-1.5 py-0.5 rounded">
                            active
                          </span>
                        )}
                      </div>
                    </Command.Item>
                  );
                })}
              </Command.Group>
            )}

            {/* Fleet Sessions */}
            {sessions.length > 0 && (
              <Command.Group 
                heading="Fleet Sessions & Terminals" 
                className="text-[10px] uppercase font-semibold text-neutral-400 px-2 py-1 tracking-wider mt-2"
              >
                {sessions.map((sess) => {
                  const state = sess.state;
                  return (
                    <Command.Item
                      key={`sess-${sess.id}`}
                      value={`${sess.title} ${sess.agentName || ""} ${sess.project_path}`}
                      onSelect={() => {
                        onSelectSession(sess);
                        onClose();
                      }}
                      className="group flex items-center justify-between px-2.5 py-2 rounded-lg text-neutral-300 hover:bg-neutral-800/80 data-[selected=true]:bg-neutral-800 data-[selected=true]:text-white cursor-pointer transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {sess.agentName ? (
                          <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        ) : (
                          <Terminal className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        )}
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] font-medium text-neutral-200 group-hover:text-white truncate">
                              {sess.title}
                            </span>
                            {sess.agentName && (
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-950/40 border border-purple-800/50 text-purple-300">
                                {sess.agentName}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-neutral-500 font-mono truncate max-w-[420px]">
                            {sess.project_path}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {state && (
                          <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium border bg-neutral-800/50 border-neutral-700">
                            <span 
                              className={`w-1.5 h-1.5 rounded-full ${
                                state === "working" 
                                  ? "bg-emerald-400 animate-pulse" 
                                  : state === "blocked" 
                                  ? "bg-amber-400" 
                                  : "bg-neutral-400"
                              }`} 
                            />
                            <span className="capitalize text-neutral-300">{state}</span>
                          </div>
                        )}
                        {sess.active && (
                          <span className="text-[9px] uppercase tracking-wider font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.5 rounded">
                            current
                          </span>
                        )}
                      </div>
                    </Command.Item>
                  );
                })}
              </Command.Group>
            )}

            {/* Projects */}
            {projects.length > 0 && (
              <Command.Group 
                heading="Projects" 
                className="text-[10px] uppercase font-semibold text-neutral-400 px-2 py-1 tracking-wider mt-2"
              >
                {projects.map((proj) => {
                  const isCurrent = activeProject?.id === proj.id;
                  return (
                    <Command.Item
                      key={`proj-${proj.id}`}
                      value={`${proj.name} ${proj.current_branch} ${proj.path}`}
                      onSelect={() => {
                        onSelectProject(proj);
                        onClose();
                      }}
                      className="group flex items-center justify-between px-2.5 py-2 rounded-lg text-neutral-300 hover:bg-neutral-800/80 data-[selected=true]:bg-neutral-800 data-[selected=true]:text-white cursor-pointer transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {proj.is_git ? (
                          <FolderGit2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        ) : (
                          <Folder className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        )}
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] font-medium text-neutral-200 group-hover:text-white truncate">
                              {proj.name}
                            </span>
                            {proj.current_branch && (
                              <span className="text-[10px] text-neutral-500 font-mono">
                                ({proj.current_branch})
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-neutral-500 font-mono truncate max-w-[420px]">
                            {proj.path}
                          </span>
                        </div>
                      </div>

                      {isCurrent && (
                        <span className="text-[9px] uppercase tracking-wider font-semibold text-blue-400 bg-blue-950/60 border border-blue-800/60 px-1.5 py-0.5 rounded">
                          active project
                        </span>
                      )}
                    </Command.Item>
                  );
                })}
              </Command.Group>
            )}

            {/* Actions */}
            <Command.Group 
              heading="Actions" 
              className="text-[10px] uppercase font-semibold text-neutral-400 px-2 py-1 tracking-wider mt-2"
            >
              {onNewWorkspace && (
                <Command.Item
                  value="New Workspace Worktree Branch"
                  onSelect={() => {
                    onNewWorkspace();
                    onClose();
                  }}
                  className="flex items-center justify-between px-2.5 py-2 rounded-lg text-neutral-300 hover:bg-neutral-800/80 data-[selected=true]:bg-neutral-800 data-[selected=true]:text-white cursor-pointer transition"
                >
                  <div className="flex items-center gap-2.5">
                    <Plus className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-[12px]">Create New Worktree Workspace</span>
                  </div>
                  <span className="text-[10px] text-neutral-500 font-mono">Ctrl+N</span>
                </Command.Item>
              )}
              {onNewTerminal && (
                <Command.Item
                  value="New Terminal Session Tab"
                  onSelect={() => {
                    onNewTerminal();
                    onClose();
                  }}
                  className="flex items-center justify-between px-2.5 py-2 rounded-lg text-neutral-300 hover:bg-neutral-800/80 data-[selected=true]:bg-neutral-800 data-[selected=true]:text-white cursor-pointer transition"
                >
                  <div className="flex items-center gap-2.5">
                    <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[12px]">Spawn Terminal Session</span>
                  </div>
                  <span className="text-[10px] text-neutral-500 font-mono">Ctrl+T</span>
                </Command.Item>
              )}
              {onOpenSettings && (
                <Command.Item
                  value="Preferences Settings Configuration"
                  onSelect={() => {
                    onOpenSettings();
                    onClose();
                  }}
                  className="flex items-center justify-between px-2.5 py-2 rounded-lg text-neutral-300 hover:bg-neutral-800/80 data-[selected=true]:bg-neutral-800 data-[selected=true]:text-white cursor-pointer transition"
                >
                  <div className="flex items-center gap-2.5">
                    <Settings className="w-3.5 h-3.5 text-neutral-400" />
                    <span className="text-[12px]">Open Preferences & Settings</span>
                  </div>
                  <span className="text-[10px] text-neutral-500 font-mono">Ctrl+,</span>
                </Command.Item>
              )}
            </Command.Group>
          </Command.List>

          {/* Footer with keyboard navigation cues */}
          <div className="flex items-center justify-between border-t border-neutral-800 px-3.5 py-2 text-[11px] text-neutral-400 bg-neutral-900/90">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 font-mono text-[10px]">
                <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-300">↑</kbd>
                <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-300">↓</kbd>
                <span className="text-neutral-500 ml-0.5">navigate</span>
              </span>
              <span className="flex items-center gap-1 font-mono text-[10px]">
                <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-300">↵</kbd>
                <span className="text-neutral-500 ml-0.5">select</span>
              </span>
              <span className="flex items-center gap-1 font-mono text-[10px]">
                <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-300">esc</kbd>
                <span className="text-neutral-500 ml-0.5">close</span>
              </span>
            </div>
            <span className="text-[10px] font-mono text-neutral-500">
              Worktree Jump Palette
            </span>
          </div>
        </Command>
      </div>
    </div>
  );
}
