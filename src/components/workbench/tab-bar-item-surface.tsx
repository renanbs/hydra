// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Reference: src/renderer/src/components/tab-bar/tab-bar-item-surface.tsx

import React from "react";
import { SortableTab } from "./SortableTab";
import type { TabItem } from "./WorkbenchTabBar";
import { resolveTabAgent } from "./tab-agent";
import type { WorktreeSession } from "../sidebar/WorktreeSidebar";

export interface RenderTabBarItemsParams {
  tabs: TabItem[];
  activeTabId?: string;
  sessions?: WorktreeSession[];
  unreadWorktrees?: Set<string>;
  draggedTabId: string | null;
  dropIndicator: { tabId: string; side: "left" | "right" } | null;
  includeTopTabBorder?: boolean;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onCloseOthers: (id: string) => void;
  onCloseToRight: (id: string) => void;
  onCloseToLeft: (id: string) => void;
  onSetCustomTitle: (id: string, title: string | null) => void;
  onSetTabColor: (id: string, color: string | null) => void;
  onPinTab: (id: string) => void;
  onSplitTerminal?: (id: string, direction: "horizontal" | "vertical") => void;
  onDragStart: (tabId: string, e: React.DragEvent) => void;
  onDragOver: (tabId: string, e: React.DragEvent) => void;
  onDragLeave: (tabId: string, e: React.DragEvent) => void;
  onDrop: (tabId: string, e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
}

export function renderTabBarItems({
  tabs,
  activeTabId,
  sessions,
  unreadWorktrees,
  draggedTabId,
  dropIndicator,
  includeTopTabBorder = false,
  onSelectTab,
  onCloseTab,
  onCloseOthers,
  onCloseToRight,
  onCloseToLeft,
  onSetCustomTitle,
  onSetTabColor,
  onPinTab,
  onSplitTerminal,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}: RenderTabBarItemsParams): React.ReactNode[] {
  return tabs.map((tab, idx) => {
    const isActive = tab.id === activeTabId;
    const tabAgent = resolveTabAgent(tab, sessions);
    const tabSession = tab.sessionId
      ? sessions?.find((s) => s.id === tab.sessionId)
      : undefined;
    const activityStatus = tabSession?.state;
    const isUnread = Boolean(
      tab.sessionId &&
        (unreadWorktrees?.has(tab.sessionId) ||
          (tabSession?.project_path && unreadWorktrees?.has(tabSession.project_path)))
    );
    const isDragging = draggedTabId === tab.id;
    const indicatorSide = dropIndicator?.tabId === tab.id ? dropIndicator.side : null;

    return (
      <SortableTab
        key={tab.id}
        tab={tab}
        tabCount={tabs.length}
        hasTabsToRight={idx < tabs.length - 1}
        hasTabsToLeft={idx > 0}
        isActive={isActive}
        isPinned={tab.isPinned}
        isUnread={isUnread}
        tabAgent={tabAgent}
        activityStatus={activityStatus}
        dropIndicator={indicatorSide}
        isDragging={isDragging}
        includeTopTabBorder={includeTopTabBorder}
        onActivate={onSelectTab}
        onClose={onCloseTab}
        onCloseOthers={onCloseOthers}
        onCloseToRight={onCloseToRight}
        onCloseToLeft={onCloseToLeft}
        onSetCustomTitle={onSetCustomTitle}
        onSetTabColor={onSetTabColor}
        onTogglePin={onPinTab}
        onSplitTerminal={onSplitTerminal}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onDragEnd={onDragEnd}
      />
    );
  });
}
