// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Search,
  Trash2,
  X,
  Copy,
  Settings,
  FolderInput,
  Eye,
  Plus,
  FolderTree,
  FolderPlus,
  ChevronRight,
  Shapes,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { SidebarNav } from "./SidebarNav";
import { SidebarHeader } from "./SidebarHeader";
import { SidebarFooter } from "./SidebarFooter";
import { WorktreeList } from "./WorktreeList";
import { applyWorktreeGroupOrder } from "./worktree-group-order";
import type { RepoHeaderCreateState } from "./SectionHeader";
import { getRepoHeaderCreateState } from "./repo-header-create-state";
import { stopRepoHeaderMenuEvent } from "./ProjectHeaderActions";
import { translate } from "../../i18n/i18n";
import { effectiveExternalWorktreeVisibility } from "../../lib/worktree-visibility-sources";
import { lazyWithRetry } from "../../lib/lazy-with-retry";
import { SidebarDialogPortal } from "./SidebarDialogPortal";
import { SetupScriptPromptCard } from "./SetupScriptPromptCard";
import { NonGitFolderModalHost } from "./NonGitFolderModalHost";
import { PreservedBranchBatchReviewModalHost } from "./PreservedBranchBatchReviewModalHost";
import { OrcaYamlTrustDialog } from "./OrcaYamlTrustDialog";

// Why lazy: the Agents list pulls the whole activity pipeline (virtualizer, markdown
// previews, thread derivation), so users on the workspaces view should not load or
// render any of it until they switch bodies (Orca SidebarAgentsList parity).
const SidebarAgentsList = lazyWithRetry(() =>
  import("./SidebarAgentsList").then((module) => ({ default: module.SidebarAgentsList }))
);
import WorkspaceBoardDrawer from "./workspace-board/WorkspaceBoardDrawer";
import { useWorkspaceBoardPanel } from "./workspace-board/use-workspace-board-panel";
import { mergeExternalWorktreeInboxPaths } from "./worktree-list/rows/ImportedWorktreesVisibilityLine";
import { WorkspaceOptionsMenu, countActiveWorkspaceFilters, type WorkspaceDisplayOptions } from "./WorkspaceOptionsMenu";
import { planSidebarClearFilters } from "./sidebar-filter-actions";
import { isRevealTargetHiddenByFilters } from "./reveal-hidden-filters";
import {
  getFolderWorkspaceRevealGroupKeys,
  getKnownSidebarWorktreeById,
  getPinnedWorktreeRevealCollapsedGroupKeys,
  getRevealCandidateWorktrees,
  getRevealMountedOptionIds,
  sidebarWorkspaceStillExists,
  type SidebarRevealFolderWorkspace,
} from "./sidebar-reveal-lookups";
import { getWorktreeLineageGroupKey } from "./worktree-list/grouping/group-keys";
import {
  getGroupKeysForWorktree,
  getRevealGroupKeysToExpand,
} from "./worktree-list/grouping/worktree-group-keys";
import { useSettledSortEpoch } from "./worktree-list/listing/use-sort-settle-epoch";
import { useStartupGatedWorktreeRefresh } from "./use-startup-gated-worktree-refresh";
import { getIndexedAllWorktrees } from "../../store/worktree-repo-index";
import type { ProjectGroup } from "../../shared/project-group-types";
import type { Worktree } from "../../shared/worktree/types";
const ProjectGroupNameDialog = lazyWithRetry(() =>
  import("./ProjectGroupNameDialog").then((module) => ({
    default: module.ProjectGroupNameDialog,
  }))
);
import { useSidebarProjectDrop } from "./use-sidebar-project-drop";
import { relaxFiltersForReveal } from "./reveal-filter-relaxation";
import {
  SIDEBAR_REVEAL_FILTER_REQUEST_EVENT,
} from "./reveal-filter-request";
import type { RevealTargetTraits } from "./reveal-filter-relaxation";
import { resolveRevealWorktreePath } from "./reveal-target-resolution";
import { requestProjectsRefresh } from "../../lib/refresh-projects-awaitable";
const ProjectGroupDeleteDialog = lazyWithRetry(() =>
  import("./ProjectGroupDeleteDialog").then((module) => ({
    default: module.ProjectGroupDeleteDialog,
  }))
);
const WorktreeVisibilityDialog = lazyWithRetry(() =>
  import("./WorktreeVisibilityDialog").then((module) => ({
    default: module.WorktreeVisibilityDialog,
  }))
);
import { RepoIconPicker } from "./RepoIconPicker";
import { PromptDialog, type PromptDialogProps } from "../PromptDialog";
import type {
  HydraProject,
  GitWorktreeInfo,
  WorktreeSidebarProps,
  AgentsGroupBy,
  AgentsReadFilter,
  WorkspacePort,
  SidebarBody,
  SidebarShellPrefs,
} from "./types";
import { toWorktreeRow } from "../../shared/worktree/worktree-row";
import { toPipelineRepo } from "./worktree-list/grouping/to-pipeline-repo";
import {
  applyPersistedWorktreeOrder,
  isSidebarSortColdStart,
  resolveComparatorSortBy,
  sortSidebarWorktrees,
} from "./sidebar-worktree-sort";
import { isDefaultBranchWorkspace } from "./default-branch-workspace";
import { isDetachedHeadWorkspace } from "./visible-worktree-kinds";
import { tabHasLivePty } from "@/lib/tab-has-live-pty";
import { isRepoHeaderActionTarget } from "./project-header-drag-contract";
import type { AgentStateHistoryEntry } from "../../shared/agent-status-types";
import { resolveWorktreeAttentionFromSessions } from "./sidebar-session-attention";
import { sidebarHasActiveFilters, toSidebarFilterState } from "./sidebar-filter-actions";
import { useAppStore } from "../../store";
import { getRepoExecutionHostId } from "../../shared/execution-host";
import { useWorktreeRevealBodyRedirect } from "./use-worktree-reveal-body-redirect";
import { revealElementInScrollContainer } from "./worktree-sidebar-reveal";
import { isRuntimeOwnedSshTargetId, parseExecutionHostId } from "../../shared/execution-host";
import type { RepoIcon } from "../../shared/repo-icon";
import { catalogRepoIdFromProjectId, setCatalogRepoIcon } from "../../lib/catalog-client";
import {
  PROJECT_ICON_OPTIMISTIC_EVENT,
  REPO_ICON_REMOTE_DISABLED_REASON,
} from "../../lib/repo-icon-write";
const RemoveFolderDialog = lazyWithRetry(() =>
  import("./RemoveFolderDialog").then((module) => ({
    default: module.RemoveFolderDialog,
  }))
);
const SuppressExternalWorktreeInboxDialog = lazyWithRetry(
  () => import("./SuppressExternalWorktreeInboxDialog")
);
const RevealHiddenWorkspaceDialog = lazyWithRetry(() =>
  import("./RevealHiddenWorkspaceDialog").then((module) => ({
    default: module.RevealHiddenWorkspaceDialog,
  }))
);
const RepoSettingsDialog = lazyWithRetry(() =>
  import("./RepoSettingsDialog").then((module) => ({
    default: module.RepoSettingsDialog,
  }))
);
import { AgentSendTargetPicker } from "./AgentSendTargetPicker";
import { ALL_EXECUTION_HOSTS_SCOPE } from "../../shared/execution-host";

export * from "./types";

/** Orca `MAX_REVEAL_RETRIES`: the row may mount a frame or two after the expand commit. */
const MAX_REVEAL_RETRIES = 8;

// Why module constants: the reveal callback lists these props as dependencies, and a
// fresh `[]` default on every render would invalidate it (and replay a pending reveal).
const EMPTY_PROJECT_GROUPS: NonNullable<WorktreeSidebarProps["projectGroups"]> = [];
const EMPTY_FOLDER_WORKSPACES: NonNullable<WorktreeSidebarProps["folderWorkspaces"]> = [];
const EMPTY_PROJECT_GROUP_MAP: NonNullable<WorktreeSidebarProps["projectGroupMap"]> = {};
/** Store shape guard: the worktree slice is still an auto-stub on this branch (may be null). */
const EMPTY_STORE_PROJECT_GROUPS: readonly ProjectGroup[] = [];

/**
 * Host stamp the row pipeline gives a workspace row: only repos owned by a non-local
 * execution host get one (`buildHostIdByRepoId`). Option ids are built from the same stamp,
 * so a reveal that always stamped `local` would never match a local row's option id.
 */
function getRowHostId(
  repo: { connectionId?: string | null; executionHostId?: string | null } | undefined
) {
  return repo && (repo.connectionId || repo.executionHostId)
    ? getRepoExecutionHostId(repo)
    : undefined;
}

type SidebarRevealOptions = {
  highlight?: boolean;
  beginRename?: boolean;
  /** Settles the caller's pending request once the row is mounted and scrolled. */
  onRevealSettled?: () => void;
  /**
   * No mounted row after {@link MAX_REVEAL_RETRIES} frames. The caller decides whether
   * the target still exists (keep the request pending) or vanished (clear it).
   */
  onRevealExhausted?: () => void;
};

const defaultDisplayOptions: WorkspaceDisplayOptions = {
  groupBy: "repo",
  sortBy: "agent-activity",
  hideSleeping: false,
  hideDefaultBranch: false,
  hideAutomationCreated: false,
  hideCliCreated: false,
  hideDetachedHead: false,
  alwaysShowDefaultBranch: false,
  projectsOrder: "manual",
  hideWorkspacesFromOtherDevices: false,
};

