import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Bell, FolderPlus, Plus, SlidersHorizontal, Sparkles } from "lucide-react";
import { cn } from "../../lib/utils";
import { translate } from "@/i18n/i18n";
import { useOptionalShortcutLabel } from "../../hooks/useShortcutLabel";
import { Popover, PopoverAnchor, PopoverArrow, PopoverContent } from "../ui/popover";
import type { GroupByMode } from "./WorkspaceOptionsMenu";
import type { HydraProject } from "./types";

type SidebarHeaderProps = {
  sidebarBody: "workspaces" | "agents";
  setSidebarBody: (body: "workspaces" | "agents") => void;
  /** Persisted `agentsSidebarIntroShown` (D01-009): true once the intro was acknowledged. */
  introShown: boolean;
  onAcknowledgeIntro: () => void;
  /** Orca sidebar-title parity: the grouping mode picks Projects (repo) or Workspaces. */
  groupBy: GroupByMode;
  onOpenAddRepoDialog: () => void;
  onOpenNewWorkspaceModal: (proj?: HydraProject) => void;
  optionsButtonRef: React.RefObject<HTMLButtonElement | null>;
  optionsMenuOpen: boolean;
  setOptionsMenuOpen: (open: boolean) => void;
  projects: HydraProject[];
};

export function SidebarHeader({
  sidebarBody,
  setSidebarBody,
  introShown,
  onAcknowledgeIntro,
  groupBy,
  onOpenAddRepoDialog,
  onOpenNewWorkspaceModal,
  optionsButtonRef,
  optionsMenuOpen,
  setOptionsMenuOpen,
  projects,
}: SidebarHeaderProps) {
  // Subscribe this header to locale changes before using translate().
  useTranslation();
  const agentsViewActive = sidebarBody === "agents";
  const introTitleId = useId();
  const introDescriptionId = useId();
  // D01-009 (Orca `SidebarHeader.tsx:28-38`): the intro is gated by the persisted
  // preference the shell writes, and dismisses through the popover's own close path
  // (outside click / Escape / "Got it") — not a raw localStorage flag.
  const introOpen = agentsViewActive && !introShown;
  // D01-012 (Orca `sidebar-header-actions.tsx`): the shortcut shown is the registry's,
  // so a remap is reflected instead of a hardcoded "Mod+N".
  const newWorkspaceShortcut = useOptionalShortcutLabel("workspace.create");
  const newWorkspaceLabel = translate(
    "auto.components.sidebar.SidebarHeader.92154beb7e",
    "New workspace"
  );
  const newWorkspaceTitle = newWorkspaceShortcut
    ? `${newWorkspaceLabel} (${newWorkspaceShortcut})`
    : newWorkspaceLabel;

  const sidebarTitle =
    groupBy === "repo"
      ? translate("dashboard.sidebar.projects", "Projects")
      : translate("dashboard.sidebar.workspaces", "Workspaces");

  const activityLabel = agentsViewActive
    ? translate("dashboard.sidebar.closeActivity", "Turn off activity view")
    : translate("dashboard.sidebar.openActivity", "View activity");

  return (
    <div className="mt-2 flex h-8 min-w-0 items-center justify-between gap-1.5 px-2">
      <div className="flex min-w-0 items-center gap-1">
        <span
          className="min-w-0 truncate select-none pl-2 pr-0.5 text-xs font-semibold text-muted-foreground/80"
          data-sidebar-section-title={groupBy === "repo" ? "projects" : "workspaces"}
        >
          {sidebarTitle}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {/* Bell Toggle - Orca pattern; the intro popover anchors to this button. */}
        <Popover
          open={introOpen}
          onOpenChange={(open) => {
            if (!open) {
              onAcknowledgeIntro();
            }
          }}
        >
          <PopoverAnchor asChild>
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
          </PopoverAnchor>
          <PopoverContent
            side="bottom"
            align="center"
            sideOffset={8}
            className="w-72 rounded-xl border border-worktree-sidebar-border bg-worktree-sidebar p-3.5 text-worktree-sidebar-foreground shadow-xl"
            onOpenAutoFocus={(event) => event.preventDefault()}
            aria-labelledby={introTitleId}
            aria-describedby={introDescriptionId}
          >
            <PopoverArrow />
            <div className="space-y-2.5">
              <div className="flex items-center gap-1.5">
                <Sparkles className="size-4 shrink-0 text-primary" aria-hidden="true" />
                <h3 id={introTitleId} className="text-sm font-semibold text-worktree-sidebar-foreground">
                  {translate("agentsSidebarIntro.migrated.title", "Agents are easier to find")}
                </h3>
              </div>
              <p
                id={introDescriptionId}
                className="text-xs leading-relaxed text-worktree-sidebar-foreground/60"
              >
                {translate(
                  "agentsSidebarIntro.migrated.description",
                  "Your Agents view is now a dedicated sidebar tab. Your activity and filters are preserved."
                )}
              </p>
              <div className="flex justify-end pt-0.5">
                <button
                  type="button"
                  onClick={onAcknowledgeIntro}
                  className={cn(
                    "inline-flex h-6 items-center justify-center rounded-md px-2.5 text-xs font-medium transition-all outline-none cursor-pointer",
                    "bg-primary text-primary-foreground hover:bg-primary/90",
                    "focus-visible:ring-[3px] focus-visible:ring-worktree-sidebar-ring/50"
                  )}
                >
                  {translate("agentsSidebarIntro.migrated.dismiss", "Got it")}
                </button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

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
              data-workspace-board-preserve-open=""
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
          title={newWorkspaceTitle}
          aria-label={newWorkspaceTitle}
          data-contextual-tour-target="workspace-create-control"
          className={cn(
            "inline-flex size-6 items-center justify-center rounded-md transition-all outline-none cursor-pointer",
            "focus-visible:ring-[3px] focus-visible:ring-worktree-sidebar-ring/50",
            "text-worktree-sidebar-foreground/60 hover:text-worktree-sidebar-foreground hover:bg-worktree-sidebar-accent/60"
          )}
        >
          <Plus className="size-3.5" strokeWidth={2.25} />
        </button>
      </div>
    </div>
  );
}
