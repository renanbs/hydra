// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
import React, { useCallback } from "react";
import {
  ChevronDown,
  FolderGit2,
  Folder,
  FolderTree,
  MoreHorizontal,
  Plus,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { ACTIVE_SHELL_FACE } from "../../lib/shell-face";
import { RepoIconGlyph } from "../repo/repo-icon";
import type { HydraProject, ProjectGroup } from "./types";
import { ProjectHeaderActions } from "./ProjectHeaderActions";
import { REPO_HEADER_ACTION_BUTTON_CLASS } from "./repo-header-action-button-class";
import {
  getProjectGroupHeaderPaddingLeft,
  WORKTREE_SECTION_HEADER_PADDING_LEFT,
} from "./indentation";

export interface GroupSectionHeaderProps {
  variant: "group";
  group: ProjectGroup | { id: string; name: string };
  isCollapsed: boolean;
  count?: number;
  hasUnread?: boolean;
  depth?: number;
  onToggleCollapse: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  isDropTarget?: boolean;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  className?: string;
}

export interface RepoSectionHeaderProps {
  variant: "repo" | "project";
  project: HydraProject;
  isCollapsed: boolean;
  isActive?: boolean;
  count?: number;
  depth?: number;
  onToggleCollapse: () => void;
  onSelectProject?: (project: HydraProject) => void;
  onOpenNewWorkspace?: (project: HydraProject) => void;
  onContextMenu?: (e: React.MouseEvent, project: HydraProject) => void;
  isDropTarget?: boolean;
  dropPosition?: "top" | "bottom";
  isDragged?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  className?: string;
  inGroup?: boolean;
}

export type SectionHeaderProps = GroupSectionHeaderProps | RepoSectionHeaderProps;

/**
 * GroupSectionHeader: Renders project group section headers.
 * Orca parity: Chevron first in ProjectHeaderActions, exact typography and layout.
 */
export const GroupSectionHeader = React.memo(function GroupSectionHeader({
  group,
  isCollapsed,
  count,
  hasUnread = false,
  depth = 0,
  onToggleCollapse,
  onContextMenu,
  isDropTarget = false,
  onDragOver,
  onDragLeave,
  onDrop,
  className = "",
}: Omit<GroupSectionHeaderProps, "variant">): React.JSX.Element {
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleCollapse();
    },
    [onToggleCollapse]
  );

  const handleContext = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onContextMenu?.(e);
    },
    [onContextMenu]
  );

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={!isCollapsed}
      aria-label={`Project Group ${group.name}`}
      className={cn(
        "group relative flex h-7 w-full items-center gap-1.5 pr-2 text-left transition-all cursor-pointer select-none text-worktree-sidebar-foreground/80 hover:bg-worktree-sidebar-accent/50 hover:text-worktree-sidebar-foreground",
        isDropTarget && "bg-worktree-sidebar-accent ring-1 ring-worktree-sidebar-ring/40",
        className
      )}
      style={{
        paddingLeft: getProjectGroupHeaderPaddingLeft(depth),
      }}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggleCollapse();
        }
      }}
      onContextMenu={handleContext}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="flex min-w-0 flex-1 items-center gap-1.5 self-stretch">
        <div className="flex size-4 shrink-0 items-center justify-center rounded-[4px] text-foreground">
          {ACTIVE_SHELL_FACE === "hydra" ? (
            <FolderTree className="size-3 shrink-0" />
          ) : (
            <FolderTree className="size-3 shrink-0" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <div className="min-w-0 truncate text-[13px] font-semibold leading-none">
              {group.name}
            </div>

            {hasUnread && (
              <span
                className="size-1.5 rounded-full bg-blue-400 shrink-0 animate-pulse"
                title="Unread activity in group"
              />
            )}

            {/* Orca never paints a count badge on the group header; `count` only
                arms the collapse chevron (SectionHeader.tsx:176-178 upstream). */}
          </div>
        </div>
      </div>

      <ProjectHeaderActions>
        {/* Collapse affordance first in actions, exact Orca layout; Orca arms it
            only when the header has rows (`count > 0`, SectionHeader.tsx:176-178). */}
        {typeof count === "number" && count > 0 && (
          <div
            className="flex size-5 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/70 hover:text-foreground cursor-pointer"
            data-repo-header-collapse-affordance=""
            aria-hidden
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse();
            }}
          >
            <ChevronDown
              className={cn("size-3.5 transition-transform", isCollapsed && "-rotate-90")}
            />
          </div>
        )}

        {onContextMenu && (
          <button
            type="button"
            title="Group options"
            aria-label="Group options"
            className={cn(REPO_HEADER_ACTION_BUTTON_CLASS, "cursor-pointer")}
            onClick={handleContext}
          >
            <MoreHorizontal className="size-3.5" />
          </button>
        )}
      </ProjectHeaderActions>
    </div>
  );
});

