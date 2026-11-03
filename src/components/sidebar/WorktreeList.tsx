// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/WorktreeList.tsx
import React, { useMemo, useCallback, useLayoutEffect, useEffect, useRef, useState } from "react";
import { useAppStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import type { AppState } from "@/store/types";
import type { WorktreeCardProperty } from "../../shared/ui-chrome-types";
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
import type { TerminalPaneLayoutNode } from "../../shared/terminal-tab-types";
import {
  selectWorktreeActivityStatus,
  type WorktreeActivityState,
} from "./use-worktree-activity-status";
import { selectWorktreeAgentActivitySummary } from "./worktree-agent-activity-summary";
import { buildSidebarLiveActivityIndex } from "./visible-worktree-filters";
import { sidebarHasActiveFilters, toSidebarFilterState } from "./sidebar-filter-actions";
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
import type { FolderWorkspace, WorkspaceKey } from "../../shared/folder-workspace-types";
import type { ProjectGroup as SharedProjectGroup } from "../../shared/project-group-types";
import type { Worktree } from "../../shared/worktree/types";
import type { Row } from "./worktree-list/grouping/row-types";
import type { WorkspaceLineage, WorktreeLineage } from "../../shared/worktree/lineage-types";
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
import { getEmptyProjectPlaceholderRepoIds } from "./empty-project-placeholder-repos";
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
import { getProjectedWorkspaceLineageByChildKey } from "./worktree-list/rows/workspace-lineage-projection";
import { getWorktreeItemRowGeometry } from "./worktree-list/rows/item-row-geometry";
import {
  createLineageToggleHandlerCache,
} from "./worktree-lineage-toggle-handler-cache";
import { renderWorktreeLineageDescendants } from "./worktree-list/rows/item-row";
import { getLineageChildrenInlineStyle } from "./worktree-list/rows/indentation";
import type { LineageGroupRow, RenderRow } from "./worktree-list/listing/render-row";
import { buildRenderableRows } from "./worktree-list/listing/renderable-rows";
import { getWorktreeOptionId } from "./worktree-list/viewport/option-id";
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
import {
  filterFolderWorkspacesForVisibleHosts,
  filterProjectGroupsForVisibleHosts,
  filterReposForVisibleHosts,
  getVisibleSidebarHostIdSet,
} from "./worktree-list/listing/host-filtering";
import {
  filterFolderWorkspacesFromOtherDevices,
  getPairedDeviceIdsByEnvironment,
} from "./workspace-creator-visibility";
import { folderWorkspaceKey } from "../../shared/workspace-scope";
import { selectVisibleSidebarWorktrees } from "./worktree-list/listing/visible-worktree-selection";
import { getPinnedSectionWorktrees } from "./pinned-section-worktrees";
import {
  getVisibleWorktreeBrowserActivityTabs,
  getVisibleWorktreeTerminalActivityTabs,
} from "./visible-worktree-activity-inputs";
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
import { getEffectiveCollapsedGroups } from "./worktree-list/listing/effective-collapsed-groups";
import { PendingWorktreeCreationRow } from "./worktree-list/rows/PendingWorktreeCreationRow";
import { applyWorktreeGroupOrder } from "./worktree-group-order";
import {
  buildManualOrderUpdatesForGroupDrop,
  buildManualOrderUpdatesForVisibleGroups,
  shouldWriteManualOrderForGroupDrop,
} from "./worktree-manual-order";
import { buildWorktreeManualOrderCatalog } from "./worktree-manual-order-catalog";
import { WorktreeListDragProvider } from "./worktree-list/drag/WorktreeListDragProvider";
import { getWorktreeDragGroups } from "./worktree-list/drag/groups";
import { DEFAULT_WORKSPACE_STATUS_ID, getWorkspaceStatusGroupKey } from "./workspace-status";
import { getWorkspaceBoardSidebarDropGroups } from "./workspace-board/workspace-board-sidebar-drop";
import { buildLineageParentIdByChildId } from "./worktree-list/drag/nesting";
import {
  WorktreeDragDropIndicator,
  WorktreeDragRow,
} from "./worktree-list/drag/worktree-drag-surface";
import type { WorktreeGroupReorderArgs } from "./worktree-list/drag/drop-commit-context";
import { useRepoHeaderPointerDrag } from "./worktree-list/drag/repo-header-pointer-drag";
import {
  getProjectGroupHeaderDragBucketKey,
  useProjectGroupHeaderPointerDrag,
} from "./worktree-list/drag/project-group-header-pointer-drag";
import { useHostHeaderPointerDrag } from "./worktree-list/drag/host-header-pointer-drag";
import { getProjectHeaderDragBucketKey } from "./project-header-drop";
import { WorktreeSidebarDropIndicator } from "./WorktreeSidebarDropIndicator";
import { VirtualizedWorktreeViewport } from "./worktree-list/viewport/VirtualizedWorktreeViewport";
import type { WorktreeVirtualRowSlot } from "./worktree-list/viewport/viewport-props";
import type { ExecutionHostId } from "../../shared/execution-host";
import { VIRTUALIZED_SCROLL_ANCHOR_RECORD_EVENT } from "../../hooks/useVirtualizedScrollAnchor";

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
/** No mounted terminal pages: the shell omits the prop on a cold sidebar. */
const EMPTY_LIVE_WORKSPACE_PATHS: ReadonlySet<string> = new Set();
const EMPTY_SCAN_FAILURES: Record<string, string> = {};

const EMPTY_DELETE_STATE: Record<string, WorktreeDeleteState | undefined> = {};
const EMPTY_WORKTREE_CARD_PROPERTIES: WorktreeCardProperty[] = [];

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

/**
 * The painted list's group and folder props, plus the Orca catalog host/creator
 * stamps when the caller carries them. The catalog→sidebar bridge drops them today,
 * so every field is optional; the render-time host/device scope filters read them
 * (Orca `useSidebarHostVisibleScope`).
 */
type SidebarProjectGroupForRows = ProjectGroup & {
  connectionId?: string | null;
  executionHostId?: string | null;
};

type SidebarFolderWorkspaceForRows = {
  id: string;
  projectGroupId: string;
  name: string;
  folderPath: string;
  connectionId?: string | null;
  executionHostId?: FolderWorkspace['executionHostId'];
  creatorProvenance?: FolderWorkspace['creatorProvenance'];
};

function toPipelineProjectGroup(
  group: SidebarProjectGroupForRows,
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
    tabOrder: group.tabOrder ?? 0,
    isCollapsed: group.isCollapsed ?? false,
    color: null,
    createdAt: 0,
    updatedAt: 0,
    connectionId: group.connectionId ?? null,
    executionHostId: group.executionHostId ?? null,
  };
}

