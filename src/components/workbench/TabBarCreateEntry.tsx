// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Reference: src/renderer/src/components/tab-bar/TabBarCreateEntry.tsx

import { Fragment, useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  TerminalSquare,
  FilePlus,
  FileText,
  Settings as SettingsIcon,
  Loader2,
} from "lucide-react";
import { AgentBrandIcon } from "../AgentIcon";
import { ShellIcon } from "./shell-icons";
import { isShellProcess } from "./tab-agent";
import type { TabItem, DetectedAgent } from "./WorkbenchTabBar";

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
  onOpenSettings?: () => void;
}

interface CreateOption {
  id: string;
  label: string;
  shortcut?: string;
  icon: React.ReactNode;
  action: () => void;
  group: "actions" | "agents" | "recent" | "footer";
}

const isMac = typeof navigator !== "undefined" && navigator.userAgent.includes("Mac");
const CTRL = isMac ? "⌘" : "Ctrl";

export function TabBarCreateEntry({
  isOpen,
  anchorPos,
  onClose,
  detectedAgents = [],
  recentlyClosedTabs = [],
  onNewTerminalTab,
  onNewFileTab,
  onOpenFileTab,
  onLaunchAgent,
  onRestoreClosedTab,
  onOpenSettings,
}: TabBarCreateEntryProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [isOpen]);

  const options: CreateOption[] = useMemo(() => {
    const list: CreateOption[] = [];

    // Static Tab Actions
    list.push({
      id: "new-terminal",
      label: "New Terminal",
      shortcut: `${CTRL}+Shift+T`,
      icon: <TerminalSquare className="w-3.5 h-3.5 text-muted-foreground" />,
      action: () => {
        onNewTerminalTab?.();
        onClose();
      },
      group: "actions",
    });

    list.push({
      id: "new-file",
      label: "New File",
      shortcut: `${CTRL}+N`,
      icon: <FilePlus className="w-3.5 h-3.5 text-muted-foreground" />,
      action: () => {
        onNewFileTab?.();
        onClose();
      },
      group: "actions",
    });

    list.push({
      id: "open-file",
      label: "Open File...",
      shortcut: `${CTRL}+O`,
      icon: <FileText className="w-3.5 h-3.5 text-muted-foreground" />,
      action: () => {
        onOpenFileTab?.();
        onClose();
      },
      group: "actions",
    });

    // Detected Agents
    const installedAgents = detectedAgents.filter((a) => a.installed || a.is_installed);
    for (const agent of installedAgents) {
      const agentId = agent.id || agent.name;
      const isShell = isShellProcess(agentId) || isShellProcess(agent.executable || "");
      list.push({
        id: `agent-${agentId}`,
        label: agent.label || agent.name,
        icon: isShell ? (
          <ShellIcon shell={agent.executable || agentId} size={14} />
        ) : (
          <AgentBrandIcon agentId={agentId} size={14} />
        ),
        action: () => {
          onLaunchAgent?.(agent);
          onClose();
        },
        group: "agents",
      });
    }

    // Recently Closed Tabs
    for (const tab of recentlyClosedTabs.slice(0, 3)) {
      list.push({
        id: `recent-${tab.id}`,
        label: `Reopen: ${tab.title}`,
        icon: <TerminalSquare className="w-3.5 h-3.5 text-muted-foreground/60" />,
        action: () => {
          onRestoreClosedTab?.(tab);
          onClose();
        },
        group: "recent",
      });
    }

    // Footer Setting
    list.push({
      id: "settings-agent",
      label: "Configure Agents...",
      icon: <SettingsIcon className="w-3.5 h-3.5 text-muted-foreground" />,
      action: () => {
        onOpenSettings?.();
        onClose();
      },
      group: "footer",
    });

    return list;
  }, [
    detectedAgents,
    recentlyClosedTabs,
    onNewTerminalTab,
    onNewFileTab,
    onOpenFileTab,
    onLaunchAgent,
    onRestoreClosedTab,
    onOpenSettings,
    onClose,
  ]);

  const filteredOptions = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [options, query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredOptions.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredOptions.length) % Math.max(1, filteredOptions.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const selected = filteredOptions[selectedIndex];
      if (selected) {
        selected.action();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen || !anchorPos) return null;

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-label="Create tab menu"
      className="fixed z-[99999] w-64 rounded-xl border border-border/80 bg-popover/95 text-popover-foreground shadow-[0_16px_36px_rgba(0,0,0,0.3)] backdrop-blur-md p-1 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100"
      style={{ top: anchorPos.top, left: anchorPos.left }}
      onKeyDown={handleKeyDown}
    >
      {/* Search Input */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-border/50 mb-0.5">
        <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedIndex(0);
          }}
          placeholder="New tab or launch agent..."
          className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground/70 outline-none"
        />
      </div>

      {/* Options List */}
      <div className="flex flex-col gap-0.5 max-h-[300px] overflow-y-auto no-scrollbar">
        {filteredOptions.length === 0 ? (
          <div className="px-2 py-3 text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            No matches found
          </div>
        ) : (
          filteredOptions.map((opt, idx) => {
            const isSelected = idx === selectedIndex;
            const prev = filteredOptions[idx - 1];
            const showDivider = prev && prev.group !== opt.group;

            return (
              <Fragment key={opt.id}>
                {showDivider && <div className="h-px bg-border/40 my-0.5 mx-1" />}
                <button
                  type="button"
                  onClick={opt.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between w-full h-7 px-2 text-xs rounded-md cursor-pointer transition select-none ${
                    isSelected
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="shrink-0">{opt.icon}</span>
                    <span className="truncate">{opt.label}</span>
                  </div>
                  {opt.shortcut && (
                    <span className="text-[10px] font-mono text-muted-foreground/60 shrink-0">
                      {opt.shortcut}
                    </span>
                  )}
                </button>
              </Fragment>
            );
          })
        )}
      </div>
    </div>,
    document.body
  );
}
