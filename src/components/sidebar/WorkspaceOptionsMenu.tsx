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

export type GroupByMode = "none" | "workspace-status" | "repo";

export interface WorkspaceDisplayOptions {
  groupBy: GroupByMode;
  sortBy: "agent-activity" | "name" | "recent";
  hideSleeping: boolean;
  hideDefaultBranch: boolean;
  hideAutomationCreated: boolean;
  hideCliCreated: boolean;
  hideDetachedHead: boolean;
  filterProjectIds?: string[];
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
  const [openSubmenu, setOpenSubmenu] = useState<"sort" | "projectOrder" | "cardDisplay" | "show" | null>(null);
  const [projectSearch, setProjectSearch] = useState("");
  useEffect(() => {
    if (!isOpen) {
      setOpenSubmenu(null);
      setProjectSearch("");
    }
  }, [isOpen]);

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

      {/* Show Section — Orca: host + repo filter */}
      <div className="space-y-1">
        <div className="px-2 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
          Show
        </div>
        <div className="relative">
          <div
            onClick={() => setOpenSubmenu(openSubmenu === "show" ? null : "show")}
            className={`flex items-center justify-between px-2 py-1 text-[11px] text-popover-foreground hover:bg-accent rounded cursor-pointer transition-colors ${openSubmenu === "show" ? "bg-accent" : ""}`}
          >
            <div className="flex items-center gap-1.5">
              <span>Projects</span>
            </div>
            <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-0.5">
              <span>All projects ({projects.length})</span>
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
            </span>
          </div>
          {openSubmenu === "show" && (
            <div className="absolute left-full top-0 ml-1 w-64 rounded-lg border border-border bg-popover p-1 shadow-xl z-10 max-h-80 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-2 py-1">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">Projects - {options.filterProjectIds?.length ? options.filterProjectIds.length : projects.length}</span>
                {options.filterProjectIds?.length ? (
                  <button
                    onClick={() => onOptionsChange({ ...options, filterProjectIds: [] })}
                    className="text-[10px] text-primary hover:text-primary/80 font-medium cursor-pointer"
                  >
                    Clear
                  </button>
                ) : null}
              </div>
              {options.filterProjectIds?.length ? (
                <div className="flex flex-wrap gap-1 px-2 py-1">
                  {options.filterProjectIds.map((id) => {
                    const proj = projects.find((p) => p.id === id);
                    if (!proj) return null;
                    return (
                      <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent border border-border text-[10px] text-foreground">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {proj.name}
                        <button
                          onClick={() => {
                            const next = (options.filterProjectIds || []).filter((pid) => pid !== id);
                            onOptionsChange({ ...options, filterProjectIds: next });
                          }}
                          className="ml-1 hover:text-foreground cursor-pointer"
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>
              ) : null}
              <div className="px-1 py-1">
                <div className="relative">
                  <input
                    type="text"
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    placeholder="Add project..."
                    className="w-full bg-muted/50 border border-border rounded-md pl-7 pr-2 py-1 text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="absolute left-2 top-1.5 text-muted-foreground">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                  </span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto max-h-48 space-y-0.5 px-1">
                {projects
                  .filter((proj) => !projectSearch || proj.name.toLowerCase().includes(projectSearch.toLowerCase()))
                  .map((proj) => {
                    const isExplicitlySelected = options.filterProjectIds?.includes(proj.id);
                    const showAsSelected = options.filterProjectIds?.length ? isExplicitlySelected : true;
                    return (
                      <button
                        key={proj.id}
                        onClick={() => {
                          const current = options.filterProjectIds || [];
                          let next: string[];
                          if (current.length === 0) {
                            // Currently showing all, clicking one should filter to just that one
                            next = [proj.id];
                          } else if (current.includes(proj.id)) {
                            next = current.filter((id) => id !== proj.id);
                          } else {
                            next = [...current, proj.id];
                          }
                          onOptionsChange({ ...options, filterProjectIds: next });
                        }}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-[11px] text-left transition cursor-pointer ${showAsSelected ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${showAsSelected ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
                        <span className="truncate">{proj.name}</span>
                        {showAsSelected && options.filterProjectIds?.length ? <span className="ml-auto text-[10px] text-muted-foreground">✓</span> : null}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="h-px bg-border" />

      {/* Group by Toggle Group (Orca SidebarGroupByToggle 100%) */}
      <div className="space-y-1">
        <div className="px-2 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
          Group by
        </div>
        <div className="grid grid-cols-3 gap-1 p-0.5 rounded-lg bg-muted/40 border border-border">
          {[
            { id: "none", label: "None" },
            { id: "workspace-status", label: "Status" },
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

      {/* Sort & Display rows — Orca parity: submenus com radio */}
      <div className="space-y-0.5 text-[11px]">
        <div className="relative">
          <div
            onClick={() => setOpenSubmenu(openSubmenu === "sort" ? null : "sort")}
            className={`flex items-center justify-between px-2 py-1 hover:bg-accent rounded cursor-pointer text-popover-foreground transition-colors ${openSubmenu === "sort" ? "bg-accent" : ""}`}
          >
            <span>Sort by</span>
            <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-0.5">
              <span>{options.sortBy === "agent-activity" ? "Agent Activity" : options.sortBy === "name" ? "Name" : "Recent"}</span>
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
            </span>
          </div>
          {openSubmenu === "sort" && (
            <div className="absolute left-full top-0 ml-1 w-44 rounded-lg border border-border bg-popover p-1 shadow-xl z-10">
              {[
                { id: "agent-activity", label: "Agent Activity" },
                { id: "name", label: "Name" },
                { id: "recent", label: "Recent" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    onOptionsChange({ ...options, sortBy: opt.id as WorkspaceDisplayOptions["sortBy"] });
                    setOpenSubmenu(null);
                  }}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-[11px] transition cursor-pointer ${options.sortBy === opt.id ? "bg-accent text-foreground font-medium" : "text-popover-foreground hover:bg-accent"}`}
                >
                  <span>{opt.label}</span>
                  {options.sortBy === opt.id && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                </button>
              ))}
            </div>
          )}
        </div>
        {options.groupBy === "repo" && (
          <div className="relative">
            <div
              onClick={() => setOpenSubmenu(openSubmenu === "projectOrder" ? null : "projectOrder")}
              className={`flex items-center justify-between px-2 py-1 hover:bg-accent rounded cursor-pointer text-popover-foreground transition-colors ${openSubmenu === "projectOrder" ? "bg-accent" : ""}`}
            >
              <span>Project order</span>
              <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-0.5">
                <span>Manual</span>
                <ChevronRight className="w-3 h-3 text-muted-foreground" />
              </span>
            </div>
            {openSubmenu === "projectOrder" && (
              <div className="absolute left-full top-0 ml-1 w-44 rounded-lg border border-border bg-popover p-1 shadow-xl z-10">
                <button
                  onClick={() => setOpenSubmenu(null)}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded text-[11px] bg-accent text-foreground font-medium cursor-pointer"
                >
                  <span>Manual</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                </button>
                <div className="px-2 py-1 text-[10px] text-muted-foreground">Drag to reorder projects</div>
              </div>
            )}
          </div>
        )}
        <div className="relative">
          <div
            onClick={() => setOpenSubmenu(openSubmenu === "cardDisplay" ? null : "cardDisplay")}
            className={`flex items-center justify-between px-2 py-1 hover:bg-accent rounded cursor-pointer text-popover-foreground transition-colors ${openSubmenu === "cardDisplay" ? "bg-accent" : ""}`}
          >
            <span>Card display</span>
            <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-0.5">
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
            </span>
          </div>
          {openSubmenu === "cardDisplay" && (
            <div className="absolute left-full top-0 ml-1 w-48 rounded-lg border border-border bg-popover p-1 shadow-xl z-10">
              <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase">Card layout</div>
              <button
                onClick={() => setOpenSubmenu(null)}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded text-[11px] bg-accent text-foreground font-medium cursor-pointer"
              >
                <span>Detailed</span>
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              </button>
              <div className="px-2 py-1 text-[10px] text-muted-foreground">Compact via Settings → Appearance</div>
            </div>
          )}
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
