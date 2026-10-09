// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
import React, { useMemo, useCallback, useLayoutEffect, useEffect, useRef, useState } from "react";
import { useAppStore } from "@/store";
import { ChevronDown, FolderPlus, Plus } from "lucide-react";
import { cn } from "../../lib/utils";
import { getShortcutPlatform } from "../../lib/shortcut-platform";
import { keybindingMatchesAction } from "../../shared/keybindings";
import type { KeybindingOverrides } from "../../shared/keybindings";
import { SectionHeader } from "./SectionHeader";
import { WorktreeCard } from "./WorktreeCard";
import { invoke } from "@tauri-apps/api/core";
import type { WorktreeRenameRequest } from "./worktree-card-model";
import { getDeleteStateForWorktreeHost } from "./worktree-delete-state-host-match";
import type { WorktreeDeleteState } from "../../store/slices/worktree-delete-state-types";
import { FolderWorkspaceRow } from "./FolderWorkspaceRow";
import { workspaceStatusFrom } from "../../lib/workspace-status-signals";
import {
  buildSidebarLiveActivityIndex,
  isVisibleUnderSidebarMenuFilters,
} from "./visible-worktree-filters";
import { getGitHubPRCacheKey } from "@/store/slices/github-cache-key";
import { buildHostIdByRepoId } from "./repo-execution-host-index";
import {
  normalizeExecutionHostScope,
  normalizeVisibleExecutionHostIds,
  type ExecutionHostId,
} from "../../shared/execution-host";
import type { Repo } from "../../shared/repo-types";
import type { FolderWorkspace } from "../../shared/folder-workspace-types";
import type { ProjectGroup as SharedProjectGroup } from "../../shared/project-group-types";
import type { Worktree } from "../../shared/worktree/types";
import type { HostHeaderRow, HostSectionRow } from "./host-section-rows";
import { HostSectionHeaderMenu } from "./HostSectionHeaderMenu";
import {
  getPinnedWorktreeDisplayPolicy,
  type FolderWorkspaceRow as FolderWorkspaceRowModel,
  type GroupHeaderRow,
  type PinnedWorktreeDisplayPolicy,
  type WorktreeRow,
} from "./worktree-list/grouping/row-types";
import {
  WORKTREE_SECTION_HEADER_PADDING_LEFT,
  getWorktreeCardContentIndent,
  getWorktreeCardSurfaceInset,
} from "./worktree-list/rows/indentation";
import {
  buildExternalWorktreeNoticeCandidates,
  computeSidebarRows,
  type SidebarRowsState,
} from "./rendered-sidebar-worktree-order";
import { NewExternalWorktreesInboxLine } from "./worktree-list/rows/NewExternalWorktreesInboxLine";
import { ImportedWorktreesVisibilityLine } from "./worktree-list/rows/ImportedWorktreesVisibilityLine";
import {
  setVisibleWorktreeIds,
  setVisibleWorktreeShortcutTargets,
  type VisibleWorktreeShortcutTarget,
} from "./visible-worktrees";
import type { PrDisplay } from "./pr-display";
import type {
  HydraProject,
  GitWorktreeInfo,
  WorktreeSession,
  WorkspacePort,
  ProjectGroup,
} from "./types";
import type { WorkspaceDisplayOptions } from "./WorkspaceOptionsMenu";
import { toWorktreeRow } from "../../shared/worktree/worktree-row";
import { applyWorktreeGroupOrder } from "./worktree-group-order";
import { buildManualOrderUpdatesForVisibleGroups } from "./worktree-manual-order";
import { WorktreeListDragProvider } from "./worktree-list/drag/WorktreeListDragProvider";
import {
  WorktreeDragDropIndicator,
  WorktreeDragRow,
} from "./worktree-list/drag/worktree-drag-surface";
import type { WorktreeGroupReorderArgs } from "./worktree-list/drag/drop-commit-context";
import { VirtualizedWorktreeViewport } from "./worktree-list/viewport/VirtualizedWorktreeViewport";
import type { WorktreeVirtualRowSlot } from "./worktree-list/viewport/viewport-props";

// ─── Hydra props → Orca row-pipeline projection ──────────────────────────────
//
// The sidebar's painted model is Hydra's `HydraProject`/`GitWorktreeInfo`; the
// ported row pipeline speaks Orca's `Repo`/`Worktree`. These adapters are the
// ONE place that bridge is made — grouping, pinning, lane order and section
// elision all stay in the pipeline (`computeSidebarRows`).

/** Collapsed-state keys the pipeline reads, derived from the sidebar's two sets. */
function pipelineCollapsedKeys(
  collapsedProjects: Set<string>,
  collapsedGroups: Set<string>
): Set<string> {
  const keys = new Set<string>();
  // Project headers collapse by `repo:<id>`; Hydra persists the bare project id.
  for (const id of collapsedProjects) keys.add(`repo:${id}`);
  // Group headers collapse by `project-group:<id>`; Hydra persists the bare group id.
  // Keys already carrying their prefix (`all`, `pinned`, `host:…`) pass through.
  for (const id of collapsedGroups) keys.add(id.includes(":") ? id : `project-group:${id}`);
  return keys;
}

/** Stable empty map: the store seeds no delete state, and a fresh `{}` would thrash memos. */
const EMPTY_DELETE_STATE: Record<string, WorktreeDeleteState | undefined> = {};

export type WorkspaceSidebarShortcutAction = "workspace.rename" | "workspace.delete";

const WORKSPACE_SIDEBAR_SHORTCUT_ACTIONS: readonly WorkspaceSidebarShortcutAction[] = [
  "workspace.rename",
  "workspace.delete",
];

