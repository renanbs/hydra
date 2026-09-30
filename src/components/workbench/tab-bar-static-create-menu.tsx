// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Reference: src/renderer/src/components/tab-bar/tab-bar-static-create-menu.tsx

import React from "react";
import { FilePlus, FileText, TerminalSquare } from "lucide-react";
import type { DetectedAgent } from "./WorkbenchTabBar";

export interface TabBarStaticCreateMenuProps {
  detectedAgents?: DetectedAgent[];
  onNewTerminalTab?: (shell?: string) => void;
  onNewFileTab?: () => void;
  onOpenFileTab?: () => void;
  onLaunchAgent?: (agent: DetectedAgent) => void;
  onOpenSettings?: () => void;
  onClose: () => void;
}

const isMac = typeof navigator !== "undefined" && navigator.userAgent.includes("Mac");
const CTRL = isMac ? "⌘" : "Ctrl";

export function TabBarStaticCreateMenu({
  onNewTerminalTab,
  onNewFileTab,
  onOpenFileTab,
  onClose,
}: TabBarStaticCreateMenuProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-0.5">
      <button
        type="button"
        className="flex items-center justify-between w-full h-7 px-2 text-xs rounded-md text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer transition select-none"
        onClick={() => {
          onClose();
          onNewTerminalTab?.();
        }}
      >
        <div className="flex items-center gap-2">
          <TerminalSquare className="w-3.5 h-3.5" />
          <span>New Terminal</span>
        </div>
        <span className="text-[10px] text-muted-foreground/70 font-mono">
          {CTRL}+Shift+T
        </span>
      </button>

      <button
        type="button"
        className="flex items-center justify-between w-full h-7 px-2 text-xs rounded-md text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer transition select-none"
        onClick={() => {
          onClose();
          onNewFileTab?.();
        }}
      >
        <div className="flex items-center gap-2">
          <FilePlus className="w-3.5 h-3.5" />
          <span>New File</span>
        </div>
        <span className="text-[10px] text-muted-foreground/70 font-mono">
          {CTRL}+N
        </span>
      </button>

      <button
        type="button"
        className="flex items-center justify-between w-full h-7 px-2 text-xs rounded-md text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer transition select-none"
        onClick={() => {
          onClose();
          onOpenFileTab?.();
        }}
      >
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5" />
          <span>Open File...</span>
        </div>
        <span className="text-[10px] text-muted-foreground/70 font-mono">
          {CTRL}+O
        </span>
      </button>
    </div>
  );
}
