import { useState, useRef, useEffect } from "react";
import { 
  Plus, 
  X, 
  File, 
  GitCompare,
  Pin
} from "lucide-react";
import { TerminalTabLeadingIcon } from "./TerminalTabLeadingIcon";
import { resolveTabAgent } from "./tab-agent";
import { TabBarCreateEntry } from "./TabBarCreateEntry";
import { stripLeadingAgentTitleDecoration } from "./agent-title-decoration";
import type { WorktreeSession } from "../sidebar/types";

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
  /** Orca parity (customTitle): a user rename that overrides live shell titles. */
  customTitle?: string;
  type: "terminal" | "diff" | "editor";
  sessionId?: string;
  executable?: string;
  cwd?: string;
  agentName?: string;
  agentId?: string;
  isPinned?: boolean;
  color?: string | null;
  /** Sprint 2 P0: split terminals within a single tab */
  splitSessionIds?: string[];
  splitDirection?: "horizontal" | "vertical";
  splitPanes?: SplitPane[];
  splitLayout?: SplitLayout;
}

export const TAB_COLORS = [
  { label: "None", value: null },
  { label: "Blue", value: "#3b82f6" },
  { label: "Purple", value: "#a855f7" },
  { label: "Pink", value: "#ec4899" },
  { label: "Red", value: "#ef4444" },
  { label: "Orange", value: "#f97316" },
  { label: "Yellow", value: "#eab308" },
  { label: "Green", value: "#22c55e" },
  { label: "Teal", value: "#14b8a6" },
  { label: "Gray", value: "#9ca3af" },
] as const;

export interface DetectedAgent {
  id: string;
  name: string;
  executable: string;
  is_installed: boolean;
}

/** Upper bound on how long a close may wait on the agent-state probe before it asks
 *  instead. An X button that looks dead for longer is the same class of bug as one
 *  that never asks — but an unanswered probe is not evidence of an idle shell, so
 *  the timeout raises the prompt rather than closing a possibly-running tab
 *  (Orca running-terminal-close-guard.ts #10142). */
export const RUNNING_CLOSE_PROBE_TIMEOUT_MS = 4_000;

/** Plain shells get the 'command' copy ("Stop running command?"); anything else is a
 *  launched AI agent and gets the 'agent' copy ("Stop this agent?"). Mirrors Orca's
 *  resolveBusyPtyCloseCopyKind, keyed on the tab's executable instead of a remote map. */
export const SHELL_EXECUTABLES: Record<string, true> = {
  bash: true, sh: true, zsh: true, fish: true, dash: true, ksh: true, csh: true,
  tcsh: true, pwsh: true, powershell: true, cmd: true,
};
export function preventMiddleButtonDefault(event: React.MouseEvent): void {
  if (event.button === 1) {
    // Why: Linux primary-selection paste is gated on mouseup;
    // mousedown/auxclick cancellation alone still lets it reach the next terminal.
    event.preventDefault();
  }
}

interface WorkbenchTabBarProps {
  tabs: TabItem[];
  activeTabId: string;
  sessions?: WorktreeSession[];
  unreadWorktrees?: Set<string>;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onNewTab?: () => void;
  onNewTerminalTab?: (shell?: string) => void;
  onNewFileTab?: () => void;
  onOpenFileTab?: () => void;
  onLaunchAgent?: (agent: DetectedAgent) => void;
  detectedAgents?: DetectedAgent[];
  onRenameTab: (id: string, newTitle: string) => void;
  onReorderTabs?: (newTabs: TabItem[]) => void;
  onTabContextMenu?: (e: React.MouseEvent, tab: TabItem) => void;
  onTabBarContextMenu?: (e: React.MouseEvent) => void;
  worktreePath?: string;
  recentlyClosedTabs?: TabItem[];
  onOpenFile?: (path: string) => void;
  onRestoreClosedTab?: (tab: TabItem) => void;
  onRunQuickCommand?: (command: string) => void;
  onOpenSettings?: () => void;
}