function toPipelineFolderWorkspace(
  workspace: SidebarFolderWorkspaceForRows
): FolderWorkspace {
  return {
    id: workspace.id,
    projectGroupId: workspace.projectGroupId,
    name: workspace.name,
    folderPath: workspace.folderPath,
    connectionId: workspace.connectionId ?? null,
    executionHostId: workspace.executionHostId ?? null,
    ...(workspace.creatorProvenance
      ? { creatorProvenance: workspace.creatorProvenance }
      : {}),
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

/**
 * A forced workspace (the agent-send target) outranks the other-device sweep, exactly
 * like the worktree loop above: the user asked for this row, so a scope filter must not
 * swallow it. Folder workspaces are addressed by both their raw id and their
 * `folder:` workspace key, so both spellings match.
 */
function keepForcedVisibleFolderWorkspaces(
  candidates: readonly FolderWorkspace[],
  kept: readonly FolderWorkspace[],
  forcedWorkspaceId: string | null
): readonly FolderWorkspace[] {
  if (!forcedWorkspaceId) return kept;
  const keptIds = new Set(kept.map((workspace) => workspace.id));
  return candidates.filter(
    (workspace) =>
      keptIds.has(workspace.id) ||
      workspace.id === forcedWorkspaceId ||
      folderWorkspaceKey(workspace.id) === forcedWorkspaceId
  );
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
  /**
   * Workspace lineage keyed by child workspace key, for the folder card's synthetic
   * review walk (D03a-077). Derived from the lineage this model already projects.
   */
  workspaceLineageByChildKey: Record<WorkspaceKey, WorkspaceLineage>;
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
  /**
   * Host-qualified identities the Pinned section paints. A descendant of a pinned
   * ancestor belongs here even when its own `isPinned` flag is false (D11-003).
   */
  pinnedSectionIdentities: ReadonlySet<string>;
  /** Repos still painting a section without visible cards (empty scan or filtered group member). */
  placeholderRepoCount: number;
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
  projectGroups?: SidebarProjectGroupForRows[];
  projectGroupMap?: Record<string, string>;
  folderWorkspaces?: SidebarFolderWorkspaceForRows[];
  liveWorkspacePaths?: ReadonlySet<string>;
  missingFolderPaths?: ReadonlySet<string>;
  /** Rich folder path status, when the shell probed it (confirmed stale vs ambiguous). */
  folderPathStatusByPath?: ReadonlyMap<string, FolderWorkspacePathStatus>;
  /**
   * Fresh-only reader (Orca `getFreshFolderWorkspacePathStatus`): null once the
   * probe aged past the TTL or the folder lives on a host this client cannot
   * probe. Create and activation gates use it so an expired negative stops
   * blocking without erasing the badge.
   */
  getFreshFolderPathStatus?: (folderPath: string) => FolderWorkspacePathStatus | null;
  /** Failed authoritative scans, keyed by repo path (`RepoScanUnavailableIndicator`). */
  scanFailuresByProject?: Record<string, string>;
  onActivateFolderWorkspace?: (folderPath: string) => void;
  /** Removes a folder workspace entry (folder on disk stays). */
  onDeleteFolderWorkspace?: (folderWorkspaceId: string) => void;
  onFolderWorkspaceContextMenu?: (
    event: React.MouseEvent,
    folderWorkspace: { id: string; name: string; folderPath: string }
  ) => void;
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
  /**
   * Persists a repo-header reorder (D03b-028/029). The ids are the logical project order,
   * with every host-qualified occurrence of a repo moving as one block.
   */
  onReorderRepoHeaders?: (orderedRepoIds: string[]) => void;
  /** Project-group tier writer: the drop reports the group's new tab order. */
  onUpdateProjectGroup?: (groupId: string, updates: { tabOrder: number }) => void;
  /**
   * The app's own workspace-status write (`set_worktree_status` + the local worktree
   * maps). A sidebar row dragged onto an open workspace board commits through it, so the
   * board and the context menu share one writer (D08-002/D08-040).
   */
  onAssignWorktreeStatus: (worktreePath: string, status: string) => void | Promise<void>;
  /**
   * Switches the sidebar sort to Manual when a board drop writes a manual order, so
   * the placement stays visible instead of being re-sorted away (D08-040/D08-042).
   */
  onSwitchToManualSort?: () => void;
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
  onAssignStatusDrop: (
    worktreeIds: readonly string[],
    status: string,
    dropIndex: number | null
  ) => void;
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
                onAssignStatusDrop(worktreeIds, workspaceStatusId, null);
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
  isDragged = false,
  isDropTarget = false,
  onHeaderPointerDown,
}: {
  row: HostHeaderRow;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  /** This card is the one being reordered by the pointer session (D03b-034). */
  isDragged?: boolean;
  isDropTarget?: boolean;
  /** Arms the host-tier pointer drag; actions inside the card never arm it. */
  onHeaderPointerDown?: (event: React.PointerEvent<HTMLDivElement>) => void;
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
        data-host-header-drag-handle=""
        onPointerDown={onHeaderPointerDown}
        aria-grabbed={isDragged || undefined}
        className={cn(
          "group/host-header flex h-8 w-full items-center gap-2 rounded-md border px-2 text-left transition-all cursor-pointer select-none",
          onHeaderPointerDown && "cursor-grab active:cursor-grabbing",
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
  worktreesByProject = {},
  hiddenWorktreesByProject,
  pinnedWorktrees,
  unreadWorktrees,
  projectGroups = [],
  projectGroupMap = {},
  folderWorkspaces = [],
  liveWorkspacePaths,
  missingFolderPaths,
  folderPathStatusByPath,
  getFreshFolderPathStatus,
  scanFailuresByProject = EMPTY_SCAN_FAILURES,
  onActivateFolderWorkspace,
  onDeleteFolderWorkspace,
  onFolderWorkspaceContextMenu,
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
  onReorderRepoHeaders,
  onUpdateProjectGroup,
  onAssignWorktreeStatus,
  onSwitchToManualSort,
  lineageByPath,
  worktreeMetadataByPath,
  onEditWorktreeMetadata,
  onAssignWorktreeParent,
  onUnnestWorktrees,
  onPinWorktreePaths,
  onWorktreeDragStart,
  onWorktreeDragOver,
  onWorktreeDrop,
  onWorktreeDragEnd,
  className = "",
}: WorktreeListProps): React.JSX.Element {
  const query = filter.trim().toLowerCase();
  // Why a memo: the snapshot below and the painted-card liveness reads must share
  // one set identity, and an inline `new Set()` re-keys them every render.
  const livePaths = useMemo(
    () => liveWorkspacePaths ?? EMPTY_LIVE_WORKSPACE_PATHS,
    [liveWorkspacePaths]
  );
  // D03a-047: one live-activity sample per render pass. The visible pipeline and
  // the status filters below read the SAME Set — re-deriving it between two calls
  // would let a status write keep one row and hide its sibling mid-paint.
  const liveActivity = useMemo(
    () => buildSidebarLiveActivityIndex(sessions, livePaths),
    [sessions, livePaths]
  );
  const liveAgentWorktreeIds = liveActivity.worktreeIdsWithLiveAgent;
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
  // D05-013: per-worktree status summary (flags + pane ids), cached by agentStatusEpoch.
  const agentActivityState = useAppStore(
    useShallow((s) => ({
      agentStatusEpoch: s.agentStatusEpoch,
      agentStatusByPaneKey: s.agentStatusByPaneKey,
      migrationUnsupportedByPtyId: s.migrationUnsupportedByPtyId,
      retainedAgentsByPaneKey: s.retainedAgentsByPaneKey,
      runtimeAgentOrchestrationByPaneKey: (
        s as unknown as {
          runtimeAgentOrchestrationByPaneKey?: Record<
            string,
            import('../../shared/agent-status-types').AgentStatusOrchestrationContext
          >
        }
      ).runtimeAgentOrchestrationByPaneKey,
      tabsByWorktree: s.tabsByWorktree,
    }))
  );
  const storeWorkspaceStatuses = useAppStore((s) => s.workspaceStatuses);
  // D11-006: the store's tab records are the real activity inputs. Their id-only
  // projections keep a title/URL/favicon write from invalidating the visible pipeline.
  const storeSidebarTabsByWorktree = useAppStore((s) => s.tabsByWorktree);
  const storeSidebarBrowserTabsByWorktree = useAppStore((s) => s.browserTabsByWorktree);
  const storeSidebarPtyIdsByTabId = useAppStore(
    (s) => s.ptyIdsByTabId as Record<string, string[]>
  );
  // D04b-008: the Orca status derivation needs the pane-title/layout records the
  // terminal slice writes. They are read here, once, so every painted card's dot
  // comes from the same snapshot instead of one subscription per card.
  const storeRuntimePaneTitlesByTabId = useAppStore(
    (s) => s.runtimePaneTitlesByTabId as Record<string, Record<number, string>>
  );
  const storeTerminalLayoutsByTabId = useAppStore(
    (s) =>
      s.terminalLayoutsByTabId as Record<
        string,
        { root: TerminalPaneLayoutNode | null } | undefined
      >
  );
  const activityState = useMemo<WorktreeActivityState>(
    () => ({
      tabsByWorktree:
        agentActivityState.tabsByWorktree as unknown as WorktreeActivityState["tabsByWorktree"],
      browserTabsByWorktree:
        storeSidebarBrowserTabsByWorktree as unknown as WorktreeActivityState["browserTabsByWorktree"],
      runtimePaneTitlesByTabId: storeRuntimePaneTitlesByTabId ?? {},
      ptyIdsByTabId: storeSidebarPtyIdsByTabId ?? {},
      terminalLayoutsByTabId: storeTerminalLayoutsByTabId ?? {},
      agentStatusEpoch: agentActivityState.agentStatusEpoch,
      agentStatusByPaneKey: agentActivityState.agentStatusByPaneKey,
      migrationUnsupportedByPtyId: agentActivityState.migrationUnsupportedByPtyId,
      retainedAgentsByPaneKey: agentActivityState.retainedAgentsByPaneKey,
      runtimeAgentOrchestrationByPaneKey:
        agentActivityState.runtimeAgentOrchestrationByPaneKey,
    }),
    [
      agentActivityState,
      storeSidebarBrowserTabsByWorktree,
      storeRuntimePaneTitlesByTabId,
      storeSidebarPtyIdsByTabId,
      storeTerminalLayoutsByTabId,
    ]
  );
  // Why two memos: the projection returns the SAME record when only tab metadata changed,
  // so the merge below keeps its identity and the row pipeline skips the recompute.
  const projectedTerminalActivityTabs = useMemo(
    () => getVisibleWorktreeTerminalActivityTabs(storeSidebarTabsByWorktree ?? {}),
    [storeSidebarTabsByWorktree]
  );
  const projectedBrowserActivityTabs = useMemo(
    () => getVisibleWorktreeBrowserActivityTabs(storeSidebarBrowserTabsByWorktree ?? {}),
    [storeSidebarBrowserTabsByWorktree]
  );
  const sidebarActivityInputs = useMemo(() => {
    // Why merge with the session sample instead of replacing it: the session pass also
    // carries a live-agent hint a PTY gap must not erase, and both sources key by path.
    const tabsByWorktree: Record<string, { id: string }[]> = {
      ...liveActivity.tabsByWorktree,
    };
    for (const [worktreeId, tabs] of Object.entries(projectedTerminalActivityTabs)) {
      if (tabs.length === 0) continue;
      const existing = tabsByWorktree[worktreeId] ?? [];
      tabsByWorktree[worktreeId] = existing.length === 0 ? tabs : [...existing, ...tabs];
    }
    const browserKeys = Object.keys(projectedBrowserActivityTabs);
    return {
      tabsByWorktree,
      ptyIdsByTabId: {
        ...(storeSidebarPtyIdsByTabId ?? {}),
        ...liveActivity.ptyIdsByTabId,
      },
      browserTabsByWorktree:
        browserKeys.length > 0 ? projectedBrowserActivityTabs : undefined,
    };
  }, [
    liveActivity,
    projectedTerminalActivityTabs,
    projectedBrowserActivityTabs,
    storeSidebarPtyIdsByTabId,
  ]);
  // The persisted host-section tier order feeds the row pipeline, so a host drag
  // repaints the sections it just moved (D03a-020).
  const storeWorkspaceHostOrder = useAppStore((s) => s.workspaceHostOrder);
  const storeWorktreesByRepo = useAppStore((s) => s.worktreesByRepo);
  // D03b-010: the review-cache inputs come from ONE shallow selector, so a store tick
  // that did not change these slices keeps its identity and the row memo stays intact.
  const { storeWorktreeCardProperties, storeHostedReviewCache } = useAppStore(
    useShallow((state) => ({
      storeWorktreeCardProperties:
        (state as unknown as { worktreeCardProperties?: WorktreeCardProperty[] })
          .worktreeCardProperties ?? EMPTY_WORKTREE_CARD_PROPERTIES,
      storeHostedReviewCache:
        (state as unknown as { hostedReviewCache?: AppState['hostedReviewCache'] })
          .hostedReviewCache ?? null,
    }))
  );
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

  // Orca `useSidebarHostVisibleScope` → `visibleReposForRows`: the host set narrows the
  // repo tier the list paints. Shared with the Cmd+1–9 order (`visible-worktrees`), so a
  // numbered shortcut never targets a repo the cards hid.
  const visibleReposForRows = useMemo(
    () => filterReposForVisibleHosts(storeRepos as Repo[], visibleHostIdSet, focusedHostId),
    [storeRepos, visibleHostIdSet, focusedHostId]
  );
  // The group tier needs its shared shape before the host filter can read the group's
  // own ownership stamp. Built from the *unfiltered* folder props so a folder-backed
  // group keeps its `parentPath` even when the folder row itself is filtered out.
  const pipelineProjectGroups = useMemo(
    () =>
      projectGroups.map((group) =>
        toPipelineProjectGroup(
          group,
          folderWorkspaces.find((workspace) => workspace.projectGroupId === group.id)?.folderPath
        )
      ),
    [projectGroups, folderWorkspaces]
  );
  const visibleProjectGroupsForRows = useMemo(
    () =>
      filterProjectGroupsForVisibleHosts(pipelineProjectGroups, visibleHostIdSet, focusedHostId),
    [pipelineProjectGroups, visibleHostIdSet, focusedHostId]
  );
  const pipelineFolderWorkspaces = useMemo(
    () => folderWorkspaces.map(toPipelineFolderWorkspace),
    [folderWorkspaces]
  );
  // Orca `useSidebarHostVisibleScope` → `visibleFolderWorkspacesForRows`: host scope
  // first, then the paired-device sweep the worktree rows already run. The agent-send
  // target stays forced visible, in both its raw-id and `folder:` key spellings.
  const visibleFolderWorkspacesForRows = useMemo(() => {
    const hostVisible = filterFolderWorkspacesForVisibleHosts(
      pipelineFolderWorkspaces,
      pipelineProjectGroups,
      visibleHostIdSet,
      focusedHostId
    );
    const deviceVisible =
      pairedDeviceIdsByEnvironment.size > 0
        ? filterFolderWorkspacesFromOtherDevices(hostVisible, pairedDeviceIdsByEnvironment)
        : hostVisible;
    return keepForcedVisibleFolderWorkspaces(
      pipelineFolderWorkspaces,
      deviceVisible,
      agentSendTargetWorktreeId
    );
  }, [
    agentSendTargetWorktreeId,
    focusedHostId,
    pairedDeviceIdsByEnvironment,
    pipelineFolderWorkspaces,
    pipelineProjectGroups,
    visibleHostIdSet,
  ]);

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
    // Orca `useSidebarHostVisibleScope` → `visibleReposForRows`: a project paints only
    // when its repo row survived the host scope. A project without a store repo follows
    // the focused host, the same default the repo filter gives an unstamped repo.
    const repoByProject = new Map(
      (storeRepos as Repo[]).flatMap((repo) => [
        [repo.id, repo] as const,
        [repo.path, repo] as const,
      ])
    );
    const visibleRepoIds = new Set(visibleReposForRows.map((repo) => repo.id));
    const filtered = searched.filter((proj) => {
      if (
        agentSendTargetWorktreeId &&
        getFilteredAndSortedWorktrees(proj).some(
          (worktree) => worktree.id === agentSendTargetWorktreeId
        )
      ) {
        return true;
      }
      const repo = repoByProject.get(proj.id) ?? repoByProject.get(proj.path);
      if (!repo) {
        return visibleHostIdSet ? visibleHostIdSet.has(focusedHostId) : true;
      }
      return visibleRepoIds.has(repo.id);
    });
    // D03a-051: a recompute that kept the same project objects keeps the previous
    // array identity, so memoized sections do not invalidate.
    const stable = reuseArrayIfEqual(visibleProjectsRef.current, filtered);
    visibleProjectsRef.current = stable;
    return stable;
  }, [
    displayProjects,
    query,
    getFilteredAndSortedWorktrees,
    visibleReposForRows,
    visibleHostIdSet,
    storeRepos,
    focusedHostId,
    agentSendTargetWorktreeId,
  ]);

  // Host ownership per repo, shared by the row pipeline and the delete-state
  // resolution below: a card's delete state is keyed by host-qualified identity.
  const hostIdByRepoId = useMemo(() => buildHostIdByRepoId(storeRepos as Repo[]), [storeRepos]);

  /**
   * The durable Manual sequence a reorder interpolates against.
   *
   * Built from every scanned workspace (not the painted slice) plus the folder workspaces, so a
   * drag in a filtered or collapsed list never erases the rank of a row it cannot see, and a
   * folder workspace keeps its place beside the git rows. Hydra persists manual order as the
   * project's array order rather than a per-row rank, so each row's position in that array is
   * handed to the catalog as its `sortOrder`; multi-host clusters still collapse to one id.
   */
  const manualOrderCatalog = useMemo(() => {
    const projectByPath = new Map(projects.map((project) => [project.path, project]));
    const allWorktrees: Worktree[] = [];
    for (const [projectPath, list] of Object.entries(worktreesByProject ?? {})) {
      const project = projectByPath.get(projectPath);
      if (!project) continue;
      list.forEach((worktree, index) => {
        const row = toWorktreeRow(worktree, {
          repoId: project.id,
          hostId: hostIdByRepoId.get(project.id),
        });
        // Descending like Orca's rank: the first painted row has the highest value.
        allWorktrees.push({ ...row, sortOrder: list.length - index });
      });
    }
    return buildWorktreeManualOrderCatalog({
      worktrees: allWorktrees,
      folderWorkspaces: [...pipelineFolderWorkspaces],
    });
  }, [hostIdByRepoId, pipelineFolderWorkspaces, projects, worktreesByProject]);

  // Host-tier pointer drag state lives above the row model: a host drag force-collapses
  // every host section, so the pipeline must read the flag while it builds rows.
  const [hostDragActive, setHostDragActive] = useState(false);

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
    const pipelineRepos = visibleProjects.map((project) =>
      toPipelineRepo({
        project,
        projectGroupId: projectGroupMap?.[project.id] ?? null,
        hostId: hostIdByRepoId.get(project.id),
      })
    );
    const pipelineGroups = visibleProjectGroupsForRows;
    const pipelineFolderWorkspaces = visibleFolderWorkspacesForRows;

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

    // Step 1 — project every candidate row. The array a project contributes is
    // already in the panel's filter + sort epoch order, so the flat id stream
    // below is that same order: the rank index the visible pipeline sorts by and
    // the numbering Cmd+1–9 publishes.
    const projectedByRepo: Record<string, Worktree[]> = {};
    const orderedIds: string[] = [];
    const candidateById = new Map<
      string,
      { project: HydraProject; worktree: GitWorktreeInfo }
    >();
    for (const project of visibleProjects) {
      propProjectById.set(project.id, project);
      const hostId = hostIdByRepoId.get(project.id);
      const projectedForRepo: Worktree[] = [];
      for (const worktree of getFilteredAndSortedWorktrees(project)) {
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
            // The scan projects the Jira link too, so a card keeps its Jira
            // section even before `list_worktree_metadata` hydrates.
            const linkedJiraIssue =
              record?.linked_jira_issue ?? worktree.linked_jira_issue ?? null;
            return record || linkedJiraIssue
              ? {
                  comment: record?.comment ?? "",
                  linkedIssue: record?.linked_issue ?? null,
                  linkedPR: record?.linked_pr ?? null,
                  linkedLinearIssue: record?.linked_linear_issue ?? null,
                  linkedJiraIssue,
                }
              : null;
          })(),
        });
        propWorktreeByPath.set(worktree.path, worktree);
        projectedForRepo.push(projected);
        orderedIds.push(projected.id);
        candidateById.set(projected.id, { project, worktree });
      }
      projectedByRepo[project.id] = projectedForRepo;
    }

    // The app's path lineage is the single writer the row menus and delete use;
    // project it into the rich records the row pipeline validates, so a nest drag
    // and the context menu paint the same tree. Built over the whole candidate
    // universe: the visible pipeline below re-adds an ancestor its filters hid.
    const projectedLineageById: Record<string, WorktreeLineage> = {
      ...storeWorktreeLineageById,
    }
    const candidateWorktreeByPath = new Map<string, Worktree>()
    for (const list of Object.values(projectedByRepo)) {
      for (const worktree of list) {
        candidateWorktreeByPath.set(worktree.path, worktree)
      }
    }
    for (const [childPath, parentPath] of Object.entries(lineageByPath ?? {})) {
      const child = candidateWorktreeByPath.get(childPath)
      const parent = candidateWorktreeByPath.get(parentPath)
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

    const repoMap = new Map(pipelineRepos.map((repo) => [repo.id, repo]))

    // Step 2 — the ONE visible derivation (D03a-047). Device, host-scope,
    // provenance and sleeping filters run there against the live-agent sample
    // taken for this pass, and `agentSendTargetWorktreeId` is force-visible so the
    // send picker can target a workspace a filter would otherwise hide. The row
    // pipeline then paints exactly this order instead of re-deriving candidates.
    const selection = selectVisibleSidebarWorktrees({
      worktreesByRepo: projectedByRepo,
      sortedIds: orderedIds,
      options: {
        // Project membership was already narrowed upstream (search + Show filter),
        // so this only sharpens per-row; kept for parity with the shortcut path.
        filterRepoIds: displayOptions.filterProjectIds ?? [],
        showSleepingWorkspaces: !displayOptions.hideSleeping,
        tabsByWorktree: sidebarActivityInputs.tabsByWorktree,
        ptyIdsByTabId: sidebarActivityInputs.ptyIdsByTabId,
        browserTabsByWorktree: sidebarActivityInputs.browserTabsByWorktree,
        worktreeIdsWithLiveAgent: liveAgentWorktreeIds,
        // Why false for the two branch filters: `getFilteredAndSortedWorktrees`
        // already applied them with the active workspace spared, and re-applying
        // them here would drop the workspace the user is looking at.
        hideDefaultBranchWorkspace: false,
        hideDetachedHeadWorkspaces: false,
        hideAutomationGeneratedWorkspaces: displayOptions.hideAutomationCreated,
        hideCliCreatedWorkspaces: displayOptions.hideCliCreated,
        hideWorkspacesFromOtherDevices: displayOptions.hideWorkspacesFromOtherDevices === true,
        pairedDeviceIdsByEnvironment,
        alwaysShowDefaultBranchWorkspace: displayOptions.alwaysShowDefaultBranch,
        repoMap,
        workspaceHostScope: pipelineHostScope,
        visibleWorkspaceHostIds: pipelineVisibleHostIds,
        defaultHostId: focusedHostId,
        worktreeLineageById: projectedLineageById,
        forcedVisibleWorktreeIds: agentSendTargetWorktreeId
          ? [agentSendTargetWorktreeId]
          : undefined,
      },
    })
    const worktreesByRepo = selection.visibleWorktreesByRepo
    const visibleWorktrees = selection.visibleWorktrees
    // PR/hosted-review candidates read the prop rows the painted cards belong to.
    const candidates = visibleWorktrees.flatMap((worktree) => {
      const candidate = candidateById.get(worktree.id)
      return candidate ? [candidate] : []
    })
    const worktreeById = new Map<string, Worktree>()
    const pathByWorktreeId = new Map<string, string>()
    for (const worktree of visibleWorktrees) {
      worktreeById.set(worktree.id, worktree)
      pathByWorktreeId.set(worktree.id, worktree.path)
    }
    // D11-003: a visible descendant of a pinned ancestor paints as pinned too. The row
    // pipeline already relocates it into the Pinned section; the card needs the same
    // fact, so derive it from the one resolver instead of the path set alone.
    const pinnedSectionIdentities = new Set<string>(
      getPinnedSectionWorktrees(visibleWorktrees, projectedLineageById, worktreeById).map(
        getWorktreeHostIdentity
      )
    )

    // D03a-077: the folder card's synthetic review walks workspace lineage, which the
    // live store never composes; project the lineage above into the workspace-keyed
    // records, so a worktree nested under a folder workspace reaches that card.
    const workspaceLineageByChildKey = getProjectedWorkspaceLineageByChildKey({
      lineageById: projectedLineageById,
      lineageByPath,
      worktreeById,
      folderWorkspaces: pipelineFolderWorkspaces,
    })

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

    // D03b-012 (Orca `useEffectiveCollapsedGroups`): while the agent send picker targets
    // a workspace, every collapsed section that hides it paints open. The persisted set is
    // untouched; the pipeline receives the derived set for this render only.
    const effectiveCollapsedGroups = getEffectiveCollapsedGroups({
      collapsedGroups: pipelineCollapsedKeys(collapsedProjects, collapsedGroups),
      agentSendTargetWorktreeId,
      groupBy: displayOptions.groupBy,
      // Hydra has no "pinned rows in groups" toggle, so the policy resolves to the
      // single-location default; the cast names the one Orca field the helper reads.
      pinnedDisplayPolicy: getPinnedWorktreeDisplayPolicy(
        storeSettings as unknown as { showPinnedWorktreesInGroups?: boolean } | null
      ),
      worktrees: visibleWorktrees,
      worktreeMap: worktreeById,
      worktreeLineageById: projectedLineageById,
      folderWorkspaces: pipelineFolderWorkspaces,
      projectGroups: pipelineGroups,
      repoMap,
      prCache: reviewCaches.prCache ?? null,
      workspaceStatuses: storeWorkspaceStatuses,
      settings: storeSettings,
      pinnedWorktreePaths: pinnedSet,
    });

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
      collapsedGroups: effectiveCollapsedGroups,
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
      // A host-header drag force-collapses every section so the bound is the header itself.
      hostDragActive,
      filterRepoIds: displayOptions.filterProjectIds ?? [],
    };

    // Mixed-host labels: one repo visible on more than one host needs the card
    // chip the same way its notice rows do (Orca `getMixedWorktreeHostContextLabels`).
    const hostContextLabelByIdentity = new Map<string, string>();
    for (const rows of Object.values(worktreesByRepo)) {
      const labels = getMixedWorktreeHostContextLabels(rows, repoMap, hostLabelById, focusedHostId);
      if (!labels) continue;
      for (const [identity, label] of labels) hostContextLabelByIdentity.set(identity, label);
    }

    // Why the raw scan: a repo whose only worktree is hidden by a menu filter is
    // not an empty repo, so it must not keep a header alive over the Clear Filters
    // empty state.
    const placeholderRepoIds = getEmptyProjectPlaceholderRepoIds({
      groupBy: displayOptions.groupBy,
      repos: pipelineRepos,
      worktreesByRepo: storeWorktreesByRepo,
      visibleWorktrees,
      filterRepoIds: displayOptions.filterProjectIds ?? [],
    });

    const rows = computeSidebarRows(
      pipelineState,
      visibleWorktrees,
      buildExternalWorktreeNoticeCandidates({
        repos: pipelineRepos,
        hiddenWorktreesByProjectPath: hiddenWorktreesByProject ?? {},
      }),
      pendingCreationRefs
    );

    return {
      rows,
      renderedSidebarRowKeys: collectRenderedSidebarRowKeys(rows),
      worktrees: visibleWorktrees,
      worktreeById,
      workspaceLineageByChildKey,
      pipelineFolderWorkspaces,
      pinnedDisplayPolicy: getPinnedWorktreeDisplayPolicy(pipelineState.settings),
      hostContextLabelByIdentity,
      propWorktreeByPath,
      propProjectById,
      pathByWorktreeId,
      lineageParentIdByChildId: buildLineageParentIdByChildId(projectedLineageById),
      pinnedSectionIdentities,
      placeholderRepoCount: placeholderRepoIds.size,
    };
  }, [
    visibleProjects,
    visibleProjectGroupsForRows,
    visibleFolderWorkspacesForRows,
    projectGroupMap,
    liveActivity,
    liveAgentWorktreeIds,
    sidebarActivityInputs,
    pinnedSet,
    unreadSet,
    hiddenWorktreesByProject,
    displayOptions.groupBy,
    displayOptions.projectsOrder,
    displayOptions.filterProjectIds,
    displayOptions.alwaysShowDefaultBranch,
    displayOptions.hideWorkspacesFromOtherDevices,
    storeWorkspaceHostOrder,
    displayOptions.hideAutomationCreated,
    displayOptions.hideCliCreated,
    displayOptions.hideSleeping,
    pairedDeviceIdsByEnvironment,
    agentSendTargetWorktreeId,
    getFilteredAndSortedWorktrees,
    prByPath,
    collapsedProjects,
    collapsedGroups,
    hostIdByRepoId,
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
    hostDragActive,
    pendingCreationRefs,
  ]);

  const { rows, hostContextLabelByIdentity, placeholderRepoCount } = rowModel;
  // Why: the painted model folds each visible lineage subtree into one virtual slot
  // (D03a-080); every other consumer (drag groups, reveal keys, selection) keeps the
  // flat row model it always used.
  const renderRows = useMemo(() => buildRenderableRows(rows), [rows]);
  // The menu filters (display options + host scope) reduce the row model before it is
  // painted, so both the reveal path (D03a-052) and the empty-state gate (#15362) read
  // the same "are filters active" answer.
  // Why the shared projection: the badge, the empty-state gate and Clear Filters
  // must agree on what counts as "filtered", so this reads the same mapping the
  // shell's Clear Filters plan uses instead of listing flags locally.
  const sidebarFilterState = useMemo<SidebarFilterState>(
    () =>
      toSidebarFilterState(displayOptions, {
        visibleWorkspaceHostIds: pipelineVisibleHostIds,
        workspaceHostScope: pipelineHostScope,
      }),
    [displayOptions, pipelineVisibleHostIds, pipelineHostScope]
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

  /**
   * One stable handler per lineage group. Collapsing an inline subtree changes the group's
   * own height, so the viewport's scroll anchor is recorded first (Orca's
   * `createLineageToggleHandlerCache`), exactly like a section header toggle.
   */
  const getLineageToggleHandler = useMemo(
    () =>
      createLineageToggleHandlerCache((groupKey) => {
        viewportScrollRef.current?.dispatchEvent(
          new Event(VIRTUALIZED_SCROLL_ANCHOR_RECORD_EVENT)
        );
        onToggleGroupCollapse(groupKey);
      }),
    [onToggleGroupCollapse, viewportScrollRef]
  );

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
    (row: RenderRow) => {
      if (row.type === "lineage-group") return;
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

  // Writes one ordered id stream back through the panel's single reorder writer,
  // bucketed per project (the writer speaks repo + worktrees).
  const applyManualOrderedIds = useCallback(
    (orderedIds: readonly string[]) => {
      if (!onReorderWorktreesInGroup) return;
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
    [dragWorktreeById, getFilteredAndSortedWorktrees, onReorderWorktreesInGroup]
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
        // Why the catalog: the written sequence is every known row, not just the painted
        // slice — a filtered/collapsed workspace and a folder workspace keep their place.
        rankByWorktreeId: manualOrderCatalog.rankByWorktreeId,
        allWorktreeIds: manualOrderCatalog.orderedIds,
      });
      if (!changed) return;
      applyManualOrderedIds(orderedIds);
    },
    [applyManualOrderedIds, manualOrderCatalog]
  );

  // ─── Pointer-drag board drop → the panel's status writer ───────────────────
  //
  // The drag speaks Orca row ids; the app's writer speaks workspace paths. This is the
  // ONE bridge for a card dropped on an open board, and it commits through the same
  // `onAssignWorktreeStatus` the context menu and the board's own card drop use.
  const handleAssignWorktreesStatus = useCallback(
    (
      worktreeIds: readonly string[],
      status: string,
      executionHostId?: ExecutionHostId,
      dropIndex?: number
    ) => {
      const entries = resolveDragWorktreeEntries(worktreeIds, executionHostId);
      for (const entry of entries) {
        void onAssignWorktreeStatus(entry.worktree.path, status);
      }
      if (dropIndex === undefined) return;
      // Why the board's own groups: the sidebar list's rows are grouped by section,
      // while the slot came from a lane. Manual order must be computed against the
      // lane order the user dropped into.
      const groups = getWorkspaceBoardSidebarDropGroups();
      if (groups.length === 0) return;
      if (
        !shouldWriteManualOrderForGroupDrop({
          sortBy: displayOptions.sortBy,
          sourceGroupKeys: entries.map(
            (entry) => entry.worktree.status ?? DEFAULT_WORKSPACE_STATUS_ID
          ),
          targetGroupKey: status,
        })
      ) {
        return;
      }
      const { changed, orderedIds } = buildManualOrderUpdatesForGroupDrop({
        groups,
        targetGroupKey: status,
        draggedIds: worktreeIds,
        dropIndex,
        now: Date.now(),
        rankByWorktreeId: manualOrderCatalog.rankByWorktreeId,
        allWorktreeIds: manualOrderCatalog.orderedIds,
      });
      if (!changed) return;
      onSwitchToManualSort?.();
      applyManualOrderedIds(orderedIds);
    },
    [
      applyManualOrderedIds,
      displayOptions.sortBy,
      manualOrderCatalog,
      onAssignWorktreeStatus,
      onSwitchToManualSort,
      resolveDragWorktreeEntries,
    ]
  );

  // ─── Pointer-drag pin-strip drop → the panel's pin writer ──────────────────
  //
  // The same id→path bridge, for the board's pin strip: the drag speaks row ids, the app's
  // pin writer speaks workspace paths. One writer for both the strip and the row menu.
  // D06-019: a release on a status lane assigns the status and, only when the panel
  // sorts manually, commits the drop slot through the same manual-order writer.
  const handleStatusLaneDrop = useCallback(
    (args: {
      status: string;
      draggedIds: readonly string[];
      dropIndex: number | null;
      sourceGroupKey?: string;
      executionHostId?: ExecutionHostId;
    }) => {
      for (const entry of resolveDragWorktreeEntries(args.draggedIds, args.executionHostId)) {
        void onAssignWorktreeStatus(entry.worktree.path, args.status);
      }
      const targetGroupKey = getWorkspaceStatusGroupKey(args.status);
      if (
        !shouldWriteManualOrderForGroupDrop({
          sortBy: displayOptions.sortBy,
          sourceGroupKeys: args.sourceGroupKey ? [args.sourceGroupKey] : [],
          targetGroupKey,
        })
      ) {
        return;
      }
      const groups = getWorktreeDragGroups(rows);
      const targetGroup = groups.find((group) => group.key === targetGroupKey);
      if (!targetGroup) return;
      const { changed, orderedIds } = buildManualOrderUpdatesForGroupDrop({
        groups,
        targetGroupKey,
        draggedIds: args.draggedIds,
        dropIndex: args.dropIndex ?? targetGroup.worktreeIds.length,
        now: Date.now(),
        rankByWorktreeId: manualOrderCatalog.rankByWorktreeId,
        allWorktreeIds: manualOrderCatalog.orderedIds,
      });
      if (changed) applyManualOrderedIds(orderedIds);
    },
    [
      applyManualOrderedIds,
      displayOptions.sortBy,
      manualOrderCatalog,
      onAssignWorktreeStatus,
      resolveDragWorktreeEntries,
      rows,
    ]
  );

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
    (
      row: WorktreeRow,
      slot: WorktreeVirtualRowSlot,
      options?: {
        /** The descendants the card hosts inside its own body (D03a-080). */
        lineageChildren?: React.ReactNode;
        /** A parent whose subtree holds the active workspace still reads as active. */
        forceActiveSurface?: boolean;
      }
    ): React.JSX.Element | null => {
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
      const { surfaceInset, cardContentIndent, lineageChildrenInlineOffset } =
        getWorktreeItemRowGeometry({
          row,
          groupBy: displayOptions.groupBy,
          experimentalNewWorktreeCardStyle:
            storeSettings?.experimentalNewWorktreeCardStyle === true,
          isFolderBackedRepoChild,
        });
      const identity = getWorktreeHostIdentity(row.worktree);
      const lineageChildrenStyle = options?.lineageChildren
        ? getLineageChildrenInlineStyle(lineageChildrenInlineOffset)
        : undefined;
      const isMultiSelected = selectedWorktreeIdentities.has(identity);
      const lineageGroupKey = row.lineageGroupKey;

      return (
        <WorktreeDragRow
          key={row.rowKey}
          rowKey={row.rowKey}
          worktreeId={row.worktree.id || row.worktree.path}
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
            // D04b-008: one derivation for the card dot — live PTYs/pane titles and
            // explicit agent rows first, Hydra's session reading for what those
            // records cannot express.
            status={selectWorktreeActivityStatus(activityState, wt.path, {
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
              lineageGroupKey ? getLineageToggleHandler(lineageGroupKey) : undefined
            }
            contentIndent={cardContentIndent}
            flushSurface
            isActive={activeWorktreePath === wt.path}
            // Why: a nested child keeps the group card looking active (Orca's
            // `forceActiveSurface`) without claiming the current-workspace chrome.
            isActiveSurface={options?.forceActiveSurface === true || activeWorktreePath === wt.path}
            activeSurfaceVariant={
              options?.forceActiveSurface === true
                ? "primary"
                : resolveActiveSurfaceVariant(row.rowKey, primaryActiveRowKey)
            }
            isCurrentWorktree={activeWorktreePath === wt.path}
            isFocused={isFocused}
            revealHighlight={isRevealed}
            revealHighlightTone={
              agentSendTargetWorktreeId === row.worktree.id ? "ai" : "default"
            }
            lineageChildren={options?.lineageChildren}
            lineageChildrenStyle={lineageChildrenStyle}
            isPinned={pinnedSet.has(wt.path) || rowModel.pinnedSectionIdentities.has(identity)}
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
              linkedJiraIssue:
                row.worktree.linkedJiraIssue ?? wt.linked_jira_issue ?? null,
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
      activityState,
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
      agentSendTargetWorktreeId,
      getLineageToggleHandler,
    ]
  );

  /**
   * One folded lineage subtree: the parent card paints its descendants inline, all inside
   * the single virtual slot the group owns. The recursion builds grandchildren under their
   * own parent card, so `depth` never double-counts against the inline offset.
   */
  const renderLineageGroup = useCallback(
    (group: LineageGroupRow, slot: WorktreeVirtualRowSlot): React.ReactNode => {
      const [parent, ...descendants] = group.rows;
      if (!parent) return null;
      const childIsActive = group.rows.some(
        (row) => row.worktree.path === activeWorktreePath
      );
      const lineageChildren = renderWorktreeLineageDescendants(
        descendants,
        parent.depth,
        (child, childLineageChildren) =>
          renderWorktreeRow(
            child,
            {
              toggleCollapse: slot.toggleCollapse,
              optionId: getWorktreeOptionId(child.rowKey),
              isActive: child.rowKey === activeRowKey,
            },
            { lineageChildren: childLineageChildren }
          )
      );
      return renderWorktreeRow(parent, slot, {
        lineageChildren: lineageChildren ?? undefined,
        forceActiveSurface: childIsActive,
      });
    },
    [activeRowKey, activeWorktreePath, renderWorktreeRow]
  );

  // ─── Header-tier pointer drag (D03b-025…037) ─────────────────────────────
  //
  // Three tiers reorder by pointer session: a 4px threshold, pointer capture, edge
  // autoscroll, Escape/blur cancel, click suppression after a promoted drop, and (host
  // tier) a floating clone of the pressed header. Each tier commits its own writer:
  // a group rank/tabOrder, the logical repo order, or the host-section order.
  const projectGroupByIdForDrag = useMemo(() => {
    const byId = new Map<string, SharedProjectGroup>();
    for (const group of projectGroups) {
      byId.set(group.id, group as SharedProjectGroup);
    }
    return byId;
  }, [projectGroups]);
  const repoByIdForDrag = useMemo(
    () => new Map((storeRepos as Repo[]).map((repo) => [repo.id, repo])),
    [storeRepos]
  );
  const orderedRepoIdsForDrag = useMemo(
    () => projects.map((project) => project.id),
    [projects]
  );
  // Why the header-only slice: the tier hooks key buckets off header rows; host cards are
  // a different tier and would only be filtered out again inside each helper.
  const headerRowModel = useMemo(
    () => rows.filter((row) => row.type !== "host-header") as unknown as Row[],
    [rows]
  );
  const repoHeaderDragMetaByRowKey = useMemo(() => {
    const counters = new Map<string, number>();
    const meta = new Map<string, { bucket: string; index: number }>();
    for (const row of rows) {
      if (row.type !== "header" || !row.repo) continue;
      const bucket = getProjectHeaderDragBucketKey(row.repo);
      const index = counters.get(bucket) ?? 0;
      counters.set(bucket, index + 1);
      meta.set(row.key, { bucket, index });
    }
    return meta;
  }, [rows]);
  const groupHeaderDragMetaByRowKey = useMemo(() => {
    const counters = new Map<string, number>();
    const meta = new Map<string, { bucket: string; index: number }>();
    for (const row of rows) {
      if (row.type !== "header") continue;
      const group = row.projectGroup;
      if (!group || typeof group.id !== "string") continue;
      const bucket = getProjectGroupHeaderDragBucketKey(
        group as SharedProjectGroup,
        projectGroupByIdForDrag
      );
      const index = counters.get(bucket) ?? 0;
      counters.set(bucket, index + 1);
      meta.set(row.key, { bucket, index });
    }
    return meta;
  }, [projectGroupByIdForDrag, rows]);

  const repoHeaderDrag = useRepoHeaderPointerDrag({
    rows: headerRowModel,
    repoById: repoByIdForDrag,
    orderedRepoIds: orderedRepoIdsForDrag,
    usesProjectGroupOrdering: displayOptions.groupBy === "repo",
    onCommitRepoOrder: (orderedIds) => onReorderRepoHeaders?.(orderedIds),
    onCommitProjectGroupOrder: (_repoId, projectGroupId, order) => {
      // The group writer speaks the bucket group id; the repo inside it is implicit.
      if (projectGroupId) onUpdateProjectGroup?.(projectGroupId, { tabOrder: order });
    },
    scrollRef: viewportScrollRef,
  });
  const groupHeaderDrag = useProjectGroupHeaderPointerDrag({
    rows: headerRowModel,
    projectGroupById: projectGroupByIdForDrag,
    onCommitProjectGroupTabOrder: (groupId, tabOrder) =>
      onUpdateProjectGroup?.(groupId, { tabOrder }),
    scrollRef: viewportScrollRef,
  });
  const hostHeaderDrag = useHostHeaderPointerDrag({
    orderedHostIds: useMemo(
      () => rows.filter((row) => row.type === "host-header").map((row) => row.hostId),
      [rows]
    ),
    onCommit: (orderedIds) => onReorderHostSections?.(orderedIds),
    onHostDragActiveChange: setHostDragActive,
    scrollRef: viewportScrollRef,
  });

  const renderRepoHeader = useCallback(
    (row: GroupHeaderRow, slot: WorktreeVirtualRowSlot): React.JSX.Element | null => {
      const proj = row.repo ? rowModel.propProjectById.get(row.repo.id) : undefined;
      if (!proj) return null;
      // The catalog row carries the fork identity and scan verdict; the sidebar's
      // project props do not (Orca `RepoForkIndicator` / `RepoScanUnavailableIndicator`).
      const storeRepo = storeRepos.find(
        (repo) => repo.id === proj.id || repo.path === proj.path
      );
      // Pointer session (D03b-025…029): pressing the icon/title column arms a reorder;
      // actions inside the header stay clickable and never arm.
      const dragMeta = repoHeaderDragMetaByRowKey.get(row.key);
      const isDragging = repoHeaderDrag.state.draggingRepoId === proj.id;
      const isDropTarget =
        dragMeta !== undefined &&
        repoHeaderDrag.state.draggingRepoId !== null &&
        repoHeaderDrag.state.dropIndex === dragMeta.index &&
        repoHeaderDrag.state.draggingRepoId !== proj.id;
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
          isDragged={isDragging}
          dragBucket={dragMeta?.bucket}
          dragIndex={dragMeta?.index}
          onHeaderPointerDown={(event) =>
            repoHeaderDrag.onHandlePointerDown(event, proj.id)
          }
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
      storeRepos,
      scanFailuresByProject,
      repoHeaderDrag,
      repoHeaderDragMetaByRowKey,
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
      // Create gates read the non-expired answer: a negative the cache is about to
      // re-probe must not keep the group's "+" disabled (Orca
      // `getFreshFolderWorkspacePathStatus`). Without the reader, keep the last
      // known answer so older shells behave as before.
      const groupGateStatus: FolderWorkspacePathStatus | null | undefined = groupFolderPath
        ? getFreshFolderPathStatus
          ? getFreshFolderPathStatus(groupFolderPath)
          : (groupPathStatus ??
            (missingPaths.has(groupFolderPath)
              ? { path: groupFolderPath, exists: false, reason: "missing" }
              : undefined))
        : undefined;
      const createWorkspaceDisabledReason =
        groupFolderPath && isFolderWorkspaceCreateDisabled(groupGateStatus)
          ? (getFolderWorkspaceCreateDisabledReason(groupGateStatus) ??
            `Folder not found: ${groupFolderPath}`)
          : undefined;
      const dragMeta = groupHeaderDragMetaByRowKey.get(row.key);
      const isDragging = groupHeaderDrag.state.draggingGroupId === group.id;
      const isDropTarget =
        dragMeta !== undefined &&
        groupHeaderDrag.state.draggingGroupId !== null &&
        groupHeaderDrag.state.dropIndex === dragMeta.index &&
        groupHeaderDrag.state.draggingGroupId !== group.id;
      return (
        // The shared header is the pointer target; no HTML5 wrapper (Orca parity).
        <div key={row.key} data-header-drag-active={isDragging ? "" : undefined}>
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
            isDropTarget={isDropTarget}
            sectionEnd={headerSectionBounds.projectGroupSectionEndByGroupId.get(group.id as string)}
            badgeColor={groupBadgeColorById.get(group.id as string)}
            createWorkspaceDisabledReason={createWorkspaceDisabledReason}
            folderPathStatus={groupPathStatus ?? null}
            dragBucket={dragMeta?.bucket}
            dragIndex={dragMeta?.index}
            onHeaderPointerDown={(event) =>
              groupHeaderDrag.onHandlePointerDown(event, group.id as string)
            }
          />
        </div>
      );
    },
    [
      isCollapsedKey,
      headerSectionBounds,
      groupBadgeColorById,
      onGroupContextMenu,
      groupHeaderDrag,
      groupHeaderDragMetaByRowKey,
      folderWorkspaces,
      missingPaths,
      folderPathStatusByPath,
      getFreshFolderPathStatus,
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
        workspaceLineageByChildKey: rowModel.workspaceLineageByChildKey,
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
          workspaceId={row.folderWorkspace.id}
          hostIdentity={composeWorktreeHostIdentity(
            row.folderWorkspace.executionHostId ?? undefined,
            row.folderWorkspace.id
          )}
          status={workspaceStatusFrom({
            sessions: folderSessions,
            hasLiveTerminal: livePaths.has(folderPath),
            agentSummary: selectWorktreeAgentActivitySummary(agentActivityState, folderPath),
          })}
          pathMissing={missingPaths.has(folderPath)}
          pathStatus={folderPathStatusByPath?.get(folderPath)}
          activationPathStatus={
            getFreshFolderPathStatus ? getFreshFolderPathStatus(folderPath) : undefined
          }
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
          onContextMenu={
            onFolderWorkspaceContextMenu
              ? (event) =>
                  onFolderWorkspaceContextMenu(event, {
                    id: row.folderWorkspace.id,
                    name: row.folderWorkspace.name,
                    folderPath,
                  })
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
      rowModel.workspaceLineageByChildKey,
      prByPath,
      folderPathStatusByPath,
      getFreshFolderPathStatus,
      onActivateFolderWorkspace,
      onDeleteFolderWorkspace,
      onFolderWorkspaceContextMenu,
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

  // The host tier's pointer session swallows the click that follows a promoted drop
  // (Orca `swallowNextClickOnDragHandle`), so the collapse handler stays a plain toggle.
  const toggleHostCollapse = useCallback(
    (hostId: ExecutionHostId) => {
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
    (row: RenderRow, slot: WorktreeVirtualRowSlot): React.ReactNode => {
      switch (row.type) {
        case "host-header": {
          return (
            <HostSectionHeader
              key={row.key}
              row={row}
              isCollapsed={collapsedGroups.has(row.key)}
              onToggleCollapse={() => toggleHostCollapse(row.hostId)}
              isDragged={hostHeaderDrag.state.draggingHostId === row.hostId}
              isDropTarget={hostHeaderDrag.isDropTarget(row.hostId)}
              onHeaderPointerDown={(event) =>
                hostHeaderDrag.onHandlePointerDown(event, row.hostId)
              }
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
              onAssignStatusDrop={(worktreeIds, status, dropIndex) =>
                handleStatusLaneDrop({
                  status,
                  draggedIds: worktreeIds,
                  dropIndex,
                  sourceGroupKey: `workspace-status:${status}`,
                })
              }
              onPinDrop={handlePinWorktrees}
            />
          );
        }
        case "item":
          return renderWorktreeRow(row, slot);
        case "lineage-group":
          return renderLineageGroup(row, slot);
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
              repoName={row.repo?.displayName}
            />
          );
      }
    },
    [
      collapsedGroups,
      hostHeaderDrag,
      isCollapsedKey,
      renderRepoHeader,
      renderGroupHeader,
      renderWorktreeRow,
      renderLineageGroup,
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
    // Empty repos and filtered project-group members still paint a section, so a
    // filter is not what hid every row (Orca `placeholderRepoIds`).
    placeholderRepoCount,
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
      onStatusLaneDrop={handleStatusLaneDrop}
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
        rows={renderRows}
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
            {repoHeaderDrag.state.dropIndicatorY !== null ? (
              <WorktreeSidebarDropIndicator y={repoHeaderDrag.state.dropIndicatorY} />
            ) : null}
            {groupHeaderDrag.state.dropIndicatorY !== null ? (
              <WorktreeSidebarDropIndicator y={groupHeaderDrag.state.dropIndicatorY} />
            ) : null}
            {/* The host tier is the outer card; its line floats above the sticky stack. */}
            {hostHeaderDrag.state.dropIndicatorY !== null ? (
              <div className="pointer-events-none absolute inset-0 z-40">
                <WorktreeSidebarDropIndicator y={hostHeaderDrag.state.dropIndicatorY} />
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
