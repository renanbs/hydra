import { useRef, useEffect, useLayoutEffect, useState } from "react";
import { 
  ChevronRight, 
  Moon, 
  GitBranch, 
  CalendarClock, 
  SquareTerminal, 
  GitCommitHorizontal
} from "lucide-react";
import type { HydraProject } from "./WorktreeSidebar";

export type GroupByMode = "none" | "workspace-status" | "pr-status" | "repo";

export interface WorkspaceDisplayOptions {
  groupBy: GroupByMode;
  sortBy: "agent-activity" | "name" | "recent";
  hideSleeping: boolean;
  hideDefaultBranch: boolean;
  hideAutomationCreated: boolean;
  hideCliCreated: boolean;
  hideDetachedHead: boolean;
}

interface WorkspaceOptionsMenuProps {
  isOpen: boolean;
  options: WorkspaceDisplayOptions;
  projects: HydraProject[];
  onClose: () => void;
  onOptionsChange: (newOptions: WorkspaceDisplayOptions) => void;
}

export function WorkspaceOptionsMenu({
  isOpen,
  options,
  projects,
  onClose,
  onOptionsChange,
}: WorkspaceOptionsMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [coords, setCoords] = useState<{ top: number; right: number }>({ top: 80, right: 12 });

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("mousedown", handleOutside);
    }
    return () => window.removeEventListener("mousedown", handleOutside);
  }, [isOpen, onClose]);

  // Medição e restrição para caber 100% na viewport
  useLayoutEffect(() => {
    if (!isOpen || !menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const padding = 12;

    let top = 80;
    if (top + rect.height > window.innerHeight - padding) {
      top = Math.max(padding, window.innerHeight - rect.height - padding);
    }

    setCoords({ top, right: 12 });
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggle = (key: keyof WorkspaceDisplayOptions) => {
    onOptionsChange({
      ...options,
      [key]: !options[key],
    });
  };

  return (
    <div
      ref={menuRef}
      style={{ top: `${coords.top}px`, right: `${coords.right}px` }}
      onClick={(e) => e.stopPropagation()}
      className="fixed w-72 rounded-xl bg-[#141518] border border-[#28292e] p-2 shadow-2xl z-[99999] text-xs text-neutral-200 select-none space-y-2.5 font-sans"
    >
      {/* Header */}
      <div className="px-2 pt-1 font-semibold text-neutral-100 text-xs">
        Workspace options
      </div>

      {/* Show Section */}
      <div className="space-y-1">
        <div className="px-2 text-[10px] uppercase font-bold text-neutral-500 tracking-wider">
          Show
        </div>
        <div className="flex items-center justify-between px-2 py-1 text-[11px] text-neutral-300 hover:bg-neutral-800/50 rounded cursor-pointer">
          <div className="flex items-center gap-1.5">
            <span>Projects</span>
          </div>
          <span className="text-[10px] text-neutral-500 font-mono flex items-center gap-0.5">
            <span>All projects ({projects.length})</span>
            <ChevronRight className="w-3 h-3 text-neutral-600" />
          </span>
        </div>
      </div>

      <div className="h-px bg-[#222327]" />

      {/* Group by Toggle Group */}
      <div className="space-y-1">
        <div className="px-2 text-[10px] uppercase font-bold text-neutral-500 tracking-wider">
          Group by
        </div>
        <div className="grid grid-cols-4 gap-1 p-0.5 rounded-lg bg-[#0e0f11] border border-[#222327]">
          {[
            { id: "none", label: "None" },
            { id: "workspace-status", label: "Status" },
            { id: "pr-status", label: "PR" },
            { id: "repo", label: "Project" },
          ].map((item) => {
            const isSelected = options.groupBy === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onOptionsChange({ ...options, groupBy: item.id as GroupByMode })}
                className={`py-1 text-[10px] font-medium rounded transition text-center cursor-pointer ${
                  isSelected
                    ? "bg-neutral-800 text-white font-semibold shadow-xs"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sort & Display rows */}
      <div className="space-y-0.5 text-[11px]">
        <div className="flex items-center justify-between px-2 py-1 hover:bg-neutral-800/50 rounded cursor-pointer text-neutral-300">
          <span>Sort by</span>
          <span className="text-[10px] text-neutral-500 font-mono flex items-center gap-0.5">
            <span>Agent Activity</span>
            <ChevronRight className="w-3 h-3 text-neutral-600" />
          </span>
        </div>
        <div className="flex items-center justify-between px-2 py-1 hover:bg-neutral-800/50 rounded cursor-pointer text-neutral-300">
          <span>Project order</span>
          <span className="text-[10px] text-neutral-500 font-mono flex items-center gap-0.5">
            <span>Manual</span>
            <ChevronRight className="w-3 h-3 text-neutral-600" />
          </span>
        </div>
        <div className="flex items-center justify-between px-2 py-1 hover:bg-neutral-800/50 rounded cursor-pointer text-neutral-300">
          <span>Card display</span>
          <span className="text-[10px] text-neutral-500 font-mono flex items-center gap-0.5">
            <ChevronRight className="w-3 h-3 text-neutral-600" />
          </span>
        </div>
      </div>

      <div className="h-px bg-[#222327]" />

      {/* Filters Section */}
      <div className="space-y-1">
        <div className="px-2 text-[10px] uppercase font-bold text-neutral-500 tracking-wider">
          Filters
        </div>

        {/* 1. Hide sleeping */}
        <div 
          onClick={() => handleToggle("hideSleeping")}
          className="flex items-center justify-between px-2 py-1 rounded hover:bg-neutral-800/50 cursor-pointer text-[11px] text-neutral-300"
        >
          <div className="flex items-center gap-2">
            <Moon className="w-3.5 h-3.5 text-neutral-400" />
            <span>Hide sleeping</span>
          </div>
          <div className={`w-7 h-4 rounded-full p-0.5 transition-colors ${options.hideSleeping ? "bg-emerald-500" : "bg-neutral-800"}`}>
            <div className={`w-3 h-3 rounded-full bg-white transition-transform ${options.hideSleeping ? "translate-x-3" : "translate-x-0"}`} />
          </div>
        </div>

        {/* 2. Hide default branch */}
        <div 
          onClick={() => handleToggle("hideDefaultBranch")}
          className="flex items-center justify-between px-2 py-1 rounded hover:bg-neutral-800/50 cursor-pointer text-[11px] text-neutral-300"
        >
          <div className="flex items-center gap-2">
            <GitBranch className="w-3.5 h-3.5 text-neutral-400" />
            <span>Hide default branch</span>
          </div>
          <div className={`w-7 h-4 rounded-full p-0.5 transition-colors ${options.hideDefaultBranch ? "bg-emerald-500" : "bg-neutral-800"}`}>
            <div className={`w-3 h-3 rounded-full bg-white transition-transform ${options.hideDefaultBranch ? "translate-x-3" : "translate-x-0"}`} />
          </div>
        </div>

        {/* 3. Hide automation-created */}
        <div 
          onClick={() => handleToggle("hideAutomationCreated")}
          className="flex items-center justify-between px-2 py-1 rounded hover:bg-neutral-800/50 cursor-pointer text-[11px] text-neutral-300"
        >
          <div className="flex items-center gap-2">
            <CalendarClock className="w-3.5 h-3.5 text-neutral-400" />
            <span>Hide automation-created</span>
          </div>
          <div className={`w-7 h-4 rounded-full p-0.5 transition-colors ${options.hideAutomationCreated ? "bg-emerald-500" : "bg-neutral-800"}`}>
            <div className={`w-3 h-3 rounded-full bg-white transition-transform ${options.hideAutomationCreated ? "translate-x-3" : "translate-x-0"}`} />
          </div>
        </div>

        {/* 4. Hide CLI-created */}
        <div 
          onClick={() => handleToggle("hideCliCreated")}
          className="flex items-center justify-between px-2 py-1 rounded hover:bg-neutral-800/50 cursor-pointer text-[11px] text-neutral-300"
        >
          <div className="flex items-center gap-2">
            <SquareTerminal className="w-3.5 h-3.5 text-neutral-400" />
            <span>Hide CLI-created</span>
          </div>
          <div className={`w-7 h-4 rounded-full p-0.5 transition-colors ${options.hideCliCreated ? "bg-emerald-500" : "bg-neutral-800"}`}>
            <div className={`w-3 h-3 rounded-full bg-white transition-transform ${options.hideCliCreated ? "translate-x-3" : "translate-x-0"}`} />
          </div>
        </div>

        {/* 5. Hide detached HEAD */}
        <div 
          onClick={() => handleToggle("hideDetachedHead")}
          className="flex items-center justify-between px-2 py-1 rounded hover:bg-neutral-800/50 cursor-pointer text-[11px] text-neutral-300"
        >
          <div className="flex items-center gap-2">
            <GitCommitHorizontal className="w-3.5 h-3.5 text-neutral-400" />
            <span>Hide detached HEAD</span>
          </div>
          <div className={`w-7 h-4 rounded-full p-0.5 transition-colors ${options.hideDetachedHead ? "bg-emerald-500" : "bg-neutral-800"}`}>
            <div className={`w-3 h-3 rounded-full bg-white transition-transform ${options.hideDetachedHead ? "translate-x-3" : "translate-x-0"}`} />
          </div>
        </div>
      </div>
    </div>
  );
}
