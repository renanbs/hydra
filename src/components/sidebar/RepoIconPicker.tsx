// Inline project-icon picker for the repo header menu (Orca `Change Project
// Icon`). Orca opens the repository-icon section of its settings pane; Hydra's
// project glyphs are a catalog field with no settings section yet, so the header
// menu owns a small curated grid plus Clear instead of routing to Settings.
import React from "react";
import { X } from "lucide-react";
import type { RepoIcon } from "../../shared/repo-icon";
import { cn } from "../../lib/utils";
import { REPO_ICON_EMOJI_CHOICES } from "../../lib/repo-icon-write";
import { RepoIconGlyph } from "../repo/repo-icon";
import { stopRepoHeaderMenuEvent } from "./ProjectHeaderActions";

export interface RepoIconPickerProps {
  /** Display label, also the accessible name of the dialog. */
  projectName: string;
  currentIcon: RepoIcon | null | undefined;
  /** Viewport anchor: the project menu's own coordinates. */
  x: number;
  y: number;
  onPick: (repoIcon: RepoIcon) => void;
  onClear: () => void;
  onClose: () => void;
}

/**
 * Orca `RepositoryIconPicker` narrowed to the emoji tab + reset: the emoji grid
 * and Clear are the two writes the catalog command accepts from the sidebar.
 */
export function RepoIconPicker({
  projectName,
  currentIcon,
  x,
  y,
  onPick,
  onClear,
  onClose,
}: RepoIconPickerProps): React.JSX.Element {
  const selectedEmoji = currentIcon?.type === "emoji" ? currentIcon.emoji : null;
  const dialogRef = React.useRef<HTMLDivElement>(null);
  // The menu that opened this row unmounts, so move focus into the dialog: Tab
  // walks the grid and Escape reaches the handler below.
  React.useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  return (
    <>
      <div
        className="fixed inset-0 z-[99998]"
        onClick={onClose}
        onContextMenu={(event) => {
          event.preventDefault();
          onClose();
        }}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-label={`Project icon for ${projectName}`}
        tabIndex={-1}
        style={{
          position: "fixed",
          top: Math.min(y, window.innerHeight - 260),
          left: Math.min(x, window.innerWidth - 280),
          zIndex: 99999,
        }}
        className="w-64 rounded-xl border border-worktree-sidebar-border bg-worktree-sidebar p-2 shadow-2xl text-xs backdrop-blur-md outline-none"
        onClick={(event) => event.stopPropagation()}
        onPointerDown={stopRepoHeaderMenuEvent}
        onMouseDown={stopRepoHeaderMenuEvent}
        onPointerUp={stopRepoHeaderMenuEvent}
        onMouseUp={stopRepoHeaderMenuEvent}
        onKeyDown={(event) => {
          stopRepoHeaderMenuEvent(event);
          if (event.key === "Escape") onClose();
        }}
      >
        <div className="flex items-center gap-2 px-1 pb-2 text-worktree-sidebar-foreground/70">
          <span className="flex size-4 shrink-0 items-center justify-center">
            <RepoIconGlyph
              repoIcon={currentIcon}
              className="size-4"
              iconClassName="size-3.5"
            />
          </span>
          <span className="min-w-0 truncate font-medium text-worktree-sidebar-foreground">
            {projectName}
          </span>
        </div>

        <div role="group" aria-label="Emoji project icons" className="grid grid-cols-6 gap-1">
          {REPO_ICON_EMOJI_CHOICES.map((choice) => {
            const selected = selectedEmoji === choice.emoji;
            return (
              <button
                key={choice.label}
                type="button"
                aria-label={choice.label}
                aria-pressed={selected}
                title={choice.label}
                onClick={() => onPick({ type: "emoji", emoji: choice.emoji })}
                className={cn(
                  "flex size-8 cursor-pointer items-center justify-center rounded-md text-base leading-none transition hover:bg-worktree-sidebar-accent",
                  selected && "bg-worktree-sidebar-accent ring-1 ring-worktree-sidebar-ring/40"
                )}
              >
                <span aria-hidden="true">{choice.emoji}</span>
              </button>
            );
          })}
        </div>

        <div role="separator" className="my-1.5 h-px bg-worktree-sidebar-border" />

        <button
          type="button"
          onClick={onClear}
          className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-worktree-sidebar-foreground/80 transition hover:bg-worktree-sidebar-accent"
        >
          <X className="size-3.5 text-worktree-sidebar-foreground/60" />
          Clear
        </button>
      </div>
    </>
  );
}
