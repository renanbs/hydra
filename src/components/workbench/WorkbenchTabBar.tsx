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

export interface TabItem {
  id: string;
  title: string;
  type: "terminal" | "diff" | "editor";
  sessionId?: string;
  executable?: string;
  cwd?: string;
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
      className="h-8 border-b border-[#222] bg-[#111214] flex items-center px-1 select-none overflow-x-auto shrink-0"
      onContextMenu={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault();
          onTabBarContextMenu?.(e);
        }
      }}
    >
      {/* Abas e botão '+' posicionado imediatamente após a última aba (Orca Style) */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
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
              className={`group flex items-center gap-2 h-7 px-3 text-xs rounded-t border-t-2 cursor-pointer transition-all ${
                isActive
                  ? "bg-[#0c0d0e] border-emerald-500 text-neutral-100 font-medium shadow-sm"
                  : "bg-transparent border-transparent text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200"
              }`}
            >
              {tab.type === "editor" ? <File className="w-3 h-3 text-blue-400 shrink-0" /> : tab.type === "diff" ? <GitCompare className="w-3 h-3 text-amber-400 shrink-0" /> : <Terminal className="w-3 h-3 text-emerald-400 shrink-0" />}

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
                  className="bg-[#141518] text-white border border-emerald-500/80 rounded px-1 text-[11px] font-mono outline-none w-28"
                  onClick={(e) => e.stopPropagation()}
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
                  className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-neutral-700 text-neutral-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          );
        })}

        {/* Botão de Nova Aba (+) com menu suspenso idêntico ao Orca */}
        <div className="relative shrink-0">
          <button
            ref={buttonRef}
            onClick={handleToggleMenu}
            title="New Tab (+)"
            className={`flex items-center justify-center w-6 h-6 rounded transition ml-0.5 cursor-pointer shrink-0 ${
              isMenuOpen
                ? "bg-neutral-800 text-white"
                : "hover:bg-neutral-800 text-neutral-400 hover:text-white"
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
              className="w-64 rounded-lg border border-[#333] bg-[#141517] p-1 text-[#eee] shadow-2xl backdrop-blur-md"
            >
              {/* New Terminal (default shell) */}
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  if (onNewTerminalTab) onNewTerminalTab();
                  else onNewTab?.();
                }}
                className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md hover:bg-neutral-800/80 text-left transition cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span className="text-[12px] font-medium text-neutral-200">New Terminal</span>
                </div>
                <span className="text-[10px] text-neutral-500 font-mono">Ctrl+T</span>
              </button>

              {/* Detected AI Coding Agents (Orca parity) */}
              {detectedAgents && detectedAgents.filter((a) => a.is_installed && a.id !== "bash").length > 0 && (
                <>
                  <div className="h-px bg-neutral-800 my-1" />
                  <div className="px-2.5 py-1 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
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
                        className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md hover:bg-neutral-800/80 text-left transition cursor-pointer group"
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

              <div className="h-px bg-neutral-800 my-1" />

              {/* New File / Editor */}
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onNewFileTab?.();
                }}
                className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md hover:bg-neutral-800/80 text-left transition cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <FilePlus className="w-4 h-4 text-blue-400" />
                  <span className="text-[12px] font-medium text-neutral-200">New File</span>
                </div>
                <span className="text-[10px] text-neutral-500 font-mono">Ctrl+N</span>
              </button>

              {/* Open File... */}
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenFileTab?.();
                }}
                className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md hover:bg-neutral-800/80 text-left transition cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <span className="text-[12px] font-medium text-neutral-200">Open File...</span>
                </div>
                <span className="text-[10px] text-neutral-500 font-mono">Ctrl+O</span>
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
