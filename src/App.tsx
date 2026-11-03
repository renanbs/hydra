import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open as openFileDialog } from "@tauri-apps/plugin-dialog";
import { usePanelResize } from "./hooks/usePanelResize";
import { useSidebarResize, clampSidebarResizeWidth } from "./hooks/useSidebarResize";
import { TerminalDrawer, type TerminalContextActions } from "./components/TerminalDrawer";
import { Landing } from "./components/Landing";
import { WindowTitlebar } from "./components/WindowTitlebar";
import { CodeDiffViewer } from "./components/CodeDiffViewer";
import { FileEditor } from "./components/workbench/FileEditor";
import { 
  WorktreeSidebar, 
  type WorktreeSession, 
  type AvailableAgent, 
  type GitRepoStatus, 
  type HydraProject,
  type GitWorktreeInfo,
  type SidebarPrefsSnapshot,
  type SidebarShellPrefs
} from "./components/sidebar/WorktreeSidebar";
import {
  SidebarChrome,
  LEFT_SIDEBAR_DEFAULT_WIDTH,
  LEFT_SIDEBAR_MAX_WIDTH,
  LEFT_SIDEBAR_MIN_WIDTH,
} from "./components/sidebar/SidebarChrome";
import type { WorkspaceDisplayOptions } from "./components/sidebar/WorkspaceOptionsMenu";
import { useFolderWorkspacePathStatuses } from "./hooks/use-folder-workspace-path-statuses";
import { useWorktreeLineage } from "./hooks/useWorktreeLineage";
import { requestProjectsRefresh } from "./lib/refresh-projects-awaitable";
import {
  buildSshConnectingState,
  buildSshReconnectConnectionState,
  sshReconnectFailureMessage,
} from "./components/sidebar/ssh-reconnect-state";
import type { SshForgetWorkspaceResult, SshReconnectResult } from "./shared/ssh-types";
import {
  createWorktreeFlagApplier,
  reconcileProjectFlagSet,
  reconcileWorktreeFlagSet,
  type ProjectFlagTarget,
} from "./components/sidebar/worktree-flags";
import { AddRepoDialog } from "./components/sidebar/AddRepoDialog";
import { WorkbenchTabBar, type TabItem, type SplitPane, RUNNING_CLOSE_PROBE_TIMEOUT_MS, SHELL_EXECUTABLES, TAB_COLORS } from "./components/workbench/WorkbenchTabBar";
import {
  RunningTerminalCloseDialog,
  type RunningTerminalCloseConfirmRequest,
  type CloseTerminalDialogCopyKind,
} from "./components/RunningTerminalCloseDialog";
import { isShellProcess } from "./components/workbench/tab-agent";
import { hydrateWorkspaceHostScopePreference, hydrateUiStatePreferences, useAppStore } from "./store";
import { hydrateSshTargets } from "./store/ssh-bridge";
import { buildWorktreeStatusMenuItems } from "./components/sidebar/worktree-status-menu-items";
import {
  applyWorktreeStatus,
  applyWorktreeStatusByProject,
  persistWorktreeStatusBatch,
} from "./lib/worktree-status-persistence";
import { cloneDefaultWorkspaceStatuses } from "./shared/workspace-statuses";
import { keybindingMatchesAction } from "./shared/keybindings";
import { getShortcutPlatform } from "./lib/shortcut-platform";
import { SplitTerminalGrid } from "./components/workbench/SplitTerminalGrid";
import { PairingModal } from "./components/PairingModal";
import { SettingsModal, type HydraNavId } from "./components/SettingsModal";
import type { HydraSettings } from "./shared/settings-types";
import { DEFAULT_HYDRA_SETTINGS, normalizeHydraSettings, DEFAULT_OPEN_IN_APPLICATIONS } from "./shared/settings-types";
import { applyDocumentTheme } from "./lib/document-theme";
import {
  isDiscoveredFolderChild,
  loadBundledOrcaRepoIcons,
  repoIconForPath,
} from "./lib/orca-repo-icons";
import type { CatalogEnvelope } from "./lib/catalog-types";
import { catalogToSidebarModel } from "./lib/catalog-bridge";
import {
  applyProjectIconEvent,
  PROJECT_ICON_OPTIMISTIC_EVENT,
} from "./lib/repo-icon-write";
import {
  EMPTY_PROJECT_GROUP_HOST_STATE,
  collectKnownProjectGroupHostIds,
  createProjectGroupInHost,
  deleteProjectGroupInHost,
  flattenProjectGroupHostState,
  hasProjectGroupHostData,
  mergeProjectGroupCatalogIntoHostState,
  moveProjectToGroupInHost,
  readProjectGroupHostState,
  removeContainedProjectsForGroup,
  removeProjectFromGroupInHost,
  renameProjectGroupInHost,
  resolveProjectGroupHost,
  sanitizeLegacyProjectGroupMap,
  sanitizeLegacyProjectGroups,
  sanitizeProjectGroupMapByHost,
  sanitizeProjectGroupsByHost,
  serializeProjectGroupHostState,
  updateProjectGroupOrderInHost,
  type ProjectGroupHostState,
  type ProjectGroupPrefEntry,
} from "./lib/project-group-host-state";
import type { PrDisplay } from "./components/sidebar/pr-display";
import { StatusBar } from "./components/status-bar/StatusBar";
import { TooltipProvider } from "./components/ui/tooltip";
import { CommandPalette } from "./components/CommandPalette";
import { WorktreeJumpPalette } from "./components/WorktreeJumpPalette";
import { RecentTabSwitcher } from "./components/workbench/RecentTabSwitcher";
import { buildTerminalQuickCommandItems } from "./components/workbench/TerminalQuickCommandsSubmenu";
import { resolveLeftSidebarStyleVariables } from "./lib/left-sidebar-appearance";
import { GLOBAL_WORKTREE_VISIBILITY_SETTINGS_TARGET_ID } from "./lib/settings-navigation-types";
import { applyWorkspaceSidebarLiveWidth } from "./lib/sidebar-live-width";
import {
  orderItemsByProjectOrder,
  persistProjectOrderPreference,
  readProjectOrderPreference,
} from "./lib/project-order-preference";
import {
  findWorktreeForShortcutIndex,
  isWorktreeIndexJumpBlockedByTextEntry,
  worktreeShortcutIndexFromKey,
} from "./lib/visible-worktree-index-jump";
import { getVisibleWorktreeShortcutTargets } from "./components/sidebar/visible-worktrees";
import { CustomContextMenu, type ContextMenuItem } from "./components/CustomContextMenu";
import { RadixContextMenu } from "./components/RadixContextMenu";
import { NewWorkspaceComposer } from "./components/NewWorkspaceComposer";
import { PendingWorktreeCreationPanel } from "./components/worktree-creation/PendingWorktreeCreationPanel";
import { DeleteWorktreeDialog, type DeleteWorktreeDialogState, type WorktreeDeleteLiveTarget } from "./components/DeleteWorktreeDialog";
import { pruneClosedDeleteStates } from "./components/sidebar/worktree-delete-state-prune";
import { useDeleteWorktreeStatusHydration } from "./components/sidebar/use-delete-worktree-status-hydration";
import { installOrcaApiShim } from "./lib/orca-api-shim";
import { selectDeletableWorktrees } from "./components/sidebar/worktree-delete-selection";
import type { WorktreeDeleteIdentity } from "./components/sidebar/worktree-delete-request";
import { describeWorktreeDeleteFailure } from "./components/sidebar/worktree-delete-failure";
import { WorktreeMetaDialog } from "./components/sidebar/WorktreeMetaDialog";
import {
  buildHydraSleepActivityMaps,
  getSleepableWorktrees,
  getWorkspaceSleepLineage,
  getWorkspaceSleepMenuState,
} from "./components/sidebar/workspace-sleep-eligibility";
import { runSleepWorktrees, scheduleSleepWorktreesAfterMenuClose } from "./components/sidebar/sleep-worktree-flow";
import {
  hydrateWorktreeSleepStates,
  installWorktreeSleepStatePersistence,
  serializeWorktreeSleepIntentPayload,
} from "./lib/worktree-sleep-state-persistence";
import { destroyWorkspaceWebviews } from "./store/slices/browser-webview-cleanup";
import { forgetWorktreeSleepIntent } from "./lib/worktree-sleep-intent";
import { wakeEphemeralVmForSleptWorktree } from "./lib/sidebar-worktree-activation";
import {
  CLOSE_ALL_CONTEXT_MENUS_EVENT,
  getWorktreeParentPickerAnchor,
  getWorktreeParentPickerLabel,
  isContextWorktreeDeletable,
  isWorktreeParentPickerDisabled,
  PARENT_PICKER_EXIT_ANIMATION_MS,
  preserveDeleteSiblingPosition,
  shouldUseNativeContextMenu,
  shouldRevealWorktreeDeveloperMenu,
} from "./components/sidebar/worktree-context-menu-policy";
import {
  createWorktreeContextMenuDeleteIntent,
  dedupeDeleteIntentTargets,
  deferWorktreeContextMenuDeleteIntent,
} from "./components/sidebar/worktree-context-menu-delete-intent";
import {
  deleteHoveredWorkspaceImmediately,
  type HoveredWorkspaceDeleteDependencies,
} from "./components/sidebar/hovered-workspace-delete";
import {
  composeWorktreeHostIdentity,
  getWorktreeHostIdentity,
} from "./shared/worktree/host-qualified-identity";
import {
  showDeleteWorktreeFailureToast,
  showNoDeletableWorkspacesToast,
  showPreservedBranchBatchToast,
  showSkipDeleteConfirmToast,
  showWorkspaceListChangedToast,
} from "./components/sidebar/worktree-delete-toasts";
import {
  getDeleteWorktreeDirtyChangeCounts,
} from "./components/sidebar/delete-worktree-dirty-change-counts";
import { prepareActiveWorktreeFocusAfterDelete } from "./components/sidebar/active-worktree-focus-after-delete";
import { resolveSshWorkspaceForget, type SshWorkspaceForgetResolution } from "./components/sidebar/ssh-workspace-forget-resolution";
import { ConfirmRemoveFolderDialog } from "./components/sidebar/ConfirmRemoveFolderDialog";
import { ForgetSshWorkspaceDialog } from "./components/sidebar/ForgetSshWorkspaceDialog";
import { getWorkspaceDeleteLineage } from "./components/sidebar/workspace-delete-lineage";
import { runWorktreeDeletesInParallel, type ParallelDeleteTarget } from "./components/sidebar/worktree-delete-parallel";
import { SIDEBAR_REVEAL_REQUEST_EVENT } from "./components/sidebar/use-worktree-reveal-body-redirect";
import { requestVirtualizedScrollAnchorRecord } from "./hooks/requestVirtualizedScrollAnchorRecord";
import type {
  WorktreeMetadataByPath,
  WorktreeMetadataDraft,
  WorktreeMetadataRecord,
} from "./components/sidebar/worktree-metadata-types";
import { getDeleteStateKeyForWorktreeHost } from "./components/sidebar/worktree-delete-state-host-match";
import type { WorktreeDeleteState } from "./store/slices/worktree-delete-state-types";
import type { ExecutionHostId } from "./shared/execution-host";
import {
  getRepoExecutionHostId,
  normalizeExecutionHostScope,
  normalizeVisibleExecutionHostIds,
} from "./shared/execution-host";
import type { Repo } from "./shared/repo-types";
import { Toaster, toast } from "sonner";
import { PromptDialog, type PromptDialogProps } from "./components/PromptDialog";
import { WorktreeParentPickerPopover } from "./components/sidebar/WorktreeParentPickerPopover";
import { selectWorktreeParent } from "./components/sidebar/worktree-parent-picker-actions";
import type { WorktreeParentPickerAnchorRect } from "./components/sidebar/worktree-parent-picker-placement";
import { buildWorktreeParentPickerCandidates } from "./components/sidebar/worktree-parent-picker-candidates";
import {
  getEligibleWorktreeParents,
  type WorktreeParentPickerCandidate,
} from "./components/sidebar/worktree-parent-eligibility";
import { 
  Copy,
  ClipboardPaste,
  Eraser,
  SplitSquareVertical,
  Trash2,
  GitBranch,
  Pencil,
  X,
  ListX,
  PanelRightClose,
  PanelBottomClose,
  PanelLeftClose,
  TextSelect,
  Pin,
  PinOff,
  Palette,
  Bell,
  BellOff,
  FolderInput,
  FolderPlus,
  FolderTree,
  Workflow,
  Unlink,
  Moon,
  ExternalLink,
  FolderOpen,
  Sliders,
  MoreHorizontal,
  Hash,
  Terminal,
} from "lucide-react";
import { RightSidebar } from "./components/right-sidebar/RightSidebar";
import "./App.css";

interface DbSessionRecord {
  id: string;
  project_path: string;
  title: string;
  branch: string;
  agent_name: string;
  executable: string;
  created_at: number;
  updated_at: number;
}

interface UiLayoutState {
  left_sidebar_open: boolean;
  right_sidebar_open: boolean;
  left_sidebar_width: number;
  right_sidebar_width: number;
}

interface WorkbenchState {
  tabs_json: string;
  active_tab_id: string;
  updated_at: number;
}

// ─── PR-14: sidebar prefs migradas de localStorage → SQLite ──────────────────
// Blob merged único sob a key "ui.sidebar" da tabela sidebar_prefs. O App detém
// pinned/unread/groups; o SidebarShell detém body/collapsed/displayOptions/agents
// e reporta mudanças via onSidebarPrefsChange (o App faz merge + save debounced
// 250ms via timeoutRef). No boot o App hidrata do SQLite; na primeira execução
// pós-upgrade migra as chaves legadas (merge legacy-abaixo-do-stored, removeItem
// das 8 chaves) marcada por hydra:sidebar_prefs_migrated para rodar uma vez só.
const SIDEBAR_PREFS_KEY = "ui.sidebar";
const SIDEBAR_PREFS_MIGRATED_KEY = "hydra:sidebar_prefs_migrated";
const LEGACY_SIDEBAR_PREF_KEYS = [
  "hydra:pinned_projects",
  "hydra:unread_projects",
  "hydra:pinned_worktrees",
  "hydra:unread_worktrees",
  "hydra:project_groups",
  "hydra:project_group_map",
  "hydra:collapsed_groups",
  "hydra:display_options",
] as const;

function asStringArrayPref(value: unknown): string[] | undefined {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : undefined;
}

function asStringRecordPref(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value)) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

function asProjectGroupsPref(value: unknown): ProjectGroupPrefEntry[] | undefined {
  return sanitizeLegacyProjectGroups(value);
}

function normalizeDisplayOptionsPref(value: unknown): WorkspaceDisplayOptions | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  // Boundary: object-ness já guardada acima; cada campo é validado antes do uso e o
  // resultado é um objeto fresco (nunca o blob mutado). filterProjectIds preenche
  // ausente/malformado com [] — mesma guarda do reader antigo do Shell.
  const src = value as Record<keyof WorkspaceDisplayOptions, unknown>;
  const { groupBy, sortBy, hideSleeping, hideDefaultBranch, hideAutomationCreated, hideCliCreated, hideDetachedHead, alwaysShowDefaultBranch, projectsOrder, hideWorkspacesFromOtherDevices } = src;
  if (
    groupBy !== "none" &&
    groupBy !== "workspace-status" &&
    groupBy !== "pr-status" &&
    groupBy !== "repo"
  ) {
    return undefined;
  }
  // Every mode the menu can write must survive the reload, or picking PR grouping /
  // Project / Manual sort silently falls back to the default after a restart.

  if (
    sortBy !== "agent-activity" &&
    sortBy !== "smart" &&
    sortBy !== "name" &&
    sortBy !== "recent" &&
    sortBy !== "project" &&
    sortBy !== "manual"
  ) {
    return undefined;
  }
  if (
    typeof hideSleeping !== "boolean" || typeof hideDefaultBranch !== "boolean" ||
    typeof hideAutomationCreated !== "boolean" || typeof hideCliCreated !== "boolean" ||
    typeof hideDetachedHead !== "boolean" ||
    (alwaysShowDefaultBranch !== undefined && typeof alwaysShowDefaultBranch !== "boolean") ||
    (hideWorkspacesFromOtherDevices !== undefined && typeof hideWorkspacesFromOtherDevices !== "boolean")
  ) {
    return undefined;
  }
  // Malformed/absent project order degrades to Manual, the persisted default.
  if (projectsOrder !== undefined && projectsOrder !== "manual" && projectsOrder !== "recent") {
    return undefined;
  }
  return {
    groupBy,
    sortBy,
    projectsOrder: projectsOrder === "recent" ? "recent" : "manual",
    hideSleeping,
    hideDefaultBranch,
    hideAutomationCreated,
    hideCliCreated,
    hideDetachedHead,
    alwaysShowDefaultBranch: alwaysShowDefaultBranch === true,
    hideWorkspacesFromOtherDevices: hideWorkspacesFromOtherDevices === true,
    filterProjectIds: asStringArrayPref(src.filterProjectIds) ?? [],
  };
}

/** Valida/normaliza um blob cru (SQLite ou legacy localStorage) campo a campo. */
function sanitizeSidebarPrefsSnapshot(input: unknown): SidebarPrefsSnapshot {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  // Boundary: cada campo é revalidado por guarda antes de entrar no snapshot.
  const src = input as Record<string, unknown>;
  const out: SidebarPrefsSnapshot = {};
  if (src.sidebarBody === "workspaces" || src.sidebarBody === "agents") out.sidebarBody = src.sidebarBody;
  const collapsedProjects = asStringArrayPref(src.collapsedProjects);
  if (collapsedProjects) out.collapsedProjects = collapsedProjects;
  const collapsedGroups = asStringArrayPref(src.collapsedGroups);
  if (collapsedGroups) out.collapsedGroups = collapsedGroups;
  const pinnedProjects = asStringArrayPref(src.pinnedProjects);
  if (pinnedProjects) out.pinnedProjects = pinnedProjects;
  const unreadProjects = asStringArrayPref(src.unreadProjects);
  if (unreadProjects) out.unreadProjects = unreadProjects;
  const pinnedWorktrees = asStringArrayPref(src.pinnedWorktrees);
  if (pinnedWorktrees) out.pinnedWorktrees = pinnedWorktrees;
  const unreadWorktrees = asStringArrayPref(src.unreadWorktrees);
  if (unreadWorktrees) out.unreadWorktrees = unreadWorktrees;
  const projectGroupMap = asStringRecordPref(src.projectGroupMap);
  if (projectGroupMap) out.projectGroupMap = projectGroupMap;
  const projectGroups = asProjectGroupsPref(src.projectGroups);
  if (projectGroups) out.projectGroups = projectGroups;
  const projectGroupMapByHost = sanitizeProjectGroupMapByHost(src.projectGroupMapByHost);
  if (projectGroupMapByHost) out.projectGroupMapByHost = projectGroupMapByHost;
  const projectGroupsByHost = sanitizeProjectGroupsByHost(src.projectGroupsByHost);
  if (projectGroupsByHost) out.projectGroupsByHost = projectGroupsByHost;
  const displayOptions = normalizeDisplayOptionsPref(src.displayOptions);
  if (displayOptions) out.displayOptions = displayOptions;
  if (src.agentsReadFilter === "all" || src.agentsReadFilter === "unread") {
    out.agentsReadFilter = src.agentsReadFilter;
  }
  if (src.agentsGroupBy === "state" || src.agentsGroupBy === "project") out.agentsGroupBy = src.agentsGroupBy;
  if (typeof src.agentsSidebarIntroShown === "boolean") out.agentsSidebarIntroShown = src.agentsSidebarIntroShown;
  // Host scope: same normalizers the store setters use, so a malformed value
  // degrades to the default ('all' / all hosts) instead of blanking the sidebar.
  out.workspaceHostScope = normalizeExecutionHostScope(
    typeof src.workspaceHostScope === "string" ? src.workspaceHostScope : null
  );
  out.visibleWorkspaceHostIds = normalizeVisibleExecutionHostIds(
    Array.isArray(src.visibleWorkspaceHostIds)
      ? (src.visibleWorkspaceHostIds as string[])
      : null
  );
  return out;
}

/**
 * Lê apenas as coleções de grupos legadas (PR-16 gap 1): usado pela recuperação
 * dirigida quando a migração one-shot já marcou a flag mas as chaves
 * hydra:project_groups / hydra:project_group_map ficaram órfãs no localStorage.
 */
function readLegacyProjectGroupsRaw(): Record<string, unknown> {
  const raw: Record<string, unknown> = {};
  const readInto = (storageKey: string, field: string) => {
    try {
      const value = localStorage.getItem(storageKey);
      if (value !== null) raw[field] = JSON.parse(value);
    } catch {}
  };
  readInto("hydra:project_groups", "projectGroups");
  readInto("hydra:project_group_map", "projectGroupMap");
  return raw;
}

/** Lê as chaves legadas de localStorage como um blob cru (pré-migração). */
function readLegacySidebarPrefsRaw(): Record<string, unknown> {
  const raw: Record<string, unknown> = {};
  const readInto = (storageKey: string, field: string) => {
    try {
      const value = localStorage.getItem(storageKey);
      if (value !== null) raw[field] = JSON.parse(value);
    } catch {}
  };
  readInto("hydra:pinned_projects", "pinnedProjects");
  readInto("hydra:unread_projects", "unreadProjects");
  readInto("hydra:pinned_worktrees", "pinnedWorktrees");
  readInto("hydra:unread_worktrees", "unreadWorktrees");
  readInto("hydra:project_groups", "projectGroups");
  readInto("hydra:project_group_map", "projectGroupMap");
  readInto("hydra:collapsed_groups", "collapsedGroups");
  readInto("hydra:display_options", "displayOptions");
  return raw;
}

/**
 * Host that owns a repo's execution, by the repo's own path.
 *
 * Same rule as the sidebar's catalog→pipeline bridge: a repo that names no host
 * stays unqualified (treated as local) instead of being pinned to `local`, so a
 * single-host list never grows a phantom host column.
 */
function getExecutionHostIdForRepoPath(
  repos: readonly Repo[],
  repoPath: string
): ExecutionHostId | undefined {
  const repo = repos.find((candidate) => candidate.path === repoPath);
  return repo && (repo.connectionId || repo.executionHostId) ? getRepoExecutionHostId(repo) : undefined;
}

/**
 * Normalizes the delete dialog's contained-project payload. The dialog sends ids
 * (for per-project failure reporting); the path-only detail from older sidebars
 * stays readable so the event contract is backward compatible.
 */
function normalizeContainedProjectRemovals(detail: {
  removeProjects?: unknown;
  removeProjectPaths?: unknown;
}): Array<{ id: string; path: string }> {
  const projects: Array<{ id: string; path: string }> = [];
  if (Array.isArray(detail.removeProjects)) {
    for (const candidate of detail.removeProjects) {
      if (!candidate || typeof candidate !== "object") continue;
      const entry = candidate as { id?: unknown; path?: unknown };
      if (typeof entry.id === "string" && entry.id && typeof entry.path === "string" && entry.path) {
        projects.push({ id: entry.id, path: entry.path });
      }
    }
  }
  if (projects.length === 0 && Array.isArray(detail.removeProjectPaths)) {
    for (const path of detail.removeProjectPaths) {
      if (typeof path === "string" && path) {
        projects.push({ id: path, path });
      }
    }
  }
  return projects;
}

/**
 * Orca `markWorktreesDeleting`: the entry the sidebar card paints its overlay
 * from while a removal runs. `phase: 'deleting'` — Hydra dispatches the command
 * in the same tick the user confirms, so the row never sits in a queue.
 */
const WORKTREE_DELETE_IN_PROGRESS: WorktreeDeleteState = {
  isDeleting: true,
  phase: "deleting",
  error: null,
  canForceDelete: false,
  forceDeleteReason: null,
};

