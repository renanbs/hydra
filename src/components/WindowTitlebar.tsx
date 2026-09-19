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
  onToggleLeft: () => void;
  onToggleRight: () => void;
}

export function WindowTitlebar({
  title,
  isLeftOpen,
  isRightOpen,
  onToggleLeft,
  onToggleRight,
}: WindowTitlebarProps) {
  const handleDragMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      invoke("window_start_dragging").catch(console.error);
    }
  };

  return (
    <header className="h-9 border-b border-[#222] px-3 flex items-center justify-between text-xs bg-[#111214] select-none shrink-0 cursor-default relative">
      {/* Left Cluster: App Brand + Sidebar Toggle (Orca Style) */}
      <div 
        className="flex items-center gap-2 z-20"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleLeft();
          }}
          title="Toggle Left Sidebar (Ctrl+B)"
          className={`p-1.5 rounded transition cursor-pointer ${
            isLeftOpen ? "text-emerald-400 bg-neutral-800" : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60"
          }`}
        >
          <PanelLeft className="w-3.5 h-3.5" />
        </button>
        <img src="/hydra-icon.png" alt="Hydra" className="w-4 h-4 rounded-sm object-contain pointer-events-none shrink-0" />
        <span className="font-semibold text-neutral-200 tracking-wider pointer-events-none">HYDRA</span>
        <span className="text-neutral-600 pointer-events-none">|</span>
        <span className="text-neutral-400 font-mono text-[11px] pointer-events-none">{title}</span>
      </div>

      {/* Center Drag Region: Cobre o centro e permite arrastar a janela */}
      <div 
        data-tauri-drag-region
        onMouseDown={handleDragMouseDown}
        className="flex-1 h-full flex items-center justify-center cursor-default z-10"
      >
        <span className="text-neutral-500 text-[11px] tracking-wide font-medium pointer-events-none">
          Hydra Autonomous Development Environment
        </span>
      </div>

      {/* Right Controls: Toggle Agent Panel + Spacer for Window Controls */}
      <div 
        className="flex items-center gap-1 z-20"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleRight();
          }}
          title="Toggle Agent Panel (Ctrl+J)"
          className={`p-1.5 rounded transition mr-2 cursor-pointer ${
            isRightOpen ? "text-emerald-400 bg-neutral-800" : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60"
          }`}
        >
          <PanelRight className="w-3.5 h-3.5" />
        </button>
        <div className="w-[138px] shrink-0 pointer-events-none" />
      </div>

      <WindowControls />
    </header>
  );
}
