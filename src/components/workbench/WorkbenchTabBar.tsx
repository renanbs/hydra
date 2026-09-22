import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  Terminal, 
  Plus, 
  X, 
  File, 
  GitCompare,
  FilePlus, 
  FileText
} from "lucide-react";
import { AgentBrandIcon } from "../AgentIcon";

export interface SplitPane {
  sessionId: string;
  executable?: string;
  cwd?: string;
}

export interface SplitLayout {
  direction: "horizontal" | "vertical";
  panes: SplitPane[];
}

export interface TabItem {
  id: string;
  title: string;
  type: "terminal" | "diff" | "editor";
  sessionId?: string;
  executable?: string;
  cwd?: string;
  /** Sprint 2 P0: split terminals within a single tab */
  splitSessionIds?: string[];
  splitDirection?: "horizontal" | "vertical";
  splitPanes?: SplitPane[];
  splitLayout?: SplitLayout;
}

export interface DetectedAgent {
  id: string;
  name: string;
  executable: string;
  is_installed: boolean;
}
interface WorkbenchTabBarProps {
  tabs: TabItem[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onNewTab?: () => void;
  onNewTerminalTab?: (shell?: string) => void;
  onNewFileTab?: () => void;
  onOpenFileTab?: () => void;
  onLaunchAgent?: (agent: DetectedAgent) => void;
  detectedAgents?: DetectedAgent[];
  onRenameTab: (id: string, newTitle: string) => void;
  onTabContextMenu?: (e: React.MouseEvent, tab: TabItem) => void;
  onTabBarContextMenu?: (e: React.MouseEvent) => void;
}

export function WorkbenchTabBar({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewTab,
  onNewTerminalTab,
  onNewFileTab,
  onOpenFileTab,
  onLaunchAgent,
  detectedAgents,
  onRenameTab,
  onTabContextMenu,
  onTabBarContextMenu,
}: WorkbenchTabBarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const handleToggleMenu = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (isMenuOpen) {
      setIsMenuOpen(false);
    } else {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setMenuPos({ top: Math.round(rect.bottom) + 4, left: Math.round(rect.left) });
      }
      setIsMenuOpen(true);
    }
  };
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editingTabId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingTabId]);
  useEffect(() => {
    if (!isMenuOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (menuRef.current?.contains(target)) return;
      if (buttonRef.current?.contains(target)) return;
      setIsMenuOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMenuOpen(false);
    };
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("keydown", handleKeyDown);
    }, 10);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);


  const handleStartRename = (tab: TabItem) => {
    setEditingTabId(tab.id);
    setEditingTitle(tab.title);
  };

  const handleCommitRename = (id: string) => {
    const trimmed = editingTitle.trim();
    if (trimmed) {
      onRenameTab(id, trimmed);
    }
    setEditingTabId(null);
  };

  return (
    <div
      className="h-8 border-b border-border bg-card flex items-stretch select-none overflow-x-auto shrink-0"
      onContextMenu={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault();
          onTabBarContextMenu?.(e);
        }
      }}
    >
      {/* Abas e botão '+' posicionado imediatamente após a última aba (Orca Style) */}
      <div className="flex items-stretch overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const isEditing = tab.id === editingTabId;

          return (
            <div
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              onDoubleClick={() => handleStartRename(tab)}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onTabContextMenu?.(e, tab);
              }}
              className={`group relative flex items-center gap-2 h-8 px-3 text-xs border-r border-border cursor-pointer transition-colors shrink-0 ${
                isActive
                  ? "bg-[color-mix(in_srgb,var(--foreground)_6%,var(--card))] text-foreground font-medium"
                  : "bg-card text-muted-foreground hover:text-foreground hover:bg-accent/40"
              }`}
            >
              {isActive && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-[color-mix(in_srgb,var(--foreground)_60%,var(--card))] z-20" />
              )}
              {tab.type === "editor" ? <File className="w-3.5 h-3.5 text-blue-400 shrink-0" /> : tab.type === "diff" ? <GitCompare className="w-3.5 h-3.5 text-amber-400 shrink-0" /> : <Terminal className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}

              {isEditing ? (
                <input
                  ref={inputRef}
                  type="text"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onBlur={() => handleCommitRename(tab.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCommitRename(tab.id);
                    if (e.key === "Escape") setEditingTabId(null);
                  }}
                  className="bg-background text-foreground border border-ring rounded px-1 text-[11px] font-mono outline-none w-28"
                  onClick={(e) => e.stopPropagation()}
                  onDoubleClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="truncate max-w-[140px] text-[11px] font-mono">
                  {tab.title}
                </span>
              )}

              {!isEditing && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(tab.id);
                  }}
                  title="Close tab"
                  className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-accent text-muted-foreground hover:text-foreground transition cursor-pointer"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          );
        })}

        {/* Botão de Nova Aba (+) com menu suspenso idêntico ao Orca */}
        <div className="relative flex items-center shrink-0 px-1">
          <button
            ref={buttonRef}
            onClick={handleToggleMenu}
            title="New Tab (+)"
            className={`flex items-center justify-center w-6 h-6 rounded transition cursor-pointer shrink-0 ${
              isMenuOpen
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          {isMenuOpen && menuPos && createPortal(
            <div
              ref={menuRef}
              style={{
                position: "fixed",
                top: `${menuPos.top}px`,
                left: `${menuPos.left}px`,
                zIndex: 9999,
              }}
              className="w-64 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-2xl backdrop-blur-md"
            >
              {/* New Terminal (default shell) */}
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  if (onNewTerminalTab) onNewTerminalTab();
                  else onNewTab?.();
                }}
                className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md hover:bg-accent text-popover-foreground text-left transition cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span className="text-[12px] font-medium text-foreground">New Terminal</span>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">Ctrl+T</span>
              </button>

              {/* Detected AI Coding Agents (Orca parity) */}
              {detectedAgents && detectedAgents.filter((a) => a.is_installed && a.id !== "bash").length > 0 && (
                <>
                  <div className="h-px bg-border my-1" />
                  <div className="px-2.5 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    AI Coding Agents
                  </div>
                  {detectedAgents
                    .filter((agent) => agent.is_installed && agent.id !== "bash")
                    .map((agent) => (
                      <button
                        key={agent.id}
                        onClick={() => {
                          setIsMenuOpen(false);
                          onLaunchAgent?.(agent);
                        }}
                        className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md hover:bg-accent text-popover-foreground text-left transition cursor-pointer group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <AgentBrandIcon agentId={agent.id} size={15} />
                          <span className="text-[12px] font-medium text-neutral-200 truncate">
                            {agent.name}
                          </span>
                        </div>
                        <span className="text-[10px] text-emerald-400/80 font-mono shrink-0">
                          {agent.executable}
                        </span>
                      </button>
                    ))}
                </>
              )}

              <div className="h-px bg-border my-1" />

              {/* New File / Editor */}
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onNewFileTab?.();
                }}
                className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md hover:bg-accent text-popover-foreground text-left transition cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <FilePlus className="w-4 h-4 text-blue-400" />
                  <span className="text-[12px] font-medium text-foreground">New File</span>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">Ctrl+N</span>
              </button>

              {/* Open File... */}
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenFileTab?.();
                }}
                className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md hover:bg-accent text-popover-foreground text-left transition cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <span className="text-[12px] font-medium text-foreground">Open File...</span>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">Ctrl+O</span>
              </button>

            </div>,
            document.body
          )}
        </div>
      </div>

      {/* Espaço restante vazio da barra de abas */}
      <div
        className="flex-1 h-full"
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onTabBarContextMenu?.(e);
        }}
      />
    </div>
  );
}
