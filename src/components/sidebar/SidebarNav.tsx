import { useState, useEffect } from "react";
import { Search, CalendarClock, Smartphone, ListTree, Sparkles } from "lucide-react";

function useSidebarNavVisibility(key: string, defaultVisible: boolean) {
  const [visible, setVisible] = useState(() => {
    try {
      const v = localStorage.getItem(`hydra:sidebarNav:${key}`);
      if (v !== null) return v === "true";
    } catch {}
    return defaultVisible;
  });
  useEffect(() => {
    try {
      localStorage.setItem(`hydra:sidebarNav:${key}`, String(visible));
    } catch {}
  }, [key, visible]);
  return [visible, setVisible] as const;
}

export function SidebarNav({
  onOpenCommandPalette,
}: {
  onOpenCommandPalette?: () => void;
}) {
  const [showAutomations, setShowAutomations] = useSidebarNavVisibility("showAutomations", true);
  const [showMobile, setShowMobile] = useSidebarNavVisibility("showMobile", true);

  return (
    <div className="flex flex-col gap-0.5 px-2 pt-2 pb-1" data-contextual-tour-target="sidebar-navigation">
      <button
        type="button"
        onClick={() => onOpenCommandPalette?.()}
        aria-label="Search worktrees and browser tabs"
        className="group flex w-full items-center gap-2 rounded-md bg-worktree-sidebar-foreground/5 px-2 py-1.5 text-left text-[13px] font-medium tracking-tight text-worktree-sidebar-foreground/60 transition-colors hover:bg-worktree-sidebar-foreground/8"
      >
        <Search className="size-4 shrink-0 text-worktree-sidebar-foreground/30" strokeWidth={1.75} />
        <span className="flex-1">Search</span>
        <span className="pointer-events-none hidden shrink-0 items-center gap-1 group-hover:flex text-[10px] text-worktree-sidebar-foreground/40">⌘P</span>
      </button>

      <div className="group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] font-medium tracking-tight text-worktree-sidebar-foreground/60 hover:bg-worktree-sidebar-foreground/8 cursor-pointer transition-colors">
        <ListTree className="size-4 shrink-0 text-worktree-sidebar-foreground/30" strokeWidth={1.75} />
        <span className="flex-1">Tasks</span>
      </div>

      {showAutomations ? (
        <div className="group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] font-medium tracking-tight text-worktree-sidebar-foreground/60 hover:bg-worktree-sidebar-foreground/8 cursor-pointer transition-colors">
          <CalendarClock className="size-4 shrink-0 text-worktree-sidebar-foreground/30" strokeWidth={1.75} />
          <span className="flex-1">Automations</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowAutomations(false);
            }}
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-worktree-sidebar-foreground/10 text-worktree-sidebar-foreground/40 hover:text-worktree-sidebar-foreground transition"
            title="Hide from sidebar"
          >
            <span className="text-[10px]">✕</span>
          </button>
        </div>
      ) : null}

      <div className="group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] font-medium tracking-tight text-worktree-sidebar-foreground/60 hover:bg-worktree-sidebar-foreground/8 cursor-pointer transition-colors">
        <Sparkles className="size-4 shrink-0 text-worktree-sidebar-foreground/30" strokeWidth={1.75} />
        <span className="flex-1">Agent Dashboard</span>
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
      </div>

      {showMobile ? (
        <div className="group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] font-medium tracking-tight text-worktree-sidebar-foreground/60 hover:bg-worktree-sidebar-foreground/8 cursor-pointer transition-colors">
          <Smartphone className="size-4 shrink-0 text-worktree-sidebar-foreground/30" strokeWidth={1.75} />
          <span className="flex-1">Orca Mobile</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMobile(false);
            }}
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-worktree-sidebar-foreground/10 text-worktree-sidebar-foreground/40 hover:text-worktree-sidebar-foreground transition"
            title="Hide from sidebar"
          >
            <span className="text-[10px]">✕</span>
          </button>
        </div>
      ) : null}

      {!showAutomations || !showMobile ? (
        <div className="px-2 pt-1">
          <button
            onClick={() => {
              setShowAutomations(true);
              setShowMobile(true);
            }}
            className="text-[10px] text-muted-foreground hover:text-foreground underline cursor-pointer"
          >
            Show hidden items
          </button>
        </div>
      ) : null}
    </div>
  );
}
