// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/WorktreeList.tsx
import React, { useMemo, useCallback, useLayoutEffect, useEffect, useRef, useState } from "react";
import { useAppStore } from "@/store";
import { AlertTriangle, ChevronDown, FolderPlus, Loader2, Plus, Server, ServerOff } from "lucide-react";
import { cn } from "../../lib/utils";
import { reuseArrayIfEqual } from "../../lib/reuse-array-if-equal";
import { getShortcutPlatform } from "../../lib/shortcut-platform";
import { keybindingMatchesAction } from "../../shared/keybindings";
import type { KeybindingOverrides } from "../../shared/keybindings";
import {
  SectionHeader,
  isFolderWorkspaceCreateDisabled,
  type RepoHeaderCreateState,
} from "./SectionHeader";
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
import { sidebarHasActiveFilters } from "./sidebar-filter-actions";
import type { SidebarFilterState } from "./visible-worktree-kinds";
import { shouldFiltersHideAllRows } from "./sidebar-empty-state-gate";
import { WorktreeListEmptyState } from "./worktree-list/listing/WorktreeListEmptyState";
import { getGitHubPRCacheKey } from "@/store/slices/github-cache-key";
import { buildHostIdByRepoId } from "./repo-execution-host-index";
import {
  normalizeExecutionHostScope,
  normalizeVisibleExecutionHostIds,
} from "../../shared/execution-host";
import type { Repo } from "../../shared/repo-types";
import type { FolderWorkspace } from "../../shared/folder-workspace-types";
import type { ProjectGroup as SharedProjectGroup } from "../../shared/project-group-types";
import type { Worktree } from "../../shared/worktree/types";
import type { WorktreeLineage } from "../../shared/worktree/lineage-types";
import type { HostHeaderRow, HostSectionRow } from "./host-section-rows";
import { HostSectionHeaderMenu } from "./HostSectionHeaderMenu";
import { RepoScanUnavailableIndicator } from "./RepoScanUnavailableIndicator";
import type { FolderWorkspacePathStatus } from "../../shared/folder-workspace-path-status";
import { getFolderWorkspaceCreateDisabledReason } from "../../lib/folder-workspace-path-status";
import {
  getPinnedWorktreeDisplayPolicy,
  type FolderWorkspaceRow as FolderWorkspaceRowModel,
  type GroupHeaderRow,
  type PinnedWorktreeDisplayPolicy,
  type WorktreeRow,
} from "./worktree-list/grouping/row-types";
import {
  WORKTREE_SECTION_HEADER_PADDING_LEFT,
  getFolderWorkspaceRowGeometry,
} from "./worktree-list/rows/indentation";
import {
  buildExternalWorktreeNoticeCandidates,
  computeSidebarRows,
  type SidebarRowsState,
} from "./rendered-sidebar-worktree-order";
import { NewExternalWorktreesInboxLine } from "./worktree-list/rows/NewExternalWorktreesInboxLine";
import { ImportedWorktreesVisibilityLine } from "./worktree-list/rows/ImportedWorktreesVisibilityLine";
import {
  canKeepImportedWorktreesHidden,
  EXTERNAL_WORKTREES_SUPPRESS_ERROR,
  IMPORTED_WORKTREES_KEEP_HIDDEN_ERROR,
  IMPORTED_WORKTREES_SHOW_ERROR,
  runExternalWorktreeCardAction,
  type ExternalWorktreeCardActionState,
} from "./worktree-list/rows/external-worktree-card-actions";
import { getFolderWorkspaceCardPrDisplay } from "./worktree-list/rows/folder-workspace-card-pr-display";
import { getWorktreeItemRowGeometry } from "./worktree-list/rows/item-row-geometry";
import {
  collectRenderedSidebarRowKeys,
  shouldRelaxFiltersForRevealRow,
} from "./worktree-list/grouping/rendered-row-keys";
import { getKnownSidebarWorktreeById } from "./sidebar-reveal-lookups";
import { selectWorktreeListReviewCacheInputs } from "./worktree-list/listing/review-cache-inputs";
import {
  setVisibleWorktreeIds,
  setVisibleWorktreeShortcutTargets,
  type VisibleWorktreeShortcutTarget,
} from "./visible-worktrees";
import type { PrDisplay } from "./pr-display";
import type {
  HydraProject,
  GitWorktreeInfo,
  WorktreeReviewStatus,
  WorktreeSession,
  WorkspacePort,
  ProjectGroup,
} from "./types";
import type { WorkspaceDisplayOptions } from "./WorkspaceOptionsMenu";
import { toWorktreeRow } from "../../shared/worktree/worktree-row";
import { getWorktreeHostIdentity, composeWorktreeHostIdentity } from "../../shared/worktree/host-qualified-identity";
import { getRepoExecutionHostId, getWorktreeExecutionHostId } from "../../shared/execution-host";
import { getVisibleSidebarHostIdSet } from "./worktree-list/listing/host-filtering";
import {
  getPairedDeviceIdsByEnvironment,
  isWorkspaceFromOtherDevice,
} from "./workspace-creator-visibility";
import { toPipelineRepo } from "./worktree-list/grouping/to-pipeline-repo";
import { markSidebarWorktreeActiveImmediately } from "./worktree-list/rows/sidebar-worktree-active-dom";
import { buildHostLabelById } from "../../shared/worktree/host-context-labels";
import { getMixedWorktreeHostContextLabels } from "./worktree-list/grouping/host-labels";
import { getSettingsFocusedExecutionHostId } from "../../shared/execution-host";
import { isRuntimeExecutionHostDisconnected } from "./runtime-host-disconnect";
import { resolveWorktreeMultiDragSelection } from "./worktree-multi-drag-selection";
import type { WorktreeMultiDragCandidate } from "./worktree-multi-drag-selection";
import { useWorktreeListSelection } from "./worktree-list/use-worktree-list-selection";
import {
  hasWorkspaceDragData,
  readWorkspaceDragDataIds,
  writeWorkspaceDragData,
} from "./workspace-status-drag-data";
import { ALL_GROUP_KEY, PINNED_GROUP_KEY } from "./worktree-list/grouping/group-keys";
import type { WorktreeMetadataByPath } from "./worktree-metadata-types";
import { computeHeaderSectionBounds } from "./worktree-header-section-boundaries";
import {
  resolveActiveSurfaceVariant,
  resolvePrimaryActiveRowKey,
} from "./worktree-list/navigation/active-row";
import { selectPendingWorktreeCreationKeys } from "./worktree-list/listing/pending-worktree-creation-keys";
import { PendingWorktreeCreationRow } from "./worktree-list/rows/PendingWorktreeCreationRow";
import { applyWorktreeGroupOrder } from "./worktree-group-order";
import { buildManualOrderUpdatesForVisibleGroups } from "./worktree-manual-order";
import { WorktreeListDragProvider } from "./worktree-list/drag/WorktreeListDragProvider";
import { buildLineageParentIdByChildId } from "./worktree-list/drag/nesting";
import {
  WorktreeDragDropIndicator,
  WorktreeDragRow,
} from "./worktree-list/drag/worktree-drag-surface";
import type { WorktreeGroupReorderArgs } from "./worktree-list/drag/drop-commit-context";
import { useWorktreeSidebarHeaderDrag } from "./worktree-list/drag/use-header-drag";
import { WorktreeSidebarDropIndicator } from "./WorktreeSidebarDropIndicator";
import { VirtualizedWorktreeViewport } from "./worktree-list/viewport/VirtualizedWorktreeViewport";
import type { WorktreeVirtualRowSlot } from "./worktree-list/viewport/viewport-props";
import type { ExecutionHostId } from "../../shared/execution-host";

// ─── Hydra props → Orca row-pipeline projection ──────────────────────────────
//
// The sidebar's painted model is Hydra's `HydraProject`/`GitWorktreeInfo`; the
// ported row pipeline speaks Orca's `Repo`/`Worktree`. These adapters are the
// ONE place that bridge is made — grouping, pinning, lane order and section
// elision all stay in the pipeline (`computeSidebarRows`).

/** Collapsed-state keys the pipeline reads, derived from the sidebar's two sets. */
export function pipelineCollapsedKeys(
  collapsedProjects: Set<string>,
  collapsedGroups: Set<string>
): Set<string> {
  const keys = new Set<string>();
  // Project headers collapse by `repo:<id>`; Hydra persists the bare project id.
  for (const id of collapsedProjects) keys.add(`repo:${id}`);
  // Group headers collapse by `project-group:<id>`; Hydra persists the bare group id.
  // The pipeline's own section keys (`all`, `pinned`) and already-prefixed keys
  // (`project-group:…`, `host:…`) must pass through untouched: prefixing `pinned` would
  // make the Pinned section ignore its collapse and prefixing `all` would leave the All
  // rows painted under a header that claims to be collapsed.
  for (const id of collapsedGroups) {
    keys.add(
      id === ALL_GROUP_KEY || id === PINNED_GROUP_KEY || id.includes(":")
        ? id
        : `project-group:${id}`
    );
  }
  return keys;
}

