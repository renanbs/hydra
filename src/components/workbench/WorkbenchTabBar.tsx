// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Reference: src/renderer/src/components/tab-bar/TabBar.tsx

import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from "react";
import { useAppStore } from "../../store";
import {
  computeTabStripScrollMetrics,
  type TabStripScrollMetrics,
} from "./tab-strip-scroll-metrics";
import { renderTabBarItems } from "./tab-bar-item-surface";
import { renderTabBarSurface } from "./tab-bar-surface";
import type { WorktreeSession, AvailableAgent } from "../sidebar/WorktreeSidebar";

export interface SplitPane {
  id?: string;
  tabId?: string;
  sessionId: string;
  executable?: string;
  cwd?: string;
}

export interface SplitLayout {
  panes: SplitPane[];
  direction: "horizontal" | "vertical";
}

export interface TabItem {
  id: string;
  title: string;
  customTitle?: string;
  type: "terminal" | "editor" | "diff";
  sessionId?: string;
  filePath?: string;
  cwd?: string;
  isPinned?: boolean;
  color?: string | null;
  executable?: string;
  agentName?: string;
  agentId?: string;
  splitLayout?: SplitLayout;
  splitPanes?: SplitPane[];
  splitSessionIds?: (string | undefined)[];
  splitDirection?: "horizontal" | "vertical";
}

