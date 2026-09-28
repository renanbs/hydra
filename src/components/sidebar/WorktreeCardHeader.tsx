// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
import React from "react";
import { AlertCircle, GripVertical, Star, Trash2 } from "lucide-react";
import type { GitWorktreeInfo } from "./types";
import { WorktreeTitleInlineRename } from "./WorktreeTitleInlineRename";

export interface WorktreeCardHeaderProps {
  worktree: GitWorktreeInfo;
  isMain: boolean;
  compactCards?: boolean;
  isPinned?: boolean;
  isUnread?: boolean;
  isDeleting?: boolean;
  onRename: (newTitle: string) => Promise<void> | void;
  onDelete?: () => void;
  onOpenRenameError?: (error: string) => void;
  onEditingChange?: (editing: boolean) => void;
}

export function WorktreeCardHeader({
  worktree,
  isMain,
  compactCards = false,
  isPinned = false,
  isUnread = false,
  isDeleting = false,
  onRename,
  onDelete,
  onOpenRenameError,
  onEditingChange,
}: WorktreeCardHeaderProps): React.JSX.Element {
  const visibleTitle =
    worktree.display_name?.trim() ||
    worktree.branch?.trim() ||
    worktree.path.split("/").filter(Boolean).pop() ||
    "worktree";

  const hasRenameError =
    typeof worktree.first_agent_message_rename_error === "string" &&
    worktree.first_agent_message_rename_error.length > 0;

  return (
    <div className="flex min-w-0 items-center justify-between gap-1.5 w-full">
      <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
        <GripVertical className="w-3 h-3 text-neutral-600 opacity-0 group-hover:opacity-60 hover:!opacity-100 cursor-grab active:cursor-grabbing shrink-0" />

        {isPinned && (
          <span
            className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"
            title="Pinned worktree"
          />
        )}
        {isUnread && (
          <span
            className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 animate-pulse"
            title="Unread activity"
          />
        )}

        <WorktreeTitleInlineRename
          displayName={visibleTitle}
          disabled={isDeleting}
          className={`${compactCards ? "text-[12px]" : "text-[13px]"} leading-tight font-medium text-neutral-100`}
          onRename={onRename}
          onEditingChange={onEditingChange}
        />

        {hasRenameError && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenRenameError?.(worktree.first_agent_message_rename_error!);
            }}
            className="h-4 shrink-0 inline-flex items-center gap-1 px-1.5 rounded text-[10px] font-medium leading-none text-rose-400 border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 transition cursor-pointer"
            title="Auto-name failed. Click to see details."
          >
            <AlertCircle className="w-2.5 h-2.5" />
            <span>rename failed</span>
          </button>
        )}

        {isMain && (
          compactCards ? (
            <span title="Primary worktree (original clone)" className="inline-flex shrink-0">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            </span>
          ) : (
            <span
              className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-900/40 border border-emerald-800/50 text-emerald-300 shrink-0 font-semibold leading-none"
              title="Primary worktree (original clone)"
            >
              primary
            </span>
          )
        )}

        {worktree.is_sparse && (
          <span
            className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 shrink-0 font-semibold leading-none"
            title={
              worktree.sparse_directories && worktree.sparse_directories.length > 0
                ? `Sparse checkout: ${worktree.sparse_directories.join(", ")}`
                : "Sparse checkout"
            }
          >
            sparse
          </span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {!isMain && onDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            title="Delete worktree from disk"
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-red-400 transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