/**
 * Resolves which sidebar workspace shortcut a keydown fires, if any (D04a G9).
 * The event doubles as the matcher's `KeybindingInput` — it carries `key`/`code`
 * and the physical modifier state — so the store's overrides and the platform
 * decide the result exactly as the shortcuts settings screen shows it.
 *
 * Why the editable guard: a shortcut typed into a field belongs to the field, not
 * the sidebar — the inline rename editor, the filter box and modal inputs are all
 * editable targets.
 */
export function matchWorkspaceSidebarShortcut(
  event: KeyboardEvent,
  keybindings: KeybindingOverrides | undefined,
  platform: NodeJS.Platform = getShortcutPlatform()
): WorkspaceSidebarShortcutAction | null {
  const target = event.target;
  const editableTarget =
    target instanceof Element &&
    target.closest('input, textarea, select, [contenteditable="true"]') !== null;
  if (event.defaultPrevented || editableTarget) return null;
  for (const actionId of WORKSPACE_SIDEBAR_SHORTCUT_ACTIONS) {
    if (keybindingMatchesAction(actionId, event, platform, keybindings)) {
      return actionId;
    }
  }
  return null;
}

/**
 * The workspace a sidebar shortcut acts on: the active one. Orca resolves the
 * hovered row, but Hydra's rows publish no hover identity, and `workspace.delete`
 * is documented as acting on the current workspace.
 */
export function resolveWorkspaceShortcutTarget(
  activeWorktreePath: string | null | undefined,
  projects: readonly HydraProject[],
  getWorktreesForProject: (project: HydraProject) => GitWorktreeInfo[]
): { worktree: GitWorktreeInfo; project: HydraProject } | null {
  if (!activeWorktreePath) return null;
  for (const project of projects) {
    const worktree = getWorktreesForProject(project).find((wt) => wt.path === activeWorktreePath);
    if (worktree) return { worktree, project };
  }
  return null;
}

function toPipelineRepo(args: {
  project: HydraProject;
  projectGroupId: string | null;
  hostId: ExecutionHostId | undefined;
}): Repo {
  const { project, projectGroupId, hostId } = args;
  return {
    id: project.id,
    path: project.path,
    displayName: project.displayName ?? project.name,
    badgeColor: project.color ?? "#64748b",
    addedAt: 0,
    projectGroupId,
    // Why: the discovered-worktree notice candidates are built off the repo
    // (Orca `buildImportedWorktreesCardCandidates`), so the pipeline repo has to
    // carry the phase state the project persists — otherwise every repo looks
    // un-prompted and un-suppressed.
    ...(project.externalWorktreeVisibilityPromptDismissedAt != null
      ? { externalWorktreeVisibilityPromptDismissedAt: project.externalWorktreeVisibilityPromptDismissedAt }
      : {}),
    ...(project.externalWorktreeInboxBaselinePaths
      ? { externalWorktreeInboxBaselinePaths: project.externalWorktreeInboxBaselinePaths }
      : {}),
    ...(project.externalWorktreeDiscoverySuppressedAt != null
      ? { externalWorktreeDiscoverySuppressedAt: project.externalWorktreeDiscoverySuppressedAt }
      : {}),
    ...(hostId ? { executionHostId: hostId } : {}),
  };
}

function toPipelineProjectGroup(
  group: ProjectGroup,
  folderWorkspacePath: string | undefined
): SharedProjectGroup {
  return {
    id: group.id,
    name: group.name,
    // Why the folder path: the pipeline gates folder-workspace rows on a
    // folder-backed group (`projectGroup.parentPath`), and Hydra's sidebar group
    // carries no root — only its folder workspaces prove the group is folder-backed.
    parentPath: folderWorkspacePath ?? null,
    parentGroupId: null,
    createdFrom: "manual",
    tabOrder: 0,
    isCollapsed: group.isCollapsed ?? false,
    color: null,
    createdAt: 0,
    updatedAt: 0,
  };
}

function toPipelineFolderWorkspace(workspace: {
  id: string;
  projectGroupId: string;
  name: string;
  folderPath: string;
}): FolderWorkspace {
  return {
    id: workspace.id,
    projectGroupId: workspace.projectGroupId,
    name: workspace.name,
    folderPath: workspace.folderPath,
    linkedTask: null,
    comment: "",
    isArchived: false,
    isUnread: false,
    isPinned: false,
    sortOrder: 0,
    lastActivityAt: 0,
    createdAt: 0,
    updatedAt: 0,
  };
}

/** `prByPath` (Hydra's review display) → the Orca `prCache` shape PR lanes read. */
function buildPRCache(args: {
  worktrees: readonly { project: HydraProject; worktree: GitWorktreeInfo }[];
  repos: readonly Repo[];
  prByPath: Record<string, PrDisplay> | undefined;
}): Record<string, unknown> {
  const cache: Record<string, unknown> = {};
  if (!args.prByPath) return cache;
  const repoById = new Map(args.repos.map((repo) => [repo.id, repo]));
  for (const { project, worktree } of args.worktrees) {
    const display = args.prByPath[worktree.path];
    const repo = repoById.get(project.id);
    if (!display || !repo || !worktree.branch) continue;
    const key = getGitHubPRCacheKey(
      repo.path,
      repo.id,
      worktree.branch,
      undefined,
      repo.connectionId,
      repo.executionHostId,
      true
    );
    cache[key] = { data: { number: display.number, state: display.state } };
  }
  return cache;
}

