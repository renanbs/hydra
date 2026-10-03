// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
import React, { useMemo, useCallback, useLayoutEffect } from "react";
import { FolderPlus, Plus } from "lucide-react";
import { SectionHeader } from "./SectionHeader";
import { WorktreeCard } from "./WorktreeCard";
import { FolderWorkspaceRow } from "./FolderWorkspaceRow";
import { workspaceStatusFrom } from "../../lib/workspace-status-signals";
import type { PrDisplay } from "./pr-display";
import {
  getWorktreeCardContentIndent,
  getWorktreeCardSurfaceInset,
} from "./worktree-list/rows/indentation";
import { NewExternalWorktreesInboxLine } from "./worktree-list/rows/NewExternalWorktreesInboxLine";
import {
  setVisibleWorktreeIds,
  setVisibleWorktreeShortcutTargets,
  type VisibleWorktreeShortcutTarget,
} from "./visible-worktrees";
import type {
  HydraProject,
  GitWorktreeInfo,
  WorktreeSession,
  WorkspacePort,
  ProjectGroup,
} from "./types";
import type { WorkspaceDisplayOptions } from "./WorkspaceOptionsMenu";

/** Cards actually painted, in sidebar order. Collapsed projects and groups are skipped;
 * a search query forces projects open, matching `renderProjectNode`. */
function renderedSidebarShortcutTargets(args: {
  visibleProjects: HydraProject[];
  projectGroups: ProjectGroup[];
  projectGroupMap: Record<string, string>;
  collapsedProjects: Set<string>;
  collapsedGroups: Set<string>;
  query: string;
  getFilteredAndSortedWorktrees: (proj: HydraProject) => GitWorktreeInfo[];
}): VisibleWorktreeShortcutTarget[] {
  const {
    visibleProjects,
    projectGroups,
    projectGroupMap,
    collapsedProjects,
    collapsedGroups,
    query,
    getFilteredAndSortedWorktrees,
  } = args;
  const targets: VisibleWorktreeShortcutTarget[] = [];
  const seen = new Set<string>();
  const pushProject = (proj: HydraProject) => {
    if (!query && collapsedProjects.has(proj.id)) return;
    for (const wt of getFilteredAndSortedWorktrees(proj)) {
      const id = wt.id || wt.path;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      targets.push({ id });
    }
  };

  const groupedProjectIds = new Set<string>();
  for (const group of projectGroups) {
    const groupProjects = visibleProjects.filter((p) => projectGroupMap[p.id] === group.id);
    for (const p of groupProjects) groupedProjectIds.add(p.id);
    if (collapsedGroups.has(group.id)) continue;
    for (const p of groupProjects) pushProject(p);
  }
  for (const proj of visibleProjects) {
    if (!groupedProjectIds.has(proj.id)) pushProject(proj);
  }
  return targets;
}

export interface WorktreeListProps {
  projects: HydraProject[];
  displayProjects: HydraProject[];
  activeProject: HydraProject | null;
  activeWorktreePath?: string | null;
  highlightedRevealPath?: string | null;
  sessions: WorktreeSession[];
  gitWorktrees?: GitWorktreeInfo[];
  worktreesByProject?: Record<string, GitWorktreeInfo[]>;
  hiddenWorktreesByProject?: Record<string, GitWorktreeInfo[]>;
  pinnedProjects?: ReadonlySet<string> | Set<string>;
  unreadProjects?: ReadonlySet<string> | Set<string>;
  pinnedWorktrees?: ReadonlySet<string> | Set<string>;
  unreadWorktrees?: ReadonlySet<string> | Set<string>;
  projectGroups?: ProjectGroup[];
  projectGroupMap?: Record<string, string>;
  folderWorkspaces?: Array<{ id: string; projectGroupId: string; name: string; folderPath: string }>;
  liveWorkspacePaths?: ReadonlySet<string>;
  missingFolderPaths?: ReadonlySet<string>;
  onActivateFolderWorkspace?: (folderPath: string) => void;
  /** Review display per worktree path (populated by the host PR lookup). */
  prByPath?: Record<string, PrDisplay>;
  collapsedProjects: Set<string>;
  collapsedGroups: Set<string>;
  filter?: string;
  displayOptions: WorkspaceDisplayOptions;
  compactCards?: boolean;
  portsByWorktree?: Map<string, WorkspacePort[]>;
  getFilteredAndSortedWorktrees: (proj: HydraProject) => GitWorktreeInfo[];
  onSelectProject: (proj: HydraProject) => void;
  onSelectGitWorktree: (wt: GitWorktreeInfo) => void;
  onDeleteGitWorktree: (wt: GitWorktreeInfo, proj?: HydraProject) => void;
  onSelectSession: (id: string) => void;
  onRenameWorktreeTitle?: (worktreePath: string, newTitle: string) => Promise<void> | void;
  onOpenNewWorkspaceModal: (proj: HydraProject) => void;
  onOpenAddRepoDialog: () => void;
  onClearFilter?: () => void;
  onToggleProjectCollapse: (projectId: string) => void;
  onToggleGroupCollapse: (groupId: string) => void;
  onProjectContextMenu?: (e: React.MouseEvent, proj: HydraProject) => void;
  onGroupContextMenu?: (e: React.MouseEvent, group: { id: string; name: string }) => void;
  onWorktreeContextMenu?: (e: React.MouseEvent, wt: GitWorktreeInfo, proj?: HydraProject) => void;
  onSuppressHiddenWorktrees?: (proj: HydraProject) => void;
  /** Recover one discovered worktree into the list (`import_worktree` per path). */
  onShowHiddenWorktree?: (proj: HydraProject, worktreePath: string) => void;
  /** Acknowledge the listed discovered worktrees into the repo's inbox baseline. */
  onKeepHiddenWorktrees?: (proj: HydraProject, worktreePaths: string[]) => void;

