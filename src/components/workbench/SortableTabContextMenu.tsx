// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Reference: src/renderer/src/components/tab-bar/SortableTabContextMenu.tsx

import React, { useEffect, useRef, useState, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import {
  MessageSquare,
  PanelBottomClose,
  PanelLeftClose,
  PanelRightClose,
  Pin,
  PinOff,
  Pencil,
  SquareTerminal,
  X,
  ListX,
  ChevronRight,
} from "lucide-react";
import type { TabItem } from "./WorkbenchTabBar";

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

export const CLOSE_ALL_CONTEXT_MENUS_EVENT = "orca-close-all-context-menus";

export interface SortableTabContextMenuProps {
  tab: TabItem;
  isActive: boolean;
  open: boolean;
  point: { x: number; y: number };
  tabCount: number;
  hasTabsToRight: boolean;
  hasTabsToLeft: boolean;
  isPinned?: boolean;
  onOpenChange: (open: boolean) => void;
  onActivate?: (tabId: string) => void;
  onClose: (tabId: string) => void;
  onCloseOthers: (tabId: string) => void;
  onCloseToRight: (tabId: string) => void;
  onCloseToLeft: (tabId: string) => void;
  onRenameOpen: () => void;
  onSetTabColor: (tabId: string, color: string | null) => void;
  onTogglePin?: (tabId: string) => void;
  canToggleViewMode?: boolean;
  isChatView?: boolean;
  onToggleViewMode?: () => void;
  canSplitTerminal?: boolean;
  onSplitTerminal?: (tabId: string, direction: "horizontal" | "vertical") => void;
}

const isMac = typeof navigator !== "undefined" && navigator.userAgent.includes("Mac");

export function SortableTabContextMenu({
  tab,
  isActive,
  open,
  point,
  tabCount,
  hasTabsToRight,
  hasTabsToLeft,
  isPinned = false,
  onOpenChange,
  onActivate,
  onClose,
  onCloseOthers,
  onCloseToRight,
  onCloseToLeft,
  onRenameOpen,
  onSetTabColor,
  onTogglePin,
  canToggleViewMode = false,
  isChatView = false,
  onToggleViewMode,
  canSplitTerminal = true,
  onSplitTerminal,
}: SortableTabContextMenuProps): React.JSX.Element | null {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [coords, setCoords] = useState({ x: point.x, y: point.y });
  const [isSplitSubmenuOpen, setIsSplitSubmenuOpen] = useState(false);
  const submenuRef = useRef<HTMLDivElement | null>(null);
  const submenuTimerRef = useRef<number | undefined>(undefined);

  useLayoutEffect(() => {
    if (!open) return;
    const menuEl = menuRef.current;
    if (!menuEl) return;

    const rect = menuEl.getBoundingClientRect();
    const padding = 8;
    let nextX = point.x;
    let nextY = point.y;

    if (nextX + rect.width > window.innerWidth - padding) {
      nextX = Math.max(padding, window.innerWidth - rect.width - padding);
    }
    if (nextY + rect.height > window.innerHeight - padding) {
      nextY = Math.max(padding, window.innerHeight - rect.height - padding);
    }

    setCoords({ x: Math.round(nextX), y: Math.round(nextY) });
  }, [open, point.x, point.y]);

  useEffect(() => {
    if (!open) return;

    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (menuRef.current?.contains(target)) return;
      if (submenuRef.current?.contains(target)) return;
      onOpenChange(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onOpenChange(false);
      }
    };

    const handleBlur = () => {
      onOpenChange(false);
    };

    const handleCloseAll = () => {
      onOpenChange(false);
    };

    window.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("blur", handleBlur);
    window.addEventListener(CLOSE_ALL_CONTEXT_MENUS_EVENT, handleCloseAll);

    return () => {
      window.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener(CLOSE_ALL_CONTEXT_MENUS_EVENT, handleCloseAll);
      clearTimeout(submenuTimerRef.current);
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  const splitRightShortcut = isMac ? "⌘\\" : "Ctrl+Shift+D";
  const splitDownShortcut = isMac ? "⌘Shift+\\" : "Ctrl+Shift+E";
  const closeShortcut = isMac ? "⌘W" : "Ctrl+W";

  const handleSplit = (direction: "horizontal" | "vertical") => {
    if (!isActive && onActivate) {
      onActivate(tab.id);
    }
    onSplitTerminal?.(tab.id, direction);
    onOpenChange(false);
  };

  const handleItemClick = (action: () => void) => {
    action();
    onOpenChange(false);
  };

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[13rem] max-w-[calc(100vw-1rem)] whitespace-nowrap rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md outline-none text-xs select-none"
      style={{ left: `${coords.x}px`, top: `${coords.y}px` }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Split terminal section */}
      {canSplitTerminal && onSplitTerminal && (
        <div
          className="relative"
          onMouseEnter={() => {
            clearTimeout(submenuTimerRef.current);
            setIsSplitSubmenuOpen(true);
          }}
          onMouseLeave={() => {
            submenuTimerRef.current = window.setTimeout(() => {
              setIsSplitSubmenuOpen(false);
            }, 150);
          }}
        >
          <div className="flex items-center justify-between rounded-sm px-2 py-1.5 cursor-pointer hover:bg-accent hover:text-accent-foreground">
            <div className="flex items-center gap-2">
              <SquareTerminal className="w-3.5 h-3.5 shrink-0" />
              <span>Split terminal</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground ml-auto" />
          </div>

          {isSplitSubmenuOpen && (
            <div
              ref={submenuRef}
              className="absolute left-full top-0 ml-1 min-w-[12rem] max-w-[calc(100vw-1rem)] whitespace-nowrap rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md outline-none z-50 text-xs"
              onMouseEnter={() => {
                clearTimeout(submenuTimerRef.current);
              }}
              onMouseLeave={() => {
                submenuTimerRef.current = window.setTimeout(() => {
                  setIsSplitSubmenuOpen(false);
                }, 150);
              }}
            >
              <button
                type="button"
                className="w-full flex items-center justify-between rounded-sm px-2 py-1.5 cursor-pointer hover:bg-accent hover:text-accent-foreground text-left"
                onClick={() => handleSplit("horizontal")}
              >
                <div className="flex items-center gap-2">
                  <PanelRightClose className="w-3.5 h-3.5 shrink-0" />
                  <span>Split terminal right</span>
                </div>
                <span className="ml-auto text-[10px] tracking-widest text-muted-foreground">
                  {splitRightShortcut}
                </span>
              </button>
              <button
                type="button"
                className="w-full flex items-center justify-between rounded-sm px-2 py-1.5 cursor-pointer hover:bg-accent hover:text-accent-foreground text-left"
                onClick={() => handleSplit("vertical")}
              >
                <div className="flex items-center gap-2">
                  <PanelBottomClose className="w-3.5 h-3.5 shrink-0" />
                  <span>Split terminal down</span>
                </div>
                <span className="ml-auto text-[10px] tracking-widest text-muted-foreground">
                  {splitDownShortcut}
                </span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Switch view if agent chat mode is supported */}
      {canToggleViewMode && onToggleViewMode && (
        <>
          <div className="h-px bg-border my-1" />
          <button
            type="button"
            className="w-full flex items-center gap-2 rounded-sm px-2 py-1.5 cursor-pointer hover:bg-accent hover:text-accent-foreground text-left"
            onClick={() => handleItemClick(onToggleViewMode)}
          >
            {isChatView ? (
              <SquareTerminal className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <MessageSquare className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>{isChatView ? "Switch to terminal view" : "Switch to chat view"}</span>
          </button>
        </>
      )}

      {/* Pin / Unpin Tab */}
      {onTogglePin && (
        <button
          type="button"
          className="w-full flex items-center gap-2 rounded-sm px-2 py-1.5 cursor-pointer hover:bg-accent hover:text-accent-foreground text-left"
          onClick={() => handleItemClick(() => onTogglePin(tab.id))}
        >
          {isPinned ? (
            <PinOff className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <Pin className="w-3.5 h-3.5 shrink-0" />
          )}
          <span>{isPinned ? "Unpin Tab" : "Pin Tab"}</span>
        </button>
      )}

      <div className="h-px bg-border my-1" />

      {/* Close Tab */}
      <button
        type="button"
        disabled={isPinned}
        className={`w-full flex items-center justify-between rounded-sm px-2 py-1.5 text-left ${
          isPinned
            ? "opacity-50 pointer-events-none text-muted-foreground"
            : "cursor-pointer hover:bg-accent hover:text-accent-foreground"
        }`}
        onClick={() => handleItemClick(() => onClose(tab.id))}
      >
        <div className="flex items-center gap-2">
          <X className="w-3.5 h-3.5 shrink-0" />
          <span>Close</span>
        </div>
        <span className="ml-auto text-[10px] tracking-widest text-muted-foreground">
          {closeShortcut}
        </span>
      </button>

      {/* Close Others */}
      <button
        type="button"
        disabled={tabCount <= 1}
        className={`w-full flex items-center gap-2 rounded-sm px-2 py-1.5 text-left ${
          tabCount <= 1
            ? "opacity-50 pointer-events-none text-muted-foreground"
            : "cursor-pointer hover:bg-accent hover:text-accent-foreground"
        }`}
        onClick={() => handleItemClick(() => onCloseOthers(tab.id))}
      >
        <ListX className="w-3.5 h-3.5 shrink-0" />
        <span>Close Others</span>
      </button>

      {/* Close Tabs to the Right */}
      <button
        type="button"
        disabled={!hasTabsToRight}
        className={`w-full flex items-center gap-2 rounded-sm px-2 py-1.5 text-left ${
          !hasTabsToRight
            ? "opacity-50 pointer-events-none text-muted-foreground"
            : "cursor-pointer hover:bg-accent hover:text-accent-foreground"
        }`}
        onClick={() => handleItemClick(() => onCloseToRight(tab.id))}
      >
        <PanelRightClose className="w-3.5 h-3.5 shrink-0" />
        <span>Close Tabs To The Right</span>
      </button>

      {/* Close Tabs to the Left */}
      <button
        type="button"
        disabled={!hasTabsToLeft}
        className={`w-full flex items-center gap-2 rounded-sm px-2 py-1.5 text-left ${
          !hasTabsToLeft
            ? "opacity-50 pointer-events-none text-muted-foreground"
            : "cursor-pointer hover:bg-accent hover:text-accent-foreground"
        }`}
        onClick={() => handleItemClick(() => onCloseToLeft(tab.id))}
      >
        <PanelLeftClose className="w-3.5 h-3.5 shrink-0" />
        <span>Close Tabs To The Left</span>
      </button>

      <div className="h-px bg-border my-1" />

      {/* Change Title */}
      <button
        type="button"
        className="w-full flex items-center gap-2 rounded-sm px-2 py-1.5 cursor-pointer hover:bg-accent hover:text-accent-foreground text-left"
        onClick={() => handleItemClick(onRenameOpen)}
      >
        <Pencil className="w-3.5 h-3.5 shrink-0" />
        <span>Change Title</span>
      </button>

      {/* Color swatches */}
      <div className="px-2 pt-1.5 pb-1">
        <div className="text-xs font-medium text-muted-foreground mb-1.5">Tab Color</div>
        <div className="flex flex-wrap gap-2">
          {TAB_COLORS.map((color) => {
            const isSelected = tab.color === color.value;
            return (
              <button
                key={color.label}
                type="button"
                title={color.label}
                className={`relative h-4 w-4 min-w-4 p-0 rounded-full border cursor-pointer transition-transform hover:scale-110 ${
                  isSelected ? "ring-1 ring-foreground/70 ring-offset-1 ring-offset-popover" : ""
                } ${
                  color.value ? "border-transparent" : "border-muted-foreground/50 bg-transparent"
                }`}
                style={color.value ? { backgroundColor: color.value } : undefined}
                onClick={() => {
                  onSetTabColor(tab.id, color.value);
                  onOpenChange(false);
                }}
              >
                {color.value === null && (
                  <span className="absolute inset-0 m-auto block h-px w-3 rotate-45 bg-muted-foreground/80" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
}
