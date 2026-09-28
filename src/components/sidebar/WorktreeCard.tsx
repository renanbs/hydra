// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
import React, { useState } from "react";
import type { GitWorktreeInfo, HydraProject } from "./types";
import { WorktreeCardHeader } from "./WorktreeCardHeader";
import { WorktreeCardMetaRow } from "./WorktreeCardMetaRow";
import { AutoRenameFailedDialog } from "./AutoRenameFailedDialog";

export interface WorktreeCardProps {
  worktree: GitWorktreeInfo;
  project: HydraProject;
  compactCards?: boolean;
  isPinned?: boolean;
  isUnread?: boolean;
  isFocused?: boolean;
  isDragged?: boolean;
  dropTarget?: { path: string; position: "top" | "bottom" } | null;
  onSelect: (wt: GitWorktreeInfo) => void;
  onDelete: (wt: GitWorktreeInfo, proj: HydraProject) => void;
  onRename: (newTitle: string) => Promise<void> | void;
  onContextMenu?: (e: React.MouseEvent, wt: GitWorktreeInfo, proj: HydraProject) => void;
  onDragStart?: (e: React.DragEvent, path: string) => void;
  onDragOver?: (e: React.DragEvent, path: string) => void;
  onDrop?: (e: React.DragEvent, path: string) => void;
  onDragEnd?: () => void;
  metaRowChildren?: React.ReactNode;
}

export function WorktreeCard({
  worktree,
  project,
  compactCards = false,
  isPinned = false,
  isUnread = false,
  isFocused = false,
  isDragged = false,
  dropTarget,
  onSelect,
  onDelete,
  onRename,
  onContextMenu,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  metaRowChildren,
}: WorktreeCardProps): React.JSX.Element {
  const [isEditing, setIsEditing] = useState(false);
  const [renameErrorDialog, setRenameErrorDialog] = useState<string | null>(null);

  const isMain = worktree.path === project.path;

  const cardTitle =
    worktree.display_name?.trim() ||
    worktree.branch?.trim() ||
    worktree.path.split("/").filter(Boolean).pop() ||
    "worktree";

  return (
    <>
      <div
        draggable={!isEditing}
        onDragStart={(e) => onDragStart?.(e, worktree.path)}
        onDragOver={(e) => onDragOver?.(e, worktree.path)}
        onDrop={(e) => onDrop?.(e, worktree.path)}
        onDragEnd={onDragEnd}
        onClick={() => onSelect(worktree)}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onContextMenu?.(e, worktree, project);
        }}
        data-worktree-card="true"
        className={`group relative flex flex-col justify-center rounded-lg cursor-pointer transition-all border select-none ${
          compactCards ? "py-1 px-2 gap-0.5 min-h-[36px]" : "py-1.5 px-2 gap-1 min-h-[48px]"
        } ${
          isDragged ? "opacity-30" : ""
        } ${
          isFocused
            ? "border-indigo-500/50 ring-1 ring-indigo-500/20 bg-worktree-sidebar-accent/30"
            : "border-transparent worktree-sidebar-card-hover text-worktree-sidebar-foreground/80 hover:text-worktree-sidebar-foreground"
        }`}
      >
        {dropTarget?.path === worktree.path && (
          <div
            className={`absolute left-1 right-1 h-[2px] bg-emerald-500 rounded-full z-20 pointer-events-none shadow-[0_0_8px_rgba(16,185,129,0.9)] ${
              dropTarget.position === "top" ? "-top-0.5" : "-bottom-0.5"
            }`}
          />
        )}

        <WorktreeCardHeader
          worktree={worktree}
          isMain={isMain}
          compactCards={compactCards}
          isPinned={isPinned}
          isUnread={isUnread}
          onRename={onRename}
          onDelete={() => onDelete(worktree, project)}
          onOpenRenameError={(error) => setRenameErrorDialog(error)}
          onEditingChange={setIsEditing}
        />

        <WorktreeCardMetaRow worktree={worktree} compactCards={compactCards}>
          {metaRowChildren}
        </WorktreeCardMetaRow>
      </div>

      <AutoRenameFailedDialog
        open={renameErrorDialog !== null}
        onOpenChange={(open) => {
          if (!open) setRenameErrorDialog(null);
        }}
        worktreeName={cardTitle}
        error={renameErrorDialog ?? ""}
      />
    </>
  );
}