interface SidebarRowModel {
  rows: HostSectionRow[];
  /**
   * Pinned-placement policy the row pipeline built these rows with. Read here, from the same
   * pipeline settings, so the keyboard cycle dedupes duplicated pinned rows exactly like the
   * painted list does.
   */
  pinnedDisplayPolicy: PinnedWorktreeDisplayPolicy;
  /** Projection worktree path → the Hydra prop the card and its callbacks expect. */
  propWorktreeByPath: Map<string, GitWorktreeInfo>;
  propProjectById: Map<string, HydraProject>;
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
  /**
   * Published delete state per host-qualified workspace identity (D04a G5). The
   * card paints its in-place delete overlay from the entry that names it, so a
   * cancelled/failed confirmation releases the card instead of latching.
   */
  deleteStateByWorktreeId?: Record<string, WorktreeDeleteState | undefined>;
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
  /** Open the `Non-Hydra worktrees` modal from the compact pill. */
  onReviewHiddenWorktrees?: (proj: HydraProject) => void;

  // Drag and drop state & handlers
  draggedWorktreePath?: string | null;
  worktreeDropTarget?: { path: string; position: "top" | "bottom" } | null;
  /**
   * The panel's scroll container. The viewport renders that container and assigns it here, so
   * the pointer drag measures row rects against the real scroller and the reveal/anchor code
   * records against the element that actually scrolls.
   */
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  /**
   * Commits a pointer-drag reorder of one group, in the order the rows now have. The
   * panel routes it through the same write path the HTML5 drop uses.
   */
  onReorderWorktreesInGroup?: (ordered: GitWorktreeInfo[], projectPath: string) => void;
  /**
   * The app's own workspace-status write (`set_worktree_status` + the local worktree
   * maps). A sidebar row dragged onto an open workspace board commits through it, so the
   * board and the context menu share one writer (D08-002/D08-040).
   */
  onAssignWorktreeStatus: (worktreePath: string, status: string) => void | Promise<void>;
  /**
   * The app's own pin write (`set_worktree_flags` with `is_pinned`). A sidebar row dragged
   * onto an open workspace board's pin strip commits through it, so the board strip and the
   * row menu share one writer (D08-028).
   */
  onPinWorktreePaths: (worktreePaths: readonly string[]) => void;
  draggedProjectId?: string | null;
  projectDropTarget?: { id: string; position: "top" | "bottom" } | null;
  groupDropTargetId?: string | null;
  onWorktreeDragStart?: (e: React.DragEvent, path: string) => void;
  onWorktreeDragOver?: (e: React.DragEvent, path: string) => void;
  onWorktreeDrop?: (e: React.DragEvent, path: string, proj: HydraProject) => void;
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

/** Lane header for the pipeline's non-repo sections (All / Pinned / status / PR). */
const LaneSectionHeader = React.memo(function LaneSectionHeader({
  row,
  isCollapsed,
  onToggleCollapse,
}: {
  row: GroupHeaderRow;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}): React.JSX.Element {
  const Icon = row.icon;
  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={!isCollapsed}
      aria-label={row.label}
      data-section-header-id={row.key}
      className="group relative flex h-7 w-full items-center gap-1.5 pr-2 text-left transition-all cursor-pointer select-none rounded-md text-worktree-sidebar-foreground/80 hover:bg-worktree-sidebar-accent/50 hover:text-worktree-sidebar-foreground"
      style={{ paddingLeft: WORKTREE_SECTION_HEADER_PADDING_LEFT }}
      onClick={onToggleCollapse}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggleCollapse();
        }
      }}
    >
      {Icon ? <Icon className={cn("size-3.5 shrink-0", row.tone)} /> : null}
      <div className="min-w-0 flex-1 truncate text-[13px] font-semibold leading-none">
        {row.label}
      </div>
      {row.count > 0 ? (
        <span className="text-[10px] tabular-nums text-muted-foreground">{row.count}</span>
      ) : null}
      <ChevronDown
        className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform", isCollapsed && "-rotate-90")}
        aria-hidden
      />
    </div>
  );
});

