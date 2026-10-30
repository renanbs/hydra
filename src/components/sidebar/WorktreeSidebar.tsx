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
} from "lucide-react";
import { toast } from "sonner";
import { SidebarNav } from "./SidebarNav";
import { SidebarHeader } from "./SidebarHeader";
import { SidebarFooter } from "./SidebarFooter";
import { WorktreeList } from "./WorktreeList";
import type { RepoHeaderCreateState } from "./SectionHeader";
import { stopRepoHeaderMenuEvent } from "./ProjectHeaderActions";
import { translate } from "../../i18n/i18n";
import { effectiveExternalWorktreeVisibility } from "../../lib/worktree-visibility-sources";
import { lazyWithRetry } from "../../lib/lazy-with-retry";

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
  getPinnedWorktreeRevealCollapsedGroupKeys,
} from "./sidebar-reveal-lookups";
import { ProjectGroupNameDialog } from "./ProjectGroupNameDialog";
import { useSidebarProjectDrop } from "./use-sidebar-project-drop";
import { relaxFiltersForReveal } from "./reveal-filter-relaxation";
import { resolveRevealWorktreePath } from "./reveal-target-resolution";
import { requestProjectsRefresh } from "../../lib/refresh-projects-awaitable";
import { ProjectGroupDeleteDialog } from "./ProjectGroupDeleteDialog";
import { WorktreeVisibilityDialog } from "./WorktreeVisibilityDialog";
import { PromptDialog, type PromptDialogProps } from "../PromptDialog";
import type {
  HydraProject,
  GitWorktreeInfo,
  WorktreeSidebarProps,
  AgentsGroupBy,
  AgentsStatusFilter,
  WorkspacePort,
  SidebarBody,
  SidebarShellPrefs,
} from "./types";
import { toWorktreeRow } from "../../shared/worktree/worktree-row";
import { toPipelineRepo } from "./worktree-list/grouping/to-pipeline-repo";
import { applyPersistedWorktreeOrder, sortSidebarWorktrees } from "./sidebar-worktree-sort";
import { resolveWorktreeAttentionFromSessions } from "./sidebar-session-attention";
import { useAppStore } from "../../store";
import { getRepoExecutionHostId } from "../../shared/execution-host";
import { useWorktreeRevealBodyRedirect } from "./use-worktree-reveal-body-redirect";
import { revealElementInScrollContainer } from "./worktree-sidebar-reveal";
import { isRuntimeOwnedSshTargetId } from "../../shared/execution-host";
import { RemoveFolderDialog } from "./RemoveFolderDialog";
import SuppressExternalWorktreeInboxDialog from "./SuppressExternalWorktreeInboxDialog";
import { RevealHiddenWorkspaceDialog } from "./RevealHiddenWorkspaceDialog";
import { AgentSendTargetPicker } from "./AgentSendTargetPicker";
import { ALL_EXECUTION_HOSTS_SCOPE } from "../../shared/execution-host";

