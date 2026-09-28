import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { invoke } from "@tauri-apps/api/core";
import { 
  Search, 
  Terminal, 
  Sparkles, 
  File, 
  FilePlus, 
  FileText,
  History,
  Play
} from "lucide-react";
import type { TabItem, DetectedAgent } from "./WorkbenchTabBar";

interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  is_hidden: boolean;
}

interface DirectoryListing {
  path: string;
  entries: FileEntry[];
}

export interface TabBarCreateEntryProps {
  isOpen: boolean;
  anchorPos: { top: number; left: number } | null;
  onClose: () => void;
  worktreePath?: string;
  detectedAgents?: DetectedAgent[];
  recentlyClosedTabs?: TabItem[];
  onNewTerminalTab?: (shell?: string) => void;
  onNewFileTab?: () => void;
  onOpenFileTab?: () => void;
  onOpenFile?: (path: string) => void;
  onLaunchAgent?: (agent: DetectedAgent) => void;
  onRestoreClosedTab?: (tab: TabItem) => void;
  onRunQuickCommand?: (command: string) => void;
}

interface CreateOption {
  id: string;
  title: string;
  subtitle?: string;
  category: "agent" | "shell" | "command" | "file" | "history";
  icon: React.ReactNode;
  badge?: string;
  action: () => void;
}

const DEFAULT_QUICK_COMMANDS = [
  "git status",
  "git diff",
  "cargo check",
  "cargo test",
  "pnpm test",
  "pnpm build",
];

