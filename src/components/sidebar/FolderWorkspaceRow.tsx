// Folder-workspace row, matching Orca's sidebar row
// (`worktree-list/rows/folder-row.tsx` + `StatusIndicator.tsx`):
//   lane 1 — workspace status dot (green `active`/`done`, grey `inactive`, spinner `working`)
//   lane 2 — title, then the folder path on a second line (truncated, full path in `title`)
// A missing folder path is NOT a coloured dot in Orca: it is the FolderX badge from
// `FolderPathStatusIndicator`, shown only when the path is gone.
import React from "react";
import { FolderX, Trash2 } from "lucide-react";
import { WorktreeStatusIndicator } from "./WorktreeStatusIndicator";
import type { WorktreeStatus } from "../../lib/worktree-status";

export interface FolderWorkspaceRowProps {
  name: string;
  folderPath: string;
  status: WorktreeStatus;
  /** True when the folder is gone; Orca paints the FolderX badge instead of hiding the row. */
  pathMissing?: boolean;
  isActive?: boolean;
  onActivate?: () => void;
  /** Removes the workspace entry; the folder on disk is untouched (Orca copy). */
  onDelete?: () => void;
}

export function FolderWorkspaceRow({
  name,
  folderPath,
  status,
  pathMissing = false,
  isActive = false,
  onActivate,
  onDelete,
}: FolderWorkspaceRowProps): React.JSX.Element {
  return (
    <div
      role="option"
      tabIndex={0}
      aria-label={name}
      aria-selected={isActive}
      aria-current={isActive ? "page" : undefined}
      aria-disabled={pathMissing || undefined}
      data-folder-workspace-path-status={pathMissing ? "confirmed-stale" : undefined}
      onClick={() => {
        // Orca blocks activation for a confirmed-stale path; the row stays
        // visible so the FolderX badge (and the delete control) remain reachable.
        if (pathMissing) return;
        onActivate?.();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (pathMissing) return;
          onActivate?.();
        }
      }}
      className={`group ml-1 flex cursor-pointer flex-col gap-1 rounded-lg pl-6 pr-2.5 py-1.5 transition-colors hover:bg-worktree-sidebar-accent/40 ${
        isActive ? "bg-worktree-sidebar-accent/60" : ""
      }`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <WorktreeStatusIndicator status={status} />
        <span className="min-w-0 truncate text-[13px] font-medium leading-5">{name}</span>
        {onDelete && (
          <button
            type="button"
            aria-label={`Remove workspace ${name}`}
            title="Remove workspace"
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
            onKeyDown={(event) => event.stopPropagation()}
            className="ml-auto inline-flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 transition hover:bg-worktree-sidebar-accent hover:text-foreground can-hover:group-hover:opacity-100 can-hover:group-focus-within:opacity-100 [@media(hover:none)]:opacity-100"
          >
            <Trash2 className="size-3" />
          </button>
        )}
        {pathMissing && (
          <span
            className="inline-flex size-4 shrink-0 items-center justify-center rounded-[4px] text-destructive"
            title={`Folder not found: ${folderPath}`}
            aria-label={`Folder not found: ${folderPath}`}
          >
            <FolderX className="size-3.5" />
          </span>
        )}
      </div>
      <span
        className="min-w-0 truncate pl-4 font-mono text-[11px] leading-none text-muted-foreground"
        title={folderPath}
      >
        {folderPath}
      </span>
    </div>
  );
}

export default FolderWorkspaceRow;