/** Stable empty map: the store seeds no delete state, and a fresh `{}` would thrash memos. */
/** No paired devices: the other-device sweep is off. */
const EMPTY_OTHER_DEVICE_IDS: ReadonlyMap<string, string> = new Map();
const EMPTY_SCAN_FAILURES: Record<string, string> = {};

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
   * Keys of the rows this model actually paints (Orca `renderedSidebarRowKeys`). A
   * reveal request outside the set is blocked by a filter or grouping mode, so the
   * reveal path relaxes before the viewport can scroll to it (D03a-052).
   */
  renderedSidebarRowKeys: ReadonlySet<string>;
  /** Projected worktree universe the notice/reveal lookups resolve identities against. */
  worktrees: Worktree[];
  /** Projected worktree by bare id, for the folder card's attached-worktree walk. */
  worktreeById: Map<string, Worktree>;
  /** Folder workspaces the pipeline painted, in the shared shape reveal lookups read. */
  pipelineFolderWorkspaces: readonly FolderWorkspace[];
  /**
   * Pinned-placement policy the row pipeline built these rows with. Read here, from the same
   * pipeline settings, so the keyboard cycle dedupes duplicated pinned rows exactly like the
   * painted list does.
   */
  pinnedDisplayPolicy: PinnedWorktreeDisplayPolicy;
  /** Projection worktree path → the Hydra prop the card and its callbacks expect. */
  propWorktreeByPath: Map<string, GitWorktreeInfo>;
  propProjectById: Map<string, HydraProject>;
  /** Workspace id → checkout path, for drag payloads that speak ids. */
  pathByWorktreeId: Map<string, string>;
  /** Persisted lineage parent per child id (cycle check for nest drags). */
  lineageParentIdByChildId: Map<string, string>;
  /** Host-qualified workspace identity → label, only for repos visible on >1 host. */
  hostContextLabelByIdentity: Map<string, string>;
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
  /** Rich folder path status, when the shell probed it (confirmed stale vs ambiguous). */
  folderPathStatusByPath?: ReadonlyMap<string, FolderWorkspacePathStatus>;
  /** Failed authoritative scans, keyed by repo path (`RepoScanUnavailableIndicator`). */
  scanFailuresByProject?: Record<string, string>;
  onActivateFolderWorkspace?: (folderPath: string) => void;
  /** Removes a folder workspace entry (folder on disk stays). */
  onDeleteFolderWorkspace?: (folderWorkspaceId: string) => void;
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
  /** Multi-select delete: the selection resolved to >1 workspace. */
  onDeleteWorktreeSelection?: (
    worktrees: readonly GitWorktreeInfo[],
    proj?: HydraProject
  ) => void;
  onSelectSession: (id: string) => void;
  onRenameWorktreeTitle?: (worktreePath: string, newTitle: string) => Promise<void> | void;
  /**
   * Published delete state per host-qualified workspace identity (D04a G5). The
   * card paints its in-place delete overlay from the entry that names it, so a
   * cancelled/failed confirmation releases the card instead of latching.
   */
  deleteStateByWorktreeId?: Record<string, WorktreeDeleteState | undefined>;
  onOpenNewWorkspaceModal: (proj: HydraProject) => void;
  /** Per-project header `+` state (Orca `getRepoHeaderCreateState`). */
  createStateByProjectId?: ReadonlyMap<string, RepoHeaderCreateState>;
  onOpenAddRepoDialog: () => void;
  onClearFilter?: () => void;
  /**
   * Resets the menu/host-scope filters (display options + host scope) — the writer
   * behind the empty state's Clear Filters button. Distinct from `onClearFilter`,
   * which only clears the search query.
   */
  onClearSidebarFilters?: () => void;
  onToggleProjectCollapse: (projectId: string) => void;
  onToggleGroupCollapse: (groupId: string) => void;
  onProjectContextMenu?: (e: React.MouseEvent, proj: HydraProject) => void;
  onGroupContextMenu?: (e: React.MouseEvent, group: { id: string; name: string }) => void;
  onWorktreeContextMenu?: (
    e: React.MouseEvent,
    wt: GitWorktreeInfo,
    proj?: HydraProject,
    selectedWorktrees?: readonly GitWorktreeInfo[]
  ) => void;
  onSuppressHiddenWorktrees?: (proj: HydraProject) => void;
  /** Per-project inbox action error (Orca's message catalog), painted on the row. */
  hiddenWorktreeErrorsByProject?: Readonly<Record<string, string | null>>;
  /** Card-level "Show in worktree list" (policy flip with rollback). */
  onShowAllHiddenWorktrees?: (proj: HydraProject) => void;
  /** In-flight creates that own optimistic rows until the backend answers. */
  pendingWorktreeCreations?: readonly {
    creationId: string;
    repoId: string;
    branchName?: string;
    agentName?: string;
  }[];
  /** Whether the workspace board is already open (D03a-012 preview is conditional). */
  workspaceBoardOpen?: boolean;
  onWorkspaceBoardDragPreviewStart?: () => void;
  onWorkspaceBoardDragPreviewCommit?: () => void;
  onWorkspaceBoardDragPreviewCancel?: () => void;
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
  /** Orca `handleReorderHostSections`: persist the host-section order after a drag. */
  onReorderHostSections?: (orderedHostIds: ExecutionHostId[]) => void;
  /** Project-group tier writer: the drop reports the group's new tab order. */
  onUpdateProjectGroup?: (groupId: string, updates: { tabOrder: number }) => void;
  /**
   * The app's own workspace-status write (`set_worktree_status` + the local worktree
   * maps). A sidebar row dragged onto an open workspace board commits through it, so the
   * board and the context menu share one writer (D08-002/D08-040).
   */
  onAssignWorktreeStatus: (worktreePath: string, status: string) => void | Promise<void>;
  /** Persisted lineage (`childPath -> parentPath`) owned by the app. */
  lineageByPath?: Readonly<Record<string, string>>;
  /** Persisted notes/linked work items, keyed by checkout path. */
  worktreeMetadataByPath?: WorktreeMetadataByPath;
  /** Opens the metadata editor for one painted row. */
  onEditWorktreeMetadata?: (worktree: GitWorktreeInfo) => void;
  /** Commits a nest drag: parent and children are paths inside one project. */
  onAssignWorktreeParent?: (
    parentWorktreePath: string,
    childWorktreePaths: readonly string[]
  ) => void;
  /** Detaches nested rows dragged onto a reorder line. */
  onUnnestWorktrees?: (childWorktreePaths: readonly string[]) => void;
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
  onAssignStatusDrop,
  onPinDrop,
}: {
  row: GroupHeaderRow;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onAssignStatusDrop: (worktreeIds: readonly string[], status: string) => void;
  onPinDrop: (worktreeIds: readonly string[]) => void;
}): React.JSX.Element {
  const Icon = row.icon;
  const workspaceStatusId = row.key.startsWith("workspace-status:")
    ? row.key.slice("workspace-status:".length)
    : null;
  const isPinDropTarget = row.key === PINNED_GROUP_KEY;
  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={!isCollapsed}
      aria-label={row.label}
      data-section-header-id={row.key}
      data-workspace-status-drop-target={workspaceStatusId ? "" : undefined}
      data-workspace-status={workspaceStatusId ?? undefined}
      data-workspace-pin-drop-target={isPinDropTarget ? "" : undefined}
      onDragOver={
        workspaceStatusId || isPinDropTarget
          ? (event) => {
              if (!hasWorkspaceDragData(event.dataTransfer)) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
            }
          : undefined
      }
      onDrop={
        workspaceStatusId || isPinDropTarget
          ? (event) => {
              if (!hasWorkspaceDragData(event.dataTransfer)) return;
              event.preventDefault();
              const worktreeIds = readWorkspaceDragDataIds(event.dataTransfer);
              if (worktreeIds.length === 0) return;
              if (isPinDropTarget) {
                onPinDrop(worktreeIds);
              } else if (workspaceStatusId) {
                onAssignStatusDrop(worktreeIds, workspaceStatusId);
              }
            }
          : undefined
      }
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
function HostSectionHealthIcon({
  health,
}: {
  health: HostHeaderRow["health"];
}): React.JSX.Element | null {
  // Why: only surface states needing attention; healthy is the silent default.
  if (health === "connecting") {
    return <Loader2 className="size-3 shrink-0 animate-spin text-muted-foreground" aria-hidden />;
  }
  if (health === "blocked" || health === "error") {
    return <AlertTriangle className="size-3 shrink-0 text-destructive" aria-hidden />;
  }
  return null;
}

function HostSectionMetricsBadge({ count }: { count: number }) {
  const label = `${count} workspace${count === 1 ? "" : "s"}`;
  return (
    <span
      className="inline-flex h-4 shrink-0 items-center justify-center rounded-full border border-worktree-sidebar-border bg-worktree-sidebar-accent px-1.5 text-[9px] font-medium leading-none text-muted-foreground/90"
      aria-label={label}
      title={label}
      data-host-section-count={count}
    >
      {count}
    </span>
  );
}

const HostSectionHeader = React.memo(function HostSectionHeader({
  row,
  isCollapsed,
  onToggleCollapse,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDropTarget,
}: {
  row: HostHeaderRow;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onDragStart?: (event: React.DragEvent) => void;
  onDragOver?: (event: React.DragEvent) => void;
  onDrop?: (event: React.DragEvent) => void;
  onDragEnd?: () => void;
  isDropTarget?: boolean;
}): React.JSX.Element {
  const isDisconnected =
    row.health === "disconnected" || row.health === "error" || row.health === "blocked";
  const isBlocked = row.health === "blocked";
  return (
    <div className="px-2 pt-1">
      {/* Why: outlined card + server glyph marks hosts as machines, not mere groups. */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={!isCollapsed}
        aria-label={row.label}
        data-host-header-id={row.hostId}
        data-host-header-drag-id={row.hostId}
        draggable={Boolean(onDragStart)}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragEnd={onDragEnd}
        className={cn(
          "group/host-header flex h-8 w-full items-center gap-2 rounded-md border px-2 text-left transition-all cursor-pointer select-none",
          onDragStart && "cursor-grab active:cursor-grabbing",
          isBlocked
            ? "border-destructive/40 bg-destructive/10"
            : isDisconnected
              ? "border-worktree-sidebar-border/70 bg-worktree-sidebar-accent/35 text-muted-foreground"
              : "border-worktree-sidebar-border bg-worktree-sidebar-accent/70",
          isDropTarget && "ring-1 ring-primary/50"
        )}
        onClick={onToggleCollapse}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggleCollapse();
          }
        }}
      >
        {isDisconnected ? (
          <ServerOff className="size-3.5 shrink-0 text-muted-foreground/80" aria-hidden />
        ) : (
          <Server className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        )}
        <HostSectionHealthIcon health={row.health} />
        <div className="flex min-w-0 flex-1 items-baseline gap-1.5">
          <span
            className={cn(
              "min-w-0 truncate text-[12px] font-semibold leading-none",
              isDisconnected ? "text-muted-foreground" : "text-worktree-sidebar-foreground"
            )}
          >
            {row.label}
          </span>
          <span
            className={cn(
              "shrink-0 truncate text-[10px] leading-none",
              isBlocked ? "text-destructive" : "text-muted-foreground/70"
            )}
          >
            {row.detail}
          </span>
          {row.count > 0 ? <HostSectionMetricsBadge count={row.count} /> : null}
        </div>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground transition-transform",
            isCollapsed && "-rotate-90"
          )}
          aria-hidden
        />
        <HostSectionHeaderMenu row={row} />
      </div>
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
  folderPathStatusByPath,
  scanFailuresByProject = EMPTY_SCAN_FAILURES,
  onActivateFolderWorkspace,
  onDeleteFolderWorkspace,
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
  onDeleteWorktreeSelection,
  onSelectSession,
  onRenameWorktreeTitle,
  deleteStateByWorktreeId = EMPTY_DELETE_STATE,
  onOpenNewWorkspaceModal,
  createStateByProjectId,
  onOpenAddRepoDialog,
  onClearFilter,
  onClearSidebarFilters,
  onToggleProjectCollapse,
  onToggleGroupCollapse,
  onProjectContextMenu,
  onGroupContextMenu,
  onWorktreeContextMenu,
  onSuppressHiddenWorktrees,
  hiddenWorktreeErrorsByProject,
  onShowAllHiddenWorktrees,
  pendingWorktreeCreations,
  workspaceBoardOpen,
  onWorkspaceBoardDragPreviewStart,
  onWorkspaceBoardDragPreviewCommit,
  onWorkspaceBoardDragPreviewCancel,
  onShowHiddenWorktree,
  onKeepHiddenWorktrees,
  onReviewHiddenWorktrees,
  worktreeDropTarget,
  scrollRef,
  onReorderWorktreesInGroup,
  onReorderHostSections,
  onUpdateProjectGroup,
  onAssignWorktreeStatus,
  lineageByPath,
  worktreeMetadataByPath,
  onEditWorktreeMetadata,
  onAssignWorktreeParent,
  onUnnestWorktrees,
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
  const storeWorkspaceStatuses = useAppStore((s) => s.workspaceStatuses);
  // The persisted host-section tier order feeds the row pipeline, so a host drag
  // repaints the sections it just moved (D03a-020).
  const storeWorkspaceHostOrder = useAppStore((s) => s.workspaceHostOrder);
  const storeWorktreesByRepo = useAppStore((s) => s.worktreesByRepo);
  // Why: the live store's UI slice is still an auto-stub, so these keys are not in
  // `AppState` yet; the review-cache selector gets Orca's defaults until they are.
  const storeWorktreeCardProperties: never[] = [];
  const storeHostedReviewCache = null;
  const pendingRevealSidebarRow = useAppStore((s) => s.pendingRevealSidebarRow);
  // Orca `use-agent-send-target`: the worktree the send picker targets is forced
  // visible even when a filter would otherwise hide it (D03a-048).
  const agentSendTargetWorktreeId = useAppStore(
    (s) => s.agentSendPopoverTargetMode?.worktreeId ?? null
  );
  const clearPendingRevealSidebarRow = useAppStore((s) => s.clearPendingRevealSidebarRow);
  const storeKeybindings = useAppStore((s) => s.keybindings);

  // Host labels for the mixed-host card chip: SSH target names + persisted
  // overrides, the same sources the host menu reads.
  const hostLabelById = useMemo(() => {
    const sshTargets = Object.entries(storeSshTargetLabels ?? {}).map(([id, label]) => ({
      id: String(id),
      label: String(label),
    }));
    return buildHostLabelById({
      sshTargets,
      hostSettingOverrides: storeSettings?.hostSettingOverrides,
    });
  }, [storeSshTargetLabels, storeSettings]);
  const focusedHostId = useMemo(
    () => getSettingsFocusedExecutionHostId(storeSettings),
    [storeSettings]
  );
  // Why (D04a G9): the sidebar keyboard path owns the inline-rename request for
  // `workspace.rename`; the card it names consumes and clears it.
  const [renameRequest, setRenameRequest] = useState<WorktreeRenameRequest | null>(null);

  // Why normalize: the store seeds `visibleWorkspaceHostIds: []` before the UI
  // slice hydrates, and `[]` means "no host visible" — it would blank the list.
  const pipelineHostScope = normalizeExecutionHostScope(storeWorkspaceHostScope);
  const pipelineVisibleHostIds = normalizeVisibleExecutionHostIds(storeVisibleWorkspaceHostIds);
  // Orca `useSidebarHostVisibleScope`: one host set narrows repos (and the worktrees
  // whose own host is more precise than the repo's) before grouping.
  const visibleHostIdSet = useMemo(
    () => getVisibleSidebarHostIdSet(pipelineVisibleHostIds, pipelineHostScope),
    [pipelineHostScope, pipelineVisibleHostIds]
  );
  // Orca `useSidebarHostVisibleScope`: the other-device sweep needs the device ids
  // paired to each runtime environment.
  const pairedDeviceIdsByEnvironment = useMemo(
    () =>
      displayOptions.hideWorkspacesFromOtherDevices
        ? getPairedDeviceIdsByEnvironment(
            storeRuntimeEnvironments,
            storeRuntimeStatusByEnvironmentId
          )
        : EMPTY_OTHER_DEVICE_IDS,
    [
      displayOptions.hideWorkspacesFromOtherDevices,
      storeRuntimeEnvironments,
      storeRuntimeStatusByEnvironmentId,
    ]
  );

  // Filter projects by search query (project identity or a matching workspace).
  const visibleProjectsRef = useRef<HydraProject[]>([]);
  const visibleProjects = useMemo(() => {
    const searched = !query
      ? displayProjects
      : displayProjects.filter((proj) => {
          if (proj.name.toLowerCase().includes(query)) return true;
          if (proj.displayName?.toLowerCase().includes(query)) return true;
          if (proj.path.toLowerCase().includes(query)) return true;
          const wts = getFilteredAndSortedWorktrees(proj);
          return wts.length > 0;
        });
    let filtered = searched;
    if (visibleHostIdSet) {
      const repoByProject = new Map(
        (storeRepos as Repo[]).flatMap((repo) => [
          [repo.id, repo] as const,
          [repo.path, repo] as const,
        ])
      );
      filtered = searched.filter((proj) => {
        if (
          agentSendTargetWorktreeId &&
          getFilteredAndSortedWorktrees(proj).some(
            (worktree) => worktree.id === agentSendTargetWorktreeId
          )
        ) {
          return true;
        }
        const repo = repoByProject.get(proj.id) ?? repoByProject.get(proj.path);
        const hostId = repo ? getRepoExecutionHostId(repo) : focusedHostId;
        return visibleHostIdSet.has(hostId);
      });
    }
    // D03a-051: a recompute that kept the same project objects keeps the previous
    // array identity, so memoized sections do not invalidate.
    const stable = reuseArrayIfEqual(visibleProjectsRef.current, filtered);
    visibleProjectsRef.current = stable;
    return stable;
  }, [
    displayProjects,
    query,
    getFilteredAndSortedWorktrees,
    visibleHostIdSet,
    storeRepos,
    focusedHostId,
    agentSendTargetWorktreeId,
  ]);

  // Host ownership per repo, shared by the row pipeline and the delete-state
  // resolution below: a card's delete state is keyed by host-qualified identity.
  const hostIdByRepoId = useMemo(() => buildHostIdByRepoId(storeRepos as Repo[]), [storeRepos]);

  const pendingCreationRefs = useMemo(() => {
    const pending = pendingWorktreeCreations ?? [];
    const keys = selectPendingWorktreeCreationKeys(pending);
    return pending.map((creation, index) => ({
      creationId: creation.creationId,
      repoId: creation.repoId,
      key: keys[index],
      ...(creation.branchName ? { branchName: creation.branchName } : {}),
      ...(creation.agentName ? { agentName: creation.agentName } : {}),
    }));
  }, [pendingWorktreeCreations]);

  const rowModel = useMemo<SidebarRowModel>(() => {
    const repoById = new Map((storeRepos as Repo[]).map((repo) => [repo.id, repo]));
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
    // Why: the lane a card paints in comes from the persisted workspace status
    // (Orca `workspaceStatus`), not from the agent's current activity. The scan row
    // has no status of its own, so the store's worktree rows are the source.
    const persistedStatusById = new Map<string, string>();
    const persistedStatusByPath = new Map<string, string>();
    for (const rows of Object.values(storeWorktreesByRepo)) {
      for (const row of rows) {
        if (!row.workspaceStatus) continue;
        persistedStatusById.set(row.id, row.workspaceStatus);
        persistedStatusByPath.set(row.path, row.workspaceStatus);
      }
    }
    const worktreesByRepo: Record<string, Worktree[]> = {};
    const candidates: { project: HydraProject; worktree: GitWorktreeInfo }[] = [];
    for (const project of visibleProjects) {
      propProjectById.set(project.id, project);
      const hostId = hostIdByRepoId.get(project.id);
      const projectedForRepo: Worktree[] = [];
      for (const worktree of getFilteredAndSortedWorktrees(project)) {
        const forcedVisible = worktree.id === agentSendTargetWorktreeId;
        const status =
          persistedStatusByPath.get(worktree.path) ??
          (worktree.id ? persistedStatusById.get(worktree.id) : undefined) ??
          worktree.status ??
          null;
        const projected = toWorktreeRow(worktree, {
          repoId: project.id,
          hostId,
          isPinned: pinnedSet.has(worktree.path),
          isUnread: unreadSet.has(worktree.path),
          status,
          metadata: (() => {
            const record = worktreeMetadataByPath?.[worktree.path];
            return record
              ? {
                  comment: record.comment,
                  linkedIssue: record.linked_issue,
                  linkedPR: record.linked_pr,
                  linkedLinearIssue: record.linked_linear_issue,
                }
              : null;
          })(),
        });
        if (
          !forcedVisible &&
          pairedDeviceIdsByEnvironment.size > 0 &&
          isWorkspaceFromOtherDevice(projected, pairedDeviceIdsByEnvironment)
        ) {
          continue;
        }
        if (
          !forcedVisible &&
          visibleHostIdSet &&
          !visibleHostIdSet.has(
            getWorktreeExecutionHostId(projected, repoById.get(project.id), focusedHostId)
          )
        ) {
          continue;
        }
        // Menu filters (Orca's ported predicates, never a re-derived rule). Shared
        // with the workspace board so both surfaces hide the same workspaces.
        if (
          !forcedVisible &&
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

    // The app's path lineage is the single writer the row menus and delete use;
    // project it into the rich records the row pipeline validates, so a nest drag
    // and the context menu paint the same tree.
    const projectedLineageById: Record<string, WorktreeLineage> = {
      ...storeWorktreeLineageById,
    }
    const worktreeByPath = new Map<string, Worktree>()
    const worktreeById = new Map<string, Worktree>()
    const pathByWorktreeId = new Map<string, string>()
    for (const list of Object.values(worktreesByRepo)) {
      for (const worktree of list) {
        worktreeByPath.set(worktree.path, worktree)
        worktreeById.set(worktree.id, worktree)
        pathByWorktreeId.set(worktree.id, worktree.path)
      }
    }
    for (const [childPath, parentPath] of Object.entries(lineageByPath ?? {})) {
      const child = worktreeByPath.get(childPath)
      const parent = worktreeByPath.get(parentPath)
      if (!child || !parent || child.repoId !== parent.repoId) {
        continue
      }
      projectedLineageById[child.id] = {
        worktreeId: child.id,
        worktreeInstanceId: child.instanceId as string,
        parentWorktreeId: parent.id,
        parentWorktreeInstanceId: parent.instanceId as string,
        origin: "manual",
        capture: { source: "manual-action", confidence: "explicit" },
        createdAt: 0,
      }
    }

    // D03a-056: the row model reads the PR/hosted-review caches only when the painted
    // cards actually need them (PR grouping or synthetic folder-card reviews) instead
    // of scanning the whole cache on every render.
    const reviewCaches = selectWorktreeListReviewCacheInputs(
      {
        folderWorkspaces: pipelineFolderWorkspaces,
        hostedReviewCache: storeHostedReviewCache,
        prCache: buildPRCache({ worktrees: candidates, repos: pipelineRepos, prByPath }),
        settings: storeSettings,
      },
      displayOptions.groupBy,
      storeWorktreeCardProperties
    );

    const pipelineState: SidebarRowsState = {
      settings: storeSettings,
      visibleWorkspaceHostIds: pipelineVisibleHostIds,
      workspaceHostScope: pipelineHostScope,
      projectGroups: pipelineGroups,
      groupBy: displayOptions.groupBy,
      workspaceStatuses: storeWorkspaceStatuses,
      worktreeCardProperties: storeWorktreeCardProperties,
      repos: pipelineRepos,
      worktreesByRepo,
      collapsedGroups: pipelineCollapsedKeys(collapsedProjects, collapsedGroups),
      worktreeLineageById: projectedLineageById,
      folderWorkspaces: pipelineFolderWorkspaces,
      sshTargetLabels: storeSshTargetLabels,
      sshConnectionStates: storeSshConnectionStates,
      runtimeEnvironments: storeRuntimeEnvironments,
      runtimeStatusByEnvironmentId: storeRuntimeStatusByEnvironmentId,
      prCache: reviewCaches.prCache,
      projectOrderBy: displayOptions.projectsOrder ?? "manual",
      workspaceHostOrder: storeWorkspaceHostOrder,
      hostedReviewCache: reviewCaches.hostedReviewCache,
    };

    // Mixed-host labels: one repo visible on more than one host needs the card
    // chip the same way its notice rows do (Orca `getMixedWorktreeHostContextLabels`).
    const repoMap = new Map(pipelineRepos.map((repo) => [repo.id, repo]));
    const hostContextLabelByIdentity = new Map<string, string>();
    for (const rows of Object.values(worktreesByRepo)) {
      const labels = getMixedWorktreeHostContextLabels(rows, repoMap, hostLabelById, focusedHostId);
      if (!labels) continue;
      for (const [identity, label] of labels) hostContextLabelByIdentity.set(identity, label);
    }

    const rows = computeSidebarRows(
      pipelineState,
      Object.values(worktreesByRepo).flat(),
      buildExternalWorktreeNoticeCandidates({
        repos: pipelineRepos,
        hiddenWorktreesByProjectPath: hiddenWorktreesByProject ?? {},
      }),
      pendingCreationRefs
    );

    return {
      rows,
      renderedSidebarRowKeys: collectRenderedSidebarRowKeys(rows),
      worktrees: Object.values(worktreesByRepo).flat(),
      worktreeById,
      pipelineFolderWorkspaces,
      pinnedDisplayPolicy: getPinnedWorktreeDisplayPolicy(pipelineState.settings),
      hostContextLabelByIdentity,
      propWorktreeByPath,
      propProjectById,
      pathByWorktreeId,
      lineageParentIdByChildId: buildLineageParentIdByChildId(projectedLineageById),
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
    displayOptions.projectsOrder,
    storeWorkspaceHostOrder,
    displayOptions.hideAutomationCreated,
    displayOptions.hideCliCreated,
    displayOptions.hideSleeping,
    pairedDeviceIdsByEnvironment,
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
    lineageByPath,
    worktreeMetadataByPath,
    storeSshTargetLabels,
    storeSshConnectionStates,
    storeRuntimeEnvironments,
    storeRuntimeStatusByEnvironmentId,
    storeWorkspaceStatuses,
    hostLabelById,
    focusedHostId,
    storeWorktreesByRepo,
    pendingCreationRefs,
  ]);

  const { rows, hostContextLabelByIdentity } = rowModel;
  // The menu filters (display options + host scope) reduce the row model before it is
  // painted, so both the reveal path (D03a-052) and the empty-state gate (#15362) read
  // the same "are filters active" answer.
  const sidebarFilterState = useMemo<SidebarFilterState>(
    () => ({
      showSleepingWorkspaces: !displayOptions.hideSleeping,
      filterRepoIds: displayOptions.filterProjectIds ?? [],
      hideDefaultBranchWorkspace: displayOptions.hideDefaultBranch,
      hideAutomationGeneratedWorkspaces: displayOptions.hideAutomationCreated,
      hideCliCreatedWorkspaces: displayOptions.hideCliCreated,
      hideDetachedHeadWorkspaces: displayOptions.hideDetachedHead,
      // Hydra's sidebar has no per-device filter; false mirrors Orca's default so the
      // gate's contract is unchanged.
      hideWorkspacesFromOtherDevices: false,
      visibleWorkspaceHostIds: pipelineVisibleHostIds,
      workspaceHostScope: pipelineHostScope,
    }),
    [
      displayOptions.hideSleeping,
      displayOptions.filterProjectIds,
      displayOptions.hideDefaultBranch,
      displayOptions.hideAutomationCreated,
      displayOptions.hideCliCreated,
      displayOptions.hideDetachedHead,
      pipelineVisibleHostIds,
      pipelineHostScope,
    ]
  );
  const hasFilters = useMemo(
    () => sidebarHasActiveFilters(sidebarFilterState),
    [sidebarFilterState]
  );

  // Orca `useSidebarRevealRequests` (D03a-052): a queued row reveal can name a row the
  // painted model does not contain because a sidebar filter hides it. Orca relaxes only
  // the blocking filters; the display options live in the panel, so this list asks the
  // panel to run the filter reset it owns before the viewport retries the key. A key
  // whose target no longer exists is not a filter problem and is left to the request's
  // own retry window.
  useEffect(() => {
    const rowKey = pendingRevealSidebarRow?.rowKey;
    if (!rowKey || !onClearSidebarFilters) return;
    const itemRow = rows.find((row) => row.type === "item" && row.rowKey === rowKey);
    const targetResolved = itemRow
      ? true
      : getKnownSidebarWorktreeById(
          rowKey,
          rowModel.worktreeById,
          rowModel.pipelineFolderWorkspaces,
          rowModel.worktrees
        ) !== null;
    if (
      !shouldRelaxFiltersForRevealRow({
        rowKey,
        renderedSidebarRowKeys: rowModel.renderedSidebarRowKeys,
        hasFilters,
        targetResolved,
      })
    ) {
      return;
    }
    onClearSidebarFilters();
  }, [
    pendingRevealSidebarRow,
    rowModel.renderedSidebarRowKeys,
    rowModel.worktreeById,
    rowModel.pipelineFolderWorkspaces,
    rowModel.worktrees,
    rows,
    hasFilters,
    onClearSidebarFilters,
  ]);

  // Orca reveal requests may ask to open the inline editor after scrolling
  // (`beginRename`). The sidebar resolves the path; the list owns the row request.
  useEffect(() => {
    const handleBeginRename = (event: Event) => {
      const detail = (event as CustomEvent<{ path?: string }>).detail;
      if (!detail?.path) return;
      const row = rows.find(
        (candidate) => candidate.type === "item" && candidate.worktree.path === detail.path
      );
      if (row && row.type === "item") {
        setRenameRequest({ worktreeId: row.worktree.id, rowKey: row.rowKey });
      }
    };
    window.addEventListener("hydra:begin-rename-worktree", handleBeginRename);
    return () => window.removeEventListener("hydra:begin-rename-worktree", handleBeginRename);
  }, [rows]);
  const pathByWorktreeId = rowModel.pathByWorktreeId;
  const groupBadgeColorById = useMemo(() => {
    const colors = new Map<string, string>();
    for (const project of visibleProjects) {
      const groupId = projectGroupMap?.[project.id];
      if (groupId && project.color && !colors.has(groupId)) {
        colors.set(groupId, project.color);
      }
    }
    return colors;
  }, [visibleProjects, projectGroupMap]);

  const headerSectionBounds = useMemo(() => {
    const firstHeaderIndex = rows.findIndex(
      (row) => row.type === "header" || row.type === "host-header"
    );
    return computeHeaderSectionBounds({
      rows,
      firstHeaderIndex: firstHeaderIndex < 0 ? 0 : firstHeaderIndex,
    });
  }, [rows]);

  // Drag payloads speak workspace ids; the app's lineage writer speaks checkout
  // paths (same map the context menu and the delete dialog read).
  const handleNestWorktrees = useCallback(
    (parentWorktreeId: string, childWorktreeIds: readonly string[]) => {
      const parentPath = pathByWorktreeId.get(parentWorktreeId);
      if (!parentPath) return;
      const childPaths = childWorktreeIds
        .map((id) => pathByWorktreeId.get(id))
        .filter((path): path is string => Boolean(path));
      if (childPaths.length > 0) {
        onAssignWorktreeParent?.(parentPath, childPaths);
      }
    },
    [onAssignWorktreeParent, pathByWorktreeId]
  );

  const handleUnnestWorktrees = useCallback(
    (childWorktreeIds: readonly string[]) => {
      const childPaths = childWorktreeIds
        .map((id) => pathByWorktreeId.get(id))
        .filter((path): path is string => Boolean(path));
      if (childPaths.length > 0) {
        onUnnestWorktrees?.(childPaths);
      }
    },
    [onUnnestWorktrees, pathByWorktreeId]
  );

  // ─── Virtualized viewport inputs ───────────────────────────────────────────
  //
  // The viewport renders the scroll container itself and assigns it here, so the panel's ref
  // (pointer-drag geometry, scroll-anchor recording, reveal) keeps pointing at the real
  // scroller. Without a caller ref — unit renders, composed lists — it owns one.
  const internalScrollRef = useRef<HTMLDivElement | null>(null);
  const viewportScrollRef = scrollRef ?? internalScrollRef;
  const pinnedDisplayPolicy = rowModel.pinnedDisplayPolicy;

  /** Row key of the active workspace: the row `aria-activedescendant` points at. */
  const primaryActiveRowKey = useMemo(
    () => resolvePrimaryActiveRowKey(rows, activeWorktreePath, PINNED_GROUP_KEY),
    [rows, activeWorktreePath]
  );

  const activeRowKey = useMemo(() => {
    if (!activeWorktreePath) return null;
    if (primaryActiveRowKey) return primaryActiveRowKey;
    for (const row of rows) {
      if (row.type === "folder-workspace" && row.folderWorkspace.folderPath === activeWorktreePath) {
        return row.key;
      }
      if (row.type === "item" && row.worktree.path === activeWorktreePath) {
        return row.rowKey;
      }
    }
    return null;
  }, [rows, activeWorktreePath, primaryActiveRowKey]);

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
  type DragWorktreeEntry = {
    worktree: GitWorktreeInfo;
    project: HydraProject;
    executionHostId?: ExecutionHostId;
  };
  // Why a list per id: a repo mounted on two execution hosts publishes the same
  // workspace id twice, so an id-only map would silently keep whichever row won.
  const dragWorktreeEntriesById = useMemo(() => {
    const byId = new Map<string, DragWorktreeEntry[]>();
    for (const row of rows) {
      if (row.type !== "item") continue;
      const worktree = rowModel.propWorktreeByPath.get(row.worktree.path);
      const project = rowModel.propProjectById.get(row.worktree.repoId);
      if (!worktree || !project) continue;
      const entry: DragWorktreeEntry = {
        worktree,
        project,
        executionHostId: row.worktree.hostId,
      };
      const entries = byId.get(row.worktree.id) ?? [];
      if (
        !entries.some(
          (candidate) =>
            candidate.worktree.path === entry.worktree.path &&
            candidate.executionHostId === entry.executionHostId
        )
      ) {
        entries.push(entry);
        byId.set(row.worktree.id, entries);
      }
    }
    return byId;
  }, [rowModel, rows]);

  const dragWorktreeById = useMemo(() => {
    const byId = new Map<string, DragWorktreeEntry>();
    for (const [worktreeId, entries] of dragWorktreeEntriesById) {
      const [first] = entries;
      if (first) byId.set(worktreeId, first);
    }
    return byId;
  }, [dragWorktreeEntriesById]);

  /**
   * The workspaces a drop may write, qualified by the host the gesture started on
   * (D03a-021): a drop never writes the same id on another host, and a path is
   * written once even when two hosts share it.
   */
  const resolveDragWorktreeEntries = useCallback(
    (worktreeIds: readonly string[], executionHostId?: ExecutionHostId) => {
      const entries: DragWorktreeEntry[] = [];
      const seenPaths = new Set<string>();
      for (const worktreeId of worktreeIds) {
        const candidates = dragWorktreeEntriesById.get(worktreeId) ?? [];
        for (const entry of candidates) {
          if (executionHostId !== undefined && entry.executionHostId !== executionHostId) {
            continue;
          }
          if (seenPaths.has(entry.worktree.path)) continue;
          seenPaths.add(entry.worktree.path);
          entries.push(entry);
        }
      }
      return entries;
    },
    [dragWorktreeEntriesById]
  );

  const dragWorktreeIds = useMemo(() => [...dragWorktreeById.keys()], [dragWorktreeById]);

  // ─── Multi-selection → the batch a press drags (D03a-002) ───────────────────
  //
  // The rows address their workspace by the same host-qualified identity the board's cards use
  // (`getWorktreeHostIdentity`), so the shared pure model drives both surfaces. The selection is
  // built from the painted rows only: a range never runs through a row the user cannot see, and
  // a truncated identity is never fabricated for a row the list does not hold.
  const dragMultiSelectionInput = useMemo(() => {
    const identityByRowKey = new Map<string, string>();
    const candidates: WorktreeMultiDragCandidate[] = [];
    const seen = new Set<string>();
    for (const row of rows) {
      if (row.type !== "item") continue;
      const identity = getWorktreeHostIdentity(row.worktree);
      if (!identityByRowKey.has(row.rowKey)) identityByRowKey.set(row.rowKey, identity);
      if (seen.has(identity)) continue;
      seen.add(identity);
      candidates.push({ identity, worktreeId: row.worktree.id });
    }
    return {
      identityByRowKey,
      candidates,
      visibleIdentities: candidates.map((candidate) => candidate.identity),
    };
  }, [rows]);

  const { selectedWorktreeIdentities, selectForContextMenu, handleSelectionGesture } =
    useWorktreeListSelection({
    visibleIdentities: dragMultiSelectionInput.visibleIdentities,
  });

  const worktreesByIdentity = useMemo(() => {
    const map = new Map<string, GitWorktreeInfo>();
    for (const row of rows) {
      if (row.type !== "item") continue;
      const worktree = rowModel.propWorktreeByPath.get(row.worktree.path);
      if (worktree) {
        map.set(getWorktreeHostIdentity(row.worktree), worktree);
      }
    }
    return map;
  }, [rows, rowModel.propWorktreeByPath]);

  const selectedContextWorktrees = useCallback(
    (_identity: string, isSelected: boolean): readonly GitWorktreeInfo[] | undefined => {
      if (!isSelected) return undefined;
      const selected = [...selectedWorktreeIdentities]
        .map((key) => worktreesByIdentity.get(key))
        .filter((worktree): worktree is GitWorktreeInfo => Boolean(worktree));
      return selected.length > 1 ? selected : undefined;
    },
    [selectedWorktreeIdentities, worktreesByIdentity]
  );

  const resolveDraggedWorktreeIds = useCallback(
    (rowKey: string, worktreeId: string) => {
      const draggedWorktreeIdentity =
        dragMultiSelectionInput.identityByRowKey.get(rowKey) ??
        composeWorktreeHostIdentity(undefined, worktreeId);
      const batch = resolveWorktreeMultiDragSelection({
        draggedWorktreeId: worktreeId,
        draggedWorktreeIdentity,
        selectedWorktreeIdentities,
        surfaceWorktrees: dragMultiSelectionInput.candidates,
      });
      const ids = batch.map((candidate) => candidate.worktreeId);
      return ids.length > 0 ? ids : [worktreeId];
    },
    [dragMultiSelectionInput, selectedWorktreeIdentities]
  );

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
    (worktreeIds: readonly string[], status: string, executionHostId?: ExecutionHostId) => {
      for (const entry of resolveDragWorktreeEntries(worktreeIds, executionHostId)) {
        void onAssignWorktreeStatus(entry.worktree.path, status);
      }
    },
    [onAssignWorktreeStatus, resolveDragWorktreeEntries]
  );

  // ─── Pointer-drag pin-strip drop → the panel's pin writer ──────────────────
  //
  // The same id→path bridge, for the board's pin strip: the drag speaks row ids, the app's
  // pin writer speaks workspace paths. One writer for both the strip and the row menu.
  const handlePinWorktrees = useCallback(
    (worktreeIds: readonly string[], executionHostId?: ExecutionHostId) => {
      const worktreePaths = resolveDragWorktreeEntries(worktreeIds, executionHostId).map(
        (entry) => entry.worktree.path
      );
      if (worktreePaths.length > 0) onPinWorktreePaths(worktreePaths);
    },
    [onPinWorktreePaths, resolveDragWorktreeEntries]
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
      // Why the host-qualified identity: the same repo can be mounted on two
      // execution hosts, so its workspace id repeats. Keying the dedupe on the id
      // alone would drop the second host's Cmd+N position; keying it on the
      // identity still folds a Pinned mirror of the same workspace on the same host.
      const identity = getWorktreeHostIdentity({ id, hostId: row.worktree.hostId });
      if (!id || seen.has(identity)) continue;
      seen.add(identity);
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
      if (selectedWorktreeIdentities.size > 1 && onDeleteWorktreeSelection) {
        const selected = [...selectedWorktreeIdentities]
          .map((identity) => worktreesByIdentity.get(identity))
          .filter((worktree): worktree is GitWorktreeInfo => Boolean(worktree));
        if (selected.length > 1) {
          onDeleteWorktreeSelection(selected, workspaceShortcutTarget.project);
          return;
        }
      }
      onDeleteGitWorktree(workspaceShortcutTarget.worktree, workspaceShortcutTarget.project);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    onDeleteGitWorktree,
    onDeleteWorktreeSelection,
    selectedWorktreeIdentities,
    worktreesByIdentity,
    storeKeybindings,
    workspaceShortcutTarget,
  ]);

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
      // surface inset as padding and hands the card the content indent. The three
      // cases — plain grouped row, lineage child, folder-backed repo child — live in
      // one projection so the painted row and the drag preview cannot drift.
      const folderBackedProjectGroupIds = new Set(
        projectGroups
          .filter(
            (group) => (group as { createdFrom?: string }).createdFrom === "folder-scan"
          )
          .map((group) => group.id)
      );
      const projectGroupId = row.repo?.projectGroupId ?? null;
      const isFolderBackedRepoChild =
        displayOptions.groupBy === "repo" &&
        projectGroupId !== null &&
        folderBackedProjectGroupIds.has(projectGroupId);
      const { surfaceInset, cardContentIndent } = getWorktreeItemRowGeometry({
        row,
        groupBy: displayOptions.groupBy,
        experimentalNewWorktreeCardStyle:
          storeSettings?.experimentalNewWorktreeCardStyle === true,
        isFolderBackedRepoChild,
      });
      const identity = getWorktreeHostIdentity(row.worktree);
      const isMultiSelected = selectedWorktreeIdentities.has(identity);
      const lineageGroupKey = row.lineageGroupKey;

      return (
        <WorktreeDragRow
          key={row.rowKey}
          rowKey={row.rowKey}
          worktreeId={row.worktree.id}
          worktreePath={wt.path}
          optionId={slot.optionId}
          hostIdentity={getWorktreeHostIdentity({
            id: row.worktree.id,
            hostId: row.worktree.hostId,
          })}
          isActive={slot.isActive}
          isSelected={isMultiSelected}
          isRevealed={isRevealed}
          style={surfaceInset > 0 ? { paddingLeft: `${surfaceInset}px` } : undefined}
        >
          <WorktreeCard
            worktree={wt}
            status={workspaceStatusFrom({
              sessions: wtSessions,
              hasLiveTerminal: livePaths.has(wt.path),
            })}
            prDisplay={prByPath?.[wt.path] ?? null}
            review={((): WorktreeReviewStatus | undefined => {
              const display = prByPath?.[wt.path];
              if (!display) return undefined;
              return {
                pr_number: display.number ?? null,
                state: display.state,
                provider: display.provider ?? null,
              };
            })()}
            project={proj}
            repo={proj}
            // Orca `item-row.tsx`: only the repo grouping names the repo in its
            // section header; mixed lanes (Pinned/status/PR) keep the card chip.
            hideRepoBadge={displayOptions.groupBy === "repo"}
            lineageChildCount={row.lineageChildCount}
            lineageCollapsed={row.lineageCollapsed}
            onLineageToggle={
              lineageGroupKey
                ? (event) => {
                    event.stopPropagation();
                    onToggleGroupCollapse(lineageGroupKey);
                  }
                : undefined
            }
            contentIndent={cardContentIndent}
            flushSurface
            isActive={activeWorktreePath === wt.path}
            isActiveSurface={activeWorktreePath === wt.path}
            activeSurfaceVariant={resolveActiveSurfaceVariant(row.rowKey, primaryActiveRowKey)}
            isCurrentWorktree={activeWorktreePath === wt.path}
            isFocused={isFocused}
            revealHighlight={isRevealed}
            isPinned={pinnedSet.has(wt.path)}
            isUnread={unreadSet.has(wt.path)}
            isMultiSelected={isMultiSelected}
            hostContextLabel={hostContextLabelByIdentity.get(identity)}
            isRuntimeDisconnected={isRuntimeExecutionHostDisconnected(
              storeRuntimeStatusByEnvironmentId as ReadonlyMap<string, never>,
              hostIdByRepoId.get(proj.id)
            )}
            compactCards={compactCards}
            ports={portsByWorktree?.get(wt.path) || []}
            sessions={wtSessions}
            dropTarget={worktreeDropTarget}
            onEditMetadata={
              onEditWorktreeMetadata ? () => onEditWorktreeMetadata(wt) : undefined
            }
            cliCreated={Boolean(row.worktree.cliProvenance)}
            metadata={{
              comment: row.worktree.comment,
              linkedIssue: row.worktree.linkedIssue,
              linkedPR: row.worktree.linkedPR,
              linkedLinearIssue: row.worktree.linkedLinearIssue,
            }}
            onSelect={(wt) => {
              // Orca marks the mounted option current before the store update lands,
              // so the click never paints an unselected card for a frame.
              markSidebarWorktreeActiveImmediately(row.worktree.id, row.rowKey);
              onSelectGitWorktree(wt);
            }}
            onSelectionGesture={(event) => handleSelectionGesture(event, identity)}
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
            onContextMenu={
              onWorktreeContextMenu
                ? (event, worktree, project) => {
                    // Keep an existing multi-selection; a right-click outside it
                    // makes this row the selection (Orca `selectForContextMenu`).
                    if (!isMultiSelected) selectForContextMenu(identity)
                    onWorktreeContextMenu(
                      event,
                      worktree,
                      project,
                      selectedContextWorktrees(identity, isMultiSelected)
                    )
                  }
                : undefined
            }
            onSelectSession={onSelectSession}
            onDragStart={(e, path) => {
              // The board's lanes and pin strip are native drop destinations, and they receive
              // this row by the shared `workspace-status-drag-data.ts` payload (D08-041): the
              // board keys on the workspace id — the same id this list's pointer drag speaks
              // (`row.worktree.id`) — not on the path the list's own HTML5 reorder reads. The
              // payload carries the whole selection (D03a-002), so a native drag moves the same
              // batch its pointer sibling does; Orca publishes the same payload from its rows.
              writeWorkspaceDragData(e.dataTransfer, resolveDraggedWorktreeIds(row.rowKey, row.worktree.id));
              onWorktreeDragStart?.(e, path);
            }}
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
      primaryActiveRowKey,
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
      onEditWorktreeMetadata,
      headerSectionBounds,
      persistWorktreeDisplayName,
      hostIdByRepoId,
      deleteStateByWorktreeId,
      renameRequest,
      onWorktreeContextMenu,
      selectedContextWorktrees,
          onSelectSession,
      onWorktreeDragStart,
      onWorktreeDragOver,
      onWorktreeDrop,
      onWorktreeDragEnd,
      selectedWorktreeIdentities,
      handleSelectionGesture,
      resolveDraggedWorktreeIds,
      projectGroups,
      storeSettings,
      onToggleGroupCollapse,
    ]
  );

  // ─── Header-tier drag reorder (D03a-020 / D03a-092) ───────────────────────
  //
  // Three header tiers reorder in place: host section cards, project groups and repo
  // headers. The tier gates live in the drag module (`groupBy === "repo"` for the
  // repo/group tiers, manual project order for repos), and each commit persists its
  // own order — host order in the UI prefs, a group's tab order on its host, and the
  // repo manual order host-split.
  const headerDrag = useWorktreeSidebarHeaderDrag({
    rows,
    groupBy: displayOptions.groupBy,
    projectOrderBy: displayOptions.projectsOrder ?? "manual",
    scrollRef: viewportScrollRef,
    projectGroups,
    onReorderHostSections,
    onUpdateProjectGroup,
    onProjectDragStart,
    onProjectDragOver,
    onProjectDrop,
    onProjectDragEnd,
    onGroupDragOver,
    onGroupDragLeave,
    onGroupDrop,
  });

  // A drop fires the header's click on its way out; swallow exactly that click so
  // reordering a host section never collapses it.
  const headerCommitClickGuardRef = useRef(false);
  const headerHandlersFor = useCallback(
    (tier: "host" | "repo" | "project-group", id: string) => {
      const handlers =
        tier === "host"
          ? headerDrag.hostHandlers(id as ExecutionHostId)
          : tier === "repo"
            ? headerDrag.repoHandlers(id)
            : headerDrag.groupHandlers(id);
      if (!handlers) return undefined;
      if (tier !== "host") return handlers;
      // Why host-only: the guard exists for the host header's own collapse click; a
      // repo/group drop must not swallow a later, unrelated host click.
      return {
        ...handlers,
        onDrop: handlers.onDrop
          ? (event: React.DragEvent) => {
              headerCommitClickGuardRef.current = true;
              handlers.onDrop?.(event);
            }
          : undefined,
        onDragEnd: () => {
          headerCommitClickGuardRef.current = true;
          handlers.onDragEnd?.();
        },
      };
    },
    [headerDrag]
  );

  const renderRepoHeader = useCallback(
    (row: GroupHeaderRow, slot: WorktreeVirtualRowSlot): React.JSX.Element | null => {
      const proj = row.repo ? rowModel.propProjectById.get(row.repo.id) : undefined;
      if (!proj) return null;
      // The catalog row carries the fork identity and scan verdict; the sidebar's
      // project props do not (Orca `RepoForkIndicator` / `RepoScanUnavailableIndicator`).
      const storeRepo = storeRepos.find(
        (repo) => repo.id === proj.id || repo.path === proj.path
      );
      // The drag module owns the tier gate (`groupBy === "repo"` + manual project
      // order) and wraps the panel's order writer; without it the header is inert.
      const dragHandlers = headerHandlersFor("repo", proj.id);
      const isDropTarget =
        headerDrag.isDropTarget("repo", proj.id) || projectDropTarget?.id === proj.id;
      return (
        <SectionHeader
          key={row.key}
          variant="repo"
          project={proj}
          upstream={storeRepo?.upstream ?? null}
          scanFailureMessage={scanFailuresByProject?.[proj.path] ?? null}
          isCollapsed={isCollapsedKey(row.key) || collapsedProjects.has(proj.id)}
          isActive={activeProject?.path === proj.path}
          count={row.count}
          inGroup={(row.projectGroupDepth ?? 0) > 0}
          onToggleCollapse={slot.toggleCollapse}
          onSelectProject={onSelectProject}
          onOpenNewWorkspace={onOpenNewWorkspaceModal}
          createState={createStateByProjectId?.get(proj.id) ?? null}
          onContextMenu={onProjectContextMenu}
          isDropTarget={isDropTarget}
          sectionEnd={headerSectionBounds.repoSectionEndByRepoId.get(proj.id)}
          dropPosition={projectDropTarget?.position}
          isDragged={draggedProjectId === proj.id}
          onDragStart={dragHandlers?.onDragStart}
          onDragOver={dragHandlers?.onDragOver}
          onDrop={dragHandlers?.onDrop}
          onDragEnd={dragHandlers?.onDragEnd}
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
      createStateByProjectId,
      onProjectContextMenu,
      projectDropTarget,
      draggedProjectId,
      onProjectDragStart,
      onProjectDragOver,
      onProjectDrop,
      onProjectDragEnd,
      storeRepos,
      scanFailuresByProject,
      headerDrag,
      headerHandlersFor,
    ]
  );

  const renderGroupHeader = useCallback(
    (row: GroupHeaderRow, slot: WorktreeVirtualRowSlot): React.JSX.Element | null => {
      const group = row.projectGroup;
      if (!group || typeof group.id !== "string") return null;
      // A folder-backed group whose folder is gone cannot create a workspace there;
      // the button stays visible but disabled with the reason (D03a-083).
      const groupFolderPath = folderWorkspaces.find(
        (workspace) => workspace.projectGroupId === group.id
      )?.folderPath;
      const groupPathStatus = groupFolderPath
        ? folderPathStatusByPath?.get(groupFolderPath)
        : undefined;
      const createWorkspaceDisabledReason =
        groupFolderPath &&
        (missingPaths.has(groupFolderPath) || isFolderWorkspaceCreateDisabled(groupPathStatus))
          ? (getFolderWorkspaceCreateDisabledReason(groupPathStatus) ??
            `Folder not found: ${groupFolderPath}`)
          : undefined;
      const dragHandlers = headerHandlersFor("project-group", group.id);
      return (
        // Why the wrapper: the shared header component is a drop target, not a drag
        // source, so the group tier's draggable wrapper supplies the source.
        <div
          key={row.key}
          draggable={Boolean(dragHandlers?.onDragStart)}
          onDragStart={dragHandlers?.onDragStart}
          onDragEnd={dragHandlers?.onDragEnd}
        >
          <SectionHeader
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
            isDropTarget={
              headerDrag.isDropTarget("project-group", group.id) || groupDropTargetId === group.id
            }
            sectionEnd={headerSectionBounds.projectGroupSectionEndByGroupId.get(group.id as string)}
            badgeColor={groupBadgeColorById.get(group.id as string)}
            createWorkspaceDisabledReason={createWorkspaceDisabledReason}
            folderPathStatus={groupPathStatus ?? null}
            onDragOver={dragHandlers?.onDragOver}
            onDragLeave={dragHandlers?.onDragLeave}
            onDrop={dragHandlers?.onDrop}
          />
        </div>
      );
    },
    [
      isCollapsedKey,
      headerSectionBounds,
      groupBadgeColorById,
      onGroupContextMenu,
      groupDropTargetId,
      headerDrag,
      headerHandlersFor,
      folderWorkspaces,
      missingPaths,
      folderPathStatusByPath,
    ]
  );

  const renderFolderRow = useCallback(
    (row: FolderWorkspaceRowModel, slot: WorktreeVirtualRowSlot): React.JSX.Element => {
      const folderPath = row.folderWorkspace.folderPath;
      const folderSessions = sessions.filter((s) => s.project_path === folderPath);
      const isActive = activeWorktreePath === folderPath;
      const isGrouped = displayOptions.groupBy !== "none";
      // Orca `folder-row.tsx`: a folder workspace inside a folder-scanned project
      // group keeps that group's compact anchor, and a lineage depth advances it.
      const { surfaceInset, cardContentIndent } = getFolderWorkspaceRowGeometry({
        experimentalNewWorktreeCardStyle:
          storeSettings?.experimentalNewWorktreeCardStyle === true,
        isFolderBackedWorkspaceChild:
          displayOptions.groupBy === "repo" && row.projectGroup.createdFrom === "folder-scan",
        isGrouped,
        groupDepth: row.groupDepth,
        lineageDepth: row.depth,
      });
      const folderPrDisplay = getFolderWorkspaceCardPrDisplay({
        folderWorkspaceId: row.folderWorkspace.id,
        workspaceLineageByChildKey: null,
        worktreeLineageById: storeWorktreeLineageById,
        worktreeById: rowModel.worktreeById,
        prByPath,
      });
      return (
        // The row itself is the listbox option (Orca `folder-row.tsx`): the viewport's
        // `aria-activedescendant` names this element through `id`.
        <FolderWorkspaceRow
          key={row.key}
          id={slot.optionId}
          name={row.folderWorkspace.name}
          folderPath={folderPath}
          status={workspaceStatusFrom({
            sessions: folderSessions,
            hasLiveTerminal: livePaths.has(folderPath),
          })}
          pathMissing={missingPaths.has(folderPath)}
          pathStatus={folderPathStatusByPath?.get(folderPath)}
          isActive={isActive}
          surfaceInset={surfaceInset}
          contentIndent={cardContentIndent}
          prDisplay={folderPrDisplay}
          onActivate={() => onActivateFolderWorkspace?.(folderPath)}
          onDelete={
            onDeleteFolderWorkspace
              ? () => onDeleteFolderWorkspace(row.folderWorkspace.id)
              : undefined
          }
        />
      );
    },
    [
      sessions,
      livePaths,
      missingPaths,
      activeWorktreePath,
      displayOptions.groupBy,
      storeSettings,
      storeWorktreeLineageById,
      rowModel.worktreeById,
      prByPath,
      folderPathStatusByPath,
      onActivateFolderWorkspace,
      onDeleteFolderWorkspace,
    ]
  );

  // D03a-054: the notice rows' own pending/error/forceVisible state, keyed by repo
  // path. The parent's handlers resolve only after their authoritative refresh, so a
  // resolved action is the confirmation; a rejection paints the row error here even
  // when the parent did not publish one.
  const [externalWorktreeActionStateByRepoPath, setExternalWorktreeActionStateByRepoPath] =
    useState<Map<string, ExternalWorktreeCardActionState>>(new Map());
  const setExternalWorktreeActionState = useCallback(
    (repoPath: string, state: ExternalWorktreeCardActionState | null) => {
      setExternalWorktreeActionStateByRepoPath((previous) => {
        const next = new Map(previous);
        if (state === null) next.delete(repoPath);
        else next.set(repoPath, state);
        return next;
      });
    },
    []
  );
  // Why: `forceVisible` only pins the row open until the authoritative scan drops the
  // hidden worktrees; once the repo's live list is empty the state has done its job.
  useEffect(() => {
    setExternalWorktreeActionStateByRepoPath((previous) => {
      let next: Map<string, ExternalWorktreeCardActionState> | null = null;
      for (const project of visibleProjects) {
        if ((hiddenWorktreesByProject?.[project.path] ?? []).length > 0) continue;
        if (!previous.has(project.path)) continue;
        next ??= new Map(previous);
        next.delete(project.path);
      }
      return next ?? previous;
    });
  }, [hiddenWorktreesByProject, visibleProjects]);

  /** Notices read the live props; the row only decides placement in the stream. */
  const renderNoticeRow = useCallback(
    (row: HostSectionRow): React.JSX.Element | null => {
      if (row.type !== "imported-worktrees-card" && row.type !== "new-external-worktrees-inbox") {
        return null;
      }
      const proj = rowModel.propProjectById.get(row.repo.id);
      if (!proj) return null;
      const hiddenWorktrees = hiddenWorktreesByProject?.[proj.path] ?? [];
      const actionState = externalWorktreeActionStateByRepoPath.get(proj.path);
      const setStateForProj = (state: ExternalWorktreeCardActionState | null) =>
        setExternalWorktreeActionState(proj.path, state);
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
        pending: actionState?.pending ?? false,
        error: actionState?.error ?? hiddenWorktreeErrorsByProject?.[proj.path] ?? null,
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
            onShowAll={
              onShowAllHiddenWorktrees
                ? () => {
                    void runExternalWorktreeCardAction({
                      setState: setStateForProj,
                      action: async () => {
                        await onShowAllHiddenWorktrees(proj);
                      },
                      errorMessage: IMPORTED_WORKTREES_SHOW_ERROR,
                      keepForceVisible: true,
                    });
                  }
                : undefined
            }
            onKeepHidden={
              onKeepHiddenWorktrees && canKeepImportedWorktreesHidden(row, actionState)
                ? (worktreePaths) => {
                    void runExternalWorktreeCardAction({
                      setState: setStateForProj,
                      action: async () => {
                        await onKeepHiddenWorktrees(proj, worktreePaths);
                      },
                      errorMessage: IMPORTED_WORKTREES_KEEP_HIDDEN_ERROR,
                    });
                  }
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
          onSuppress={
            onSuppressHiddenWorktrees
              ? () => {
                  void runExternalWorktreeCardAction({
                    setState: setStateForProj,
                    action: async () => {
                      await onSuppressHiddenWorktrees(proj);
                    },
                    errorMessage: EXTERNAL_WORKTREES_SUPPRESS_ERROR,
                  });
                }
              : undefined
          }
        />
      );
    },
    [
      rowModel,
      hiddenWorktreesByProject,
      externalWorktreeActionStateByRepoPath,
      setExternalWorktreeActionState,
      onShowHiddenWorktree,
      onShowAllHiddenWorktrees,
      onKeepHiddenWorktrees,
      onReviewHiddenWorktrees,
      onSuppressHiddenWorktrees,
      hiddenWorktreeErrorsByProject,
    ]
  );

  // ─── Host-section drag reorder (D03a-020) ──────────────────────────────────
  //
  // The drag module owns the host tier's order and persistence; the list keeps the
  // ghost-click guard, because a drop fires the header's own click on its way out.
  const toggleHostCollapse = useCallback(
    (hostId: ExecutionHostId) => {
      if (headerCommitClickGuardRef.current) {
        headerCommitClickGuardRef.current = false;
        return;
      }
      onToggleGroupCollapse(hostId);
    },
    [onToggleGroupCollapse]
  );

  /**
   * Row content for one virtual slot. The viewport owns the slot (position, measurement,
   * listbox identity) and the scroll anchor; this decides what a row paints and which
   * existing row components get it.
   */
  const renderRow = useCallback(
    (row: HostSectionRow, slot: WorktreeVirtualRowSlot): React.ReactNode => {
      switch (row.type) {
        case "host-header": {
          const dragHandlers = headerHandlersFor("host", row.hostId);
          return (
            <HostSectionHeader
              key={row.key}
              row={row}
              isCollapsed={collapsedGroups.has(row.key)}
              onToggleCollapse={() => toggleHostCollapse(row.hostId)}
              onDragStart={dragHandlers?.onDragStart}
              onDragOver={dragHandlers?.onDragOver}
              onDrop={dragHandlers?.onDrop}
              onDragEnd={dragHandlers?.onDragEnd}
              isDropTarget={headerDrag.isDropTarget("host", row.hostId)}
            />
          );
        }
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
              onAssignStatusDrop={handleAssignWorktreesStatus}
              onPinDrop={handlePinWorktrees}
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
          return (
            <PendingWorktreeCreationRow
              key={row.key}
              creationId={row.creationId}
              branchName={row.branchName}
              agentName={row.agentName}
              repoName={row.repo?.displayName}
            />
          );
      }
    },
    [
      collapsedGroups,
      headerDrag,
      headerHandlersFor,
      isCollapsedKey,
      renderRepoHeader,
      renderGroupHeader,
      renderWorktreeRow,
      renderFolderRow,
      renderNoticeRow,
      toggleHostCollapse,
    ]
  );

  // ─── Clear Filters empty-state gate (Orca `sidebar-empty-state-gate.ts`) ───
  //
  // The gate keeps "No workspaces found" from winning unless the menu/host filters
  // are actually what emptied the list (#15362); `hasFilters` is computed with the
  // row model above so the reveal path shares it.
  const filtersHideAllRows = shouldFiltersHideAllRows({
    hasFilters,
    visibleWorktreeCount: rows.filter((row) => row.type === "item").length,
    visibleFolderWorkspaceCount: rows.filter((row) => row.type === "folder-workspace").length,
    // Hydra's row union has no empty-project placeholder rows (Orca's
    // `placeholderRepoIds`), so this term is structurally zero.
    placeholderRepoCount: 0,
    importedWorktreeCardCount: rows.filter((row) => row.type === "imported-worktrees-card").length,
  });

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

  // Why after the search branch: a query that matches no project keeps its own
  // "matching \"{filter}\"" message; this branch is the menu/host-scope case.
  if (rows.length === 0 || filtersHideAllRows) {
    return <WorktreeListEmptyState hasFilters={hasFilters} onClearFilters={onClearSidebarFilters} />;
  }

  return (
    <WorktreeListDragProvider
      rows={rows}
      scrollRef={viewportScrollRef}
      onReorderWorktrees={handlePointerGroupReorder}
      onAssignWorktreesStatus={handleAssignWorktreesStatus}
      onPinWorktrees={handlePinWorktrees}
      lineageParentIdByChildId={rowModel.lineageParentIdByChildId}
      workspaceBoardOpen={workspaceBoardOpen}
      onWorkspaceBoardDragPreviewStart={onWorkspaceBoardDragPreviewStart}
      onWorkspaceBoardDragPreviewCommit={onWorkspaceBoardDragPreviewCommit}
      onWorkspaceBoardDragPreviewCancel={onWorkspaceBoardDragPreviewCancel}
      onNestWorktrees={handleNestWorktrees}
      onUnnestWorktrees={handleUnnestWorktrees}
      resolveDraggedWorktreeIds={resolveDraggedWorktreeIds}
    >
      <RepoScanUnavailableIndicator
        failures={useMemo(
          () =>
            Object.entries(scanFailuresByProject).map(([repoPath, message]) => ({
              repoPath,
              message,
            })),
          [scanFailuresByProject]
        )}
        onRetry={() => window.dispatchEvent(new CustomEvent("hydra:refresh-projects"))}
      />
      <VirtualizedWorktreeViewport
        rows={rows}
        activeRowKey={activeRowKey}
        groupBy={displayOptions.groupBy}
        pinnedDisplayPolicy={pinnedDisplayPolicy}
        revealPath={highlightedRevealPath ?? null}
        revealRowKey={pendingRevealSidebarRow?.rowKey ?? null}
        onRevealRowIssued={clearPendingRevealSidebarRow}
        renderRow={renderRow}
        onActivateRow={activateRow}
        onToggleRowCollapse={toggleRowCollapse}
        dropIndicator={
          <>
            <WorktreeDragDropIndicator />
            {headerDrag.indicator?.tier === "repo" ? (
              <WorktreeSidebarDropIndicator y={headerDrag.indicator.y} />
            ) : null}
            {headerDrag.indicator?.tier === "project-group" ? (
              <WorktreeSidebarDropIndicator y={headerDrag.indicator.y} />
            ) : null}
            {/* The host tier is the outer card; its line floats above the sticky stack. */}
            {headerDrag.indicator?.tier === "host" ? (
              <div className="pointer-events-none absolute inset-0 z-40">
                <WorktreeSidebarDropIndicator y={headerDrag.indicator.y} />
              </div>
            ) : null}
          </>
        }
        scrollRef={viewportScrollRef}
        className={className}
      />
    </WorktreeListDragProvider>
  );
}

export default WorktreeList;