/**
 * RepoSectionHeader: Renders repository headers with folder icon, branch, '+' button and '...' actions menu.
 * Orca parity: exact ProjectHeaderActions with ChevronDown first, then MoreHorizontal, then Plus button.
 */
export const RepoSectionHeader = React.memo(function RepoSectionHeader({
  project,
  isCollapsed,
  isActive: _isActive = false,
  count,
  depth = 0,
  onToggleCollapse,
  onSelectProject,
  onOpenNewWorkspace,
  onContextMenu,
  isDropTarget = false,
  dropPosition = "bottom",
  isDragged = false,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  className = "",
  inGroup = false,
}: Omit<RepoSectionHeaderProps, "variant">): React.JSX.Element {
  const handleClick = useCallback(() => {
    onSelectProject?.(project);
    onToggleCollapse();
  }, [onSelectProject, project, onToggleCollapse]);

  const handleToggleOnly = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleCollapse();
    },
    [onToggleCollapse]
  );

  const handleContext = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onContextMenu?.(e, project);
    },
    [onContextMenu, project]
  );

  const handleNewWorkspace = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onOpenNewWorkspace?.(project);
    },
    [onOpenNewWorkspace, project]
  );

  return (
    <div
      className={cn(
        "group relative transition-colors overflow-hidden",
        isDragged && "opacity-30",
        className
      )}
      draggable={Boolean(onDragStart)}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      {isDropTarget && (
        <div
          data-hydra-drop-indicator=""
          className={cn(
            "absolute left-0 right-0 h-0.5 rounded-full z-20 pointer-events-none bg-worktree-sidebar-ring",
            dropPosition === "top" ? "-top-0.5" : "-bottom-0.5"
          )}
        />
      )}

      {/* Project Header Row */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={!isCollapsed}
        aria-label={`Project ${project.displayName || project.name}`}
        className="flex h-7 w-full items-center gap-1.5 pr-2 text-left transition-all cursor-pointer select-none rounded-md text-worktree-sidebar-foreground/80 hover:bg-worktree-sidebar-accent/50 hover:text-worktree-sidebar-foreground"
        style={{
          paddingLeft: inGroup
            ? getProjectGroupHeaderPaddingLeft(depth || 1)
            : WORKTREE_SECTION_HEADER_PADDING_LEFT,
        }}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
        onContextMenu={handleContext}
      >
        <div className="flex min-w-0 flex-1 items-center gap-1.5 self-stretch">
          <div
            className={cn(
              "flex size-4 shrink-0 items-center justify-center rounded-[4px]",
              ACTIVE_SHELL_FACE !== "hydra" && "text-muted-foreground"
            )}
          >
            {ACTIVE_SHELL_FACE === "hydra" ? (
              project.is_git ? (
                <FolderGit2 data-hydra-repo-icon="git" className="size-3.5 shrink-0" />
              ) : (
                <Folder data-hydra-repo-icon="folder" className="size-3.5 shrink-0" />
              )
            ) : (
              <RepoIconGlyph
                repoIcon={project.repo_icon}
                className="size-4"
                iconClassName="size-3.5"
              />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-1.5">
              <div className="min-w-0 truncate text-[13px] font-semibold leading-none">
                {project.displayName || project.name}
              </div>

              {/* No count badge on repo headers either — Orca parity. */}
            </div>
          </div>
        </div>

        <ProjectHeaderActions>
          {/* Collapse affordance first in actions; armed only with rows (Orca parity). */}
          {typeof count === "number" && count > 0 && (
            <div
              className="flex size-5 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/70 hover:text-foreground cursor-pointer"
              data-repo-header-collapse-affordance=""
              aria-hidden
              onClick={handleToggleOnly}
            >
              <ChevronDown
                className={cn("size-3.5 transition-transform", isCollapsed && "-rotate-90")}
              />
            </div>
          )}

          {onContextMenu && (
            <button
              type="button"
              title="Project options"
              aria-label="Project options"
              className={cn(REPO_HEADER_ACTION_BUTTON_CLASS, "cursor-pointer")}
              onClick={handleContext}
            >
              <MoreHorizontal className="size-3.5" />
            </button>
          )}

          {onOpenNewWorkspace && (
            <button
              type="button"
              title="New workspace in this project"
              aria-label="New workspace in this project"
              className={cn(REPO_HEADER_ACTION_BUTTON_CLASS, "cursor-pointer")}
              onClick={handleNewWorkspace}
            >
              <Plus className="size-3.5" />
            </button>
          )}
        </ProjectHeaderActions>
      </div>
    </div>
  );
});

/**
 * Unified SectionHeader dispatcher.
 */
export function SectionHeader(props: SectionHeaderProps): React.JSX.Element {
  if (props.variant === "group") {
    return <GroupSectionHeader {...props} />;
  }
  return <RepoSectionHeader {...props} />;
}

export default SectionHeader;