export function TabBarCreateEntry({
  isOpen,
  anchorPos,
  onClose,
  worktreePath,
  detectedAgents = [],
  recentlyClosedTabs = [],
  onNewTerminalTab,
  onNewFileTab,
  onOpenFileTab,
  onOpenFile,
  onLaunchAgent,
  onRestoreClosedTab,
  onRunQuickCommand,
}: TabBarCreateEntryProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [workspaceFiles, setWorkspaceFiles] = useState<FileEntry[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [isOpen]);

  // Load files for active worktree/project if query is present
  useEffect(() => {
    if (!isOpen || !worktreePath) return;
    invoke<DirectoryListing>("list_directory_cmd", { path: worktreePath })
      .then((listing) => {
        if (listing?.entries) {
          setWorkspaceFiles(listing.entries.filter((e) => !e.is_hidden));
        }
      })
      .catch(() => setWorkspaceFiles([]));
  }, [isOpen, worktreePath]);

  // Handle outside clicks and Esc key
  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (containerRef.current?.contains(target)) return;
      onClose();
    };

    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleOutsideClick);
    }, 10);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen, onClose]);

  // Compile all options
  const allOptions = useMemo(() => {
    const list: CreateOption[] = [];

    // 1. Installed AI Agents
    for (const agent of detectedAgents) {
      if (agent.is_installed) {
        list.push({
          id: `agent-${agent.id}`,
          title: `Launch ${agent.name}`,
          subtitle: agent.executable,
          category: "agent",
          badge: "agent",
          icon: <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />,
          action: () => {
            onLaunchAgent?.(agent);
            onClose();
          },
        });
      }
    }

    // 2. Terminals & Shells
    list.push({
      id: "shell-default",
      title: "New Terminal",
      subtitle: "Default shell",
      category: "shell",
      badge: "terminal",
      icon: <Terminal className="w-3.5 h-3.5 text-emerald-400 shrink-0" />,
      action: () => {
        onNewTerminalTab?.();
        onClose();
      },
    });

    for (const sh of ["bash", "zsh", "fish"]) {
      list.push({
        id: `shell-${sh}`,
        title: `New ${sh} Terminal`,
        subtitle: `/bin/${sh}`,
        category: "shell",
        badge: "shell",
        icon: <Terminal className="w-3.5 h-3.5 text-emerald-400 shrink-0" />,
        action: () => {
          onNewTerminalTab?.(sh);
          onClose();
        },
      });
    }

    // 3. File actions & Workspace Files
    list.push({
      id: "file-blank",
      title: "New Blank File Tab",
      subtitle: "Open empty editor tab",
      category: "file",
      icon: <FilePlus className="w-3.5 h-3.5 text-blue-400 shrink-0" />,
      action: () => {
        onNewFileTab?.();
        onClose();
      },
    });

    list.push({
      id: "file-open",
      title: "Open File from Workspace...",
      subtitle: "Browse files via dialog",
      category: "file",
      icon: <FileText className="w-3.5 h-3.5 text-blue-400 shrink-0" />,
      action: () => {
        onOpenFileTab?.();
        onClose();
      },
    });

    for (const file of workspaceFiles) {
      if (!file.is_dir) {
        list.push({
          id: `ws-file-${file.path}`,
          title: file.name,
          subtitle: file.path,
          category: "file",
          badge: "file",
          icon: <File className="w-3.5 h-3.5 text-cyan-400 shrink-0" />,
          action: () => {
            onOpenFile?.(file.path);
            onClose();
          },
        });
      }
    }

    // 4. Quick Commands
    for (const cmd of DEFAULT_QUICK_COMMANDS) {
      list.push({
        id: `cmd-${cmd}`,
        title: `Run: ${cmd}`,
        subtitle: "Execute command in terminal",
        category: "command",
        badge: "command",
        icon: <Play className="w-3.5 h-3.5 text-amber-400 shrink-0" />,
        action: () => {
          onRunQuickCommand?.(cmd);
          onClose();
        },
      });
    }

    // 5. Recently Closed Tabs
    for (const closedTab of recentlyClosedTabs) {
      list.push({
        id: `recent-${closedTab.id}`,
        title: `Reopen: ${closedTab.title}`,
        subtitle: closedTab.cwd || closedTab.type,
        category: "history",
        badge: "restore",
        icon: <History className="w-3.5 h-3.5 text-neutral-400 shrink-0" />,
        action: () => {
          onRestoreClosedTab?.(closedTab);
          onClose();
        },
      });
    }

    return list;
  }, [
    detectedAgents,
    workspaceFiles,
    recentlyClosedTabs,
    onLaunchAgent,
    onNewTerminalTab,
    onNewFileTab,
    onOpenFileTab,
    onOpenFile,
    onRunQuickCommand,
    onRestoreClosedTab,
    onClose,
  ]);

  // Filter options based on query
  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allOptions;
    return allOptions.filter((opt) => {
      const matchTitle = opt.title.toLowerCase().includes(q);
      const matchSub = opt.subtitle?.toLowerCase().includes(q) ?? false;
      const matchCat = opt.category.toLowerCase().includes(q);
      return matchTitle || matchSub || matchCat;
    });
  }, [allOptions, query]);

  // Keep selected index within bounds
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const current = filteredOptions[selectedIndex];
      if (current) {
        current.action();
      }
    }
  };

  if (!isOpen || !anchorPos) return null;

  return createPortal(
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        top: `${anchorPos.top}px`,
        left: `${anchorPos.left}px`,
        zIndex: 9999,
      }}
      className="w-72 max-w-[90vw] rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl backdrop-blur-xl p-1.5 text-xs animate-in fade-in duration-100 select-none overflow-hidden"
    >
      {/* Omnibox input */}
      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border/70 bg-card mb-1">
        <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search files, agents, shells, commands..."
          className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none font-sans"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="text-[10px] text-muted-foreground hover:text-foreground font-mono"
          >
            ✕
          </button>
        )}
      </div>

      {/* Options list */}
      <div className="max-h-72 overflow-y-auto space-y-0.5 scrollbar-thin scrollbar-thumb-neutral-700 py-0.5">
        {filteredOptions.length === 0 ? (
          <div className="p-3 text-center text-muted-foreground text-[11px] font-mono">
            No matching entries found.
          </div>
        ) : (
          filteredOptions.map((opt, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <div
                key={opt.id}
                onClick={opt.action}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`group flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-left transition cursor-pointer ${
                  isSelected
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-popover-foreground hover:bg-accent/60"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {opt.icon}
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] truncate leading-tight">
                      {opt.title}
                    </span>
                    {opt.subtitle && (
                      <span className="text-[10px] text-muted-foreground font-mono truncate leading-tight">
                        {opt.subtitle}
                      </span>
                    )}
                  </div>
                </div>

                {opt.badge && (
                  <span className="text-[9px] uppercase tracking-wider font-mono px-1 py-0.2 rounded bg-accent/80 text-muted-foreground border border-border/50 shrink-0">
                    {opt.badge}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer hint */}
      <div className="flex items-center justify-between border-t border-border/50 px-2 pt-1.5 mt-1 text-[10px] text-muted-foreground font-mono">
        <div className="flex items-center gap-2">
          <span>↑↓ to navigate</span>
          <span>↵ to select</span>
        </div>
        <span>Omnibox</span>
      </div>
    </div>,
    document.body
  );
}
