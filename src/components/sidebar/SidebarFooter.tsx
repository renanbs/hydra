import { Settings, GitCommit, Crosshair } from "lucide-react";
import type { GitRepoStatus } from "./types";

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
}

export function SidebarFooter({ appVersion, gitStatus, onOpenSettings, onRevealCurrent }: SidebarFooterProps) {
  return (
    <div className="h-8 border-t border-worktree-sidebar-border px-3 flex items-center justify-between text-[10px] text-worktree-sidebar-foreground/50 font-mono bg-worktree-sidebar shrink-0">
      <button
        onClick={onOpenSettings}
        title="Open Settings (Ctrl+,)"
        className="flex items-center gap-1.5 hover:text-worktree-sidebar-foreground transition cursor-pointer"
      >
        <Settings className="w-3 h-3 text-worktree-sidebar-foreground/50 hover:text-emerald-400 transition" />
        <span>Settings</span>
      </button>
      <div className="flex items-center gap-2">
        {onRevealCurrent && (
          <button
            type="button"
            onClick={onRevealCurrent}
            title="Reveal active workspace"
            aria-label="Reveal active workspace"
            className="flex items-center justify-center p-1 rounded text-worktree-sidebar-foreground/50 hover:text-worktree-sidebar-foreground hover:bg-worktree-sidebar-accent transition cursor-pointer"
          >
            <Crosshair className="w-3 h-3" />
          </button>
        )}
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
    </div>
  );
}
