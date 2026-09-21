import { useState, useId, useEffect } from "react";
import { Bell, FolderPlus } from "lucide-react";
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
    <div className="mt-2 flex h-7 min-w-0 items-center justify-between gap-1.5 px-2">
      <div className="flex min-w-0 items-center gap-1">
        <span
          className="min-w-0 truncate select-none pl-2 pr-0.5 text-xs font-semibold text-worktree-sidebar-foreground/70 tracking-wider uppercase"
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
              "p-1 rounded transition cursor-pointer",
              "text-worktree-sidebar-foreground/60 hover:text-worktree-sidebar-foreground hover:bg-worktree-sidebar-accent/60",
              agentsViewActive && "bg-worktree-sidebar-accent text-worktree-sidebar-accent-foreground"
            )}
            aria-label={activityLabel}
            aria-pressed={agentsViewActive}
            onClick={() => setSidebarBody(agentsViewActive ? "workspaces" : "agents")}
            title={activityLabel}
          >
            <Bell className="w-3.5 h-3.5" strokeWidth={2.25} />
          </button>
        </span>

        {agentsViewActive ? null : (
          <>
            {/* Orca SidebarWorkspaceOptionsMenu Trigger com ref */}
            <button
              ref={optionsButtonRef}
              onClick={(e) => {
                e.stopPropagation();
                setOptionsMenuOpen(!optionsMenuOpen);
              }}
              title="Workspace display options"
              className={`p-1 rounded transition cursor-pointer ${
                optionsMenuOpen
                  ? "bg-worktree-sidebar-accent text-worktree-sidebar-accent-foreground"
                  : "text-worktree-sidebar-foreground/60 hover:text-worktree-sidebar-foreground hover:bg-worktree-sidebar-accent/60"
              }`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="21" x2="4" y2="14"></line>
                <line x1="4" y1="10" x2="4" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12" y2="3"></line>
                <line x1="20" y1="21" x2="20" y2="16"></line>
                <line x1="20" y1="12" x2="20" y2="3"></line>
                <line x1="1" y1="14" x2="7" y2="14"></line>
                <line x1="9" y1="8" x2="15" y2="8"></line>
                <line x1="17" y1="16" x2="23" y2="16"></line>
              </svg>
            </button>

            <button
              onClick={onOpenAddRepoDialog}
              title="Add project (Folder / Clone)"
              className="p-1 rounded text-worktree-sidebar-foreground/60 hover:text-worktree-sidebar-foreground hover:bg-worktree-sidebar-accent/60 transition cursor-pointer"
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </button>
          </>
        )}

        <button
          onClick={() => {
            if (projects.length > 0) {
              onOpenNewWorkspaceModal(projects[0]);
            } else {
              onOpenNewWorkspaceModal();
            }
          }}
          title="New workspace (Mod+N)"
          className="p-1 rounded text-worktree-sidebar-foreground/60 hover:text-worktree-sidebar-foreground hover:bg-worktree-sidebar-accent/60 transition cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
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
                <svg className="w-4 h-4 shrink-0 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
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