/** Host section header (Orca `rows/HostSectionHeader.tsx`): the multi-host grouping tier. */
const HostSectionHeader = React.memo(function HostSectionHeader({
  row,
  isCollapsed,
  onToggleCollapse,
}: {
  row: HostHeaderRow;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}): React.JSX.Element {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={!isCollapsed}
      aria-label={row.label}
      data-host-header-id={row.hostId}
      className="group/host-header relative flex h-7 w-full items-center gap-1.5 pr-2 text-left transition-all cursor-pointer select-none rounded-md text-worktree-sidebar-foreground/80 hover:bg-worktree-sidebar-accent/50 hover:text-worktree-sidebar-foreground"
      style={{ paddingLeft: WORKTREE_SECTION_HEADER_PADDING_LEFT }}
      onClick={onToggleCollapse}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggleCollapse();
        }
      }}
    >
      <div className="min-w-0 flex-1 truncate text-[13px] font-semibold leading-none">
        {row.label}
      </div>
      <span className="min-w-0 truncate text-[10px] text-muted-foreground">{row.detail}</span>
      {row.count > 0 ? (
        <span className="text-[10px] tabular-nums text-muted-foreground">{row.count}</span>
      ) : null}
      <ChevronDown
        className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform", isCollapsed && "-rotate-90")}
        aria-hidden
      />
      <HostSectionHeaderMenu row={row} />
    </div>
  );
});

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
  deleteStateByWorktreeId = EMPTY_DELETE_STATE,
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
  onReviewHiddenWorktrees,
  worktreeDropTarget,
  scrollRef,
  onReorderWorktreesInGroup,
  onAssignWorktreeStatus,
  onPinWorktreePaths,
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
  const livePaths = liveWorkspacePaths ?? new Set<string>();
  const missingPaths = missingFolderPaths ?? new Set<string>();
  const pinnedSet = pinnedWorktrees ?? new Set<string>();
  const unreadSet = unreadWorktrees ?? new Set<string>();

  // Host ownership + host-section inputs come from the Orca-compat catalog: the
  // catalog→sidebar bridge drops host fields, so this is the only host source on
  // the render path (empty in a single-host install → no host tier, as today).
  const storeRepos = useAppStore((s) => s.repos);
  const storeSshTargetLabels = useAppStore((s) => s.sshTargetLabels);
  const storeSshConnectionStates = useAppStore((s) => s.sshConnectionStates);
  const storeRuntimeEnvironments = useAppStore((s) => s.runtimeEnvironments);
  const storeRuntimeStatusByEnvironmentId = useAppStore((s) => s.runtimeStatusByEnvironmentId);
  const storeSettings = useAppStore((s) => s.settings);
  const storeWorkspaceHostScope = useAppStore((s) => s.workspaceHostScope);
  const storeVisibleWorkspaceHostIds = useAppStore((s) => s.visibleWorkspaceHostIds);
  const storeWorktreeLineageById = useAppStore((s) => s.worktreeLineageById);
  const storeKeybindings = useAppStore((s) => s.keybindings);
  // Why (D04a G9): the sidebar keyboard path owns the inline-rename request for
  // `workspace.rename`; the card it names consumes and clears it.
  const [renameRequest, setRenameRequest] = useState<WorktreeRenameRequest | null>(null);
  // Why normalize: the store seeds `visibleWorkspaceHostIds: []` before the UI
  // slice hydrates, and `[]` means "no host visible" — it would blank the list.
  const pipelineHostScope = normalizeExecutionHostScope(storeWorkspaceHostScope);
  const pipelineVisibleHostIds = normalizeVisibleExecutionHostIds(storeVisibleWorkspaceHostIds);

  // Filter projects by search query (project identity or a matching workspace).
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

  // Host ownership per repo, shared by the row pipeline and the delete-state
  // resolution below: a card's delete state is keyed by host-qualified identity.
  const hostIdByRepoId = useMemo(() => buildHostIdByRepoId(storeRepos as Repo[]), [storeRepos]);

  const rowModel = useMemo<SidebarRowModel>(() => {
    const pipelineRepos = visibleProjects.map((project) =>
      toPipelineRepo({
        project,
        projectGroupId: projectGroupMap?.[project.id] ?? null,
        hostId: hostIdByRepoId.get(project.id),
      })
    );
    const pipelineGroups = projectGroups.map((group) =>
      toPipelineProjectGroup(
        group,
        folderWorkspaces.find((workspace) => workspace.projectGroupId === group.id)?.folderPath
      )
    );
    const pipelineFolderWorkspaces = folderWorkspaces.map(toPipelineFolderWorkspace);

    const liveActivity = buildSidebarLiveActivityIndex(sessions, livePaths);

    const propWorktreeByPath = new Map<string, GitWorktreeInfo>();
    const propProjectById = new Map<string, HydraProject>();
    const worktreesByRepo: Record<string, Worktree[]> = {};
    const candidates: { project: HydraProject; worktree: GitWorktreeInfo }[] = [];
    for (const project of visibleProjects) {
      propProjectById.set(project.id, project);
      const hostId = hostIdByRepoId.get(project.id);
      const projectedForRepo: Worktree[] = [];
      for (const worktree of getFilteredAndSortedWorktrees(project)) {
        const worktreeSessions = sessions.filter(
          (s) => s.project_path === worktree.path || (worktree.is_main && s.project_path === project.path)
        );
        const status = workspaceStatusFrom({
          sessions: worktreeSessions,
          hasLiveTerminal: livePaths.has(worktree.path),
        });
        const projected = toWorktreeRow(worktree, {
          repoId: project.id,
          hostId,
          isPinned: pinnedSet.has(worktree.path),
          isUnread: unreadSet.has(worktree.path),
          status,
        });
        // Menu filters (Orca's ported predicates, never a re-derived rule). Shared
        // with the workspace board so both surfaces hide the same workspaces.
        if (
          !isVisibleUnderSidebarMenuFilters({
            worktree: projected,
            displayOptions,
            liveActivity,
          })
        ) {
          continue;
        }
        propWorktreeByPath.set(worktree.path, worktree);
        candidates.push({ project, worktree });
        projectedForRepo.push(projected);
      }
      if (projectedForRepo.length > 0) worktreesByRepo[project.id] = projectedForRepo;
    }

    const pipelineState: SidebarRowsState = {
      settings: storeSettings,
      visibleWorkspaceHostIds: pipelineVisibleHostIds,
      workspaceHostScope: pipelineHostScope,
      projectGroups: pipelineGroups,
      groupBy: displayOptions.groupBy,
      worktreeCardProperties: [],
      repos: pipelineRepos,
      worktreesByRepo,
      collapsedGroups: pipelineCollapsedKeys(collapsedProjects, collapsedGroups),
      worktreeLineageById: storeWorktreeLineageById,
      folderWorkspaces: pipelineFolderWorkspaces,
      sshTargetLabels: storeSshTargetLabels,
      sshConnectionStates: storeSshConnectionStates,
      runtimeEnvironments: storeRuntimeEnvironments,
      runtimeStatusByEnvironmentId: storeRuntimeStatusByEnvironmentId,
      prCache: buildPRCache({ worktrees: candidates, repos: pipelineRepos, prByPath }),
      hostedReviewCache: null,
    };

    return {
      rows: computeSidebarRows(
        pipelineState,
        Object.values(worktreesByRepo).flat(),
        buildExternalWorktreeNoticeCandidates({
          repos: pipelineRepos,
          hiddenWorktreesByProjectPath: hiddenWorktreesByProject ?? {},
        })
      ),
      pinnedDisplayPolicy: getPinnedWorktreeDisplayPolicy(pipelineState.settings),
      propWorktreeByPath,
      propProjectById,
    };
  }, [
    visibleProjects,
    projectGroups,
    folderWorkspaces,
    projectGroupMap,
    sessions,
    livePaths,
    pinnedSet,
    unreadSet,
    hiddenWorktreesByProject,
    displayOptions.groupBy,
    displayOptions.hideAutomationCreated,
    displayOptions.hideCliCreated,
    displayOptions.hideSleeping,
    getFilteredAndSortedWorktrees,
    prByPath,
    collapsedProjects,
    collapsedGroups,
    hostIdByRepoId,
    storeRepos,
    storeSettings,
    pipelineHostScope,
    pipelineVisibleHostIds,
    storeWorktreeLineageById,
    storeSshTargetLabels,
    storeSshConnectionStates,
    storeRuntimeEnvironments,
    storeRuntimeStatusByEnvironmentId,
  ]);

  const { rows } = rowModel;

  // ─── Virtualized viewport inputs ───────────────────────────────────────────
  //
  // The viewport renders the scroll container itself and assigns it here, so the panel's ref
  // (pointer-drag geometry, scroll-anchor recording, reveal) keeps pointing at the real
  // scroller. Without a caller ref — unit renders, composed lists — it owns one.
  const internalScrollRef = useRef<HTMLDivElement | null>(null);
  const viewportScrollRef = scrollRef ?? internalScrollRef;
  const pinnedDisplayPolicy = rowModel.pinnedDisplayPolicy;

  /** Row key of the active workspace: the row `aria-activedescendant` points at. */
  const activeRowKey = useMemo(() => {
    if (!activeWorktreePath) return null;
    for (const row of rows) {
      if (row.type === "folder-workspace" && row.folderWorkspace.folderPath === activeWorktreePath) {
        return row.key;
      }
      if (row.type === "item" && row.worktree.path === activeWorktreePath) {
        return row.rowKey;
      }
    }
    return null;
  }, [rows, activeWorktreePath]);

  /**
   * Collapse/expand a painted row's section. The row union carries three collapse vocabularies
   * (host section key, project id, group id) and the persisted sets speak the Hydra one, so the
   * mapping lives here, next to the callbacks that own it.
   */
  const toggleRowCollapse = useCallback(
    (row: HostSectionRow) => {
      if (row.type === "host-header") {
        onToggleGroupCollapse(row.key);
        return;
      }
      if (row.type !== "header") return;
      if (row.repo) {
        onToggleProjectCollapse(row.repo.id);
        return;
      }
      if (row.projectGroup && typeof row.projectGroup.id === "string") {
        onToggleGroupCollapse(row.projectGroup.id);
        return;
      }
      onToggleGroupCollapse(row.key);
    },
    [onToggleGroupCollapse, onToggleProjectCollapse]
  );

  /** Keyboard navigation activated a row: select the workspace it paints. */
  const activateRow = useCallback(
    (row: WorktreeRow) => {
      const worktree = rowModel.propWorktreeByPath.get(row.worktree.path);
      if (worktree) onSelectGitWorktree(worktree);
    },
    [onSelectGitWorktree, rowModel]
  );

  // ─── Pointer-drag reorder → the panel's order writer ───────────────────────
  //
  // The drag speaks Orca row ids; the writer speaks Hydra's project worktree list.
  // This is the ONE bridge between them, and it commits through the same
  // `onReorderWorktreesInGroup` the HTML5 drop handler uses — never a second write.
  const dragWorktreeById = useMemo(() => {
    const byId = new Map<string, { worktree: GitWorktreeInfo; project: HydraProject }>();
    for (const row of rows) {
      if (row.type !== "item") continue;
      const worktree = rowModel.propWorktreeByPath.get(row.worktree.path);
      const project = rowModel.propProjectById.get(row.worktree.repoId);
      if (worktree && project) byId.set(row.worktree.id, { worktree, project });
    }
    return byId;
  }, [rowModel, rows]);

  const dragWorktreeIds = useMemo(() => [...dragWorktreeById.keys()], [dragWorktreeById]);

  const handlePointerGroupReorder = useCallback(
    (dragArgs: WorktreeGroupReorderArgs) => {
      if (!onReorderWorktreesInGroup) return;
      // The manual-order module owns the reorder: it replays the group through
      // `buildSparseManualOrderUpdates` and reports whether anything moved.
      const { changed, orderedIds } = buildManualOrderUpdatesForVisibleGroups({
        groups: dragArgs.groups,
        sourceGroupKey: dragArgs.sourceGroupKey,
        draggedIds: dragArgs.draggedIds,
        dropIndex: dragArgs.dropIndex,
        now: Date.now(),
        allWorktreeIds: dragWorktreeIds,
      });
      if (!changed) return;

      const orderedByProject = new Map<
        string,
        { project: HydraProject; worktrees: GitWorktreeInfo[] }
      >();
      for (const worktreeId of orderedIds) {
        const entry = dragWorktreeById.get(worktreeId);
        if (!entry) continue;
        const bucket = orderedByProject.get(entry.project.path) ?? {
          project: entry.project,
          worktrees: [],
        };
        bucket.worktrees.push(entry.worktree);
        orderedByProject.set(entry.project.path, bucket);
      }
      for (const { project, worktrees } of orderedByProject.values()) {
        onReorderWorktreesInGroup(
          applyWorktreeGroupOrder(getFilteredAndSortedWorktrees(project), worktrees),
          project.path
        );
      }
    },
    [
      dragWorktreeById,
      dragWorktreeIds,
      getFilteredAndSortedWorktrees,
      onReorderWorktreesInGroup,
    ]
  );

  // ─── Pointer-drag board drop → the panel's status writer ───────────────────
  //
  // The drag speaks Orca row ids; the app's writer speaks workspace paths. This is the
  // ONE bridge for a card dropped on an open board, and it commits through the same
  // `onAssignWorktreeStatus` the context menu and the board's own card drop use.
  const handleAssignWorktreesStatus = useCallback(
    (worktreeIds: readonly string[], status: string) => {
      for (const worktreeId of worktreeIds) {
        const entry = dragWorktreeById.get(worktreeId);
        if (entry) void onAssignWorktreeStatus(entry.worktree.path, status);
      }
    },
    [dragWorktreeById, onAssignWorktreeStatus]
  );

  // ─── Pointer-drag pin-strip drop → the panel's pin writer ──────────────────
  //
  // The same id→path bridge, for the board's pin strip: the drag speaks row ids, the app's
  // pin writer speaks workspace paths. One writer for both the strip and the row menu.
  const handlePinWorktrees = useCallback(
    (worktreeIds: readonly string[]) => {
      const worktreePaths: string[] = [];
      for (const worktreeId of worktreeIds) {
        const entry = dragWorktreeById.get(worktreeId);
        if (entry) worktreePaths.push(entry.worktree.path);
      }
      if (worktreePaths.length > 0) onPinWorktreePaths(worktreePaths);
    },
    [dragWorktreeById, onPinWorktreePaths]
  );

  // Same contract as Orca `use-selection`: publish before paint so Cmd+1–9 matches
  // the painted cards. Null on unmount (sidebar closed) means "recompute".
  const shortcutTargets = useMemo(() => {
    const targets: VisibleWorktreeShortcutTarget[] = [];
    const seen = new Set<string>();
    for (const row of rows) {
      if (row.type !== "item") continue;
      const prop = rowModel.propWorktreeByPath.get(row.worktree.path);
      const id = prop?.id || prop?.path || row.worktree.path;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      targets.push({
        id,
        ...(row.worktree.hostId ? { executionHostId: row.worktree.hostId } : {}),
      });
    }
    return targets;
  }, [rows, rowModel]);

  useLayoutEffect(() => {
    setVisibleWorktreeIds(shortcutTargets.map((target) => target.id));
    setVisibleWorktreeShortcutTargets(shortcutTargets);
    return () => {
      setVisibleWorktreeIds(null);
      setVisibleWorktreeShortcutTargets(null);
    };
  }, [shortcutTargets]);

  // Why (D04a G9): `workspace.rename` / `workspace.delete` were label-only — the
  // matcher had no call-site outside the keybinding module. The sidebar owns the
  // keyboard path: rename publishes the row's inline-rename request through the
  // store (the card clears it when the editor opens, Orca's contract) and delete
  // funnels into the same confirmation flow the card's trash affordance uses.
  const workspaceShortcutTarget = useMemo(
    () =>
      resolveWorkspaceShortcutTarget(
        activeWorktreePath,
        visibleProjects,
        getFilteredAndSortedWorktrees
      ),
    [activeWorktreePath, visibleProjects, getFilteredAndSortedWorktrees]
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const action = matchWorkspaceSidebarShortcut(event, storeKeybindings);
      if (!action || !workspaceShortcutTarget) return;
      event.preventDefault();
      if (action === "workspace.rename") {
        setRenameRequest({
          worktreeId: workspaceShortcutTarget.worktree.id || workspaceShortcutTarget.worktree.path,
        });
        return;
      }
      onDeleteGitWorktree(workspaceShortcutTarget.worktree, workspaceShortcutTarget.project);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onDeleteGitWorktree, storeKeybindings, workspaceShortcutTarget]);

  // Why (D04b-010/022): the card's inline rename commit had no handler on the
  // mount, so it was a no-op. When the host provides one it wins (it owns the
  // optimistic list update); otherwise persist through the same
  // `set_worktree_display_name` command the context menu uses and refresh.
  const persistWorktreeDisplayName = useCallback(
    async (worktreePath: string, newTitle: string) => {
      if (onRenameWorktreeTitle) {
        await onRenameWorktreeTitle(worktreePath, newTitle);
        return;
      }
      await invoke("set_worktree_display_name", { worktreePath, displayName: newTitle });
      window.dispatchEvent(new CustomEvent("hydra:refresh-projects"));
    },
    [onRenameWorktreeTitle]
  );

  const isCollapsedKey = useCallback(
    (key: string) => collapsedGroups.has(key) || collapsedProjects.has(key),
    [collapsedGroups, collapsedProjects]
  );

  const renderWorktreeRow = useCallback(
    (row: WorktreeRow, slot: WorktreeVirtualRowSlot): React.JSX.Element | null => {
      const wt = rowModel.propWorktreeByPath.get(row.worktree.path);
      const proj = rowModel.propProjectById.get(row.worktree.repoId);
      if (!wt || !proj) return null;
      const wtSessions = sessions.filter(
        (s) => s.project_path === wt.path || (wt.is_main && s.project_path === proj.path)
      );
      const isFocused = (activeWorktreePath ?? null) === wt.path;
      const isRevealed = highlightedRevealPath === wt.path;
      // Orca geometry (worktree-list/rows/item-row.tsx): the row applies the
      // surface inset as padding and hands the card the content indent, both
      // derived from the row's group depth.
      const isGrouped = displayOptions.groupBy !== "none";
      const surfaceInset = getWorktreeCardSurfaceInset({
        isGrouped,
        groupDepth: row.depth,
      });
      const cardContentIndent = Math.max(
        0,
        getWorktreeCardContentIndent({
          isGrouped,
          groupDepth: row.depth,
          lineageDepth: 0,
        }) - surfaceInset
      );

      return (
        <WorktreeDragRow
          key={row.rowKey}
          rowKey={row.rowKey}
          worktreeId={row.worktree.id}
          worktreePath={wt.path}
          optionId={slot.optionId}
          isActive={slot.isActive}
          style={surfaceInset > 0 ? { paddingLeft: `${surfaceInset}px` } : undefined}
        >
          <WorktreeCard
            worktree={wt}
            status={workspaceStatusFrom({
              sessions: wtSessions,
              hasLiveTerminal: livePaths.has(wt.path),
            })}
            prDisplay={prByPath?.[wt.path] ?? null}
            project={proj}
            repo={proj}
            hideRepoBadge={isGrouped}
            contentIndent={cardContentIndent}
            flushSurface
            isActive={activeWorktreePath === wt.path}
            isCurrentWorktree={activeWorktreePath === wt.path}
            isFocused={isFocused}
            revealHighlight={isRevealed}
            isPinned={pinnedSet.has(wt.path)}
            isUnread={unreadSet.has(wt.path)}
            compactCards={compactCards}
            ports={portsByWorktree?.get(wt.path) || []}
            sessions={wtSessions}
            dropTarget={worktreeDropTarget}
            onSelect={onSelectGitWorktree}
            onDelete={onDeleteGitWorktree}
            onRename={(newTitle) => persistWorktreeDisplayName(wt.path, newTitle)}
            deleteState={
              getDeleteStateForWorktreeHost(
                { id: wt.id ?? `${proj.path}::${wt.path}`, hostId: hostIdByRepoId.get(proj.id) },
                deleteStateByWorktreeId
              ) ?? null
            }
            renameRequest={renameRequest}
            onRenameRequestConsumed={() => setRenameRequest(null)}
            onContextMenu={onWorktreeContextMenu}
            onSelectSession={onSelectSession}
            onDragStart={onWorktreeDragStart ? (e, path) => onWorktreeDragStart(e, path) : undefined}
            onDragOver={onWorktreeDragOver ? (e, path) => onWorktreeDragOver(e, path) : undefined}
            onDrop={onWorktreeDrop ? (e, path) => onWorktreeDrop(e, path, proj) : undefined}
            onDragEnd={onWorktreeDragEnd}
          />
        </WorktreeDragRow>
      );
    },
    [
      rowModel,
      sessions,
      livePaths,
      activeWorktreePath,
      highlightedRevealPath,
      displayOptions.groupBy,
      prByPath,
      pinnedSet,
      unreadSet,
      compactCards,
      portsByWorktree,
      worktreeDropTarget,
      onSelectGitWorktree,
      onDeleteGitWorktree,
      persistWorktreeDisplayName,
      hostIdByRepoId,
      deleteStateByWorktreeId,
      renameRequest,
      onWorktreeContextMenu,
      onSelectSession,
      onWorktreeDragStart,
      onWorktreeDragOver,
      onWorktreeDrop,
      onWorktreeDragEnd,
    ]
  );

  const renderRepoHeader = useCallback(
    (row: GroupHeaderRow, slot: WorktreeVirtualRowSlot): React.JSX.Element | null => {
      const proj = row.repo ? rowModel.propProjectById.get(row.repo.id) : undefined;
      if (!proj) return null;
      const isDropTarget = projectDropTarget?.id === proj.id;
      return (
        <SectionHeader
          key={row.key}
          variant="repo"
          project={proj}
          isCollapsed={isCollapsedKey(row.key) || collapsedProjects.has(proj.id)}
          isActive={activeProject?.path === proj.path}
          count={row.count}
          inGroup={(row.projectGroupDepth ?? 0) > 0}
          onToggleCollapse={slot.toggleCollapse}
          onSelectProject={onSelectProject}
          onOpenNewWorkspace={onOpenNewWorkspaceModal}
          onContextMenu={onProjectContextMenu}
          isDropTarget={isDropTarget}
          dropPosition={projectDropTarget?.position}
          isDragged={draggedProjectId === proj.id}
          onDragStart={onProjectDragStart ? (e) => onProjectDragStart(e, proj.id) : undefined}
          onDragOver={onProjectDragOver ? (e) => onProjectDragOver(e, proj.id) : undefined}
          onDrop={onProjectDrop ? (e) => onProjectDrop(e, proj.id) : undefined}
          onDragEnd={onProjectDragEnd}
        />
      );
    },
    [
      rowModel,
      activeProject?.path,
      collapsedProjects,
      isCollapsedKey,
      onSelectProject,
      onOpenNewWorkspaceModal,
      onProjectContextMenu,
      projectDropTarget,
      draggedProjectId,
      onProjectDragStart,
      onProjectDragOver,
      onProjectDrop,
      onProjectDragEnd,
    ]
  );

  const renderGroupHeader = useCallback(
    (row: GroupHeaderRow, slot: WorktreeVirtualRowSlot): React.JSX.Element | null => {
      const group = row.projectGroup;
      if (!group || typeof group.id !== "string") return null;
      return (
        <SectionHeader
          key={row.key}
          variant="group"
          group={group}
          sectionKey={row.key}
          isCollapsed={isCollapsedKey(row.key)}
          count={row.count}
          depth={row.projectGroupDepth ?? 0}
          onToggleCollapse={slot.toggleCollapse}
          onContextMenu={
            onGroupContextMenu
              ? (e) => onGroupContextMenu(e, { id: group.id as string, name: group.name })
              : undefined
          }
          isDropTarget={groupDropTargetId === group.id}
          onDragOver={onGroupDragOver ? (e) => onGroupDragOver(e, group.id as string) : undefined}
          onDragLeave={
            onGroupDragLeave ? (e) => onGroupDragLeave(e, group.id as string) : undefined
          }
          onDrop={onGroupDrop ? (e) => onGroupDrop(e, group.id as string) : undefined}
        />
      );
    },
    [
      isCollapsedKey,
      onGroupContextMenu,
      groupDropTargetId,
      onGroupDragOver,
      onGroupDragLeave,
      onGroupDrop,
    ]
  );

  const renderFolderRow = useCallback(
    (row: FolderWorkspaceRowModel, slot: WorktreeVirtualRowSlot): React.JSX.Element => {
      const folderPath = row.folderWorkspace.folderPath;
      const folderSessions = sessions.filter((s) => s.project_path === folderPath);
      const isActive = activeWorktreePath === folderPath;
      return (
        // Why the option wrapper: Hydra's folder row predates the listbox contract, and the
        // viewport's `aria-activedescendant` has to name one element per focusable row.
        <div
          key={row.key}
          id={slot.optionId}
          role="option"
          aria-selected={isActive}
          aria-current={isActive ? "page" : undefined}
        >
          <FolderWorkspaceRow
            name={row.folderWorkspace.name}
            folderPath={folderPath}
            status={workspaceStatusFrom({
              sessions: folderSessions,
              hasLiveTerminal: livePaths.has(folderPath),
            })}
            pathMissing={missingPaths.has(folderPath)}
            isActive={isActive}
            onActivate={() => onActivateFolderWorkspace?.(folderPath)}
          />
        </div>
      );
    },
    [sessions, livePaths, missingPaths, activeWorktreePath, onActivateFolderWorkspace]
  );

  /** Notices read the live props; the row only decides placement in the stream. */
  const renderNoticeRow = useCallback(
    (row: HostSectionRow): React.JSX.Element | null => {
      if (row.type !== "imported-worktrees-card" && row.type !== "new-external-worktrees-inbox") {
        return null;
      }
      const proj = rowModel.propProjectById.get(row.repo.id);
      if (!proj) return null;
      const hiddenWorktrees = hiddenWorktreesByProject?.[proj.path] ?? [];
      const noticeProps = {
        repoDisplayName: proj.name,
        hiddenWorktrees,
        baselinePaths: proj.externalWorktreeInboxBaselinePaths,
        suppressed: proj.suppressed_discovery === true,
        promptDismissedAt: proj.externalWorktreeVisibilityPromptDismissedAt ?? null,
        // Host attribution the row pipeline resolved for this project's notice
        // (`getNoticeHostContextLabels`); absent when the project spans one host.
        hostContextLabel: row.hostContextLabel,
        hostContextHostId: row.hostContextHostId,
      };
      if (row.type === "imported-worktrees-card") {
        return (
          <ImportedWorktreesVisibilityLine
            key={row.key}
            placement={row.placement}
            {...noticeProps}
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
          />
        );
      }
      return (
        <NewExternalWorktreesInboxLine
          key={row.key}
          {...noticeProps}
          onReview={onReviewHiddenWorktrees ? () => onReviewHiddenWorktrees(proj) : undefined}
          onSuppress={onSuppressHiddenWorktrees ? () => onSuppressHiddenWorktrees(proj) : undefined}
        />
      );
    },
    [
      rowModel,
      hiddenWorktreesByProject,
      onShowHiddenWorktree,
      onKeepHiddenWorktrees,
      onReviewHiddenWorktrees,
      onSuppressHiddenWorktrees,
    ]
  );

  /**
   * Row content for one virtual slot. The viewport owns the slot (position, measurement,
   * listbox identity) and the scroll anchor; this decides what a row paints and which
   * existing row components get it.
   */
  const renderRow = useCallback(
    (row: HostSectionRow, slot: WorktreeVirtualRowSlot): React.ReactNode => {
      switch (row.type) {
        case "host-header":
          return (
            <HostSectionHeader
              key={row.key}
              row={row}
              isCollapsed={collapsedGroups.has(row.key)}
              onToggleCollapse={slot.toggleCollapse}
            />
          );
        case "header": {
          if (row.repo) {
            return renderRepoHeader(row, slot);
          }
          if (row.projectGroup && typeof row.projectGroup.id === "string") {
            return renderGroupHeader(row, slot);
          }
          return (
            <LaneSectionHeader
              key={row.key}
              row={row}
              isCollapsed={isCollapsedKey(row.key)}
              onToggleCollapse={slot.toggleCollapse}
            />
          );
        }
        case "item":
          return renderWorktreeRow(row, slot);
        case "folder-workspace":
          return renderFolderRow(row, slot);
        case "imported-worktrees-card":
        case "new-external-worktrees-inbox":
          return renderNoticeRow(row);
        case "pending-creation":
          // Hydra has no in-flight create rows on this path (Orca D03a-035).
          return null;
      }
    },
    [
      collapsedGroups,
      isCollapsedKey,
      renderRepoHeader,
      renderGroupHeader,
      renderWorktreeRow,
      renderFolderRow,
      renderNoticeRow,
    ]
  );

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
    <WorktreeListDragProvider
      rows={rows}
      scrollRef={viewportScrollRef}
      onReorderWorktrees={handlePointerGroupReorder}
      onAssignWorktreesStatus={handleAssignWorktreesStatus}
      onPinWorktrees={handlePinWorktrees}
    >
      <VirtualizedWorktreeViewport
        rows={rows}
        activeRowKey={activeRowKey}
        groupBy={displayOptions.groupBy}
        pinnedDisplayPolicy={pinnedDisplayPolicy}
        revealPath={highlightedRevealPath ?? null}
        renderRow={renderRow}
        onActivateRow={activateRow}
        onToggleRowCollapse={toggleRowCollapse}
        dropIndicator={<WorktreeDragDropIndicator />}
        scrollRef={viewportScrollRef}
        className={className}
      />
    </WorktreeListDragProvider>
  );
}

export default WorktreeList;
