import { useState, useId, useEffect } from "react";
import { Bell, FolderPlus, Plus, SlidersHorizontal, Sparkles } from "lucide-react";
import { cn } from "../../lib/utils";

type SidebarHeaderProps = {
  sidebarBody: "workspaces" | "agents";
  setSidebarBody: (body: "workspaces" | "agents") => void;
  onOpenAddRepoDialog: () => void;
  onOpenNewWorkspaceModal: (proj?: any) => void;
  optionsButtonRef: React.RefObject<HTMLButtonElement | null>;
  optionsMenuOpen: boolean;
  setOptionsMenuOpen: (open: boolean) => void;
  projects: any[];
};

export function SidebarHeader({
  sidebarBody,
  setSidebarBody,
  onOpenAddRepoDialog,
  onOpenNewWorkspaceModal,
  optionsButtonRef,
  optionsMenuOpen,
  setOptionsMenuOpen,
  projects,
}: SidebarHeaderProps) {
  const agentsViewActive = sidebarBody === "agents";
  const introShownKey = "hydra:agents_sidebar_intro_shown";
  const [introOpen, setIntroOpen] = useState(false);
  const introTitleId = useId();
  const introDescriptionId = useId();

  // Show intro once for users migrating to agents view
  useEffect(() => {
    const introShown = localStorage.getItem(introShownKey) === "true";
    if (agentsViewActive && !introShown) {
      setIntroOpen(true);
    }
  }, [agentsViewActive]);

  const acknowledgeIntro = () => {
    localStorage.setItem(introShownKey, "true");
    setIntroOpen(false);
  };

  const sidebarTitle = "Projects";

  const activityLabel = agentsViewActive ? "Turn off activity view" : "View activity";

  return (
    <div className="mt-2 flex h-8 min-w-0 items-center justify-between gap-1.5 px-2">
      <div className="flex min-w-0 items-center gap-1">
        <span
          className="min-w-0 truncate select-none pl-2 pr-0.5 text-[11px] font-semibold uppercase tracking-wider text-worktree-sidebar-foreground/70"
          data-sidebar-section-title="projects"
        >
          {sidebarTitle}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {/* Bell Toggle - Orca pattern */}
        <span className="inline-flex shrink-0">
          <button
            type="button"
            className={cn(
              "inline-flex size-6 items-center justify-center rounded-md transition-all outline-none cursor-pointer",
              "focus-visible:ring-[3px] focus-visible:ring-worktree-sidebar-ring/50",
              "text-worktree-sidebar-foreground/60 hover:text-worktree-sidebar-foreground hover:bg-worktree-sidebar-accent/60",
              agentsViewActive && "bg-worktree-sidebar-accent text-worktree-sidebar-accent-foreground"
            )}
            aria-label={activityLabel}
            aria-pressed={agentsViewActive}
            onClick={() => setSidebarBody(agentsViewActive ? "workspaces" : "agents")}
            title={activityLabel}
          >
            <Bell className="size-3.5" strokeWidth={2.25} />
          </button>
        </span>

        {agentsViewActive ? null : (
          <>
            {/* Orca SidebarWorkspaceOptionsMenu Trigger com ref */}
            <button
              ref={optionsButtonRef}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOptionsMenuOpen(!optionsMenuOpen);
              }}
              title="Workspace display options"
              aria-label="Workspace display options"
              aria-haspopup="menu"
              aria-expanded={optionsMenuOpen}
              className={cn(
                "inline-flex size-6 items-center justify-center rounded-md transition-all outline-none cursor-pointer",
                "focus-visible:ring-[3px] focus-visible:ring-worktree-sidebar-ring/50",
                optionsMenuOpen
                  ? "bg-worktree-sidebar-accent text-worktree-sidebar-accent-foreground"
                  : "text-worktree-sidebar-foreground/60 hover:text-worktree-sidebar-foreground hover:bg-worktree-sidebar-accent/60"
              )}
            >
              <SlidersHorizontal className="size-3.5" strokeWidth={2.25} />
            </button>

            <button
              type="button"
              onClick={onOpenAddRepoDialog}
              title="Add project (Folder / Clone)"
              aria-label="Add project (Folder / Clone)"
              className={cn(
                "inline-flex size-6 items-center justify-center rounded-md transition-all outline-none cursor-pointer",
                "focus-visible:ring-[3px] focus-visible:ring-worktree-sidebar-ring/50",
                "text-worktree-sidebar-foreground/60 hover:text-worktree-sidebar-foreground hover:bg-worktree-sidebar-accent/60"
              )}
            >
              <FolderPlus className="size-3.5" strokeWidth={2.25} />
            </button>
          </>
        )}

        <button
          type="button"
          onClick={() => {
            if (projects.length > 0) {
              onOpenNewWorkspaceModal(projects[0]);
            } else {
              onOpenNewWorkspaceModal();
            }
          }}
          title="New workspace (Mod+N)"
          aria-label="New workspace (Mod+N)"
          className={cn(
            "inline-flex size-6 items-center justify-center rounded-md transition-all outline-none cursor-pointer",
            "focus-visible:ring-[3px] focus-visible:ring-worktree-sidebar-ring/50",
            "text-worktree-sidebar-foreground/60 hover:text-worktree-sidebar-foreground hover:bg-worktree-sidebar-accent/60"
          )}
        >
          <Plus className="size-3.5" strokeWidth={2.25} />
        </button>

        {/* Intro Popover for Agents view */}
        {introOpen && (
          <div
            className="absolute right-0 top-10 w-72 rounded-xl border border-worktree-sidebar-border bg-worktree-sidebar p-3.5 text-worktree-sidebar-foreground shadow-xl z-50"
            role="dialog"
            aria-labelledby={introTitleId}
            aria-describedby={introDescriptionId}
          >
            <div className="space-y-2.5">
              <div className="flex items-center gap-1.5">
                <Sparkles className="size-4 shrink-0 text-emerald-400" aria-hidden="true" />
                <h3 id={introTitleId} className="text-sm font-semibold text-worktree-sidebar-foreground">
                  Agents are easier to find
                </h3>
              </div>
              <p id={introDescriptionId} className="text-xs leading-relaxed text-worktree-sidebar-foreground/60">
                Your Agents view is now a dedicated sidebar tab. All agent sessions across projects are consolidated here, grouped by state (blocked first).
              </p>
              <div className="flex justify-end pt-0.5">
                <button
                  onClick={acknowledgeIntro}
                  className="text-xs px-2.5 py-1 rounded-lg bg-worktree-sidebar-accent hover:bg-worktree-sidebar-accent/80 text-worktree-sidebar-foreground transition cursor-pointer"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}