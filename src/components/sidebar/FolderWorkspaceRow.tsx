// Folder-workspace row, ported to match Orca's sidebar visual
// (`worktree-list/rows/folder-row.tsx` card layout): status dot, title, and the
// folder path on a second line. Orca renders the path through the card's
// identity line, which is truncated and carries the full path as a tooltip.
import React from "react";

export interface FolderWorkspaceRowProps {
  name: string;
  folderPath: string;
  isActive?: boolean;
  onSelect?: () => void;
}

export function FolderWorkspaceRow({
  name,
  folderPath,
  isActive = false,
  onSelect,
}: FolderWorkspaceRowProps): React.JSX.Element {
  const exists = folderPath.length > 0;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={name}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect?.();
        }
      }}
      className={`group ml-1 flex cursor-pointer flex-col gap-1 rounded-lg pl-6 pr-2.5 py-1.5 transition-colors hover:bg-worktree-sidebar-accent/40 ${
        isActive ? "bg-worktree-sidebar-accent/60" : ""
      }`}
    >
      <div className="flex min-w-0 items-center gap-2">
        {/* Path-health dot, mirroring the status lane Orca paints on the card. */}
        <span
          className={`size-2 shrink-0 rounded-full ${
            exists ? "bg-emerald-500" : "bg-destructive"
          }`}
          aria-hidden
        />
        <span className="min-w-0 truncate text-[13px] font-medium leading-5">{name}</span>
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
