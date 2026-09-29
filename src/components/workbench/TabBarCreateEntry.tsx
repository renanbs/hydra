// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Reference: src/renderer/src/components/tab-bar/tab-bar-surface.tsx (TabBarCreateEntry +
// TabBarStaticCreateMenu + QuickLaunchAgentMenuItems composition) — Orca "+" dropdown parity:
// search header, static tab actions with shortcuts, detected AI agents with brand icons,
// and the Agent settings footer entry.
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
  title: string;
  subtitle?: string;
  category: "static-action" | "agent" | "settings" | "file" | "history";
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [launchPendingAgentId, setLaunchPendingAgentId] = useState<string | null>(null);

  // Auto-focus input when opened — Orca TabBarCreateEntry behavior.
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setLaunchPendingAgentId(null);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [isOpen]);

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

  const closeAfter = (action: () => void) => () => {
    action();
    onClose();
  };

  // Orca tab-bar-static-create-menu.tsx: core actions with their shortcuts.
  const staticActions: CreateOption[] = [
    {
      id: "new-terminal",
      title: "New Terminal",
      category: "static-action",
      icon: <TerminalSquare className="size-3.5 text-muted-foreground shrink-0" />,
      shortcut: `${CTRL}+T`,
      action: closeAfter(() => onNewTerminalTab?.()),
    },
    {
      id: "new-markdown",
      title: "New Markdown",
      category: "static-action",
      icon: <FilePlus className="size-3.5 text-muted-foreground shrink-0" />,
      shortcut: `${CTRL}+Shift+M`,
      action: closeAfter(() => onNewFileTab?.()),
    },
    {
      id: "open-markdown",
      title: "Open Markdown...",
      category: "static-action",
      icon: <FileText className="size-3.5 text-muted-foreground shrink-0" />,
      action: closeAfter(() => onOpenFileTab?.()),
    },
  ];

  // Orca QuickLaunchAgentMenuItems: only REAL installed AI agents, brand icons,
  // never plain shells (isShellProcess excludes bash/zsh/fish).
  const agentOptions: CreateOption[] = detectedAgents
    .filter((agent) => agent.is_installed && !isShellProcess(agent.executable || agent.id))
    .map((agent) => ({
      id: `agent-${agent.id}`,
      title: agent.name,
      subtitle: agent.executable,
      category: "agent" as const,
      icon:
        launchPendingAgentId === agent.id ? (
          <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden />
        ) : (
          <AgentBrandIcon agentId={agent.id} size={14} />
        ),
      action: closeAfter(() => {
        setLaunchPendingAgentId(agent.id);
        onLaunchAgent?.(agent);
      }),
    }));

  // Orca QuickLaunchButton.tsx footer: Agent settings entry.
  const agentSettingsOption: CreateOption = {
    id: "agent-settings",
    title: "Agent settings...",
    category: "settings",
    icon: <SettingsIcon className="size-3.5 shrink-0" />,
    action: closeAfter(() => onOpenSettings?.()),
  };

  // Restored tabs surface — Orca open-tab-search: history entries live under search.
  const historyOptions: CreateOption[] = recentlyClosedTabs.map((closedTab) => ({
    id: `recent-${closedTab.id}`,
    title: closedTab.title,
    subtitle: closedTab.cwd || closedTab.type,
    category: "history" as const,
    icon: <ShellIcon shell={closedTab.executable} size={14} />,
    action: closeAfter(() => onRestoreClosedTab?.(closedTab)),
  }));

  // Orca omnibox order: static actions → agents → settings → history. The
  // static block and the agent block stay grouped; query filters within them.
  const allOptions = useMemo(
    () => [...staticActions, ...agentOptions, agentSettingsOption, ...historyOptions],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [detectedAgents, recentlyClosedTabs, launchPendingAgentId, onLaunchAgent, onNewTerminalTab, onNewFileTab, onOpenFileTab, onRestoreClosedTab, onOpenSettings]
  );

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

  const renderOption = (opt: CreateOption, idx: number) => {
    const isSelected = idx === selectedIndex;
    return (
      <div
        key={opt.id}
        onClick={opt.action}
        onMouseEnter={() => setSelectedIndex(idx)}
        className={`flex items-center gap-2 rounded-[7px] px-2 py-1.5 text-[12px] leading-5 font-medium text-left cursor-pointer ${
          isSelected ? "bg-accent text-accent-foreground" : "text-popover-foreground hover:bg-accent/60"
        }`}
      >
        {opt.icon}
        <span className="flex-1 truncate">{opt.title}</span>
        {opt.shortcut ? (
          <span className="text-[10px] tracking-widest text-muted-foreground font-mono shrink-0">
            {opt.shortcut}
          </span>
        ) : null}
      </div>
    );
  };

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
      {/* Orca omnibox placeholder copy (tab-create-entry-copy.ts) */}
      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border/70 bg-card mb-1">
        <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Search open tabs, history, files, URLs, agents…"
          placeholder="Search open tabs, history, files, URLs, agents…"
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

      {/* Single flat list — one index domain shared by mouse hover, keyboard
          arrows and Enter. Group separators derive from category transitions,
          so the rendered order and filteredOptions can never drift apart. */}
      <div className="max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-700">
        {filteredOptions.length === 0 ? (
          <div className="p-3 text-center text-muted-foreground text-[11px] font-mono">
            No matching entries found.
          </div>
        ) : (
          filteredOptions.map((opt, idx) => {
            const prev = idx > 0 ? filteredOptions[idx - 1] : null;
            const showSeparator = prev !== null && opt.category !== prev.category;
            return (
              <Fragment key={opt.id}>
                {showSeparator ? <div className="my-1 h-px bg-border" role="separator" /> : null}
                {renderOption(opt, idx)}
              </Fragment>
            );
          })
        )}
      </div>
    </div>,
    document.body
  );
}
