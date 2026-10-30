// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/worktree-list/rows/SectionHeader.tsx
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
import { shouldIgnoreRepoHeaderToggle } from "./repo-header-event-guards";
import { ACTIVE_SHELL_FACE } from "../../lib/shell-face";
import { RepoIconGlyph } from "../repo/repo-icon";
import type { HydraProject, ProjectGroup } from "./types";
import {
  ProjectHeaderActions,
  stopRepoHeaderKeyboardToggle,
} from "./ProjectHeaderActions";
import {
  REPO_HEADER_ACTION_BUTTON_CLASS,
  REPO_HEADER_ACTION_REVEAL_CLASS,
} from "./repo-header-action-button-class";
import { resolveRepoHeaderColor } from "./project-header-color";
import {
  getProjectGroupHeaderPaddingLeft,
  WORKTREE_SECTION_HEADER_PADDING_LEFT,
} from "./indentation";

export interface GroupSectionHeaderProps {
  variant: "group";
  group: ProjectGroup | { id: string; name: string };
  /** Pipeline row key (`project-group:<id>`), so the painted header is addressable. */
  sectionKey?: string;
  isCollapsed: boolean;
  count?: number;
  hasUnread?: boolean;
  depth?: number;
  onToggleCollapse: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  /** Orca renders a `+` on folder-backed groups (ProjectGroupCreateWorkspaceButton). */
  onOpenNewWorkspace?: () => void;
  isDropTarget?: boolean;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  /** User-authored group color, resolved contextually (D15a-004). */
  badgeColor?: string;
  /** Disables the create button for a folder-backed group whose path is confirmed stale. */
  createWorkspaceDisabledReason?: string;
  /** Estimated section bottom in virtual-row pixels (drag preview bounds). */
  sectionEnd?: number;
  className?: string;
}

/**
 * Orca `getRepoHeaderCreateState`: the header `+` is disabled while the project's
 * host cannot accept a workspace (SSH target not connected).
 */
export interface RepoHeaderCreateState {
  disabled: boolean;
  tooltip: string;
  ariaLabel: string;
}

export interface RepoSectionHeaderProps {
  variant: "repo" | "project";
  project: HydraProject;
  /** Omitted = the action is always enabled (Orca renders a plain `+`). */
  createState?: RepoHeaderCreateState | null;
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
  /** Estimated section bottom in virtual-row pixels (drag preview bounds). */
  sectionEnd?: number;
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
  sectionKey,
  isCollapsed,
  count,
  hasUnread = false,
  depth = 0,
  onToggleCollapse,
  onContextMenu,
  onOpenNewWorkspace,
  isDropTarget = false,
  onDragOver,
  onDragLeave,
  onDrop,
  badgeColor,
  sectionEnd,
  className = "",
  createWorkspaceDisabledReason,
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
      data-section-header-id={sectionKey}
      data-project-group-header-section-end={sectionEnd}
      data-repo-header-color={badgeColor ? resolveRepoHeaderColor(badgeColor) : undefined}
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
        <div
          className="flex size-4 shrink-0 items-center justify-center rounded-[4px] text-foreground"
          style={badgeColor ? { color: resolveRepoHeaderColor(badgeColor) } : undefined}
        >
          <FolderTree className="size-3 shrink-0" />
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
            onKeyDown={stopRepoHeaderKeyboardToggle}
            onClick={handleContext}
          >
            <MoreHorizontal className="size-3.5" />
          </button>
        )}

        {onOpenNewWorkspace && (
          <button
            type="button"
            title={createWorkspaceDisabledReason ?? "New workspace in this group"}
            aria-label="New workspace in this group"
            aria-disabled={createWorkspaceDisabledReason ? true : undefined}
            disabled={Boolean(createWorkspaceDisabledReason)}
            className={cn(
              REPO_HEADER_ACTION_BUTTON_CLASS,
              createWorkspaceDisabledReason ? "cursor-not-allowed opacity-40" : "cursor-pointer"
            )}
            onKeyDown={stopRepoHeaderKeyboardToggle}
            onClick={(e) => {
              e.stopPropagation();
              if (createWorkspaceDisabledReason) return;
              onOpenNewWorkspace();
            }}
          >
            <Plus className="size-3.5" />
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
  createState,
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
  sectionEnd,
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
        data-repo-header-id={project.id}
        data-repo-header-section-end={sectionEnd}
        data-repo-header-color={resolveRepoHeaderColor(project.color)}
        className="flex h-7 w-full items-center gap-1.5 pr-2 text-left transition-all cursor-pointer select-none rounded-md text-worktree-sidebar-foreground/80 hover:bg-worktree-sidebar-accent/50 hover:text-worktree-sidebar-foreground"
        style={{
          paddingLeft: inGroup
            ? getProjectGroupHeaderPaddingLeft(depth || 1)
            : WORKTREE_SECTION_HEADER_PADDING_LEFT,
        }}
        onClick={handleClick}
        onKeyDown={(e) => {
          // Orca `shouldIgnoreRepoHeaderToggle`: Enter on the menu/create trigger
          // must not collapse the section on its way out.
          if (shouldIgnoreRepoHeaderToggle(e)) return;
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
            style={{ color: resolveRepoHeaderColor(project.color) }}
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
              onKeyDown={stopRepoHeaderKeyboardToggle}
              onClick={handleContext}
            >
              <MoreHorizontal className="size-3.5" />
            </button>
          )}

          {onOpenNewWorkspace &&
            (createState?.disabled ? (
              // Orca keeps a focusable span around a disabled button so the
              // tooltip explaining WHY creation is unavailable stays reachable.
              <span
                className={cn(
                  "inline-flex cursor-not-allowed transition-[margin,max-width,opacity]",
                  REPO_HEADER_ACTION_REVEAL_CLASS
                )}
                data-repo-header-action=""
                data-repo-header-create-disabled=""
                tabIndex={0}
                aria-label={createState.ariaLabel}
                title={createState.tooltip}
                onKeyDown={stopRepoHeaderKeyboardToggle}
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  aria-label={createState.ariaLabel}
                  className="pointer-events-none inline-flex size-5 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-60"
                  disabled
                >
                  <Plus className="size-3" />
                </button>
              </span>
            ) : (
              <button
                type="button"
                title={createState?.tooltip ?? "New workspace in this project"}
                aria-label={createState?.ariaLabel ?? "New workspace in this project"}
                className={cn(REPO_HEADER_ACTION_BUTTON_CLASS, "cursor-pointer")}
                onKeyDown={stopRepoHeaderKeyboardToggle}
                onClick={handleNewWorkspace}
              >
                <Plus className="size-3.5" />
              </button>
            ))}
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
