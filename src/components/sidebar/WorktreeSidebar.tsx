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
} from "lucide-react";
import { SidebarNav } from "./SidebarNav";
import { SidebarHeader } from "./SidebarHeader";
import { SidebarFooter } from "./SidebarFooter";
import { SidebarAgentsList } from "./SidebarAgentsList";
import { WorktreeList } from "./WorktreeList";
import { mergeExternalWorktreeInboxPaths } from "./worktree-list/rows/NewExternalWorktreesInboxLine";
import { WorkspaceOptionsMenu, type WorkspaceDisplayOptions } from "./WorkspaceOptionsMenu";
import { ProjectGroupNameDialog } from "./ProjectGroupNameDialog";
import { ProjectGroupDeleteDialog } from "./ProjectGroupDeleteDialog";
import { WorktreeVisibilityDialog } from "./WorktreeVisibilityDialog";
import { PromptDialog, type PromptDialogProps } from "../PromptDialog";
import type {
  HydraProject,
  GitWorktreeInfo,
  WorktreeSession,
  WorktreeSidebarProps,
  AgentsGroupBy,
  AgentsStatusFilter,
  WorkspacePort,
  SidebarBody,
  SidebarShellPrefs,
} from "./types";
import { IDLE, resolveWorktreeAttention, type SessionAttention, type SessionAttentionInput } from "../../lib/smart-attention";

export * from "./types";

