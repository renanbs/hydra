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
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  options: WorkspaceDisplayOptions;
  projects: HydraProject[];
  onClose: () => void;
  onOptionsChange: (newOptions: WorkspaceDisplayOptions) => void;
}

export function WorkspaceOptionsMenu({
  isOpen,
  triggerRef,
  options,
  projects,
  onClose,
  onOptionsChange,
}: WorkspaceOptionsMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 80, left: 240 });

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (
        menuRef.current && 
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("mousedown", handleOutside);
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("mousedown", handleOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose, triggerRef]);

  // Ancoragem 100% igual ao Orca: side="right", align="start", sideOffset=8
  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current || !menuRef.current) return;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const menuRect = menuRef.current.getBoundingClientRect();
    const sideOffset = 8;
    const padding = 12;

    // Posiciona imediatamente à direita do botão acionador
    let left = triggerRect.right + sideOffset;
    let top = triggerRect.top;

    // Se vazar a borda direita da janela, inverte para a esquerda do botão
    if (left + menuRect.width > window.innerWidth - padding) {
      left = Math.max(padding, triggerRect.left - menuRect.width - sideOffset);
    }

    // Se vazar o rodapé da janela, empurra para cima
    if (top + menuRect.height > window.innerHeight - padding) {
      top = Math.max(padding, window.innerHeight - menuRect.height - padding);
    }

    setCoords({ top, left });
  }, [isOpen, triggerRef]);

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
      style={{ top: `${coords.top}px`, left: `${coords.left}px` }}
      onClick={(e) => e.stopPropagation()}
      className="fixed w-72 rounded-xl bg-popover border border-border p-2 shadow-2xl z-[99999] text-xs text-popover-foreground select-none space-y-2.5 font-sans"
    >
      {/* Header */}
      <div className="px-2 pt-1 font-semibold text-foreground text-xs">
        Workspace options
      </div>

      {/* Show Section */}
      <div className="space-y-1">
        <div className="px-2 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
          Show
        </div>
        <div className="flex items-center justify-between px-2 py-1 text-[11px] text-popover-foreground hover:bg-accent rounded cursor-pointer transition-colors">
          <div className="flex items-center gap-1.5">
            <span>Projects</span>
          </div>
          <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-0.5">
            <span>All projects ({projects.length})</span>
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
          </span>
        </div>
      </div>

      <div className="h-px bg-border" />

      {/* Group by Toggle Group (Orca SidebarGroupByToggle 100%) */}
      <div className="space-y-1">
        <div className="px-2 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
          Group by
        </div>
        <div className="grid grid-cols-4 gap-1 p-0.5 rounded-lg bg-muted/40 border border-border">
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
                    ? "bg-background text-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
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
        <div className="flex items-center justify-between px-2 py-1 hover:bg-accent rounded cursor-pointer text-popover-foreground transition-colors">
          <span>Sort by</span>
          <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-0.5">
            <span>Agent Activity</span>
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
          </span>
        </div>
        <div className="flex items-center justify-between px-2 py-1 hover:bg-accent rounded cursor-pointer text-popover-foreground transition-colors">
          <span>Project order</span>
          <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-0.5">
            <span>Manual</span>
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
          </span>
        </div>
        <div className="flex items-center justify-between px-2 py-1 hover:bg-accent rounded cursor-pointer text-popover-foreground transition-colors">
          <span>Card display</span>
          <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-0.5">
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
          </span>
        </div>
      </div>

      <div className="h-px bg-border" />

      {/* Filters Section (Orca SidebarWorkspaceFilterSection 100%) */}
      <div className="space-y-1">
        <div className="px-2 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
          Filters
        </div>

        {/* 1. Hide sleeping */}
        <div 
          onClick={() => handleToggle("hideSleeping")}
          className="flex items-center justify-between px-2 py-1 rounded hover:bg-accent cursor-pointer text-[11px] text-popover-foreground transition-colors"
        >
          <div className="flex items-center gap-2">
            <Moon className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Hide sleeping</span>
          </div>
          <div className={`w-7 h-4 rounded-full p-0.5 transition-colors ${options.hideSleeping ? "bg-emerald-600" : "bg-input"}`}>
            <div className={`w-3 h-3 rounded-full bg-white transition-transform ${options.hideSleeping ? "translate-x-3" : "translate-x-0"}`} />
          </div>
        </div>

        {/* 2. Hide default branch */}
        <div 
          onClick={() => handleToggle("hideDefaultBranch")}
          className="flex items-center justify-between px-2 py-1 rounded hover:bg-accent cursor-pointer text-[11px] text-popover-foreground transition-colors"
        >
          <div className="flex items-center gap-2">
            <GitBranch className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Hide default branch</span>
          </div>
          <div className={`w-7 h-4 rounded-full p-0.5 transition-colors ${options.hideDefaultBranch ? "bg-emerald-600" : "bg-input"}`}>
            <div className={`w-3 h-3 rounded-full bg-white transition-transform ${options.hideDefaultBranch ? "translate-x-3" : "translate-x-0"}`} />
          </div>
        </div>

        {/* 3. Hide automation-created */}
        <div 
          onClick={() => handleToggle("hideAutomationCreated")}
          className="flex items-center justify-between px-2 py-1 rounded hover:bg-accent cursor-pointer text-[11px] text-popover-foreground transition-colors"
        >
          <div className="flex items-center gap-2">
            <CalendarClock className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Hide automation-created</span>
          </div>
          <div className={`w-7 h-4 rounded-full p-0.5 transition-colors ${options.hideAutomationCreated ? "bg-emerald-600" : "bg-input"}`}>
            <div className={`w-3 h-3 rounded-full bg-white transition-transform ${options.hideAutomationCreated ? "translate-x-3" : "translate-x-0"}`} />
          </div>
        </div>

        {/* 4. Hide CLI-created */}
        <div 
          onClick={() => handleToggle("hideCliCreated")}
          className="flex items-center justify-between px-2 py-1 rounded hover:bg-accent cursor-pointer text-[11px] text-popover-foreground transition-colors"
        >
          <div className="flex items-center gap-2">
            <SquareTerminal className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Hide CLI-created</span>
          </div>
          <div className={`w-7 h-4 rounded-full p-0.5 transition-colors ${options.hideCliCreated ? "bg-emerald-600" : "bg-input"}`}>
            <div className={`w-3 h-3 rounded-full bg-white transition-transform ${options.hideCliCreated ? "translate-x-3" : "translate-x-0"}`} />
          </div>
        </div>

        {/* 5. Hide detached HEAD */}
        <div 
          onClick={() => handleToggle("hideDetachedHead")}
          className="flex items-center justify-between px-2 py-1 rounded hover:bg-accent cursor-pointer text-[11px] text-popover-foreground transition-colors"
        >
          <div className="flex items-center gap-2">
            <GitCommitHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Hide detached HEAD</span>
          </div>
          <div className={`w-7 h-4 rounded-full p-0.5 transition-colors ${options.hideDetachedHead ? "bg-emerald-600" : "bg-input"}`}>
            <div className={`w-3 h-3 rounded-full bg-white transition-transform ${options.hideDetachedHead ? "translate-x-3" : "translate-x-0"}`} />
          </div>
        </div>
      </div>
    </div>
  );
}
