// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Reference: src/renderer/src/components/tab-bar/tab-bar-surface.tsx

import React from "react";
import { Plus } from "lucide-react";
import { TabStripScrollIndicator } from "./TabStripScrollIndicator";
import { getTabStripScrollMaskClassName, type TabStripScrollMetrics } from "./tab-strip-scroll-metrics";
import { TabBarCreateEntry } from "./TabBarCreateEntry";
import type { TabItem, DetectedAgent } from "./WorkbenchTabBar";

export interface RenderTabBarSurfaceParams {
  tabs: TabItem[];
  effectiveTabs: TabItem[];
  effectiveActiveTabId?: string;
  renderedItems: React.ReactNode[];
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  buttonRef: React.RefObject<HTMLButtonElement | null>;
  scrollMetrics: TabStripScrollMetrics;
  isMenuOpen: boolean;
  menuPos: { top: number; left: number } | null;
  draggedTabId: string | null;
  worktreePath?: string;
  detectedAgents?: DetectedAgent[];
  recentlyClosedTabs?: TabItem[];
  onToggleMenu: (e?: React.MouseEvent) => void;
  onCloseMenu: () => void;
  onTabBarContextMenu?: (e: React.MouseEvent) => void;
  onNewTerminalTab?: (shell?: string) => void;
  onNewTab?: () => void;
  onNewFileTab?: () => void;
  onOpenFileTab?: () => void;
  onOpenFile?: (path: string) => void;
  onLaunchAgent?: (agent: DetectedAgent) => void;
  onRestoreClosedTab?: (tab: TabItem) => void;
  onRunQuickCommand?: (command: string) => void;
  onOpenSettings?: () => void;
}

export function renderTabBarSurface({
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
  onToggleMenu,
  onCloseMenu,
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
}: RenderTabBarSurfaceParams): React.JSX.Element {
  return (
    <div
      ref={scrollContainerRef}
      className={`group/tab-strip relative h-8 border-b border-border flex items-stretch select-none overflow-x-auto shrink-0 ${getTabStripScrollMaskClassName(
        scrollMetrics
      )}`}
      onContextMenu={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault();
          onTabBarContextMenu?.(e);
        }
      }}
    >
      {/* Tab strip items */}
      <div className="inline-flex items-stretch no-scrollbar bg-card">
        {renderedItems}

        {/* Plus (+) Button */}
        <div className="relative flex items-center h-8 shrink-0 z-10">
          <button
            ref={buttonRef}
            onClick={onToggleMenu}
            onMouseDown={(e) => e.stopPropagation()}
            title="New Tab (+)"
            aria-label="New tab"
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
            onClose={onCloseMenu}
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

      <TabStripScrollIndicator
        metrics={scrollMetrics}
        scrollContainerRef={scrollContainerRef}
        disabled={draggedTabId !== null}
      />
    </div>
  );
}