export default function App() {
  const [status, setStatus] = useState("Initializing...");
  const [isPairingOpen, setIsPairingOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddRepoOpen, setIsAddRepoOpen] = useState(false);
  // D03b-009: a folder dropped on the sidebar routes into the Add Project wizard, which
  // confirms the path before the catalog write (Orca `confirm-add-project-from-folder`).
  const [droppedAddRepoFolder, setDroppedAddRepoFolder] = useState<string | null>(null);
  const [isNewWorkspaceOpen, setIsNewWorkspaceOpen] = useState(false);
  // D03b-021/022: background creates live in the renderer store (Orca parity), so the
  // sidebar row and the content panel read the same entry the composer published.
  const pendingWorktreeCreations = useAppStore((s) => s.pendingWorktreeCreations);
  // D03b-021: the sidebar row routes the create to this surface (Orca `activeView: 'terminal'`
  // with the creation loader); the panel reads the same store entry.
  const activePendingCreationId = useAppStore((s) => s.activePendingCreationId);
  /**
   * Lane the workspace board's create button was pressed from (D08-030): the composer
   * seeds its creation request with this status, so the new worktree is born in that lane.
   * Cleared whenever the composer closes, so it never leaks into the next creation.
   */
  const [newWorkspaceInitialStatus, setNewWorkspaceInitialStatus] = useState<string | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isJumpPaletteOpen, setIsJumpPaletteOpen] = useState(false);
  const [recentlyClosedTabs, setRecentlyClosedTabs] = useState<TabItem[]>([]);
  const [settingsSectionRequested, setSettingsSectionRequested] = useState<HydraNavId | null>(null);
  // Orca `openSettingsTarget({ pane, sectionId })`: the pane and its in-pane
  // subsection travel together so a deep link lands on the concrete control.
  const [settingsTargetSectionId, setSettingsTargetSectionId] = useState<string | null>(null);
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
  // Live mirrors of the sidebar open-state: persistence snapshots read these
  // refs so a rapid toggle of both sidebars never persists a render-lagged
  // value for the other sidebar (bug #6). leftSidebarWidthRef follows the
  // same mirror pattern for the width: the resize hook keeps it current (rAF
  // drafts during the drag, commit on mouseup) with no per-frame setState.
  const leftSidebarOpenRef = useRef(isLeftSidebarOpen);
  const rightSidebarOpenRef = useRef(isRightSidebarOpen);
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(280);
  const leftSidebarWidthRef = useRef(leftSidebarWidth);
  useEffect(() => {
    leftSidebarOpenRef.current = isLeftSidebarOpen;
    rightSidebarOpenRef.current = isRightSidebarOpen;
    leftSidebarWidthRef.current = leftSidebarWidth;
  }, [isLeftSidebarOpen, isRightSidebarOpen, leftSidebarWidth]);
  // D07: the sleep marker's durable half. Install the IPC sink before any sleep
  // can run, then restore the markers written before this renderer started — a
  // workspace slept earlier stays cold instead of re-spawning its PTYs on boot.
  useEffect(() => {
    installWorktreeSleepStatePersistence();
    void hydrateWorktreeSleepStates().catch((error) => {
      console.error("Failed to restore workspace sleep states:", error);
    });
  }, []);
  const [previewLanguage, setPreviewLanguage] = useState("rust");
  const [fileTabContents, setFileTabContents] = useState<Record<string, { original: string; modified: string; lang: string }>>({});
  const [availableAgents, setAvailableAgents] = useState<AvailableAgent[]>([]);
  const [projects, setProjects] = useState<HydraProject[]>([]);
  const orcaRepoIcons = useMemo(() => loadBundledOrcaRepoIcons(), []);
  // Paths already resolved by the bundled-glyph effect below. Clearing a glyph in
  // the header menu writes `repoIcon: null`; without this the effect would see a
  // null icon on the next projects commit and resurrect the profile glyph.
  const repoIconResolutionPathsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    setProjects((prev) => {
      let changed = false;
      const next = prev.map((project) => {
        if (repoIconResolutionPathsRef.current.has(project.path)) return project;
        repoIconResolutionPathsRef.current.add(project.path);
        // Folder scan promotes child git dirs into projects. Orca keeps the
        // glyph on the folder the user added, so drop any avatar those children
        // picked up from the profile or from origin.
        if (isDiscoveredFolderChild(project.path, prev)) {
          if (!project.repo_icon) return project;
          changed = true;
          return { ...project, repo_icon: null };
        }
        if (project.repo_icon || Object.keys(orcaRepoIcons).length === 0) return project;
        const icon = repoIconForPath(orcaRepoIcons, project.path);
        if (!icon) return project;
        changed = true;
        return { ...project, repo_icon: icon };
      });
      return changed ? next : prev;
    });
  }, [projects, orcaRepoIcons]);
  const [activeProject, setActiveProject] = useState<HydraProject | null>(null);
  const [activeWorktreePath, setActiveWorktreePath] = useState<string | null>(null);
  const activeWorktreePathRef = useRef<string | null>(null);
  activeWorktreePathRef.current = activeWorktreePath;
  const currentWorkspacePath = activeWorktreePath || activeProject?.path || "";
  const currentWorkspacePathRef = useRef<string>(currentWorkspacePath);
  currentWorkspacePathRef.current = currentWorkspacePath;
  const [gitStatus, setGitStatus] = useState<GitRepoStatus | null>(null);
  const [gitWorktrees, setGitWorktrees] = useState<GitWorktreeInfo[]>([]);
  const [worktreesByProject, setWorktreesByProject] = useState<Record<string, GitWorktreeInfo[]>>({});
  // Orca paints a PR glyph (merged = purple) on the card lane. The host probe is
  // `pr_status` (gh-backed); a missing gh yields null and the lane falls back to the
  // branch glyph, exactly like Orca without provider state.
  const [prByPath, setPrByPath] = useState<Record<string, PrDisplay>>({});
  const prLookupRef = useRef<Set<string>>(new Set());
  const [hiddenWorktreesByProject, setHiddenWorktreesByProject] = useState<Record<string, GitWorktreeInfo[]>>({});
  const [hydraSettings, setHydraSettings] = useState<HydraSettings>(DEFAULT_HYDRA_SETTINGS);
  const [systemDefaultShell, setSystemDefaultShell] = useState<string>("zsh");
  const systemDefaultShellRef = useRef<string>("zsh");
  systemDefaultShellRef.current = systemDefaultShell;

  const resolveDefaultShell = useCallback((): string => {
    if (hydraSettings.terminal_default_shell && hydraSettings.terminal_default_shell.trim()) {
      return hydraSettings.terminal_default_shell.trim();
    }
    return systemDefaultShellRef.current || "zsh";
  }, [hydraSettings.terminal_default_shell]);
  // Bug #12: system theme must be reactive, not sampled once when hydraSettings
  // change. Kept in state + updated by the MediaQueryList change listener below.
  const [systemDark, setSystemDark] = useState<boolean>(
    () => (typeof window !== "undefined" && window.matchMedia) ? window.matchMedia("(prefers-color-scheme: dark)").matches : true
  );
  // Apply interface font live (Orca appFontFamily → --app-font-family)
  useEffect(() => {
    const f = hydraSettings.app_font_family;
    if (f) {
      document.documentElement.style.setProperty("--app-font-family", f);
      document.body.style.fontFamily = f;
    }
  }, [hydraSettings.app_font_family]);
  // Apply UI zoom live (Orca uiZoom → document.documentElement.style.zoom)
  useEffect(() => {
    const z = hydraSettings.ui_zoom;
    if (typeof z === "number" && z > 0) {
      document.documentElement.style.zoom = String(z);
    }
  }, [hydraSettings.ui_zoom]);
  // The matchMedia listener below feeds `systemDark`, which is a dependency of the
  // single left-sidebar appearance resolver (`resolveLeftSidebarStyleVariables`); its output
  // styles both the WindowTitlebar (header continuity) and the sidebar chrome root.
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  const leftSidebarStyle = useMemo(() => {
    // Bug #12: sysDark used to be sampled here while hydraSettings was the only
    // dep, so an OS theme switch never recomputed the style. systemDark is now
    // reactive state fed by the matchMedia change listener above.
    return resolveLeftSidebarStyleVariables(hydraSettings, systemDark) as React.CSSProperties | undefined;
  }, [hydraSettings, systemDark]);
  const syncKeepAwake = (enabled: boolean, workingCount: number) => {
    invoke("sync_keep_awake", { enabled, workingCount }).catch(()=>{});
  };
  const [_keepAwakeActive, setKeepAwakeActive] = useState(false);
  const isMac = typeof navigator !== "undefined" && navigator.userAgent.includes("Mac");
  const projectsRef = useRef(projects);
  projectsRef.current = projects;
  const activeProjectRef = useRef(activeProject);
  activeProjectRef.current = activeProject;
  const prevProjectPathRef = useRef<string | null>(null);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    items: ContextMenuItem[];
    /** Item 4: "terminal-tab" mantém CustomContextMenu; sidebar usa Radix. */
    source: "sidebar" | "terminal-tab";
  } | null>(null);

  // Orca parity: dedicated DeleteWorktreeDialog state (openModal('delete-worktree')).
  // STA-4343: the modal carries the confirmed IDENTITY (id + host), not just the
  // path, so confirming can never land on the same path's sibling workspace.
  const [deleteWorktreeModal, setDeleteWorktreeModal] = useState<{
    repoPath: string;
    worktrees: GitWorktreeInfo[];
    deleteTargets: WorktreeDeleteIdentity[];
    error: string | null;
  } | null>(null);
  const [deleteStateByWorktreeId, setDeleteStateByWorktreeId] = useState<DeleteWorktreeDialogState>({});
  /** Orca `confirm-remove-folder`: the primary checkout can only lose the project entry. */
  const [confirmRemoveFolder, setConfirmRemoveFolder] = useState<{
    repoPath: string;
    displayName: string;
  } | null>(null);
  /** Orca `forget-ssh-workspace`: disconnected/ghost remote workspaces. */
  const [forgetSshTarget, setForgetSshTarget] = useState<{
    resolution: Exclude<SshWorkspaceForgetResolution, { kind: "not-ssh" } | { kind: "connected" }>;
    repoPath: string;
    worktreePath: string;
    displayName: string;
  } | null>(null);
  /** Folder-workspace removal target (non-destructive copy; folder stays on disk). */
  const [folderDeleteTarget, setFolderDeleteTarget] = useState<{
    id: string;
    name: string;
    path: string;
  } | null>(null);
  /**
   * D10-077: a multi-selection delete opens the same confirmation with every
   * removable workspace. A selection that resolves to nothing says so instead of
   * opening an empty dialog.
   */
  const handleDeleteFolderWorkspace = useCallback((folderWorkspaceId: string) => {
    const folders = useAppStore.getState().folderWorkspaces as
      | readonly { id: string; name?: string; folderPath?: string; path?: string }[]
      | null;
    const folder = (folders ?? []).find((candidate) => candidate.id === folderWorkspaceId);
    if (!folder) return;
    setFolderDeleteTarget({
      id: folder.id,
      name: folder.name ?? folder.id,
      path: folder.folderPath ?? folder.path ?? "",
    });
  }, []);
  // Orca parity: the store's host-aware catalog is the one source that can name a
  // repo's execution host on the render path (`WorktreeList` reads the same slice).
  const storeRepos = useAppStore((s) => s.repos);
  // Orca sleep eligibility reads browser activity from the store slice; Hydra's
  // terminals/sessions are App-owned and folded in by `buildHydraSleepActivityMaps`.
  const storeBrowserTabsByWorktree = useAppStore((s) => s.browserTabsByWorktree);
  // Orca parity (D01-052): the global shortcut path reads the keybinding registry
  // (definitions + user overrides) instead of hardcoded chords.
  const keybindings = useAppStore((s) => s.keybindings);
  /** Live workspace rows the delete confirmation revalidates its targets against. */
  const deleteLiveTargets = useMemo<WorktreeDeleteLiveTarget[]>(() => {
    const rows: WorktreeDeleteLiveTarget[] = [];
    for (const [repoPath, list] of Object.entries(worktreesByProject)) {
      const hostId = getExecutionHostIdForRepoPath(storeRepos, repoPath);
      for (const wt of list) {
        rows.push({
          id: wt.id ?? `${repoPath}::${wt.path}`,
          ...(hostId ? { hostId } : {}),
          isMainWorktree: wt.is_main ?? wt.isMainWorktree ?? false,
          path: wt.path,
          repoPath,
          displayName: wt.display_name ?? wt.displayName ?? wt.branch ?? wt.path,
        });
      }
    }
    return rows;
  }, [storeRepos, worktreesByProject]);
  // Orca parity (useDeleteWorktreeStatusHydration): the confirmation dialog's
  // dirty-change counts hydrate in dependency order while it is open. The hook
  // owns the lifetime, so a cancelled probe cannot write onto the next dialog.
  const deleteHydrationTargets = useMemo(() => {
    const identities = deleteWorktreeModal?.deleteTargets ?? [];
    return (deleteWorktreeModal?.worktrees ?? []).map((wt, index) => ({
      id: identities[index]?.id ?? wt.path,
      path: wt.path,
      hostId: identities[index]?.hostId ?? undefined,
    }));
  }, [deleteWorktreeModal]);
  const dirtyChangeCountsByWorktreeId = useDeleteWorktreeStatusHydration({
    isOpen: deleteWorktreeModal != null,
    deleteTargets: deleteHydrationTargets,
    visibleTargets: deleteLiveTargets,
    activeWorktreeId: activeWorktreePathRef.current,
  });
  // Orca `showWorkspaceListChangedToast`: the confirmed row changed or vanished
  // between opening and confirming, so the delete stops instead of guessing.
  const showStaleDeleteNotice = useCallback(() => {
    toast.info("Workspace list changed", {
      description: "Refresh Space and try again if the workspace list looks stale.",
    });
  }, []);
  /**
   * Publishes (or clears) the sidebar's per-row delete state. Both delete paths
   * funnel through here so the card overlay turns on when a removal is dispatched
   * and off the moment it settles — cancelling or a backend refusal must leave the
   * row interactive (Orca `markWorktreesDeleting` / `clearWorktreeDeleteState`).
   */
  const publishDeleteStateForTargets = useCallback(
    (targets: readonly WorktreeDeleteIdentity[], state: WorktreeDeleteState | null) => {
      if (targets.length === 0) return;
      setDeleteStateByWorktreeId((prev) => {
        const next = { ...prev };
        for (const target of targets) {
          const key = getDeleteStateKeyForWorktreeHost(target);
          if (state) {
            next[key] = {
              ...state,
              ...(target.hostId ? { executionHostId: target.hostId } : {}),
            };
          } else {
            delete next[key];
          }
        }
        return next;
      });
    },
    []
  );
  // Non-blocking prompt & picker dialogs (replaces window.prompt to prevent WebKitGTK / Wayland freezes)
  const [promptDialog, setPromptDialog] = useState<Omit<PromptDialogProps, "onOpenChange"> | null>(null);
  type ParentPickerState = {
    child: WorktreeParentPickerCandidate;
    anchorRect: WorktreeParentPickerAnchorRect;
    focusRestoreElement: HTMLElement | null;
    selectParent: (parentPath: string) => Promise<void>;
    removeParent?: () => void;
  };
  const [parentPickerState, setParentPickerState] = useState<ParentPickerState | null>(null);
  // Orca `useWorktreeParentPickerTransition`: the picker opens only after the menu's
  // close cycle, so the Radix menu unmount cannot race the popover's first measurement.
  // `parentPickerOpen` is separate from the retained state so the popover survives its
  // exit animation instead of vanishing on the first frame of the close.
  const [parentPickerOpen, setParentPickerOpen] = useState(false);
  const pendingParentPickerRef = useRef<ParentPickerState | null>(null);
  const parentPickerFallbackTimerRef = useRef<number | null>(null);
  const parentPickerUnmountTimerRef = useRef<number | null>(null);

  const clearParentPickerTimer = useCallback(() => {
    if (parentPickerFallbackTimerRef.current != null) {
      window.clearTimeout(parentPickerFallbackTimerRef.current);
      parentPickerFallbackTimerRef.current = null;
    }
  }, []);

  const clearParentPickerUnmountTimer = useCallback(() => {
    if (parentPickerUnmountTimerRef.current != null) {
      window.clearTimeout(parentPickerUnmountTimerRef.current);
      parentPickerUnmountTimerRef.current = null;
    }
  }, []);

  const openPendingParentPicker = useCallback(() => {
    const pending = pendingParentPickerRef.current;
    if (!pending) return;
    pendingParentPickerRef.current = null;
    clearParentPickerTimer();
    clearParentPickerUnmountTimer();
    setParentPickerState(pending);
    setParentPickerOpen(true);
  }, [clearParentPickerTimer, clearParentPickerUnmountTimer]);

  /**
   * Orca `handleParentPickerOpenChange(false)`: close immediately, unmount only after
   * the exit animation so the popover can play it. A fresh open cancels the timer.
   */
  const closeParentPicker = useCallback(() => {
    setParentPickerOpen(false);
    clearParentPickerUnmountTimer();
    parentPickerUnmountTimerRef.current = window.setTimeout(() => {
      parentPickerUnmountTimerRef.current = null;
      setParentPickerState(null);
    }, PARENT_PICKER_EXIT_ANIMATION_MS);
  }, [clearParentPickerUnmountTimer]);

  const scheduleParentPickerOpen = useCallback(
    (request: ParentPickerState) => {
      pendingParentPickerRef.current = request;
      clearParentPickerTimer();
      // Orca's 50ms fallback: the menu's Radix exit may never call back.
      parentPickerFallbackTimerRef.current = window.setTimeout(openPendingParentPicker, 50);
    },
    [clearParentPickerTimer, openPendingParentPicker]
  );

  /**
   * Orca anchors the picker to the workspace row that opened the menu; `getWorktreeParentPickerAnchor`
   * resolves the drag row for a worktree id and falls back to the card scope. Project and
   * session menus have no single card scope, so their contextmenu point is the fallback.
   */
  const getParentPickerAnchorRect = useCallback(
    (event: React.MouseEvent, worktreeId: string): WorktreeParentPickerAnchorRect => {
      const target = event.target instanceof Element ? event.target : null;
      const scope = target?.closest<HTMLElement>("[data-worktree-drag-id]") ?? null;
      const anchorElement = getWorktreeParentPickerAnchor(scope, worktreeId) ?? scope;
      const rect = anchorElement?.getBoundingClientRect();
      return rect
        ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
        : { left: event.clientX, top: event.clientY, width: 1, height: 1 };
    },
    []
  );

  useEffect(
    () => () => {
      clearParentPickerTimer();
      clearParentPickerUnmountTimer();
      pendingParentPickerRef.current = null;
    },
    [clearParentPickerTimer, clearParentPickerUnmountTimer]
  );



  // PR-14: pinned/unread/groups migraram do localStorage para o SQLite
  // (sidebar_prefs, key "ui.sidebar"). Defaults até a hidratação assíncrona
  // completar (mesmo padrão do layout hydration abaixo). worktree_lineage segue
  // em localStorage — fora do escopo do PR-14.
  const [pinnedProjects, setPinnedProjects] = useState<Set<string>>(new Set());
  const [unreadProjects, setUnreadProjects] = useState<Set<string>>(new Set());
  const [pinnedWorktrees, setPinnedWorktrees] = useState<Set<string>>(new Set());
  const [unreadWorktrees, setUnreadWorktrees] = useState<Set<string>>(new Set());
  // Groups live per execution host (D03a-021/082/087): one bucket per
  // `ExecutionHostId`, so a mutation addressed at one host can never touch
  // another host's groups or memberships — even when a group id repeats.
  const [projectGroupState, setProjectGroupState] = useState<ProjectGroupHostState>(
    EMPTY_PROJECT_GROUP_HOST_STATE
  );
  const projectGroupStateRef = useRef<ProjectGroupHostState>(EMPTY_PROJECT_GROUP_HOST_STATE);
  const applyProjectGroupHostState = useCallback((next: ProjectGroupHostState) => {
    projectGroupStateRef.current = next;
    setProjectGroupState(next);
  }, []);
  const flatProjectGroups = useMemo(
    () => flattenProjectGroupHostState(projectGroupState),
    [projectGroupState]
  );
  const projectGroups = flatProjectGroups.projectGroups;
  const projectGroupMap = flatProjectGroups.projectGroupMap;
  /** Latest authoritative catalog read, merged again when persisted prefs hydrate. */
  const catalogProjectGroupsRef = useRef<{
    groups: Array<{ id: string; name: string; tabOrder?: number; hostId?: string }>;
    memberships: Record<string, string>;
  } | null>(null);
  const applyCatalogProjectGroups = useCallback(
    (model: {
      projectGroups: Array<{ id: string; name: string; tabOrder?: number; hostId?: string }>;
      projectGroupMap: Record<string, string>;
    }) => {
      catalogProjectGroupsRef.current = {
        groups: model.projectGroups,
        memberships: model.projectGroupMap,
      };
      applyProjectGroupHostState(
        mergeProjectGroupCatalogIntoHostState(projectGroupStateRef.current, {
          groups: model.projectGroups,
          memberships: model.projectGroupMap,
        })
      );
    },
    [applyProjectGroupHostState]
  );
  const [folderWorkspaces, setFolderWorkspaces] = useState<
    Array<{
      id: string;
      projectGroupId: string;
      name: string;
      folderPath: string;
      /** Host stamps from the catalog; local probing must not answer for them. */
      connectionId?: string | null;
      executionHostId?: string | null;
    }>
  >([]);
  // D07-023: hydrated once from SQLite; legacy localStorage is migrated through
  // the IPC on first boot and then retired.
  const {
    worktreeLineage,
    setParents: persistWorktreeLineageParents,
    clearParents: clearWorktreeLineageParents,
  } = useWorktreeLineage();
  const [worktreeMetadataByPath, setWorktreeMetadataByPath] = useState<WorktreeMetadataByPath>({});
  const [worktreeMetaDialog, setWorktreeMetaDialog] = useState<{ wt: GitWorktreeInfo } | null>(null);

  useEffect(() => {
    invoke<Record<string, WorktreeMetadataRecord>>("list_worktree_metadata")
      .then(setWorktreeMetadataByPath)
      .catch(console.error);
  }, []);

  // PR-14: blob merged + debounce 250ms. sidebarPrefsHydratedRef faz gate das
  // escritas até a hidratação completar — sem o gate, o mount dispararia os
  // effects com defaults e clobber-aria o blob persistido antes do invoke resolver.
  const [initialSidebarPrefs, setInitialSidebarPrefs] = useState<SidebarPrefsSnapshot | null>(null);
  const sidebarPrefsRef = useRef<SidebarPrefsSnapshot>({});
  const sidebarPrefsHydratedRef = useRef(false);
  const sidebarPrefsSaveTimerRef = useRef<number | null>(null);
  const scheduleSidebarPrefsSave = useCallback(() => {
    if (!sidebarPrefsHydratedRef.current) return;
    if (sidebarPrefsSaveTimerRef.current !== null) window.clearTimeout(sidebarPrefsSaveTimerRef.current);
    sidebarPrefsSaveTimerRef.current = window.setTimeout(() => {
      sidebarPrefsSaveTimerRef.current = null;
      invoke("save_sidebar_pref", { key: SIDEBAR_PREFS_KEY, json: JSON.stringify(sidebarPrefsRef.current) }).catch(() => {});
    }, 250);
  }, []);
  useEffect(() => () => {
    if (sidebarPrefsSaveTimerRef.current !== null) window.clearTimeout(sidebarPrefsSaveTimerRef.current);
  }, []);

  // Fatia App-owned (pinned/unread/groups) → merge no blob + save debounced.
  useEffect(() => {
    const snap = sidebarPrefsRef.current;
    snap.pinnedProjects = [...pinnedProjects];
    snap.unreadProjects = [...unreadProjects];
    snap.pinnedWorktrees = [...pinnedWorktrees];
    snap.unreadWorktrees = [...unreadWorktrees];
    const serializedGroups = serializeProjectGroupHostState(projectGroupState);
    snap.projectGroupsByHost = serializedGroups.projectGroupsByHost;
    snap.projectGroupMapByHost = serializedGroups.projectGroupMapByHost;
    // Why delete: legacy flat fields would re-seed the local bucket on the next
    // boot and could resurrect a group a host-qualified write removed.
    delete snap.projectGroups;
    delete snap.projectGroupMap;
    scheduleSidebarPrefsSave();
  }, [pinnedProjects, unreadProjects, pinnedWorktrees, unreadWorktrees, projectGroupState, scheduleSidebarPrefsSave]);

  // Fatia Shell-owned (body/collapsed/displayOptions/agents*) sobe por este callback.
  const handleSidebarPrefsChange = useCallback((prefs: SidebarShellPrefs) => {
    const snap = sidebarPrefsRef.current;
    snap.sidebarBody = prefs.sidebarBody;
    snap.collapsedProjects = prefs.collapsedProjects;
    snap.collapsedGroups = prefs.collapsedGroups;
    snap.displayOptions = prefs.displayOptions;
    snap.agentsReadFilter = prefs.agentsReadFilter;
    snap.agentsGroupBy = prefs.agentsGroupBy;
    snap.agentsSidebarIntroShown = prefs.agentsSidebarIntroShown;
    scheduleSidebarPrefsSave();
  }, [scheduleSidebarPrefsSave]);

  // Fatia do store (host scope) → merge no blob + save debounced. Os setters do
  // store só mexem em estado; a persistência sobe por este efeito.
  const storeWorkspaceHostScope = useAppStore((s) => s.workspaceHostScope);
  const storeVisibleWorkspaceHostIds = useAppStore((s) => s.visibleWorkspaceHostIds);
  useEffect(() => {
    const snap = sidebarPrefsRef.current;
    snap.workspaceHostScope = storeWorkspaceHostScope;
    snap.visibleWorkspaceHostIds = storeVisibleWorkspaceHostIds;
    scheduleSidebarPrefsSave();
  }, [storeWorkspaceHostScope, storeVisibleWorkspaceHostIds, scheduleSidebarPrefsSave]);

  // Agent Fleet Sessions
  const [sessions, setSessions] = useState<WorktreeSession[]>([]);

  // Center Workbench Tabs — Orca parity: landing vazia, sem bash auto (fix #11)
  const [tabs, setTabs] = useState<TabItem[]>([]);
  const [workbenchLoaded, setWorkbenchLoaded] = useState(false);
  const workbenchLoadedRef = useRef(workbenchLoaded);
  workbenchLoadedRef.current = workbenchLoaded;
  const workbenchCheckedRef = useRef(false);
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;
  // Orca sleep keeps the persisted tab layout so a wake re-attaches; the teardown
  // clears the visible tabs, and this one-shot flag keeps that clear from being
  // written back as the workspace's saved state.
  const skipWorkbenchPersistenceOnceRef = useRef(false);
  const [activeTabId, setActiveTabId] = useState("");
  const activeTabIdRef = useRef(activeTabId);
  activeTabIdRef.current = activeTabId;
  // Zustand bridge: keep tabsByWorktree and activeTabIdByWorktree synchronized
  const setStoreTabs = useAppStore((s) => s.setTabsForWorktree);
  const setStoreActiveTabId = useAppStore((s) => s.setActiveTabIdForWorktree);

  useEffect(() => {
    const currentPath = activeWorktreePathRef.current || activeProjectRef.current?.path;
    if (currentPath) {
      setStoreTabs(currentPath, tabs);
    }
  }, [tabs, setStoreTabs]);

  useEffect(() => {
    const currentPath = activeWorktreePathRef.current || activeProjectRef.current?.path;
    if (currentPath && activeTabId) {
      setStoreActiveTabId(currentPath, activeTabId);
    }
  }, [activeTabId, setStoreActiveTabId]);
  // Sprint 2 P0: focused pane per tab (sessionId)
  const [focusedPaneMap, setFocusedPaneMap] = useState<Record<string, string>>({});
  const [mruTabIds, setMruTabIds] = useState<string[]>([]);
  const [isRecentTabSwitcherOpen, setIsRecentTabSwitcherOpen] = useState(false);
  const [recentTabSwitcherIndex, setRecentTabSwitcherIndex] = useState(0);
  const isRecentTabSwitcherOpenRef = useRef(isRecentTabSwitcherOpen);
  const recentTabSwitcherIndexRef = useRef(recentTabSwitcherIndex);

  useEffect(() => {
    isRecentTabSwitcherOpenRef.current = isRecentTabSwitcherOpen;
    recentTabSwitcherIndexRef.current = recentTabSwitcherIndex;
  }, [isRecentTabSwitcherOpen, recentTabSwitcherIndex]);

  useEffect(() => {
    if (!activeTabId) return;
    setMruTabIds((prev) => [activeTabId, ...prev.filter((id) => id !== activeTabId)]);
  }, [activeTabId]);

  useEffect(() => {
    const existing = new Set(tabs.map((t) => t.id));
    setMruTabIds((prev) => prev.filter((id) => existing.has(id)));
  }, [tabs]);

  const mruTabs = useMemo(() => {
    const map = new Map(tabs.map((t) => [t.id, t]));
    const list: TabItem[] = [];
    for (const id of mruTabIds) {
      const tab = map.get(id);
      if (tab) {
        list.push(tab);
        map.delete(id);
      }
    }
    for (const tab of map.values()) {
      list.push(tab);
    }
    return list;
  }, [tabs, mruTabIds]);

  const mruTabsRef = useRef(mruTabs);
  useEffect(() => {
    mruTabsRef.current = mruTabs;
  }, [mruTabs]);

  // Orca running-terminal-close parity: pending confirmation for closing a terminal
  // tab whose shell still has a running child process. `onConfirm` performs the
  // original close (executeCloseTab). Store-less: Hydra has no zustand, so the
  // request lives in App state next to the sibling deleteWorktreeModal.
  const [runningTerminalCloseConfirm, setRunningTerminalCloseConfirm] =
    useState<RunningTerminalCloseConfirmRequest | null>(null);
  const handleRunningTerminalCloseConfirm = (dontAskAgain: boolean) => {
    const request = runningTerminalCloseConfirm;
    setRunningTerminalCloseConfirm(null);
    if (!request) return;
    if (dontAskAgain) {
      // Orca parity: "Don't ask again" persists the opt-out, then performs this close.
      const next = {
        ...hydraSettings,
        skip_close_terminal_with_running_process_confirm: true,
      } as HydraSettings;
      setHydraSettings(next);
      invoke("save_settings", { settings: next }).catch(console.error);
    }
    request.onConfirm();
  };

  // ---- Sprint 2 P0: Split Terminal Helpers ----
  const getPanesForTab = useCallback((tab: TabItem): SplitPane[] => {
    if (tab.splitLayout?.panes && tab.splitLayout.panes.length > 0) return tab.splitLayout.panes;
    if (tab.splitPanes && tab.splitPanes.length > 0) return tab.splitPanes;
    if (tab.splitSessionIds && tab.splitSessionIds.length > 0) {
      return tab.splitSessionIds
        .filter((sid): sid is string => Boolean(sid))
        .map((sid) => ({ sessionId: sid, executable: tab.executable, cwd: tab.cwd }));
    }
    if (tab.sessionId) return [{ sessionId: tab.sessionId, executable: tab.executable, cwd: tab.cwd }];
    return [];
  }, []);

  const getSplitDirectionForTab = useCallback((tab: TabItem): "horizontal" | "vertical" => {
    if (tab.splitLayout?.direction) return tab.splitLayout.direction;
    if (tab.splitDirection) return tab.splitDirection;
    return "horizontal";
  }, []);

  const handleSplitTerminal = useCallback((direction: "horizontal" | "vertical") => {
    const tab = tabsRef.current.find((t) => t.id === activeTabIdRef.current);
    if (!tab || tab.type !== "terminal") {
      // inline new terminal tab creation to avoid TDZ dependency on handleNewTerminalTab
      const shFallback = resolveDefaultShell();
      const sidFallback = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const tabIdFallback = `tab_${sidFallback}`;
      const terminalCountFallback = tabsRef.current.filter((t) => t.type === "terminal").length;
      const titleFallback = terminalCountFallback === 0 ? "Terminal" : `Terminal ${terminalCountFallback + 1}`;
      const fallbackSession: WorktreeSession = {
        id: sidFallback,
        project_path: activeProjectRef.current?.path ?? "",
        title: `Terminal (${shFallback})`,
        branch: activeProjectRef.current?.current_branch ?? "main",
        state: "idle",
        active: true,
        agentName: shFallback,
        executable: shFallback,
        created_at: Date.now(),
        updated_at: Date.now(),
      };
      invoke("save_session_record", { record: { id: sidFallback, project_path: fallbackSession.project_path, title: fallbackSession.title, branch: fallbackSession.branch, agent_name: fallbackSession.agentName, executable: fallbackSession.executable, created_at: Date.now(), updated_at: Date.now() } }).catch(()=>{});
      setSessions((prev) => [...prev.map((s) => ({ ...s, active: false })), fallbackSession]);
      setTabs((prev) => [...prev, { id: tabIdFallback, title: titleFallback, type: "terminal", sessionId: sidFallback, executable: shFallback, cwd: fallbackSession.project_path }]);
      setActiveTabId(tabIdFallback);
      return;
    }
    const existingPanes = getPanesForTab(tab);
    if (existingPanes.length >= 4) return;
    const sh = tab.executable || resolveDefaultShell();
    const cwd = tab.cwd || activeProjectRef.current?.path || "";
    const newSessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newPaneSession: WorktreeSession = {
      id: newSessionId,
      project_path: cwd,
      title: `Terminal (${sh})`,
      branch: activeProjectRef.current?.current_branch ?? "main",
      state: "idle",
      active: false,
      agentName: sh,
      executable: sh,
      created_at: Date.now(),
      updated_at: Date.now(),
    };
    invoke("save_session_record", {
      record: {
        id: newSessionId,
        project_path: cwd,
        title: newPaneSession.title,
        branch: newPaneSession.branch,
        agent_name: sh,
        executable: sh,
        created_at: Date.now(),
        updated_at: Date.now(),
      },
    }).catch(() => {});
    setSessions((prev) => [...prev, newPaneSession]);
    // Rust split helper (P0): create_split_terminal ensures PTY + vt100 + push emission
    invoke<string>("create_split_terminal", {
      sessionId: newSessionId,
      executable: sh,
      cwd,
    })
      .then(() => {})
      .catch(() => {
        // fallback: also try parent-based generation if server expects parentSessionId
        invoke<string>("create_split_terminal", {
          parentSessionId: existingPanes[0]?.sessionId ?? tab.sessionId ?? newSessionId,
          executable: sh,
          cwd,
        }).catch(() => {});
      });
    const newPane: SplitPane = { sessionId: newSessionId, executable: sh, cwd };
    setTabs((prev) =>
      prev.map((t) => {
        if (t.id !== tab.id) return t;
        let panes: SplitPane[];
        if (t.splitLayout) {
          panes = [...t.splitLayout.panes, newPane];
          return { ...t, splitLayout: { direction, panes }, splitPanes: panes, splitDirection: direction, splitSessionIds: panes.map((p) => p.sessionId) };
        }
        if (t.splitPanes || t.splitSessionIds) {
          const cur = getPanesForTab(t);
          panes = [...cur, newPane];
          return { ...t, splitPanes: panes, splitSessionIds: panes.map((p) => p.sessionId), splitDirection: direction, splitLayout: { direction, panes } };
        }
        const basePane: SplitPane = {
          sessionId: t.sessionId ?? existingPanes[0]?.sessionId ?? `sess_fallback_${Date.now()}`,
          executable: t.executable ?? sh,
          cwd: t.cwd ?? cwd,
        };
        panes = [basePane, newPane];
        return { ...t, splitPanes: panes, splitSessionIds: panes.map((p) => p.sessionId), splitDirection: direction, splitLayout: { direction, panes } };
      })
    );
    // focus new pane
    setFocusedPaneMap((prev) => ({ ...prev, [tab.id]: newSessionId }));
  }, [getPanesForTab, getSplitDirectionForTab, hydraSettings]);

  const handleCloseSplitPane = useCallback((tabId: string, paneSessionId: string) => {
    invoke("delete_session_record", { sessionId: paneSessionId }).catch(() => {});
    invoke("close_split_terminal", { sessionId: paneSessionId }).catch(() => {});
    setSessions((prev) => prev.filter((s) => s.id !== paneSessionId));
    setTabs((prev) =>
      prev.map((t) => {
        if (t.id !== tabId) return t;
        const panes = getPanesForTab(t).filter((p) => p.sessionId !== paneSessionId);
        if (panes.length <= 1) {
          const remaining = panes[0];
          if (!remaining) {
            const { splitPanes: _a, splitSessionIds: _b, splitDirection: _c, splitLayout: _d, ...rest } = t as any;
            return rest as TabItem;
          }
          const { splitPanes: _a, splitSessionIds: _b, splitDirection: _c, splitLayout: _d, ...rest } = t as any;
          return { ...(rest as TabItem), sessionId: remaining.sessionId, executable: remaining.executable ?? (rest as TabItem).executable, cwd: remaining.cwd ?? (rest as TabItem).cwd };
        }
        const dir = getSplitDirectionForTab(t);
        return { ...t, splitPanes: panes, splitSessionIds: panes.map((p) => p.sessionId), splitDirection: dir, splitLayout: { direction: dir, panes } };
      })
    );
    setFocusedPaneMap((prev) => {
      const cur = prev[tabId];
      if (cur === paneSessionId) {
        const next = { ...prev };
        delete next[tabId];
        return next;
      }
      return prev;
    });
  }, [getPanesForTab, getSplitDirectionForTab]);



  // Orca parity: left panel resizes via useSidebarResize — rAF drag drafts go
  // straight to the DOM (containerRef), state commits only on mouseup.
  // PR-13 encaixe: o titlebar-left acompanha o draft de width ao vivo (sem
  // re-render) — o WindowTitlebar aplica este ref no div titlebar-left.
  const leftTitlebarRef = useRef<HTMLDivElement | null>(null);
  const onLeftSidebarDraftWidthChange = useCallback((width: number) => {
    leftSidebarWidthRef.current = width;
    leftTitlebarRef.current?.style.setProperty("width", `${width}px`);
    // Orca `setLiveSidebarWidth` (D03b-001): anchored panels read the drag draft from
    // the document, so they track the sidebar without a React round-trip on every frame.
    applyWorkspaceSidebarLiveWidth(width);
  }, []);
  // Why: a closed sidebar has no width to track; leaving the last draft published would
  // anchor companion panels to chrome that is no longer on screen.
  useEffect(() => {
    if (!isLeftSidebarOpen) applyWorkspaceSidebarLiveWidth(null);
  }, [isLeftSidebarOpen]);
  const leftSidebar = useSidebarResize<HTMLElement>({
    isOpen: isLeftSidebarOpen,
    width: leftSidebarWidth,
    minWidth: LEFT_SIDEBAR_MIN_WIDTH,
    maxWidth: LEFT_SIDEBAR_MAX_WIDTH,
    deltaSign: 1,
    defaultWidth: LEFT_SIDEBAR_DEFAULT_WIDTH,
    setWidth: setLeftSidebarWidth,
    onDraftWidthChange: onLeftSidebarDraftWidthChange,
  });

  const rightSidebar = usePanelResize({
    initialWidth: 360,
    minWidth: 260,
    maxWidth: 600,
    deltaSign: -1,
  });

  // 1. Carrega o estado persistido de visibilidade dos painéis + largura do sidebar esquerdo
  useEffect(() => {
    invoke<UiLayoutState>("get_layout_persistence")
      .then((layout) => {
        if (layout) {
          setIsLeftSidebarOpen(layout.left_sidebar_open);
          setIsRightSidebarOpen(layout.right_sidebar_open);
          const persistedWidth = layout.left_sidebar_width;
          if (typeof persistedWidth === "number" && Number.isFinite(persistedWidth)) {
            const clamped = clampSidebarResizeWidth(
              persistedWidth,
              LEFT_SIDEBAR_MIN_WIDTH,
              LEFT_SIDEBAR_MAX_WIDTH
            );
            leftSidebarWidthRef.current = clamped;
            setLeftSidebarWidth(clamped);
          }
        }
      })
      .catch(console.error);

    // PR-14: hidrata as prefs do sidebar do SQLite; na primeira execução migra as
    // chaves legadas de localStorage e as remove (flag hydra:sidebar_prefs_migrated).
    invoke<string | null>("get_sidebar_pref", { key: SIDEBAR_PREFS_KEY })
      .then((storedJson) => {
        let parsedRaw: unknown = null;
        if (storedJson) {
          try { parsedRaw = JSON.parse(storedJson); } catch {}
        }
        let stored = sanitizeSidebarPrefsSnapshot(parsedRaw);
        let migrated = false;
        try { migrated = localStorage.getItem(SIDEBAR_PREFS_MIGRATED_KEY) === "1"; } catch {}
        if (!migrated) {
          // Legado embaixo: um campo presente no SQLite vence; um ausente cai no
          // valor migrado do localStorage (mesma leitura dos readers antigos).
          stored = { ...sanitizeSidebarPrefsSnapshot(readLegacySidebarPrefsRaw()), ...stored };
        }
        // PR-16 (gap 1): recuperação dirigida de grupos. A migração one-shot pode ter
        // rodado num build anterior à entrada das chaves de grupo na lista de migração
        // (ou com a flag setada por um build intermediário), deixando
        // hydra:project_groups / hydra:project_group_map órfãs no localStorage — o
        // header do grupo ("MalhaClub Dev" etc.) nunca renderiza porque o blob do
        // SQLite não tem as coleções. Se o blob stored está sem grupos e o
        // localStorage ainda guarda dados válidos, fazemos o merge aqui; o flush
        // direto abaixo persiste o blob merged (shape intacto) no SQLite e só então
        // aposenta as duas chaves legadas.
        let recoveredGroupState = readProjectGroupHostState(stored);
        let recoveredLegacyGroups = false;
        if (migrated && !hasProjectGroupHostData(recoveredGroupState)) {
          const legacyRaw = readLegacyProjectGroupsRaw();
          const legacyGroupCount = sanitizeLegacyProjectGroups(legacyRaw.projectGroups)?.length ?? 0;
          const legacyMappingCount = Object.keys(
            sanitizeLegacyProjectGroupMap(legacyRaw.projectGroupMap) ?? {}
          ).length;
          if (legacyGroupCount > 0 || legacyMappingCount > 0) {
            recoveredGroupState = readProjectGroupHostState(legacyRaw);
            recoveredLegacyGroups = true;
            // Feedback explícito de migração (uma vez por boot): grupos legados
            // recuperados mesmo com os demais campos em defaults.
            console.info(
              `[sidebar] PR-16: recuperados ${legacyGroupCount} grupo(s) e ${legacyMappingCount} mapeamento(s) de projeto do localStorage legado para as prefs SQLite`
            );
          }
        }
        // A catalog read can land before this hydration; fold it back in so the
        // persisted snapshot never hides groups the runtime already listed.
        const hydratedGroupState = catalogProjectGroupsRef.current
          ? mergeProjectGroupCatalogIntoHostState(recoveredGroupState, {
              groups: catalogProjectGroupsRef.current.groups,
              memberships: catalogProjectGroupsRef.current.memberships,
            })
          : recoveredGroupState;
        const persistedGroups = serializeProjectGroupHostState(hydratedGroupState);
        const merged: SidebarPrefsSnapshot = {
          ...stored,
          projectGroupsByHost: persistedGroups.projectGroupsByHost,
          projectGroupMapByHost: persistedGroups.projectGroupMapByHost,
        };
        delete merged.projectGroups;
        delete merged.projectGroupMap;
        // Fast-forward do ref ANTES de liberar a gate: qualquer change posterior
        // (Effects acima ou do Shell) faz merge sobre o blob hidratado.
        sidebarPrefsRef.current = merged;
        sidebarPrefsHydratedRef.current = true;
        // Fallback undefined → default atual = comportamento de first-run intacto.
        setPinnedProjects(new Set(merged.pinnedProjects ?? []));
        setUnreadProjects(new Set(merged.unreadProjects ?? []));
        setPinnedWorktrees(new Set(merged.pinnedWorktrees ?? []));
        setUnreadWorktrees(new Set(merged.unreadWorktrees ?? []));
        applyProjectGroupHostState(hydratedGroupState);
        // Fatia Shell-owned desce como props one-shot (initialSidebarBody etc.).
        setInitialSidebarPrefs(merged);
        // Host scope vive no store; hidrata pelo mesmo blob (chaves ausentes →
        // defaults 'all'/null, preservando a migração legada).
        hydrateWorkspaceHostScopePreference(merged);
        // Flush direto (sem debounce): grava o blob merged — cobre a primeira
        // escrita da migração e normaliza blobs parciais legados do próprio SQLite.
        invoke("save_sidebar_pref", { key: SIDEBAR_PREFS_KEY, json: JSON.stringify(merged) })
          .then(() => {
            // Só aposenta o localStorage depois que o SQLite confirmou a escrita —
            // se o save falhar, o próximo boot retenta a migração intacta.
            try {
              if (!migrated) {
                for (const legacyKey of LEGACY_SIDEBAR_PREF_KEYS) localStorage.removeItem(legacyKey);
                localStorage.setItem(SIDEBAR_PREFS_MIGRATED_KEY, "1");
              } else if (recoveredLegacyGroups) {
                // Recuperação dirigida (PR-16): aposenta só as duas coleções de
                // grupos — as demais chaves legadas já foram removidas antes.
                localStorage.removeItem("hydra:project_groups");
                localStorage.removeItem("hydra:project_group_map");
              }
            } catch {}
          })
          .catch(() => {});
      })
      .catch(() => {
        // Backend indisponível: defaults permanecem, mas a gate precisa abrir para
        // não descartar silenciosamente as mudanças do usuário nesta sessão.
        sidebarPrefsHydratedRef.current = true;
      });

    // Hidrata o registry de hosts SSH do store (é o que faz o submenu "Hosts"
    // aparecer quando existe alvo não-local). Falha do backend não derruba o boot:
    // o store fica com sshTargetsHydrated=false e o submenu continua escondido até
    // uma leitura bem-sucedida. Sem polling — uma leitura no boot.
    hydrateSshTargets().catch(console.error);

    // Fatia Shell/store-owned (ui.state): leitura única no boot. As cinco chaves do
    // blob `ui.sidebar` (posse do App) ficam de fora — ver `hydrateSliceUiPreferences`.
    hydrateUiStatePreferences().catch(console.error);
  }, []);

  // 2. Carrega o estado persistido do workbench (tabs + active tab) — com dedupe por sessionId/title
  useEffect(() => {
    invoke<WorkbenchState>("get_workbench_persistence")
      .then((state) => {
        if (state && state.tabs_json) {
          try {
            const raw = JSON.parse(state.tabs_json) as TabItem[];
            // Dedupe apenas por sessionId + órfã sem sessionId. Não dedupar por conteúdo (title|executable|cwd)
            // para não remover 2× Terminal intencional no mesmo cwd — duplicatas OpenCode já foram
            // eliminadas via DB ROW_NUMBER + sessions dedupe, e legacy tab_2711 cai na órfã abaixo.
            const seenSid = new Set<string>();
            let deduped = raw.filter((t) => {
              if (t.sessionId) {
                if (seenSid.has(t.sessionId)) return false;
                seenSid.add(t.sessionId);
              }
              return true;
            });
            // Remove órfã sem sessionId se já existe tab com session para mesmo cwd
            deduped = deduped.filter((t) => {
              if (!t.sessionId && t.cwd) {
                return !deduped.some((o) => o !== t && o.sessionId && o.cwd === t.cwd);
              }
              return true;
            });
            const finalTabs = deduped;
            if (finalTabs.length > 0 && finalTabs.length !== raw.length) {
              // Persiste a versão limpa para não voltar duplicata
              invoke("save_workbench_persistence", { state: { tabs_json: JSON.stringify(finalTabs), active_tab_id: state.active_tab_id, updated_at: Date.now() } }).catch(console.error);
            }
            // Orca parity #11: filtrar bash default auto-criado (tab_main) quando é o único tab — mostrar landing
            const isDefaultBashOnly = finalTabs.length === 1 && finalTabs[0].id === "tab_main" && finalTabs[0].title === "bash (active)" && (finalTabs[0] as any).type === "terminal" && !(finalTabs[0] as any).sessionId;
            if (isDefaultBashOnly) {
              setTabs([]);
              setActiveTabId("");
              setWorkbenchLoaded(true);
              invoke("save_workbench_persistence", { state: { tabs_json: "[]", active_tab_id: "", updated_at: Date.now() } }).catch(console.error);
              return;
            }
            if (finalTabs.length > 0) {
              setTabs(finalTabs);
              if (state.active_tab_id && finalTabs.some(t => t.id === state.active_tab_id)) {
                setActiveTabId(state.active_tab_id);
              } else {
                setActiveTabId(finalTabs[0].id);
              }
              setWorkbenchLoaded(true);
            }
          } catch (e) {
            console.error("Failed to parse saved tabs:", e);
          }
        }
      })
      .catch(console.error)
      .finally(() => { workbenchCheckedRef.current = true; });
  }, []);

  // Sprint 3 #14: per-worktree workbench tabs — load/save por worktree (Orca tabs por worktree)
  useEffect(() => {
    if (!currentWorkspacePath) return;
    const prevPath = prevProjectPathRef.current;
    // Save current tabs to previous worktree's state before switching
    if (!skipWorkbenchPersistenceOnceRef.current && prevPath && prevPath !== currentWorkspacePath && tabsRef.current.length > 0) {
      const prevState: WorkbenchState = {
        tabs_json: JSON.stringify(tabsRef.current),
        active_tab_id: activeTabIdRef.current,
        updated_at: Date.now(),
      };
      invoke("save_workbench_persistence_for_project", { projectPath: prevPath, state: prevState }).catch(console.error);
    }
    // Load new workspace's workbench state — Orca parity: tabs por worktree, landing se vazio
    invoke<WorkbenchState>("get_workbench_persistence_for_project", { projectPath: currentWorkspacePath })
      .then((state) => {
        if (state && state.tabs_json && state.tabs_json !== "[]" && state.tabs_json !== "null") {
          try {
            const raw = JSON.parse(state.tabs_json) as TabItem[];
            if (raw.length === 0) {
              setTabs([]);
              setActiveTabId("");
              setWorkbenchLoaded(true);
              return;
            }
            const seenSid = new Set<string>();
            let deduped = raw.filter((t) => {
              if (t.sessionId) {
                if (seenSid.has(t.sessionId)) return false;
                seenSid.add(t.sessionId);
              }
              return true;
            });
            deduped = deduped.filter((t) => {
              if (!t.sessionId && t.cwd) {
                return !deduped.some((o) => o !== t && o.sessionId && o.cwd === t.cwd);
              }
              return true;
            });
            const finalTabs = deduped;
            // Orca parity #11: filtrar bash default
            const isDefaultBashOnlyPerProject = finalTabs.length === 1 && finalTabs[0].id === "tab_main" && finalTabs[0].title === "bash (active)" && (finalTabs[0] as any).type === "terminal" && !(finalTabs[0] as any).sessionId;
            if (isDefaultBashOnlyPerProject) {
              setTabs([]);
              setActiveTabId("");
              setWorkbenchLoaded(true);
              invoke("save_workbench_persistence_for_project", { projectPath: currentWorkspacePath, state: { tabs_json: "[]", active_tab_id: "", updated_at: Date.now() } }).catch(console.error);
              return;
            }
            if (finalTabs.length > 0) {
              setTabs(finalTabs);
              if (state.active_tab_id && finalTabs.some((t) => t.id === state.active_tab_id)) {
                setActiveTabId(state.active_tab_id);
              } else {
                setActiveTabId(finalTabs[0].id);
              }
              setWorkbenchLoaded(true);
            } else {
              setTabs([]);
              setActiveTabId("");
              setWorkbenchLoaded(true);
            }
          } catch (e) {
            console.error("Failed to parse per-project tabs:", e);
          }
        } else {
          // No per-project tabs — show landing / empty workbench for this project (Orca: no fake bash)
          setTabs([]);
          setActiveTabId("");
          setWorkbenchLoaded(true);
        }
      })
      .catch(console.error)
      .finally(() => {
        prevProjectPathRef.current = currentWorkspacePath;
        workbenchCheckedRef.current = true;
      });
  }, [currentWorkspacePath]);

  const updateLeftSidebar = (open: boolean) => {
    setIsLeftSidebarOpen(open);
    invoke("save_layout_persistence", {
      layout: {
        left_sidebar_open: open,
        right_sidebar_open: rightSidebarOpenRef.current,
        left_sidebar_width: leftSidebarWidthRef.current,
        right_sidebar_width: rightSidebar.width,
      }
    }).catch(console.error);
  };

  const updateRightSidebar = (open: boolean) => {
    setIsRightSidebarOpen(open);
    invoke("save_layout_persistence", {
      layout: {
        left_sidebar_open: leftSidebarOpenRef.current,
        right_sidebar_open: open,
        left_sidebar_width: leftSidebarWidthRef.current,
        right_sidebar_width: rightSidebar.width,
      }
    }).catch(console.error);
  };

  // Persiste a largura do sidebar esquerdo uma única vez por drag, no mouseup
  // do resize — os rascunhos do rAF tocam só o DOM e o ref, nunca o estado
  // (paridade Orca: commit no mouseup; persistência nunca por frame).
  useEffect(() => {
    if (!leftSidebar.isResizing) {
      return;
    }
    const onLeftSidebarResizeEnd = () => {
      const finalWidth = leftSidebarWidthRef.current;
      setLeftSidebarWidth(finalWidth);
      invoke("save_layout_persistence", {
        layout: {
          left_sidebar_open: leftSidebarOpenRef.current,
          right_sidebar_open: rightSidebarOpenRef.current,
          left_sidebar_width: finalWidth,
          right_sidebar_width: rightSidebar.width,
        }
      }).catch(console.error);
    };
    window.addEventListener("mouseup", onLeftSidebarResizeEnd);
    return () => {
      window.removeEventListener("mouseup", onLeftSidebarResizeEnd);
    };
  }, [leftSidebar.isResizing, rightSidebar.width]);

  // Double-click on the handle restores the default width (Orca parity). The
  // reset commits the width and persists it in the same write the drag end uses.
  const handleLeftSidebarResizeReset = useCallback(() => {
    leftSidebar.onResizeReset();
    leftSidebarWidthRef.current = LEFT_SIDEBAR_DEFAULT_WIDTH;
    invoke("save_layout_persistence", {
      layout: {
        left_sidebar_open: leftSidebarOpenRef.current,
        right_sidebar_open: rightSidebarOpenRef.current,
        left_sidebar_width: LEFT_SIDEBAR_DEFAULT_WIDTH,
        right_sidebar_width: rightSidebar.width,
      }
    }).catch(console.error);
  }, [leftSidebar.onResizeReset, rightSidebar.width]);

  const saveWorkbenchPersistence = useCallback(() => {
    if (skipWorkbenchPersistenceOnceRef.current) {
      skipWorkbenchPersistenceOnceRef.current = false;
      return;
    }
    const targetPath = activeWorktreePathRef.current || activeProjectRef.current?.path;
    const state: WorkbenchState = {
      tabs_json: JSON.stringify(tabs),
      active_tab_id: activeTabId,
      updated_at: Date.now(),
    };
    if (targetPath) {
      invoke("save_workbench_persistence_for_project", { projectPath: targetPath, state }).catch(console.error);
    } else {
      invoke("save_workbench_persistence", { state }).catch(console.error);
    }
  }, [tabs, activeTabId]);

  // Persist workbench state when tabs or active tab change
  useEffect(() => {
    saveWorkbenchPersistence();
  }, [saveWorkbenchPersistence]);

  const refreshGitWorktrees = (repoPath: string) => {
    // D07 G7: o MESMO payload do scan que hidrata os metadados do worktree
    // (display_name/status) traz is_pinned/is_unread — sem fetch novo.
    const hydrateWorktreeFlags = (visible: GitWorktreeInfo[], hidden: GitWorktreeInfo[]) => {
      const payload = [...visible, ...hidden];
      setPinnedWorktrees((prev) => reconcileWorktreeFlagSet(prev, payload, "is_pinned"));
      setUnreadWorktrees((prev) => reconcileWorktreeFlagSet(prev, payload, "is_unread"));
    };
    invoke<{ visible: GitWorktreeInfo[]; hidden: GitWorktreeInfo[]; isSuppressed: boolean }>("scan_worktrees", { repoPath })
      .then((scan) => {
        setGitWorktrees(scan.visible);
        setWorktreesByProject((prev) => ({ ...prev, [repoPath]: scan.visible }));
        setHiddenWorktreesByProject((prev) => ({ ...prev, [repoPath]: scan.hidden }));
        hydrateWorktreeFlags(scan.visible, scan.hidden);
      })
      .catch(() => {
        invoke<GitWorktreeInfo[]>("list_worktrees", { repoPath })
          .then((wts) => {
            setGitWorktrees(wts);
            setWorktreesByProject((prev) => ({ ...prev, [repoPath]: wts }));
            hydrateWorktreeFlags(wts, []);
          })
          .catch(console.error);
      });
  };

  const [scanFailuresByProject, setScanFailuresByProject] = useState<Record<string, string>>({});
  const refreshAllWorktrees = useCallback((projs: HydraProject[]): Promise<boolean> => {
    if (projs.length === 0) return Promise.resolve(true);
    const failures: { repoPath: string; message: string }[] = [];
    // Why count fallbacks: a failed authoritative scan is what a caller must be able
    // to roll back against (D10-063); silently painting the legacy list hid it.
    let authoritativeFailures = 0;
    return Promise.all(
      projs.map((proj) =>
        invoke<{ visible: GitWorktreeInfo[]; hidden: GitWorktreeInfo[]; isSuppressed: boolean }>("scan_worktrees", { repoPath: proj.path })
          .then((scan) => ({ path: proj.path, wts: scan.visible, hidden: scan.hidden }))
          .catch((error) => {
            authoritativeFailures += 1;
            failures.push({ repoPath: proj.path, message: String(error) });
            return invoke<GitWorktreeInfo[]>("list_worktrees", { repoPath: proj.path })
              .then((wts) => ({ path: proj.path, wts, hidden: [] as GitWorktreeInfo[] }))
              .catch(() => ({ path: proj.path, wts: [] as GitWorktreeInfo[], hidden: [] as GitWorktreeInfo[] }))
          })
      )
    ).then((results) => {
      const map: Record<string, GitWorktreeInfo[]> = {};
      const hiddenMap: Record<string, GitWorktreeInfo[]> = {};
      for (const r of results) {
        map[r.path] = r.wts;
        hiddenMap[r.path] = r.hidden;
      }
      setWorktreesByProject(map);
      setHiddenWorktreesByProject(hiddenMap);
      setScanFailuresByProject(
        Object.fromEntries(failures.map((failure) => [failure.repoPath, failure.message]))
      );
      // D07 G7: hidrata pin/unread do banco a partir do MESMO payload do scan que
      // já trouxe display_name/status. O payload é keyed por path; a main worktree
      // (path === project.path) é o elo com os Sets por id de projeto.
      const flagPayload = results.flatMap((r) => [...r.wts, ...r.hidden]);
      const projectTargets: ProjectFlagTarget[] = projs.map((proj) => ({
        id: proj.id,
        path: proj.path,
      }));
      setPinnedWorktrees((prev) => reconcileWorktreeFlagSet(prev, flagPayload, "is_pinned"));
      setUnreadWorktrees((prev) => reconcileWorktreeFlagSet(prev, flagPayload, "is_unread"));
      setPinnedProjects((prev) =>
        reconcileProjectFlagSet(prev, flagPayload, projectTargets, "is_pinned")
      );
      setUnreadProjects((prev) =>
        reconcileProjectFlagSet(prev, flagPayload, projectTargets, "is_unread")
      );
      if (activeProjectRef.current) {
        const activeWts = map[activeProjectRef.current.path];
        if (activeWts) setGitWorktrees(activeWts);
      } else if (projs[0]) {
        setGitWorktrees(map[projs[0].path] ?? []);
      }
      return authoritativeFailures === 0;
    });
  }, []);

  // Hydrate Sessions and Projects on startup
  useEffect(() => {
    invoke<string>("get_system_status")
      .then(setStatus)
      .catch(console.error);

    invoke<CatalogEnvelope>("catalog_get")
      .then(async (envelope) => {
        const model = catalogToSidebarModel(envelope);
        // D03b-029: the manual project order persists in the SQLite UI prefs (with the
        // legacy localStorage key as its migration fallback), not only per-webview.
        const savedOrder = await readProjectOrderPreference();
        const sorted = orderItemsByProjectOrder(model.projects, savedOrder);
        setProjects(sorted);
        applyCatalogProjectGroups(model);
        setFolderWorkspaces(model.folderWorkspaces);
        if (sorted.length > 0) {
          setActiveProject(sorted[0]);
          setActiveWorktreePath(sorted[0].path);
          if (!workbenchLoaded) {
            loadAllSessions();
          }
          refreshAllWorktrees(sorted);
        }
      })
      .catch(console.error);

    const handleRefreshProjects = (): Promise<boolean> => {
      return invoke<CatalogEnvelope>("catalog_get").then(async (envelope) => {
        const model = catalogToSidebarModel(envelope);
        const savedOrder = await readProjectOrderPreference();
        const sorted = orderItemsByProjectOrder(model.projects, savedOrder);
        setProjects(sorted);
        applyCatalogProjectGroups(model);
        setFolderWorkspaces(model.folderWorkspaces);
        return refreshAllWorktrees(sorted);
      }).catch(() => false);
    };
    // The event doubles as an awaitable request: a caller that must roll back on a
    // failed authoritative refresh hands over a resolver in the detail.
    const handleRefreshProjectsEvent = (event: Event) => {
      const resolve = (event as CustomEvent<{ resolve?: (ok: boolean) => void }>).detail?.resolve;
      void handleRefreshProjects().then((ok) => resolve?.(ok));
    };
    window.addEventListener("hydra:refresh-projects", handleRefreshProjectsEvent);
    const handleAddProjectFromFolder = (event: Event) => {
      const path = (event as CustomEvent<{ path?: string }>).detail?.path;
      if (!path) return;
      setDroppedAddRepoFolder(path);
      setIsAddRepoOpen(true);
    };
    window.addEventListener("hydra:add-project-from-folder", handleAddProjectFromFolder);
    // The sidebar's icon picker echoes the chosen glyph before the catalog write
    // lands (and echoes the previous one back if that write fails). App owns
    // `projects`, so it applies the echo; the authoritative catalog refresh that
    // follows replaces the whole list.
    const handleProjectIconOptimistic = (event: Event) => {
      setProjects((previous) => applyProjectIconEvent(previous, event) ?? previous);
    };
    window.addEventListener(PROJECT_ICON_OPTIMISTIC_EVENT, handleProjectIconOptimistic);
    // PR-12: group-header menu mutations arrive as events (SidebarShell owns the menu UI;
    // App owns group state). PR-14: persistence deixou os updaters — o effect da fatia
    // App-owned observa o estado e grava o blob merged no SQLite (debounced 250ms).
    //
    // D03a-021/082/087: every event is host-qualified. The handler resolves the event's
    // `hostId` against the hosts the catalog actually owns, mutates only that host's
    // bucket, and answers with `hydra:refresh-projects` only when it applied something —
    // a silent no-op would leave the sidebar claiming success it cannot persist.
    const resolveEventGroupHost = (hostId: unknown) => {
      const knownHostIds = collectKnownProjectGroupHostIds(useAppStore.getState().repos);
      // A bucket Hydra already persists is addressable even when no live repo row
      // names the host (e.g. the repo list has not hydrated yet this boot).
      for (const persistedHostId of Object.keys(projectGroupStateRef.current.groupsByHost)) {
        knownHostIds.add(persistedHostId);
      }
      return resolveProjectGroupHost(hostId, knownHostIds);
    };
    const acknowledgeProjectGroupChange = () => {
      window.dispatchEvent(new CustomEvent("hydra:refresh-projects"));
    };
    const handleCreateProjectGroup = (e: Event) => {
      const detail = (e as CustomEvent<{ name?: unknown; projectId?: unknown; hostId?: unknown }>).detail;
      if (!detail) return;
      const host = resolveEventGroupHost(detail.hostId);
      if (!host.ok) return;
      const result = createProjectGroupInHost(projectGroupStateRef.current, {
        hostId: host.hostId,
        name: typeof detail.name === "string" ? detail.name : "",
        projectId: typeof detail.projectId === "string" ? detail.projectId : undefined,
      });
      if (!result.ok) return;
      applyProjectGroupHostState(result.state);
      acknowledgeProjectGroupChange();
    };
    const handleMoveProjectToGroup = (e: Event) => {
      const detail = (e as CustomEvent<{ projectId?: unknown; groupId?: unknown; hostId?: unknown }>).detail;
      if (!detail || typeof detail.projectId !== "string" || typeof detail.groupId !== "string") return;
      const host = resolveEventGroupHost(detail.hostId);
      if (!host.ok) return;
      const result = moveProjectToGroupInHost(projectGroupStateRef.current, {
        hostId: host.hostId,
        projectId: detail.projectId,
        groupId: detail.groupId,
      });
      if (!result.ok) return;
      applyProjectGroupHostState(result.state);
      acknowledgeProjectGroupChange();
    };
    const handleRemoveProjectFromGroup = (e: Event) => {
      const detail = (e as CustomEvent<{ projectId?: unknown; hostId?: unknown }>).detail;
      if (!detail || typeof detail.projectId !== "string") return;
      const host = resolveEventGroupHost(detail.hostId);
      if (!host.ok) return;
      const result = removeProjectFromGroupInHost(projectGroupStateRef.current, {
        hostId: host.hostId,
        projectId: detail.projectId,
      });
      if (!result.ok) return;
      applyProjectGroupHostState(result.state);
      acknowledgeProjectGroupChange();
    };
    const handleRenameProjectGroup = (e: Event) => {
      const detail = (e as CustomEvent<{ id?: unknown; name?: unknown; hostId?: unknown }>).detail;
      if (!detail || typeof detail.id !== "string" || typeof detail.name !== "string") return;
      const host = resolveEventGroupHost(detail.hostId);
      if (!host.ok) return;
      const result = renameProjectGroupInHost(projectGroupStateRef.current, {
        hostId: host.hostId,
        id: detail.id,
        name: detail.name,
      });
      if (!result.ok) return;
      applyProjectGroupHostState(result.state);
      acknowledgeProjectGroupChange();
    };
    const handleUpdateProjectGroup = (e: Event) => {
      // Manual order from the group-header drop (D03a-021): the sidebar forwards the
      // group row's owner host, so the re-sort lands in that bucket only.
      const detail = (e as CustomEvent<{ id?: unknown; tabOrder?: unknown; hostId?: unknown }>).detail;
      if (!detail || typeof detail.id !== "string" || typeof detail.tabOrder !== "number") return;
      const host = resolveEventGroupHost(detail.hostId);
      if (!host.ok) return;
      const result = updateProjectGroupOrderInHost(projectGroupStateRef.current, {
        hostId: host.hostId,
        id: detail.id,
        tabOrder: detail.tabOrder,
      });
      if (!result.ok) return;
      applyProjectGroupHostState(result.state);
      acknowledgeProjectGroupChange();
    };
    const handleDeleteProjectGroup = (e: Event) => {
      const detail = (e as CustomEvent<{
        id?: unknown;
        hostId?: unknown;
        groupName?: unknown;
        removeProjects?: unknown;
        removeProjectPaths?: unknown;
      }>).detail;
      if (!detail || typeof detail.id !== "string") return;
      const host = resolveEventGroupHost(detail.hostId);
      if (!host.ok) return;
      const removeProjects = normalizeContainedProjectRemovals(detail);
      const deletion = deleteProjectGroupInHost(projectGroupStateRef.current, {
        hostId: host.hostId,
        id: detail.id,
      });
      if (!deletion.ok) return;
      applyProjectGroupHostState(deletion.state);
      acknowledgeProjectGroupChange();
      if (removeProjects.length === 0) return;
      // Orca `removeContainedProjects`: each project reports its own removal, so a
      // single failed project cannot hide behind a success for the rest.
      void removeContainedProjectsForGroup({
        hostId: host.hostId,
        projects: removeProjects,
        removeProject: (project) => invoke("remove_project", { path: project.path }),
      }).then((outcome) => {
        if (outcome.ok) return;
        const groupLabel =
          typeof detail.groupName === "string" && detail.groupName.trim()
            ? detail.groupName.trim()
            : detail.id;
        toast.error("Some projects could not be removed", {
          description: `${outcome.failedProjectIds.length} of ${removeProjects.length} contained project(s) remained in "${groupLabel}": ${outcome.failedProjectIds.join(", ")}`,
        });
      });
    };
    window.addEventListener("hydra:create-project-group", handleCreateProjectGroup);
    window.addEventListener("hydra:move-project-to-group", handleMoveProjectToGroup);
    window.addEventListener("hydra:remove-project-from-group", handleRemoveProjectFromGroup);
    window.addEventListener("hydra:rename-project-group", handleRenameProjectGroup);
    window.addEventListener("hydra:update-project-group", handleUpdateProjectGroup);
    window.addEventListener("hydra:delete-project-group", handleDeleteProjectGroup);
    const handleOpenJumpPalette = () => setIsJumpPaletteOpen(true);
    window.addEventListener("hydra:open-jump-palette", handleOpenJumpPalette);
    // Why: the sidebar's host-header menu is many layers below App, so it cannot call
    // setIsSettingsOpen directly; this is the same event bus sibling deep links use, and
    // the modal still opens through App's single settings state.
    const handleOpenSettingsPane = (e: Event) => {
      const detail = (e as CustomEvent<{ section?: HydraNavId }>).detail;
      if (!detail?.section) return;
      setSettingsSectionRequested(detail.section);
      setIsSettingsOpen(true);
    };
    window.addEventListener("hydra:open-settings", handleOpenSettingsPane);

    // Orca-ported store slices reach host state through `window.api`; install the
    // bridge before any slice call can happen.
    installOrcaApiShim();

    invoke<AvailableAgent[]>("list_available_agents")
      .then(setAvailableAgents)
      .catch(console.error);
    invoke<{ id: string; label: string; path: string }>("get_default_system_shell")
      .then((shell) => {
        if (shell?.id) {
          setSystemDefaultShell(shell.id);
        }
      })
      .catch(() => {});


    invoke<HydraSettings>("get_settings").then((s) => {
      if (s) {
        const n = normalizeHydraSettings(s);
        setHydraSettings(n);
        applyDocumentTheme(n.theme);
        try { localStorage.setItem("hydra:theme", n.theme); } catch {}
      }
    }).catch(() => {
      const savedTheme = localStorage.getItem("hydra:theme") as "dark" | "light" | "system" | null;
      applyDocumentTheme(savedTheme ?? "dark");
    });

    // Listen for system theme changes when theme=system
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      invoke<HydraSettings>("get_settings").then((s) => {
        if (s) {
          const n = normalizeHydraSettings(s);
          if (n.theme === "system") applyDocumentTheme("system");
        }
      }).catch(()=>{});
    };
    mql.addEventListener("change", onSystemChange);

    invoke<GitRepoStatus>("get_repo_git_status")
      .then(setGitStatus)
      .catch(console.error);
    return () => {
      window.removeEventListener("hydra:create-project-group", handleCreateProjectGroup);
      window.removeEventListener("hydra:move-project-to-group", handleMoveProjectToGroup);
      window.removeEventListener("hydra:remove-project-from-group", handleRemoveProjectFromGroup);
      window.removeEventListener("hydra:rename-project-group", handleRenameProjectGroup);
      window.removeEventListener("hydra:update-project-group", handleUpdateProjectGroup);
      window.removeEventListener("hydra:delete-project-group", handleDeleteProjectGroup);
      window.removeEventListener("hydra:open-settings", handleOpenSettingsPane);
      window.removeEventListener(PROJECT_ICON_OPTIMISTIC_EVENT, handleProjectIconOptimistic);
      mql.removeEventListener("change", onSystemChange);
    };
  }, []);

  const loadSessionsForProject = (projectPath: string) => {
    invoke<DbSessionRecord[]>("list_persisted_sessions", { projectPath })
      .then((persisted) => {
        if (persisted && persisted.length > 0) {
          // Dedupe por conteúdo (project_path+executable+title) — evita 2x OpenCode
          const seenSess = new Set<string>();
          const dedupedPersisted = persisted.filter((p) => {
            const k = `${p.project_path}|${p.executable}|${p.title}`;
            if (seenSess.has(k)) return false;
            seenSess.add(k);
            return true;
          });
          let loaded: WorktreeSession[] = dedupedPersisted.map((p, idx) => ({
            id: p.id,
            project_path: p.project_path,
            title: p.title,
            branch: p.branch,
            agentName: p.agent_name,
            executable: p.executable,
            state: "idle",
            active: idx === 0,
            created_at: p.created_at,
            updated_at: p.updated_at,
          }));
          try {
            const saved = localStorage.getItem("hydra:sessions_order");
            if (saved) {
              const order: string[] = JSON.parse(saved);
              loaded = [...loaded].sort((a, b) => {
                const idxA = order.indexOf(a.id);
                const idxB = order.indexOf(b.id);
                if (idxA === -1 && idxB === -1) return 0;
                if (idxA === -1) return 1;
                if (idxB === -1) return -1;
                return idxA - idxB;
              });
            }
          } catch {}
          setSessions(loaded);
          // Race fix: se workbench ainda não foi checado, não cria tab — deixa workbench decidir.
          // Só cria initial tab se workbench já foi checado e ainda está no default (first run).
          if (!workbenchCheckedRef.current) return;
          const hasRealTabs = tabsRef.current.length > 1 || (tabsRef.current.length === 1 && tabsRef.current[0].id !== "tab_main");
          if (!hasRealTabs) {
            const firstTabId = `tab_${loaded[0].id}`;
            setTabs([
              {
                id: firstTabId,
                title: `${loaded[0].executable} (active)`,
                type: "terminal",
                sessionId: loaded[0].id,
                executable: loaded[0].executable,
                cwd: loaded[0].project_path || projectPath,
              },
            ]);
            setActiveTabId(firstTabId);
          }
        } else {
          // Sprint 3 #11 Orca parity: do not create fake Main Terminal Session — workspace only exists with agent
          setSessions([]);
        }
      })
      .catch(console.error);
  };

  // Load ALL sessions from ALL projects (for Agents view) — com dedupe
  const loadAllSessions = () => {
    invoke<DbSessionRecord[]>("list_persisted_sessions", { projectPath: null })
      .then((persisted) => {
        if (persisted && persisted.length > 0) {
          const seenSess = new Set<string>();
          const dedupedPersisted = persisted.filter((p) => {
            const k = `${p.project_path}|${p.executable}|${p.title}`;
            if (seenSess.has(k)) return false;
            seenSess.add(k);
            return true;
          });
          let loaded: WorktreeSession[] = dedupedPersisted.map((p, idx) => ({
            id: p.id,
            project_path: p.project_path,
            title: p.title,
            branch: p.branch,
            agentName: p.agent_name,
            executable: p.executable,
            state: "idle",
            active: idx === 0,
            created_at: p.created_at,
            updated_at: p.updated_at,
          }));
          try {
            const saved = localStorage.getItem("hydra:sessions_order");
            if (saved) {
              const order: string[] = JSON.parse(saved);
              loaded = [...loaded].sort((a, b) => {
                const idxA = order.indexOf(a.id);
                const idxB = order.indexOf(b.id);
                if (idxA === -1 && idxB === -1) return 0;
                if (idxA === -1) return 1;
                if (idxB === -1) return -1;
                return idxA - idxB;
              });
            }
          } catch {}
          setSessions(loaded);
          if (!workbenchCheckedRef.current) return;
          const hasRealTabs = tabsRef.current.length > 1 || (tabsRef.current.length === 1 && tabsRef.current[0].id !== "tab_main");
          if (!hasRealTabs) {
            const firstTabId = `tab_${loaded[0].id}`;
            setTabs([
              {
                id: firstTabId,
                title: `${loaded[0].executable} (active)`,
                type: "terminal",
                sessionId: loaded[0].id,
                executable: loaded[0].executable,
                cwd: loaded[0].project_path,
              },
            ]);
            setActiveTabId(firstTabId);
          }
        } else if (activeProject) {
          // Sprint 3 #11 Orca parity: do not auto-create Main Terminal — keep empty
          setSessions([]);
        } else {
          setSessions([]);
        }
      })
      .catch(console.error);
  };

  // Live polling of Herdr state engine + keep-awake sync (Orca AgentAwakeService auto)
  useEffect(() => {
    // Initial sync on hydraSettings change
    const workingInitial = sessions.filter((s) => s.state === "working").length;
    syncKeepAwake(Boolean(hydraSettings.keep_computer_awake_while_agents_run), workingInitial);
  }, [hydraSettings, sessions.map(s=>s.state).join(",")]);

  // Sprint 2 P0: push via agent:state event (<500ms) — primary; polling is fallback
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;
    const setup = async () => {
      try {
        const un = await listen<{ session_id?: string; sessionId?: string; state: string; state_started_at?: number; tool_name?: string; toolName?: string; tool_input?: string; toolInput?: string; interrupted?: boolean; session_boundary?: boolean; sessionBoundary?: boolean; source?: string }>("agent:state", (event) => {
          const payload = event.payload as unknown as Record<string, unknown>;
          const sid = (payload.sessionId as string) ?? (payload.session_id as string) ?? (payload.id as string);
          const state = payload.state as string;
          // PR-6: the Rust engine stamps the epoch ms the state began — feeds the
          // smart-attention sort tiebreak. Legacy daemons omit it; the sort falls back.
          const stateStartedAt = payload.state_started_at;
          if (!sid || !state) return;
          setSessions((prev) => {
            const target = prev.find((s) => s.id === sid);
            if (!target) return prev;
            if (target.state === state) return prev;
            const toolName = typeof payload.tool_name === "string" ? payload.tool_name : typeof payload.toolName === "string" ? payload.toolName : undefined;
            const toolInput = typeof payload.tool_input === "string" ? payload.tool_input : typeof payload.toolInput === "string" ? payload.toolInput : undefined;
            const lastMsg = typeof payload.last_assistant_message === "string" ? payload.last_assistant_message : undefined;
            const subagents = Array.isArray(payload.subagents) ? (payload.subagents as WorktreeSession["subagents"]) : undefined;

            const next = prev.map((s) =>
              s.id === sid
                ? {
                    ...s,
                    state: state as WorktreeSession["state"],
                    state_started_at: typeof stateStartedAt === "number" ? stateStartedAt : s.state_started_at,
                    tool_name: toolName ?? s.tool_name,
                    tool_input: toolInput ?? s.tool_input,
                    last_assistant_message: lastMsg ?? s.last_assistant_message,
                    subagents: subagents ?? s.subagents,
                  }
                : s
            );
            const wc = next.filter((s) => s.state === "working").length;
            syncKeepAwake(Boolean(hydraSettings.keep_computer_awake_while_agents_run), wc);

            // PR-15: unread badge driven by agent:state transitions.
            // A session that transitions to a needing-attention state without
            // being the active session marks its worktree + project unread.
            // Cleared below in handleSelectSession / handleSelectWorkbenchTab.
            const updated = next.find((s) => s.id === sid);
            if (updated && (state === "blocked" || state === "waiting" || state === "done")) {
              const isActiveSession = Boolean(updated.active);
              const hasVisibleTab = tabsRef.current.some((t) => t.sessionId === sid || t.id === `tab_${sid}`);
              const isActiveTab = hasVisibleTab && tabsRef.current.find((t) => t.sessionId === sid || t.id === `tab_${sid}`)?.id === activeTabIdRef.current;
              if (!isActiveSession || !isActiveTab) {
                if (updated.project_path) markUnreadWorktree(updated.project_path);
                markUnreadWorktree(updated.id);
                // Propagate to the owning project so the project header also glows
                const proj = projectsRef.current.find((p) => updated.project_path === p.path || updated.project_path.startsWith(p.path + "/"));
                if (proj) markUnreadProject(proj.id);
              }
            }
            return next;
          });
        });
        if (!cancelled) unlisten = un;
        else un();
      } catch {
        // ignore if not in Tauri (browser preview)
      }
    };
    setup();
    return () => {
      cancelled = true;
      if (unlisten) try { unlisten(); } catch {}
    };
  }, [hydraSettings]);

  // Fallback polling — push is primary (<500ms), poll every 5s for resilience / daemon without push
  useEffect(() => {
    const interval = setInterval(() => {
      const currentActive = sessions.find((s) => s.active);
      if (currentActive) {
        invoke<{
          state: string;
          tool_name?: string;
          tool_input?: string;
          last_assistant_message?: string;
          subagents?: WorktreeSession["subagents"];
          coordinator_handle?: string;
          parent_pane_key?: string;
        }>("check_agent_detailed_status", { sessionId: currentActive.id })
          .then((detailed) => {
            if (detailed && detailed.state) {
              setSessions((prev) => {
                const next = prev.map((s) =>
                  s.active
                    ? {
                        ...s,
                        state: detailed.state as WorktreeSession["state"],
                        tool_name: detailed.tool_name ?? s.tool_name,
                        tool_input: detailed.tool_input ?? s.tool_input,
                        last_assistant_message: detailed.last_assistant_message ?? s.last_assistant_message,
                        subagents: detailed.subagents ?? s.subagents,
                        coordinator_handle: detailed.coordinator_handle ?? s.coordinator_handle,
                        parent_pane_key: detailed.parent_pane_key ?? s.parent_pane_key,
                      }
                    : s
                );
                const wc = next.filter((s) => s.state === "working").length;
                syncKeepAwake(Boolean(hydraSettings.keep_computer_awake_while_agents_run), wc);
                return next;
              });
            } else {
              const wc = sessions.filter((s) => s.state === "working").length;
              syncKeepAwake(Boolean(hydraSettings.keep_computer_awake_while_agents_run), wc);
            }
          })
          .catch(() => {
            // Fallback to basic state check
            invoke<string>("check_agent_state", { sessionId: currentActive.id })
              .then((detectedState) => {
                if (detectedState) {
                  setSessions((prev) => prev.map((s) => s.active ? { ...s, state: detectedState as WorktreeSession["state"] } : s));
                }
              })
              .catch(() => {});
          });
      } else {
        const wc = sessions.filter((s) => s.state === "working").length;
        syncKeepAwake(Boolean(hydraSettings.keep_computer_awake_while_agents_run), wc);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [sessions, hydraSettings]);

  // Poll keep-awake status for UI indicator (like Orca CaffeinateStatusSegment) — fallback, push is primary
  useEffect(() => {
    const id = setInterval(() => {
      invoke<{ enabled: boolean; working_count: number; active: boolean }>("get_keep_awake_status")
        .then((s) => setKeepAwakeActive(s.active))
        .catch(()=>{});
    }, 3000);
    invoke<{ enabled: boolean; working_count: number; active: boolean }>("get_keep_awake_status")
      .then((s) => setKeepAwakeActive(s.active))
      .catch(()=>{});
    return () => clearInterval(id);
  }, []);

  // Sprint 2 P0: push keep_awake:status (<500ms) — primary, polling fallback above
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;
    const setup = async () => {
      try {
        const un = await listen<{ enabled: boolean; working_count: number; active: boolean }>("keep_awake:status", (event) => {
          setKeepAwakeActive(event.payload.active);
        });
        if (!cancelled) unlisten = un;
        else un();
      } catch {}
    };
    setup();
    return () => {
      cancelled = true;
      if (unlisten) try { unlisten(); } catch {}
    };
  }, []);

  const handleSelectProject = useCallback((proj: HydraProject) => {
    setActiveProject(proj);
    setActiveWorktreePath(proj.path);
    prevProjectPathRef.current = proj.path;
    if (!workbenchLoaded) {
      loadSessionsForProject(proj.path);
    }
    refreshGitWorktrees(proj.path);
    // Orca has no "switched workspace" chat message; the activation itself is the
    // feedback. Terminal activation lives in `handleActivateProject` (sidebar click).
  }, [workbenchLoaded, loadSessionsForProject, refreshGitWorktrees]);

  const handleNavigateWorkspace = useCallback((direction: "up" | "down") => {
    const projs = projectsRef.current;
    if (projs.length === 0) return;
    const current = activeProjectRef.current;
    const currentIdx = current
      ? projs.findIndex((p) => p.path === current.path)
      : -1;
    let nextIdx = 0;
    if (direction === "up") {
      nextIdx = currentIdx <= 0 ? projs.length - 1 : currentIdx - 1;
    } else {
      nextIdx = currentIdx >= projs.length - 1 ? 0 : currentIdx + 1;
    }
    handleSelectProject(projs[nextIdx]);
  }, [handleSelectProject]);

  const handleAssignWorktreeParent = useCallback(
    (parentWorktreePath: string, childWorktreePaths: readonly string[]) => {
      const repoPathByWorktreePath = new Map<string, string>();
      for (const [repoPath, list] of Object.entries(worktreesByProject)) {
        for (const worktree of list) repoPathByWorktreePath.set(worktree.path, repoPath);
      }
      const parentRepoPath = repoPathByWorktreePath.get(parentWorktreePath);
      if (!parentRepoPath) return;
      const nestable = childWorktreePaths.filter(
        (childPath) =>
          childPath !== parentWorktreePath &&
          repoPathByWorktreePath.get(childPath) === parentRepoPath
      );
      if (nestable.length === 0) return;
      void persistWorktreeLineageParents(nestable, parentWorktreePath).catch(() => {});
    },
    [persistWorktreeLineageParents, worktreesByProject]
  );

  const handleUnnestWorktrees = useCallback(
    (childWorktreePaths: readonly string[]) => {
      void clearWorktreeLineageParents(childWorktreePaths).catch(() => {});
    },
    [clearWorktreeLineageParents]
  );

  const handleRemoveProject = (proj: HydraProject) => {
    invoke("catalog_remove_repo", { path: proj.path })
      .then(() => {
        invoke<CatalogEnvelope>("catalog_get").then((envelope) => {
          const model = catalogToSidebarModel(envelope);
          setProjects(model.projects);
          applyCatalogProjectGroups(model);
          setFolderWorkspaces(model.folderWorkspaces);
          if (activeProject?.path === proj.path) {
            if (model.projects.length > 0) {
              handleSelectProject(model.projects[0]);
            } else {
              setActiveProject(null);
              setSessions([]);
            }
          }
        });
      })
      .catch(console.error);
  };

  const handleSelectGitWorktree = (wt: GitWorktreeInfo) => {
    clearUnreadWorktree(wt.path);
    const owningProj = projectsRef.current.find((p) => wt.path === p.path || wt.path.startsWith(p.path + "/"));
    if (owningProj) {
      if (!activeProject || activeProject.path !== owningProj.path) {
        setActiveProject(owningProj);
      }
      clearUnreadProject(owningProj.id);
    }

    const prevPath = currentWorkspacePathRef.current;
    if (prevPath === wt.path && tabsRef.current.length > 0) {
      const existingSession =
        sessions.find((s) => s.project_path === wt.path && s.active) ||
        sessions.find((s) => s.project_path === wt.path);
      if (existingSession) {
        setSessions((prev) => prev.map((s) => ({ ...s, active: s.id === existingSession.id })));
      }
      return;
    }

    // 1. Save current tabs for previous workspace before switching
    if (prevPath && prevPath !== wt.path && tabsRef.current.length > 0) {
      const prevState: WorkbenchState = {
        tabs_json: JSON.stringify(tabsRef.current),
        active_tab_id: activeTabIdRef.current,
        updated_at: Date.now(),
      };
      invoke("save_workbench_persistence_for_project", { projectPath: prevPath, state: prevState }).catch(console.error);
    }

    // 2. Set active worktree
    setActiveWorktreePath(wt.path);
    // Why after selection: a failed provider resume keeps the workspace selected;
    // the wake never rolls activation back (D15a-011). Local/SSH hosts have no
    // `ephemeralVm` bridge, so this is a no-op there.
    void wakeEphemeralVmForSleptWorktree(wt.path);
    prevProjectPathRef.current = wt.path;

    // 3. Update active session if one exists for this worktree
    const existingSession =
      sessions.find((s) => s.project_path === wt.path && s.active) ||
      sessions.find((s) => s.project_path === wt.path);
    if (existingSession) {
      setSessions((prev) => prev.map((s) => ({ ...s, active: s.id === existingSession.id })));
      clearUnreadWorktree(existingSession.id);
    }

    // 4. Load persisted tabs for this worktree from SQLite
    invoke<WorkbenchState>("get_workbench_persistence_for_project", { projectPath: wt.path })
      .then((state) => {
        let loadedTabs: TabItem[] = [];
        if (state && state.tabs_json && state.tabs_json !== "[]" && state.tabs_json !== "null") {
          try {
            const raw = JSON.parse(state.tabs_json) as TabItem[];
            const seenSid = new Set<string>();
            loadedTabs = raw.filter((t) => {
              if (t.sessionId) {
                if (seenSid.has(t.sessionId)) return false;
                seenSid.add(t.sessionId);
              }
              return true;
            });
            const firstTab = loadedTabs[0];
            const isDefaultBash =
              loadedTabs.length === 1 &&
              firstTab?.id === "tab_main" &&
              firstTab?.title === "bash (active)" &&
              !firstTab?.sessionId;
            if (isDefaultBash) {
              loadedTabs = [];
            }
          } catch {
            loadedTabs = [];
          }
        }

        if (loadedTabs.length > 0) {
          setTabs(loadedTabs);
          if (state.active_tab_id && loadedTabs.some((t) => t.id === state.active_tab_id)) {
            setActiveTabId(state.active_tab_id);
          } else {
            setActiveTabId(loadedTabs[0].id);
          }
          setWorkbenchLoaded(true);
        } else {
          // Orca Parity: Worktree has NO existing tabs -> auto-spawn initial terminal tab!
          const sh = resolveDefaultShell();
          const tabId = `tab_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
          const initialTab: TabItem = {
            id: tabId,
            title: "Terminal 1",
            type: "terminal",
            executable: sh,
            cwd: wt.path,
          };
          setTabs([initialTab]);
          setActiveTabId(tabId);
          setWorkbenchLoaded(true);
          invoke("save_workbench_persistence_for_project", {
            projectPath: wt.path,
            state: {
              tabs_json: JSON.stringify([initialTab]),
              active_tab_id: tabId,
              updated_at: Date.now(),
            },
          }).catch(console.error);
        }
      })
      .catch(() => {
        // Fallback: spawn initial terminal tab
        const sh = resolveDefaultShell();
        const tabId = `tab_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const initialTab: TabItem = {
          id: tabId,
          title: "Terminal 1",
          type: "terminal",
          executable: sh,
          cwd: wt.path,
        };
        setTabs([initialTab]);
        setActiveTabId(tabId);
        setWorkbenchLoaded(true);
      });
  };

  /**
   * Resolves the repo a worktree belongs to. Orca refuses the delete when this
   * cannot be proven (`isContextWorktreeDeletable`), because the backend needs a
   * `repoPath`; a silent no-op after the confirmation is not acceptable.
   */
  const resolveWorktreeRepoPath = useCallback((worktreePath: string): string | null => {
    for (const proj of projectsRef.current) {
      if (!proj.is_git) continue;
      if (proj.path === worktreePath) return proj.path;
      const list = worktreesByProject[proj.path];
      if (list?.some((worktree) => worktree.path === worktreePath)) return proj.path;
    }
    return null;
  }, [worktreesByProject]);

  const findWorktreeByIdentity = useCallback(
    (identity: WorktreeDeleteIdentity) => {
      for (const [repoPath, list] of Object.entries(worktreesByProject)) {
        const worktree = list.find((entry) => (entry.id ?? `${repoPath}::${entry.path}`) === identity.id);
        if (!worktree) continue;
        const hostId = getExecutionHostIdForRepoPath(storeRepos, repoPath);
        if (identity.hostId && hostId && identity.hostId !== hostId) continue;
        return {
          worktree,
          repoPath,
          hostId,
          isMain: worktree.is_main ?? worktree.isMainWorktree ?? worktree.path === repoPath,
        };
      }
      return null;
    },
    [storeRepos, worktreesByProject]
  );

  const refreshAfterDelete = useCallback((repoPaths: Iterable<string>) => {
    for (const repoPath of new Set(repoPaths)) {
      if (repoPath) refreshGitWorktrees(repoPath);
    }
    if (activeProject && ![...repoPaths].includes(activeProject.path)) {
      refreshGitWorktrees(activeProject.path);
    }
    window.dispatchEvent(new CustomEvent("hydra:refresh-projects"));
  }, [activeProject]);

  /** Orca `viewWorktreeDiff`: land on the pending changes instead of deleting blind. */
  const viewWorktreeChanges = useCallback(async (worktreePath: string) => {
    try {
      const numstat = await invoke<{ path: string }[]>("get_diff_numstat_cmd", {
        repoPath: worktreePath,
        staged: false,
      });
      const first = numstat[0]?.path;
      if (!first) {
        invoke("open_in_file_manager", { path: worktreePath }).catch(console.error);
        return;
      }
      const diff = await invoke<string>("git_diff_cmd", {
        repoPath: worktreePath,
        file: first,
        staged: false,
      });
      const tabId = `tab_diff_${first}_wt`;
      setFileTabContents((prev) => ({ ...prev, [tabId]: { original: "", modified: diff, lang: "diff" } }));
      setTabs((prev) => (prev.some((tab) => tab.id === tabId) ? prev : [...prev, { id: tabId, title: first, type: "diff" }]));
      setActiveTabId(tabId);
    } catch (error) {
      console.error("Failed to open the workspace diff:", error);
    }
  }, []);

  /**
   * One delete executor for the dialog, the skip-confirm preference and the
   * recovery toast: parallel across (host, repo) groups, child-first inside each
   * group, immediate per-row progress, aggregated failure toasts.
   */
  const runDeleteIdentitiesNow = useCallback(
    async (
      identities: readonly WorktreeDeleteIdentity[],
      options: { force?: boolean; allowArchiveSkip?: boolean } = {}
    ) => {
      const targets: ParallelDeleteTarget[] = [];
      for (const identity of identities) {
        const live = deleteLiveTargets.find(
          (row) =>
            row.id === identity.id &&
            row.hostId === identity.hostId &&
            row.instanceId === identity.instanceId
        );
        if (!live) continue;
        targets.push({
          id: live.id,
          instanceId: live.instanceId,
          hostId: live.hostId,
          path: live.path,
          repoPath: live.repoPath ?? resolveWorktreeRepoPath(live.path) ?? "",
          displayName: live.displayName,
        });
      }
      if (targets.length === 0) {
        showWorkspaceListChangedToast();
        return { deletedPaths: [], failures: [], missing: true };
      }
      const identitiesByPath = new Map(
        identities.map((identity) => [identity.id, identity])
      );
      const failureByPath = new Map<string, string>();
      const dirtyByPath = dirtyChangeCountsByWorktreeId;
      // Why: Hydra keeps `activeWorktreePath` until the next explicit selection,
      // so a successful delete must clear it before the successor hand-off runs.
      // `onDeleted` fires before the runner commits focus, which makes this set
      // the authoritative "the viewed row is gone" signal.
      const deletedPaths = new Set<string>();
      const commitFocus = prepareActiveWorktreeFocusAfterDelete({
        targetPath: activeWorktreePathRef.current ?? "",
        activeWorktreePath: activeWorktreePathRef.current,
        getActiveWorktreePath: () => {
          const current = activeWorktreePathRef.current;
          if (!current) return null;
          return deletedPaths.has(current) ? null : current;
        },
        pickNextPath: (deletedPath) => {
          for (const proj of projectsRef.current) {
            const rows = (worktreesByProject[proj.path] ?? []).filter(
              (row) => row.path !== deletedPath && !deletedPaths.has(row.path)
            );
            if (rows.length === 0) {
              if (proj.path !== deletedPath) return proj.path;
              continue;
            }
            // Orca preference: another non-primary workspace, most recently
            // visited first; the project's primary checkout is the fallback.
            const isMainRow = (row: (typeof rows)[number]): boolean =>
              Boolean(row.is_main ?? row.isMainWorktree ?? (row.path === proj.path))
            const others = rows.filter((row) => !isMainRow(row))
            if (others.length > 0) {
              return others[0].path;
            }
            return rows.find((row) => isMainRow(row))?.path ?? rows[0].path;
          }
          return null;
        },
        focusPath: (nextPath) => {
          const row = Object.values(worktreesByProject)
            .flat()
            .find((worktree) => worktree.path === nextPath);
          if (row) handleSelectGitWorktree(row);
        },
      });
      const outcome = await runWorktreeDeletesInParallel(targets, {
        resolveLiveTarget: (id, hostId) => {
          const live = deleteLiveTargets.find(
            (row) => row.id === id && (!hostId || row.hostId === hostId)
          );
          return live
            ? {
                id: live.id,
                instanceId: live.instanceId,
                hostId: live.hostId,
                path: live.path,
                repoPath: live.repoPath ?? "",
                displayName: live.displayName,
              }
            : undefined;
        },
        deleteOptions: options,
        deleteTarget: async (target, targetOptions) => {
          try {
            const result = await invoke<{
              path: string;
              removed: boolean;
              preserved_branches?: { branch_name: string; head?: string | null }[];
            } | null>("delete_worktree", {
              repoPath: target.repoPath,
              worktreePath: target.path,
              force: targetOptions.force === true,
              allowArchiveSkip: targetOptions.allowArchiveSkip === true,
              // Remote owners route the same command to their host-aware path.
              ...(target.hostId ? { hostId: target.hostId } : {}),
            });
            const preserved = result?.preserved_branches?.[0];
            return preserved?.branch_name
              ? {
                  ok: true,
                  preservedBranch: {
                    worktreeId: target.id,
                    branchName: preserved.branch_name,
                    ...(target.hostId ? { hostId: target.hostId } : {}),
                  },
                }
              : { ok: true };
          } catch (error) {
            return { ok: false, error: String(error) };
          }
        },
        markDeleting: (rows) => {
          publishDeleteStateForTargets(
            rows
              .map((row) => identitiesByPath.get(row.id))
              .filter((identity): identity is WorktreeDeleteIdentity => Boolean(identity)),
            WORKTREE_DELETE_IN_PROGRESS
          );
        },
        clearDeleting: (row) => {
          const identity = identitiesByPath.get(row.id);
          if (identity) publishDeleteStateForTargets([identity], null);
        },
        onFailure: (target, error) => {
          failureByPath.set(target.path, error);
          const failure = describeWorktreeDeleteFailure(error, target.path);
          const identity = identitiesByPath.get(target.id);
          showDeleteWorktreeFailureToast({
            target: {
              id: target.id,
              executionHostId: target.hostId ?? null,
            },
            worktreeName: target.displayName ?? target.path,
            summary: failure.summary,
            guidance: failure.guidance,
            canForceDelete: failure.canForce && options.force !== true,
            hasKnownChanges:
              (dirtyByPath[target.path] ?? 0) > 0 ||
              failure.summary.toLowerCase().includes("uncommitted"),
            // Only the archive-hook refusal has a waiver; Git's dirty/locked
            // refusals are recovered with Force Delete instead.
            canDeleteAnyway: failure.canWaiveArchiveHook,
            onViewChanges: () => {
              void viewWorktreeChanges(target.path);
            },
            onForceDelete: () => {
              if (identity) void runDeleteIdentitiesNow([identity], { force: true });
            },
            onDeleteAnyway: () => {
              if (identity) void runDeleteIdentitiesNow([identity], { allowArchiveSkip: true });
            },
          });
        },
        onListChanged: showWorkspaceListChangedToast,
        showPreservedBranches: (deletedCount, branches) => {
          showPreservedBranchBatchToast(deletedCount, branches);
        },
        onDeleted: (rows) => {
          const repoPaths = rows.map((row) => row.repoPath).filter(Boolean);
          for (const row of rows) deletedPaths.add(row.path);
          // A deleted workspace must not leave a durable sleep marker behind: a
          // later workspace reusing the path would boot asleep.
          for (const row of rows) forgetWorktreeSleepIntent(row.path);
          refreshAfterDelete(repoPaths);
          setDeleteStateByWorktreeId((prev) => {
            const next = { ...prev };
            for (const row of rows) {
              const identity = identitiesByPath.get(row.id);
              if (identity) delete next[getDeleteStateKeyForWorktreeHost(identity)];
              delete next[row.path];
            }
            return next;
          });
        },
        commitFocus,
      });
      // A failed target keeps its recovery toast; everything else is refreshed.
      if (outcome.failed.length > 0) {
        refreshAfterDelete(targets.map((target) => target.repoPath));
      }
      return {
        deletedPaths: outcome.deleted.map((target) => target.path),
        failures: outcome.failed.map((target) => ({
          path: target.path,
          error: failureByPath.get(target.path) ?? "Failed to delete workspace",
        })),
        missing: outcome.listChanged,
      };
    },
    [
      activeProject,
      deleteLiveTargets,
      dirtyChangeCountsByWorktreeId,
      handleSelectGitWorktree,
      projectsRef,
      publishDeleteStateForTargets,
      refreshAfterDelete,
      resolveWorktreeRepoPath,
      viewWorktreeChanges,
      worktreesByProject,
    ]
  );

  /** Opens the confirmation for one or many confirmed identities. */
  const openDeleteWorktreeConfirmation = useCallback(
    (identities: readonly WorktreeDeleteIdentity[]) => {
      const deduped = dedupeDeleteIntentTargets(identities, {
        isMainWorktree: (identity) => Boolean(findWorktreeByIdentity(identity)?.isMain),
        isDeleting: (identity) =>
          Boolean(deleteStateByWorktreeId[getDeleteStateKeyForWorktreeHost(identity)]?.isDeleting),
      });
      if (deduped.length === 0) {
        showNoDeletableWorkspacesToast();
        return;
      }
      const rows = deduped
        .map((identity) => findWorktreeByIdentity(identity))
        .filter((row): row is NonNullable<typeof row> => row !== null);
      if (rows.length === 0) {
        showNoDeletableWorkspacesToast();
        return;
      }
      if (rows.length === 1 && rows[0].isMain) {
        // Orca `confirm-remove-folder`: Git refuses to remove the primary
        // checkout; offer to remove the project from Hydra instead.
        setConfirmRemoveFolder({
          repoPath: rows[0].repoPath,
          displayName: rows[0].worktree.display_name ?? rows[0].worktree.displayName ?? rows[0].repoPath,
        });
        return;
      }
      setDeleteWorktreeModal({
        repoPath: rows[0].repoPath,
        worktrees: rows.map((row) => row.worktree),
        deleteTargets: deduped,
        error: null,
      });
    },
    [deleteStateByWorktreeId, findWorktreeByIdentity]
  );

  const handleDeleteWorktreeSelection = useCallback(
    (selected: readonly GitWorktreeInfo[], proj?: HydraProject) => {
      const project = proj ?? activeProject;
      if (!project) return;
      const deletable = selectDeletableWorktrees(selected, project.path);
      if (deletable.length === 0) {
        showNoDeletableWorkspacesToast();
        return;
      }
      const hostId =
        getExecutionHostIdForRepoPath(useAppStore.getState().repos, project.path) ?? undefined;
      // Orca batch funnel: dedupe by (id, host), drop main checkouts and in-flight
      // rows, and let the unified confirmation own the modal payload.
      openDeleteWorktreeConfirmation(
        deletable.map((worktree) => ({
          id: worktree.id ?? `${project.path}::${worktree.path}`,
          ...(hostId ? { hostId } : {}),
        }))
      );
    },
    [activeProject, openDeleteWorktreeConfirmation]
  );
  const handleDeleteGitWorktree = (wt: GitWorktreeInfo, owningProj?: HydraProject) => {
    // Orca `isContextWorktreeDeletable`: a delete without a resolvable repo has no
    // `repoPath` to hand the backend, so it must say so instead of no-op'ing.
    const repoPath = resolveWorktreeRepoPath(wt.path) ?? (owningProj?.is_git ? owningProj.path : null);
    if (!repoPath) {
      showWorkspaceListChangedToast();
      return;
    }
    const targetHostId = getExecutionHostIdForRepoPath(storeRepos, repoPath);
    const deleteTarget: WorktreeDeleteIdentity = {
      id: wt.id ?? `${repoPath}::${wt.path}`,
      ...(targetHostId ? { hostId: targetHostId } : {}),
    };
    const liveTarget = deleteLiveTargets.find(
      (row) =>
        row.id === deleteTarget.id &&
        row.hostId === deleteTarget.hostId &&
        row.instanceId === deleteTarget.instanceId
    );
    if (!liveTarget) {
      showWorkspaceListChangedToast();
      return;
    }
    const isMain = wt.is_main ?? wt.isMainWorktree ?? wt.path === repoPath;
    if (isMain) {
      // Git refuses to remove the primary checkout; offer the project removal the
      // menu already documents instead of leaving a dead destructive dialog.
      setConfirmRemoveFolder({
        repoPath,
        displayName: liveTarget.displayName ?? repoPath,
      });
      return;
    }
    // Orca `clearWorktreeDeleteState` before every new attempt.
    publishDeleteStateForTargets([deleteTarget], null);

    // A disconnected/ghost SSH host cannot run the remote removal; surface the
    // reconnect/forget decision instead of a backend refusal.
    const sshRepo = useAppStore.getState().repos.find((repo) => repo.path === repoPath) ?? null;
    const liveSshState = useAppStore.getState();
    const sshResolution = resolveSshWorkspaceForget({
      repo: sshRepo,
      sshConnectionStates: liveSshState.sshConnectionStates,
      sshTargetLabels: liveSshState.sshTargetLabels,
    });
    if (sshResolution.kind === 'ghost' || sshResolution.kind === 'disconnected') {
      setForgetSshTarget({
        resolution: sshResolution,
        repoPath,
        worktreePath: wt.path,
        displayName: liveTarget.displayName ?? wt.branch ?? wt.path,
      });
      return;
    }

    const lineage = getWorkspaceDeleteLineage(
      {
        id: wt.path,
        path: wt.path,
        ...(isMain ? { isMainWorktree: true } : {}),
      },
      lineageWorktreeRows,
      worktreeLineage
    );
    const hasLineageChildren = lineage.descendants.length > 0;
    if (hydraSettings.skip_delete_worktree_confirm && !hasLineageChildren) {
      void runDeleteIdentitiesNow([deleteTarget]);
      return;
    }
    setDeleteWorktreeModal({
      repoPath,
      worktrees: [wt],
      deleteTargets: [deleteTarget],
      error: null,
    });
  };

  /** D07-028: local-only forget for a disconnected/ghost SSH workspace. */
  const handleForgetSshWorkspace = useCallback(async (): Promise<boolean> => {
    const target = forgetSshTarget;
    if (!target) return false;
    try {
      await invoke<SshForgetWorkspaceResult>("ssh_forget_workspace", {
        connectionId: target.resolution.targetId,
        worktreePath: target.worktreePath,
      });
      setForgetSshTarget(null);
      toast.success("Workspace forgotten");
      await requestProjectsRefresh();
      return true;
    } catch (error) {
      toast.error("Could not forget the SSH workspace", {
        description: String(error),
      });
      return false;
    }
  }, [forgetSshTarget]);

  /** D07-028: probe the target, publish the connection state, then retry delete. */
  const handleReconnectAndDeleteSshWorkspace = useCallback(async (): Promise<boolean> => {
    const target = forgetSshTarget;
    if (!target) return false;
    const connectionId = target.resolution.targetId;
    const store = useAppStore.getState();
    store.setSshConnectionState(
      connectionId,
      buildSshConnectingState(connectionId, store.sshConnectionStates.get(connectionId))
    );
    try {
      const result = await invoke<SshReconnectResult>("ssh_reconnect_target", {
        connectionId,
      });
      const latest = useAppStore.getState();
      latest.setSshConnectionState(
        connectionId,
        buildSshReconnectConnectionState(
          result,
          latest.sshConnectionStates.get(connectionId)
        )
      );
      if (result.status !== "connected") {
        toast.error("SSH reconnect failed", {
          description: sshReconnectFailureMessage(result),
        });
        return false;
      }
      setForgetSshTarget(null);
      toast.success("SSH host reconnected");
      await requestProjectsRefresh();
      const row = (worktreesByProject[target.repoPath] ?? []).find(
        (worktree) => worktree.path === target.worktreePath
      );
      if (row) {
        handleDeleteGitWorktree(row);
      } else {
        toast.info("Host reconnected. Delete the workspace again from the sidebar.");
      }
      return true;
    } catch (error) {
      const latest = useAppStore.getState();
      const previous = latest.sshConnectionStates.get(connectionId);
      latest.setSshConnectionState(connectionId, {
        ...(previous ?? {
          targetId: connectionId,
          status: "disconnected" as const,
          error: null,
          reconnectAttempt: 0,
        }),
        targetId: connectionId,
        status: "reconnection-failed",
        error: String(error),
      });
      toast.error("SSH reconnect failed", { description: String(error) });
      return false;
    }
  }, [forgetSshTarget, worktreesByProject]);

  /**
   * Orca `hovered-workspace-delete`: Option/Alt + Backspace/Delete deletes the
   * row under the pointer immediately. Guards: no modal, no editable field, no
   * primary checkout, no in-flight delete, no duplicate folder request.
   */
  useEffect(() => {
    const deps: HoveredWorkspaceDeleteDependencies = {
      isModalOpen: () =>
        Boolean(
          deleteWorktreeModal ||
            folderDeleteTarget ||
            parentPickerState ||
            isSettingsOpen ||
            isNewWorkspaceOpen ||
            isAddRepoOpen ||
            isCommandPaletteOpen ||
            isJumpPaletteOpen ||
            isPairingOpen
        ),
      deleteWorktree: (row) => {
        const resolved = findWorktreeByIdentity(row);
        if (!resolved) {
          showWorkspaceListChangedToast();
          return;
        }
        handleDeleteGitWorktree(resolved.worktree, projectsRef.current.find((project) => project.path === resolved.repoPath));
      },
      deleteFolderWorkspace: async (folderWorkspaceId) => {
        try {
          return await (useAppStore.getState() as unknown as {
            deleteFolderWorkspace: (id: string) => Promise<boolean>;
          }).deleteFolderWorkspace(folderWorkspaceId);
        } catch (error) {
          console.error("Failed to remove folder workspace:", error);
          return false;
        }
      },
      findWorktree: (workspaceId, hostIdentity) => {
        for (const [repoPath, list] of Object.entries(worktreesByProject)) {
          const worktree = list.find(
            (entry) => (entry.id || entry.path) === workspaceId || entry.path === workspaceId
          );
          if (!worktree) continue;
          const hostId = getExecutionHostIdForRepoPath(storeRepos, repoPath);
          if (
            hostIdentity &&
            getWorktreeHostIdentity({ id: workspaceId, hostId }) !== hostIdentity
          ) {
            continue;
          }
          return {
            id: worktree.id ?? `${repoPath}::${worktree.path}`,
            hostId,
            path: worktree.path,
            repoPath,
            isMainWorktree: worktree.is_main ?? worktree.isMainWorktree ?? false,
            isDeleting: Boolean(
              deleteStateByWorktreeId[
                getDeleteStateKeyForWorktreeHost({
                  id: worktree.id ?? `${repoPath}::${worktree.path}`,
                  hostId,
                })
              ]?.isDeleting
            ),
          };
        }
        return null;
      },
      findFolderWorkspace: (workspaceId, hostIdentity) => {
        const folder = folderWorkspaces.find((entry) => entry.id === workspaceId);
        if (!folder) return null;
        if (
          hostIdentity &&
          folder.executionHostId &&
          composeWorktreeHostIdentity(
            (folder.executionHostId as ExecutionHostId | null | undefined) ?? undefined,
            folder.id
          ) !== hostIdentity
        ) {
          return null;
        }
        return { id: folder.id, path: folder.folderPath };
      },
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!event.altKey || (event.key !== "Backspace" && event.key !== "Delete")) return;
      if (event.defaultPrevented) return;
      if (deleteHoveredWorkspaceImmediately(deps)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [
    deleteStateByWorktreeId,
    deleteWorktreeModal,
    findWorktreeByIdentity,
    folderDeleteTarget,
    folderWorkspaces,
    handleDeleteGitWorktree,
    isAddRepoOpen,
    isCommandPaletteOpen,
    isJumpPaletteOpen,
    isNewWorkspaceOpen,
    isPairingOpen,
    isSettingsOpen,
    parentPickerState,
    storeRepos,
    worktreesByProject,
  ]);


  const deleteDialogDirtyCounts = useMemo(() => {
    if (!deleteWorktreeModal) return {};
    const identities = deleteWorktreeModal.deleteTargets ?? [];
    const targets = deleteWorktreeModal.worktrees.map((wt, index) => ({
      id: identities[index]?.id ?? wt.path,
      path: wt.path,
      hostId: identities[index]?.hostId,
      isMainWorktree: wt.is_main ?? wt.isMainWorktree ?? false,
    }));
    return Object.fromEntries(
      getDeleteWorktreeDirtyChangeCounts({
        deleteTargets: targets,
        dirtyChangeCountByPath: dirtyChangeCountsByWorktreeId,
        deleteStateByWorktreeId,
      })
    );
  }, [deleteStateByWorktreeId, deleteWorktreeModal, dirtyChangeCountsByWorktreeId]);

  const handleCreatedWorkspace = (worktreePath: string, branchName: string, agentName: string, executable: string) => {
    // The lane's create path persisted the status through `set_worktree_status`; refresh
    // re-reads it from the host so the new worktree paints in the lane it was created from.
    if (activeProject) refreshGitWorktrees(activeProject.path);
    const id = `sess_wt_${Date.now().toString().slice(-4)}`;
    const newSession: WorktreeSession = {
      id,
      project_path: worktreePath,
      title: `${branchName}`,
      branch: branchName,
      state: "working",
      active: true,
      agentName,
      executable,
      created_at: Date.now(),
      updated_at: Date.now(),
    };
    setSessions((prev) => [
      newSession,
      ...prev.map((s) => ({ ...s, active: false }))
    ]);
    invoke("save_session_record", {
      record: {
        id: newSession.id,
        project_path: worktreePath,
        title: newSession.title,
        branch: newSession.branch,
        agent_name: newSession.agentName,
        executable: newSession.executable,
        created_at: Date.now(),
        updated_at: Date.now(),
      }
    }).catch(console.error);

    const tabId = `tab_${id}`;
    setTabs((prev) => [...prev, { id: tabId, title: `${branchName} (fleet)`, type: "terminal", sessionId: id, executable, cwd: worktreePath }]);
    setActiveTabId(tabId);
  };

  /**
   * D08-030: the workspace board's lane `+` opens the same composer the sidebar uses,
   * preselected with that lane's status. One modal mechanism, seeded once.
   */
  const handleCreateWorktreeInStatus = useCallback((workspaceStatus: string) => {
    setNewWorkspaceInitialStatus(workspaceStatus);
    setIsNewWorkspaceOpen(true);
  }, []);

  /** Closes the composer and drops the lane seed so the next creation starts clean. */
  const closeNewWorkspaceComposer = useCallback(() => {
    setIsNewWorkspaceOpen(false);
    setNewWorkspaceInitialStatus(null);
  }, []);

  const handleSelectSession = (id: string) => {
    setSessions((prev) =>
      prev.map((s) => ({ ...s, active: s.id === id }))
    );
    // PR-15: selecting a session clears its unread badge (and the owning project's).
    const selectedSession = sessions.find((s) => s.id === id);
    clearUnreadWorktree(id);
    if (selectedSession?.project_path) {
      clearUnreadWorktree(selectedSession.project_path);
      const owningProject = projects.find((p) => selectedSession.project_path === p.path || selectedSession.project_path.startsWith(p.path + "/"));
      if (owningProject) {
        if (!activeProject || activeProject.path !== owningProject.path) {
          setActiveProject(owningProject);
        }
        clearUnreadProject(owningProject.id);
      }
      if (selectedSession.project_path !== currentWorkspacePathRef.current) {
        const prevPath = currentWorkspacePathRef.current;
        if (prevPath && tabsRef.current.length > 0) {
          const prevState: WorkbenchState = {
            tabs_json: JSON.stringify(tabsRef.current),
            active_tab_id: activeTabIdRef.current,
            updated_at: Date.now(),
          };
          invoke("save_workbench_persistence_for_project", { projectPath: prevPath, state: prevState }).catch(console.error);
        }
        setActiveWorktreePath(selectedSession.project_path);
        prevProjectPathRef.current = selectedSession.project_path;
      }
    }
    const tabId = `tab_${id}`;
    const existing = tabs.find((t) => t.id === tabId || t.sessionId === id);
    if (!existing) {
      const targetSession = sessions.find((s) => s.id === id);
      const sh = targetSession?.executable ?? "shell";
      const newTab: TabItem = {
        id: tabId,
        title: targetSession?.title || `${sh} (active)`,
        type: "terminal",
        sessionId: id,
        executable: sh,
        cwd: targetSession?.project_path || activeProject?.path,
        agentName: targetSession?.agentName,
      };
      setTabs((prev) => [...prev, newTab]);
      setActiveTabId(tabId);
    } else {
      setActiveTabId(existing.id);
    }
  };

  const handleDeleteSession = (id: string) => {
    if (sessions.length <= 1) return;
    invoke("delete_session_record", { sessionId: id }).catch(console.error);
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setTabs((prev) => prev.filter((t) => t.id !== `tab_${id}`));
  };

  const handleReorderSessions = (newSessions: WorktreeSession[]) => {
    setSessions(newSessions);
    try {
      localStorage.setItem("hydra:sessions_order", JSON.stringify(newSessions.map(s => s.id)));
    } catch {}
  };

  const handleReorderProjects = (newProjects: HydraProject[]) => {
    setProjects(newProjects);
    // D03b-029: one writer for the repo-header drop, persisted through the SQLite prefs.
    persistProjectOrderPreference(newProjects.map((project) => project.id));
  };

  const handleReorderWorktrees = (newWorktrees: GitWorktreeInfo[], projectPath?: string) => {
    const targetPath = projectPath ?? activeProjectRef.current?.path;
    if (targetPath) {
      setWorktreesByProject((prev) => ({ ...prev, [targetPath]: newWorktrees }));
      if (targetPath === activeProjectRef.current?.path) setGitWorktrees(newWorktrees);
      try {
        localStorage.setItem(`hydra:worktrees_order:${targetPath}`, JSON.stringify(newWorktrees.map((w) => w.path)));
      } catch {}
      if (targetPath === activeProjectRef.current?.path) {
        try {
          localStorage.setItem("hydra:worktrees_order", JSON.stringify(newWorktrees.map((w) => w.path)));
        } catch {}
      }
    } else {
      setGitWorktrees(newWorktrees);
      try {
        localStorage.setItem("hydra:worktrees_order", JSON.stringify(newWorktrees.map((w) => w.path)));
      } catch {}
    }
  };

  const handleNewTerminalTab = useCallback((shell?: string, cwdOverride?: string) => {
    const sh = shell || resolveDefaultShell();
    const currentCwd = cwdOverride ?? activeWorktreePathRef.current ?? activeProject?.path ?? "";
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const tabId = `tab_${sessionId}`;
    const terminalCount = tabsRef.current.filter((t) => t.type === "terminal").length;
    const title = terminalCount === 0 ? "Terminal 1" : `Terminal ${terminalCount + 1}`;
    setTabs((prev) => [
      ...prev,
      {
        id: tabId,
        title,
        type: "terminal",
        sessionId,
        executable: sh,
        cwd: currentCwd,
      },
    ]);
    setActiveTabId(tabId);
  }, [hydraSettings, activeProject]);
  const handleNewTab = () => handleNewTerminalTab();

  /** Orca parity: activating a workspace focuses its terminal tab, creating one when
   * the workspace has none (`activateWorktreeFromSidebar`). Shared by the project
   * headers and the folder-workspace rows so every sidebar click behaves alike. */
  const ensureWorkspaceTerminal = useCallback(
    (workspacePath: string) => {
      const existing = tabsRef.current.find((t) => t.cwd === workspacePath);
      if (existing) {
        setActiveTabId(existing.id);
        const session = sessions.find((s) => s.project_path === workspacePath);
        if (session) {
          setSessions((prev) => prev.map((s) => ({ ...s, active: s.id === session.id })));
        }
        return;
      }
      handleNewTerminalTab(undefined, workspacePath);
    },
    [handleNewTerminalTab, sessions]
  );

  /** Sidebar click on a project header: select + guarantee the terminal. */
  const handleActivateProject = useCallback(
    (proj: HydraProject) => {
      handleSelectProject(proj);
      ensureWorkspaceTerminal(proj.path);
    },
    [handleSelectProject, ensureWorkspaceTerminal]
  );

  /** Orca parity: single click on a folder workspace ACTIVATES it and guarantees a
   * terminal (`use-worktree-card-activation-actions.ts:79-88` →
   * `activateWorktreeFromSidebar`). No session is invented when one already exists. */
  const handleActivateFolderWorkspace = useCallback(
    (folderPath: string) => {
      setActiveWorktreePath(folderPath);
      prevProjectPathRef.current = folderPath;
      ensureWorkspaceTerminal(folderPath);
    },
    [ensureWorkspaceTerminal]
  );

  /** D03a-100: visible sidebar rows request a PR refresh; the host `pr_status`
   * probe answers, so scrolling to a stale card refreshes exactly those branches. */
  const prVisibleRefreshAtRef = useRef<Map<string, number>>(new Map());
  useEffect(() => {
    const handleVisiblePrRefresh = (event: Event) => {
      const detail = (event as CustomEvent<{
        items: Array<{ path: string; repoPath: string; branch: string }>;
      }>).detail;
      if (!detail?.items?.length) return;
      const now = Date.now();
      const pending = detail.items.filter((item) => {
        const key = `${item.repoPath}::${item.branch}`;
        const last = prVisibleRefreshAtRef.current.get(key) ?? 0;
        if (now - last < 20_000) return false;
        prVisibleRefreshAtRef.current.set(key, now);
        return true;
      });
      if (pending.length === 0) return;
      void Promise.all(
        pending.map((item) =>
          invoke<{ number: number; state: string; checks?: string | null } | null>("pr_status", {
            repoPath: item.repoPath,
            branch: item.branch,
          })
            .then((status) => ({ item, status }))
            .catch(() => ({ item, status: null }))
        )
      ).then((results) => {
        setPrByPath((prev) => {
          const next = { ...prev };
          for (const { item, status } of results) {
            if (status) {
              next[item.path] = {
                number: status.number,
                state: status.state as PrDisplay["state"],
                status: (status.checks ?? null) as PrDisplay["status"],
                provider: "github",
              };
            } else {
              delete next[item.path];
            }
          }
          return next;
        });
      });
    };
    window.addEventListener("hydra:refresh-visible-prs", handleVisiblePrRefresh);
    return () =>
      window.removeEventListener("hydra:refresh-visible-prs", handleVisiblePrRefresh);
  }, []);

  /** Workspace key that owns diff review notes for the active surface. */
  const activeNotesKey = useMemo(() => {
    const path = activeWorktreePath || activeProject?.path || "";
    if (!path) return undefined;
    const folderWorkspace = folderWorkspaces.find(
      (workspace) => workspace.folderPath === path
    );
    if (folderWorkspace) return `folder:${folderWorkspace.id}`;
    for (const list of Object.values(worktreesByProject)) {
      const match = list.find((worktree) => worktree.path === path);
      if (match?.id) return match.id;
    }
    return undefined;
  }, [activeWorktreePath, activeProject?.path, folderWorkspaces, worktreesByProject]);

  /** Review display per worktree: one `pr_status` probe per repo/branch, cached for
   * the session so a re-render never re-shells out to `gh`. */
  useEffect(() => {
    const pending: Array<{ path: string; repoPath: string; branch: string }> = [];
    for (const [repoPath, list] of Object.entries(worktreesByProject)) {
      for (const wt of list) {
        const branch = (wt.branch ?? "").trim();
        if (!branch || branch === "HEAD") continue;
        const key = `${repoPath}::${branch}`;
        if (prLookupRef.current.has(key)) continue;
        prLookupRef.current.add(key);
        pending.push({ path: wt.path, repoPath, branch });
      }
    }
    if (pending.length === 0) return;
    let cancelled = false;
    Promise.all(
      pending.map((item) =>
        invoke<{ number: number; state: string; checks?: string | null } | null>("pr_status", {
          repoPath: item.repoPath,
          branch: item.branch,
        })
          .then((status) => ({ item, status }))
          .catch(() => ({ item, status: null }))
      )
    ).then((results) => {
      if (cancelled) return;
      setPrByPath((prev) => {
        const next = { ...prev };
        for (const { item, status } of results) {
          if (!status) continue;
          next[item.path] = {
            number: status.number,
            state: status.state as PrDisplay["state"],
            status: (status.checks ?? null) as PrDisplay["status"],
            provider: "github",
          };
        }
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [worktreesByProject]);

  /** Terminal tabs still mounted, i.e. the workspaces with a live PTY — Orca's
   * `ptyIdsByTabId` equivalent for the folder-row status dot. */
  const liveWorkspacePaths = useMemo(
    () =>
      new Set(
        tabs
          .filter((t) => t.type === "terminal" && Boolean(t.cwd))
          .map((t) => t.cwd as string)
      ),
    [tabs]
  );

  // ─── Parent picker: candidate universe, eligibility, lineage writers ────────
  //
  // Orca's picker computes its own eligibility (`getEligibleWorktreeParents`) from the whole
  // workspace universe; Hydra's menu used to offer every other project and worktree, so a
  // cross-repo or already-parented choice could be made and then silently dropped by the
  // sidebar projection. The universe below is the same one the sidebar paints: each project's
  // main row plus its scanned worktrees, with the host/repo chrome the picker row shows.
  const parentPickerCandidates = useMemo(
    () =>
      buildWorktreeParentPickerCandidates({
        projects,
        worktreesByProject,
        repos: storeRepos,
        sessions,
        liveWorkspacePaths,
        activeWorktreePath,
      }),
    [projects, worktreesByProject, storeRepos, sessions, liveWorkspacePaths, activeWorktreePath]
  );
  const parentPickerCandidateByPath = useMemo(
    () => new Map(parentPickerCandidates.map((candidate) => [candidate.path, candidate])),
    [parentPickerCandidates]
  );
  const getEligibleParentCandidates = useCallback(
    (childPath: string): WorktreeParentPickerCandidate[] => {
      const child = parentPickerCandidateByPath.get(childPath);
      return child
        ? getEligibleWorktreeParents({
            child,
            candidates: parentPickerCandidates,
            lineageByPath: worktreeLineage,
          })
        : [];
    },
    [parentPickerCandidateByPath, parentPickerCandidates, worktreeLineage]
  );
  /**
   * Optimistic publish through the persistence hook: state updates immediately,
   * the IPC write follows, and a rejection rolls the affected edges back with a
   * toast. Callers may fire-and-forget; the hook owns the failure surface.
   */
  const setWorktreeLineageParents = useCallback(
    async (keys: readonly string[], parentPath: string) => {
      await persistWorktreeLineageParents(keys, parentPath).catch(() => {});
    },
    [persistWorktreeLineageParents]
  );
  const unnestWorktreePaths = useCallback(
    (keys: readonly string[]) => {
      // One optimistic state update + one persisted batch, so a rejected
      // un-nest rolls back once and reports one toast.
      void clearWorktreeLineageParents(keys).catch(() => {});
    },
    [clearWorktreeLineageParents]
  );

  /** Folder workspaces whose directory is gone: Orca badges those with FolderX
   * (`FolderPathStatusIndicator`). The probe is cached and revalidated on
   * repo/ssh/runtime changes (D03a-057). */
  const folderPathStatusEpoch = useAppStore((state) => {
    const environments = state.runtimeEnvironments;
    const environmentCount = Array.isArray(environments)
      ? environments.length
      : Object.keys(environments ?? {}).length;
    return `${state.repos?.length ?? 0}:${environmentCount}:${state.sshConnectedGeneration ?? 0}`;
  });
  const {
    missingFolderPaths,
    statusByPath: folderPathStatusByPath,
    getFreshFolderWorkspacePathStatus,
  } = useFolderWorkspacePathStatuses({
    folderWorkspaces,
    epoch: folderPathStatusEpoch,
  });

  const handleLaunchAgent = (agent: AvailableAgent) => {
    const currentWorkspacePath = activeWorktreePathRef.current || activeProject?.path || "";
    const sessionId = `sess_${agent.id}_${Date.now().toString().slice(-4)}`;
    const tabId = `tab_${sessionId}`;
    const newSession: WorktreeSession = {
      id: sessionId,
      project_path: currentWorkspacePath,
      title: agent.name,
      branch: activeProject?.current_branch ?? "main",
      state: "idle",
      active: true,
      agentName: agent.name,
      executable: agent.executable,
      created_at: Date.now(),
      updated_at: Date.now(),
    };
    invoke("save_session_record", {
      record: {
        id: sessionId,
        project_path: newSession.project_path,
        title: newSession.title,
        branch: newSession.branch,
        agent_name: newSession.agentName,
        executable: newSession.executable,
        created_at: Date.now(),
        updated_at: Date.now(),
      },
    }).catch(console.error);

    setSessions((prev) => [
      ...prev.map((s) => ({ ...s, active: false })),
      newSession,
    ]);
    const newTab: TabItem = {
      id: tabId,
      title: agent.name,
      type: "terminal",
      sessionId,
      executable: agent.executable,
      cwd: currentWorkspacePath,
      agentName: agent.name,
      agentId: agent.id,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(tabId);
  };

  const handleSelectWorkbenchTab = (tabId: string) => {
    setActiveTabId(tabId);
    const sId = tabId.startsWith("tab_") ? tabId.replace("tab_", "") : tabId;
    // PR-15: activating a workbench tab clears its session's unread badge.
    clearUnreadWorktree(sId);
    clearUnreadWorktree(tabId);
    const session = sessions.find((s) => s.id === sId);
    if (session?.project_path) {
      clearUnreadWorktree(session.project_path);
      const owningProject = projects.find((p) => session.project_path === p.path || session.project_path.startsWith(p.path + "/"));
      if (owningProject) clearUnreadProject(owningProject.id);
    }
    setSessions((prev) =>
      prev.map((s) => ({ ...s, active: s.id === sId }))
    );
  };

  const handleNewFileTab = useCallback(() => {
    const count = Object.keys(fileTabContents).filter((k) => k.startsWith("tab_untitled_")).length + 1;
    const id = `tab_untitled_${Date.now()}`;
    const fileName = `Untitled-${count}.txt`;
    setFileTabContents((prev) => ({ ...prev, [id]: { original: "", modified: "", lang: "plaintext" } }));
    setTabs((prev) => [...prev, { id, title: fileName, type: "editor" }]);
    setActiveTabId(id);
  }, [fileTabContents]);


  const handleOpenFileTab = useCallback(async () => {
    try {
      const selected = await openFileDialog({
        multiple: false,
        directory: false,
        defaultPath: activeProject?.path ?? undefined,
      });
      if (selected && typeof selected === "string") {
        const path = selected;
        const ext = path.split(".").pop()?.toLowerCase() ?? "";
        const lang = ({ rs: "rust", ts: "typescript", tsx: "typescript", js: "javascript", json: "json", md: "markdown", py: "python", go: "go" } as Record<string, string>)[ext] ?? "plaintext";
        const res = await invoke<{ path: string; content: string }>("read_file_text_cmd", { path });
        const content = res.content;
        const truncated = content.length > 20000 ? content.slice(0, 20000) + "\n… truncated" : content;
        const fileName = path.split("/").pop() ?? path;
        const tabId = `tab_file_${path}`;
        setFileTabContents((prev) => ({ ...prev, [tabId]: { original: "", modified: truncated, lang } }));
        setPreviewLanguage(lang);
        setTabs((prev) => {
          if (prev.some((t) => t.id === tabId)) return prev;
          return [...prev, { id: tabId, title: fileName, type: "editor" }];
        });
        setActiveTabId(tabId);
      }
    } catch (e) {
      console.error(e);
    }
  }, [activeProject]);
  const handleOpenFilePath = useCallback(async (path: string) => {
    try {
      const ext = path.split(".").pop()?.toLowerCase() ?? "";
      const lang = ({ rs: "rust", ts: "typescript", tsx: "typescript", js: "javascript", json: "json", md: "markdown", py: "python", go: "go" } as Record<string, string>)[ext] ?? "plaintext";
      const res = await invoke<{ path: string; content: string }>("read_file_text_cmd", { path });
      const content = res.content;
      const truncated = content.length > 20000 ? content.slice(0, 20000) + "\n… truncated" : content;
      const fileName = path.split("/").pop() ?? path;
      const tabId = `tab_file_${path}`;
      setFileTabContents((prev) => ({ ...prev, [tabId]: { original: "", modified: truncated, lang } }));
      setPreviewLanguage(lang);
      setTabs((prev) => {
        if (prev.some((t) => t.id === tabId)) return prev;
        return [...prev, { id: tabId, title: fileName, type: "editor" }];
      });
      setActiveTabId(tabId);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleRestoreClosedTab = useCallback((tab: TabItem) => {
    if (tab.type === "terminal") {
      handleNewTerminalTab(tab.executable);
    } else if (tab.type === "editor" && tab.id.startsWith("tab_file_")) {
      handleOpenFilePath(tab.id.replace("tab_file_", ""));
    } else {
      setTabs((prev) => [...prev, tab]);
      setActiveTabId(tab.id);
    }
  }, [handleNewTerminalTab, handleOpenFilePath]);

  const handleRunQuickCommand = useCallback((cmd: string) => {
    const cur = tabsRef.current.find((t) => t.id === activeTabIdRef.current);
    if (cur?.type === "terminal") {
      const sid = cur.sessionId || (cur.id.startsWith("tab_") ? cur.id.replace("tab_", "") : cur.id);
      invoke("write_terminal", { sessionId: sid, data: `${cmd}\r` }).catch(console.error);
    } else {
      handleNewTerminalTab();
      setTimeout(() => {
        const curNew = tabsRef.current.find((t) => t.id === activeTabIdRef.current);
        const sid = curNew?.sessionId || (curNew?.id.startsWith("tab_") ? curNew.id.replace("tab_", "") : curNew?.id);
        if (sid) {
          invoke("write_terminal", { sessionId: sid, data: `${cmd}\r` }).catch(console.error);
        }
      }, 300);
    }
  }, [handleNewTerminalTab]);


  /** The original close — kills PTYs, clears state. Runs immediately for idle tabs
   *  and after the running-process confirmation. */
  const executeCloseTab = useCallback((id: string) => {
    const closingTab = tabsRef.current.find((t) => t.id === id);
    if (closingTab) {
      setRecentlyClosedTabs((prev) => [closingTab, ...prev.filter((t) => t.id !== closingTab.id)].slice(0, 10));
      const panes = getPanesForTab(closingTab);
      for (const pane of panes) {
        invoke("delete_session_record", { sessionId: pane.sessionId }).catch(() => {});
        invoke("close_split_terminal", { sessionId: pane.sessionId }).catch(() => {});
      }
      // keep sessions cleanup for legacy single-id path
      if (closingTab.sessionId) {
        setSessions((prev) => prev.filter((s) => !panes.some((p) => p.sessionId === s.id)));
      } else if (panes.length > 0) {
        setSessions((prev) => prev.filter((s) => !panes.some((p) => p.sessionId === s.id)));
      }
    } else if (id.startsWith("tab_sess_")) {
      const sId = id.replace("tab_", "");
      invoke("delete_session_record", { sessionId: sId }).catch(console.error);
      invoke("close_split_terminal", { sessionId: sId }).catch(() => {});
      setSessions((prev) => prev.filter((s) => s.id !== sId));
    }
    setTabs((prev) => {
      const remaining = prev.filter((t) => t.id !== id);
      if (activeTabIdRef.current === id) {
        setActiveTabId(remaining.length > 0 ? remaining[remaining.length - 1].id : "");
      }
      return remaining;
    });
    setFileTabContents((prev) => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });
    setFocusedPaneMap((prev) => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });
  }, [getPanesForTab]);

  const handleCloseTab = useCallback((id: string) => {
    const closingTab = tabsRef.current.find((t) => t.id === id);
    // Orca running-terminal-close-guard parity: an interactive user close with a live
    // child process asks before killing. Probes each owned session's Herdr state via
    // check_agent_state with a 4s deadline (a dead probe is not evidence of an idle
    // shell — it raises the prompt instead of closing a possibly-running tab).
    if (closingTab) {
      const panes = getPanesForTab(closingTab);
      const probeSessionIds = panes
        .map((p) => p.sessionId)
        .filter((s): s is string => Boolean(s));
      if (
        probeSessionIds.length > 0 &&
        !hydraSettings.skip_close_terminal_with_running_process_confirm
      ) {
        let decided = false;
        const performImmediateClose = (): void => {
          if (decided) return;
          decided = true;
          executeCloseTab(id);
        };
        const confirmClose = (): void => {
          if (decided) return;
          decided = true;
          const executable = panes[0]?.executable ?? closingTab.executable ?? "";
          // Orca copy-kind: agent tabs (launched AI agents) ask "Stop Agent?",
          // plain shells ask "Stop running command?".
          const copyKind: CloseTerminalDialogCopyKind =
            closingTab.title.includes("(active)") || (executable !== "" && !SHELL_EXECUTABLES[executable])
              ? "agent"
              : "command";
          setRunningTerminalCloseConfirm({
            terminalTabId: id,
            tabLabel: closingTab.title,
            copyKind,
            onConfirm: () => {
              executeCloseTab(id);
            },
            onCancel: () => {
              setRunningTerminalCloseConfirm(null);
            },
          });
        };
        let deadline: ReturnType<typeof setTimeout> | undefined;
        const probeOnce = (sessionId: string): Promise<string | null> =>
          Promise.race([
            invoke<string>("check_agent_state", { sessionId }).catch(() => null),
            new Promise<null>((resolve) => {
              deadline = setTimeout(() => resolve(null), RUNNING_CLOSE_PROBE_TIMEOUT_MS);
            }),
          ]);
        void Promise.all(probeSessionIds.map(probeOnce))
          .then((states) => {
            if (decided) return;
            // Orca parity (running-terminal-close-guard.ts): a probe that answered with no
            // live work must fail open, closing immediately (idle tab). Only ask for real work:
            const isShellTerminal = isShellProcess(
              panes[0]?.executable ?? closingTab.executable ?? closingTab.agentName ?? ""
            );
            const hasLive = states.some((s) => s === "working" || s === "blocked" || s === "waiting");
            const hasUnknown = states.some((s) => s === null || s === "unknown");
            const shouldAsk = isShellTerminal
              ? hasLive
              : hasLive || hasUnknown;
            if (shouldAsk) confirmClose();
            else performImmediateClose();
          })
          .catch(() => performImmediateClose())
          .finally(() => clearTimeout(deadline));
        return;
      }
    }
    executeCloseTab(id);
  }, [executeCloseTab, getPanesForTab, hydraSettings.skip_close_terminal_with_running_process_confirm]);

  const handleCloseTabsToRight = (id: string) => {
    // cleanup sessions for tabs being closed
    const idx = tabsRef.current.findIndex((t) => t.id === id);
    if (idx !== -1) {
      const toClose = tabsRef.current.slice(idx + 1);
      for (const t of toClose) {
        for (const pane of getPanesForTab(t)) {
          invoke("delete_session_record", { sessionId: pane.sessionId }).catch(() => {});
          invoke("close_split_terminal", { sessionId: pane.sessionId }).catch(() => {});
        }
      }
      setSessions((prev) => prev.filter((s) => !toClose.some((t) => getPanesForTab(t).some((p) => p.sessionId === s.id))));
    }
    setTabs((prev) => {
      const i = prev.findIndex((t) => t.id === id);
      if (i === -1) return prev;
      const remaining = prev.slice(0, i + 1);
      if (!remaining.some((t) => t.id === activeTabIdRef.current)) {
        setActiveTabId(id);
      }
      return remaining;
    });
  };

  const handleCloseTabsToLeft = (id: string) => {
    const idx = tabsRef.current.findIndex((t) => t.id === id);
    if (idx !== -1) {
      const toClose = tabsRef.current.slice(0, idx);
      for (const t of toClose) {
        for (const pane of getPanesForTab(t)) {
          invoke("delete_session_record", { sessionId: pane.sessionId }).catch(() => {});
          invoke("close_split_terminal", { sessionId: pane.sessionId }).catch(() => {});
        }
      }
      setSessions((prev) => prev.filter((s) => !toClose.some((t) => getPanesForTab(t).some((p) => p.sessionId === s.id))));
    }
    setTabs((prev) => {
      const i = prev.findIndex((t) => t.id === id);
      if (i === -1) return prev;
      const remaining = prev.slice(i);
      if (!remaining.some((t) => t.id === activeTabIdRef.current)) {
        setActiveTabId(id);
      }
      return remaining;
    });
  };

  const handleCloseAllTabs = () => {
    for (const t of tabsRef.current) {
      for (const pane of getPanesForTab(t)) {
        invoke("delete_session_record", { sessionId: pane.sessionId }).catch(() => {});
        invoke("close_split_terminal", { sessionId: pane.sessionId }).catch(() => {});
      }
    }
    setSessions([]);
    setTabs([]);
    setFileTabContents({});
    setActiveTabId("");
    setFocusedPaneMap({});
  };
  const handleReorderTabs = useCallback((newTabs: TabItem[]) => {
    setTabs(newTabs);
    const currentWorkspacePath = activeWorktreePath || activeProject?.path;
    if (currentWorkspacePath) {
      useAppStore.getState().setTabsForWorktree(currentWorkspacePath, newTabs);
    }
  }, [activeWorktreePath, activeProject]);

  const handleRenameTab = useCallback((tabId: string, newTitle: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, title: newTitle, customTitle: newTitle } : t))
    );
    const currentWorkspacePath = activeWorktreePath || activeProject?.path;
    if (currentWorkspacePath) {
      useAppStore.getState().setTabCustomTitle(currentWorkspacePath, tabId, newTitle);
    }
  }, [activeWorktreePath, activeProject]);

  // Orca parity (resolveTerminalTabTitle): a user rename wins over the live
  // shell/process OSC title. Without a customTitle, the tab follows the title
  // the terminal emits (zsh, vim, agent frames).
  const handleTabTitleChange = useCallback((sessionId: string, title: string) => {
    const currentWorkspacePath = activeWorktreePath || activeProject?.path;
    setTabs((prev) =>
      prev.map((t) => {
        if (t.customTitle || t.sessionId !== sessionId) return t;
        if (currentWorkspacePath) {
          useAppStore.getState().updateTab(currentWorkspacePath, t.id, { title });
        }
        return { ...t, title };
      })
    );
  }, [activeWorktreePath, activeProject]);

  const jumpToVisibleWorktreeByIndexRef = useRef<(index: number) => void>(() => {});
  jumpToVisibleWorktreeByIndexRef.current = (index) => {
    const seen = new Set<string>();
    const worktrees: GitWorktreeInfo[] = [];
    for (const worktree of [...Object.values(worktreesByProject).flat(), ...gitWorktrees]) {
      if (seen.has(worktree.path)) continue;
      seen.add(worktree.path);
      worktrees.push(worktree);
    }
    const match = findWorktreeForShortcutIndex(index, getVisibleWorktreeShortcutTargets(), worktrees);
    if (match) handleSelectGitWorktree(match);
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalContextMenu = (e: MouseEvent) => {
      // Orca `shouldUseNativeContextMenu`: terminal/editor surfaces opt out of the
      // sidebar's menu so their own native/browser menu still opens.
      if (shouldUseNativeContextMenu(e.target)) return;
      e.preventDefault();
    };
    window.addEventListener("contextmenu", handleGlobalContextMenu);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;

      // Dismiss any open modal or context menu on Escape
      if (e.key === "Escape") {
        if (contextMenu) {
          e.preventDefault();
          setContextMenu(null);
          return;
        }
        if (isRecentTabSwitcherOpenRef.current) {
          e.preventDefault();
          setIsRecentTabSwitcherOpen(false);
          isRecentTabSwitcherOpenRef.current = false;
          return;
        }
        if (isJumpPaletteOpen) {
          e.preventDefault();
          setIsJumpPaletteOpen(false);
          return;
        }
        if (isCommandPaletteOpen) {
          e.preventDefault();
          setIsCommandPaletteOpen(false);
          return;
        }
        if (isSettingsOpen) {
          e.preventDefault();
          setIsSettingsOpen(false);
          return;
        }
        if (isNewWorkspaceOpen) {
          e.preventDefault();
          closeNewWorkspaceComposer();
          return;
        }
        if (isAddRepoOpen) {
          e.preventDefault();
          setIsAddRepoOpen(false);
          return;
        }
        if (isPairingOpen) {
          e.preventDefault();
          setIsPairingOpen(false);
          return;
        }
      }

      const target = e.target as HTMLElement | null;
      const isInputFocused = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || Boolean(target?.isContentEditable);
      const isModalOpen = isJumpPaletteOpen || isCommandPaletteOpen || isSettingsOpen || isAddRepoOpen || isNewWorkspaceOpen || isPairingOpen;
      const isChord = e.ctrlKey || e.metaKey;
      if (isChord && e.key === "Tab") {
        e.preventDefault();
        const currentMru = mruTabsRef.current;
        if (currentMru.length > 1) {
          if (!isRecentTabSwitcherOpenRef.current) {
            setIsRecentTabSwitcherOpen(true);
            isRecentTabSwitcherOpenRef.current = true;
            const initialIdx = e.shiftKey ? currentMru.length - 1 : 1;
            setRecentTabSwitcherIndex(initialIdx);
            recentTabSwitcherIndexRef.current = initialIdx;
          } else {
            const nextIdx = e.shiftKey
              ? (recentTabSwitcherIndexRef.current - 1 + currentMru.length) % currentMru.length
              : (recentTabSwitcherIndexRef.current + 1) % currentMru.length;
            setRecentTabSwitcherIndex(nextIdx);
            recentTabSwitcherIndexRef.current = nextIdx;
          }
        }
        return;
      }
      if (isChord && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }
      // D01-052: the left-sidebar toggle is a first-class command — dispatched from
      // the keybinding registry (`sidebar.left.toggle`, Mod+B by default and
      // user-remappable) instead of a hardcoded `b` chord.
      // D09-005: the sleeping toggle ships unbound but is remappable; dispatch it from
      // the registry so the sidebar row and the command agree on the chord.
      if (
        keybindingMatchesAction(
          "sidebar.sleepingWorkspaces.toggle",
          e,
          getShortcutPlatform(),
          keybindings
        )
      ) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("hydra:toggle-sleeping-workspaces"));
        return;
      }
      // D08-001: the board toggle is a registry command (`workspace.openBoard`), unbound by
      // default and remappable. The sidebar's panel hook owns the actual state; the app only
      // dispatches the same event the footer button's toggle does.
      if (keybindingMatchesAction("workspace.openBoard", e, getShortcutPlatform(), keybindings)) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("hydra:toggle-workspace-board"));
        return;
      }
      if (keybindingMatchesAction("sidebar.left.toggle", e, getShortcutPlatform(), keybindings)) {
        e.preventDefault();
        setIsLeftSidebarOpen((prev) => {
          const next = !prev;
          updateLeftSidebar(next);
          return next;
        });
        return;
      }
      if (isChord && e.shiftKey && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setIsRightSidebarOpen((prev) => {
          const next = !prev;
          updateRightSidebar(next);
          return next;
        });
        return;
      }
      if (isChord && !e.shiftKey && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setIsJumpPaletteOpen((prev) => !prev);
        return;
      }
      if (isChord && e.key === ",") {
        e.preventDefault();
        setIsSettingsOpen(true);
        return;
      }
      if (isChord && !e.shiftKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setIsNewWorkspaceOpen(true);
        return;
      }
      const worktreeIndex = worktreeShortcutIndexFromKey(e);
      if (worktreeIndex !== null && !isModalOpen && !isWorktreeIndexJumpBlockedByTextEntry(target)) {
        e.preventDefault();
        jumpToVisibleWorktreeByIndexRef.current(worktreeIndex);
        return;
      }
      // Guard against background tab closure or navigation when dialogs or inputs have focus
      if (isModalOpen || isInputFocused) {
        return;
      }
      // Sprint 2 P0: split shortcuts. Each chord is handled by exactly one
      // branch with an early return — no fall-through between handlers
      // (bug #4: Ctrl+T used to spawn two terminal tabs, and Ctrl+Shift+D
      // split + opened a diff on non-terminal tabs instead of only splitting).
      if (isChord && e.shiftKey && e.key.toLowerCase() === "d") {
        // Canonical binding: "Split Terminal Right" (context menu label).
        e.preventDefault();
        const cur = tabsRef.current.find((t) => t.id === activeTabIdRef.current);
        if (cur?.type === "terminal") {
          handleSplitTerminal("horizontal");
        }
        return;
      }
      if (isChord && e.shiftKey && e.key.toLowerCase() === "e") {
        // Canonical binding: "Split Terminal Down".
        const cur = tabsRef.current.find((t) => t.id === activeTabIdRef.current);
        if (cur?.type === "terminal") {
          e.preventDefault();
          handleSplitTerminal("vertical");
          return;
        }
      }
      if (isChord && (e.key === "\\" || e.key === "|" || e.key === "Dead")) {
        const cur = tabsRef.current.find((t) => t.id === activeTabIdRef.current);
        if (cur?.type === "terminal") {
          e.preventDefault();
          if (e.shiftKey) handleSplitTerminal("vertical");
          else handleSplitTerminal("horizontal");
          return;
        }
      }
      if (isChord && !e.shiftKey && e.key.toLowerCase() === "w") {
        e.preventDefault();
        if (activeTabIdRef.current) {
          handleCloseTab(activeTabIdRef.current);
        }
        return;
      }
      // Ctrl+T / Ctrl+Shift+T = new terminal tab. handleNewTab is an alias of
      // handleNewTerminalTab, so a second handler for the same chord used to
      // spawn two terminals per keystroke.
      if (isChord && e.key.toLowerCase() === "t") {
        e.preventDefault();
        handleNewTerminalTab();
        return;
      }
      if (isChord && e.shiftKey && e.key === "ArrowUp") {
        e.preventDefault();
        handleNavigateWorkspace("up");
        return;
      }
      if (isChord && e.shiftKey && e.key === "ArrowDown") {
        e.preventDefault();
        handleNavigateWorkspace("down");
        return;
      }
      if (isChord && e.key.toLowerCase() === "o") {
        e.preventDefault();
        handleOpenFileTab();
        return;
      }
      // Ctrl+Shift+N = new file tab. Ctrl+N is already handled up top
      // (new workspace), so this is the only chord producing a file tab —
      // previously both chords opened the workspace modal and the file-tab
      // handler was unreachable.
      if (isChord && e.shiftKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        handleNewFileTab();
        return;
      }
    };


    const handleKeyUp = (e: KeyboardEvent) => {
      if (
        isRecentTabSwitcherOpenRef.current &&
        (e.key === "Control" || e.key === "Meta" || (!e.ctrlKey && !e.metaKey))
      ) {
        e.preventDefault();
        const target = mruTabsRef.current[recentTabSwitcherIndexRef.current];
        if (target) {
          setActiveTabId(target.id);
        }
        setIsRecentTabSwitcherOpen(false);
        isRecentTabSwitcherOpenRef.current = false;
      }
    };

    const handleWindowBlur = () => {
      if (isRecentTabSwitcherOpenRef.current) {
        setIsRecentTabSwitcherOpen(false);
        isRecentTabSwitcherOpenRef.current = false;
      }
    };

    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("contextmenu", handleGlobalContextMenu);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [
    isLeftSidebarOpen,
    isRightSidebarOpen,
    leftSidebarWidth,
    rightSidebar.width,
    contextMenu,
    isJumpPaletteOpen,
    isCommandPaletteOpen,
    isSettingsOpen,
    isNewWorkspaceOpen,
    isAddRepoOpen,
    isPairingOpen,
    handleSplitTerminal,
    handleCloseTab,
    handleNewTerminalTab,
    handleNewFileTab,
    handleOpenFileTab,
    handleNavigateWorkspace,
    keybindings
  ]);


  // Context Menu Handlers
  const handleTerminalContextMenu = (
    x: number,
    y: number,
    actions?: TerminalContextActions
  ) => {
    const targetSessionId = actions?.sessionId ?? sessions.find((s) => s.active)?.id ?? "sess_main";
    const owningTab = tabs.find(
      (t) =>
        t.sessionId === targetSessionId ||
        t.splitSessionIds?.includes(targetSessionId) ||
        t.splitPanes?.some((p) => p.sessionId === targetSessionId)
    );
    const targetTabId = owningTab?.id ?? activeTabIdRef.current ?? activeTabId;
    if (owningTab && owningTab.id !== activeTabIdRef.current) {
      setActiveTabId(owningTab.id);
    }
    if (actions?.sessionId) {
      setFocusedPaneMap((prev) => ({ ...prev, [targetTabId]: actions.sessionId }));
    }
    const hasSelection = actions ? actions.hasSelection() : Boolean(window.getSelection()?.toString());

    setContextMenu({
      source: "terminal-tab",
      x,
      y,
      items: [
        {
          label: "Copy",
          icon: <Copy className="w-3.5 h-3.5" />,
          shortcut: isMac ? "⌘C" : "Ctrl+Shift+C",
          disabled: !hasSelection,
          onClick: () => {
            const text = actions ? actions.getSelection() : window.getSelection()?.toString();
            if (text) navigator.clipboard.writeText(text).catch(console.error);
          }
        },
        {
          label: "Select All",
          icon: <TextSelect className="w-3.5 h-3.5" />,
          shortcut: isMac ? "⌘A" : "Ctrl+Shift+A",
          onClick: () => {
            actions?.selectAll();
          }
        },
        {
          label: "Paste",
          icon: <ClipboardPaste className="w-3.5 h-3.5" />,
          shortcut: isMac ? "⌘V" : "Ctrl+Shift+V",
          onClick: () => {
            if (actions) {
              actions.paste();
            } else {
              navigator.clipboard
                .readText()
                .then((txt) => {
                  if (txt) invoke("send_terminal_input", { sessionId: targetSessionId, input: txt });
                })
                .catch(console.error);
            }
          }
        },
        {
          separator: true,
          label: "Quick Commands",
          icon: <Terminal className="w-3.5 h-3.5 text-amber-400" />,
          children: buildTerminalQuickCommandItems({
            onRun: (cmd) => {
              invoke("send_terminal_input", { sessionId: targetSessionId, input: `${cmd}\r` }).catch(console.error);
            },
            onInsert: (cmd) => {
              invoke("send_terminal_input", { sessionId: targetSessionId, input: cmd }).catch(console.error);
            },
            onCustomPrompt: () => {
              setPromptDialog({
                open: true,
                title: "Run Command in Terminal",
                description: "Enter a custom shell command to run",
                initialValue: "",
                confirmLabel: "Run",
                onSubmit: (cmd) => {
                  if (cmd.trim()) {
                    invoke("send_terminal_input", { sessionId: targetSessionId, input: `${cmd.trim()}\r` }).catch(console.error);
                  }
                },
              });
            },
          }),
          onClick: () => {},
        },
        {
          separator: true,
          label: "Split Terminal Right",
          icon: <PanelRightClose className="w-3.5 h-3.5" />,
          shortcut: isMac ? "⌘\\" : "Ctrl+Shift+D",
          onClick: () => handleSplitTerminal("horizontal")
        },
        {
          label: "Split Terminal Down",
          icon: <PanelBottomClose className="w-3.5 h-3.5" />,
          shortcut: isMac ? "⌘Shift+\\" : "Ctrl+Shift+E",
          onClick: () => handleSplitTerminal("vertical")
        },
        {
          separator: true,
          label: "Set Title…",
          icon: <Pencil className="w-3.5 h-3.5" />,
          shortcut: "Ctrl+Shift+R",
          onClick: () => {
            setPromptDialog({
              open: true,
              title: "Rename Terminal Tab",
              initialValue: owningTab?.title ?? "Terminal",
              onSubmit: (newName) => {
                if (newName.trim()) {
                  handleRenameTab(targetTabId, newName.trim());
                }
              },
            });
          }
        },
        {
          label: "Copy Terminal ID",
          icon: <Copy className="w-3.5 h-3.5" />,
          onClick: () => {
            navigator.clipboard.writeText(targetSessionId).catch(console.error);
          }
        },
        {
          separator: true,
          label: "Clear Screen",
          icon: <Eraser className="w-3.5 h-3.5" />,
          shortcut: "Ctrl+L",
          onClick: () => {
            if (actions) {
              actions.clearScreen();
            } else {
              invoke("send_terminal_input", { sessionId: targetSessionId, input: "\x0c" });
            }
          }
        },
        {
          label: "Clear Scrollback",
          icon: <Eraser className="w-3.5 h-3.5" />,
          onClick: () => {
            actions?.clearScrollback();
          }
        },
        {
          separator: true,
          label: owningTab && getPanesForTab(owningTab).length > 1 ? "Close Pane" : "Close Terminal",
          icon: <Trash2 className="w-3.5 h-3.5" />,
          shortcut: isMac ? "⌘W" : "Ctrl+W",
          danger: true,
          onClick: () => {
            if (owningTab && getPanesForTab(owningTab).length > 1) {
              handleCloseSplitPane(targetTabId, targetSessionId);
            } else {
              handleCloseTab(targetTabId);
            }
          }
        }
      ]
    });
  };

  const handleTabContextMenu = (e: React.MouseEvent, tab: TabItem) => {
    const tabIdx = tabs.findIndex((t) => t.id === tab.id);
    const hasTabsToRight = tabIdx >= 0 && tabIdx < tabs.length - 1;
    const hasTabsToLeft = tabIdx > 0;

    setContextMenu({
      source: "terminal-tab",
      x: e.clientX,
      y: e.clientY,
      items: [
        {
          label: "Split Terminal Right",
          icon: <PanelRightClose className="w-3.5 h-3.5" />,
          shortcut: isMac ? "⌘\\" : "Ctrl+Shift+D",
          onClick: () => {
            // Ensure this tab becomes active before split
            setActiveTabId(tab.id);
            activeTabIdRef.current = tab.id;
            handleSplitTerminal("horizontal");
            // Also split explicitly for this tab if active mismatch (fallback)
            setTimeout(() => {
              const cur = tabsRef.current.find((t) => t.id === tab.id);
              if (cur) {
                const panes = getPanesForTab(cur);
                if (panes.length === 1) {
                  // if previous split didn't apply due to active race, split now
                  const sh = cur.executable || "bash";
                  const cwd = cur.cwd || activeProjectRef.current?.path || "";
                  const newSessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
                  invoke("save_session_record", { record: { id: newSessionId, project_path: cwd, title: `Terminal (${sh})`, branch: activeProjectRef.current?.current_branch ?? "main", agent_name: sh, executable: sh, created_at: Date.now(), updated_at: Date.now() } }).catch(()=>{});
                  setSessions((prev) => [...prev, { id: newSessionId, project_path: cwd, title: `Terminal (${sh})`, branch: activeProjectRef.current?.current_branch ?? "main", state: "idle", active: false, agentName: sh, executable: sh, created_at: Date.now(), updated_at: Date.now() }]);
                  invoke<string>("create_split_terminal", { sessionId: newSessionId, executable: sh, cwd }).catch(()=>{ invoke<string>("create_split_terminal", { parentSessionId: panes[0]?.sessionId ?? cur.sessionId ?? newSessionId, executable: sh, cwd }).catch(()=>{}); });
                  setTabs((prev) => prev.map((t) => {
                    if (t.id !== tab.id) return t;
                    const panes2 = getPanesForTab(t);
                    if (panes2.length > 1) return t; // already split
                    const basePane: SplitPane = { sessionId: t.sessionId ?? panes2[0]?.sessionId ?? `sess_fallback_${Date.now()}`, executable: t.executable ?? sh, cwd: t.cwd ?? cwd };
                    const newPane: SplitPane = { sessionId: newSessionId, executable: sh, cwd };
                    const newPanes = [basePane, newPane];
                    return { ...t, splitPanes: newPanes, splitSessionIds: newPanes.map((p) => p.sessionId), splitDirection: "horizontal", splitLayout: { direction: "horizontal", panes: newPanes } };
                  }));
                }
              }
            }, 50);
          }
        },
        {
          label: "Split Terminal Down",
          icon: <PanelBottomClose className="w-3.5 h-3.5" />,
          shortcut: isMac ? "⌘Shift+\\" : "Ctrl+Shift+E",
          onClick: () => {
            setActiveTabId(tab.id);
            activeTabIdRef.current = tab.id;
            handleSplitTerminal("vertical");
            setTimeout(() => {
              const cur = tabsRef.current.find((t) => t.id === tab.id);
              if (cur) {
                const panes = getPanesForTab(cur);
                if (panes.length === 1) {
                  const sh = cur.executable || "bash";
                  const cwd = cur.cwd || activeProjectRef.current?.path || "";
                  const newSessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
                  invoke("save_session_record", { record: { id: newSessionId, project_path: cwd, title: `Terminal (${sh})`, branch: activeProjectRef.current?.current_branch ?? "main", agent_name: sh, executable: sh, created_at: Date.now(), updated_at: Date.now() } }).catch(()=>{});
                  setSessions((prev) => [...prev, { id: newSessionId, project_path: cwd, title: `Terminal (${sh})`, branch: activeProjectRef.current?.current_branch ?? "main", state: "idle", active: false, agentName: sh, executable: sh, created_at: Date.now(), updated_at: Date.now() }]);
                  invoke<string>("create_split_terminal", { sessionId: newSessionId, executable: sh, cwd }).catch(()=>{ invoke<string>("create_split_terminal", { parentSessionId: panes[0]?.sessionId ?? cur.sessionId ?? newSessionId, executable: sh, cwd }).catch(()=>{}); });
                  setTabs((prev) => prev.map((t) => {
                    if (t.id !== tab.id) return t;
                    const panes2 = getPanesForTab(t);
                    if (panes2.length > 1) return t;
                    const basePane: SplitPane = { sessionId: t.sessionId ?? panes2[0]?.sessionId ?? `sess_fallback_${Date.now()}`, executable: t.executable ?? sh, cwd: t.cwd ?? cwd };
                    const newPane: SplitPane = { sessionId: newSessionId, executable: sh, cwd };
                    const newPanes = [basePane, newPane];
                    return { ...t, splitPanes: newPanes, splitSessionIds: newPanes.map((p) => p.sessionId), splitDirection: "vertical", splitLayout: { direction: "vertical", panes: newPanes } };
                  }));
                }
              }
            }, 50);
          }
        },
        {
          separator: true,
          label: "Rename Tab...",
          icon: <Pencil className="w-3.5 h-3.5" />,
          onClick: () => {
            setPromptDialog({
              open: true,
              title: "Rename Tab",
              initialValue: tab.title,
              onSubmit: (newName) => {
                if (newName.trim()) {
                  handleRenameTab(tab.id, newName.trim());
                }
              },
            });
          }
        },
        {
          label: "Duplicate Tab",
          icon: <Copy className="w-3.5 h-3.5" />,
          onClick: () => {
            const newId = `tab_${Date.now()}`;
            // Sprint 2 P0: duplicate split panes with fresh PTY ids to avoid sharing
            const panes = getPanesForTab(tab);
            if (panes.length > 1) {
              const newPanes: SplitPane[] = panes.map((p) => ({
                sessionId: `sess_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                executable: p.executable,
                cwd: p.cwd,
              }));
              // persist new sessions minimally
              for (const np of newPanes) {
                invoke("save_session_record", { record: { id: np.sessionId, project_path: np.cwd ?? "", title: `Terminal (${np.executable ?? "bash"})`, branch: activeProjectRef.current?.current_branch ?? "main", agent_name: np.executable ?? "bash", executable: np.executable ?? "bash", created_at: Date.now(), updated_at: Date.now() } }).catch(()=>{});
                setSessions((prev) => [...prev, { id: np.sessionId ?? `sess_${Date.now()}`, project_path: np.cwd ?? "", title: `Terminal (${np.executable ?? "bash"})`, branch: activeProjectRef.current?.current_branch ?? "main", state: "idle", active: false, agentName: np.executable ?? "bash", executable: np.executable ?? "bash", created_at: Date.now(), updated_at: Date.now() }]);
              }
              const dir = getSplitDirectionForTab(tab);
              setTabs((prev) => [...prev, { ...tab, id: newId, title: `${tab.title} (copy)`, splitPanes: newPanes, splitSessionIds: newPanes.map((p)=>p.sessionId), splitDirection: dir, splitLayout: { direction: dir, panes: newPanes }, sessionId: newPanes[0].sessionId }]);
            } else {
              // single pane duplicate: new tab with fresh session
              const sh = tab.executable ?? "bash";
              const cwd = tab.cwd ?? "";
              const newSid = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
              invoke("save_session_record", { record: { id: newSid, project_path: cwd, title: `Terminal (${sh})`, branch: activeProjectRef.current?.current_branch ?? "main", agent_name: sh, executable: sh, created_at: Date.now(), updated_at: Date.now() } }).catch(()=>{});
              setSessions((prev) => [...prev, { id: newSid, project_path: cwd, title: `Terminal (${sh})`, branch: activeProjectRef.current?.current_branch ?? "main", state: "idle", active: false, agentName: sh, executable: sh, created_at: Date.now(), updated_at: Date.now() }]);
              setTabs((prev) => [...prev, { ...tab, id: newId, title: `${tab.title} (copy)`, sessionId: newSid, splitPanes: undefined, splitSessionIds: undefined, splitDirection: undefined, splitLayout: undefined }]);
            }
            setActiveTabId(newId);
          }
        },
        {
          separator: true,
          label: tab.isPinned ? "Unpin Tab" : "Pin Tab",
          icon: tab.isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />,
          onClick: () => {
            setTabs((prev) =>
              prev.map((t) => (t.id === tab.id ? { ...t, isPinned: !t.isPinned } : t))
            );
          }
        },
        {
          label: "Tab Color",
          icon: <Palette className="w-3.5 h-3.5" />,
          children: TAB_COLORS.map((c) => ({
            label: c.label,
            icon: c.value ? (
              <span
                className="w-2.5 h-2.5 rounded-full inline-block border border-white/20"
                style={{ backgroundColor: c.value }}
              />
            ) : undefined,
            onClick: () => {
              setTabs((prev) =>
                prev.map((t) => (t.id === tab.id ? { ...t, color: c.value } : t))
              );
            }
          })),
          onClick: () => {}
        },
        {
          separator: true,
          label: "Close Tab",
          icon: <X className="w-3.5 h-3.5" />,
          shortcut: isMac ? "⌘W" : "Ctrl+W",
          disabled: Boolean(tab.isPinned),
          danger: true,
          onClick: () => handleCloseTab(tab.id)
        },
        {
          label: "Close Other Tabs",
          icon: <ListX className="w-3.5 h-3.5" />,
          disabled: tabs.length <= 1,
          onClick: () => {
            setTabs([tab]);
            setActiveTabId(tab.id);
          }
        },
        {
          label: "Close Tabs to the Right",
          icon: <PanelRightClose className="w-3.5 h-3.5" />,
          disabled: !hasTabsToRight,
          onClick: () => handleCloseTabsToRight(tab.id)
        },
        {
          label: "Close Tabs to the Left",
          icon: <PanelLeftClose className="w-3.5 h-3.5" />,
          disabled: !hasTabsToLeft,
          onClick: () => handleCloseTabsToLeft(tab.id)
        },
        {
          separator: true,
          label: "Close All Tabs",
          icon: <Trash2 className="w-3.5 h-3.5" />,
          danger: true,
          onClick: () => handleCloseAllTabs()
        }
      ]
    });
  };

  const handleTabBarContextMenu = (e: React.MouseEvent) => {
    setContextMenu({
      source: "terminal-tab",
      x: e.clientX,
      y: e.clientY,
      items: [
        {
          label: "New Terminal Tab",
          icon: <SplitSquareVertical className="w-3.5 h-3.5" />,
          shortcut: isMac ? "⌘T" : "Ctrl+T",
          onClick: () => handleNewTab()
        },
        {
          separator: true,
          label: "Close All Tabs",
          icon: <Trash2 className="w-3.5 h-3.5" />,
          disabled: tabs.length === 0,
          danger: true,
          onClick: () => handleCloseAllTabs()
        }
      ]
    });
  };


  // Helpers for Orca parity: Open In submenu, file-manager label, etc.
  const getOpenInItems = (path: string): ContextMenuItem[] => {
    const apps = hydraSettings.open_in_applications ?? [];
    const items: ContextMenuItem[] = apps.map((app) => ({
      label: app.label || app.command,
      icon: <ExternalLink className="w-3.5 h-3.5" />,
      onClick: () => invoke("open_in_external_editor", { path, command: app.command }).catch(console.error),
    }));
    items.push({
      label: "Reveal in File Manager",
      icon: <FolderOpen className="w-3.5 h-3.5" />,
      onClick: () => invoke("open_in_file_manager", { path }).catch(console.error),
    });
    items.push({
      label: "Customize apps...",
      icon: <Sliders className="w-3.5 h-3.5" />,
      separator: true,
      onClick: () => setIsSettingsOpen(true),
    });
    return items;
  };
  /**
   * Orca `window.api.ui.writeClipboardText`: prefer the native bridge, fall back to
   * the web clipboard so the menu command stays observable in every shell.
   */
  const copyToClipboard = (text: string) => {
    const api = (window as unknown as {
      api?: { ui?: { writeClipboardText?: (value: string) => Promise<void> } };
    }).api;
    const write = api?.ui?.writeClipboardText;
    if (write) {
      void write.call(api?.ui, text).catch(() => {
        navigator.clipboard.writeText(text).catch(console.error);
      });
      return;
    }
    navigator.clipboard.writeText(text).catch(console.error);
  };
  /**
   * Orca sleep eligibility: Hydra folds its App-owned sessions/tabs and the
   * store's browser tabs into Orca's activity maps. A workspace with nothing to
   * release must show Sleep disabled instead of pretending to free memory.
   */
  const sleepActivityMaps = useMemo(
    () =>
      buildHydraSleepActivityMaps({
        sessions: sessions.map((session) => ({
          id: session.id,
          project_path: session.project_path,
          state: session.state,
        })),
        tabs: tabs.map((tab) => ({
          id: tab.id,
          cwd: tab.cwd,
          sessionId: tab.sessionId,
          splitPanes: tab.splitPanes,
          splitSessionIds: tab.splitSessionIds,
        })),
        browserTabsByWorktree: storeBrowserTabsByWorktree,
      }),
    [sessions, tabs, storeBrowserTabsByWorktree]
  );

  /** Every workspace row (visible or hidden) keyed by path, for lineage walks. */
  const lineageWorktreeRows = useMemo(() => {
    const rows = new Map<string, { id: string; path: string; isMainWorktree?: boolean }>();
    for (const list of Object.values(worktreesByProject)) {
      for (const wt of list) {
        rows.set(wt.path, {
          id: wt.path,
          path: wt.path,
          ...(wt.is_main ?? wt.isMainWorktree ? { isMainWorktree: true } : {}),
        });
      }
    }
    for (const wt of gitWorktrees) {
      if (rows.has(wt.path)) continue;
      rows.set(wt.path, {
        id: wt.path,
        path: wt.path,
        ...(wt.is_main ?? wt.isMainWorktree ? { isMainWorktree: true } : {}),
      });
    }
    return [...rows.values()];
  }, [worktreesByProject, gitWorktrees]);

  /**
   * Orca `sleep-worktree-flow`: ordered teardown (browsers → terminals → VM), sleep
   * intent + wake, active-workspace clearance and failure rollback. `keepIdentifiers`
   * keeps the persisted workbench record and marks sessions idle, so wake reloads
   * the same layout instead of a blank terminal.
   */
  const sleepWorktreePaths = useCallback(
    (paths: readonly string[]) => {
      const ids = [...new Set(paths.filter(Boolean))];
      if (ids.length === 0) return;
      void runSleepWorktrees(ids, {
        getActiveWorktreeId: () => activeWorktreePathRef.current,
        setActiveWorktree: (worktreePath) => {
          setActiveWorktreePath(worktreePath);
        },
        getSleepPayload: (worktreePath) => {
          const keptTabs = tabsRef.current.filter((tab) => {
            const cwd = tab.cwd ?? "";
            return cwd === worktreePath || cwd.startsWith(`${worktreePath}/`);
          });
          return serializeWorktreeSleepIntentPayload({
            version: 1,
            reason: "manual-sleep",
            tabIds: keptTabs.map((tab) => tab.id),
            activeTabId:
              activeWorktreePathRef.current === worktreePath
                ? activeTabIdRef.current || null
                : null,
          });
        },
        shutdownWorktreeBrowsers: async (worktreePath) => {
          // The live store does not compose the browser slice yet, so the guest
          // teardown cannot depend on its action existing. Destroy by registry
          // first (idempotent), then let the action clear rows if it is present.
          const state = useAppStore.getState();
          const pages = state.browserPagesByWorkspace;
          const tabs: unknown = state.browserTabsByWorktree[worktreePath] ?? [];
          if (Array.isArray(tabs)) {
            for (const tab of tabs) {
              if (
                tab !== null &&
                typeof tab === "object" &&
                "id" in tab &&
                typeof tab.id === "string"
              ) {
                destroyWorkspaceWebviews(pages, tab.id);
              }
            }
          }
          // Legacy sessions keyed by the workspace itself own a guest too.
          destroyWorkspaceWebviews(pages, worktreePath);
          const shutdown =
            "shutdownWorktreeBrowsers" in state
              ? state.shutdownWorktreeBrowsers
              : undefined;
          if (typeof shutdown === "function") {
            await shutdown.call(state, worktreePath);
          }
        },
        shutdownWorktreeTerminals: async (worktreePath) => {
          const sessionIds = new Set<string>();
          const targetTabs = tabsRef.current.filter((tab) => {
            const cwd = tab.cwd ?? "";
            return cwd === worktreePath || cwd.startsWith(`${worktreePath}/`);
          });
          for (const tab of targetTabs) {
            for (const pane of getPanesForTab(tab)) sessionIds.add(pane.sessionId);
          }
          for (const session of sessions) {
            if (session.project_path === worktreePath) sessionIds.add(session.id);
          }
          // keepIdentifiers: close the live PTYs but keep the on-disk records and
          // the workbench layout, so wake re-spawns the same tabs/history.
          for (const sessionId of sessionIds) {
            invoke("close_split_terminal", { sessionId }).catch(() => {});
          }
          if (targetTabs.length > 0) {
            // Why skip-once: this clear is UI only; the persisted tabs are the wake state.
            skipWorkbenchPersistenceOnceRef.current = true;
            const targetTabIds = new Set(targetTabs.map((tab) => tab.id));
            setTabs((prev) => {
              const remaining = prev.filter((tab) => !targetTabIds.has(tab.id));
              if (activeTabIdRef.current && targetTabIds.has(activeTabIdRef.current)) {
                setActiveTabId(remaining[remaining.length - 1]?.id ?? "");
              }
              return remaining;
            });
          }
          setSessions((prev) =>
            prev.map((session) =>
              sessionIds.has(session.id)
                ? { ...session, state: "idle" as const, active: false }
                : session
            )
          );
        },
        // No `window.api.ephemeralVm.suspendWorkspace` bridge exists in Hydra; the
        // frontend contract stays optional until the IPC lands.
        captureScrollAnchor: () => requestVirtualizedScrollAnchorRecord("[data-worktree-sidebar]"),
      }).then((result) => {
        if (result.errors.length === 0) return;
        toast.error(
          ids.length === 1 ? "Failed to sleep workspace" : "Failed to sleep some workspaces",
          { description: result.errors.join("\n") }
        );
      });
    },
    [getPanesForTab, sessions, storeBrowserTabsByWorktree]
  );


  const togglePinProject = (id: string) => {
    setPinnedProjects((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };
  const toggleUnreadProject = (id: string) => {
    setUnreadProjects((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };
  // D07 G7: pin/unread persistem no SQLite via `set_worktree_flags`. O applier
  // aplica o novo membership já no primeiro paint, grava e reverte se falhar.
  const applyPinnedWorktreeFlag = useMemo(
    () =>
      createWorktreeFlagApplier({
        field: "is_pinned",
        setWorktreeFlagged: setPinnedWorktrees,
        setProjectFlagged: setPinnedProjects,
        findProjectIdByPath: (path) => projects.find((p) => p.path === path)?.id,
        invoke,
      }),
    [projects]
  );
  const applyUnreadWorktreeFlag = useMemo(
    () =>
      createWorktreeFlagApplier({
        field: "is_unread",
        setWorktreeFlagged: setUnreadWorktrees,
        setProjectFlagged: setUnreadProjects,
        findProjectIdByPath: (path) => projects.find((p) => p.path === path)?.id,
        invoke,
      }),
    [projects]
  );
  const togglePinWorktree = (path: string) => {
    void applyPinnedWorktreeFlag(path, pinnedWorktrees.has(path));
  };
  // D08-028: soltar um card na faixa de pin do board fixa — nunca desafixa, e nunca
  // escreve status. Um workspace já fixado é no-op, então o drop é idempotente (mesma
  // regra do `pinWorktrees` do Orca) e continua sendo o ÚNICO escritor de pin do app.
  const pinWorktree = (path: string) => {
    if (pinnedWorktrees.has(path)) return;
    togglePinWorktree(path);
  };
  const toggleUnreadWorktree = (path: string) => {
    void applyUnreadWorktreeFlag(path, unreadWorktrees.has(path));
  };

  // PR-15: conditional unread drives from agent:state events (not toggle).
  // Marks on blocked/working transitions of non-active sessions; clears on reveal.
  const markUnreadWorktree = (path: string) => {
    setUnreadWorktrees((prev) => { if (prev.has(path)) return prev; const next = new Set(prev); next.add(path); return next; });
  };
  const clearUnreadWorktree = (path: string) => {
    setUnreadWorktrees((prev) => { if (!prev.has(path)) return prev; const next = new Set(prev); next.delete(path); return next; });
  };
  const markUnreadProject = (id: string) => {
    setUnreadProjects((prev) => { if (prev.has(id)) return prev; const next = new Set(prev); next.add(id); return next; });
  };
  const clearUnreadProject = (id: string) => {
    setUnreadProjects((prev) => { if (!prev.has(id)) return prev; const next = new Set(prev); next.delete(id); return next; });
  };

  const handleProjectContextMenu = (e: React.MouseEvent, proj: HydraProject) => {
    const isPinned = pinnedProjects.has(proj.id);
    const isUnread = unreadProjects.has(proj.id);
    const groupId = projectGroupMap[proj.id];
    const groupName = groupId ? projectGroups.find((g) => g.id === groupId)?.name : undefined;
    void groupName;
    const lineageParent = worktreeLineage[proj.path];
    const eligibleParents = getEligibleParentCandidates(proj.path);
    const developerRevealed = e.altKey;
    const openInChildren = getOpenInItems(proj.path);

    window.dispatchEvent(new Event(CLOSE_ALL_CONTEXT_MENUS_EVENT));
    setContextMenu({
      source: "sidebar",
      x: e.clientX,
      y: e.clientY,
      items: [
        { label: "Workspace", isLabel: true, onClick: () => {} },
        {
          label: "Update Project...",
          icon: <Pencil className="w-3.5 h-3.5" />,
          onClick: () => {
            setPromptDialog({
              open: true,
              title: "Update Project Display Name",
              initialValue: proj.name,
              onSubmit: (newName) => {
                if (newName.trim() && newName.trim() !== proj.name) {
                  try {
                    const overrides = JSON.parse(localStorage.getItem("hydra:project_name_overrides") || "{}");
                    overrides[proj.id] = newName.trim();
                    localStorage.setItem("hydra:project_name_overrides", JSON.stringify(overrides));
                    setProjects((prev) => prev.map((p) => p.id === proj.id ? { ...p, name: newName.trim() } : p));
                    if (activeProject?.id === proj.id) setActiveProject((prev) => prev ? { ...prev, name: newName.trim() } : prev);
                  } catch {}
                }
              },
            });
          },
        },
        {
          label: "Open in",
          icon: <FolderOpen className="w-3.5 h-3.5" />,
          children: openInChildren,
          onClick: () => {},
        },
        {
          label: "Copy Path",
          icon: <Copy className="w-3.5 h-3.5" />,
          onClick: () => navigator.clipboard.writeText(proj.path).catch(console.error),
        },
        { label: "Copy Project Name", icon: <Copy className="w-3.5 h-3.5" />, onClick: () => navigator.clipboard.writeText(proj.name).catch(console.error) },
        { label: isPinned ? "Unpin" : "Pin", icon: isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />, onClick: () => togglePinProject(proj.id), separator: true },
        { label: isUnread ? "Mark Read" : "Mark Unread", icon: isUnread ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />, onClick: () => toggleUnreadProject(proj.id) },
        { label: "New group from project", icon: <FolderPlus className="w-3.5 h-3.5" />, separator: true, onClick: () => {
            const hostId = getExecutionHostIdForRepoPath(storeRepos, proj.path);
            window.dispatchEvent(new CustomEvent("hydra:open-new-group-dialog", { detail: { projectId: proj.id, defaultName: `${proj.name} group`, ...(hostId ? { hostId } : {}) } }));
          }
        },
        ...(projectGroups.length > 0 ? [{
          label: "Move to group",
          icon: <FolderInput className="w-3.5 h-3.5" />,
          children: projectGroups.map((g) => ({
            label: g.name,
            icon: undefined,
            disabled: projectGroupMap[proj.id] === g.id,
            onClick: () => {
              const hostId = getExecutionHostIdForRepoPath(storeRepos, proj.path);
              window.dispatchEvent(new CustomEvent("hydra:move-project-to-group", { detail: { projectId: proj.id, groupId: g.id, ...(hostId ? { hostId } : {}) } }));
            },
          })),
          onClick: () => {},
        } as ContextMenuItem] : []),
        ...(groupId ? [{ label: "Remove from group", icon: <X className="w-3.5 h-3.5" />, onClick: () => { const hostId = getExecutionHostIdForRepoPath(storeRepos, proj.path); window.dispatchEvent(new CustomEvent("hydra:remove-project-from-group", { detail: { projectId: proj.id, ...(hostId ? { hostId } : {}) } })); } } as ContextMenuItem] : []),
        {
          label: lineageParent ? "Change Parent Worktree..." : "Set Parent Worktree...",
          icon: <FolderTree className="w-3.5 h-3.5" />,
          separator: true,
          disabled: eligibleParents.length === 0,
          title: eligibleParents.length === 0 ? "No eligible parents" : undefined,
          onClick: () => {
            const child = parentPickerCandidateByPath.get(proj.path);
            if (!child || eligibleParents.length === 0) return;
            // Orca `handleOpenParentPicker`: dismiss the menu first and open the anchored
            // picker after the close cycle.
            window.dispatchEvent(new Event(CLOSE_ALL_CONTEXT_MENUS_EVENT));
            setContextMenu(null);
            scheduleParentPickerOpen({
              child,
              anchorRect: getParentPickerAnchorRect(e, proj.path),
              focusRestoreElement:
                document.activeElement instanceof HTMLElement ? document.activeElement : null,
              selectParent: (selectedPath) => setWorktreeLineageParents([proj.path], selectedPath),
              removeParent: () => unnestWorktreePaths([proj.path]),
            });
          },
        },
        ...(lineageParent ? [{ label: "Open Parent Worktree", icon: <Workflow className="w-3.5 h-3.5" />, onClick: () => {
              const parentProj = projects.find((p) => p.path === lineageParent);
              if (parentProj) handleSelectProject(parentProj);
              else invoke("open_in_file_manager", { path: lineageParent }).catch(console.error);
            } } as ContextMenuItem, { label: "Remove from Parent", icon: <Unlink className="w-3.5 h-3.5" />, onClick: () => unnestWorktreePaths([proj.path]) } as ContextMenuItem] : []),
        ...(developerRevealed ? [{ label: "Developer", isLabel: true, separator: true, onClick: () => {} } as ContextMenuItem, { label: `Path: ${proj.path}`, icon: <Copy className="w-3.5 h-3.5" />, onClick: () => navigator.clipboard.writeText(proj.path).catch(console.error) } as ContextMenuItem, { label: `Is Git: ${proj.is_git ? "yes" : "no"} · Branch: ${proj.current_branch}`, icon: <GitBranch className="w-3.5 h-3.5" />, onClick: () => {} } as ContextMenuItem] : []),
        { label: "Sleep", icon: <Moon className="w-3.5 h-3.5" />, separator: true, onClick: () => sleepWorktreePaths([proj.path]) },
        { label: "Delete Worktree", icon: <Trash2 className="w-3.5 h-3.5" />, danger: true, disabled: true, title: "Primary worktree — can't be deleted. Remove the project instead.", onClick: () => {}, separator: true },
        { label: "Remove Project from Hydra", icon: <Trash2 className="w-3.5 h-3.5" />, danger: true, onClick: () => handleRemoveProject(proj) },
      ]
    });
  };

  /**
   * The single writer for a workspace status: the host command plus the local worktree maps
   * the sidebar (and the workspace board, which projects from them) read. Shared by the
   * worktree context menu and the board's card drop — one column, one persist path.
   *
   * Why a batch: the workspace board's card menu assigns a status to the whole selection when
   * the right-clicked card is part of it. The write stays per worktree — the host command keys
   * on one path, and a workspace the host refuses must not cancel the others — while the local
   * projections are patched in one pass, so the sidebar never paints a half-applied batch.
   */
  const assignWorktreeStatuses = useCallback(
    async (worktreePaths: readonly string[], status: string | null) => {
      try {
        await persistWorktreeStatusBatch(worktreePaths, status);
        setGitWorktrees((prev) =>
          worktreePaths.reduce((next, path) => applyWorktreeStatus(next, path, status), prev)
        );
        setWorktreesByProject((prev) =>
          worktreePaths.reduce(
            (next, path) => applyWorktreeStatusByProject(next, path, status),
            prev
          )
        );
        window.dispatchEvent(new CustomEvent("hydra:refresh-projects"));
      } catch (e) {
        console.error("Failed to set worktree status:", e);
      }
    },
    []
  );

  const assignWorktreeStatus = useCallback(
    (worktreePath: string, status: string | null) => assignWorktreeStatuses([worktreePath], status),
    [assignWorktreeStatuses]
  );

  /** Orca folder-row context: the entry removal travels as a typed `folder` intent. */
  const handleFolderWorkspaceContextMenu = (
    e: React.MouseEvent,
    folder: { id: string; name: string; folderPath: string }
  ) => {
    window.dispatchEvent(new Event(CLOSE_ALL_CONTEXT_MENUS_EVENT));
    setContextMenu({
      source: "sidebar",
      x: e.clientX,
      y: e.clientY,
      items: [
        { label: "Workspace", isLabel: true, onClick: () => {} },
        {
          label: "Open in",
          icon: <FolderOpen className="w-3.5 h-3.5" />,
          children: getOpenInItems(folder.folderPath),
          onClick: () => {},
        },
        {
          label: "Copy Path",
          icon: <Copy className="w-3.5 h-3.5" />,
          onClick: () => copyToClipboard(folder.folderPath),
        },
        {
          label: "Remove Workspace...",
          icon: <Trash2 className="w-3.5 h-3.5" />,
          danger: true,
          separator: true,
          onClick: () => {
            const intent = createWorktreeContextMenuDeleteIntent({
              worktree: { id: folder.id },
              batchDeleteWorktrees: [],
              isMultiContext: false,
              folderWorkspaceId: folder.id,
            });
            // Why deferred: the confirmation must open after this menu closes, so
            // Escape/outside-click handling cannot dismiss both at once.
            deferWorktreeContextMenuDeleteIntent(intent, {
              openDelete: () => {},
              deleteFolderWorkspace: async (folderWorkspaceId) => {
                handleDeleteFolderWorkspace(folderWorkspaceId);
                return true;
              },
            });
            setContextMenu(null);
          },
        },
      ],
    });
  };

  const handleWorktreeContextMenu = (
    e: React.MouseEvent,
    wt: GitWorktreeInfo,
    proj: HydraProject,
    targetWorktreePaths?: readonly string[]
  ) => {
    // Same source the sidebar pipeline and the workspace board read (`state.workspaceStatuses`).
    const workspaceStatuses = useAppStore.getState().workspaceStatuses ?? cloneDefaultWorkspaceStatuses();
    const isMain = wt.path === proj.path;
    const isPinned = pinnedWorktrees.has(wt.path);
    const isUnread = unreadWorktrees.has(wt.path);
    const lineageParent = worktreeLineage[wt.path];
    const eligibleParents = getEligibleParentCandidates(wt.path);
    const contextPaths =
      targetWorktreePaths && targetWorktreePaths.length > 0 ? [...targetWorktreePaths] : [wt.path];
    const isMultiContext = contextPaths.length > 1;
    // Orca `shouldRevealWorktreeDeveloperMenu`: Option/Alt at open time reveals the
    // developer rows, and a multi-context menu never does.
    const developerRevealed = shouldRevealWorktreeDeveloperMenu({
      developerMenuRevealed: e.altKey,
      isMultiContext,
    });

    const openInChildren = getOpenInItems(wt.path);
    const contextRows = contextPaths
      .map((path) => lineageWorktreeRows.find((row) => row.path === path))
      .filter((row): row is NonNullable<typeof row> => Boolean(row));
    // Orca sleep: recursive descendants (not one level), eligibility-filtered
    // targets, and a dedicated subtree row.
    const sleepLineage = isMultiContext
      ? { descendants: [], targets: [], sleepableTargets: [] }
      : getWorkspaceSleepLineage(
          { id: wt.path, path: wt.path },
          lineageWorktreeRows,
          worktreeLineage,
          sleepActivityMaps
        );
    const sleepMenu = getWorkspaceSleepMenuState({
      isMultiContext,
      activeContextWorktrees: contextRows,
      lineageDescendantCount: sleepLineage.descendants.length,
      sleepableTargets: sleepLineage.targets,
      activity: sleepActivityMaps,
    });
    const sleepOncePaths = isMultiContext
      ? getSleepableWorktrees(contextRows, sleepActivityMaps).map((row) => row.id)
      : [wt.path];
    const subtreeSleepPaths = sleepLineage.sleepableTargets.map((row) => row.id);
    // Delete policy: only rows whose repo resolves and that are not in-flight can
    // be deleted; an unresolved repo would silently no-op after confirmation.
    const contextIdentities: WorktreeDeleteIdentity[] = [];
    for (const path of contextPaths) {
      for (const [repoPath, list] of Object.entries(worktreesByProject)) {
        const row = list.find((entry) => entry.path === path);
        if (!row) continue;
        const rowHostId = getExecutionHostIdForRepoPath(storeRepos, repoPath);
        contextIdentities.push({
          id: row.id ?? `${repoPath}::${row.path}`,
          ...(rowHostId ? { hostId: rowHostId } : {}),
        });
        break;
      }
    }
    const isContextDeleting = contextIdentities.some((identity) =>
      Boolean(deleteStateByWorktreeId[getDeleteStateKeyForWorktreeHost(identity)]?.isDeleting)
    );
    const singleRepoResolved = resolveWorktreeRepoPath(wt.path) !== null;
    const deleteAllowed = isMultiContext
      ? contextIdentities.length > 0 && !isContextDeleting
      : isContextWorktreeDeletable(
          { isMainWorktree: isMain },
          singleRepoResolved ? { id: proj.id } : null
        ) && !isContextDeleting;
    const groupId = projectGroupMap[proj.id];
    const hostIdForGroups = getExecutionHostIdForRepoPath(storeRepos, proj.path);
    const groupSubmenuItems: ContextMenuItem[] = [
      {
        label: "New group from project",
        icon: <FolderPlus className="w-3.5 h-3.5" />,
        onClick: () => {
          window.dispatchEvent(
            new CustomEvent("hydra:open-new-group-dialog", {
              detail: {
                projectId: proj.id,
                defaultName: proj.displayName || proj.name,
                ...(hostIdForGroups ? { hostId: hostIdForGroups } : {}),
              },
            })
          );
        },
      },
      ...projectGroups.map((group) => ({
        label: `Move to ${group.name}`,
        icon: <FolderInput className="w-3.5 h-3.5" />,
        disabled: group.id === groupId,
        onClick: () => {
          window.dispatchEvent(
            new CustomEvent("hydra:move-project-to-group", {
              detail: {
                projectId: proj.id,
                groupId: group.id,
                ...(hostIdForGroups ? { hostId: hostIdForGroups } : {}),
              },
            })
          );
        },
      })),
      ...(groupId
        ? [{
            label: "Remove from group",
            icon: <X className="w-3.5 h-3.5" />,
            separator: true,
            onClick: () => {
              window.dispatchEvent(
                new CustomEvent("hydra:remove-project-from-group", {
                  detail: { projectId: proj.id, ...(hostIdForGroups ? { hostId: hostIdForGroups } : {}) },
                })
              );
            },
          } as ContextMenuItem]
        : []),
    ];

    const handleAssignWorktreeStatus = async (status: string | null) => {
      await assignWorktreeStatuses(
        targetWorktreePaths && targetWorktreePaths.length > 0
          ? targetWorktreePaths
          : [wt.path],
        status
      );
    };

    window.dispatchEvent(new Event(CLOSE_ALL_CONTEXT_MENUS_EVENT));
    setContextMenu({
      source: "sidebar",
      x: e.clientX,
      y: e.clientY,
      items: [
        { label: "Workspace", isLabel: true, onClick: () => {} },
        {
          label: "Rename Worktree Display Name...",
          icon: <Pencil className="w-3.5 h-3.5" />,
          onClick: () => {
            setPromptDialog({
              open: true,
              title: "Rename Worktree",
              description: "Custom display title stored in SQLite",
              initialValue: wt.display_name || wt.branch,
              confirmLabel: "Save",
              onSubmit: async (newTitle) => {
                const trimmed = newTitle.trim();
                if (!trimmed) return;
                try {
                  await invoke("set_worktree_display_name", {
                    worktreePath: wt.path,
                    displayName: trimmed,
                  });
                  setGitWorktrees((prev) =>
                    prev.map((w) => (w.path === wt.path ? { ...w, display_name: trimmed } : w))
                  );
                  setWorktreesByProject((prev) => {
                    const next = { ...prev };
                    for (const k of Object.keys(next)) {
                      next[k] = next[k].map((w) => (w.path === wt.path ? { ...w, display_name: trimmed } : w));
                    }
                    return next;
                  });
                  window.dispatchEvent(new CustomEvent("hydra:refresh-projects"));
                } catch (e) {
                  console.error("Failed to rename worktree display name:", e);
                }
              },
            });
          },
        },
        {
          label: "Edit Workspace Metadata...",
          icon: <Pencil className="w-3.5 h-3.5" />,
          onClick: () => {
            setWorktreeMetaDialog({ wt });
          },
        },
        {
          label: "Rename Branch in Git...",
          icon: <GitBranch className="w-3.5 h-3.5" />,
          onClick: () => {
            setPromptDialog({
              open: true,
              title: "Rename Branch in Git",
              description: `Rename branch '${wt.branch}' using git branch -m`,
              initialValue: wt.branch,
              confirmLabel: "Rename",
              onSubmit: async (newBranch) => {
                const trimmed = newBranch.trim();
                if (!trimmed || trimmed === wt.branch) return;
                try {
                  await invoke("git_rename_branch_cmd", {
                    repoPath: wt.path,
                    oldName: wt.branch,
                    newName: trimmed,
                  });
                  setGitWorktrees((prev) =>
                    prev.map((w) => (w.path === wt.path ? { ...w, branch: trimmed } : w))
                  );
                  setWorktreesByProject((prev) => {
                    const next = { ...prev };
                    for (const k of Object.keys(next)) {
                      next[k] = next[k].map((w) => (w.path === wt.path ? { ...w, branch: trimmed } : w));
                    }
                    return next;
                  });
                  window.dispatchEvent(new CustomEvent("hydra:refresh-projects"));
                } catch (e) {
                  console.error("Failed to rename git branch:", e);
                }
              },
            });
          },
        },
        { label: "Open in", icon: <FolderOpen className="w-3.5 h-3.5" />, children: openInChildren, onClick: () => {} },
        { label: "Copy Path", icon: <Copy className="w-3.5 h-3.5" />, onClick: () => copyToClipboard(wt.path) },
        { label: `Copy Branch: ${wt.branch}`, icon: <GitBranch className="w-3.5 h-3.5" />, onClick: () => copyToClipboard(wt.branch) },
        { label: "Copy Commit", icon: <Copy className="w-3.5 h-3.5" />, onClick: () => copyToClipboard(wt.head_commit) },
        { label: isPinned ? "Unpin" : "Pin", icon: isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />, separator: true, onClick: () => togglePinWorktree(wt.path) },
        { label: isUnread ? "Mark Read" : "Mark Unread", icon: isUnread ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />, onClick: () => toggleUnreadWorktree(wt.path) },
        buildWorktreeStatusMenuItems({
          workspaceStatuses,
          currentStatus: wt.status ?? null,
          onAssignStatus: handleAssignWorktreeStatus,
          isMultiContext: (targetWorktreePaths?.length ?? 0) > 1,
          // The removal state is keyed by the row's identity; the bare id is the
          // legacy key the delete flow still writes for a local workspace.
          disabled: Boolean(
            deleteStateByWorktreeId[wt.id ?? `${proj.path}::${wt.path}`]?.isDeleting
          ),
        }),
        {
          label: getWorktreeParentPickerLabel(lineageParent ?? null),
          icon: <FolderTree className="w-3.5 h-3.5" />,
          separator: true,
          // Orca `isWorktreeParentPickerDisabled`: an in-flight delete owns the row.
          disabled: isWorktreeParentPickerDisabled({
            isDeleting: isContextDeleting,
            eligibleParentCount: eligibleParents.length,
          }),
          title: isContextDeleting
            ? "This workspace is being deleted"
            : eligibleParents.length === 0
              ? "No eligible parents"
              : undefined,
          onClick: () => {
            const child = parentPickerCandidateByPath.get(wt.path);
            if (!child || eligibleParents.length === 0 || isContextDeleting) return;
            // Orca anchors the picker to the right-clicked card: the card scope's own
            // rectangle, or the contextmenu point when the row is not a drag card.
            window.dispatchEvent(new Event(CLOSE_ALL_CONTEXT_MENUS_EVENT));
            setContextMenu(null);
            scheduleParentPickerOpen({
              child,
              anchorRect: getParentPickerAnchorRect(e, wt.id ?? wt.path),
              focusRestoreElement:
                document.activeElement instanceof HTMLElement ? document.activeElement : null,
              // Orca removes/assigns the relation for every workspace in the
              // current context (multi-selection included).
              selectParent: (selectedPath) =>
                setWorktreeLineageParents(contextPaths, selectedPath),
              removeParent: () => unnestWorktreePaths(contextPaths),

            });
          },
        },
        ...(lineageParent ? [{ label: "Open Parent Worktree", icon: <Workflow className="w-3.5 h-3.5" />, onClick: () => {
              const parentProj = projects.find((p) => p.path === lineageParent) || null;
              if (parentProj) handleSelectProject(parentProj);
              else {
                const wtParent = gitWorktrees.find((w) => w.path === lineageParent);
                if (wtParent) handleSelectGitWorktree(wtParent);
                else invoke("open_in_file_manager", { path: lineageParent }).catch(console.error);
              }
            } } as ContextMenuItem, { label: "Remove from Parent", icon: <Unlink className="w-3.5 h-3.5" />, onClick: () => unnestWorktreePaths(contextPaths) } as ContextMenuItem] : []),
        // Orca `ProjectGroup` submenu on the CARD context: create/move/remove in one place.
        { label: "Project Group", icon: <FolderTree className="w-3.5 h-3.5" />, children: groupSubmenuItems, onClick: () => {}, disabled: isMultiContext },
        ...(developerRevealed ? [{ label: "Developer", isLabel: true, separator: true, onClick: () => {} } as ContextMenuItem, { label: `Head: ${wt.head_commit.slice(0,7)} · Bare: ${wt.is_bare ? "yes":"no"}`, icon: <MoreHorizontal className="w-3.5 h-3.5" />, onClick: () => copyToClipboard(wt.head_commit) } as ContextMenuItem] : []),

        {
          label: sleepMenu.sleepLabel,
          icon: <Moon className="w-3.5 h-3.5" />,
          separator: true,
          // Orca `WorkspaceSleepMenuItems`: nothing to release ⇒ disabled with an
          // explanation instead of a no-op that claims memory was freed.
          disabled: sleepMenu.sleepDisabled,
          title: sleepMenu.sleepDisabled
            ? "No active panels to close"
            : isMultiContext
              ? "Close all active panels in the selected workspaces to free up memory and CPU."
              : "Close all active panels in this workspace to free up memory and CPU.",
          // Orca `sleepWorktreesAfterMenuClose`: close the menu, sleep 50ms later.
          onClick: () =>
            scheduleSleepWorktreesAfterMenuClose(
              sleepOncePaths,
              sleepWorktreePaths,
              () => setContextMenu(null)
            ),
        },
        ...(sleepMenu.descendantCount > 0
          ? [{
              label: `Sleep with Descendants (${sleepMenu.descendantCount})`,
              icon: <Moon className="w-3.5 h-3.5" />,
              disabled: sleepMenu.subtreeSleepDisabled,
              title: sleepMenu.subtreeSleepDisabled
                ? "No active panels in this subtree"
                : "Close active panels in this workspace and every nested descendant to free up memory and CPU.",
              onClick: () =>
                scheduleSleepWorktreesAfterMenuClose(
                  subtreeSleepPaths,
                  sleepWorktreePaths,
                  () => setContextMenu(null)
                ),
            } as ContextMenuItem]
          : []),
        ...(isMain
          ? [{ label: "Delete Worktree", icon: <Trash2 className="w-3.5 h-3.5" />, danger: true, disabled: true, title: "Primary worktree — can't be deleted. Remove the project instead.", separator: true, onClick: () => {} } as ContextMenuItem,
             { label: "Remove Project from Hydra", icon: <Trash2 className="w-3.5 h-3.5" />, danger: true, onClick: () => handleRemoveProject(proj) } as ContextMenuItem]
          : [{
              label: isMultiContext
                ? `Delete ${contextIdentities.length} Workspace${contextIdentities.length === 1 ? "" : "s"}`
                : sleepLineage.descendants.length > 0
                  ? "Delete with Descendants…"
                  : "Delete Worktree",
              icon: <Trash2 className="w-3.5 h-3.5" />,
              danger: true,
              separator: true,
              disabled: !deleteAllowed,
              title: !deleteAllowed
                ? isContextDeleting
                  ? "A selected workspace is already being deleted"
                  : "This workspace is not attached to a resolvable repository"
                : undefined,
              onClick: () => {
                if (!deleteAllowed) return;
                // Orca `handleDelete`: capture sibling position, record the scroll
                // anchor, build a typed intent and defer it so the menu closes first.
                const restoreSidebarPosition = preserveDeleteSiblingPosition(e.currentTarget as HTMLElement | null);
                requestVirtualizedScrollAnchorRecord("[data-worktree-sidebar]");
                const intent = createWorktreeContextMenuDeleteIntent({
                  worktree: contextIdentities[0] ?? { id: `${proj.path}::${wt.path}` },
                  batchDeleteWorktrees: contextIdentities,
                  isMultiContext,
                });
                deferWorktreeContextMenuDeleteIntent(
                  intent,
                  {
                    openDelete: openDeleteWorktreeConfirmation,
                    deleteFolderWorkspace: async () => false,
                  },
                  restoreSidebarPosition
                );
                setContextMenu(null);
              },
            } as ContextMenuItem]),
      ]
    });
  };

  const handleSessionContextMenu = (e: React.MouseEvent, session: WorktreeSession) => {
    const isPinned = pinnedWorktrees.has(session.id) || pinnedWorktrees.has(session.project_path);
    const isUnread = unreadWorktrees.has(session.id);
    const lineageParent = worktreeLineage[session.project_path] || worktreeLineage[session.id];
    const eligibleParents = getEligibleParentCandidates(session.project_path);
    const openInChildren = getOpenInItems(session.project_path);
    const developerRevealed = e.altKey;
    window.dispatchEvent(new Event(CLOSE_ALL_CONTEXT_MENUS_EVENT));
    setContextMenu({
      source: "sidebar",
      x: e.clientX,
      y: e.clientY,
      items: [
        { label: "Workspace", isLabel: true, onClick: () => {} },
        { label: "Split Terminal Right", icon: <SplitSquareVertical className="w-3.5 h-3.5" />, shortcut: "Ctrl+Shift+D", onClick: () => handleSplitTerminal("horizontal") },
        { label: "Split Terminal Down", icon: <Terminal className="w-3.5 h-3.5" />, shortcut: "Ctrl+Shift+E", onClick: () => handleSplitTerminal("vertical") },
        {
          label: "Rename",
          icon: <Pencil className="w-3.5 h-3.5" />,
          shortcut: "F2",
          onClick: () => {
            setPromptDialog({
              open: true,
              title: "Rename Session",
              initialValue: session.title,
              onSubmit: (newTitle) => {
                if (newTitle.trim()) {
                  const updated = { ...session, title: newTitle.trim() };
                  setSessions((prev) => prev.map((s) => (s.id === session.id ? updated : s)));
                  invoke("save_session_record", {
                    record: {
                      id: updated.id,
                      project_path: session.project_path,
                      title: updated.title,
                      branch: updated.branch,
                      agent_name: updated.agentName,
                      executable: updated.executable,
                      created_at: Date.now(),
                      updated_at: Date.now(),
                    },
                  }).catch(console.error);
                }
              },
            });
          },
        },
        { label: "Open in", icon: <FolderOpen className="w-3.5 h-3.5" />, children: openInChildren, onClick: () => {} },
        { label: `Copy Branch: ${session.branch}`, icon: <GitBranch className="w-3.5 h-3.5" />, onClick: () => navigator.clipboard.writeText(session.branch).catch(console.error) },
        { label: "Copy Path", icon: <Copy className="w-3.5 h-3.5" />, onClick: () => navigator.clipboard.writeText(session.project_path).catch(console.error) },
        { label: "Copy Session Title", icon: <Copy className="w-3.5 h-3.5" />, onClick: () => navigator.clipboard.writeText(session.title).catch(console.error) },
        { label: "Copy Session ID", icon: <Hash className="w-3.5 h-3.5" />, shortcut: "Alt+C", onClick: () => navigator.clipboard.writeText(session.id).catch(console.error) },
        { label: "Copy Terminal ID", icon: <Terminal className="w-3.5 h-3.5" />, shortcut: "Alt+T", onClick: () => navigator.clipboard.writeText(session.id).catch(console.error) },
        { label: isPinned ? "Unpin" : "Pin", icon: isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />, separator: true, onClick: () => togglePinWorktree(session.id) },
        { label: isUnread ? "Mark Read" : "Mark Unread", icon: isUnread ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />, onClick: () => toggleUnreadWorktree(session.id) },
        { label: "Duplicate Session", icon: <Copy className="w-3.5 h-3.5" />, onClick: () => {
            const newId = `sess_${Date.now()}`;
            const dup: WorktreeSession = { ...session, id: newId, title: `${session.title} (copy)`, active: false };
            setSessions((prev) => [...prev, dup]);
            invoke("save_session_record", { record: { id: dup.id, project_path: dup.project_path, title: dup.title, branch: dup.branch, agent_name: dup.agentName, executable: dup.executable, created_at: Date.now(), updated_at: Date.now() } }).catch(console.error);
          }
        },
        {
          label: lineageParent ? "Change Parent Worktree..." : "Set Parent Worktree...",
          icon: <FolderTree className="w-3.5 h-3.5" />,
          separator: true,
          disabled: eligibleParents.length === 0,
          title: eligibleParents.length === 0 ? "No eligible parents" : undefined,
          onClick: () => {
            const child = parentPickerCandidateByPath.get(session.project_path);
            if (!child || eligibleParents.length === 0) return;
            window.dispatchEvent(new Event(CLOSE_ALL_CONTEXT_MENUS_EVENT));
            setContextMenu(null);
            scheduleParentPickerOpen({
              child,
              anchorRect: getParentPickerAnchorRect(e, session.id),
              focusRestoreElement:
                document.activeElement instanceof HTMLElement ? document.activeElement : null,
              // A fleet session records its lineage under both the workspace path and its own
              // id; the picker edits the workspace, so both keys move together.
              selectParent: (selectedPath) =>
                setWorktreeLineageParents(
                  [session.project_path, session.id],
                  selectedPath
                ),
              removeParent: () =>
                unnestWorktreePaths([session.project_path, session.id]),
            });
          },
        },
        ...(lineageParent ? [{ label: "Open Parent Worktree", icon: <Workflow className="w-3.5 h-3.5" />, onClick: () => {
              const parentProj = projects.find((p) => p.path === lineageParent);
              if (parentProj) handleSelectProject(parentProj);
            } } as ContextMenuItem, { label: "Remove from Parent", icon: <Unlink className="w-3.5 h-3.5" />, onClick: () => unnestWorktreePaths([session.project_path, session.id]) } as ContextMenuItem] : []),
        ...(developerRevealed ? [{ label: "Developer", isLabel: true, separator: true, onClick: () => {} } as ContextMenuItem, { label: `ID: ${session.id}`, icon: <Copy className="w-3.5 h-3.5" />, onClick: () => navigator.clipboard.writeText(session.id).catch(console.error) } as ContextMenuItem, { label: `Agent: ${session.agentName} · ${session.executable}`, icon: <MoreHorizontal className="w-3.5 h-3.5" />, onClick: () => {} } as ContextMenuItem] : []),
        { label: "Sleep", icon: <Moon className="w-3.5 h-3.5" />, separator: true, onClick: () => sleepWorktreePaths([session.project_path]) },
        { label: "Close / Delete Fleet Session", icon: <Trash2 className="w-3.5 h-3.5" />, danger: true, separator: true, onClick: () => handleDeleteSession(session.id) },
      ]
    });
  };

  const handleSettingsSaved = (newSettings: HydraSettings) => {
    const n = normalizeHydraSettings(newSettings);
    setHydraSettings(n);
    applyDocumentTheme(n.theme);
    try { localStorage.setItem("hydra:theme", n.theme); } catch {}
    // Orca writes settings and repaints; it has no "Settings updated: …" feed entry.
  };

  const currentTab = tabs.find((t) => t.id === activeTabId);

  return (
    <TooltipProvider delayDuration={400}>
    <div className="flex flex-col h-screen w-screen font-sans antialiased select-none overflow-hidden" style={{ background: "var(--app-bg)", color: "var(--app-fg)" }}>
      {/* Custom Window Titlebar */}
      <WindowTitlebar 
        title={status} 
        isLeftOpen={isLeftSidebarOpen}
        isRightOpen={isRightSidebarOpen}
        leftWidth={leftSidebarWidth}
        leftStyle={leftSidebarStyle}
        leftRef={leftTitlebarRef}
        onToggleLeft={() => updateLeftSidebar(!isLeftSidebarOpen)}
        onToggleRight={() => updateRightSidebar(!isRightSidebarOpen)}
      />

      {/* Main Resizable Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Panel: Worktree / Fleet Manager with Project Switcher — single tint source via WorktreeSidebar inner style */}
        {isLeftSidebarOpen && (
          <SidebarChrome
            containerRef={leftSidebar.containerRef}
            onResizeStart={leftSidebar.onResizeStart}
            onResizeReset={handleLeftSidebarResizeReset}
            isResizing={leftSidebar.isResizing}
          >
              <WorktreeSidebar 
                sessions={sessions}
                availableAgents={availableAgents}
                projects={projects}
                activeProject={activeProject}
                gitStatus={gitStatus}
                activeWorktreePath={activeWorktreePath}
                revealTargetPath={(() => {
                  // Orca currentSidebarWorktreeId parity: reveal resolves the workspace
                  // IDENTITY of the active workbench TAB (session path / cwd), never the
                  // sidebar's own selection — clicking a terminal tab must retarget the
                  // reveal without touching sidebar state.
                  const cur = tabs.find((t) => t.id === activeTabId);
                  if (!cur || cur.type !== "terminal") return activeWorktreePath;
                  return cur.cwd ?? activeWorktreePath;
                })()}
                gitWorktrees={gitWorktrees}
                worktreesByProject={worktreesByProject}
                deleteStateByWorktreeId={deleteStateByWorktreeId}
                onSelectProject={handleActivateProject}
                onRemoveProject={handleRemoveProject}
                onSelectSession={handleSelectSession}
                onSelectGitWorktree={handleSelectGitWorktree}
                onDeleteGitWorktree={handleDeleteGitWorktree}
                onDeleteWorktreeSelection={handleDeleteWorktreeSelection}
                onDeleteFolderWorkspace={handleDeleteFolderWorkspace}
                onFolderWorkspaceContextMenu={handleFolderWorkspaceContextMenu}
                onNewSessionWithAgent={() => {}}
                onDeleteSession={handleDeleteSession}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onOpenGlobalSettings={() => {
                  setSettingsSectionRequested("general");
                  setSettingsTargetSectionId(GLOBAL_WORKTREE_VISIBILITY_SETTINGS_TARGET_ID);
                  setIsSettingsOpen(true);
                }}
                onOpenAddRepoDialog={() => setIsAddRepoOpen(true)}
                onOpenNewWorkspaceModal={(proj) => {
                  if (proj) handleSelectProject(proj);
                  setIsNewWorkspaceOpen(true);
                }}
                onSessionContextMenu={handleSessionContextMenu}
                onProjectContextMenu={handleProjectContextMenu}
                onWorktreeContextMenu={handleWorktreeContextMenu}
                onAssignWorktreeStatus={assignWorktreeStatus}
                onPinWorktree={pinWorktree}
                onCreateWorktree={handleCreateWorktreeInStatus}
                onReorderSessions={handleReorderSessions}
                onReorderProjects={handleReorderProjects}
                onReorderWorktrees={handleReorderWorktrees}
                lineageByPath={worktreeLineage}
                worktreeMetadataByPath={worktreeMetadataByPath}
                pendingWorktreeCreations={Object.values(pendingWorktreeCreations).map(
                  (entry) => ({
                    creationId: entry.creationId,
                    repoId: entry.request.repoId,
                    branchName: entry.request.branchNameOverride ?? entry.request.name,
                    agentName: (entry.request.agent as string | null) ?? "",
                  })
                )}
                onEditWorktreeMetadata={(wt) => setWorktreeMetaDialog({ wt })}
                onAssignWorktreeParent={handleAssignWorktreeParent}
                onUnnestWorktrees={handleUnnestWorktrees}
                pinnedProjects={pinnedProjects}
                unreadProjects={unreadProjects}
                pinnedWorktrees={pinnedWorktrees}
                unreadWorktrees={unreadWorktrees}
                hiddenWorktreesByProject={hiddenWorktreesByProject}
                projectGroupMap={projectGroupMap}
                projectGroups={projectGroups}
                folderWorkspaces={folderWorkspaces}
                liveWorkspacePaths={liveWorkspacePaths}
                missingFolderPaths={missingFolderPaths}
                folderPathStatusByPath={folderPathStatusByPath}
                getFreshFolderPathStatus={getFreshFolderWorkspacePathStatus}
                scanFailuresByProject={scanFailuresByProject}
                onActivateFolderWorkspace={handleActivateFolderWorkspace}
                prByPath={prByPath}
                initialSidebarBody={initialSidebarPrefs?.sidebarBody}
                initialCollapsedProjects={initialSidebarPrefs?.collapsedProjects}
                initialCollapsedGroups={initialSidebarPrefs?.collapsedGroups}
                initialDisplayOptions={initialSidebarPrefs?.displayOptions}
                initialAgentsReadFilter={initialSidebarPrefs?.agentsReadFilter}
                initialAgentsGroupBy={initialSidebarPrefs?.agentsGroupBy}
                initialAgentsIntroShown={initialSidebarPrefs?.agentsSidebarIntroShown}
                onSidebarPrefsChange={handleSidebarPrefsChange}
                onUpdateSettings={(patch) => {
                  const next = { ...hydraSettings, ...patch } as HydraSettings;
                  setHydraSettings(next);
                  invoke("save_settings", { settings: next }).catch(console.error);
                }}
                compactCards={Boolean(hydraSettings.compact_worktree_cards)}
                settings={hydraSettings}
                leftSidebarStyle={leftSidebarStyle}
                isModalOpen={isJumpPaletteOpen || isCommandPaletteOpen || isSettingsOpen || isAddRepoOpen || isNewWorkspaceOpen || isPairingOpen}
              />
          </SidebarChrome>
        )}

        {/* Central Workspace: Multi-Tab Workbench Surface */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative" style={{ background: "var(--app-bg)" }}>
          {activePendingCreationId ? (
            <div
              className="absolute inset-0 z-10 flex flex-col"
              style={{ background: "var(--app-bg)" }}
            >
              <PendingWorktreeCreationPanel />
            </div>
          ) : null}
          {tabs.length > 0 ? (
            <>
              <WorkbenchTabBar 
                tabs={tabs}
                activeTabId={activeTabId}
                sessions={sessions}
                unreadWorktrees={unreadWorktrees}
                onSelectTab={handleSelectWorkbenchTab}
                onCloseTab={handleCloseTab}
                onNewTab={() => handleNewTerminalTab()}
                onNewTerminalTab={handleNewTerminalTab}
                onNewFileTab={handleNewFileTab}
                onOpenFileTab={handleOpenFileTab}
                onLaunchAgent={handleLaunchAgent}
                detectedAgents={availableAgents}
                onRenameTab={handleRenameTab}
                onReorderTabs={handleReorderTabs}
                onTabContextMenu={handleTabContextMenu}
                onTabBarContextMenu={handleTabBarContextMenu}
                worktreePath={activeWorktreePath || activeProject?.path || ""}
                recentlyClosedTabs={recentlyClosedTabs}
                onOpenFile={handleOpenFilePath}
                onRestoreClosedTab={handleRestoreClosedTab}
                onRunQuickCommand={handleRunQuickCommand}
                onOpenSettings={() => { setSettingsSectionRequested("agents"); setIsSettingsOpen(true); }}
              />

              <div className="flex-1 overflow-hidden relative">
                {currentTab?.type === "diff" ? (() => {
                  const c = fileTabContents[activeTabId];
                  // Orca never fabricates source: a diff tab whose contents did not
                  // load (e.g. restored from persistence) shows an empty state.
                  if (!c) {
                    return (
                      <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                        No changes to display
                      </div>
                    );
                  }
                  return (
                    <CodeDiffViewer 
                      original={c.original} 
                      modified={c.modified} 
                      language={c.lang}
                      theme={hydraSettings.theme === "light" ? "vs" : "vs-dark"}
                      notesKey={activeNotesKey}
                      filePath={currentTab.filePath ?? currentTab.title}
                    />
                  );
                })() : currentTab?.type === "editor" ? (() => {
                  const c = fileTabContents[activeTabId];
                  return (
                    <FileEditor
                      content={c?.modified ?? ""}
                      language={c?.lang ?? previewLanguage}
                      theme={hydraSettings.theme === "light" ? "vs" : "vs-dark"}
                      path={activeTabId.replace("tab_file_","")}
                    />
                  );
                })() : null}

                {/* Phase 5.2 — Cold Parking: background terminals unmount from DOM to free WebGL/xterm contexts.
                    Processes and scrollback are held silently in Rust vt100/OutputBuffer and restore on activation. */}
                {/* Sprint 2 P0: split grid per tab */}
                {tabs
                  .filter((t) => t.type === "terminal")
                  .map((t) => {
                    const isActive = currentTab?.type === "terminal" && activeTabId === t.id;
                    const coldParking = hydraSettings.terminal_cold_parking !== false;
                    if (coldParking && !isActive) return null;
                    const panes = getPanesForTab(t);
                    const direction = getSplitDirectionForTab(t);
                    const isSplit = panes.length > 1;
                    const sIdSingle = t.sessionId || (t.id.startsWith("tab_") ? t.id.replace("tab_", "") : t.id);
                    return (
                      <div
                        key={t.id}
                        className={`absolute inset-0 w-full h-full ${isActive ? "block" : "hidden pointer-events-none"}`}
                      >
                        {isSplit ? (
                          <SplitTerminalGrid
                            panes={panes}
                            direction={direction}
                            settings={hydraSettings}
                            activePaneId={focusedPaneMap[t.id] ?? panes[0]?.sessionId}
                            onPaneFocus={(sid) => setFocusedPaneMap((prev) => ({ ...prev, [t.id]: sid }))}
                            onClosePane={(sid) => handleCloseSplitPane(t.id, sid)}
                            onContextMenu={handleTerminalContextMenu}
                          />
                        ) : (
                          <TerminalDrawer 
                            sessionId={sIdSingle} 
                            executable={t.executable ?? resolveDefaultShell()}
                            cwd={t.cwd || activeWorktreePath || activeProject?.path}
                            settings={hydraSettings}
                            onContextMenu={handleTerminalContextMenu}
                            onTitleChange={(title) => handleTabTitleChange(sIdSingle, title)}
                          />
                        )}
                      </div>
                    );
                  })}
              </div>
            </>
          ) : (
            <Landing
              hasProjects={projects.length > 0}
              onAddProject={() => setIsAddRepoOpen(true)}
              onCreateWorktree={() => {
                if (projects.length === 0) {
                  setIsAddRepoOpen(true);
                  return;
                }
                const targetProj = activeProject || projects[0];
                if (!activeProject && projects.length > 0) {
                  handleSelectProject(targetProj);
                }
                setIsNewWorkspaceOpen(true);
              }}
              onNavigateWorkspace={handleNavigateWorkspace}
              onNewTab={() => handleNewTerminalTab()}
              createTargetLabel={projects.length > 0 && projects.every((p) => p.is_git) ? "worktree" : "workspace"}
            />
          )}
        </main>

        {/* Right Panel: Explorer + Source Control — copia Orca right-sidebar/index.tsx */}
        {isRightSidebarOpen && (
          <>
            {/* Right Resize Handle */}
            <div 
              onMouseDown={rightSidebar.onResizeStart}
              className={`w-2.5 -ml-1.5 -mr-1.5 z-20 cursor-col-resize flex items-center justify-center group select-none transition-colors ${
                rightSidebar.isResizing ? "bg-emerald-500/40" : "hover:bg-emerald-500/30"
              }`}
            >
              <div className={`w-[2px] h-full transition-colors ${rightSidebar.isResizing ? "bg-emerald-400" : "group-hover:bg-emerald-400"}`} />
            </div>

            <aside 
              ref={rightSidebar.containerRef}
              style={{ width: `${rightSidebar.width}px` }}
              className="flex flex-col border-l border-sidebar-border bg-sidebar shrink-0 overflow-hidden relative"
            >
              <RightSidebar
                rootPath={activeWorktreePath ?? activeProject?.path ?? null}
                isGit={activeProject?.is_git ?? false}
                openInApps={hydraSettings.open_in_applications ?? DEFAULT_OPEN_IN_APPLICATIONS}
                activeSessionId={(() => {
                  const active = sessions.find((s) => s.active);
                  if (active) return active.id;
                  const cur = tabs.find((t) => t.id === activeTabId);
                  if (cur?.sessionId) return cur.sessionId;
                  const panes = cur?.splitLayout?.panes ?? cur?.splitPanes ?? [];
                  if (panes.length > 0) return panes[0].sessionId;
                  return null;
                })()}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onOpenFile={async (path) => {
                  const ext = path.split(".").pop()?.toLowerCase() ?? "";
                  const lang = ({ rs:"rust", ts:"typescript", tsx:"typescript", js:"javascript", json:"json", md:"markdown", py:"python", go:"go" } as Record<string,string>)[ext] ?? "plaintext";
                  try {
                    const res = await invoke<{ path:string, content:string }>("read_file_text_cmd", { path });
                    const content = res.content;
                    const truncated = content.length > 20000 ? content.slice(0,20000) + "\n… truncated" : content;
                    const fileName = path.split("/").pop() ?? path;
                    const tabId = `tab_file_${path}`;
                    const payload = { original: "", modified: truncated, lang };
                    setFileTabContents(prev => ({ ...prev, [tabId]: payload }));
                    setPreviewLanguage(lang);
                    setTabs(prev => {
                      const exists = prev.find(t => t.id === tabId);
                      if (exists) return prev;
                      return [...prev, { id: tabId, title: fileName, type: "editor" as const }];
                    });
                    setActiveTabId(tabId);
                  } catch (e) { console.error(e); }
                }}
                onOpenDiff={async (relPath, staged) => {
                  const targetRepoPath = activeWorktreePath ?? activeProject?.path;
                  if (!targetRepoPath) return;
                  try {
                    const diff = await invoke<string>("git_diff_cmd", { repoPath: targetRepoPath, file: relPath, staged });
                    const tabId = `tab_diff_${relPath}_${staged ? "staged":"wt"}`;
                    const title = `${relPath}${staged ? " (staged)" : ""}`;
                    // Real diff only — Orca never renders placeholder source; an empty
                    // diff shows the pane's empty state.
                    setFileTabContents(prev => ({ ...prev, [tabId]: { original: "", modified: diff, lang: "diff" } }));
                    setTabs(prev => prev.find(t=>t.id===tabId) ? prev : [...prev, { id: tabId, title, type:"diff" }]);
                    setActiveTabId(tabId);
                  } catch (e) { console.error(e); }
                }}
              />
            </aside>
          </>
        )}
      </div>
      {/* Item 5: barra de status do Orca no fundo da janela (uso/atualização/SSH sem função). */}
      <StatusBar floatingTerminalOpen={false} />
      {/* Item 4: sidebar em Radix (submenu hover, portal); aba do terminal em CustomContextMenu. */}
      {contextMenu && contextMenu.source === "sidebar" && (
        <RadixContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={() => setContextMenu(null)}
        />
      )}
      {contextMenu && contextMenu.source === "terminal-tab" && (
        <CustomContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={() => setContextMenu(null)}
        />
      )}
      {/* Non-blocking Prompt Dialog */}
      {promptDialog && (
        <PromptDialog
          open={promptDialog.open}
          title={promptDialog.title}
          description={promptDialog.description}
          initialValue={promptDialog.initialValue}
          placeholder={promptDialog.placeholder}
          confirmLabel={promptDialog.confirmLabel}
          onOpenChange={(open) => {
            if (!open) setPromptDialog(null);
          }}
          onSubmit={async (val) => {
            await promptDialog.onSubmit(val);
            setPromptDialog(null);
          }}
        />
      )}

      {/* Anchored parent picker (Orca `WorktreeParentPickerPopover`) */}
      {parentPickerState && (
        <WorktreeParentPickerPopover
          open={parentPickerOpen}
          child={parentPickerState.child}
          candidates={getEligibleParentCandidates(parentPickerState.child.path)}
          getAnchorRect={() => parentPickerState.anchorRect}
          focusRestoreElement={parentPickerState.focusRestoreElement}
          onOpenChange={(open) => {
            // Why delayed: the component stays mounted through its exit animation.
            if (!open) closeParentPicker();
          }}
          // One path for every rejection: close, then report a translated toast if the
          // lineage write fails (`selectWorktreeParent`).
          onSelect={(candidate) =>
            selectWorktreeParent({
              childPath: parentPickerState.child.path,
              parentPath: candidate.path,
              assignWorktreeParent: parentPickerState.selectParent,
              close: closeParentPicker,
            })
          }
          onRemoveParent={
            parentPickerState.removeParent
              ? () => parentPickerState.removeParent?.()
              : undefined
          }
        />
      )}

      {/* Recent Tab Switcher (Ctrl+Tab) */}
      <RecentTabSwitcher
        isOpen={isRecentTabSwitcherOpen}
        tabs={mruTabs}
        selectedIndex={recentTabSwitcherIndex}
        onSelectIndex={(idx) => {
          setRecentTabSwitcherIndex(idx);
          recentTabSwitcherIndexRef.current = idx;
        }}
        onCommit={(tabId) => {
          setActiveTabId(tabId);
          setIsRecentTabSwitcherOpen(false);
          isRecentTabSwitcherOpenRef.current = false;
        }}
        onCancel={() => {
          setIsRecentTabSwitcherOpen(false);
          isRecentTabSwitcherOpenRef.current = false;
        }}
      />

      {/* Command Palette */}
      <CommandPalette 
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNewTerminal={() => handleNewTerminalTab()}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenPairing={() => setIsPairingOpen(true)}
        onSwitchTab={setActiveTabId}
      />

      {/* Worktree Jump Palette (Ctrl+J) */}
      <WorktreeJumpPalette
        isOpen={isJumpPaletteOpen}
        onClose={() => setIsJumpPaletteOpen(false)}
        projects={projects}
        activeProject={activeProject}
        worktreesByProject={worktreesByProject}
        sessions={sessions}
        onSelectProject={handleSelectProject}
        onSelectWorktree={(wt, proj) => {
          if (proj && (!activeProject || activeProject.path !== proj.path)) {
            handleSelectProject(proj);
          }
          handleSelectGitWorktree(wt);
          // The jump palette is reachable from the Agents body; ask the sidebar to
          // switch to Workspaces and reveal the chosen row.
          window.dispatchEvent(
            new CustomEvent(SIDEBAR_REVEAL_REQUEST_EVENT, { detail: { path: wt.path } })
          );
        }}
        onSelectSession={(sess) => handleSelectSession(sess.id)}
        onNewWorkspace={() => setIsNewWorkspaceOpen(true)}
        onNewTerminal={() => handleNewTerminalTab()}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Orca 100% Add Project Dialog (Clone / Create / Browse Folder) */}
      <AddRepoDialog
        isOpen={isAddRepoOpen}
        initialFolderPath={droppedAddRepoFolder}
        onClose={() => {
          setIsAddRepoOpen(false);
          setDroppedAddRepoFolder(null);
        }}
        onProjectAdded={() => {
          invoke<CatalogEnvelope>("catalog_get").then((envelope) => {
            const model = catalogToSidebarModel(envelope);
            setProjects(model.projects);
            applyCatalogProjectGroups(model);
            setFolderWorkspaces(model.folderWorkspaces);
            if (model.projects.length > 0) {
              handleSelectProject(model.projects[0]);
              if (tabsRef.current.length === 0) {
                const tabId = `tab_${Date.now().toString().slice(-4)}`;
                const initialTab: TabItem = {
                  id: tabId,
                  title: `${model.projects[0].name} (main)`,
                  type: "terminal",
                  cwd: model.projects[0].path,
                };
                setTabs([initialTab]);
                setActiveTabId(tabId);
              }
            }
          }).catch(console.error);
        }}
      />

      {/* Orca 100% New Workspace Composer Modal */}
      <NewWorkspaceComposer
        isOpen={isNewWorkspaceOpen}
        activeProject={activeProject}
        projects={projects}
        availableAgents={availableAgents}
        initialWorkspaceStatus={newWorkspaceInitialStatus}
        onSelectProject={handleSelectProject}
        onOpenAddRepoDialog={() => setIsAddRepoOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onClose={closeNewWorkspaceComposer}
        onCreated={handleCreatedWorkspace}
      />

      {/* Mobile Companion Pairing Modal */}
      <PairingModal isOpen={isPairingOpen} onClose={() => setIsPairingOpen(false)} />

      {/* Orca parity: running-terminal close confirmation for tab-level closes with a
          live child process (tab-strip X, middle-click, tab menu, keyboard). */}
      <RunningTerminalCloseDialog
        request={runningTerminalCloseConfirm}
        onConfirm={handleRunningTerminalCloseConfirm}
        onCancel={() => setRunningTerminalCloseConfirm(null)}
      />

      {/* Orca parity: dedicated DeleteWorktreeDialog (NOT window.confirm) */}
      <DeleteWorktreeDialog
        open={deleteWorktreeModal != null}
        worktrees={deleteWorktreeModal?.worktrees ?? []}
        isMainWorktree={deleteWorktreeModal?.worktrees.some((w) => w.path === deleteWorktreeModal?.repoPath) ?? false}
        deleteTargets={deleteWorktreeModal?.deleteTargets ?? []}
        liveWorktrees={deleteLiveTargets}
        lineageByPath={worktreeLineage}
        onStaleTargets={showStaleDeleteNotice}
        onDeleteStart={(targets) => publishDeleteStateForTargets(targets, WORKTREE_DELETE_IN_PROGRESS)}
        onDeleteSettled={(targets) => publishDeleteStateForTargets(targets, null)}
        executeDelete={(targets, options) => runDeleteIdentitiesNow(targets, options)}
        deleteStateByWorktreeId={deleteStateByWorktreeId}
        dirtyChangeCountsByWorktreeId={deleteDialogDirtyCounts}
        onPersistSkipConfirmPreference={() => {
          const next = { ...hydraSettings, skip_delete_worktree_confirm: true } as HydraSettings;
          setHydraSettings(next);
          invoke("save_settings", { settings: next }).catch(console.error);
          // Orca `persistDeleteWorktreeConfirmSkipPreference`: confirm the saved
          // preference and deep-link to the exact toggle.
          showSkipDeleteConfirmToast(() => {
            window.dispatchEvent(
              new CustomEvent("hydra:open-settings", {
                detail: { section: "general" as HydraNavId },
              })
            );
          });
        }}
        onForceDelete={(targets) => {
          // Orca `runDialogForceDelete`: close immediately, run the retry, and
          // transfer focus once it settles.
          const liveTargets = targets
            .map((identity) => findWorktreeByIdentity(identity))
            .filter((row): row is NonNullable<typeof row> => Boolean(row));
          const forceIdentity = targets[0];
          setDeleteWorktreeModal(null);
          setDeleteStateByWorktreeId((prev) => pruneClosedDeleteStates(prev));
          if (!forceIdentity || liveTargets.length === 0) {
            showWorkspaceListChangedToast();
            return;
          }
          void runDeleteIdentitiesNow([forceIdentity], { force: true });
        }}
        onDeleteFailed={(failures) => {
          for (const failure of failures) {
            const described = describeWorktreeDeleteFailure(failure.error, failure.path);
            showDeleteWorktreeFailureToast({
              target: { id: failure.path, executionHostId: null },
              worktreeName: failure.path,
              summary: described.summary,
              guidance: described.guidance,
              canForceDelete: described.canForce,
              hasKnownChanges: described.summary.toLowerCase().includes("uncommitted"),
              canDeleteAnyway: described.canWaiveArchiveHook,
              onViewChanges: () => {
                void viewWorktreeChanges(failure.path);
              },
              onForceDelete: () => {
                const identity = deleteWorktreeModal?.deleteTargets.find(
                  (target) => findWorktreeByIdentity(target)?.worktree.path === failure.path
                );
                if (!identity) {
                  showWorkspaceListChangedToast();
                  return;
                }
                // Orca retry-from-toast: close the confirmation, run the forced
                // removal, and let the executor's onDeleted refresh the sidebar.
                setDeleteWorktreeModal(null);
                setDeleteStateByWorktreeId((prev) => pruneClosedDeleteStates(prev));
                void runDeleteIdentitiesNow([identity], { force: true });
              },
              onDeleteAnyway: () => {
                // Same retry shape as Force Delete, with the archive waiver instead
                // of force: the backend runs the hook again and deletes on failure.
                const identity = deleteWorktreeModal?.deleteTargets.find(
                  (target) => findWorktreeByIdentity(target)?.worktree.path === failure.path
                );
                if (!identity) {
                  showWorkspaceListChangedToast();
                  return;
                }
                setDeleteWorktreeModal(null);
                setDeleteStateByWorktreeId((prev) => pruneClosedDeleteStates(prev));
                void runDeleteIdentitiesNow([identity], { allowArchiveSkip: true });
              },
            });
          }
        }}
        onClose={() => {
          // Orca `handleOpenChange`: dismissing the confirmation releases any
          // entry it published, so a cancel can never leave a card inert.
          if (deleteWorktreeModal) {
            publishDeleteStateForTargets(deleteWorktreeModal.deleteTargets, null);
          }
          // Orca releases every entry this dialog could have published, not only the
          // modal's targets; in-flight removals keep their busy state.
          setDeleteStateByWorktreeId((prev) => pruneClosedDeleteStates(prev));
          setDeleteWorktreeModal(null);
        }}
        onDeleted={(deletedPaths) => {
          if (deleteWorktreeModal) {
            refreshGitWorktrees(deleteWorktreeModal.repoPath);
          }
          if (activeProject && activeProject.path !== deleteWorktreeModal?.repoPath) {
            refreshGitWorktrees(activeProject.path);
          }
          window.dispatchEvent(new CustomEvent("hydra:refresh-projects"));
          setDeleteStateByWorktreeId((prev) => {
            const next = { ...prev };
            // Delete state is keyed by host-qualified identity (STA-4343); the
            // bare path key is cleared too so legacy entries cannot linger.
            deletedPaths.forEach((path) => {
              const index = deleteWorktreeModal?.worktrees.findIndex((w) => w.path === path) ?? -1;
              const target = index >= 0 ? deleteWorktreeModal?.deleteTargets[index] : undefined;
              if (target) delete next[getDeleteStateKeyForWorktreeHost(target)];
              delete next[path];
            });
            return next;
          });
        }}
        onForceDeleted={() => {
          if (deleteWorktreeModal) {
            refreshGitWorktrees(deleteWorktreeModal.repoPath);
          }
          if (activeProject && activeProject.path !== deleteWorktreeModal?.repoPath) {
            refreshGitWorktrees(activeProject.path);
          }
          window.dispatchEvent(new CustomEvent("hydra:refresh-projects"));
        }}
        repoPath={deleteWorktreeModal?.repoPath ?? ""}
      />

      {/* Orca `confirm-remove-folder`: primary checkout → remove the project only. */}
      <ConfirmRemoveFolderDialog
        open={confirmRemoveFolder != null}
        displayName={confirmRemoveFolder?.displayName ?? ""}
        folderPath={confirmRemoveFolder?.repoPath ?? ""}
        onOpenChange={(open) => {
          if (!open) setConfirmRemoveFolder(null);
        }}
        onRemoveProject={() => {
          const target = confirmRemoveFolder;
          if (!target) return;
          const project = projectsRef.current.find((entry) => entry.path === target.repoPath);
          if (project) handleRemoveProject(project);
        }}
      />

      {/* Orca `forget-ssh-workspace`: disconnected/ghost remote workspaces. */}
      <ForgetSshWorkspaceDialog
        open={forgetSshTarget != null}
        displayName={forgetSshTarget?.displayName ?? ""}
        resolution={forgetSshTarget?.resolution ?? { kind: "ghost", targetId: "" }}
        onOpenChange={(open) => {
          if (!open) setForgetSshTarget(null);
        }}
        onReconnectAndDelete={handleReconnectAndDeleteSshWorkspace}
        onForgetWorkspace={handleForgetSshWorkspace}
      />

      {/* Folder workspace removal: same confirmation surface, non-destructive copy. */}
      <DeleteWorktreeDialog
        open={folderDeleteTarget != null}
        worktrees={[]}
        isMainWorktree={false}
        deleteStateByWorktreeId={{}}
        dirtyChangeCountsByWorktreeId={{}}
        onPersistSkipConfirmPreference={() => {}}
        onClose={() => setFolderDeleteTarget(null)}
        onDeleted={() => {}}
        onForceDeleted={() => {}}
        repoPath=""
        folderWorkspace={folderDeleteTarget}
        onDeleteFolderWorkspace={async (folderWorkspaceId) => {
          const deleted = await (
            useAppStore.getState() as unknown as {
              deleteFolderWorkspace: (id: string) => Promise<boolean>;
            }
          ).deleteFolderWorkspace(folderWorkspaceId);
          window.dispatchEvent(new CustomEvent("hydra:refresh-projects"));
          return deleted === true;
        }}
      />

      <WorktreeMetaDialog
        open={worktreeMetaDialog != null}
        worktreeId={
          worktreeMetaDialog
            ? (worktreeMetaDialog.wt.id ?? worktreeMetaDialog.wt.path)
            : undefined
        }
        ownerRepoId={
          worktreeMetaDialog
            ? (projects.find(
                (project) =>
                  project.path === worktreeMetaDialog.wt.path ||
                  worktreeMetaDialog.wt.path.startsWith(project.path + "/")
              )?.id ?? null)
            : null
        }
        worktreeName={
          worktreeMetaDialog?.wt.display_name ||
          worktreeMetaDialog?.wt.branch ||
          worktreeMetaDialog?.wt.path ||
          ""
        }
        initial={{
          displayName:
            worktreeMetaDialog?.wt.display_name ||
            worktreeMetaDialog?.wt.branch ||
            worktreeMetaDialog?.wt.path ||
            "",
          comment: worktreeMetadataByPath[worktreeMetaDialog?.wt.path ?? ""]?.comment ?? "",
          linkedIssue:
            worktreeMetadataByPath[worktreeMetaDialog?.wt.path ?? ""]?.linked_issue ?? null,
          linkedPR:
            worktreeMetadataByPath[worktreeMetaDialog?.wt.path ?? ""]?.linked_pr ?? null,
          linkedLinearIssue:
            worktreeMetadataByPath[worktreeMetaDialog?.wt.path ?? ""]?.linked_linear_issue ?? null,
        }}
        onOpenChange={(open) => {
          if (!open) setWorktreeMetaDialog(null);
        }}
        onSave={(draft: WorktreeMetadataDraft) => {
          const target = worktreeMetaDialog?.wt;
          if (!target) return;
         (async () => {
            try {
              await invoke("save_worktree_metadata", {
                worktreePath: target.path,
                comment: draft.comment.trim() ? draft.comment : null,
                linkedIssue: draft.linkedIssue,
                linkedPr: draft.linkedPR,
                linkedLinearIssue: draft.linkedLinearIssue,
              });
              if (draft.displayName && draft.displayName !== target.display_name) {
                await invoke("set_worktree_display_name", {
                  worktreePath: target.path,
                  displayName: draft.displayName,
                });
                setGitWorktrees((prev) =>
                  prev.map((row) =>
                    row.path === target.path ? { ...row, display_name: draft.displayName } : row
                  )
                );
                setWorktreesByProject((prev) => {
                  const next = { ...prev };
                  for (const key of Object.keys(next)) {
                    next[key] = next[key].map((row) =>
                      row.path === target.path ? { ...row, display_name: draft.displayName } : row
                    );
                  }
                  return next;
                });
              }
              const now = Date.now();
              setWorktreeMetadataByPath((prev) => ({
                ...prev,
                [target.path]: {
                  ...(prev[target.path] ?? {
                    worktree_path: target.path,
                    display_name: null,
                    first_agent_message_rename_error: null,
                    status: null,
                    created_at: null,
                    created_with_agent: null,
                    provenance_kind: null,
                    is_pinned: null,
                    is_unread: null,
                    linked_issue: null,
                    linked_pr: null,
                    linked_linear_issue: null,
                    comment: null,
                    updated_at: now,
                  }),
                  comment: draft.comment.trim() ? draft.comment : null,
                  linked_issue: draft.linkedIssue,
                  linked_pr: draft.linkedPR,
                  linked_linear_issue: draft.linkedLinearIssue,
                  updated_at: now,
                },
              }));
              window.dispatchEvent(new CustomEvent("hydra:refresh-projects"));
            } catch (err) {
              console.error("Failed to save workspace metadata:", err);
            } finally {
              setWorktreeMetaDialog(null);
            }
          })();
        }}
      />


      {/* Settings Modal */}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => { setIsSettingsOpen(false); setSettingsSectionRequested(null); setSettingsTargetSectionId(null); }} 
        onLiveChange={(live) => { const n = normalizeHydraSettings(live); setHydraSettings(n); applyDocumentTheme(n.theme); }}
        onSaved={handleSettingsSaved}
        initialSection={settingsSectionRequested ?? undefined}
        initialSectionId={settingsTargetSectionId ?? undefined}
      />
    </div>
    {/* Orca parity: sonner is the project's toast surface; without a mounted
        Toaster every `toast()` call (delete stale-list notice included) renders
        nowhere. */}
    <Toaster position="bottom-right" />
    </TooltipProvider>
  );
}