export function WorktreeSidebar({
  sessions,
  availableAgents: _availableAgents = [],
  projects,
  activeProject,
  activeWorktreePath,
  revealTargetPath,
  gitStatus,
  gitWorktrees,
  worktreesByProject,
  onSelectProject,
  onRemoveProject,
  onSelectSession,
  onSelectGitWorktree,
  onDeleteGitWorktree,
  onDeleteWorktreeSelection,
  onNewSessionWithAgent: _onNewSessionWithAgent,
  onRenameWorktreeTitle,
  deleteStateByWorktreeId,
  onDeleteSession,
  onOpenSettings,
  onOpenGlobalSettings,
  onOpenAddRepoDialog,
  onOpenNewWorkspaceModal,
  onSessionContextMenu: _onSessionContextMenu,
  onProjectContextMenu,
  onWorktreeContextMenu,
  onAssignWorktreeStatus,
  onPinWorktree,
  onCreateWorktree,
  onReorderSessions: _onReorderSessions,
  onReorderProjects,
  onReorderWorktrees,
  lineageByPath,
  worktreeMetadataByPath,
  pendingWorktreeCreations,
  onEditWorktreeMetadata,
  onAssignWorktreeParent,
  onUnnestWorktrees,
  pinnedProjects,
  unreadProjects,
  pinnedWorktrees,
  unreadWorktrees,
  hiddenWorktreesByProject,
  projectGroupMap = EMPTY_PROJECT_GROUP_MAP,
  projectGroups = EMPTY_PROJECT_GROUPS,
  folderWorkspaces = EMPTY_FOLDER_WORKSPACES,
  liveWorkspacePaths,
  missingFolderPaths,
  folderPathStatusByPath,
  getFreshFolderPathStatus,
  scanFailuresByProject = {},
  prByPath,
  onActivateFolderWorkspace,
  onDeleteFolderWorkspace,
  onFolderWorkspaceContextMenu,
  compactCards = false,
  onSelectNextSession,
  onSelectPrevSession,
  isModalOpen = false,
  settings,
  leftSidebarStyle,
  initialSidebarBody,
  initialCollapsedProjects,
  initialCollapsedGroups,
  initialDisplayOptions,
  initialAgentsReadFilter,
  initialAgentsGroupBy,
  initialAgentsIntroShown,
  onSidebarPrefsChange,
  onUpdateSettings,
  onOpenSettingsSection,
}: WorktreeSidebarProps): React.JSX.Element {
  // ─── View & Preference State ─────────────────────────────────────────────
  const [sidebarBody, setSidebarBody] = useState<SidebarBody>(initialSidebarBody ?? "workspaces");
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(
    () => new Set(initialCollapsedProjects ?? [])
  );
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    () => new Set(initialCollapsedGroups ?? [])
  );
  const [displayOptions, setDisplayOptions] = useState<WorkspaceDisplayOptions>(
    () => initialDisplayOptions ?? defaultDisplayOptions
  );
  const [agentsReadFilter, setAgentsReadFilter] = useState<AgentsReadFilter>(
    initialAgentsReadFilter ?? "all"
  );
  const [agentsGroupBy, setAgentsGroupBy] = useState<AgentsGroupBy>(
    initialAgentsGroupBy ?? "state"
  );
  const [agentsQuery, setAgentsQuery] = useState("");
  const [agentsOptionsTarget, setAgentsOptionsTarget] = useState<HTMLDivElement | null>(null);
  // D01-009: the one-time Agents-view intro is gated by a persisted preference
  // (the same `ui.sidebar` blob the other shell prefs use), not raw localStorage.
  const [agentsIntroShown, setAgentsIntroShown] = useState<boolean>(
    initialAgentsIntroShown ?? false
  );

  const [filter, setFilter] = useState("");
  const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);
  const optionsButtonRef = useRef<HTMLButtonElement | null>(null);

  // D01-006: App owns the startup scan; this sidebar only re-runs the all-repo
  // refresh after that first pass settled AND the repo count changed.
  const startupWorktreeRefreshCompleted = useAppStore(
    (state) => state.startupWorktreeRefreshCompleted
  );
  const fetchAllWorktrees = useAppStore((state) => state.fetchAllWorktrees);
  useStartupGatedWorktreeRefresh({
    repoCount: projects.length,
    startupWorktreeRefreshCompleted,
    fetchAllWorktrees,
  });

  // ─── Ephemeral / UI State ────────────────────────────────────────────────
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [portsByWorktree, setPortsByWorktree] = useState<Map<string, WorkspacePort[]>>(() => new Map());
  const [highlightedRevealPath, setHighlightedRevealPath] = useState<string | null>(null);
  const highlightTimerRef = useRef<number | null>(null);
  // D03a-090: the reveal highlight timer must not fire into an unmounted panel.
  useEffect(() => {
    return () => {
      if (highlightTimerRef.current !== null) {
        window.clearTimeout(highlightTimerRef.current);
        highlightTimerRef.current = null;
      }
    };
  }, []);

  // Context Menu state
  const [activeProjectMenu, setActiveProjectMenu] = useState<{ proj: HydraProject; x: number; y: number } | null>(null);
  const [activeGroupMenu, setActiveGroupMenu] = useState<{ group: { id: string; name: string }; x: number; y: number } | null>(null);
  // Orca `RepoHeaderProjectActionsMenu`: "Move to group" is a submenu, not a flat
  // list of rows; the current group stays visible and disabled.
  const [projectMenuSubmenu, setProjectMenuSubmenu] = useState<"move-to-group" | null>(null);
  /** Inline glyph picker anchored at the project menu it replaced. */
  const [projectIconPicker, setProjectIconPicker] = useState<{
    project: HydraProject;
    x: number;
    y: number;
  } | null>(null);
  const [removeProjectTarget, setRemoveProjectTarget] = useState<HydraProject | null>(null);
  // D03b-017: repo-scoped settings surface, opened from the project menu.
  const [repoSettingsTarget, setRepoSettingsTarget] = useState<HydraProject | null>(null);
  const [suppressInboxTarget, setSuppressInboxTarget] = useState<HydraProject | null>(null);
  const [suppressInboxPending, setSuppressInboxPending] = useState(false);
  const [hiddenWorktreeErrorByProject, setHiddenWorktreeErrorByProject] = useState<
    Record<string, string | null>
  >({});
  const setHiddenWorktreeError = useCallback(
    (projectPath: string, message: string | null) => {
      setHiddenWorktreeErrorByProject((previous) => {
        if (previous[projectPath] === message) return previous;
        return { ...previous, [projectPath]: message };
      });
    },
    []
  );
  // Why primitives/reference-stable slices: a selector that returns a fresh
  // object literal makes zustand re-render forever (React "maximum update depth").
  const removeProjectRepo = useAppStore((state) =>
    removeProjectTarget
      ? state.repos.find((entry) => entry.path === removeProjectTarget.path) ?? null
      : null
  );
  const removeProjectSshLabels = useAppStore((state) => state.sshTargetLabels);
  const removeProjectRemovedSshLabels = useAppStore((state) => state.removedSshTargetLabels);
  const removeProjectTargetId = removeProjectRepo?.connectionId?.trim() ?? "";
  const removeProjectHost = !removeProjectTargetId
    ? ({ kind: "local" } as const)
    : isRuntimeOwnedSshTargetId(removeProjectTargetId)
      ? ({ kind: "vm" } as const)
      : {
          kind: "ssh" as const,
          label:
            removeProjectSshLabels.get(removeProjectTargetId) ??
            removeProjectRemovedSshLabels.get(removeProjectTargetId) ??
            removeProjectTargetId,
        };

  // Dialogs state
  const [groupNameDialog, setGroupNameDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    initialName?: string;
    confirmLabel?: string;
    /** Owner host of the group row, so rename targets the host that holds it. */
    hostId?: string;
    onSubmit: (name: string) => Promise<void> | void;
  }>({
    open: false,
    title: "New Project Group",
    description: "Create a group to organize projects in your sidebar.",
    confirmLabel: "Create",
    onSubmit: () => {},
  });

  const [groupDeleteDialog, setGroupDeleteDialog] = useState<{
    open: boolean;
    group: { id: string; name: string } | null;
    hostId?: string;
    removeContainedProjects: boolean;
  }>({
    open: false,
    group: null,
    removeContainedProjects: false,
  });

  const [visibilityDialog, setVisibilityDialog] = useState<{
    open: boolean;
    project: HydraProject | null;
    hiddenWorktrees: GitWorktreeInfo[];
    hostId?: string | null;
  }>({
    open: false,
    project: null,
    hiddenWorktrees: [],
  });

  const [promptDialog, setPromptDialog] = useState<Omit<PromptDialogProps, "onOpenChange"> | null>(null);

  // Repos whose external-worktree visibility prompt phase was already stamped this
  // session. Orca writes `Date.now()` the first time the user acts on the inbox
  // (`imported-worktrees-card-actions.ts:73-78`); Hydra keeps the same meaning and
  // never rewrites an existing timestamp.
  const visibilityPromptStampedReposRef = useRef<Set<string>>(new Set());
  const stampVisibilityPromptPhase = async (proj: HydraProject) => {
    if (visibilityPromptStampedReposRef.current.has(proj.path)) return;
    visibilityPromptStampedReposRef.current.add(proj.path);
    if (typeof proj.externalWorktreeVisibilityPromptDismissedAt === "number") return;
    await invoke("catalog_set_worktree_visibility", {
      repoPath: proj.path,
      baselinePaths: proj.externalWorktreeInboxBaselinePaths ?? [],
      promptDismissedAt: Date.now(),
    });
  };

  // Drag and Drop state
  const [draggedWorktreePath, setDraggedWorktreePath] = useState<string | null>(null);
  const [worktreeDropTarget, setWorktreeDropTarget] = useState<{ path: string; position: "top" | "bottom" } | null>(null);
  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);
  const [projectDropTarget, setProjectDropTarget] = useState<{ id: string; position: "top" | "bottom" } | null>(null);
  const [groupDropTargetId, setGroupDropTargetId] = useState<string | null>(null);
  /** The panel's scroll container: row-rect and autoscroll reference for the pointer drag. */
  const worktreeScrollRef = useRef<HTMLDivElement | null>(null);
  /** Agents list scroll offset, held here so switching bodies preserves it (Orca parity). */
  const agentsScrollTopRef = useRef(0);
  // D03b-002: the agents body unmounts on every body switch, so its focus/selection live
  // here, beside the scroll offset, and survive the switch (Orca holds them in the shell).
  const [agentsFocusedSessionId, setAgentsFocusedSessionId] = useState<string | null>(null);
  const [agentsSelectedSessionIds, setAgentsSelectedSessionIds] = useState<ReadonlySet<string>>(
    () => new Set()
  );

  // ─── Workspace board (Orca D08 shell) ────────────────────────────────────
  // The board is a companion panel of this sidebar: it is anchored to the
  // sidebar's own box and reads the sidebar's visible workspaces, so it lives
  // here rather than in the shell.
  const sidebarRootRef = useRef<HTMLDivElement | null>(null);
  const pendingRevealWorktree = useAppStore((state) => state.pendingRevealWorktree);
  const pendingRevealSidebarRow = useAppStore((state) => state.pendingRevealSidebarRow);
  const agentSendTargetMode = useAppStore((state) => state.agentSendPopoverTargetMode);
  const clearPendingRevealSidebarRow = useAppStore(
    (state) => state.clearPendingRevealSidebarRow
  );
  const clearPendingRevealWorktreeId = useAppStore((state) => state.clearPendingRevealWorktreeId);
  const { isProjectDropActive, affordance: projectDropAffordance, dropHandlers: projectDropHandlers, nativeDropTarget } =
    useSidebarProjectDrop({
      enabled: true,
      sidebarRef: sidebarRootRef,
    });
  const {
    workspaceBoardOpen,
    workspaceBoardRenderedOpen,
    workspaceBoardDragPreviewOpen,
    workspaceBoardMenuOpen,
    toggleWorkspaceBoard,
    handleWorkspaceBoardOpenChange,
    setWorkspaceBoardMenuOpen,
    previewWorkspaceBoardFromDrag,
    solidifyWorkspaceBoardFromDrag,
    cancelWorkspaceBoardDragPreview,
  } = useWorkspaceBoardPanel();

  // ─── App Version & Ports ─────────────────────────────────────────────────
  useEffect(() => {
    invoke<string>("get_app_version").then(setAppVersion).catch(() => {});
  }, []);

  const getWorktreesForProject = useCallback((proj: HydraProject): GitWorktreeInfo[] => {
    // Scan vazio ([]) não é cache-hit: cai no fallback is_git abaixo em vez de
    // esvaziar o projeto (paridade Orca placeholderRepoIds).
    const cached = worktreesByProject?.[proj.path];
    if (cached && cached.length > 0) {
      return cached;
    }
    if (proj.path === activeProject?.path && gitWorktrees && gitWorktrees.length > 0) {
      return gitWorktrees;
    }
    if (proj.is_git) {
      return [
        {
          path: proj.path,
          head_commit: "",
          branch: proj.current_branch || "main",
          is_bare: false,
          is_locked: false,
          is_main: true,
          isMainWorktree: true,
        },
      ];
    }
    return [];
  }, [worktreesByProject, gitWorktrees, activeProject]);

  // The board's lanes read the visible set (`getFilteredAndSortedWorktrees`), but removing
  // a status must migrate the workspaces the sidebar hides too — this is the one unfiltered
  // list, built from the same per-project source the sidebar itself projects from.
  const allWorktrees = useMemo(
    () => projects.flatMap((project) => getWorktreesForProject(project)),
    [projects, getWorktreesForProject]
  );

  // D03a-050: the shell owns the real sort signal — one epoch bumped by manual reorders and
  // by meaningful external changes (agent/terminal status, workspace status). The settle gate
  // decides when it may reach the painted order, so background attention ticks cannot reorder
  // rows mid-read. Membership changes bypass the gate through the worktree count.
  const [sortEpoch, setSortEpoch] = useState(0);
  const appliedSortEpoch = useSettledSortEpoch({
    sortBy: resolveComparatorSortBy(displayOptions.sortBy),
    sortEpoch,
    worktreeCount: allWorktrees.length,
  });
  const lastSortSignalRef = useRef<string | null>(null);
  useEffect(() => {
    const signal = [
      sessions
        .map((session) => `${session.id}:${session.state}:${session.updated_at}`)
        .join(","),
      allWorktrees
        .map((worktree) => `${worktree.path}:${worktree.status ?? ""}:${worktree.branch}`)
        .join(","),
    ].join("|");
    if (lastSortSignalRef.current === null) {
      lastSortSignalRef.current = signal;
      return;
    }
    if (lastSortSignalRef.current === signal) return;
    lastSortSignalRef.current = signal;
    setSortEpoch((epoch) => epoch + 1);
  }, [sessions, allWorktrees]);

  useEffect(() => {
    let cancelled = false;
    const scanPorts = async () => {
      const pathsSet = new Set<string>();
      for (const p of projects) {
        pathsSet.add(p.path);
        const wts = getWorktreesForProject(p);
        for (const w of wts) {
          pathsSet.add(w.path);
        }
      }
      if (pathsSet.size === 0) return;
      try {
        const ports = await invoke<WorkspacePort[]>("scan_workspace_ports", {
          worktreePaths: Array.from(pathsSet),
        });
        if (cancelled) return;
        const byWt = new Map<string, WorkspacePort[]>();
        for (const item of ports) {
          const existing = byWt.get(item.worktree_path);
          if (existing) {
            existing.push(item);
          } else {
            byWt.set(item.worktree_path, [item]);
          }
        }
        setPortsByWorktree(byWt);
      } catch {
        /* best-effort port scanning */
      }
    };

    scanPorts();
    const timer = setInterval(scanPorts, 8000);
    const handleImmediateRefresh = () => {
      void scanPorts();
    };
    window.addEventListener("hydra:refresh-ports", handleImmediateRefresh);
    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener("hydra:refresh-ports", handleImmediateRefresh);
    };
  }, [projects, getWorktreesForProject]);

  // Listen for custom group creation events
  useEffect(() => {
    const handleOpenNewGroup = (e: Event) => {
      const detail = (e as CustomEvent<{ projectId?: string; defaultName?: string; hostId?: string }>).detail;
      setGroupNameDialog({
        open: true,
        title: "New Project Group",
        description: "Create a group to organize projects in your sidebar.",
        confirmLabel: "Create",
        initialName: detail?.defaultName ?? "",
        hostId: detail?.hostId,
        onSubmit: (name) => {
          const created = dispatchProjectGroupChange("hydra:create-project-group", {
            name,
            projectId: detail?.projectId,
            ...(detail?.hostId ? { hostId: detail.hostId } : {}),
          });
          if (!created) reportGroupCreateFailure();
        },
      });
    };
    window.addEventListener("hydra:open-new-group-dialog", handleOpenNewGroup);
    return () => window.removeEventListener("hydra:open-new-group-dialog", handleOpenNewGroup);
  }, []);

  // Dismiss context menus on outside click
  useEffect(() => {
    const handleClickOutside = () => {
      setActiveProjectMenu(null);
      setActiveGroupMenu(null);
    };
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  // ─── Preferences Notification Helper ────────────────────────────────────
  const notifyPrefs = useCallback((patch?: Partial<SidebarShellPrefs>) => {
    if (!onSidebarPrefsChange) return;
    onSidebarPrefsChange({
      sidebarBody: patch?.sidebarBody ?? sidebarBody,
      collapsedProjects: patch?.collapsedProjects ?? Array.from(collapsedProjects),
      collapsedGroups: patch?.collapsedGroups ?? Array.from(collapsedGroups),
      displayOptions: patch?.displayOptions ?? displayOptions,
      agentsReadFilter: patch?.agentsReadFilter ?? agentsReadFilter,
      agentsGroupBy: patch?.agentsGroupBy ?? agentsGroupBy,
      agentsSidebarIntroShown: patch?.agentsSidebarIntroShown ?? agentsIntroShown,
    });
  }, [
    onSidebarPrefsChange,
    sidebarBody,
    collapsedProjects,
    collapsedGroups,
    displayOptions,
    agentsReadFilter,
    agentsGroupBy,
    agentsIntroShown,
  ]);

  // ─── Project & Group Toggles ─────────────────────────────────────────────
  const toggleProjectCollapse = useCallback((projectId: string) => {
    setCollapsedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      notifyPrefs({ collapsedProjects: Array.from(next) });
      return next;
    });
  }, [notifyPrefs]);

  const toggleGroupCollapse = useCallback((groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      notifyPrefs({ collapsedGroups: Array.from(next) });
      return next;
    });
  }, [notifyPrefs]);

  const handleSetSidebarBody = useCallback((body: SidebarBody) => {
    setSidebarBody(body);
    notifyPrefs({ sidebarBody: body });
  }, [notifyPrefs]);

  const handleDisplayOptionsChange = useCallback((newOptions: WorkspaceDisplayOptions) => {
    setDisplayOptions(newOptions);
    notifyPrefs({ displayOptions: newOptions });
  }, [notifyPrefs]);

  /**
   * Switches the sidebar to Manual when a board drop wrote a manual order. The board's
   * placement is only visible in Manual, so the write and the mode must move together
   * (Orca `setSortBy('manual')` inside its board drop).
   */
  const handleSwitchToManualSort = useCallback(() => {
    if (displayOptions.sortBy === "manual") return;
    handleDisplayOptionsChange({ ...displayOptions, sortBy: "manual" });
  }, [displayOptions, handleDisplayOptionsChange]);

  /**
   * Applies the board's manual order: the ordered ids become each project's array
   * order, which is how Hydra persists manual order. Rows the board hides keep their
   * slots (`applyWorktreeGroupOrder`), so a filtered board never drops a row.
   */
  const handleApplyBoardManualOrder = useCallback(
    (orderedWorktreeIds: readonly string[]) => {
      if (!onReorderWorktrees) return;
      const rowsById = new Map<
        string,
        { worktree: GitWorktreeInfo; project: HydraProject }
      >();
      for (const project of projects) {
        for (const worktree of getWorktreesForProject(project)) {
          const id = worktree.id ?? `${project.id}::${worktree.path}`;
          if (!rowsById.has(id)) rowsById.set(id, { worktree, project });
        }
      }
      const orderedByProject = new Map<string, GitWorktreeInfo[]>();
      for (const worktreeId of orderedWorktreeIds) {
        const entry = rowsById.get(worktreeId);
        if (!entry) continue;
        const bucket = orderedByProject.get(entry.project.path) ?? [];
        bucket.push(entry.worktree);
        orderedByProject.set(entry.project.path, bucket);
      }
      for (const project of projects) {
        const ordered = orderedByProject.get(project.path);
        if (!ordered || ordered.length === 0) continue;
        const current = getWorktreesForProject(project);
        const next = applyWorktreeGroupOrder(current, ordered);
        const changed = next.some((worktree, index) => worktree.path !== current[index]?.path);
        if (changed) onReorderWorktrees(next, project.path);
      }
    },
    [getWorktreesForProject, onReorderWorktrees, projects]
  );

  // Orca `revealWorkspaceFilters` (D09-018): activation asks the sidebar to lift only
  // the filters hiding its target. The request names the workspace; this component
  // owns the display options, so it is the only writer that can act on it.
  useEffect(() => {
    const onRelaxRequest = (event: Event) => {
      const target = (event as CustomEvent<RevealTargetTraits | undefined>).detail;
      if (!target) return;
      const { displayOptions: nextOptions, changed } = relaxFiltersForReveal(
        displayOptions,
        target
      );
      if (!changed) return;
      handleDisplayOptionsChange(nextOptions);
    };
    window.addEventListener(SIDEBAR_REVEAL_FILTER_REQUEST_EVENT, onRelaxRequest);
    return () =>
      window.removeEventListener(SIDEBAR_REVEAL_FILTER_REQUEST_EVENT, onRelaxRequest);
  }, [displayOptions, handleDisplayOptionsChange]);

  // Registry-dispatched toggle (D09-005): one writer, the same one the menu uses.
  useEffect(() => {
    const onToggle = () => {
      handleDisplayOptionsChange({
        ...displayOptions,
        hideSleeping: !displayOptions.hideSleeping,
      });
    };
    window.addEventListener("hydra:toggle-sleeping-workspaces", onToggle);
    return () => window.removeEventListener("hydra:toggle-sleeping-workspaces", onToggle);
  }, [displayOptions, handleDisplayOptionsChange]);

  // The empty state's escape hatch (D01-051): resets every menu/host-scope filter
  // that can empty the list, through the same writers the options menu uses — one
  // writer per preference, no parallel state.
  const setWorkspaceHostScope = useAppStore((s) => s.setWorkspaceHostScope);
  const storeRepos = useAppStore((s) => s.repos);
  const storeSettings = useAppStore((s) => s.settings);
  // Store shape guard: the auto-stubbed slice can publish null before hydration.
  const storeWorkspaceStatuses = useAppStore((s) => s.workspaceStatuses) ?? undefined;
  // Why the store rows: the shell passes the sidebar only `{id,name}` group labels, while
  // reveal ancestry needs the full `ProjectGroup` (parentGroupId) of the row pipeline.
  const storeProjectGroups =
    useAppStore((s) => s.projectGroups) ?? EMPTY_STORE_PROJECT_GROUPS;

  /** Repo labels for Project sort and reveal ancestry, projected once for the sidebar. */
  const pipelineRepoMap = useMemo(
    () =>
      new Map(
        projects.map((project) => [
          project.id,
          toPipelineRepo({
            project,
            projectGroupId: projectGroupMap?.[project.id] ?? null,
            hostId: undefined,
          }),
        ])
      ),
    [projects, projectGroupMap]
  );
  // The sidebar model carries no connection fields, so host-scoped work reads the
  // store's repo rows by path; a project without a store row has no host stamp.
  const repoByPath = useMemo(
    () => new Map(storeRepos.map((repo) => [repo.path, repo])),
    [storeRepos]
  );
  const storeVisibleWorkspaceHostIds = useAppStore((s) => s.visibleWorkspaceHostIds);
  const storeWorkspaceHostScope = useAppStore((s) => s.workspaceHostScope);
  const setVisibleWorkspaceHostIds = useAppStore((s) => s.setVisibleWorkspaceHostIds);
  const setWorkspaceHostOrder = useAppStore((s) => s.setWorkspaceHostOrder);
  // The trigger's badge and the empty-state gate read the same answer (Orca
  // `sidebarHasActiveFilters` + the per-flag count), so they cannot disagree.
  const sidebarFilterChrome = useMemo(() => {
    const filterState = toSidebarFilterState(displayOptions, {
      visibleWorkspaceHostIds: storeVisibleWorkspaceHostIds,
      workspaceHostScope: storeWorkspaceHostScope,
    })
    return {
      hasActiveFilters: sidebarHasActiveFilters(filterState),
      activeFilterCount: countActiveWorkspaceFilters(displayOptions),
    }
  }, [displayOptions, storeVisibleWorkspaceHostIds, storeWorkspaceHostScope]);

  const handleClearSidebarFilters = useCallback(() => {
    // Orca `clearFilters`: reset only the filters that are actually set, so the
    // button never churns unrelated display options or the debounced write-back.
    const plan = planSidebarClearFilters(displayOptions, {
      visibleWorkspaceHostIds: storeVisibleWorkspaceHostIds,
      workspaceHostScope: storeWorkspaceHostScope,
    });
    if (!plan.changed) return;
    if (plan.displayOptions !== displayOptions) {
      setDisplayOptions(plan.displayOptions);
      notifyPrefs({ displayOptions: plan.displayOptions });
    }
    if (plan.resetHostScope) {
      setWorkspaceHostScope(ALL_EXECUTION_HOSTS_SCOPE);
      setVisibleWorkspaceHostIds(null);
    }
  }, [
    displayOptions,
    notifyPrefs,
    setWorkspaceHostScope,
    setVisibleWorkspaceHostIds,
    storeVisibleWorkspaceHostIds,
    storeWorkspaceHostScope,
  ]);

  const handleAgentsGroupByChange = useCallback((groupBy: AgentsGroupBy) => {
    setAgentsGroupBy(groupBy);
    notifyPrefs({ agentsGroupBy: groupBy });
  }, [notifyPrefs]);

  // D01-009: acknowledging the intro persists through the same writer as the other
  // shell prefs, so it shows exactly once across restarts.
  const handleAcknowledgeAgentsIntro = useCallback(() => {
    setAgentsIntroShown(true);
    notifyPrefs({ agentsSidebarIntroShown: true });
  }, [notifyPrefs]);

  const handleAgentsReadFilterChange = useCallback((readFilter: AgentsReadFilter) => {
    setAgentsReadFilter(readFilter);
    notifyPrefs({ agentsReadFilter: readFilter });
  }, [notifyPrefs]);

  // ─── Reveal Action ───────────────────────────────────────────────────────
  const flashRevealedWorktree = useCallback((path: string) => {
    if (highlightTimerRef.current !== null) {
      window.clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = null;
    }
    setHighlightedRevealPath(null);
    requestAnimationFrame(() => {
      setHighlightedRevealPath(path);
      highlightTimerRef.current = window.setTimeout(() => {
        setHighlightedRevealPath(null);
        highlightTimerRef.current = null;
      }, 1500);
    });
  }, []);

  const revealWorkspaceNow = useCallback(
    (targetPath?: string | null, options?: SidebarRevealOptions) => {
    const target = targetPath || revealTargetPath || activeWorktreePath;
    if (!target) return;

    // Orca `revealWorkspaceFilters`: a reveal must not fail because a filter hides
    // the target; relax only the blocking ones before scrolling.
    for (const proj of projects) {
      const targetWorktree = getWorktreesForProject(proj).find(
        (worktree) => worktree.path === target
      );
      if (!targetWorktree) continue;
      const branch = targetWorktree.branch ?? "";
      const { displayOptions: nextOptions, changed } = relaxFiltersForReveal(displayOptions, {
        path: target,
        projectId: proj.id,
        isMainWorktree: Boolean(targetWorktree.is_main || targetWorktree.isMainWorktree),
        automationCreated: Boolean(targetWorktree.automationProvenanceKind),
        cliCreated: Boolean(targetWorktree.cliProvenanceKind),
        detachedHead: branch === "HEAD" || branch === "(detached)" || branch.startsWith("(HEAD detached"),
      });
      if (changed) {
        setDisplayOptions(nextOptions);
        notifyPrefs({ displayOptions: nextOptions });
      }

      // Host scope: a reveal for a host outside the visible set silently did nothing.
      const targetRepo = storeRepos.find(
        (repo) => repo.id === proj.id || repo.path === proj.path
      );
      const targetHostId = targetRepo ? getRepoExecutionHostId(targetRepo) : null;
      const visibleHosts = storeVisibleWorkspaceHostIds;
      if (targetHostId && visibleHosts && !visibleHosts.includes(targetHostId)) {
        setVisibleWorkspaceHostIds([...visibleHosts, targetHostId]);
      }
      if (targetHostId && storeWorkspaceHostScope !== "all" && storeWorkspaceHostScope !== targetHostId) {
        setWorkspaceHostScope(targetHostId);
      }
      // Sleeping hides every inactive workspace; the target of a reveal is not
      // "sleeping" for the user's purposes.
      if (displayOptions.hideSleeping) {
        const hasActiveSession = sessions.some(
          (session) =>
            (session.project_path === target || session.project_path === proj.path) &&
            (session.state === "working" || session.state === "blocked" || session.state === "waiting")
        );
        if (!hasActiveSession && target !== activeWorktreePath) {
          const nextSleeping = { ...nextOptions, hideSleeping: false };
          setDisplayOptions(nextSleeping);
          notifyPrefs({ displayOptions: nextSleeping });
        }
      }
      break;
    }

    // Resolve what the reveal has to uncover before the row can paint: the natural group
    // (D03a-040, `getRevealGroupKeysToExpand`), the lineage folds above the target
    // (D03a-062) and the Pinned duplicate. All three are keyed exactly like the row
    // pipeline keys its sections, so opening these keys is the whole expansion.
    let targetRow: Worktree | null = null;
    let targetFolderWorkspace: SidebarRevealFolderWorkspace | null = null;
    let targetSectionKeys: string[] = [];
    const collapsedKeysToExpand = new Set<string>();
    for (const proj of projects) {
      const wts = getWorktreesForProject(proj);
      const worktree = wts.find((candidate) => candidate.path === target);
      const folderWorkspace = folderWorkspaces.find(
        (workspace) => workspace.folderPath === target
      );
      if (proj.path !== target && !worktree && !folderWorkspace) continue;

      if (collapsedProjects.has(proj.id)) {
        setCollapsedProjects((prev) => {
          const next = new Set(prev);
          next.delete(proj.id);
          return next;
        });
      }
      const groupId = projectGroupMap?.[proj.id];
      if (groupId && collapsedGroups.has(groupId)) {
        setCollapsedGroups((prev) => {
          const next = new Set(prev);
          next.delete(groupId);
          return next;
        });
      }

      if (worktree) {
        const targetRepo =
          repoByPath.get(proj.path) ??
          storeRepos.find((repo) => repo.id === proj.id);
        targetRow = toWorktreeRow(worktree, {
          repoId: proj.id,
          hostId: getRowHostId(targetRepo),
        });
        const isPinnedSectionWorktree = pinnedWorktrees?.has(target) ?? false;
        // `prCache` stays null: the capability only claims repo / project-group / Pinned
        // ancestry here; PR-lane expansion belongs to the row pipeline's own reveal.
        targetSectionKeys = getGroupKeysForWorktree(
          displayOptions.groupBy,
          targetRow,
          pipelineRepoMap,
          null,
          storeWorkspaceStatuses,
          storeSettings,
          storeProjectGroups,
          undefined,
          isPinnedSectionWorktree
        );
        for (const key of getRevealGroupKeysToExpand({
          groupBy: displayOptions.groupBy,
          worktree: targetRow,
          repoMap: pipelineRepoMap,
          prCache: null,
          collapsedGroups,
          workspaceStatuses: storeWorkspaceStatuses,
          settings: storeSettings,
          projectGroups: storeProjectGroups,
          isPinnedSectionWorktree,
        })) {
          collapsedKeysToExpand.add(key);
        }

        // Lineage: a child nested under a collapsed parent row cannot mount, so walk the
        // path lineage upward and open every collapsed `lineage:` fold on the way.
        let parentPath = lineageByPath?.[target];
        const seenLineagePaths = new Set<string>([target]);
        while (parentPath && !seenLineagePaths.has(parentPath)) {
          seenLineagePaths.add(parentPath);
          const parentProject = projects.find(
            (candidate) =>
              candidate.path === parentPath ||
              getWorktreesForProject(candidate).some(
                (candidateWorktree) => candidateWorktree.path === parentPath
              )
          );
          const parentWorktree = parentProject
            ? getWorktreesForProject(parentProject).find(
                (candidate) => candidate.path === parentPath
              )
            : undefined;
          if (!parentProject || !parentWorktree) break;
          const parentRepo =
            repoByPath.get(parentProject.path) ??
            storeRepos.find((repo) => repo.id === parentProject.id);
          const parentRow = toWorktreeRow(parentWorktree, {
            repoId: parentProject.id,
            hostId: getRowHostId(parentRepo),
          });
          const lineageGroupKey = getWorktreeLineageGroupKey(parentRow);
          if (collapsedGroups.has(lineageGroupKey)) {
            collapsedKeysToExpand.add(lineageGroupKey);
          }
          parentPath = lineageByPath?.[parentPath];
        }
      }

      if (folderWorkspace) {
        targetFolderWorkspace = folderWorkspace;
        for (const key of getFolderWorkspaceRevealGroupKeys(folderWorkspace, storeProjectGroups)) {
          if (collapsedGroups.has(key)) collapsedKeysToExpand.add(key);
        }
      }
      // Why separately: a pinned worktree also paints inside the Pinned section under
      // `single-location`, where the natural group keys alone would not reveal it.
      if (pinnedWorktrees?.has(target)) {
        for (const key of getPinnedWorktreeRevealCollapsedGroupKeys()) {
          if (collapsedGroups.has(key)) collapsedKeysToExpand.add(key);
        }
      }
      if (collapsedKeysToExpand.size > 0) {
        setCollapsedGroups((prev) => {
          const next = new Set(prev);
          for (const key of collapsedKeysToExpand) next.delete(key);
          return next;
        });
      }
      break;
    }

    if (options?.highlight !== false) flashRevealedWorktree(target);

    // The mounted row: the card's own path attribute first, then the listbox option id the
    // row pipeline published (a folder row has no card path; a virtualizer window can paint
    // the wrapper before the card's attributes are readable).
    const container = worktreeScrollRef.current;
    const optionIds = getRevealMountedOptionIds({
      sectionKeys: targetSectionKeys,
      worktree: targetRow,
      folderWorkspace: targetFolderWorkspace,
    });
    let settled = false;
    const settleReveal = (): void => {
      if (settled) return;
      settled = true;
      options?.onRevealSettled?.();
    };
    let revealAttempts = 0;
    const revealMountedRow = (): void => {
      const element =
        container?.querySelector(`[data-worktree-path="${CSS.escape(target)}"]`) ??
        optionIds.map((id) => document.getElementById(id)).find((node) => node !== null) ??
        null;
      if (!element) {
        revealAttempts += 1;
        if (revealAttempts < MAX_REVEAL_RETRIES) {
          requestAnimationFrame(revealMountedRow);
          return;
        }
        // Still no row: the caller decides whether the target vanished (clear the pending
        // reveal) or the expansion is still landing (keep it pending).
        options?.onRevealExhausted?.();
        return;
      }
      // Why not `scrollIntoView({ block: "nearest" })`: a card above the viewport would
      // land flush under the sticky group header. The reveal math reserves that inset
      // (and honors reduced-motion); the fallback only runs when the row is outside the
      // list's own scroll container. `settleReveal` is the scroll-anchor's issued-scroll
      // signal, so a pending request clears on the actual scroll instead of a rAF guess.
      const revealed = container
        ? revealElementInScrollContainer(container, element, "smooth", settleReveal)
        : false;
      if (!container || !revealed) {
        element.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
      if (options?.beginRename) {
        window.dispatchEvent(
          new CustomEvent("hydra:begin-rename-worktree", { detail: { path: target } })
        );
      }
      settleReveal();
    };
    requestAnimationFrame(revealMountedRow);
  }, [
    revealTargetPath,
    activeWorktreePath,
    projects,
    getWorktreesForProject,
    collapsedProjects,
    collapsedGroups,
    projectGroupMap,
    flashRevealedWorktree,
    displayOptions,
    notifyPrefs,
    storeRepos,
    storeVisibleWorkspaceHostIds,
    storeWorkspaceHostScope,
    setVisibleWorkspaceHostIds,
    setWorkspaceHostScope,
    sessions,
    folderWorkspaces,
    pinnedWorktrees,
    lineageByPath,
    storeProjectGroups,
    pipelineRepoMap,
    repoByPath,
    storeSettings,
    storeWorkspaceStatuses,
  ]);

  // Orca `useSidebarRevealRequests`: when filters hide the target, ask before
  // adjusting them; otherwise reveal straight away.
  const [revealConfirmation, setRevealConfirmation] = useState<{
    targetPath: string;
    options?: SidebarRevealOptions;
  } | null>(null);

  const handleRevealCurrent = useCallback(
    (targetPath?: string | null, options?: SidebarRevealOptions) => {
      const target = targetPath || revealTargetPath || activeWorktreePath;
      if (!target) return;
      const proj = projects.find(
        (project) =>
          project.path === target ||
          getWorktreesForProject(project).some((worktree) => worktree.path === target)
      );
      if (!proj) {
        revealWorkspaceNow(target, options);
        return;
      }
      const worktree = getWorktreesForProject(proj).find((item) => item.path === target);
      const branch = worktree?.branch ?? "";
      const targetRepo = storeRepos.find(
        (repo) => repo.id === proj.id || repo.path === proj.path
      );
      const targetHostId = targetRepo ? getRepoExecutionHostId(targetRepo) : null;
      const hostVisible =
        !targetHostId ||
        ((!storeVisibleWorkspaceHostIds ||
          storeVisibleWorkspaceHostIds.includes(targetHostId)) &&
          (storeWorkspaceHostScope === "all" || storeWorkspaceHostScope === targetHostId));
      const hasActiveSession = sessions.some(
        (session) =>
          (session.project_path === target || session.project_path === proj.path) &&
          (session.state === "working" || session.state === "blocked" || session.state === "waiting")
      );
      const hidden = isRevealTargetHiddenByFilters(displayOptions, {
        projectId: proj.id,
        isMainWorktree: Boolean(worktree?.is_main || worktree?.isMainWorktree),
        automationCreated: Boolean(worktree?.automationProvenanceKind),
        cliCreated: Boolean(worktree?.cliProvenanceKind),
        detachedHead:
          branch === "HEAD" ||
          branch === "(detached)" ||
          branch.startsWith("(HEAD detached"),
        hostVisible,
        sleepingHidden:
          displayOptions.hideSleeping && !hasActiveSession && target !== activeWorktreePath,
      });
      if (hidden) {
        // The pending effect may replay the request while the dialog is open; keep the
        // first options object (and its callbacks) instead of re-setting state per render.
        setRevealConfirmation((current) =>
          current?.targetPath === target ? current : { targetPath: target, options }
        );
        return;
      }
      revealWorkspaceNow(target, options);
    },
    [
      revealTargetPath,
      activeWorktreePath,
      projects,
      getWorktreesForProject,
      storeRepos,
      storeVisibleWorkspaceHostIds,
      storeWorkspaceHostScope,
      sessions,
      displayOptions,
      revealWorkspaceNow,
    ]
  );

  // Orca `useSidebarRevealRequests`: consume the store's queued worktree reveal (the list
  // may be unmounted or filtered when the request arrives). Resolution is identity-qualified
  // (D03a-070): the store's host-qualified rows win over the scan path bridge, and a target
  // that vanished before it could mount is dropped instead of staying queued forever.
  useEffect(() => {
    if (!pendingRevealWorktree) return;
    const pendingHostId = pendingRevealWorktree.executionHostId;
    const hostWorktrees = getRevealCandidateWorktrees(
      getIndexedAllWorktrees(useAppStore.getState().worktreesByRepo),
      pendingHostId
    );
    const known = getKnownSidebarWorktreeById(
      pendingRevealWorktree.worktreeId,
      new Map(hostWorktrees.map((worktree) => [worktree.id, worktree])),
      folderWorkspaces,
      hostWorktrees
    );
    const targetPath = known
      ? known.kind === "worktree"
        ? known.worktree.path
        : known.folderWorkspace.folderPath
      : resolveRevealWorktreePath(
          pendingRevealWorktree.worktreeId,
          projects.map((project) => ({
            projectId: project.id,
            path: project.path,
            worktrees: getWorktreesForProject(project),
          }))
        );
    if (!targetPath) {
      // The request names a workspace the tree no longer holds; nothing can paint it.
      clearPendingRevealWorktreeId();
      return;
    }
    handleRevealCurrent(targetPath, {
      highlight: pendingRevealWorktree.highlight,
      beginRename: pendingRevealWorktree.beginRename,
      onRevealSettled: clearPendingRevealWorktreeId,
      onRevealExhausted: () => {
        if (!known) return;
        // D03a-062: an expansion can still be landing when the retry window closes; only
        // give up once the workspace itself is gone from the tree. Read the store again:
        // the frames between request and exhaustion can delete the row.
        const latestHostWorktrees = getRevealCandidateWorktrees(
          getIndexedAllWorktrees(useAppStore.getState().worktreesByRepo),
          pendingHostId
        );
        if (sidebarWorkspaceStillExists(known, latestHostWorktrees, folderWorkspaces)) {
          return;
        }
        clearPendingRevealWorktreeId();
      },
    });
  }, [
    pendingRevealWorktree,
    clearPendingRevealWorktreeId,
    projects,
    getWorktreesForProject,
    handleRevealCurrent,
    folderWorkspaces,
  ]);

  // Orca `useCollapsedGroups` for the agent-send target (D03a-049): the picker's
  // worktree must not sit inside a collapsed section when the picker opens.
  useEffect(() => {
    const targetId = agentSendTargetMode?.worktreeId;
    if (!targetId) return;
    for (const project of projects) {
      const worktree = getWorktreesForProject(project).find((item) => item.id === targetId);
      if (!worktree) continue;
      if (collapsedProjects.has(project.id)) {
        setCollapsedProjects((prev) => {
          const next = new Set(prev);
          next.delete(project.id);
          return next;
        });
      }
      const groupId = projectGroupMap?.[project.id];
      if (groupId && collapsedGroups.has(groupId)) {
        setCollapsedGroups((prev) => {
          const next = new Set(prev);
          next.delete(groupId);
          return next;
        });
      }
      break;
    }
  }, [
    agentSendTargetMode?.worktreeId,
    projects,
    getWorktreesForProject,
    collapsedProjects,
    collapsedGroups,
    projectGroupMap,
  ]);

  // Orca `useSidebarRevealRequests` (row-key leg): a reveal of a section header must
  // switch to repo grouping and expand the sections that hide it before the viewport
  // can scroll to the key. The viewport clears the request once it scrolls.
  useEffect(() => {
    if (!pendingRevealSidebarRow) return;
    const key = pendingRevealSidebarRow.rowKey;
    const isHeaderKey =
      key.startsWith("repo:") ||
      key.startsWith("project-group:") ||
      key.startsWith("project:");
    if (isHeaderKey && displayOptions.groupBy !== "repo") {
      const next = { ...displayOptions, groupBy: "repo" as const };
      setDisplayOptions(next);
      notifyPrefs({ displayOptions: next });
      return;
    }
    const rowExists =
      key.startsWith("repo:") || key.startsWith("project:")
        ? projects.some(
            (project) =>
              project.id === key.slice(key.indexOf(":") + 1) ||
              project.path === key.slice(key.indexOf(":") + 1)
          )
        : key.startsWith("project-group:")
          ? projectGroups.some((group) => group.id === key.slice("project-group:".length))
          : true;
    if (!rowExists) {
      // Orca toasts rather than leaving a reveal queued forever when the target
      // disappeared between the request and the paint.
      toast.error("Target no longer exists");
      clearPendingRevealSidebarRow();
      return;
    }
    if (key.startsWith("repo:")) {
      const repoId = key.slice("repo:".length);
      if (collapsedProjects.has(repoId)) {
        setCollapsedProjects((prev) => {
          const next = new Set(prev);
          next.delete(repoId);
          return next;
        });
      }
    } else if (key.startsWith("project-group:")) {
      const groupId = key.slice("project-group:".length);
      if (collapsedGroups.has(groupId)) {
        setCollapsedGroups((prev) => {
          const next = new Set(prev);
          next.delete(groupId);
          return next;
        });
      }
    }
  }, [
    pendingRevealSidebarRow,
    clearPendingRevealSidebarRow,
    projects,
    projectGroups,
    displayOptions,
    notifyPrefs,
    collapsedProjects,
    collapsedGroups,
  ]);

  // Orca `useWorkspaceRevealBodyRedirect`: a reveal request that arrives while the
  // Agents body owns the viewport switches to Workspaces and replays the reveal.
  useWorktreeRevealBodyRedirect({
    agentsBodyShowing: sidebarBody === "agents",
    onShowWorkspaces: () => handleSetSidebarBody("workspaces"),
    onReveal: (path) => handleRevealCurrent(path ?? undefined),
  });

  // ─── Drag and Drop Handlers ──────────────────────────────────────────────
  /**
   * The panel's single order writer: an in-group reorder from any gesture — the HTML5
   * drop and the pointer drag — lands here, so there is one persisted order per list.
   */
  const commitReorderedWorktrees = useCallback(
    (ordered: GitWorktreeInfo[], projectPath: string) => {
      // D03a-050: a manual reorder is direct manipulation, so it bumps the same sort
      // signal the settle gate watches; Manual mode applies it without the settle window.
      setSortEpoch((epoch) => epoch + 1);
      onReorderWorktrees?.(ordered, projectPath);
    },
    [onReorderWorktrees]
  );

  // Why no payload here: the row publishes the shared `workspace-status-drag-data.ts`
  // payload itself (WorktreeList owns the workspace id the board keys on). This handler only
  // remembers the row, which is what the list's own HTML5 drop preview reads.
  const handleWorktreeDragStart = useCallback((_event: React.DragEvent, path: string) => {
    setDraggedWorktreePath(path);
  }, []);

  const handleWorktreeDragOver = useCallback((e: React.DragEvent, targetPath: string) => {
    // Why the guard: the list's native drop preview belongs to the list's own drag. Any
    // other drag that reaches a row — an external file, or a native workspace drag from
    // another surface — is not a drop this list commits, so it must not paint an insertion
    // line the release cannot honour.
    if (!draggedWorktreePath) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const isTop = e.clientY - rect.top < rect.height / 2;
    setWorktreeDropTarget({ path: targetPath, position: isTop ? "top" : "bottom" });
  }, [draggedWorktreePath]);

  const handleWorktreeDrop = useCallback((
    e: React.DragEvent,
    targetPath: string,
    proj: HydraProject
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedWorktreePath && draggedWorktreePath !== targetPath && onReorderWorktrees) {
      const wts = getWorktreesForProject(proj);
      const fromIdx = wts.findIndex((w) => w.path === draggedWorktreePath);
      const toIdx = wts.findIndex((w) => w.path === targetPath);
      if (fromIdx !== -1 && toIdx !== -1) {
        const next = [...wts];
        const [moved] = next.splice(fromIdx, 1);
        const insertIdx = worktreeDropTarget?.position === "top" ? toIdx : toIdx + 1;
        next.splice(insertIdx > fromIdx ? insertIdx - 1 : insertIdx, 0, moved);
        commitReorderedWorktrees(next, proj.path);
      }
    }
    setDraggedWorktreePath(null);
    setWorktreeDropTarget(null);
  }, [draggedWorktreePath, worktreeDropTarget, getWorktreesForProject, onReorderWorktrees, commitReorderedWorktrees]);

  const handleWorktreeDragEnd = useCallback(() => {
    setDraggedWorktreePath(null);
    setWorktreeDropTarget(null);
  }, []);

  // Orca document capture fallback (D03a-019): a native row drag released outside any
  // registered target still ends the drag, so the list never keeps a stale preview.
  useEffect(() => {
    if (!draggedWorktreePath) return;
    const clearNativeDrag = () => {
      setDraggedWorktreePath(null);
      setWorktreeDropTarget(null);
    };
    // Why deferred: the capture-phase drop runs BEFORE the row/header drop handler,
    // so clearing synchronously would make the row reorder read a null source.
    let dropTimer: number | null = null;
    const handleDocumentDrop = () => {
      if (dropTimer !== null) window.clearTimeout(dropTimer);
      dropTimer = window.setTimeout(clearNativeDrag, 0);
    };
    document.addEventListener("dragend", clearNativeDrag, { capture: true });
    document.addEventListener("drop", handleDocumentDrop, { capture: true });
    return () => {
      if (dropTimer !== null) window.clearTimeout(dropTimer);
      document.removeEventListener("dragend", clearNativeDrag, { capture: true });
      document.removeEventListener("drop", handleDocumentDrop, { capture: true });
    };
  }, [draggedWorktreePath]);

  const handleProjectDragStart = useCallback((e: React.DragEvent, id: string) => {
    // Why: the repo header also hosts the .../+ /chevron overlay; a drag that
    // starts on an action must not reorder the project (D15a-009).
    if (isRepoHeaderActionTarget(e.target, e.currentTarget as HTMLElement)) {
      e.preventDefault();
      return;
    }
    setDraggedProjectId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/x-hydra-project-drag", id);
  }, []);

  const handleProjectDragOver = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const isTop = e.clientY - rect.top < rect.height / 2;
    setProjectDropTarget({ id: targetId, position: isTop ? "top" : "bottom" });
  }, []);

  const handleProjectDrop = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedProjectId && draggedProjectId !== targetId && onReorderProjects) {
      const fromIdx = projects.findIndex((p) => p.id === draggedProjectId);
      const toIdx = projects.findIndex((p) => p.id === targetId);
      if (fromIdx !== -1 && toIdx !== -1) {
        const next = [...projects];
        const [moved] = next.splice(fromIdx, 1);
        const insertIdx = projectDropTarget?.position === "top" ? toIdx : toIdx + 1;
        next.splice(insertIdx > fromIdx ? insertIdx - 1 : insertIdx, 0, moved);
        onReorderProjects(next);
      }
    }
    setDraggedProjectId(null);
    setProjectDropTarget(null);
  }, [draggedProjectId, projectDropTarget, projects, onReorderProjects]);

  const handleProjectDragEnd = useCallback(() => {
    setDraggedProjectId(null);
    setProjectDropTarget(null);
  }, []);

  // ─── Filtered and Sorted Projects & Worktrees ────────────────────────────
  const displayProjects = useMemo(() => {
    let list = projects;
    if (displayOptions.filterProjectIds?.length) {
      list = projects.filter((p) => displayOptions.filterProjectIds!.includes(p.id));
    }
    if (pinnedProjects && pinnedProjects.size > 0) {
      list = [...list].sort((a, b) => {
        const aPin = pinnedProjects.has(a.id);
        const bPin = pinnedProjects.has(b.id);
        if (aPin !== bPin) return aPin ? -1 : 1;
        return 0;
      });
    }
    return list;
  }, [projects, displayOptions.filterProjectIds, pinnedProjects]);

  /** Persisted rows carry the manual order and real activity timestamps. */
  const worktreesByRepo = useAppStore((state) => state.worktreesByRepo);

  const groupDeleteMembers = useMemo(() => {
    if (!groupDeleteDialog.group) return [];
    // Why: deletion targets every member, not only the rows the Show filter paints.
    return projects.filter(
      (p) => projectGroupMap?.[p.id] === groupDeleteDialog.group?.id
    );
  }, [projects, projectGroupMap, groupDeleteDialog.group]);

  // ─── Repo header create state (Orca `getRepoHeaderCreateState`) ──────────
  // The sidebar model carries no connection fields, so the host gate reads the
  // store's repo rows by path; a project without a store row stays creatable.
  const sshConnectionStates = useAppStore((state) => state.sshConnectionStates);

  const createStateByProjectId = useMemo(() => {
    const states = new Map<string, RepoHeaderCreateState>();
    for (const project of projects) {
      const repo = repoByPath.get(project.path);
      const connectionId = repo?.connectionId ?? project.connectionId ?? null;
      states.set(
        project.id,
        getRepoHeaderCreateState({
          // Why the fallback: the sidebar model can paint a project before the store
          // catalog row lands, and a missing row must stay creatable.
          repo: {
            kind: repo?.kind ?? (project.is_git ? "git" : "folder"),
            connectionId,
          },
          label: project.displayName || project.name,
          sshStatus: connectionId
            ? (sshConnectionStates.get(connectionId)?.status ?? null)
            : null,
        })
      );
    }
    return states;
  }, [projects, repoByPath, sshConnectionStates]);

  // ─── Project group host routing (Orca owner-host routing) ────────────────
  const resolveProjectHostId = useCallback(
    (project: HydraProject): string | undefined => {
      const repo = repoByPath.get(project.path);
      return repo ? getRepoExecutionHostId(repo) : undefined;
    },
    [repoByPath]
  );

  const resolveGroupOwnerHostId = useCallback(
    (groupId: string): string | undefined => {
      // Why the stamp first: an empty group has no member to derive a host from,
      // and App's host-qualified buckets already know which host owns the row.
      const groupHostId = projectGroups.find((group) => group.id === groupId)?.hostId;
      if (groupHostId) return groupHostId;
      const member = projects.find((project) => projectGroupMap?.[project.id] === groupId);
      return member ? resolveProjectHostId(member) : undefined;
    },
    [projectGroups, projects, projectGroupMap, resolveProjectHostId]
  );

  /**
   * `catalog_set_repo_icon` writes this computer's catalog file, so a project
   * owned by an SSH/runtime host has no row to write. The menu entry is disabled
   * with this reason instead of reporting a save that only painted locally.
   */
  const repoIconDisabledReason = useCallback(
    (project: HydraProject): string | null => {
      const host = parseExecutionHostId(resolveProjectHostId(project) ?? null);
      return host && host.kind !== "local" ? REPO_ICON_REMOTE_DISABLED_REASON : null;
    },
    [resolveProjectHostId]
  );

  /**
   * Pick → optimistic echo (App patches `projects` immediately) → catalog write →
   * authoritative refresh. A rejected write echoes the previous glyph back so the
   * header cannot keep an icon the file never stored.
   */
  const commitProjectIcon = useCallback(
    async (project: HydraProject, repoIcon: RepoIcon | null) => {
      const previousIcon = project.repo_icon ?? null;
      window.dispatchEvent(
        new CustomEvent(PROJECT_ICON_OPTIMISTIC_EVENT, {
          detail: { projectId: project.id, repoIcon },
        })
      );
      try {
        await setCatalogRepoIcon(catalogRepoIdFromProjectId(project.id), repoIcon);
      } catch (error) {
        window.dispatchEvent(
          new CustomEvent(PROJECT_ICON_OPTIMISTIC_EVENT, {
            detail: { projectId: project.id, repoIcon: previousIcon },
          })
        );
        toast.error(
          translate(
            "auto.components.sidebar.WorktreeList.projectIconFailed",
            "Could not change the project icon"
          )
        );
        console.error(error);
        return;
      }
      const refreshed = await requestProjectsRefresh();
      if (!refreshed) {
        toast.error(
          translate(
            "auto.components.sidebar.WorktreeList.projectIconRefreshFailed",
            "Project icon saved, but the sidebar could not reload it"
          )
        );
      }
    },
    []
  );

  /**
   * Orca group mutations return a result the caller can toast on. Hydra's menu
   * dispatches a window event and App acknowledges it synchronously with
   * `hydra:refresh-projects`; a missing acknowledgement means nothing applied.
   */
  const dispatchProjectGroupChange = useCallback(
    (eventName: string, detail: Record<string, unknown>): boolean => {
      let acknowledged = false;
      const acknowledge = () => {
        acknowledged = true;
      };
      window.addEventListener("hydra:refresh-projects", acknowledge);
      try {
        window.dispatchEvent(new CustomEvent(eventName, { detail }));
      } finally {
        window.removeEventListener("hydra:refresh-projects", acknowledge);
      }
      return acknowledged;
    },
    []
  );

  const reportGroupCreateFailure = useCallback(() => {
    toast.error(
      translate("auto.components.sidebar.WorktreeList.groupCreateFailed", "Failed to create group"),
      {
        description: translate(
          "auto.components.sidebar.WorktreeList.groupCreateFailedDesc",
          "Hydra could not create the group. Check the sidebar after reconnecting."
        ),
      }
    );
  }, []);

  const reportGroupRenameFailure = useCallback(() => {
    toast.error(
      translate("auto.components.sidebar.WorktreeList.groupRenameFailed", "Failed to rename group"),
      {
        description: translate(
          "auto.components.sidebar.WorktreeList.groupRenameFailedDesc",
          "Hydra could not confirm the new name with the group's host. Recheck the group after reconnecting."
        ),
      }
    );
  }, []);

  const reportGroupOrderFailure = useCallback(() => {
    toast.error(
      translate("auto.components.sidebar.WorktreeList.groupOrderFailed", "Failed to reorder group"),
      {
        description: translate(
          "auto.components.sidebar.WorktreeList.groupOrderFailedDesc",
          "Hydra could not save the new group order on the group's host. Reorder it again after reconnecting."
        ),
      }
    );
  }, []);

  const reportGroupMoveFailure = useCallback(() => {
    toast.error(
      translate("auto.components.sidebar.WorktreeList.groupMoveFailed", "Failed to move project"),
      {
        description: translate(
          "auto.components.sidebar.WorktreeList.groupMoveFailedDesc",
          "Hydra could not confirm the move with the project's host. Recheck the group after reconnecting."
        ),
      }
    );
  }, []);

  const reportGroupDeleteFailure = useCallback(() => {
    toast.error(
      translate("auto.components.sidebar.WorktreeList.groupDeleteFailed", "Failed to delete group"),
      {
        description: translate(
          "auto.components.sidebar.WorktreeList.groupDeleteFailedDesc",
          "Something went wrong while deleting the group. No projects were removed."
        ),
      }
    );
  }, []);

  const query = filter.trim().toLowerCase();

  // ─── Smart-sort inputs (Orca `sortWorktreesSmart`) ────────────────────────
  // Why the store here: the painted order needs the PTY/agent evidence the props do
  // not carry. Reading it in WorktreeSidebar keeps one writer over the painted order.
  const storeTabsByWorktree = useAppStore((s) => s.tabsByWorktree);
  const storePtyIdsByTabId = useAppStore((s) => s.ptyIdsByTabId);
  const storeAgentStatusByPaneKey = useAppStore((s) => s.agentStatusByPaneKey);

  // Session ids whose tab still holds a live PTY: title-only evidence may promote them.
  const liveSessionIds = useMemo(() => {
    const ids = new Set<string>();
    for (const tabs of Object.values(storeTabsByWorktree ?? {})) {
      for (const tab of tabs) {
        if (tab.sessionId && tabHasLivePty(storePtyIdsByTabId ?? {}, tab.id)) {
          ids.add(tab.sessionId);
        }
      }
    }
    return ids;
  }, [storeTabsByWorktree, storePtyIdsByTabId]);

  // Rolling hook history per worktree path: Class 3's prior-attention stamp
  // (`mostRecentAttentionInHistory`), newest entry wins.
  const hookHistoryByWorktreePath = useMemo(() => {
    const byPath = new Map<string, { updatedAt: number; history: readonly AgentStateHistoryEntry[] }>();
    for (const entry of Object.values(storeAgentStatusByPaneKey ?? {})) {
      if (!entry.worktreeId || !entry.stateHistory || entry.stateHistory.length === 0) continue;
      const current = byPath.get(entry.worktreeId);
      if (!current || entry.updatedAt > current.updatedAt) {
        byPath.set(entry.worktreeId, { updatedAt: entry.updatedAt, history: entry.stateHistory });
      }
    }
    return new Map(
      [...byPath.entries()].map(([path, value]) => [path, value.history] as const)
    );
  }, [storeAgentStatusByPaneKey]);

  // Cold start: no live PTY and no fresh hook-attributed status means the agent
  // snapshot has not landed, so the smart modes keep the persisted order.
  const sortColdStart = useMemo(
    () =>
      isSidebarSortColdStart({
        tabsByWorktree: storeTabsByWorktree,
        ptyIdsByTabId: storePtyIdsByTabId,
        agentStatusByPaneKey: storeAgentStatusByPaneKey,
        now: Date.now(),
      }),
    [storeTabsByWorktree, storePtyIdsByTabId, storeAgentStatusByPaneKey]
  );

  // Why settled only for attention-driven modes: Smart and Recent rank by time-decaying
  // scores, so background activity must not reorder them mid-read. Name/Repo/Manual are
  // deterministic or direct manipulation and always paint the fresh order.
  const settledSortMode =
    displayOptions.sortBy === "agent-activity" ||
    displayOptions.sortBy === "smart" ||
    displayOptions.sortBy === "recent";

  const sortWorktreesForProject = useCallback(
    (proj: HydraProject, wts: GitWorktreeInfo[]): GitWorktreeInfo[] => {
      // Sort through the ported Orca comparator. The menu's legacy "Agent Activity" is
      // the `smart` mode, and Project/Manual/Recent/Name all share the comparator the
      // closed-sidebar path uses (see `smart-sort.ts`), so the two paths cannot drift.
      const now = Date.now();
      const projected = applyPersistedWorktreeOrder(
        wts.map((worktree) => toWorktreeRow(worktree, { repoId: proj.id })),
        worktreesByRepo[proj.id]
      );
      const smartMode =
        displayOptions.sortBy === "agent-activity" || displayOptions.sortBy === "smart";
      const attentionByWorktree = smartMode
        ? new Map(
            projected.map((row) => {
              const worktree = wts.find((candidate) => candidate.path === row.path);
              const history = hookHistoryByWorktreePath.get(row.path);
              const rowSessions = sessions
                .filter(
                  (session) =>
                    session.project_path === row.path ||
                    ((worktree?.is_main || worktree?.isMainWorktree) &&
                      session.project_path === proj.path)
                )
                .map((session) => ({
                  ...session,
                  hasLivePty: liveSessionIds.has(session.id),
                  ...(history ? { stateHistory: history } : {}),
                }));
              return [
                row.id,
                resolveWorktreeAttentionFromSessions(rowSessions, now),
              ] as const;
            })
          )
        : undefined;
      const ordered = sortSidebarWorktrees({
        worktrees: projected,
        mode: displayOptions.sortBy,
        repoMap: pipelineRepoMap,
        now,
        attentionByWorktree,
        coldStart: sortColdStart,
      });
      const byPath = new Map(wts.map((worktree) => [worktree.path, worktree]));
      return ordered
        .map((row) => byPath.get(row.path))
        .filter((worktree): worktree is GitWorktreeInfo => worktree !== undefined);
    },
    [
      displayOptions.sortBy,
      sessions,
      pipelineRepoMap,
      worktreesByRepo,
      hookHistoryByWorktreePath,
      liveSessionIds,
      sortColdStart,
    ]
  );

  // Why a ref: only the settle gate may move an attention-driven order. Routing the
  // compute callback through a ref keeps live status data out of the memo's dependency
  // list, so a tick inside the settle window cannot recompute the order early (Orca reads
  // the store inside its own memo for the same reason).
  const computeSettledOrderRef = useRef<(project: HydraProject) => string[]>(() => []);
  computeSettledOrderRef.current = (project) =>
    sortWorktreesForProject(project, getWorktreesForProject(project)).map(
      (worktree) => worktree.path
    );
  const projectsKey = useMemo(
    () => projects.map((project) => project.path).join("\n"),
    [projects]
  );
  const settledSortOrderByProject = useMemo(() => {
    const orders = new Map<string, string[]>();
    if (!settledSortMode) return orders;
    for (const project of projects) {
      orders.set(project.path, computeSettledOrderRef.current(project));
    }
    return orders;
  }, [appliedSortEpoch, displayOptions.sortBy, pipelineRepoMap, projectsKey, allWorktrees.length]);

  const getFilteredAndSortedWorktrees = useCallback((proj: HydraProject): GitWorktreeInfo[] => {
    let wts = getWorktreesForProject(proj);

    // Filter by display options through the SAME predicates the filter pipeline
    // uses, projected onto the Orca row shape: `isDefaultBranchWorkspace` keeps a
    // recipe-provisioned root visible, and `isDetachedHeadWorkspace` needs the git
    // identity rather than a branch-string guess. The active workspace stays
    // visible so a filter cannot hide the row the user is looking at.
    const projectedByPath = new Map(
      wts.map((worktree) => [worktree.path, toWorktreeRow(worktree, { repoId: proj.id })])
    );
    if (displayOptions.hideDefaultBranch) {
      wts = wts.filter((w) => {
        if (w.path === activeWorktreePath) return true;
        const row = projectedByPath.get(w.path);
        return !row || !isDefaultBranchWorkspace(row);
      });
    }
    if (displayOptions.hideDetachedHead) {
      wts = wts.filter((w) => {
        if (w.path === activeWorktreePath) return true;
        const row = projectedByPath.get(w.path);
        return !row || !isDetachedHeadWorkspace(row);
      });
    }

    // Filter by text search query
    if (query) {
      wts = wts.filter((wt) => {
        if (wt.branch.toLowerCase().includes(query)) return true;
        if (wt.displayName?.toLowerCase().includes(query)) return true;
        if (wt.path.toLowerCase().includes(query)) return true;
        const wtSessions = sessions.filter(
          (s) => s.project_path === wt.path || (wt.is_main && s.project_path === proj.path)
        );
        return wtSessions.some(
          (s) => s.title.toLowerCase().includes(query) || s.agentName.toLowerCase().includes(query)
        );
      });
    }

    // Order from the epoch the settle gate last applied; a row that appeared inside the
    // window has no rank yet and lands after the known rows until the gate applies.
    const settledOrder = settledSortMode
      ? settledSortOrderByProject.get(proj.path)
      : undefined;
    if (settledOrder) {
      const rankByPath = new Map(settledOrder.map((path, index) => [path, index]));
      return [...wts].sort(
        (a, b) =>
          (rankByPath.get(a.path) ?? Number.MAX_SAFE_INTEGER) -
          (rankByPath.get(b.path) ?? Number.MAX_SAFE_INTEGER)
      );
    }
    return sortWorktreesForProject(proj, wts);
  }, [
    getWorktreesForProject,
    displayOptions,
    query,
    sessions,
    activeWorktreePath,
    sortWorktreesForProject,
    settledSortMode,
    settledSortOrderByProject,
  ]);

  // ─── Background Appearance Tint ──────────────────────────────────────────
  // Single resolved source: the shell computes `leftSidebarStyle` via
  // `resolveLeftSidebarStyleVariables` (default/match-terminal/tinted, dark or
  // light) and passes it here, so this surface never re-derives a second tint.

  // The list's own drop on the board's pin strip is multi-select: it hands over the paths
  // it dragged, and the app's pin writer takes them one by one (D08-028).
  const handlePinWorktreePaths = useCallback(
    (worktreePaths: readonly string[]) => {
      for (const worktreePath of worktreePaths) onPinWorktree(worktreePath);
    },
    [onPinWorktree]
  );

  // Resolved once per render: the menu row and its tooltip read the same reason.
  const activeProjectMenuIconReason = activeProjectMenu
    ? repoIconDisabledReason(activeProjectMenu.proj)
    : null;

  return (
    <div
      ref={sidebarRootRef}
      data-native-file-drop-target={nativeDropTarget}
      className="relative flex h-full w-full flex-col bg-worktree-sidebar text-worktree-sidebar-foreground select-none overflow-hidden"
      style={leftSidebarStyle}
      {...projectDropHandlers}
    >
      {/* Orca `useSidebarProjectDrop`: native folder drag over the sidebar. */}
      {isProjectDropActive && projectDropAffordance.visible && (
        <div
          data-sidebar-project-drop-overlay="true"
          data-sidebar-project-drop-tone={projectDropAffordance.tone}
          className={[
            "pointer-events-none absolute inset-2 z-50 flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 text-center",
            projectDropAffordance.tone === "blocked"
              ? "border-destructive/70 bg-destructive/10"
              : "border-emerald-500/70 bg-emerald-500/10"
          ].join(" ")}
        >
          {projectDropAffordance.tone === "busy" ? (
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          ) : (
            <FolderPlus className="size-6 text-emerald-400" />
          )}
          <span className="text-[12px] font-medium text-worktree-sidebar-foreground">
            {projectDropAffordance.label}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {projectDropAffordance.description}
          </span>
        </div>
      )}
      {/* 1. Top Strip Nav (Search / Worktree palette) */}
      <SidebarNav
        settings={settings ?? null}
        onUpdateSettings={onUpdateSettings}
        onOpenWorktreePalette={() => {
          window.dispatchEvent(new CustomEvent("hydra:open-jump-palette"));
        }}
      />
      <div className="h-px bg-worktree-sidebar-border mx-3 my-0.5" />

      {/* 2. Header (Projects title + Workspace options + Add Repo + New Workspace) */}
      <SidebarHeader
        sidebarBody={sidebarBody}
        setSidebarBody={handleSetSidebarBody}
        introShown={agentsIntroShown}
        onAcknowledgeIntro={handleAcknowledgeAgentsIntro}
        groupBy={displayOptions.groupBy}
        onOpenAddRepoDialog={onOpenAddRepoDialog}
        onOpenNewWorkspaceModal={onOpenNewWorkspaceModal}
        optionsButtonRef={optionsButtonRef}
        optionsMenuOpen={optionsMenuOpen}
        setOptionsMenuOpen={setOptionsMenuOpen}
        projects={projects}
        activeFilterCount={sidebarFilterChrome.activeFilterCount}
        hasActiveFilters={sidebarFilterChrome.hasActiveFilters}
        onActivityOptionsTargetChange={setAgentsOptionsTarget}
      />

      {/* 3. Main Body */}
      {sidebarBody === "agents" ? (
        <React.Suspense fallback={<div className="flex-1 min-h-0" />}>
          <SidebarAgentsList
            sessions={sessions}
            projects={projects}
            onSelectSession={onSelectSession}
            onDeleteSession={onDeleteSession}
            compactCards={compactCards}
            onSelectNextSession={onSelectNextSession}
            onSelectPrevSession={onSelectPrevSession}
            isModalOpen={isModalOpen}
            groupBy={agentsGroupBy}
            onGroupByChange={handleAgentsGroupByChange}
            readFilter={agentsReadFilter}
            onReadFilterChange={handleAgentsReadFilterChange}
            query={agentsQuery}
            onQueryChange={setAgentsQuery}
            optionsTarget={agentsOptionsTarget}
            scrollTopRef={agentsScrollTopRef}
            focusedSessionId={agentsFocusedSessionId}
            onFocusedSessionIdChange={setAgentsFocusedSessionId}
            selectedSessionIds={agentsSelectedSessionIds}
            onSelectedSessionIdsChange={setAgentsSelectedSessionIds}
          />
        </React.Suspense>
      ) : (
        <div className="flex flex-1 flex-col overflow-hidden min-h-0">
          {/* Workspaces Filter Box */}
          <div className="px-2 pt-1 pb-1">
            <div className="relative flex items-center">
              <Search
                className="pointer-events-none absolute left-2 size-3.5 text-worktree-sidebar-foreground/40"
                strokeWidth={2}
              />
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    if (filter) setFilter("");
                    else e.currentTarget.blur();
                  }
                }}
                placeholder="Filter projects and workspaces..."
                aria-label="Filter projects and workspaces"
                className="w-full rounded-md border border-worktree-sidebar-border/70 bg-worktree-sidebar-foreground/5 py-1 pl-7 pr-7 text-xs text-worktree-sidebar-foreground placeholder:text-worktree-sidebar-foreground/40 outline-none transition focus:border-worktree-sidebar-ring/60 focus:bg-worktree-sidebar-foreground/8"
              />
              {filter && (
                <button
                  type="button"
                  onClick={() => setFilter("")}
                  aria-label="Clear filter"
                  className="absolute right-1.5 inline-flex size-4 items-center justify-center rounded text-worktree-sidebar-foreground/50 hover:bg-worktree-sidebar-accent hover:text-worktree-sidebar-foreground cursor-pointer"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
          </div>

          {/* Workspaces Project List */}
          {/* The list viewport owns the scroll container (`VirtualizedWorktreeViewport`): it
              attaches `worktreeScrollRef` to the element that actually scrolls, so the drag
              geometry, the scroll anchor and the sleek-scrollbar insets all live in one place
              instead of being split between this wrapper and the list. */}
          <div className="flex-1 min-h-0">
            <WorktreeList
              projects={projects}
              displayProjects={displayProjects}
              activeProject={activeProject}
              activeWorktreePath={activeWorktreePath}
              highlightedRevealPath={highlightedRevealPath}
              sessions={sessions}
              gitWorktrees={gitWorktrees}
              worktreesByProject={worktreesByProject}
              hiddenWorktreesByProject={hiddenWorktreesByProject}
              pinnedProjects={pinnedProjects}
              unreadProjects={unreadProjects}
              pinnedWorktrees={pinnedWorktrees}
              unreadWorktrees={unreadWorktrees}
              projectGroups={projectGroups}
              projectGroupMap={projectGroupMap}
              folderWorkspaces={folderWorkspaces}
              liveWorkspacePaths={liveWorkspacePaths}
              missingFolderPaths={missingFolderPaths}
              folderPathStatusByPath={folderPathStatusByPath}
              getFreshFolderPathStatus={getFreshFolderPathStatus}
              scanFailuresByProject={scanFailuresByProject}
              prByPath={prByPath}
              onActivateFolderWorkspace={onActivateFolderWorkspace}
              onDeleteFolderWorkspace={onDeleteFolderWorkspace}
              onFolderWorkspaceContextMenu={onFolderWorkspaceContextMenu}
              collapsedProjects={collapsedProjects}
              collapsedGroups={collapsedGroups}
              filter={filter}
              displayOptions={displayOptions}
              compactCards={compactCards}
              portsByWorktree={portsByWorktree}
              getFilteredAndSortedWorktrees={getFilteredAndSortedWorktrees}
              onSelectProject={onSelectProject}
              onSelectGitWorktree={onSelectGitWorktree}
              onDeleteGitWorktree={onDeleteGitWorktree}
              onDeleteWorktreeSelection={onDeleteWorktreeSelection}
              onSelectSession={onSelectSession}
              onRenameWorktreeTitle={onRenameWorktreeTitle}
              deleteStateByWorktreeId={deleteStateByWorktreeId}
              onOpenNewWorkspaceModal={onOpenNewWorkspaceModal}
              createStateByProjectId={createStateByProjectId}
              onOpenAddRepoDialog={onOpenAddRepoDialog}
              onClearFilter={() => setFilter("")}
              onClearSidebarFilters={handleClearSidebarFilters}
              onToggleProjectCollapse={toggleProjectCollapse}
              onToggleGroupCollapse={toggleGroupCollapse}
              onProjectContextMenu={(e, proj) => {
                if (onProjectContextMenu) {
                  onProjectContextMenu(e, proj);
                } else {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setProjectMenuSubmenu(null);
                  setActiveProjectMenu({ proj, x: rect.right, y: rect.bottom + 4 });
                }
              }}
              onGroupContextMenu={(e, group) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setActiveGroupMenu({ group, x: rect.right, y: rect.bottom + 4 });
              }}
              onWorktreeContextMenu={(e, wt, proj, selectedWorktrees) => {
                const targetProject = proj || activeProject;
                if (targetProject) {
                  onWorktreeContextMenu?.(
                    e,
                    wt,
                    targetProject,
                    selectedWorktrees?.map((entry) => entry.path)
                  );
                }
              }}
              workspaceBoardOpen={workspaceBoardOpen}
              onSwitchToManualSort={handleSwitchToManualSort}
              onWorkspaceBoardDragPreviewStart={previewWorkspaceBoardFromDrag}
              onWorkspaceBoardDragPreviewCommit={solidifyWorkspaceBoardFromDrag}
              onWorkspaceBoardDragPreviewCancel={cancelWorkspaceBoardDragPreview}
              onShowAllHiddenWorktrees={async (proj) => {
                const previousExternal = proj.externalWorktreeVisibility ?? null;
                const previousImports = proj.imported_worktrees ?? [];
                const hiddenPaths = (hiddenWorktreesByProject?.[proj.path] ?? []).map(
                  (worktree) => worktree.path
                );
                try {
                  await invoke("catalog_set_worktree_visibility_sources", {
                    repoPath: proj.path,
                    customSources: proj.customWorktreeVisibilitySources ?? null,
                    sourcePreferences: proj.worktreeVisibilitySourcePreferences ?? null,
                    externalWorktreeVisibility: "show",
                    externalWorktreeVisibilityLegacy:
                      proj.externalWorktreeVisibilityLegacy ?? null,
                    agentWorktreeVisibility: proj.agentWorktreeVisibility ?? null,
                    externalWorktreeDiscoverySuppressedAt:
                      proj.externalWorktreeDiscoverySuppressedAt ?? null,
                  });
                  // The policy only counts once the listed worktrees are in the
                  // allowlist and the authoritative scan confirmed it (D10-067).
                  if (hiddenPaths.length > 0) {
                    await invoke("import_worktrees_batch", {
                      projectPath: proj.path,
                      worktreePaths: hiddenPaths,
                    });
                  }
                  // The policy write only counts once the authoritative scan confirmed
                  // it; otherwise the catch rolls the write back.
                  const refreshed = await requestProjectsRefresh();
                  if (!refreshed) {
                    throw new Error("authoritative worktree refresh failed");
                  }
                  setHiddenWorktreeError(proj.path, null);
                } catch (err) {
                  console.error(err);
                  // Roll back both halves: the allowlist import and the policy write,
                  // so the card never claims a state the scan did not confirm.
                  if (hiddenPaths.length > 0) {
                    try {
                      await invoke("restore_imported_worktrees", {
                        projectPath: proj.path,
                        worktreePaths: previousImports,
                      });
                    } catch (restoreError) {
                      console.error(restoreError);
                    }
                  }
                  try {
                    await invoke("catalog_set_worktree_visibility_sources", {
                      repoPath: proj.path,
                      customSources: proj.customWorktreeVisibilitySources ?? null,
                      sourcePreferences: proj.worktreeVisibilitySourcePreferences ?? null,
                      externalWorktreeVisibility: previousExternal,
                      externalWorktreeVisibilityLegacy:
                        proj.externalWorktreeVisibilityLegacy ?? null,
                      agentWorktreeVisibility: proj.agentWorktreeVisibility ?? null,
                      externalWorktreeDiscoverySuppressedAt:
                        proj.externalWorktreeDiscoverySuppressedAt ?? null,
                    });
                  } catch (rollbackError) {
                    console.error(rollbackError);
                  }
                  setHiddenWorktreeError(
                    proj.path,
                    "Could not show discovered worktrees. Try again."
                  );
                }
              }}
              onShowHiddenWorktree={async (proj, worktreePath) => {
                try {
                  await invoke("import_worktree", {
                    projectPath: proj.path,
                    worktreePath,
                  });
                  await stampVisibilityPromptPhase(proj);
                  setHiddenWorktreeError(proj.path, null);
                  window.dispatchEvent(new CustomEvent("hydra:refresh-projects"));
                } catch (err) {
                  console.error(err);
                  setHiddenWorktreeError(
                    proj.path,
                    "Could not show discovered worktrees. Try again."
                  );
                }
              }}
              onKeepHiddenWorktrees={async (proj, worktreePaths) => {
                try {
                  await invoke("catalog_set_worktree_visibility", {
                    repoPath: proj.path,
                    baselinePaths: mergeExternalWorktreeInboxPaths(
                      proj.externalWorktreeInboxBaselinePaths,
                      worktreePaths
                    ),
                    promptDismissedAt:
                      typeof proj.externalWorktreeVisibilityPromptDismissedAt === "number"
                        ? proj.externalWorktreeVisibilityPromptDismissedAt
                        : Date.now(),
                  });
                  visibilityPromptStampedReposRef.current.add(proj.path);
                  setHiddenWorktreeError(proj.path, null);
                  window.dispatchEvent(new CustomEvent("hydra:refresh-projects"));
                } catch (err) {
                  console.error(err);
                  setHiddenWorktreeError(
                    proj.path,
                    "Could not keep discovered worktrees hidden. Try again."
                  );
                }
              }}
              onSuppressHiddenWorktrees={(proj) => setSuppressInboxTarget(proj)}
              hiddenWorktreeErrorsByProject={hiddenWorktreeErrorByProject}
              onReviewHiddenWorktrees={(proj) => {
                // Orca guard: non-git projects have no discovered worktrees to review.
                if (!proj.is_git) return;
                const repo = useAppStore
                  .getState()
                  .repos.find((candidate) => candidate.path === proj.path);
                setVisibilityDialog({
                  open: true,
                  project: proj,
                  hiddenWorktrees: hiddenWorktreesByProject?.[proj.path] ?? [],
                  hostId: repo ? getRepoExecutionHostId(repo) : null,
                });
              }}
              draggedWorktreePath={draggedWorktreePath}
              worktreeDropTarget={worktreeDropTarget}
              scrollRef={worktreeScrollRef}
              onReorderWorktreesInGroup={commitReorderedWorktrees}
              onReorderHostSections={setWorkspaceHostOrder}
              onUpdateProjectGroup={(groupId, updates) => {
                // App owns group state; the drop reports the new tab order on the
                // host bucket that owns the group row (D03a-021).
                const applied = dispatchProjectGroupChange("hydra:update-project-group", {
                  id: groupId,
                  tabOrder: updates.tabOrder,
                  hostId: resolveGroupOwnerHostId(groupId),
                });
                if (!applied) reportGroupOrderFailure();
              }}
              lineageByPath={lineageByPath}
              worktreeMetadataByPath={worktreeMetadataByPath}
              pendingWorktreeCreations={pendingWorktreeCreations}
              onEditWorktreeMetadata={onEditWorktreeMetadata}
              onAssignWorktreeParent={onAssignWorktreeParent}
              onUnnestWorktrees={onUnnestWorktrees}
              onAssignWorktreeStatus={onAssignWorktreeStatus}
              onPinWorktreePaths={handlePinWorktreePaths}
              draggedProjectId={draggedProjectId}
              projectDropTarget={projectDropTarget}
              groupDropTargetId={groupDropTargetId}
              onWorktreeDragStart={handleWorktreeDragStart}
              onWorktreeDragOver={handleWorktreeDragOver}
              onWorktreeDrop={handleWorktreeDrop}
              onWorktreeDragEnd={handleWorktreeDragEnd}
              onProjectDragStart={handleProjectDragStart}
              onProjectDragOver={handleProjectDragOver}
              onProjectDrop={handleProjectDrop}
              onProjectDragEnd={handleProjectDragEnd}
              onReorderRepoHeaders={(orderedRepoIds) => {
                if (!onReorderProjects) return;
                // Multi-host: one merged header controls every host-qualified occurrence of
                // a project, so ordering by logical id moves the whole block. A stable sort
                // keeps same-id duplicates together and leaves unknown ids at the end.
                const rankById = new Map(orderedRepoIds.map((id, index) => [id, index]));
                const rankOf = (project: HydraProject) =>
                  rankById.get(project.id) ?? rankById.get(project.path) ?? orderedRepoIds.length;
                const next = [...projects].sort((left, right) => rankOf(left) - rankOf(right));
                onReorderProjects(next);
              }}
              onGroupDragOver={(e, groupId) => {
                if (draggedProjectId) {
                  e.preventDefault();
                  setGroupDropTargetId(groupId);
                }
              }}
              onGroupDragLeave={() => {
                setGroupDropTargetId(null);
              }}
              onGroupDrop={(e, groupId) => {
                if (draggedProjectId) {
                  e.preventDefault();
                  setGroupDropTargetId(null);
                  const draggedProject = projects.find((project) => project.id === draggedProjectId);
                  const hostId = draggedProject ? resolveProjectHostId(draggedProject) : undefined;
                  const moved = dispatchProjectGroupChange("hydra:move-project-to-group", {
                    projectId: draggedProjectId,
                    groupId,
                    ...(hostId ? { hostId } : {}),
                  });
                  if (!moved) reportGroupMoveFailure();
                  setDraggedProjectId(null);
                }
              }}
            />
          </div>
        </div>
      )}

      {/* 4. Display Options Menu */}
      <WorkspaceOptionsMenu
        isOpen={optionsMenuOpen}
        triggerRef={optionsButtonRef}
        options={displayOptions}
        projects={projects}
        onClose={() => setOptionsMenuOpen(false)}
        onOptionsChange={handleDisplayOptionsChange}
        onAddProject={onOpenAddRepoDialog}
        // Orca `clearFilters`: the shell's writer resets every narrowing filter
        // (and the host scope) and persists it, so the menu never forks the logic.
        onClearFilters={handleClearSidebarFilters}
        onUpdateSettings={onUpdateSettings}
      />

      <AgentSendTargetPicker />

      {/* Setup script suggestion (Orca SetupScriptPromptCard): floats above the footer
          without reserving a static row in the sidebar body. */}
      <div className="relative shrink-0">
        <SetupScriptPromptCard />
      </div>

      {/* 5. Footer */}
      <SidebarFooter
        appVersion={appVersion}
        gitStatus={gitStatus}
        onOpenSettings={onOpenSettings}
        onOpenSettingsSection={onOpenSettingsSection ?? (() => onOpenSettings())}
        onRevealCurrent={sidebarBody === "workspaces" ? () => handleRevealCurrent() : undefined}
        workspaceBoardOpen={workspaceBoardOpen}
        workspaceBoardDragPreviewOpen={workspaceBoardDragPreviewOpen}
        settings={settings ?? null}
        onToggleWorkspaceBoard={toggleWorkspaceBoard}
      />

      {/* 5b. Workspace board — companion panel anchored to this sidebar */}
      <WorkspaceBoardDrawer
        open={workspaceBoardOpen}
        renderedOpen={workspaceBoardRenderedOpen}
        dragPreview={workspaceBoardDragPreviewOpen}
        preserveOpenForMenu={workspaceBoardMenuOpen}
        onMenuOpenChange={setWorkspaceBoardMenuOpen}
        filterProjects={projects}
        onDisplayOptionsChange={handleDisplayOptionsChange}
        onAddProject={onOpenAddRepoDialog}
        onClearFilters={handleClearSidebarFilters}
        onUpdateSettings={onUpdateSettings}
        onSwitchToManualSort={handleSwitchToManualSort}
        onApplyManualOrder={handleApplyBoardManualOrder}
        sidebarRef={sidebarRootRef}
        displayProjects={displayProjects}
        getProjectWorktrees={getFilteredAndSortedWorktrees}
        sessions={sessions}
        displayOptions={displayOptions}
        activeWorktreePath={activeWorktreePath}
        liveWorkspacePaths={liveWorkspacePaths}
        pinnedWorktreePaths={pinnedWorktrees}
        unreadWorktreePaths={unreadWorktrees}
        portsByWorktree={portsByWorktree}
        prByPath={prByPath}
        compactCards={compactCards}
        allWorktrees={allWorktrees}
        onAssignWorktreeStatus={onAssignWorktreeStatus}
        onPinWorktree={onPinWorktree}
        onCreateWorktree={onCreateWorktree}
        onOpenChange={handleWorkspaceBoardOpenChange}
        onSelectWorktree={onSelectGitWorktree}
        onSelectSession={onSelectSession}
        onWorktreeContextMenu={onWorktreeContextMenu}
      />

      {/* 6. Context Menus */}
      {activeProjectMenu && (
        <>
          <div
            className="fixed inset-0 z-[99998]"
            onClick={() => {
              setActiveProjectMenu(null);
              setProjectMenuSubmenu(null);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              setActiveProjectMenu(null);
              setProjectMenuSubmenu(null);
            }}
          />
          <div
            style={{
              position: "fixed",
              top: Math.min(activeProjectMenu.y, window.innerHeight - 300),
              left: Math.min(activeProjectMenu.x, window.innerWidth - 420),
              zIndex: 99999,
            }}
            className="relative w-52 rounded-xl border border-worktree-sidebar-border bg-worktree-sidebar p-1.5 shadow-2xl text-xs backdrop-blur-md"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={stopRepoHeaderMenuEvent}
            onMouseDown={stopRepoHeaderMenuEvent}
            onPointerUp={stopRepoHeaderMenuEvent}
            onMouseUp={stopRepoHeaderMenuEvent}
            onKeyDown={stopRepoHeaderMenuEvent}
          >
            <button
              type="button"
              onClick={() => {
                const proj = activeProjectMenu.proj;
                setActiveProjectMenu(null);
                setProjectMenuSubmenu(null);
                // Orca `handleOpenRepoSettings`: a repo-scoped settings surface, not the
                // global modal with no repo context.
                setRepoSettingsTarget(proj);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-worktree-sidebar-accent text-worktree-sidebar-foreground text-left transition cursor-pointer"
            >
              <Settings className="size-3.5 text-worktree-sidebar-foreground/60" />
              Project Settings
            </button>

            <button
              type="button"
              disabled={Boolean(activeProjectMenuIconReason)}
              aria-disabled={activeProjectMenuIconReason ? true : undefined}
              title={activeProjectMenuIconReason ?? undefined}
              onClick={() => {
                if (activeProjectMenuIconReason) return;
                const { proj, x, y } = activeProjectMenu;
                setActiveProjectMenu(null);
                setProjectMenuSubmenu(null);
                setProjectIconPicker({ project: proj, x, y });
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-worktree-sidebar-accent text-worktree-sidebar-foreground text-left transition cursor-pointer disabled:pointer-events-none disabled:opacity-40"
            >
              <Shapes className="size-3.5 text-worktree-sidebar-foreground/60" />
              Change Project Icon
            </button>

            {activeProjectMenu.proj.is_git && (
              <button
                type="button"
                onClick={() => {
                  const proj = activeProjectMenu.proj;
                  setActiveProjectMenu(null);
                  setProjectMenuSubmenu(null);
                  setVisibilityDialog({
                    open: true,
                    project: proj,
                    hiddenWorktrees: hiddenWorktreesByProject?.[proj.path] ?? [],
                    hostId: resolveProjectHostId(proj) ?? null,
                  });
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-worktree-sidebar-accent text-worktree-sidebar-foreground text-left transition cursor-pointer"
              >
                <Eye className="size-3.5 text-worktree-sidebar-foreground/60" />
                {effectiveExternalWorktreeVisibility(
                  activeProjectMenu.proj,
                  settings?.worktree_visibility_defaults
                ) === "show"
                  ? "Hide non-Hydra worktrees"
                  : "Show hidden worktrees"}
              </button>
            )}

            <div className="h-px bg-worktree-sidebar-border my-1" />

            <button
              type="button"
              onClick={() => {
                const proj = activeProjectMenu.proj;
                setActiveProjectMenu(null);
                const cur = (proj.worktree_base_path ?? "") as string;
                setPromptDialog({
                  open: true,
                  title: "Configured Worktree Base Path",
                  description:
                    "Set a dedicated directory where new worktrees for this project will be created by default.",
                  initialValue: cur,
                  placeholder: "/path/to/worktrees",
                  confirmLabel: "Save Base Path",
                  onSubmit: async (val) => {
                    const trimmed = val.trim();
                    try {
                      await invoke("set_project_worktree_base", {
                        path: proj.path,
                        basePath: trimmed ? trimmed : null,
                      });
                      window.dispatchEvent(new CustomEvent("hydra:refresh-projects"));
                    } catch (e) {
                      console.error(e);
                    }
                  },
                });
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-worktree-sidebar-accent text-worktree-sidebar-foreground text-left transition cursor-pointer"
            >
              <FolderInput className="size-3.5 text-worktree-sidebar-foreground/60" />
              Set Base Worktrees Path...
            </button>

            <button
              onClick={() => {
                const proj = activeProjectMenu.proj;
                setActiveProjectMenu(null);
                navigator.clipboard.writeText(proj.path);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-worktree-sidebar-accent text-worktree-sidebar-foreground text-left transition cursor-pointer"
            >
              <Copy className="size-3.5 text-worktree-sidebar-foreground/60" />
              Copy Project Path
            </button>

            <button
              type="button"
              onClick={() => {
                const proj = activeProjectMenu.proj;
                setActiveProjectMenu(null);
                onOpenNewWorkspaceModal(proj);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-worktree-sidebar-accent text-worktree-sidebar-foreground text-left transition cursor-pointer"
            >
              <Plus className="size-3.5 text-worktree-sidebar-foreground/60" />
              New Workspace...
            </button>

            <div className="h-px bg-worktree-sidebar-border my-1" />

            <button
              type="button"
              onClick={() => {
                const proj = activeProjectMenu.proj;
                const hostId = resolveProjectHostId(proj);
                setActiveProjectMenu(null);
                setProjectMenuSubmenu(null);
                setGroupNameDialog({
                  open: true,
                  title: "New Project Group",
                  description: "Create a group and move this project into it.",
                  initialName: `${proj.displayName || proj.name} group`,
                  confirmLabel: "Create",
                  hostId,
                  onSubmit: (name) => {
                    const created = dispatchProjectGroupChange(
                      "hydra:create-project-group",
                      { name, projectId: proj.id, hostId }
                    );
                    if (!created) reportGroupCreateFailure();
                  },
                });
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-worktree-sidebar-accent text-worktree-sidebar-foreground text-left transition cursor-pointer"
            >
              <FolderTree className="size-3.5 text-indigo-400" />
              New group from project
            </button>

            {projectGroups.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={projectMenuSubmenu === "move-to-group"}
                  onMouseEnter={() => setProjectMenuSubmenu("move-to-group")}
                  onFocus={() => setProjectMenuSubmenu("move-to-group")}
                  onClick={() =>
                    setProjectMenuSubmenu((current) =>
                      current === "move-to-group" ? null : "move-to-group"
                    )
                  }
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-worktree-sidebar-accent text-worktree-sidebar-foreground text-left transition cursor-pointer"
                >
                  <FolderInput className="size-3.5 text-worktree-sidebar-foreground/60" />
                  Move to group
                  <ChevronRight className="ml-auto size-3.5 text-worktree-sidebar-foreground/40" />
                </button>

                {projectMenuSubmenu === "move-to-group" && (
                  <div
                    role="menu"
                    aria-label="Move to group"
                    className="absolute left-full top-0 ml-1 w-44 rounded-xl border border-worktree-sidebar-border bg-worktree-sidebar p-1.5 shadow-2xl backdrop-blur-md"
                  >
                    {projectGroups.map((group) => {
                      const current =
                        projectGroupMap?.[activeProjectMenu.proj.id] === group.id;
                      return (
                        <button
                          key={group.id}
                          type="button"
                          role="menuitem"
                          disabled={current}
                          aria-disabled={current}
                          onClick={() => {
                            if (current) return;
                            const proj = activeProjectMenu.proj;
                            setActiveProjectMenu(null);
                            setProjectMenuSubmenu(null);
                            const moved = dispatchProjectGroupChange(
                              "hydra:move-project-to-group",
                              {
                                projectId: proj.id,
                                groupId: group.id,
                                hostId: resolveProjectHostId(proj),
                              }
                            );
                            if (!moved) reportGroupMoveFailure();
                          }}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left transition cursor-pointer text-worktree-sidebar-foreground/80 hover:bg-worktree-sidebar-accent disabled:pointer-events-none disabled:opacity-40"
                        >
                          <span className="truncate">{group.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {projectGroupMap?.[activeProjectMenu.proj.id] && (
              <button
                type="button"
                onClick={() => {
                  const proj = activeProjectMenu.proj;
                  setActiveProjectMenu(null);
                  setProjectMenuSubmenu(null);
                  const removed = dispatchProjectGroupChange(
                    "hydra:remove-project-from-group",
                    {
                      projectId: proj.id,
                      hostId: resolveProjectHostId(proj),
                    }
                  );
                  if (!removed) reportGroupMoveFailure();
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-worktree-sidebar-accent text-worktree-sidebar-foreground/70 text-left transition cursor-pointer"
              >
                Remove from group
              </button>
            )}

            <div role="separator" className="h-px bg-worktree-sidebar-border my-1" />

            <button
              type="button"
              onClick={() => {
                const proj = activeProjectMenu.proj;
                setActiveProjectMenu(null);
                setProjectMenuSubmenu(null);
                setRemoveProjectTarget(proj);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-red-500/10 text-red-400 text-left transition cursor-pointer"
            >
              <Trash2 className="size-3.5 text-red-400" />
              Remove Project
            </button>
          </div>
        </>
      )}

      {projectIconPicker && (
        <RepoIconPicker
          projectName={
            projectIconPicker.project.displayName || projectIconPicker.project.name
          }
          currentIcon={projectIconPicker.project.repo_icon}
          x={projectIconPicker.x}
          y={projectIconPicker.y}
          onPick={(repoIcon) => {
            const project = projectIconPicker.project;
            setProjectIconPicker(null);
            void commitProjectIcon(project, repoIcon);
          }}
          onClear={() => {
            const project = projectIconPicker.project;
            setProjectIconPicker(null);
            void commitProjectIcon(project, null);
          }}
          onClose={() => setProjectIconPicker(null)}
        />
      )}

      {activeGroupMenu && (
        <>
          <div
            className="fixed inset-0 z-[99998]"
            onClick={() => setActiveGroupMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setActiveGroupMenu(null);
            }}
          />
          <div
            style={{
              position: "fixed",
              top: Math.min(activeGroupMenu.y, window.innerHeight - 200),
              left: Math.min(activeGroupMenu.x, window.innerWidth - 200),
              zIndex: 99999,
            }}
            className="w-48 rounded-xl border border-worktree-sidebar-border bg-worktree-sidebar p-1.5 shadow-2xl text-xs backdrop-blur-md"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={stopRepoHeaderMenuEvent}
            onMouseDown={stopRepoHeaderMenuEvent}
            onPointerUp={stopRepoHeaderMenuEvent}
            onMouseUp={stopRepoHeaderMenuEvent}
            onKeyDown={stopRepoHeaderMenuEvent}
          >
            <button
              type="button"
              onClick={() => {
                const group = activeGroupMenu.group;
                const hostId = resolveGroupOwnerHostId(group.id);
                setActiveGroupMenu(null);
                setGroupNameDialog({
                  open: true,
                  title: "Rename Project Group",
                  description: "Update the group name shown in the sidebar.",
                  initialName: group.name,
                  confirmLabel: "Rename",
                  hostId,
                  onSubmit: (name) => {
                    const renamed = dispatchProjectGroupChange(
                      "hydra:rename-project-group",
                      { id: group.id, name, hostId }
                    );
                    if (!renamed) reportGroupRenameFailure();
                  },
                });
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-worktree-sidebar-accent text-worktree-sidebar-foreground text-left transition cursor-pointer"
            >
              Rename Group...
            </button>

            <button
              type="button"
              onClick={() => {
                const group = activeGroupMenu.group;
                setActiveGroupMenu(null);
                setGroupDeleteDialog({
                  open: true,
                  group,
                  hostId: resolveGroupOwnerHostId(group.id),
                  removeContainedProjects: false,
                });
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-red-500/10 text-red-400 text-left transition cursor-pointer"
            >
              <Trash2 className="size-3.5 text-red-400" />
              Delete Group...
            </button>
          </div>
        </>
      )}

      {/* 7. Dialogs */}
      {/* Orca renders these modals as siblings of the sidebar, outside its DOM subtree;
          the portal keeps the scroller from clipping them and keeps their surfaces out of
          the sidebar's own theme. Each one is code-split (Orca `lazyWithRetry`). */}
      <SidebarDialogPortal>
        <React.Suspense fallback={null}>
      <NonGitFolderModalHost />
      <PreservedBranchBatchReviewModalHost />
      <OrcaYamlTrustDialog />
      <ProjectGroupNameDialog
        open={groupNameDialog.open}
        title={groupNameDialog.title}
        description={groupNameDialog.description}
        initialName={groupNameDialog.initialName}
        confirmLabel={groupNameDialog.confirmLabel}
        onOpenChange={(open) => setGroupNameDialog((prev) => ({ ...prev, open }))}
        onSubmit={groupNameDialog.onSubmit}
      />

      <ProjectGroupDeleteDialog
        open={groupDeleteDialog.open}
        groupName={groupDeleteDialog.group?.name ?? ""}
        projectCount={groupDeleteMembers.length}
        projectNames={groupDeleteMembers.map((p) => p.displayName || p.name)}
        removeContainedProjects={groupDeleteDialog.removeContainedProjects}
        onRemoveContainedProjectsChange={(removeContainedProjects) =>
          setGroupDeleteDialog((prev) => ({ ...prev, removeContainedProjects }))
        }
        onOpenChange={(open) =>
          setGroupDeleteDialog((prev) => ({
            ...prev,
            open,
            ...(open ? {} : { removeContainedProjects: false }),
          }))
        }
        onConfirm={() => {
          const group = groupDeleteDialog.group;
          if (!group) return;
          const deleted = dispatchProjectGroupChange("hydra:delete-project-group", {
            id: group.id,
            groupName: group.name,
            // Per-project identity, not just paths: App reports each removal that
            // failed instead of collapsing them into one boolean.
            removeProjects: groupDeleteDialog.removeContainedProjects
              ? groupDeleteMembers.map((project) => ({ id: project.id, path: project.path }))
              : [],
            hostId: groupDeleteDialog.hostId,
          });
          if (!deleted) reportGroupDeleteFailure();
        }}
      />

      <WorktreeVisibilityDialog
        open={visibilityDialog.open}
        project={visibilityDialog.project}
        hiddenWorktrees={visibilityDialog.hiddenWorktrees}
        hostId={visibilityDialog.hostId}
        visibilityDefaults={settings?.worktree_visibility_defaults}
        onOpenChange={(open) => setVisibilityDialog((prev) => ({ ...prev, open }))}
        onImported={() => {
          window.dispatchEvent(new CustomEvent("hydra:refresh-projects"));
        }}
        onOpenGlobalSettings={() => onOpenGlobalSettings?.()}
      />

      <RemoveFolderDialog
        open={removeProjectTarget != null}
        projectName={removeProjectTarget?.name ?? ""}
        host={removeProjectHost}
        onOpenChange={(open) => {
          if (!open) setRemoveProjectTarget(null);
        }}
        onConfirm={() => {
          const target = removeProjectTarget;
          setRemoveProjectTarget(null);
          if (target) onRemoveProject(target);
        }}
      />

      <RevealHiddenWorkspaceDialog
        open={revealConfirmation != null}
        onCancel={() => {
          const pending = revealConfirmation;
          setRevealConfirmation(null);
          // A declined reveal is still a settled request; leaving it queued would
          // re-open the dialog on the next sidebar render.
          pending?.options?.onRevealSettled?.();
        }}
        onConfirm={() => {
          const pending = revealConfirmation;
          setRevealConfirmation(null);
          if (pending) revealWorkspaceNow(pending.targetPath, pending.options);
        }}
      />

      <SuppressExternalWorktreeInboxDialog
        open={suppressInboxTarget != null}
        repoDisplayName={suppressInboxTarget?.name ?? ""}
        pending={suppressInboxPending}
        onOpenChange={(open) => {
          if (!open && !suppressInboxPending) setSuppressInboxTarget(null);
        }}
        onOpenRecovery={() => {
          const target = suppressInboxTarget;
          setSuppressInboxTarget(null);
          // The project's own visibility dialog is Hydra's "Non-Orca worktrees
          // settings" surface: it owns every source toggle and the recovery list.
          if (target) {
            setVisibilityDialog({
              open: true,
              project: target,
              hiddenWorktrees: hiddenWorktreesByProject?.[target.path] ?? [],
            });
          }
        }}
        onConfirm={async () => {
          const target = suppressInboxTarget;
          if (!target) return;
          setSuppressInboxPending(true);
          const hiddenPaths = (hiddenWorktreesByProject?.[target.path] ?? []).map(
            (worktree) => worktree.path
          );
          const suppressedAt = Date.now();
          try {
            // Orca writes the baseline and the suppression stamp together, so the
            // recovery list and the dismissed prompt can never disagree.
            await invoke("catalog_set_worktree_visibility_sources", {
              repoPath: target.path,
              customSources: target.customWorktreeVisibilitySources ?? null,
              sourcePreferences: target.worktreeVisibilitySourcePreferences ?? null,
              externalWorktreeVisibility: target.externalWorktreeVisibility ?? null,
              externalWorktreeVisibilityLegacy:
                target.externalWorktreeVisibilityLegacy ?? null,
              agentWorktreeVisibility: target.agentWorktreeVisibility ?? null,
              externalWorktreeDiscoverySuppressedAt: suppressedAt,
              inboxBaselinePaths: mergeExternalWorktreeInboxPaths(
                target.externalWorktreeInboxBaselinePaths,
                hiddenPaths
              ),
              inboxPromptDismissedAt: suppressedAt,
            });
            await invoke("suppress_worktree_inbox", { projectPath: target.path });
            const refreshed = await requestProjectsRefresh();
            if (!refreshed) {
              throw new Error("authoritative worktree refresh failed");
            }
            setHiddenWorktreeError(target.path, null);
            setSuppressInboxTarget(null);
          } catch (err) {
            console.error(err);
            setHiddenWorktreeError(
              target.path,
              "Could not hide external worktrees permanently. Try again."
            );
          } finally {
            setSuppressInboxPending(false);
          }
        }}
      />

      <RepoSettingsDialog
        open={repoSettingsTarget != null}
        project={repoSettingsTarget}
        onOpenChange={(open) => {
          if (!open) setRepoSettingsTarget(null);
        }}
        onOpenWorktreeVisibility={(proj) => {
          setVisibilityDialog({
            open: true,
            project: proj,
            hiddenWorktrees: hiddenWorktreesByProject?.[proj.path] ?? [],
            hostId: resolveProjectHostId(proj) ?? null,
          });
        }}
        onRemoveProject={(proj) => setRemoveProjectTarget(proj)}
      />

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
        </React.Suspense>
      </SidebarDialogPortal>
    </div>
  );
}
