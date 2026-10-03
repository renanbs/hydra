// Folder-workspace row, matching Orca's sidebar row
// (`worktree-list/rows/folder-row.tsx` + `StatusIndicator.tsx`):
//   lane 1 — workspace status dot (green `active`/`done`, grey `inactive`, spinner `working`)
//   lane 2 — title, then the folder path on a second line (truncated, full path in `title`)
// A missing folder path is NOT a coloured dot in Orca: it is the FolderX badge from
// `FolderPathStatusIndicator`, shown only when the path is gone.
import React from "react";
import { FolderX } from "lucide-react";
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
}

export function FolderWorkspaceRow({
  name,
  folderPath,
  status,
  pathMissing = false,
  isActive = false,
  onActivate,
}: FolderWorkspaceRowProps): React.JSX.Element {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={name}
      aria-current={isActive ? "page" : undefined}
      onClick={onActivate}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
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