export function WorkbenchTabBar({
  tabs,
  activeTabId,
  sessions,
  unreadWorktrees,
  onSelectTab,
  onCloseTab,
  onNewTab,
  onNewTerminalTab,
  onNewFileTab,
  onOpenFileTab,
  onLaunchAgent,
  detectedAgents,
  onRenameTab,
  onReorderTabs,
  onTabContextMenu,
  onTabBarContextMenu,
  worktreePath,
  recentlyClosedTabs,
  onOpenFile,
  onRestoreClosedTab,
  onRunQuickCommand,
  onOpenSettings,
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
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{ tabId: string; side: "left" | "right" } | null>(null);

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
      className="h-8 border-b border-border flex items-stretch select-none overflow-x-auto shrink-0"
      onContextMenu={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault();
          onTabBarContextMenu?.(e);
        }
      }}
    >
      {/* Abas e botão '+' posicionado imediatamente após a última aba (Orca Style) */}
      <div className="inline-flex items-stretch no-scrollbar bg-card">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const isEditing = tab.id === editingTabId;
          const tabAgent = resolveTabAgent(tab, sessions);
          const tabSession = tab.sessionId ? sessions?.find((s) => s.id === tab.sessionId) : undefined;
          const activityStatus = tabSession?.state;
          const isUnread = Boolean(
            tab.sessionId &&
              (unreadWorktrees?.has(tab.sessionId) ||
                (tabSession?.project_path && unreadWorktrees?.has(tabSession.project_path)))
          );
          const displayTitle = tabAgent ? stripLeadingAgentTitleDecoration(tab.title) : tab.title;
          const isDragging = draggedTabId === tab.id;
          const indicatorSide = dropIndicator?.tabId === tab.id ? dropIndicator.side : null;
          const dropIndicatorClass = 
            indicatorSide === "left"
              ? "before:absolute before:inset-y-0 before:left-0 before:w-[2px] before:bg-blue-500 before:z-30 before:content-['']"
              : indicatorSide === "right"
              ? "after:absolute after:inset-y-0 after:right-0 after:w-[2px] after:bg-blue-500 after:z-30 after:content-['']"
              : "";

          return (
            <div
              key={tab.id}
              draggable={!isEditing}
              onDragStart={(e) => {
                if (isEditing) {
                  e.preventDefault();
                  return;
                }
                e.dataTransfer.setData("text/plain", tab.id);
                e.dataTransfer.effectAllowed = "move";
                setDraggedTabId(tab.id);
              }}
              onDragOver={(e) => {
                if (!draggedTabId || draggedTabId === tab.id) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                const rect = e.currentTarget.getBoundingClientRect();
                const midX = rect.left + rect.width / 2;
                const side = e.clientX < midX ? "left" : "right";
                setDropIndicator((prev) => {
                  if (prev?.tabId === tab.id && prev?.side === side) return prev;
                  return { tabId: tab.id, side };
                });
              }}
              onDragLeave={(e) => {
                if (dropIndicator?.tabId === tab.id) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  if (
                    e.clientX < rect.left ||
                    e.clientX >= rect.right ||
                    e.clientY < rect.top ||
                    e.clientY >= rect.bottom
                  ) {
                    setDropIndicator(null);
                  }
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (!draggedTabId || draggedTabId === tab.id) {
                  setDropIndicator(null);
                  setDraggedTabId(null);
                  return;
                }
                const rect = e.currentTarget.getBoundingClientRect();
                const side = e.clientX < (rect.left + rect.width / 2) ? "left" : "right";
                
                const sourceIdx = tabs.findIndex((t) => t.id === draggedTabId);
                if (sourceIdx === -1) {
                  setDropIndicator(null);
                  setDraggedTabId(null);
                  return;
                }
                const sourceTab = tabs[sourceIdx];
                const newTabs = tabs.filter((t) => t.id !== draggedTabId);
                let targetIdx = newTabs.findIndex((t) => t.id === tab.id);
                if (targetIdx === -1) {
                  targetIdx = newTabs.length;
                } else if (side === "right") {
                  targetIdx += 1;
                }
                newTabs.splice(targetIdx, 0, sourceTab);
                onReorderTabs?.(newTabs);
                setDropIndicator(null);
                setDraggedTabId(null);
              }}
              onDragEnd={() => {
                setDropIndicator(null);
                setDraggedTabId(null);
              }}
              onClick={() => onSelectTab(tab.id)}
              onDoubleClick={() => handleStartRename(tab)}
              onMouseUp={preventMiddleButtonDefault}
              onAuxClick={(e) => {
                if (isEditing || tab.isPinned) return;
                if (e.button === 1) {
                  e.preventDefault();
                  e.stopPropagation();
                  onCloseTab(tab.id);
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onTabContextMenu?.(e, tab);
              }}
              className={`group relative flex items-center gap-2 h-8 px-3 text-xs border-r border-border cursor-pointer transition-colors shrink-0 ${dropIndicatorClass} ${
                isDragging ? "opacity-40" : ""
              } ${
                isActive
                  ? "bg-[color-mix(in_srgb,var(--foreground)_6%,var(--card))] text-foreground font-medium"
                  : "bg-card text-muted-foreground hover:text-foreground hover:bg-accent/40"
              }`}
            >
              {isActive && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-[color-mix(in_srgb,var(--foreground)_60%,var(--card))] z-20" />
              )}
              {tab.isPinned && !isEditing && (
                <Pin className="w-2.5 h-2.5 text-muted-foreground shrink-0" aria-hidden />
              )}
              {tab.color && !isEditing && (
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: tab.color }}
                  aria-hidden
                />
              )}
              {tab.type === "editor" ? (
                <File className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              ) : tab.type === "diff" ? (
                <GitCompare className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              ) : (
                <TerminalTabLeadingIcon
                  agent={tabAgent}
                  activityStatus={activityStatus}
                  shell={tab.executable}
                  showUnreadActivity={isUnread && !isActive}
                  isActive={isActive}
                />
              )}

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
                  {displayTitle}
                </span>
              )}
              {!isEditing && !tab.isPinned && (
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

        {/* Botão de Nova Aba (+) — hit area 32x32 sem dead zone, z-10 para não ser coberto pelo flex-1 */}
        <div className="relative flex items-center h-8 shrink-0 z-10">
          <button
            ref={buttonRef}
            onClick={handleToggleMenu}
            onMouseDown={(e) => e.stopPropagation()}
            title="New Tab (+)"
            className={`flex items-center justify-center w-8 h-8 rounded-sm transition cursor-pointer shrink-0 ${
              isMenuOpen
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          <TabBarCreateEntry
            isOpen={isMenuOpen}
            anchorPos={menuPos}
            onClose={() => setIsMenuOpen(false)}
            worktreePath={worktreePath}
            detectedAgents={detectedAgents}
            recentlyClosedTabs={recentlyClosedTabs}
            onNewTerminalTab={onNewTerminalTab ?? onNewTab}
            onNewFileTab={onNewFileTab}
            onOpenFileTab={onOpenFileTab}
            onOpenFile={onOpenFile}
            onLaunchAgent={onLaunchAgent}
            onRestoreClosedTab={onRestoreClosedTab}
            onRunQuickCommand={onRunQuickCommand}
            onOpenSettings={onOpenSettings}
          />
        </div>
      </div>

      {/* Filler removido — botão '+' fica grudado à direita (Orca/Code estilo) */}
    </div>
  );
}