export * from "./types";

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
  projectGroupMap = {},
  projectGroups = [],
  folderWorkspaces = [],
  liveWorkspacePaths,
  missingFolderPaths,
  folderPathStatusByPath,
  scanFailuresByProject = {},
  prByPath,
  onActivateFolderWorkspace,
  onDeleteFolderWorkspace,
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
  const [agentsStatusFilter, setAgentsStatusFilter] = useState<AgentsStatusFilter>(
    initialAgentsReadFilter ?? "all"
  );
  const [agentsGroupBy, setAgentsGroupBy] = useState<AgentsGroupBy>(
    initialAgentsGroupBy ?? "state"
  );
  // D01-009: the one-time Agents-view intro is gated by a persisted preference
  // (the same `ui.sidebar` blob the other shell prefs use), not raw localStorage.
  const [agentsIntroShown, setAgentsIntroShown] = useState<boolean>(
    initialAgentsIntroShown ?? false
  );

  const [filter, setFilter] = useState("");
  const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);
  const optionsButtonRef = useRef<HTMLButtonElement | null>(null);

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
  const [removeProjectTarget, setRemoveProjectTarget] = useState<HydraProject | null>(null);
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

  // ─── Workspace board (Orca D08 shell) ────────────────────────────────────
  // The board is a companion panel of this sidebar: it is anchored to the
  // sidebar's own box and reads the sidebar's visible workspaces, so it lives
  // here rather than in the shell.
  const sidebarRootRef = useRef<HTMLDivElement | null>(null);
  const handleDroppedProjectAdded = useCallback(() => {
    window.dispatchEvent(new CustomEvent("hydra:refresh-projects"));
  }, []);
  const pendingRevealWorktree = useAppStore((state) => state.pendingRevealWorktree);
  const pendingRevealSidebarRow = useAppStore((state) => state.pendingRevealSidebarRow);
  const agentSendTargetMode = useAppStore((state) => state.agentSendPopoverTargetMode);
  const clearPendingRevealSidebarRow = useAppStore(
    (state) => state.clearPendingRevealSidebarRow
  );
  const clearPendingRevealWorktreeId = useAppStore((state) => state.clearPendingRevealWorktreeId);
  const { isProjectDropActive } = useSidebarProjectDrop({
    enabled: true,
    sidebarRef: sidebarRootRef,
    onProjectAdded: handleDroppedProjectAdded,
  });
  const {
    workspaceBoardOpen,
    workspaceBoardRenderedOpen,
    toggleWorkspaceBoard,
    handleWorkspaceBoardOpenChange,
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
      const detail = (e as CustomEvent<{ projectId?: string; defaultName?: string }>).detail;
      setGroupNameDialog({
        open: true,
        title: "New Project Group",
        description: "Create a group to organize projects in your sidebar.",
        confirmLabel: "Create",
        initialName: detail?.defaultName ?? "",
        onSubmit: (name) => {
          window.dispatchEvent(
            new CustomEvent("hydra:create-project-group", {
              detail: { name, projectId: detail?.projectId },
            })
          );
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
      agentsReadFilter: patch?.agentsReadFilter ?? agentsStatusFilter,
      agentsGroupBy: patch?.agentsGroupBy ?? agentsGroupBy,
      agentsSidebarIntroShown: patch?.agentsSidebarIntroShown ?? agentsIntroShown,
    });
  }, [
    onSidebarPrefsChange,
    sidebarBody,
    collapsedProjects,
    collapsedGroups,
    displayOptions,
    agentsStatusFilter,
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
  const storeVisibleWorkspaceHostIds = useAppStore((s) => s.visibleWorkspaceHostIds);
  const storeWorkspaceHostScope = useAppStore((s) => s.workspaceHostScope);
  const setVisibleWorkspaceHostIds = useAppStore((s) => s.setVisibleWorkspaceHostIds);
  const setWorkspaceHostOrder = useAppStore((s) => s.setWorkspaceHostOrder);
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

  const handleAgentsStatusFilterChange = useCallback((statusFilterValue: AgentsStatusFilter) => {
    setAgentsStatusFilter(statusFilterValue);
    notifyPrefs({ agentsReadFilter: statusFilterValue });
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
    (targetPath?: string | null, options?: { highlight?: boolean; beginRename?: boolean }) => {
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

    for (const proj of projects) {
      const wts = getWorktreesForProject(proj);
      if (proj.path === target || wts.some((w) => w.path === target)) {
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
        // Orca `getPinnedWorktreeRevealCollapsedGroupKeys` / folder ancestry: a
        // collapsed Pinned section or a parent project group would keep the row
        // unmounted forever.
        const folderWorkspace = folderWorkspaces.find(
          (workspace) => workspace.folderPath === target
        );
        const revealKeys = [
          ...(pinnedWorktrees?.has(target)
            ? getPinnedWorktreeRevealCollapsedGroupKeys()
            : []),
          ...(folderWorkspace
            ? getFolderWorkspaceRevealGroupKeys(folderWorkspace, projectGroups)
            : []),
        ].filter((key) => collapsedGroups.has(key));
        if (revealKeys.length > 0) {
          setCollapsedGroups((prev) => {
            const next = new Set(prev);
            for (const key of revealKeys) next.delete(key);
            return next;
          });
        }
        break;
      }
    }

    if (options?.highlight !== false) flashRevealedWorktree(target);
    if (options?.beginRename) {
      window.dispatchEvent(
        new CustomEvent("hydra:begin-rename-worktree", { detail: { path: target } })
      );
    }

    // The row may mount a frame or two after the reveal (collapse expansion, the
    // virtualizer window). Poll briefly instead of giving up on the first paint.
    let revealAttempts = 0;
    const revealMountedRow = (): void => {
      const el = document.querySelector(`[data-worktree-path="${CSS.escape(target)}"]`);
      if (!el) {
        revealAttempts += 1;
        if (revealAttempts < 8) requestAnimationFrame(revealMountedRow);
        return;
      }
      const container = worktreeScrollRef.current;
      // Why not `scrollIntoView({ block: "nearest" })`: a card above the viewport would
      // land flush under the sticky group header. The reveal math reserves that inset
      // (and honors reduced-motion); the fallback only runs when the row is outside the
      // list's own scroll container.
      if (!container || !revealElementInScrollContainer(container, el, "smooth")) {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
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
  ]);

  // Orca `useSidebarRevealRequests`: when filters hide the target, ask before
  // adjusting them; otherwise reveal straight away.
  const [revealConfirmation, setRevealConfirmation] = useState<{
    targetPath: string;
    options?: { highlight?: boolean; beginRename?: boolean };
  } | null>(null);

  const handleRevealCurrent = useCallback(
    (targetPath?: string | null, options?: { highlight?: boolean; beginRename?: boolean }) => {
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
        setRevealConfirmation({ targetPath: target, options });
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

  // Orca `useSidebarRevealRequests`: consume the store's queued worktree reveal
  // (the list may be unmounted or filtered when the request arrives).
  useEffect(() => {
    if (!pendingRevealWorktree) return;
    const targetPath = resolveRevealWorktreePath(
      pendingRevealWorktree.worktreeId,
      projects.map((project) => ({
        projectId: project.id,
        path: project.path,
        worktrees: getWorktreesForProject(project),
      }))
    );
    clearPendingRevealWorktreeId();
    if (targetPath) {
      handleRevealCurrent(targetPath, {
        highlight: pendingRevealWorktree.highlight,
        beginRename: pendingRevealWorktree.beginRename,
      });
    }
  }, [
    pendingRevealWorktree,
    clearPendingRevealWorktreeId,
    projects,
    getWorktreesForProject,
    handleRevealCurrent,
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

  /** Repo labels for Project sort, projected once for the whole sidebar. */
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
  const repoByPath = useMemo(
    () => new Map(storeRepos.map((repo) => [repo.path, repo])),
    [storeRepos]
  );

  const createStateByProjectId = useMemo(() => {
    const states = new Map<string, RepoHeaderCreateState>();
    for (const project of projects) {
      const label = project.displayName || project.name;
      const connectionId = repoByPath.get(project.path)?.connectionId ?? null;
      const gated =
        project.is_git &&
        Boolean(connectionId) &&
        !isRuntimeOwnedSshTargetId(connectionId) &&
        sshConnectionStates.get(connectionId as string)?.status !== "connected";
      states.set(
        project.id,
        gated
          ? {
              disabled: true,
              tooltip: "Reconnect SSH target before creating workspaces",
              ariaLabel: `Reconnect SSH target before creating workspaces for ${label}`,
            }
          : {
              disabled: false,
              tooltip: `Create workspace for ${label}`,
              ariaLabel: `Create workspace for ${label}`,
            }
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
      const member = projects.find((project) => projectGroupMap?.[project.id] === groupId);
      return member ? resolveProjectHostId(member) : undefined;
    },
    [projects, projectGroupMap, resolveProjectHostId]
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

  const getFilteredAndSortedWorktrees = useCallback((proj: HydraProject): GitWorktreeInfo[] => {
    let wts = getWorktreesForProject(proj);

    // Filter by display options
    if (displayOptions.hideDefaultBranch) {
      wts = wts.filter((w) => !(w.is_main || w.isMainWorktree) || w.path === activeWorktreePath);
    }
    if (displayOptions.hideDetachedHead) {
      wts = wts.filter((w) => (w.branch !== "HEAD" && w.branch !== "(detached)") || w.path === activeWorktreePath);
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
            const rowSessions = sessions.filter(
              (session) =>
                session.project_path === row.path ||
                ((worktree?.is_main || worktree?.isMainWorktree) &&
                  session.project_path === proj.path)
            );
            return [row.id, resolveWorktreeAttentionFromSessions(rowSessions, now)] as const;
          })
        )
      : undefined;
    const ordered = sortSidebarWorktrees({
      worktrees: projected,
      mode: displayOptions.sortBy,
      repoMap: pipelineRepoMap,
      now,
      attentionByWorktree,
    });
    const byPath = new Map(wts.map((worktree) => [worktree.path, worktree]));
    return ordered
      .map((row) => byPath.get(row.path))
      .filter((worktree): worktree is GitWorktreeInfo => worktree !== undefined);
  }, [
    getWorktreesForProject,
    displayOptions,
    query,
    sessions,
    activeWorktreePath,
    pipelineRepoMap,
    worktreesByRepo,
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

  return (
    <div
      ref={sidebarRootRef}
      className="relative flex h-full w-full flex-col bg-worktree-sidebar text-worktree-sidebar-foreground select-none overflow-hidden"
      style={leftSidebarStyle}
    >
      {/* Orca `useSidebarProjectDrop`: native folder drag over the sidebar. */}
      {isProjectDropActive && (
        <div
          data-sidebar-project-drop-overlay="true"
          className="pointer-events-none absolute inset-2 z-50 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-emerald-500/70 bg-emerald-500/10 text-center"
        >
          <FolderPlus className="size-6 text-emerald-400" />
          <span className="px-4 text-[11px] font-medium text-emerald-200">
            Drop folder to add project
          </span>
        </div>
      )}
      {/* 1. Top Strip Nav (Search / Worktree palette) */}
      <SidebarNav
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
        activeFilterCount={countActiveWorkspaceFilters(displayOptions)}
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
            statusFilter={agentsStatusFilter}
            onStatusFilterChange={handleAgentsStatusFilterChange}
            scrollTopRef={agentsScrollTopRef}
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
              scanFailuresByProject={scanFailuresByProject}
              prByPath={prByPath}
              onActivateFolderWorkspace={onActivateFolderWorkspace}
              onDeleteFolderWorkspace={onDeleteFolderWorkspace}
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
                  window.dispatchEvent(
                    new CustomEvent("hydra:move-project-to-group", {
                      detail: { projectId: draggedProjectId, groupId },
                    })
                  );
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
      />

      <AgentSendTargetPicker />

      {/* 5. Footer */}
      <SidebarFooter
        appVersion={appVersion}
        gitStatus={gitStatus}
        onOpenSettings={onOpenSettings}
        onRevealCurrent={sidebarBody === "workspaces" ? () => handleRevealCurrent() : undefined}
        workspaceBoardOpen={workspaceBoardOpen}
        onToggleWorkspaceBoard={toggleWorkspaceBoard}
      />

      {/* 5b. Workspace board — companion panel anchored to this sidebar */}
      <WorkspaceBoardDrawer
        open={workspaceBoardOpen}
        renderedOpen={workspaceBoardRenderedOpen}
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
                setActiveProjectMenu(null);
                onOpenSettings();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-worktree-sidebar-accent text-worktree-sidebar-foreground text-left transition cursor-pointer"
            >
              <Settings className="size-3.5 text-worktree-sidebar-foreground/60" />
              Project Settings
            </button>

            <button
              type="button"
              onClick={() => {
                // Why: Hydra has no repository-icon settings pane yet; the entry
                // still opens the settings surface instead of becoming a dead row.
                setActiveProjectMenu(null);
                onOpenSettings();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-worktree-sidebar-accent text-worktree-sidebar-foreground text-left transition cursor-pointer"
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
                            dispatchProjectGroupChange("hydra:move-project-to-group", {
                              projectId: proj.id,
                              groupId: group.id,
                              hostId: resolveProjectHostId(proj),
                            });
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
                  dispatchProjectGroupChange("hydra:remove-project-from-group", {
                    projectId: proj.id,
                    hostId: resolveProjectHostId(proj),
                  });
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
            removeProjectPaths: groupDeleteDialog.removeContainedProjects
              ? groupDeleteMembers.map((project) => project.path)
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
        onCancel={() => setRevealConfirmation(null)}
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
    </div>
  );
}
