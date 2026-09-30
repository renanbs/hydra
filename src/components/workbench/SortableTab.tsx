// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Reference: src/renderer/src/components/tab-bar/SortableTab.tsx

import React, { useEffect, useState } from "react";
import { X, Minimize2, Pin, File, GitCompare } from "lucide-react";
import { stripLeadingAgentTitleDecoration } from "./agent-title-decoration";
import { TerminalTabLeadingIcon } from "./TerminalTabLeadingIcon";
import {
  ACTIVE_TAB_INDICATOR_CLASSES,
  getDropIndicatorClasses,
  getTabRootStateClasses,
  getTabStripBorderClasses,
  TAB_CONTAINER_WIDTH_CLASSES,
  TAB_LABEL_WIDTH_CLASSES,
  type DropIndicator,
} from "./drop-indicator";
import {
  SortableTabContextMenu,
  CLOSE_ALL_CONTEXT_MENUS_EVENT,
} from "./SortableTabContextMenu";
import { useSortableTabRename } from "./use-sortable-tab-rename";
import { RENAME_TERMINAL_TAB_EVENT } from "./terminal-tab-rename-request";
import type { TabItem } from "./WorkbenchTabBar";

export { RENAME_TERMINAL_TAB_EVENT };
export interface SortableTabProps {
  tab: TabItem;
  tabCount: number;
  hasTabsToRight: boolean;
  hasTabsToLeft: boolean;
  isActive: boolean;
  isPinned?: boolean;
  isExpanded?: boolean;
  isUnread?: boolean;
  tabAgent?: string | null;
  activityStatus?: string | null;
  dropIndicator?: DropIndicator;
  isDragging?: boolean;
  includeTopTabBorder?: boolean;
  canToggleViewMode?: boolean;
  isChatView?: boolean;
  onToggleViewMode?: () => void;
  canSplitTerminal?: boolean;
  onActivate: (tabId: string) => void;
  onClose: (tabId: string) => void;
  onCloseOthers: (tabId: string) => void;
  onCloseToRight: (tabId: string) => void;
  onCloseToLeft: (tabId: string) => void;
  onSetCustomTitle: (tabId: string, title: string | null) => void;
  onSetTabColor: (tabId: string, color: string | null) => void;
  onTogglePin?: (tabId: string) => void;
  onToggleExpand?: (tabId: string) => void;
  onSplitTerminal?: (tabId: string, direction: "horizontal" | "vertical") => void;
  onDragStart?: (tabId: string, e: React.DragEvent) => void;
  onDragOver?: (tabId: string, e: React.DragEvent) => void;
  onDragLeave?: (tabId: string, e: React.DragEvent) => void;
  onDrop?: (tabId: string, e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}

export function SortableTab({
  tab,
  tabCount,
  hasTabsToRight,
  hasTabsToLeft,
  isActive,
  isPinned = false,
  isExpanded = false,
  isUnread = false,
  tabAgent = null,
  activityStatus = null,
  dropIndicator = null,
  isDragging = false,
  includeTopTabBorder = false,
  canToggleViewMode = false,
  isChatView = false,
  onToggleViewMode,
  canSplitTerminal = true,
  onActivate,
  onClose,
  onCloseOthers,
  onCloseToRight,
  onCloseToLeft,
  onSetCustomTitle,
  onSetTabColor,
  onTogglePin,
  onToggleExpand,
  onSplitTerminal,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}: SortableTabProps): React.JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPoint, setMenuPoint] = useState({ x: 0, y: 0 });

  const {
    isEditing,
    renameValue,
    setRenameValue,
    handleRenameOpen,
    commitRename,
    cancelRename,
    setRenameInputElement,
  } = useSortableTabRename({
    tabId: tab.id,
    title: tab.title,
    customTitle: tab.customTitle,
    onSetCustomTitle,
  });

  const displayTitle =
    tab.customTitle ?? (tabAgent ? stripLeadingAgentTitleDecoration(tab.title) : tab.title);
  const tabTitle = tab.customTitle ?? tab.title;

  useEffect(() => {
    const closeMenu = () => setMenuOpen(false);
    window.addEventListener(CLOSE_ALL_CONTEXT_MENUS_EVENT, closeMenu);
    return () => window.removeEventListener(CLOSE_ALL_CONTEXT_MENUS_EVENT, closeMenu);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const dismiss = () => setMenuOpen(false);
    window.addEventListener("blur", dismiss);
    return () => window.removeEventListener("blur", dismiss);
  }, [menuOpen]);
  const showUnreadActivity = isUnread && !isEditing && !isActive;

  return (
    <>
      <div
        className={`${TAB_CONTAINER_WIDTH_CLASSES} h-full`}
        onContextMenuCapture={(event) => {
          event.preventDefault();
          event.stopPropagation();
          window.dispatchEvent(new Event(CLOSE_ALL_CONTEXT_MENUS_EVENT));
          setMenuPoint({ x: event.clientX, y: event.clientY });
          setMenuOpen(true);
        }}
      >
        <div
          data-testid="sortable-tab"
          data-tab-id={tab.id}
          data-tab-title={tabTitle}
          data-pinned={isPinned ? "true" : "false"}
          data-active={isActive ? "true" : "false"}
          data-agent-activity-status={activityStatus}
          draggable={!isEditing}
          onDragStart={(e) => {
            if (isEditing) {
              e.preventDefault();
              return;
            }
            onDragStart?.(tab.id, e);
          }}
          onDragOver={(e) => {
            onDragOver?.(tab.id, e);
          }}
          onDragLeave={(e) => {
            onDragLeave?.(tab.id, e);
          }}
          onDrop={(e) => {
            onDrop?.(tab.id, e);
          }}
          onDragEnd={(e) => {
            onDragEnd?.(e);
          }}
          className={`group relative flex items-center h-full px-2 text-xs cursor-pointer select-none outline-none focus:outline-none focus-visible:outline-none transition-colors ${getTabStripBorderClasses(
            hasTabsToRight,
            { includeTopBorder: includeTopTabBorder }
          )} ${getDropIndicatorClasses(dropIndicator)} ${getTabRootStateClasses(isActive)} ${
            isDragging ? "opacity-40" : ""
          }`}
          onClick={() => {
            if (!isEditing) {
              onActivate(tab.id);
            }
          }}
          onDoubleClick={(e) => {
            if (isEditing) return;
            e.stopPropagation();
            handleRenameOpen();
          }}
          onMouseDown={(e) => {
            if (e.button === 1) {
              e.preventDefault();
            }
          }}
          onMouseUp={(e) => {
            if (e.button === 1) {
              e.preventDefault();
            }
          }}
          onAuxClick={(e) => {
            if (isEditing) return;
            if (e.button === 1) {
              e.preventDefault();
              e.stopPropagation();
              if (isPinned) return;
              onClose(tab.id);
            }
          }}
        >
          {/* 2px active selection marker on bottom edge */}
          {isActive && <span className={ACTIVE_TAB_INDICATOR_CLASSES} aria-hidden />}

          {/* Unread activity amber wash */}
          {showUnreadActivity && (
            <span aria-hidden className="pointer-events-none absolute inset-0 bg-amber-500/10" />
          )}

          {/* Leading tab icon */}
          {tab.type === "editor" ? (
            <File className="mr-1.5 size-3.5 text-blue-400 shrink-0" aria-hidden />
          ) : tab.type === "diff" ? (
            <GitCompare className="mr-1.5 size-3.5 text-amber-400 shrink-0" aria-hidden />
          ) : (
            <TerminalTabLeadingIcon
              agent={tabAgent}
              activityStatus={activityStatus}
              shell={tab.executable}
              showUnreadActivity={showUnreadActivity}
              isActive={isActive}
            />
          )}

          {/* Pin icon */}
          {isPinned && !isEditing && (
            <Pin className="mr-1 size-3 shrink-0 text-muted-foreground" aria-hidden />
          )}

          {/* Title or inline rename Input */}
          {isEditing ? (
            <input
              ref={setRenameInputElement}
              data-tab-rename-input="true"
              value={renameValue}
              aria-label={`Rename tab ${tabTitle}`}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing) return;
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitRename();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  cancelRename();
                }
              }}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => {
                e.stopPropagation();
                if (e.button === 1) e.preventDefault();
              }}
              onClick={(e) => e.stopPropagation()}
              onDoubleClick={(e) => e.stopPropagation()}
              onAuxClick={(e) => e.stopPropagation()}
              className="mr-1 h-5 min-w-[72px] flex-1 px-1 py-0 text-xs bg-background text-foreground border border-ring rounded outline-none font-mono"
              spellCheck={false}
            />
          ) : (
            <span className={`${TAB_LABEL_WIDTH_CLASSES} mr-1 font-mono text-[11px]`} title={displayTitle}>
              {displayTitle}
            </span>
          )}

          {/* Tab color dot swatch */}
          {tab.color && !isEditing && (
            <span
              className="mr-1.5 size-2 rounded-full shrink-0"
              style={{ backgroundColor: tab.color }}
              aria-hidden
            />
          )}

          {/* Collapse/Expand button if pane expanded */}
          {isExpanded && !isEditing && onToggleExpand && (
            <button
              type="button"
              className={`mr-1 flex items-center justify-center w-4 h-4 rounded-sm shrink-0 ${
                isActive
                  ? "text-muted-foreground hover:text-foreground hover:bg-muted"
                  : "text-transparent group-hover:text-muted-foreground hover:!text-foreground hover:!bg-muted"
              }`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(tab.id);
              }}
              title="Collapse pane"
              aria-label="Collapse pane"
            >
              <Minimize2 className="w-3 h-3" />
            </button>
          )}

          {/* Close button (hidden if pinned or editing) */}
          {!isEditing && !isPinned && (
            <button
              type="button"
              data-tab-close-button="true"
              aria-label={`Close tab ${tabTitle}`}
              title="Close tab"
              className={`relative z-10 flex items-center justify-center w-4 h-4 rounded-sm shrink-0 transition-opacity ${
                isActive
                  ? "text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:text-foreground focus-visible:bg-muted"
                  : "text-transparent group-hover:text-muted-foreground hover:!text-foreground hover:!bg-muted focus-visible:!text-foreground focus-visible:!bg-muted"
              }`}
              onPointerDown={(e) => {
                if (e.button === 0) e.stopPropagation();
              }}
              onMouseDown={(e) => {
                if (e.button === 0) e.stopPropagation();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose(tab.id);
              }}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      <SortableTabContextMenu
        tab={tab}
        isActive={isActive}
        open={menuOpen}
        point={menuPoint}
        tabCount={tabCount}
        hasTabsToRight={hasTabsToRight}
        hasTabsToLeft={hasTabsToLeft}
        isPinned={isPinned}
        onOpenChange={setMenuOpen}
        onActivate={onActivate}
        onClose={onClose}
        onCloseOthers={onCloseOthers}
        onCloseToRight={onCloseToRight}
        onCloseToLeft={onCloseToLeft}
        onRenameOpen={handleRenameOpen}
        onSetTabColor={onSetTabColor}
        onTogglePin={onTogglePin}
        canToggleViewMode={canToggleViewMode}
        isChatView={isChatView}
        onToggleViewMode={onToggleViewMode}
        canSplitTerminal={canSplitTerminal}
        onSplitTerminal={onSplitTerminal}
      />
    </>
  );
}
