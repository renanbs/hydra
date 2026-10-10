// Ported from Orca — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: orca/src/renderer/src/components/sidebar/index.tsx (sidebar shell + resize handle)
import React from "react";
import { cn } from "../../lib/utils";

/**
 * Left sidebar shell dimensions. Values mirror Orca's left sidebar
 * (components/sidebar/index.tsx MIN_WIDTH/MAX_WIDTH and the store's default
 * sidebarWidth of 280) so persisted widths clamp to the same bounds.
 */
export const LEFT_SIDEBAR_MIN_WIDTH = 220;
export const LEFT_SIDEBAR_MAX_WIDTH = 500;
export const LEFT_SIDEBAR_DEFAULT_WIDTH = 280;

// Why: straddle the sidebar/terminal seam so the divider sits on the border-r
// instead of leaving a blank strip between the hover target and the edge.
export const WORKTREE_SIDEBAR_RESIZE_HANDLE_CLASS_NAME =
  "group absolute -right-1.5 top-0 z-10 flex h-full w-3 cursor-col-resize items-stretch justify-center";
export const WORKTREE_SIDEBAR_RESIZE_HANDLE_LINE_CLASS_NAME =
  "h-full w-px bg-transparent transition-colors group-hover:bg-ring/50 group-active:bg-ring";

type SidebarChromeProps = {
  containerRef: React.RefObject<HTMLElement | null>;
  onResizeStart: (event: React.PointerEvent) => void;
  onResizeReset: () => void;
  isResizing: boolean;
  children: React.ReactNode;
};

/**
 * Orca's sidebar shell: the width-managed container plus the absolutely
 * positioned resize handle straddling the seam. The shell owns the width via
 * `useSidebarResize` (containerRef) so live drag widths never round-trip React.
 */
export function SidebarChrome({
  containerRef,
  onResizeStart,
  onResizeReset,
  isResizing,
  children,
}: SidebarChromeProps): React.JSX.Element {
  return (
    <aside
      ref={containerRef}
      data-sidebar=""
      className="flex flex-col border-r border-worktree-sidebar-border bg-worktree-sidebar shrink-0 overflow-hidden relative"
    >
      {children}

      {/* Resize handle */}
      <div
        data-sidebar-resize-handle=""
        className={cn(WORKTREE_SIDEBAR_RESIZE_HANDLE_CLASS_NAME, isResizing && "bg-ring/10")}
        onPointerDown={onResizeStart}
        onDoubleClick={onResizeReset}
      >
        <div
          className={cn(
            WORKTREE_SIDEBAR_RESIZE_HANDLE_LINE_CLASS_NAME,
            isResizing && "bg-ring"
          )}
        />
      </div>
    </aside>
  );
}