  // Drag and drop state & handlers
  draggedWorktreePath?: string | null;
  worktreeDropTarget?: { path: string; position: "top" | "bottom" } | null;
  draggedProjectId?: string | null;
  projectDropTarget?: { id: string; position: "top" | "bottom" } | null;
  groupDropTargetId?: string | null;
  onWorktreeDragStart?: (e: React.DragEvent, path: string) => void;
  onWorktreeDragOver?: (e: React.DragEvent, path: string) => void;
  onWorktreeDrop?: (e: React.DragEvent, targetPath: string, proj: HydraProject) => void;
  onWorktreeDragEnd?: () => void;
  onProjectDragStart?: (e: React.DragEvent, id: string) => void;
  onProjectDragOver?: (e: React.DragEvent, id: string) => void;
  onProjectDrop?: (e: React.DragEvent, targetId: string) => void;
  onProjectDragEnd?: () => void;
  onGroupDragOver?: (e: React.DragEvent, groupId: string) => void;
  onGroupDragLeave?: (e: React.DragEvent, groupId: string) => void;
  onGroupDrop?: (e: React.DragEvent, groupId: string) => void;
  className?: string;
}

export function WorktreeList({
  projects,
  displayProjects,
  activeProject,
  activeWorktreePath,
  highlightedRevealPath,
  sessions,
  hiddenWorktreesByProject,
  pinnedWorktrees,
  unreadWorktrees,
  projectGroups = [],
  projectGroupMap = {},
  folderWorkspaces = [],
  liveWorkspacePaths,
  missingFolderPaths,
  onActivateFolderWorkspace,
  prByPath,
  collapsedProjects,
  collapsedGroups,
  filter = "",
  displayOptions,
  compactCards = false,
  portsByWorktree,
  getFilteredAndSortedWorktrees,
  onSelectProject,
  onSelectGitWorktree,
  onDeleteGitWorktree,
  onSelectSession,
  onRenameWorktreeTitle,
  onOpenNewWorkspaceModal,
  onOpenAddRepoDialog,
  onClearFilter,
  onToggleProjectCollapse,
  onToggleGroupCollapse,
  onProjectContextMenu,
  onGroupContextMenu,
  onWorktreeContextMenu,
  onSuppressHiddenWorktrees,
  onShowHiddenWorktree,
  onKeepHiddenWorktrees,
  worktreeDropTarget,
  draggedProjectId,
  projectDropTarget,
  groupDropTargetId,
  onWorktreeDragStart,
  onWorktreeDragOver,
  onWorktreeDrop,
  onWorktreeDragEnd,
  onProjectDragStart,
  onProjectDragOver,
  onProjectDrop,
  onProjectDragEnd,
  onGroupDragOver,
  onGroupDragLeave,
  onGroupDrop,
  className = "",
}: WorktreeListProps): React.JSX.Element {
  const query = filter.trim().toLowerCase();

  // Filter projects by search query
  const visibleProjects = useMemo(() => {
    if (!query) return displayProjects;
    return displayProjects.filter((proj) => {
      if (proj.name.toLowerCase().includes(query)) return true;
      if (proj.displayName?.toLowerCase().includes(query)) return true;
      if (proj.path.toLowerCase().includes(query)) return true;
      const wts = getFilteredAndSortedWorktrees(proj);
      return wts.length > 0;
    });
  }, [displayProjects, query, getFilteredAndSortedWorktrees]);

  const shortcutTargets = useMemo(
    () =>
      renderedSidebarShortcutTargets({
        visibleProjects,
        projectGroups,
        projectGroupMap,
        collapsedProjects,
        collapsedGroups,
        query,
        getFilteredAndSortedWorktrees,
      }),
    [
      visibleProjects,
      projectGroups,
      projectGroupMap,
      collapsedProjects,
      collapsedGroups,
      query,
      getFilteredAndSortedWorktrees,
    ]
  );

  // Same contract as Orca `use-selection`: publish before paint so Cmd+1–9 matches the
  // cards. Null on unmount (sidebar closed) means "recompute"; [] means nothing is expanded.
  useLayoutEffect(() => {
    setVisibleWorktreeIds(shortcutTargets.map((target) => target.id));
    setVisibleWorktreeShortcutTargets(shortcutTargets);
    return () => {
      setVisibleWorktreeIds(null);
      setVisibleWorktreeShortcutTargets(null);
    };
  }, [shortcutTargets]);

  // Render a single project node (SectionHeader + Inbox line + WorktreeCards)
  const renderProjectNode = useCallback(
    (proj: HydraProject, inGroup: boolean = false) => {
      const isCollapsed = query ? false : collapsedProjects.has(proj.id);
      const worktrees = getFilteredAndSortedWorktrees(proj);
      const hiddenWorktrees = hiddenWorktreesByProject?.[proj.path] ?? [];
      const isDropTarget = projectDropTarget?.id === proj.id;
      const isDragged = draggedProjectId === proj.id;

      return (
        <div key={proj.id} className="group/proj-wrapper space-y-0.5">
          <SectionHeader
            variant="repo"
            project={proj}
            isCollapsed={isCollapsed}
            isActive={activeProject?.path === proj.path}
            count={worktrees.length}
            inGroup={inGroup}
            onToggleCollapse={() => onToggleProjectCollapse(proj.id)}
            onSelectProject={onSelectProject}
            onOpenNewWorkspace={onOpenNewWorkspaceModal}
            onContextMenu={onProjectContextMenu}
            isDropTarget={isDropTarget}
            dropPosition={projectDropTarget?.position}
            isDragged={isDragged}
            onDragStart={
              onProjectDragStart ? (e) => onProjectDragStart(e, proj.id) : undefined
            }
            onDragOver={
              onProjectDragOver ? (e) => onProjectDragOver(e, proj.id) : undefined
            }
            onDrop={onProjectDrop ? (e) => onProjectDrop(e, proj.id) : undefined}
            onDragEnd={onProjectDragEnd}
          />

          {/* Hidden worktrees inbox banner. The line owns the gate (suppressed) and
              the baseline subtraction; it renders null when closed. */}
          <NewExternalWorktreesInboxLine
            repoDisplayName={proj.name}
            hiddenWorktrees={hiddenWorktrees}
            baselinePaths={proj.externalWorktreeInboxBaselinePaths}
            suppressed={proj.suppressed_discovery === true}
            onShow={
              onShowHiddenWorktree
                ? (worktreePath) => onShowHiddenWorktree(proj, worktreePath)
                : undefined
            }
            onKeepHidden={
              onKeepHiddenWorktrees
                ? (worktreePaths) => onKeepHiddenWorktrees(proj, worktreePaths)
                : undefined
            }
            onSuppress={
              onSuppressHiddenWorktrees
                ? () => onSuppressHiddenWorktrees(proj)
                : undefined
            }
          />

          {/* Expanded Worktrees List */}
          {!isCollapsed && (
            <div className="space-y-0.5">
              {worktrees.length > 0 ? (
                worktrees.map((wt) => {
                  const wtSessions = sessions.filter(
                    (s) =>
                      s.project_path === wt.path ||
                      (wt.is_main && s.project_path === proj.path)
                  );
                  const isFocused = (activeWorktreePath ?? null) === wt.path;
                  const isRevealed = highlightedRevealPath === wt.path;
                  // Orca geometry (worktree-list/rows/item-row.tsx:183-205): the row
                  // applies `surfaceInset` as padding and hands the card the content
                  // indent, both derived from group depth — without it every card sits
                  // flush with its project header.
                  const isGrouped = displayOptions.groupBy !== "none";
                  const groupDepth = inGroup ? 1 : 0;
                  const surfaceInset = getWorktreeCardSurfaceInset({ isGrouped, groupDepth });
                  const cardContentIndent = Math.max(
                    0,
                    getWorktreeCardContentIndent({ isGrouped, groupDepth, lineageDepth: 0 }) -
                      surfaceInset
                  );

                  return (
                    <div
                      key={wt.path}
                      data-worktree-path={wt.path}
                      className="relative"
                      style={surfaceInset > 0 ? { paddingLeft: `${surfaceInset}px` } : undefined}
                    >
                      <WorktreeCard
                        worktree={wt}
                        // Lane signals: agent sessions + a mounted terminal decide the
                        // dot; the PR display (when the host reports one) outranks it.
                        status={workspaceStatusFrom({
                          sessions: wtSessions,
                          hasLiveTerminal: (liveWorkspacePaths ?? new Set<string>()).has(wt.path),
                        })}
                        prDisplay={prByPath?.[wt.path] ?? null}
                        project={proj}
                        repo={proj}
                        // Why Orca hides it here: inside a repo group the avatar is already
                        // on the header, so the card lane belongs to status/branch (item-row.tsx:213).
                        hideRepoBadge={isGrouped}
                        contentIndent={cardContentIndent}
                        flushSurface
                        isActive={activeWorktreePath === wt.path}
                        isCurrentWorktree={activeWorktreePath === wt.path}
                        isFocused={isFocused}
                        revealHighlight={isRevealed}
                        isPinned={pinnedWorktrees?.has(wt.path)}
                        isUnread={unreadWorktrees?.has(wt.path)}
                        compactCards={compactCards}
                        ports={portsByWorktree?.get(wt.path) || []}
                        sessions={wtSessions}
                        dropTarget={worktreeDropTarget}
                        onSelect={onSelectGitWorktree}
                        onDelete={onDeleteGitWorktree}
                        onRename={
                          onRenameWorktreeTitle
                            ? (newTitle) => onRenameWorktreeTitle(wt.path, newTitle)
                            : undefined
                        }
                        onContextMenu={onWorktreeContextMenu}
                        onSelectSession={onSelectSession}
                        onDragStart={
                          onWorktreeDragStart
                            ? (e, path) => onWorktreeDragStart(e, path)
                            : undefined
                        }
                        onDragOver={
                          onWorktreeDragOver
                            ? (e, path) => onWorktreeDragOver(e, path)
                            : undefined
                        }
                        onDrop={
                          onWorktreeDrop
                            ? (e, path) => onWorktreeDrop(e, path, proj)
                            : undefined
                        }
                        onDragEnd={onWorktreeDragEnd}
                      />
                    </div>
                  );
                })
              ) : (
                <div className="px-2 py-1.5 text-[11px] text-worktree-sidebar-foreground/40 italic">
                  No workspaces
                </div>
              )}
            </div>
          )}
        </div>
      );
    },
    [
      query,
      collapsedProjects,
      getFilteredAndSortedWorktrees,
      hiddenWorktreesByProject,
      projectDropTarget,
      draggedProjectId,
      activeProject?.path,
      onToggleProjectCollapse,
      onSelectProject,
      onOpenNewWorkspaceModal,
      onProjectContextMenu,
      onProjectDragStart,
      onProjectDragOver,
      onProjectDrop,
      onProjectDragEnd,
      onSuppressHiddenWorktrees,
      onShowHiddenWorktree,
      onKeepHiddenWorktrees,
      sessions,
      activeWorktreePath,
      highlightedRevealPath,
      pinnedWorktrees,
      unreadWorktrees,
      compactCards,
      portsByWorktree,
      worktreeDropTarget,
      onSelectGitWorktree,
      onDeleteGitWorktree,
      onRenameWorktreeTitle,
      onWorktreeContextMenu,
      onSelectSession,
      onWorktreeDragStart,
      onWorktreeDragOver,
      onWorktreeDrop,
      onWorktreeDragEnd,
    ]
  );

  // Grouped and ungrouped project rendering
  const content = useMemo(() => {
    const nodes: React.JSX.Element[] = [];
    const groupedProjectIds = new Set<string>();

    if (projectGroups && projectGroups.length > 0) {
      for (const group of projectGroups) {
        const groupProjects = visibleProjects.filter(
          (p) => projectGroupMap?.[p.id] === group.id
        );
        for (const p of groupProjects) groupedProjectIds.add(p.id);

        const isGroupCollapsed = collapsedGroups.has(group.id);
        const isGroupDropTarget = groupDropTargetId === group.id;

        nodes.push(
          <React.Fragment key={`group-${group.id}`}>
            {/* Group Header via SectionHeader */}
            <SectionHeader
              variant="group"
              group={group}
              isCollapsed={isGroupCollapsed}
              // Orca counts the whole subtree (repos + folder workspaces + subgroups);
              // `count` only arms the collapse chevron, but it must include the folder
              // rows or a folder-only group loses its chevron (Parity: SectionHeader.tsx
              // `showHeaderCollapseAffordance = row.count > 0`).
              count={
                groupProjects.length +
                (folderWorkspaces ?? []).filter((w) => w.projectGroupId === group.id).length
              }
              onToggleCollapse={() => onToggleGroupCollapse(group.id)}
              onContextMenu={
                onGroupContextMenu ? (e) => onGroupContextMenu(e, group) : undefined
              }
              onOpenNewWorkspace={
                onOpenNewWorkspaceModal
                  ? () => {
                      const folder = (folderWorkspaces ?? []).find(
                        (w) => w.projectGroupId === group.id
                      );
                      if (!folder) return;
                      onOpenNewWorkspaceModal({
                        id: `folder-${folder.id}`,
                        name: group.name,
                        path: folder.folderPath,
                        is_git: false,
                        current_branch: "",
                      });
                    }
                  : undefined
              }
              isDropTarget={isGroupDropTarget}
            />

            {/* Group folder-workspace rows (Orca folder-row visual parity) */}
            {!isGroupCollapsed &&
              (folderWorkspaces ?? [])
                .filter((w) => w.projectGroupId === group.id)
                .map((w) => (
                  <FolderWorkspaceRow
                    key={`folder-ws-${w.id}`}
                    name={w.name}
                    folderPath={w.folderPath}
                    status={workspaceStatusFrom({
                      sessions: sessions.filter((s) => s.project_path === w.folderPath),
                      hasLiveTerminal: (liveWorkspacePaths ?? new Set<string>()).has(w.folderPath),
                    })}
                    pathMissing={(missingFolderPaths ?? new Set<string>()).has(w.folderPath)}
                    isActive={activeWorktreePath === w.folderPath}
                    onActivate={() => onActivateFolderWorkspace?.(w.folderPath)}
                  />
                ))}
            {/* Group Projects (Orca flat: header + folder rows + repos, no wrapper) */}
            {!isGroupCollapsed && (
              <div className="space-y-1">
                {groupProjects.length > 0 ? (
                  groupProjects.map((p) => renderProjectNode(p, true))
                ) : (
                  (folderWorkspaces ?? []).filter((w) => w.projectGroupId === group.id).length === 0 && (
                    <div className="px-2 py-1 text-[10px] text-worktree-sidebar-foreground/40 italic">
                      Drag projects here to group them
                    </div>
                  )
                )}
              </div>
            )}
          </React.Fragment>
        );
      }
    }

    // Ungrouped projects
    const ungrouped = visibleProjects.filter((p) => !groupedProjectIds.has(p.id));
    for (const p of ungrouped) {
      nodes.push(renderProjectNode(p, false));
    }

    return nodes;
  }, [
    projectGroups,
    visibleProjects,
    projectGroupMap,
    collapsedGroups,
    groupDropTargetId,
    onGroupDragOver,
    onGroupDragLeave,
    onGroupDrop,
    onToggleGroupCollapse,
    onGroupContextMenu,
    renderProjectNode,
  ]);

  if (projects.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
        <FolderPlus className="size-8 text-worktree-sidebar-foreground/30 mb-2" />
        <p className="text-xs text-worktree-sidebar-foreground/60 mb-3">
          No projects added yet
        </p>
        <button
          type="button"
          onClick={onOpenAddRepoDialog}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition cursor-pointer"
        >
          <Plus className="size-3.5" />
          Add Project
        </button>
      </div>
    );
  }

  if (visibleProjects.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-8 px-4 text-center ${className}`}>
        <p className="text-xs text-worktree-sidebar-foreground/50 mb-2">
          No workspaces matching "{filter}"
        </p>
        {onClearFilter && (
          <button
            type="button"
            onClick={onClearFilter}
            className="text-xs text-indigo-400 hover:text-indigo-300 transition cursor-pointer"
          >
            Clear filter
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-1 ${className}`}>
      {content}
    </div>
  );
}

export default WorktreeList;