const defaultDisplayOptions: WorkspaceDisplayOptions = {
  groupBy: "repo",
  sortBy: "agent-activity",
  hideSleeping: false,
  hideDefaultBranch: false,
  hideAutomationCreated: false,
  hideCliCreated: false,
  hideDetachedHead: false,
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
  onNewSessionWithAgent: _onNewSessionWithAgent,
  onRenameWorktreeTitle,
  onDeleteSession,
  onOpenSettings,
  onOpenAddRepoDialog,
  onOpenNewWorkspaceModal,
  onSessionContextMenu: _onSessionContextMenu,
  onProjectContextMenu,
  onWorktreeContextMenu,
  onReorderSessions: _onReorderSessions,
  onReorderProjects,
  onReorderWorktrees,
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
  prByPath,
  onActivateFolderWorkspace,
  compactCards = false,
  onSelectNextSession,
  onSelectPrevSession,
  isModalOpen = false,
  settings,
  initialSidebarBody,
  initialCollapsedProjects,
  initialCollapsedGroups,
  initialDisplayOptions,
  initialAgentsReadFilter,
  initialAgentsGroupBy,
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

  const [filter, setFilter] = useState("");
  const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);
  const optionsButtonRef = useRef<HTMLButtonElement | null>(null);

  // ─── Ephemeral / UI State ────────────────────────────────────────────────
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [portsByWorktree, setPortsByWorktree] = useState<Map<string, WorkspacePort[]>>(() => new Map());
  const [highlightedRevealPath, setHighlightedRevealPath] = useState<string | null>(null);
  const highlightTimerRef = useRef<number | null>(null);

  // Context Menu state
  const [activeProjectMenu, setActiveProjectMenu] = useState<{ proj: HydraProject; x: number; y: number } | null>(null);
  const [activeGroupMenu, setActiveGroupMenu] = useState<{ group: { id: string; name: string }; x: number; y: number } | null>(null);

  // Dialogs state
  const [groupNameDialog, setGroupNameDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    initialName?: string;
    confirmLabel?: string;
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
  }>({
    open: false,
    group: null,
  });

  const [visibilityDialog, setVisibilityDialog] = useState<{
    open: boolean;
    project: HydraProject | null;
    hiddenWorktrees: GitWorktreeInfo[];
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
    });
  }, [
    onSidebarPrefsChange,
    sidebarBody,
    collapsedProjects,
    collapsedGroups,
    displayOptions,
    agentsStatusFilter,
    agentsGroupBy,
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

  const handleAgentsGroupByChange = useCallback((groupBy: AgentsGroupBy) => {
    setAgentsGroupBy(groupBy);
    notifyPrefs({ agentsGroupBy: groupBy });
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

  const handleRevealCurrent = useCallback((targetPath?: string | null) => {
    const target = targetPath || revealTargetPath || activeWorktreePath;
    if (!target) return;

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
        break;
      }
    }

    flashRevealedWorktree(target);

    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-worktree-path="${CSS.escape(target)}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    });
  }, [
    revealTargetPath,
    activeWorktreePath,
    projects,
    getWorktreesForProject,
    collapsedProjects,
    collapsedGroups,
    projectGroupMap,
    flashRevealedWorktree,
  ]);

  // ─── Drag and Drop Handlers ──────────────────────────────────────────────
  const handleWorktreeDragStart = useCallback((e: React.DragEvent, path: string) => {
    setDraggedWorktreePath(path);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/x-hydra-worktree-drag", path);
  }, []);

  const handleWorktreeDragOver = useCallback((e: React.DragEvent, targetPath: string) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const isTop = e.clientY - rect.top < rect.height / 2;
    setWorktreeDropTarget({ path: targetPath, position: isTop ? "top" : "bottom" });
  }, []);

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
        onReorderWorktrees(next, proj.path);
      }
    }
    setDraggedWorktreePath(null);
    setWorktreeDropTarget(null);
  }, [draggedWorktreePath, worktreeDropTarget, getWorktreesForProject, onReorderWorktrees]);

  const handleWorktreeDragEnd = useCallback(() => {
    setDraggedWorktreePath(null);
    setWorktreeDropTarget(null);
  }, []);

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

  const groupDeleteMembers = useMemo(() => {
    if (!groupDeleteDialog.group) return [];
    return displayProjects.filter(
      (p) => projectGroupMap?.[p.id] === groupDeleteDialog.group?.id
    );
  }, [displayProjects, projectGroupMap, groupDeleteDialog.group]);

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

    // Sort worktrees
    if (displayOptions.sortBy === "name") {
      return [...wts].sort((a, b) => (a.displayName || a.branch).localeCompare(b.displayName || b.branch));
    }
    if (displayOptions.sortBy === "recent") {
      return [...wts].sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0));
    }
    if (displayOptions.sortBy === "agent-activity") {
      const now = Date.now();
      const sessionInput = (s: WorktreeSession, isUnvisited?: boolean): SessionAttentionInput => ({
        state: s.state,
        stateStartedAt: s.state_started_at,
        lastActivityAt: s.updated_at ?? s.created_at ?? undefined,
        hasLivePty: true,
        isUnvisited,
      });

      const attentionByPath = new Map<string, SessionAttention>();
      for (const wt of wts) {
        const wtSessions = sessions.filter(
          (s) => s.project_path === wt.path || (wt.is_main && s.project_path === proj.path)
        );
        const inputs = wtSessions.map((s) =>
          sessionInput(s, Boolean(unreadWorktrees?.has(wt.path) || unreadProjects?.has(proj.id)))
        );
        attentionByPath.set(wt.path, resolveWorktreeAttention(inputs, now));
      }

      return [...wts].sort((a, b) => {
        const aa = attentionByPath.get(a.path) ?? IDLE;
        const bb = attentionByPath.get(b.path) ?? IDLE;
        if (aa.cls !== bb.cls) return aa.cls - bb.cls;
        if (aa.attentionTimestamp !== bb.attentionTimestamp) {
          return bb.attentionTimestamp - aa.attentionTimestamp;
        }
        return (b.created_at ?? 0) - (a.created_at ?? 0);
      });
    }

    return wts;
  }, [
    getWorktreesForProject,
    displayOptions,
    query,
    sessions,
    activeWorktreePath,
    unreadWorktrees,
    unreadProjects,
  ]);

  // ─── Background Appearance Tint ──────────────────────────────────────────
  const sidebarTintStyle = useMemo(() => {
    if (settings?.left_sidebar_appearance_mode === "tinted" && settings.left_sidebar_tint_color) {
      const color = settings.left_sidebar_tint_color;
      const opacity = settings.left_sidebar_tint_opacity ?? 0.1;
      return {
        backgroundColor: `color-mix(in srgb, ${color} ${Math.round(opacity * 100)}%, #121316)`,
      } as const;
    }
    return {};
  }, [settings?.left_sidebar_appearance_mode, settings?.left_sidebar_tint_color, settings?.left_sidebar_tint_opacity]);
  return (
    <div
      className="flex h-full w-full flex-col bg-worktree-sidebar text-worktree-sidebar-foreground select-none overflow-hidden"
      style={sidebarTintStyle}
    >
      {/* 1. Top Strip Nav (Search / Command Palette) */}
      <SidebarNav
        onOpenCommandPalette={() => {
          window.dispatchEvent(new CustomEvent("hydra:open-command-palette"));
        }}
      />
      <div className="h-px bg-worktree-sidebar-border mx-3 my-0.5" />

      {/* 2. Header (Projects title + Workspace options + Add Repo + New Workspace) */}
      <SidebarHeader
        sidebarBody={sidebarBody}
        setSidebarBody={handleSetSidebarBody}
        onOpenAddRepoDialog={onOpenAddRepoDialog}
        onOpenNewWorkspaceModal={onOpenNewWorkspaceModal}
        optionsButtonRef={optionsButtonRef}
        optionsMenuOpen={optionsMenuOpen}
        setOptionsMenuOpen={setOptionsMenuOpen}
        projects={projects}
      />

      {/* 3. Main Body */}
      {sidebarBody === "agents" ? (
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
        />
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
          {/* Orca parity (`VirtualizedWorktreeViewport.tsx:352`): the scroll container
              carries only a 1px left/small top inset plus the sleek scrollbar; every
              horizontal inset comes from the row geometry, so the card's hit box reaches
              the container edge instead of dying in its padding. */}
          <div
            className="flex-1 overflow-y-auto overflow-x-hidden pl-1 pr-3 pt-px min-h-0 scrollbar-sleek"
          >
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
              prByPath={prByPath}
              onActivateFolderWorkspace={onActivateFolderWorkspace}
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
              onSelectSession={onSelectSession}
              onRenameWorktreeTitle={onRenameWorktreeTitle}
              onOpenNewWorkspaceModal={onOpenNewWorkspaceModal}
              onOpenAddRepoDialog={onOpenAddRepoDialog}
              onClearFilter={() => setFilter("")}
              onToggleProjectCollapse={toggleProjectCollapse}
              onToggleGroupCollapse={toggleGroupCollapse}
              onProjectContextMenu={(e, proj) => {
                if (onProjectContextMenu) {
                  onProjectContextMenu(e, proj);
                } else {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setActiveProjectMenu({ proj, x: rect.right, y: rect.bottom + 4 });
                }
              }}
              onGroupContextMenu={(e, group) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setActiveGroupMenu({ group, x: rect.right, y: rect.bottom + 4 });
              }}
              onWorktreeContextMenu={(e, wt, proj) => {
                const targetProject = proj || activeProject;
                if (targetProject) {
                  onWorktreeContextMenu?.(e, wt, targetProject);
                }
              }}
              onShowHiddenWorktree={async (proj, worktreePath) => {
                try {
                  await invoke("import_worktree", {
                    projectPath: proj.path,
                    worktreePath,
                  });
                  await stampVisibilityPromptPhase(proj);
                  window.dispatchEvent(new CustomEvent("hydra:refresh-projects"));
                } catch (err) {
                  console.error(err);
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
                  window.dispatchEvent(new CustomEvent("hydra:refresh-projects"));
                } catch (err) {
                  console.error(err);
                }
              }}
              onSuppressHiddenWorktrees={async (proj) => {
                try {
                  await invoke("suppress_worktree_inbox", { projectPath: proj.path });
                  window.dispatchEvent(new CustomEvent("hydra:refresh-projects"));
                } catch (err) {
                  console.error(err);
                }
              }}
              draggedWorktreePath={draggedWorktreePath}
              worktreeDropTarget={worktreeDropTarget}
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
      />

      {/* 5. Footer */}
      <SidebarFooter
        appVersion={appVersion}
        gitStatus={gitStatus}
        onOpenSettings={onOpenSettings}
        onRevealCurrent={sidebarBody === "workspaces" ? () => handleRevealCurrent() : undefined}
      />

      {/* 6. Context Menus */}
      {activeProjectMenu && (
        <>
          <div
            className="fixed inset-0 z-[99998]"
            onClick={() => setActiveProjectMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setActiveProjectMenu(null);
            }}
          />
          <div
            style={{
              position: "fixed",
              top: Math.min(activeProjectMenu.y, window.innerHeight - 300),
              left: Math.min(activeProjectMenu.x, window.innerWidth - 220),
              zIndex: 99999,
            }}
            className="w-52 rounded-xl border border-worktree-sidebar-border bg-worktree-sidebar p-1.5 shadow-2xl text-xs backdrop-blur-md"
            onClick={(e) => e.stopPropagation()}
          >
            <button
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
              onClick={() => {
                const proj = activeProjectMenu.proj;
                setActiveProjectMenu(null);
                const hidden = hiddenWorktreesByProject?.[proj.path] ?? [];
                setVisibilityDialog({
                  open: true,
                  project: proj,
                  hiddenWorktrees: hidden,
                });
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-worktree-sidebar-accent text-worktree-sidebar-foreground text-left transition cursor-pointer"
            >
              <Eye className="size-3.5 text-worktree-sidebar-foreground/60" />
              Manage Worktree Visibility...
            </button>

            <button
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

            {/* Move to group options */}
            <button
              onClick={() => {
                const proj = activeProjectMenu.proj;
                setActiveProjectMenu(null);
                setGroupNameDialog({
                  open: true,
                  title: "New Project Group",
                  description: "Create a group to organize projects in your sidebar.",
                  confirmLabel: "Create & Move",
                  onSubmit: (name) => {
                    window.dispatchEvent(
                      new CustomEvent("hydra:create-project-group", {
                        detail: { name, projectId: proj.id },
                      })
                    );
                  },
                });
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-worktree-sidebar-accent text-worktree-sidebar-foreground text-left transition cursor-pointer"
            >
              <FolderTree className="size-3.5 text-indigo-400" />
              Move to New Group...
            </button>

            {projectGroups.map((g) => {
              if (projectGroupMap?.[activeProjectMenu.proj.id] === g.id) return null;
              return (
                <button
                  key={g.id}
                  onClick={() => {
                    const proj = activeProjectMenu.proj;
                    setActiveProjectMenu(null);
                    window.dispatchEvent(
                      new CustomEvent("hydra:move-project-to-group", {
                        detail: { projectId: proj.id, groupId: g.id },
                      })
                    );
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-worktree-sidebar-accent text-worktree-sidebar-foreground/80 text-left transition cursor-pointer pl-6"
                >
                  <span className="truncate">Move to {g.name}</span>
                </button>
              );
            })}

            {projectGroupMap?.[activeProjectMenu.proj.id] && (
              <button
                onClick={() => {
                  const proj = activeProjectMenu.proj;
                  setActiveProjectMenu(null);
                  window.dispatchEvent(
                    new CustomEvent("hydra:remove-project-from-group", {
                      detail: { projectId: proj.id },
                    })
                  );
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-worktree-sidebar-accent text-worktree-sidebar-foreground/70 text-left transition cursor-pointer"
              >
                Remove from Group
              </button>
            )}

            <div className="h-px bg-worktree-sidebar-border my-1" />

            <button
              onClick={() => {
                const proj = activeProjectMenu.proj;
                setActiveProjectMenu(null);
                onRemoveProject(proj);
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
          >
            <button
              onClick={() => {
                const group = activeGroupMenu.group;
                setActiveGroupMenu(null);
                setGroupNameDialog({
                  open: true,
                  title: "Rename Project Group",
                  description: "Enter a new name for this project group.",
                  initialName: group.name,
                  confirmLabel: "Rename",
                  onSubmit: (name) => {
                    window.dispatchEvent(
                      new CustomEvent("hydra:rename-project-group", {
                        detail: { id: group.id, name },
                      })
                    );
                  },
                });
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-worktree-sidebar-accent text-worktree-sidebar-foreground text-left transition cursor-pointer"
            >
              Rename Group...
            </button>

            <button
              onClick={() => {
                const group = activeGroupMenu.group;
                setActiveGroupMenu(null);
                setGroupDeleteDialog({
                  open: true,
                  group,
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
        projectNames={groupDeleteMembers.map((p) => p.name)}
        onOpenChange={(open) => setGroupDeleteDialog((prev) => ({ ...prev, open }))}
        onConfirm={() => {
          if (groupDeleteDialog.group) {
            window.dispatchEvent(
              new CustomEvent("hydra:delete-project-group", {
                detail: { id: groupDeleteDialog.group.id },
              })
            );
          }
        }}
      />

      <WorktreeVisibilityDialog
        open={visibilityDialog.open}
        project={visibilityDialog.project}
        hiddenWorktrees={visibilityDialog.hiddenWorktrees}
        onOpenChange={(open) => setVisibilityDialog((prev) => ({ ...prev, open }))}
        onImported={() => {
          window.dispatchEvent(new CustomEvent("hydra:refresh-projects"));
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
