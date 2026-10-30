// Folder-workspace row, matching Orca's sidebar row
// (`worktree-list/rows/folder-row.tsx` + `FolderPathStatusIndicator.tsx`):
//   lane 1 — workspace status dot (green `active`/`done`, grey `inactive`, spinner `working`)
//   lane 2 — title, then the folder path on a second line (truncated, full path in `title`)
// A path that cannot be used is NOT a coloured dot in Orca: it is the FolderX badge from
// `FolderPathStatusIndicator`, destructive only when the stale path is confirmed (missing /
// not a folder), muted when the owning connection is ambiguous. Both block activation and
// both explain themselves through a title + description tooltip.
import React from "react";
import { FolderX, Trash2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  folderWorkspaceActivationBlocked,
  getFolderWorkspacePathStatusDescription,
  getFolderWorkspacePathStatusTitle,
} from "@/lib/folder-workspace-path-status";
import {
  isConfirmedStaleFolderPathStatus,
  type FolderWorkspacePathStatus,
} from "../../shared/folder-workspace-path-status";
import { WorktreeStatusIndicator } from "./WorktreeStatusIndicator";
import type { WorktreeStatus } from "../../lib/worktree-status";
import type { PrDisplay } from "./pr-display";
import { ReviewIcon, reviewStatusLabel } from "./pr-display";

export interface FolderWorkspaceRowProps {
  name: string;
  folderPath: string;
  status: WorktreeStatus;
  /** Listbox option id, so `aria-activedescendant` can name this row's element. */
  id?: string;
  /**
   * Compact `path_exists` probe result. It can only prove `missing`, so hosts
   * that route the check (SSH/runtime) pass `pathStatus` instead; that richer
   * status wins when both are present.
   */
  pathMissing?: boolean;
  /** Host-routed probe result: stale paths vs an ambiguous connection. */
  pathStatus?: FolderWorkspacePathStatus | null;
  isActive?: boolean;
  /**
   * Geometry from `getFolderWorkspaceRowGeometry` (Orca `folder-row.tsx`). When
   * present it replaces the fixed row padding, so folder-backed groups keep the
   * compact anchor their headers use (D03a-079).
   */
  surfaceInset?: number;
  /** Content indent inside the surface, mirroring the card's `contentIndent`. */
  contentIndent?: number;
  /** Synthetic review of the worktrees attached to this folder (D03a-077). */
  prDisplay?: PrDisplay | null;
  onActivate?: () => void;
  /** Removes the workspace entry; the folder on disk is untouched (Orca copy). */
  onDelete?: () => void;
}

export function FolderWorkspaceRow({
  name,
  folderPath,
  status,
  id,
  pathMissing = false,
  pathStatus,
  isActive = false,
  surfaceInset,
  contentIndent,
  prDisplay = null,
  onActivate,
  onDelete,
}: FolderWorkspaceRowProps): React.JSX.Element {
  const resolvedPathStatus: FolderWorkspacePathStatus | null =
    pathStatus !== undefined
      ? pathStatus
      : pathMissing
        ? { path: folderPath, exists: false, reason: "missing" }
        : null;
  const pathStatusTitle = getFolderWorkspacePathStatusTitle(resolvedPathStatus);
  const pathStatusDescription = getFolderWorkspacePathStatusDescription(resolvedPathStatus);
  const pathBlocksActivation = folderWorkspaceActivationBlocked(resolvedPathStatus);
  const pathStatusDestructive = isConfirmedStaleFolderPathStatus(resolvedPathStatus);
  const pathStatusState = !pathStatusTitle
    ? undefined
    : pathStatusDestructive
      ? "confirmed-stale"
      : resolvedPathStatus?.reason;

  const activate = (): void => {
    // Orca blocks activation for a path that cannot be used; the row stays
    // visible so the FolderX badge (and the delete control) remain reachable.
    if (pathBlocksActivation) return;
    onActivate?.();
  };

  return (
    <div
      id={id}
      role="option"
      tabIndex={0}
      aria-label={name}
      aria-selected={isActive}
      aria-current={isActive ? "page" : undefined}
      aria-disabled={pathBlocksActivation || undefined}
      data-folder-workspace-path-status={pathStatusState}
      onClick={activate}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          activate();
        }
      }}
      className={cn(
        "group ml-1 flex cursor-pointer flex-col gap-1 rounded-lg pl-6 pr-2.5 py-1.5 transition-colors hover:bg-worktree-sidebar-accent/40",
        isActive ? "bg-worktree-sidebar-accent/60" : "",
        pathBlocksActivation ? "cursor-default" : ""
      )}
      style={
        surfaceInset !== undefined && contentIndent !== undefined
          ? // The 4px matches the row's `ml-1`, so the geometry starts at the same
            // origin the class-based padding used.
            { paddingLeft: `${4 + surfaceInset + contentIndent}px` }
          : undefined
      }
    >
      <div className="flex min-w-0 items-center gap-2">
        <WorktreeStatusIndicator status={status} />
        <span className="min-w-0 truncate text-[13px] font-medium leading-5">{name}</span>
        {prDisplay ? (
          <span
            className="inline-flex shrink-0 items-center gap-0.5 text-[10px] leading-none text-muted-foreground"
            title={reviewStatusLabel(prDisplay)}
            aria-label={reviewStatusLabel(prDisplay)}
            data-folder-workspace-pr-display=""
          >
            <ReviewIcon review={prDisplay} className="size-3" />
            {prDisplay.number ? <span>#{prDisplay.number}</span> : null}
          </span>
        ) : null}
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
        {pathStatusTitle && pathStatusDescription ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  "inline-flex size-4 shrink-0 items-center justify-center rounded-[4px]",
                  pathStatusDestructive ? "text-destructive" : "text-muted-foreground"
                )}
                aria-label={pathStatusTitle}
              >
                <FolderX className="size-3.5" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={6} className="max-w-72">
              <div className="space-y-1">
                <div className="font-medium">{pathStatusTitle}</div>
                <div className="text-muted-foreground">{pathStatusDescription}</div>
              </div>
            </TooltipContent>
          </Tooltip>
        ) : null}
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
