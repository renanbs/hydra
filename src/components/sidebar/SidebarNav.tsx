import { Search } from "lucide-react";

export function SidebarNav({
  onOpenCommandPalette,
}: {
  onOpenCommandPalette?: () => void;
}) {
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
    </div>
  );
}
