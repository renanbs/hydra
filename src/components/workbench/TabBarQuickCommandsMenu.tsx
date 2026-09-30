// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Reference: src/renderer/src/components/tab-bar/TabBarQuickCommandsMenu.tsx

import React, { useState, useRef, useEffect } from "react";
import { Play, ChevronDown, TerminalSquare } from "lucide-react";
import { AgentBrandIcon } from "../AgentIcon";

export interface TabBarQuickCommandsMenuProps {
  onRunCommand?: (command: string) => void;
  commands?: Array<{ id: string; label: string; command: string; agent?: string }>;
}

export function TabBarQuickCommandsMenu({
  onRunCommand,
  commands = [],
}: TabBarQuickCommandsMenuProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 h-7 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition cursor-pointer"
      >
        <Play className="w-3 h-3 text-emerald-500" />
        <span className="font-medium text-[11px]">Quick Run</span>
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-popover text-popover-foreground border border-border/80 rounded-lg p-1 shadow-lg z-50 animate-in fade-in">
          {commands.length === 0 ? (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              No quick commands configured.
            </div>
          ) : (
            commands.map((cmd) => (
              <button
                key={cmd.id}
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onRunCommand?.(cmd.command);
                }}
                className="flex items-center justify-between w-full h-7 px-2 text-xs rounded-md text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer transition text-left"
              >
                <div className="flex items-center gap-2 truncate">
                  {cmd.agent ? (
                    <AgentBrandIcon agentId={cmd.agent} size={14} />
                  ) : (
                    <TerminalSquare className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span className="truncate">{cmd.label}</span>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