export const TAB_COLORS = [
  { label: "Red", value: "#ef4444" },
  { label: "Orange", value: "#f97316" },
  { label: "Yellow", value: "#eab308" },
  { label: "Green", value: "#22c55e" },
  { label: "Cyan", value: "#06b6d4" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Purple", value: "#a855f7" },
  { label: "Pink", value: "#ec4899" },
] as const;

export type DetectedAgent = AvailableAgent & {
  installed?: boolean;
  label?: string;
  version?: string;
  description?: string;
};

export const RUNNING_CLOSE_PROBE_TIMEOUT_MS = 4_000;

export const SHELL_EXECUTABLES: Record<string, true> = {
  bash: true,
  zsh: true,
  fish: true,
  sh: true,
  ksh: true,
  csh: true,
  tcsh: true,
  powershell: true,
  pwsh: true,
  cmd: true,
};

export function preventMiddleButtonDefault(event: React.MouseEvent): void {
  if (event.button === 1) {
    event.preventDefault();
  }
}

export interface WorkbenchTabBarProps {
  tabs: TabItem[];
  activeTabId?: string;
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
  onReorderTabs?: (tabs: TabItem[]) => void;
  onTabBarContextMenu?: (e: React.MouseEvent) => void;
  onTabContextMenu?: (e: React.MouseEvent, tab: TabItem) => void;
  worktreePath?: string;
  recentlyClosedTabs?: TabItem[];
  onOpenFile?: (path: string) => void;
  onRestoreClosedTab?: (tab: TabItem) => void;
  onRunQuickCommand?: (command: string) => void;
  onOpenSettings?: () => void;
  onPinTab?: (id: string, isPinned: boolean) => void;
  onSetTabColor?: (id: string, color: string | null) => void;
  onSplitTerminal?: (tabId: string, direction: "horizontal" | "vertical") => void;
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
  onTabBarContextMenu,
  worktreePath,
  recentlyClosedTabs,
  onOpenFile,
  onRestoreClosedTab,
  onRunQuickCommand,
  onOpenSettings,
  onPinTab,
  onSetTabColor,
  onSplitTerminal,
}: WorkbenchTabBarProps): React.JSX.Element {
  const storeTabs = useAppStore((s) => (worktreePath ? s.tabsByWorktree[worktreePath] : undefined));
  const effectiveTabs = storeTabs && storeTabs.length > 0 ? storeTabs : tabs;
  const storeActiveTabId = useAppStore((s) =>
    worktreePath ? s.activeTabIdByWorktree[worktreePath] : undefined
  );
  const effectiveActiveTabId = storeActiveTabId ?? activeTabId;

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [scrollMetrics, setScrollMetrics] = useState<TabStripScrollMetrics>({
    hasOverflow: false,
    canScrollStart: false,
    canScrollEnd: false,
    thumbSizeFraction: 1,
    thumbOffsetFraction: 0,
  });

  const updateScrollMetrics = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setScrollMetrics(computeTabStripScrollMetrics(el));
  }, []);

  useLayoutEffect(() => {
    updateScrollMetrics();
  }, [effectiveTabs.length, effectiveActiveTabId, updateScrollMetrics]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScrollMetrics, { passive: true });
    const ro = new ResizeObserver(updateScrollMetrics);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollMetrics);
      ro.disconnect();
    };
  }, [updateScrollMetrics]);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{
    tabId: string;
    side: "left" | "right";
  } | null>(null);

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

  const handleSelectTab = (id: string) => {
    if (worktreePath) {
      useAppStore.getState().selectTab(worktreePath, id);
    }
    onSelectTab(id);
  };

  const handleSetCustomTitle = (id: string, title: string | null) => {
    const nextTitle = title ?? "";
    if (worktreePath) {
      useAppStore.getState().setTabCustomTitle(worktreePath, id, nextTitle);
    }
    onRenameTab(id, nextTitle);
  };

  const handlePinTab = (id: string) => {
    const tab = effectiveTabs.find((t) => t.id === id);
    if (!tab) return;
    const nextPinned = !tab.isPinned;
    if (worktreePath) {
      useAppStore.getState().pinTab(worktreePath, id, nextPinned);
    }
    onPinTab?.(id, nextPinned);
  };

  const handleSetTabColor = (id: string, color: string | null) => {
    if (worktreePath) {
      useAppStore.getState().updateTab(worktreePath, id, { color });
    }
    onSetTabColor?.(id, color);
  };

  const handleCloseOthers = (id: string) => {
    for (const t of effectiveTabs) {
      if (t.id !== id && !t.isPinned) {
        onCloseTab(t.id);
      }
    }
  };

  const handleCloseToRight = (id: string) => {
    const idx = effectiveTabs.findIndex((t) => t.id === id);
    if (idx === -1) return;
    for (let i = idx + 1; i < effectiveTabs.length; i++) {
      const t = effectiveTabs[i];
      if (!t.isPinned) {
        onCloseTab(t.id);
      }
    }
  };

  const handleCloseToLeft = (id: string) => {
    const idx = effectiveTabs.findIndex((t) => t.id === id);
    if (idx === -1) return;
    for (let i = 0; i < idx; i++) {
      const t = effectiveTabs[i];
      if (!t.isPinned) {
        onCloseTab(t.id);
      }
    }
  };

  const handleDragStart = (tabId: string, e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", tabId);
    e.dataTransfer.effectAllowed = "move";
    setDraggedTabId(tabId);
  };

  const handleDragOver = (tabId: string, e: React.DragEvent) => {
    if (!draggedTabId || draggedTabId === tabId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const rect = e.currentTarget.getBoundingClientRect();
    const midX = rect.left + rect.width / 2;
    const side = e.clientX < midX ? "left" : "right";
    setDropIndicator((prev) => {
      if (prev?.tabId === tabId && prev?.side === side) return prev;
      return { tabId, side };
    });
  };

  const handleDragLeave = (tabId: string, e: React.DragEvent) => {
    if (dropIndicator?.tabId === tabId) {
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
  };

  const handleDrop = (tabId: string, e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedTabId || draggedTabId === tabId) {
      setDropIndicator(null);
      setDraggedTabId(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const side = e.clientX < rect.left + rect.width / 2 ? "left" : "right";

    const sourceIdx = effectiveTabs.findIndex((t) => t.id === draggedTabId);
    if (sourceIdx === -1) {
      setDropIndicator(null);
      setDraggedTabId(null);
      return;
    }
    const sourceTab = effectiveTabs[sourceIdx];
    const newTabs = effectiveTabs.filter((t) => t.id !== draggedTabId);
    let targetIdx = newTabs.findIndex((t) => t.id === tabId);
    if (targetIdx === -1) {
      targetIdx = newTabs.length;
    } else if (side === "right") {
      targetIdx += 1;
    }
    newTabs.splice(targetIdx, 0, sourceTab);
    if (worktreePath) {
      useAppStore.getState().reorderTabs(worktreePath, sourceIdx, targetIdx);
    }
    onReorderTabs?.(newTabs);
    setDropIndicator(null);
    setDraggedTabId(null);
  };

  const handleDragEnd = () => {
    setDropIndicator(null);
    setDraggedTabId(null);
  };

  const renderedItems = renderTabBarItems({
    tabs: effectiveTabs,
    activeTabId: effectiveActiveTabId,
    sessions,
    unreadWorktrees,
    draggedTabId,
    dropIndicator,
    onSelectTab: handleSelectTab,
    onCloseTab,
    onCloseOthers: handleCloseOthers,
    onCloseToRight: handleCloseToRight,
    onCloseToLeft: handleCloseToLeft,
    onSetCustomTitle: handleSetCustomTitle,
    onSetTabColor: handleSetTabColor,
    onPinTab: handlePinTab,
    onSplitTerminal,
    onDragStart: handleDragStart,
    onDragOver: handleDragOver,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop,
    onDragEnd: handleDragEnd,
  });

  return renderTabBarSurface({
    tabs,
    effectiveTabs,
    effectiveActiveTabId,
    renderedItems,
    scrollContainerRef,
    buttonRef,
    scrollMetrics,
    isMenuOpen,
    menuPos,
    draggedTabId,
    worktreePath,
    detectedAgents,
    recentlyClosedTabs,
    onToggleMenu: handleToggleMenu,
    onCloseMenu: () => setIsMenuOpen(false),
    onTabBarContextMenu,
    onNewTerminalTab,
    onNewTab,
    onNewFileTab,
    onOpenFileTab,
    onOpenFile,
    onLaunchAgent,
    onRestoreClosedTab,
    onRunQuickCommand,
    onOpenSettings,
  });
}

export const TabBar = WorkbenchTabBar;
export default WorkbenchTabBar;
