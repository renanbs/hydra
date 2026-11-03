import { Settings, GitCommit, Crosshair, Kanban, MessageSquare } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { useTranslation } from "react-i18next";
import { translate } from "@/i18n/i18n";
import { useShortcutKeyDetails } from "@/hooks/useShortcutLabel";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ShortcutKeyCombo } from "../ShortcutKeyCombo";
import type { GitRepoStatus } from "./types";

// Why lazy: the composer (dialog + attachment reader) is only needed after the
// user asks for it; Orca warms the chunk from its menu, Hydra loads on click.
const SidebarFeedbackDialog = lazy(() =>
  import("./SidebarFeedbackDialog").then((module) => ({
    default: module.SidebarFeedbackDialog,
  }))
);

interface SidebarFooterProps {
  appVersion: string | null;
  gitStatus: GitRepoStatus | null;
  onOpenSettings: () => void;
  /**
   * Orca ScrollToCurrentWorkspaceToolbarButton parity: scroll the virtual viewport to
   * the session the workbench has active. Provided by the shell only in the workspaces
   * body — the button is hidden when the agents list owns the viewport.
   */
  onRevealCurrent?: () => void;
  /** Whether the workspace board panel is open (drives the trigger's pressed state). */
  workspaceBoardOpen: boolean;
  /** Orca SidebarToolbar parity: the board's only entry point, in the sidebar footer. */
  onToggleWorkspaceBoard: () => void;
}

export function SidebarFooter({ appVersion, gitStatus, onOpenSettings, onRevealCurrent, workspaceBoardOpen, onToggleWorkspaceBoard }: SidebarFooterProps) {
  // Subscribe this footer to locale changes before using translate().
  useTranslation();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  // Why sticky: the dialog animates itself closed off `open`, so unmounting on
  // close cuts that short.
  const [feedbackDialogMounted, setFeedbackDialogMounted] = useState(false);
  const settingsShortcut = useShortcutKeyDetails("app.settings");
  const settingsLabel = translate(
    "auto.components.sidebar.SidebarSettingsHelpMenu.a428c25998",
    "Settings"
  );
  const feedbackLabel = translate(
    "auto.components.sidebar.SidebarSettingsHelpMenu.4cf5b868d7",
    "Send Feedback"
  );
  const revealLabel = translate(
    "auto.components.sidebar.ScrollToCurrentWorkspaceToolbarButton.23989bb663",
    "Reveal active workspace"
  );

  return (
    <div className="h-8 border-t border-worktree-sidebar-border px-3 flex items-center justify-between text-[10px] text-worktree-sidebar-foreground/50 font-mono bg-worktree-sidebar shrink-0">
      <div className="flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label={settingsLabel}
            className="inline-flex size-6 items-center justify-center rounded-md text-worktree-sidebar-foreground/60 hover:text-worktree-sidebar-foreground hover:bg-worktree-sidebar-accent/60 transition-all outline-none cursor-pointer focus-visible:ring-[3px] focus-visible:ring-worktree-sidebar-ring/50"
          >
            <Settings data-hydra-settings-icon="" className="w-3.5 h-3.5 text-worktree-sidebar-foreground/50 transition" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={4} className="flex items-center gap-1.5">
          {settingsLabel}
          {settingsShortcut.keys.length > 0 ? (
            <ShortcutKeyCombo
              keys={settingsShortcut.keys}
              doubleTap={settingsShortcut.doubleTap}
              className="gap-0.5"
              keyCapClassName="min-w-0 border-background/20 bg-background/10 px-1 py-0 text-[10px] text-background shadow-none"
              separatorClassName="text-[10px] text-background/70"
            />
          ) : null}
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => {
              setFeedbackDialogMounted(true);
              setFeedbackOpen(true);
            }}
            aria-label={feedbackLabel}
            data-sidebar-feedback-trigger=""
            className="inline-flex size-6 items-center justify-center rounded-md text-worktree-sidebar-foreground/60 hover:text-worktree-sidebar-foreground hover:bg-worktree-sidebar-accent/60 transition-all outline-none cursor-pointer focus-visible:ring-[3px] focus-visible:ring-worktree-sidebar-ring/50"
          >
            <MessageSquare className="w-3.5 h-3.5 text-worktree-sidebar-foreground/50 transition" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={4}>
          {feedbackLabel}
        </TooltipContent>
      </Tooltip>
      </div>
      <div className="flex items-center gap-2">
        {onRevealCurrent && (
          <button
            type="button"
            onClick={onRevealCurrent}
            title={revealLabel}
            aria-label={revealLabel}
            className="inline-flex size-6 items-center justify-center rounded-md text-worktree-sidebar-foreground/60 hover:text-worktree-sidebar-foreground hover:bg-worktree-sidebar-accent/60 transition-all outline-none cursor-pointer focus-visible:ring-[3px] focus-visible:ring-worktree-sidebar-ring/50"
          >
            <Crosshair className="size-3.5" />
          </button>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={workspaceBoardOpen ? "secondary" : "ghost"}
              size="icon-xs"
              aria-label={translate(
                "auto.components.sidebar.SidebarToolbar.49f62c5665",
                "Workspace board"
              )}
              aria-pressed={workspaceBoardOpen}
              data-workspace-board-trigger=""
              onClick={onToggleWorkspaceBoard}
              className="text-muted-foreground"
            >
              <Kanban className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={4}>
            {workspaceBoardOpen
              ? translate(
                  "auto.components.sidebar.SidebarToolbar.a30e34eb5c",
                  "Close workspace board"
                )
              : translate(
                  "auto.components.sidebar.SidebarToolbar.49f62c5665",
                  "Workspace board"
                )}
          </TooltipContent>
        </Tooltip>
        {appVersion && (
          <span className="text-[10px] text-neutral-500" title={`Hydra v${appVersion}`}>v{appVersion}</span>
        )}
        {gitStatus?.head_commit && (
          <span className="flex items-center gap-1 text-neutral-400">
            <GitCommit className="w-2.5 h-2.5 text-neutral-500" />
            <span>{gitStatus.head_commit.slice(0,7)}</span>
          </span>
        )}
      </div>
      {feedbackDialogMounted ? (
        <Suspense fallback={null}>
          <SidebarFeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
        </Suspense>
      ) : null}
    </div>
  );
}
