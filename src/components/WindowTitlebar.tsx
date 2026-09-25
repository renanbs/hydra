import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";
import { PanelLeft, PanelRight } from "lucide-react";

export function WindowControls() {
  const [maximized, setMaximized] = useState(false);

  const handleMinimize = (e: React.MouseEvent) => {
    e.stopPropagation();
    invoke("window_minimize").catch(console.error);
  };

  const handleToggleMaximize = (e: React.MouseEvent) => {
    e.stopPropagation();
    invoke("window_toggle_maximize")
      .then(() => setMaximized(!maximized))
      .catch(console.error);
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    invoke("window_close").catch(console.error);
  };

  return (
    <div 
      className="window-controls"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button
        className="window-controls-btn"
        aria-label="Minimize"
        onClick={handleMinimize}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
          <path d="M0 5h10v1H0z" fill="currentColor" />
        </svg>
      </button>

      <button
        className="window-controls-btn"
        aria-label={maximized ? "Restore" : "Maximize"}
        onClick={handleToggleMaximize}
      >
        {maximized ? (
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
            <path d="M2 0v2H0v8h8V8h2V0H2zm6 9H1V3h7v6zM9 7H8V2H3V1h6v6z" fill="currentColor" />
          </svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
            <path d="M0 0v10h10V0H0zm9 9H1V1h8v8z" fill="currentColor" />
          </svg>
        )}
      </button>

      <button
        className="window-controls-btn window-controls-close"
        aria-label="Close"
        onClick={handleClose}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
          <path d="M1 0L0 1l4 4-4 4 1 1 4-4 4 4 1-1-4-4 4-4-1-1-4 4-4-4z" fill="currentColor" />
        </svg>
      </button>
    </div>
  );
}

interface WindowTitlebarProps {
  title: string;
  isLeftOpen: boolean;
  isRightOpen: boolean;
  leftWidth?: number;
  leftStyle?: React.CSSProperties;
  /**
   * Orca titlebar-left parity (AppWorkspaceShell): the header must track in-flight
   * drag resizes of the left sidebar. The committed `leftWidth` prop only updates on
   * mouseup, so the resize hook's draft callback writes `style.width` into this ref
   * imperatively — no re-render per rAF frame.
   */
  leftRef?: React.RefObject<HTMLDivElement | null>;
  onToggleLeft: () => void;
  onToggleRight: () => void;
}
export function WindowTitlebar({
  title,
  isLeftOpen,
  isRightOpen,
  leftWidth,
  leftStyle,
  leftRef,
  onToggleLeft,
  onToggleRight,
}: WindowTitlebarProps) {
  const handleDragMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      invoke("window_start_dragging").catch(console.error);
    }
  };

  return (
    <header className="h-9 flex items-stretch text-xs select-none shrink-0 cursor-default relative">
      {/* Left Column Header: Matches Orca .titlebar-left when open */}
      {isLeftOpen ? (
        <div
          ref={leftRef}
          data-tauri-drag-region
          style={{ width: leftWidth ? `${leftWidth}px` : undefined, ...leftStyle }}
          onMouseDown={handleDragMouseDown}
          className="h-9 flex items-center gap-2 px-3 shrink-0 border-r border-worktree-sidebar-border bg-worktree-sidebar text-worktree-sidebar-foreground select-none relative z-20 cursor-default shadow-[inset_0_-1px_0_var(--border)]"
        >
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleLeft();
            }}
            title="Toggle Left Sidebar (Ctrl+B)"
            className="p-1.5 rounded transition cursor-pointer text-worktree-sidebar-accent-foreground bg-worktree-sidebar-accent hover:opacity-90"
          >
            <PanelLeft className="w-3.5 h-3.5" />
          </button>
          <img src="/hydra-icon.png" alt="Hydra" className="w-4 h-4 rounded-sm object-contain pointer-events-none shrink-0" />
          <span className="font-semibold tracking-wider pointer-events-none text-worktree-sidebar-foreground">HYDRA</span>
          <span className="opacity-40 pointer-events-none">|</span>
          <span className="opacity-70 font-mono text-[11px] truncate pointer-events-none max-w-[120px]">{title}</span>
        </div>
      ) : null}

      {/* Main Titlebar: Matches Orca .titlebar-main-strip */}
      <div className="flex-1 flex items-center justify-between border-b border-border bg-card text-foreground px-3 min-w-0 relative">
        {/* When sidebar is closed, show sidebar toggle here */}
        {!isLeftOpen && (
          <div className="flex items-center gap-2 z-20 mr-3" onMouseDown={(e) => e.stopPropagation()}>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleLeft();
              }}
              title="Toggle Left Sidebar (Ctrl+B)"
              className="p-1.5 rounded transition cursor-pointer text-muted-foreground hover:text-foreground hover:bg-accent/60"
            >
              <PanelLeft className="w-3.5 h-3.5" />
            </button>
            <img src="/hydra-icon.png" alt="Hydra" className="w-4 h-4 rounded-sm object-contain pointer-events-none shrink-0" />
            <span className="font-semibold text-foreground tracking-wider pointer-events-none">HYDRA</span>
          </div>
        )}

        {/* Center Drag Region */}
        <div
          data-tauri-drag-region
          onMouseDown={handleDragMouseDown}
          className="flex-1 h-full flex items-center justify-center cursor-default z-10"
        >
          <span className="text-muted-foreground/60 text-[11px] tracking-wide font-medium pointer-events-none">
            Hydra Autonomous Development Environment
          </span>
        </div>

        {/* Right Controls: Toggle Right Sidebar + Window Controls */}
        <div className="flex items-center gap-1 z-20" onMouseDown={(e) => e.stopPropagation()}>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleRight();
            }}
            title="Toggle Right Panel (Ctrl+J)"
            className={`p-1.5 rounded transition mr-2 cursor-pointer ${
              isRightOpen ? "text-foreground bg-accent" : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
            }`}
          >
            <PanelRight className="w-3.5 h-3.5" />
          </button>
          <div className="w-[138px] shrink-0 pointer-events-none" />
        </div>

        <WindowControls />
      </div>
    </header>
  );
}
