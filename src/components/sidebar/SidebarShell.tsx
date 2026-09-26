// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
import { invoke } from "@tauri-apps/api/core";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { List, type ListImperativeAPI, type RowComponentProps } from "react-window";
import {
  GitBranch,
  Plus,
  Trash2,
  FolderGit2,
  ChevronDown,
  ChevronRight,
  FolderPlus,
  MoreHorizontal,
  Sliders,
  Copy,
  Pencil,
  FolderTree,
  GripVertical,
  Terminal,
  ChevronsUp,
  FolderInput,
  X
} from "lucide-react";
import { ProjectGroupNameDialog } from "./ProjectGroupNameDialog";
import { ProjectGroupDeleteDialog } from "./ProjectGroupDeleteDialog";
import { WorkspaceOptionsMenu, type WorkspaceDisplayOptions } from "./WorkspaceOptionsMenu";
import { SidebarHeader } from "./SidebarHeader";
import { SidebarAgentsList } from "./SidebarAgentsList";
import { SidebarNav } from "./SidebarNav";
import { AgentBrandIcon } from "../AgentIcon";
import { SidebarFooter } from "./SidebarFooter";
import type { HydraProject, GitWorktreeInfo, WorktreeSession, WorktreeSidebarProps, AgentsGroupBy, AgentsStatusFilter } from "./types";
import { IDLE, resolveSessionAttention, resolveWorktreeAttention, type SessionAttention, type SessionAttentionInput } from "../../lib/smart-attention";
import { buildSidebarRows } from "./worktree-list/buildSidebarRows";
import {
  createSidebarDragPreview,
  isSidebarPointerDragBlocked,
  setSidebarPointerDragDocumentStyles,
  updateSidebarDragPreviewPosition,
} from "./worktree-list/pointer-drag-dom";
import type { SidebarRow, SidebarStatusState, ProjectGroup } from "./worktree-list/types";
import { getFocusableRowKeys, resolveCycledFocusKey } from "./worktree-list/keyboard-cycle";
import {
  HARD_SCROLL_UP,
  createHardScrollUpDetectorState,
  reduceHardScrollUpOnDismiss,
  reduceHardScrollUpOnIdle,
  reduceHardScrollUpOnScroll,
  reduceHardScrollUpOnWheel,
  type HardScrollUpDetectorState
} from "./worktree-list/hard-scroll-up";

// PR-10 (Orca main.css parity): the drag preview/badge styling ships as CSS rules in
// Orca; this PR's scope is restricted to this file + pointer-drag-dom.ts, so the same
// rules are injected once at runtime instead. Every referenced token
// (--worktree-sidebar, --shadow-floating, --radius, --sidebar-ring, --sidebar) already
// exists in App.css / left-sidebar-appearance.ts.
const DRAG_PREVIEW_STYLE_ELEMENT_ID = "hydra-sidebar-drag-preview-styles";
const DRAG_PREVIEW_CSS = `
[data-worktree-sidebar-drag-preview='true'] {
  z-index: 2147483000;
  overflow: visible;
  border-radius: var(--radius);
  opacity: 0.96;
  background: var(--worktree-sidebar);
  box-shadow: var(--shadow-floating);
  will-change: transform;
}

[data-worktree-sidebar-drag-preview='true'] * {
  cursor: grabbing !important;
}

[data-worktree-sidebar-drag-count='true'] {
  position: absolute;
  top: -6px;
  right: 8px;
  display: inline-flex;
  min-width: 18px;
  height: 18px;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  background: var(--sidebar-ring);
  color: var(--sidebar);
  font-size: 10px;
  font-weight: 700;
  box-shadow: 0 0 0 2px var(--sidebar);
}
`;

function ensureSidebarDragPreviewStyles(): void {
  if (document.getElementById(DRAG_PREVIEW_STYLE_ELEMENT_ID)) return;
  const style = document.createElement("style");
  style.id = DRAG_PREVIEW_STYLE_ELEMENT_ID;
  style.textContent = DRAG_PREVIEW_CSS;
  document.head.appendChild(style);
}

// Status-group header vocabulary for the "workspace-status" groupBy mode — Orca
// SidebarStatusHeader language, same dot colors as the agents view (SidebarAgentsList).
const STATUS_HEADER_LABEL: Record<SidebarStatusState, string> = {
  blocked: "Blocked",
  waiting: "Waiting",
  working: "Working",
  done: "Done",
  idle: "Idle",
  unknown: "Unknown",
};
const STATUS_HEADER_DOT: Record<SidebarStatusState, string> = {
  blocked: "bg-red-400",
  waiting: "bg-orange-400",
  working: "bg-amber-400",
  done: "bg-blue-400",
  idle: "bg-emerald-400",
  unknown: "bg-neutral-500",
};

// Session record → smart-attention input. hasLivePty mirrors the Orca decay split:
// a session whose state is `unknown` but still has a pane attached is "unverifiable"
// (Class 4), not idle. The daemon holds the PTY for the lifetime of the session record,
// so a session that exists is live; only an explicitly deleted/closed state is not.
// (App.tsx marks batch-closed sessions idle, never unknown, so the split holds.)
// Module scope: pure adapter, no closures over component state — memoized sort
// callbacks capture it safely across renders.
const sessionInput = (s: WorktreeSession): SessionAttentionInput => ({
  state: s.state,
  stateStartedAt: s.state_started_at,
  lastActivityAt: s.updated_at ?? s.created_at ?? undefined,
  hasLivePty: true,
});

export function SidebarShell({
  sessions,
  projects,
  activeProject,
  gitStatus,
  gitWorktrees,
  worktreesByProject,
  onSelectProject,
  onRemoveProject,
  onSelectSession,
  onSelectGitWorktree,
  onDeleteGitWorktree,
  onDeleteSession,
  onOpenSettings,
  onOpenAddRepoDialog,
  onOpenNewWorkspaceModal,
  onSessionContextMenu,
  onProjectContextMenu,
  onWorktreeContextMenu,
  onReorderSessions,
  onReorderProjects,
  onReorderWorktrees,
  pinnedProjects,
  unreadProjects,
  pinnedWorktrees,
  unreadWorktrees,
  projectGroupMap,
  projectGroups,
  compactCards = false,
  onSelectNextSession,
  isModalOpen = false,
  settings,
  initialSidebarBody,
  initialCollapsedProjects,
  initialCollapsedGroups,
  initialDisplayOptions,
  initialAgentsReadFilter,
  initialAgentsGroupBy,
  onSidebarPrefsChange,
}: WorktreeSidebarProps) {
  const [filter, setFilter] = useState("");
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set());
  // PR-14: collapsedGroups/collapsedProjects/sidebarBody/displayOptions/agents*
  // deixaram o localStorage e vivem no SQLite (sidebar_prefs, key "ui.sidebar").
  // O App é a fonte única de leitura: hidrata no boot e entrega os valores via
  // initial* props (one-shot); os writes locais sobem via onSidebarPrefsChange.
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [focusedSessionId, setFocusedSessionId] = useState<string | null>(null);
  const [activeProjectMenu, setActiveProjectMenu] = useState<{ proj: HydraProject; x: number; y: number } | null>(null);
  const [activeGroupMenu, setActiveGroupMenu] = useState<{ group: ProjectGroup; x: number; y: number } | null>(null);
  const activeProjectMenuId = activeProjectMenu?.proj.id ?? null;
  const activeGroupMenuId = activeGroupMenu?.group.id ?? null;
  const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);
  const [sidebarBody, setSidebarBody] = useState<"workspaces" | "agents">("workspaces");
  // PR-14: agents-view prefs lifted de SidebarAgentsList (agora controlado) para
  // participarem do blob persistido pelo App.
  const [agentsStatusFilter, setAgentsStatusFilter] = useState<AgentsStatusFilter>("all");
  const [agentsGroupBy, setAgentsGroupBy] = useState<AgentsGroupBy>("state");
  const [focusedWorktreePath, setFocusedWorktreePath] = useState<string | null>(null);
  const [focusedProjectId, setFocusedProjectId] = useState<string | null>(null);
  const [groupDropTargetId, setGroupDropTargetId] = useState<string | null>(null);

  const [groupNameDialog, setGroupNameDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    initialName: string;
    confirmLabel: string;
    onSubmit: (name: string) => Promise<void> | void;
  }>({
    open: false,
    title: "",
    description: "",
    initialName: "",
    confirmLabel: "Save",
    onSubmit: () => {},
  });

  const [groupDeleteDialog, setGroupDeleteDialog] = useState<{
    open: boolean;
    group: { id: string; name: string } | null;
  }>({
    open: false,
    group: null,
  });

  useEffect(() => {
    const handleOpenNewGroup = (e: Event) => {
      const detail = (e as CustomEvent<{ projectId?: string; defaultName?: string }>).detail;
      setGroupNameDialog({
        open: true,
        title: "New Project Group",
        description: "Create a group to organize projects in your sidebar.",
        initialName: detail?.defaultName ?? "New Group",
        confirmLabel: "Create Group",
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

  
  // Ref para ancoragem exata do botão SlidersHorizontal
  const optionsButtonRef = useRef<HTMLButtonElement | null>(null);

  const [displayOptions, setDisplayOptions] = useState<WorkspaceDisplayOptions>(() => ({
    groupBy: "repo",
    sortBy: "agent-activity",
    hideSleeping: false,
    hideDefaultBranch: false,
    hideAutomationCreated: false,
    hideCliCreated: false,
    hideDetachedHead: false,
    filterProjectIds: [],
  }));

  // PR-14 hydration: as initial* props chegam uma vez do App (snapshot SQLite +
  // migração legacy) e aplicam aqui; o App nunca re-emite, então mudanças locais
  // posteriores não são sobrescritas.
  useEffect(() => { if (initialSidebarBody !== undefined) setSidebarBody(initialSidebarBody); }, [initialSidebarBody]);
  useEffect(() => { if (initialCollapsedProjects !== undefined) setCollapsedProjects(new Set(initialCollapsedProjects)); }, [initialCollapsedProjects]);
  useEffect(() => { if (initialCollapsedGroups !== undefined) setCollapsedGroups(new Set(initialCollapsedGroups)); }, [initialCollapsedGroups]);
  useEffect(() => { if (initialDisplayOptions !== undefined) setDisplayOptions(initialDisplayOptions); }, [initialDisplayOptions]);
  useEffect(() => { if (initialAgentsReadFilter !== undefined) setAgentsStatusFilter(initialAgentsReadFilter); }, [initialAgentsReadFilter]);
  useEffect(() => { if (initialAgentsGroupBy !== undefined) setAgentsGroupBy(initialAgentsGroupBy); }, [initialAgentsGroupBy]);

  // PR-14 notify: o App faz merge com a fatia dele (pinned/unread/groups) e
  // persiste debounced 250ms via save_sidebar_pref. Pré-hidratação o App ignora
  // notificações (gate) para nunca clobber o blob persistido com defaults.
  useEffect(() => {
    onSidebarPrefsChange?.({
      sidebarBody,
      collapsedProjects: [...collapsedProjects],
      collapsedGroups: [...collapsedGroups],
      displayOptions,
      agentsReadFilter: agentsStatusFilter,
      agentsGroupBy,
    });
  }, [onSidebarPrefsChange, sidebarBody, collapsedProjects, collapsedGroups, displayOptions, agentsStatusFilter, agentsGroupBy]);

  const displayProjects = useMemo(() => {
    if (!displayOptions.filterProjectIds?.length) return projects;
    return projects.filter((p) => displayOptions.filterProjectIds!.includes(p.id));
  }, [projects, displayOptions.filterProjectIds]);

  const groupDeleteMembers = useMemo(() => {
    if (!groupDeleteDialog.group) return [];
    return displayProjects.filter(
      (p) => projectGroupMap?.[p.id] === groupDeleteDialog.group?.id
    );
  }, [displayProjects, projectGroupMap, groupDeleteDialog.group]);

  // ---- Sprint 3 P0: helpers for displayOptions + worktreesByProject ----
  const getWorktreesForProject = useCallback((proj: HydraProject): GitWorktreeInfo[] => {
    if (worktreesByProject && worktreesByProject[proj.path]) return worktreesByProject[proj.path];
    if (proj.path === activeProject?.path) return gitWorktrees;
    return [];
  }, [worktreesByProject, gitWorktrees, activeProject]);

  const isDefaultBranchWt = useCallback((wt: GitWorktreeInfo, proj: HydraProject): boolean => {
    const b = wt.branch?.trim() ?? "";
    if (!b) return false;
    const defaultBranch = proj.current_branch?.trim() ?? "main";
    return b === defaultBranch || b === "main" || b === "master";
  }, []);

  const isDetachedHeadWt = useCallback((wt: GitWorktreeInfo): boolean => {
    const b = (wt.branch ?? "").trim();
    return b === "" || b === "HEAD" || b === "(detached)";
  }, []);

  const isAutomationCreatedWt = useCallback((wt: GitWorktreeInfo): boolean => {
    const b = (wt.branch ?? "").toLowerCase();
    return b.startsWith("workspace-") || b.includes("automation") || b.includes("agent-") || b.startsWith("feat/automation");
  }, []);

  const isCliCreatedWt = useCallback((wt: GitWorktreeInfo): boolean => {
    const b = (wt.branch ?? "").trim();
    if (!b) return false;
    if (b === "main" || b === "master") return false;
    if (b.includes("workspace-") || b.includes("automation")) return false;
    return !b.includes("/");
  }, []);

  const isSleepingWorktree = useCallback((wt: GitWorktreeInfo, proj: HydraProject): boolean => {
    const wtSessions = sessions.filter((s) => s.project_path === wt.path || (!s.project_path && wt.path === proj.path));
    if (wtSessions.length === 0) return wt.path !== proj.path;
    return wtSessions.every((s) => s.state === "idle");
  }, [sessions]);

  const sortWorktreesByOption = useCallback((wts: GitWorktreeInfo[], _proj: HydraProject): GitWorktreeInfo[] => {
    if (displayOptions.sortBy === "name") {
      return [...wts].sort((a, b) => (a.branch || a.path).localeCompare(b.branch || b.path));
    }
    if (displayOptions.sortBy === "recent") {
      return [...wts].sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0));
    }
    // agent-activity (Orca "smart" sort): resolve each worktree's attention once
    // (min class wins across its sessions, max ts within the class), then rank by
    // class ASC — needs-you (1) first — tie-break attentionTimestamp DESC, recency DESC.
    // inputsByPath groups sessions once so the sort itself stays O(sessions + worktrees),
    // not O(worktrees × sessions).
    const now = Date.now();
    const inputsByPath = new Map<string, SessionAttentionInput[]>();
    for (const s of sessions) {
      const list = inputsByPath.get(s.project_path);
      if (list) list.push(sessionInput(s));
      else inputsByPath.set(s.project_path, [sessionInput(s)]);
    }
    const attentionByPath = new Map<string, SessionAttention>();
    for (const [path, inputs] of inputsByPath) {
      attentionByPath.set(path, resolveWorktreeAttention(inputs, now));
    }
    return [...wts].sort((a, b) => {
      const aa = attentionByPath.get(a.path) ?? IDLE;
      const bb = attentionByPath.get(b.path) ?? IDLE;
      // Why: 1 < 2 < 3 < 4 < 5 — lower class outranks higher (corrects the former
      // ternary that ranked working above blocked).
      if (aa.cls !== bb.cls) return aa.cls - bb.cls;
      if (aa.attentionTimestamp !== bb.attentionTimestamp) return bb.attentionTimestamp - aa.attentionTimestamp;
      const aRecent = Math.max(...sessions.filter((s) => s.project_path === a.path).map((s) => s.updated_at ?? s.created_at ?? 0), (a.created_at ?? 0) * 1000);
      const bRecent = Math.max(...sessions.filter((s) => s.project_path === b.path).map((s) => s.updated_at ?? s.created_at ?? 0), (b.created_at ?? 0) * 1000);
      return bRecent - aRecent;
    });
  }, [sessions, displayOptions.sortBy]);

  const sortSessionsByOption = useCallback((sess: WorktreeSession[]): WorktreeSession[] => {
    if (displayOptions.sortBy === "name") {
      return [...sess].sort((a, b) => a.title.localeCompare(b.title));
    }
    if (displayOptions.sortBy === "recent") {
      return [...sess].sort((a, b) => (b.updated_at ?? b.created_at ?? 0) - (a.updated_at ?? a.created_at ?? 0));
    }
    // agent-activity (Orca "smart" sort): attention class ASC (needs-you 1 first —
    // corrects the former ternary that ranked working(0) above blocked(1)), then
    // attentionTimestamp DESC, then updated_at DESC. One resolution per session.
    const now = Date.now();
    const attentionById = new Map<string, SessionAttention>();
    for (const s of sess) {
      attentionById.set(s.id, resolveSessionAttention(sessionInput(s), now));
    }
    return [...sess].sort((a, b) => {
      const aa = attentionById.get(a.id) ?? IDLE;
      const bb = attentionById.get(b.id) ?? IDLE;
      if (aa.cls !== bb.cls) return aa.cls - bb.cls;
      if (aa.attentionTimestamp !== bb.attentionTimestamp) return bb.attentionTimestamp - aa.attentionTimestamp;
      return (b.updated_at ?? b.created_at ?? 0) - (a.updated_at ?? a.created_at ?? 0);
    });
  }, [displayOptions.sortBy]);

  const SessionAgentIcon = ({ agentName, size }: { agentName: string; size: number }) => {
    const lower = agentName.toLowerCase();
    if (["bash", "sh", "zsh", "shell", "terminal"].includes(lower)) {
      return <Terminal className="shrink-0 text-neutral-500" style={{ width: size, height: size }} />;
    }
    return <AgentBrandIcon agentId={agentName} size={size} />;
  };

  const formatAge = (ts?: number | null): string | null => {
    if (!ts) return null;
    const millis = ts < 10000000000 ? ts * 1000 : ts;
    const diff = Date.now() - millis;
    if (diff < 0) return null;
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return `${sec}s`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h`;
    const days = Math.floor(hr / 24);
    if (days < 7) return `${days}d`;
    if (days < 30) return `${Math.floor(days / 7)}w`;
    const months = Math.floor(days / 30);
    return `${months}mo`;
  };

  // Drag and Drop state
  const [draggedSessionId, setDraggedSessionId] = useState<string | null>(null);
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());
  const [lastClickedSessionId, setLastClickedSessionId] = useState<string | null>(null);
  const [draggedWorktreePath, setDraggedWorktreePath] = useState<string | null>(null);
  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);
  const [sessionDropTarget, setSessionDropTarget] = useState<{ id: string; position: "top" | "bottom" } | null>(null);
  const [worktreeDropTarget, setWorktreeDropTarget] = useState<{ path: string; position: "top" | "bottom" } | null>(null);
  const [projectDropTarget, setProjectDropTarget] = useState<{ id: string; position: "top" | "bottom" } | null>(null);

  // PR-10 (Orca pointer-drag-dom): the native HTML5 ghost is replaced by a clone-based
  // preview (count badge on multi-select) that tracks the pointer. dragover fires on
  // drop targets only, so the tracking listener lives on document (capture phase —
  // row handlers stopPropagation while gating drops).
  const dragPreviewRef = useRef<{ preview: HTMLElement; ghost: HTMLCanvasElement; offsetX: number; offsetY: number } | null>(null);

  const clearSidebarDragPreview = () => {
    dragPreviewRef.current?.preview.remove();
    dragPreviewRef.current?.ghost.remove();
    dragPreviewRef.current = null;
    setSidebarPointerDragDocumentStyles(false);
  };

  const beginSidebarDragPreview = (e: React.DragEvent, draggedCount: number) => {
    ensureSidebarDragPreviewStyles();
    // Hide the native ghost: transparent 1x1 canvas. Attached offscreen because
    // WebKitGTK ignores detached elements passed to setDragImage.
    const ghost = document.createElement("canvas");
    ghost.width = 1;
    ghost.height = 1;
    ghost.style.position = "fixed";
    ghost.style.top = "-10px";
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 0, 0);
    // Defensive: a drag interrupted without dragend must not orphan the previous clone.
    clearSidebarDragPreview();
    const { preview, offsetX, offsetY } = createSidebarDragPreview({
      sourceRow: e.currentTarget as HTMLElement,
      pointerX: e.clientX,
      pointerY: e.clientY,
      draggedCount,
    });
    dragPreviewRef.current = { preview, ghost, offsetX, offsetY };
    setSidebarPointerDragDocumentStyles(true);
  };

  const reorderList = <T,>(list: T[], fromIndex: number, toIndex: number, position: "top" | "bottom"): T[] => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= list.length || toIndex >= list.length) return list;
    const result = [...list];
    const [removed] = result.splice(fromIndex, 1);
    let insertIndex = toIndex;
    if (position === "bottom" && fromIndex > toIndex) insertIndex = toIndex + 1;
    else if (position === "top" && fromIndex < toIndex) insertIndex = toIndex - 1;
    result.splice(Math.max(0, Math.min(insertIndex, result.length)), 0, removed);
    return result;
  };

  const handleSessionDragStart = (e: React.DragEvent, id: string) => {
    e.stopPropagation();
    // Orca pointer-drag-dom: never start a row drag from buttons/menus/portaled popovers.
    if (isSidebarPointerDragBlocked(e.target, e.currentTarget as HTMLElement)) {
      e.preventDefault();
      return;
    }
    setDraggedSessionId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/x-hydra-session-drag", id);
    beginSidebarDragPreview(e, selectedSessions.size > 1 ? selectedSessions.size : 1);
  };
  const handleSessionDragOver = (e: React.DragEvent, targetId: string) => {
    if (!draggedSessionId || draggedSessionId === targetId) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const isTop = e.clientY - rect.top < rect.height / 2;
    setSessionDropTarget({ id: targetId, position: isTop ? "top" : "bottom" });
  };
  const handleSessionDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceId = draggedSessionId || e.dataTransfer.getData("application/x-hydra-session-drag");
    if (sourceId && sourceId !== targetId && onReorderSessions) {
      const fromIdx = sessions.findIndex((s) => s.id === sourceId);
      const toIdx = sessions.findIndex((s) => s.id === targetId);
      if (fromIdx !== -1 && toIdx !== -1) {
        const next = reorderList(sessions, fromIdx, toIdx, sessionDropTarget?.position ?? "bottom");
        onReorderSessions(next);
      }
    }
    setDraggedSessionId(null);
    setSessionDropTarget(null);
    clearSidebarDragPreview();
  };

  const handleSessionClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const shiftKey = e.shiftKey;
    const ctrlKey = e.ctrlKey || e.metaKey;
    
    if (ctrlKey) {
      // Toggle selection
      setSelectedSessions(prev => {
        const n = new Set(prev);
        if (n.has(id)) n.delete(id);
        else n.add(id);
        return n;
      });
      setLastClickedSessionId(id);
      return;
    }
    
    if (shiftKey && lastClickedSessionId) {
      // Shift+Click: select range between last clicked and current
      const currentIdx = sessions.findIndex(s => s.id === id);
      const lastIdx = sessions.findIndex(s => s.id === lastClickedSessionId);
      if (currentIdx === -1 || lastIdx === -1) return;
      
      const [start, end] = currentIdx < lastIdx ? [currentIdx, lastIdx] : [lastIdx, currentIdx];
      const newSelection = new Set<string>();
      for (let i = start; i <= end; i++) {
        newSelection.add(sessions[i].id);
      }
      setSelectedSessions(newSelection);
      setLastClickedSessionId(id);
      // Also select the current session in the workbench
      onSelectSession(id);
      return;
    }
    
    // Default: single click — activate session only, clear batch selection
    // Batch delete bar only appears after explicit Ctrl/Shift multi-select
    setSelectedSessions(new Set());
    setLastClickedSessionId(id);
    onSelectSession(id);
  };

  const handleWorktreeDragStart = (e: React.DragEvent, path: string) => {
    e.stopPropagation();
    // Orca pointer-drag-dom: never start a row drag from buttons/menus/portaled popovers.
    if (isSidebarPointerDragBlocked(e.target, e.currentTarget as HTMLElement)) {
      e.preventDefault();
      return;
    }
    setDraggedWorktreePath(path);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/x-hydra-worktree-drag", path);
    beginSidebarDragPreview(e, 1);
  };
  const handleWorktreeDragOver = (e: React.DragEvent, targetPath: string) => {
    if (!draggedWorktreePath || draggedWorktreePath === targetPath) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const isTop = e.clientY - rect.top < rect.height / 2;
    setWorktreeDropTarget({ path: targetPath, position: isTop ? "top" : "bottom" });
  };
  const findProjectForWorktree = useCallback((path: string): HydraProject | undefined => {
    for (const proj of projects) {
      const wts = getWorktreesForProject(proj);
      if (wts.some((w) => w.path === path)) return proj;
    }
    // fallback: path inside project dir
    for (const proj of projects) {
      if (path === proj.path || path.startsWith(proj.path + "/")) return proj;
    }
    return undefined;
  }, [projects, getWorktreesForProject]);

  const handleWorktreeDrop = (e: React.DragEvent, targetPath: string) => {
    e.preventDefault();
    e.stopPropagation();
    const sourcePath = draggedWorktreePath || e.dataTransfer.getData("application/x-hydra-worktree-drag");
    if (sourcePath && sourcePath !== targetPath && onReorderWorktrees) {
      const sourceProj = findProjectForWorktree(sourcePath);
      const targetProj = findProjectForWorktree(targetPath);
      // Only reorder within same project
      if (sourceProj && targetProj && sourceProj.path === targetProj.path) {
        const list = getWorktreesForProject(sourceProj);
        const fromIdx = list.findIndex((w) => w.path === sourcePath);
        const toIdx = list.findIndex((w) => w.path === targetPath);
        if (fromIdx !== -1 && toIdx !== -1) {
          const next = reorderList(list, fromIdx, toIdx, worktreeDropTarget?.position ?? "bottom");
          onReorderWorktrees(next, sourceProj.path);
        }
      } else if (!sourceProj && !targetProj) {
        // fallback to global gitWorktrees (active project only, legacy)
        const fromIdx = gitWorktrees.findIndex((w) => w.path === sourcePath);
        const toIdx = gitWorktrees.findIndex((w) => w.path === targetPath);
        if (fromIdx !== -1 && toIdx !== -1) {
          const next = reorderList(gitWorktrees, fromIdx, toIdx, worktreeDropTarget?.position ?? "bottom");
          onReorderWorktrees(next);
        }
      }
    }
    setDraggedWorktreePath(null);
    setWorktreeDropTarget(null);
    clearSidebarDragPreview();
  };

  const handleProjectDragStart = (e: React.DragEvent, id: string) => {
    e.stopPropagation();
    // Orca pointer-drag-dom: never start a row drag from buttons/menus/portaled popovers.
    if (isSidebarPointerDragBlocked(e.target, e.currentTarget as HTMLElement)) {
      e.preventDefault();
      return;
    }
    setDraggedProjectId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/x-hydra-project-drag", id);
    beginSidebarDragPreview(e, 1);
  };
  const handleProjectDragOver = (e: React.DragEvent, targetId: string) => {
    if (!draggedProjectId || draggedProjectId === targetId) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const isTop = e.clientY - rect.top < rect.height / 2;
    setProjectDropTarget({ id: targetId, position: isTop ? "top" : "bottom" });
  };
  const handleProjectDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceId = draggedProjectId || e.dataTransfer.getData("application/x-hydra-project-drag");
    if (sourceId && sourceId !== targetId && onReorderProjects) {
      const fromIdx = projects.findIndex((p) => p.id === sourceId);
      const toIdx = projects.findIndex((p) => p.id === targetId);
      if (fromIdx !== -1 && toIdx !== -1) {
        const next = reorderList(projects, fromIdx, toIdx, projectDropTarget?.position ?? "bottom");
        onReorderProjects(next);
      }
    }
    setDraggedProjectId(null);
    setProjectDropTarget(null);
    clearSidebarDragPreview();
  };
  const handleSessionDragEnd = () => {
    setDraggedSessionId(null);
    setSessionDropTarget(null);
    clearSidebarDragPreview();
  };
  const handleWorktreeDragEnd = () => {
    setDraggedWorktreePath(null);
    setWorktreeDropTarget(null);
    clearSidebarDragPreview();
  };
  const handleProjectDragEnd = () => {
    setDraggedProjectId(null);
    setProjectDropTarget(null);
    clearSidebarDragPreview();
  };

  const isDraggingSidebarRow = draggedSessionId !== null || draggedWorktreePath !== null || draggedProjectId !== null;
  useEffect(() => {
    if (!isDraggingSidebarRow) return;
    const onDocumentDragOver = (event: DragEvent) => {
      const active = dragPreviewRef.current;
      if (!active) return;
      updateSidebarDragPreviewPosition({
        preview: active.preview,
        pointerX: event.clientX,
        pointerY: event.clientY,
        offsetX: active.offsetX,
        offsetY: active.offsetY,
      });
    };
    document.addEventListener("dragover", onDocumentDragOver, true);
    return () => document.removeEventListener("dragover", onDocumentDragOver, true);
  }, [isDraggingSidebarRow]);

  // Unmount safety: never leak the body-level preview or the user-select lock.
  useEffect(() => clearSidebarDragPreview, []);

  const [appVersion, setAppVersion] = useState<string | null>(null);
  useEffect(() => {
    invoke<string>("get_app_version").then(setAppVersion).catch(()=>{});
  }, []);

  useEffect(() => {
    const handleClickOutside = () => {
      setActiveProjectMenu(null);
      setActiveGroupMenu(null);
    };
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  const toggleProjectCollapse = (projectId: string) => {
    setCollapsedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  };

  const toggleGroupCollapse = (groupId: string) => {
    // PR-14: persistência sai daqui — o notify-effect reporta collapsedGroups ao
    // App, que escreve o blob merged no SQLite (debounced 250ms).
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  // Virtualization: flatten workspaces view into rows for react-window (500+ sessions)
  // Projection is pure — buildSidebarRows (worktree-list) receives the useCallback predicates as inputs.
  const flatRows: SidebarRow[] = useMemo(
    () =>
      sidebarBody !== "workspaces" ? [] : buildSidebarRows({
        displayProjects,
        projects,
        sessions,
        gitWorktrees,
        worktreesByProject,
        activeProject,
        collapsedProjects,
        collapsedGroups,
        projectGroups,
        projectGroupMap,
        unreadProjects,
        unreadWorktrees,
        activeProjectMenuId,
        filter,
        displayOptions,
        compactCards,
        getWorktreesForProject,
        isDefaultBranchWt,
        isDetachedHeadWt,
        isAutomationCreatedWt,
        isCliCreatedWt,
        isSleepingWorktree,
        sortWorktreesByOption,
        sortSessionsByOption,
      }),
    [displayProjects, projects, sessions, gitWorktrees, worktreesByProject, getWorktreesForProject, activeProject, collapsedProjects, collapsedGroups, projectGroups, projectGroupMap, unreadProjects, unreadWorktrees, activeProjectMenuId, filter, sidebarBody, displayOptions, isDefaultBranchWt, isDetachedHeadWt, isAutomationCreatedWt, isCliCreatedWt, isSleepingWorktree, sortWorktreesByOption, sortSessionsByOption]
  );

  const getRowHeight = useCallback(
    (index: number) => {
      const row = flatRows[index];
      if (!row) return 40;
      if (row.type === "status-header") return 28;
      if (row.type === "group-header") return 32;
      if (row.type === "project-header") return 40;
      if (row.type === "worktree") return compactCards ? 32 : 44;
      if (row.type === "session") return compactCards ? 52 : 68;
      if (row.type === "empty") return 32;
      if (row.type === "hidden-pill") return 28;
      return 40;
    },
    [flatRows, compactCards]
  );

  const listRef = useRef<ListImperativeAPI>(null);

  // Focusable vocabulary derived from the rendered projection (Orca
  // worktree-list/navigation/use-keyboard.ts parity): cycling over exactly what is on
  // screen means a collapsed project, an active filter or the current groupBy cannot
  // desync the key order from the viewport. Status-header/empty/hidden-pill rows are
  // separators/feedback, never focus targets (getFocusableRowKeys owns that filter).
  const focusableRows = useMemo(() => getFocusableRowKeys(flatRows), [flatRows]);

  /**
   * Reveal-to-current (Orca ScrollToCurrentWorkspaceToolbarButton parity): scroll the
   * virtual viewport to the session the workbench has active. Works in every groupBy —
   * the workspace-status projection is sessions-only, so the same lookup covers all
   * modes. Focus follows the reveal so the next Arrow key continues from the current
   * session instead of restarting the cycle.
   */
  const handleRevealCurrent = useCallback(() => {
    const findActiveIndex = (matchActiveProject: boolean): number =>
      flatRows.findIndex(
        (row) =>
          row.type === "session" &&
          row.session.active &&
          (!matchActiveProject || row.proj.path === activeProject?.path)
      );
    const inActiveProject = findActiveIndex(true);
    const rowIndex = inActiveProject !== -1 ? inActiveProject : findActiveIndex(false);
    if (rowIndex === -1) return;
    const row = flatRows[rowIndex];
    if (row?.type === "session") {
      setFocusedSessionId(row.session.id);
      setFocusedWorktreePath(null);
      setFocusedProjectId(null);
    }
    listRef.current?.scrollToRow({ index: rowIndex, align: "auto", behavior: "smooth" });
  }, [flatRows, activeProject, listRef]);
  // Jump-to-top hard-scroll-up detector (Orca useWorktreeListScrollToTop parity):
  // Detects sustained or burst upward scroll gestures and displays a floating "Topo"
  // button that smoothly returns the virtual viewport to row 0.
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const showScrollToTopRef = useRef(false);
  const detectorRef = useRef<HardScrollUpDetectorState>(createHardScrollUpDetectorState());
  const idleTimerRef = useRef<number | null>(null);
  const scrollbarDragRef = useRef(false);
  const touchScrollRef = useRef(false);
  const suppressDetectionUntilRef = useRef(0);

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current !== null) {
      window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const publishVisible = useCallback((next: HardScrollUpDetectorState) => {
    detectorRef.current = next;
    if (showScrollToTopRef.current !== next.visible) {
      showScrollToTopRef.current = next.visible;
      setShowScrollToTop(next.visible);
    }
  }, []);

  const armIdleHide = useCallback(
    (element: HTMLElement, lastIntentAt: number) => {
      clearIdleTimer();
      const fireAt = lastIntentAt + HARD_SCROLL_UP.hideAfterIdleMs;
      const delayMs = Math.max(0, fireAt - window.performance.now());

      idleTimerRef.current = window.setTimeout(() => {
        idleTimerRef.current = null;
        const now = window.performance.now();

        if (now < suppressDetectionUntilRef.current) {
          publishVisible(createHardScrollUpDetectorState());
          return;
        }

        const maxScroll = Math.max(0, element.scrollHeight - element.clientHeight);
        const next = reduceHardScrollUpOnIdle(detectorRef.current, {
          scrollTop: element.scrollTop,
          maxScroll,
          t: now
        });
        if (next.visible && now - next.lastIntentAt >= HARD_SCROLL_UP.hideAfterIdleMs) {
          publishVisible(createHardScrollUpDetectorState());
          return;
        }
        publishVisible(next);
      }, delayMs);
    },
    [clearIdleTimer, publishVisible]
  );

  const applyDetectorResult = useCallback(
    (
      element: HTMLElement,
      previous: HardScrollUpDetectorState,
      next: HardScrollUpDetectorState
    ) => {
      publishVisible(next);
      if (!next.visible) {
        clearIdleTimer();
        return;
      }
      if (next.lastIntentAt !== previous.lastIntentAt) {
        armIdleHide(element, next.lastIntentAt);
      }
    },
    [armIdleHide, clearIdleTimer, publishVisible]
  );

  const handleScrollToTop = useCallback(() => {
    detectorRef.current = reduceHardScrollUpOnDismiss(detectorRef.current);
    clearIdleTimer();
    publishVisible(detectorRef.current);
    suppressDetectionUntilRef.current =
      window.performance.now() + HARD_SCROLL_UP.suppressAfterJumpMs;
    listRef.current?.scrollToRow({ index: 0, align: "auto", behavior: "smooth" });
  }, [clearIdleTimer, publishVisible, listRef]);

  useEffect(() => {
    const scrollElement = listRef.current?.element;
    if (!scrollElement || sidebarBody !== "workspaces") {
      clearIdleTimer();
      publishVisible(createHardScrollUpDetectorState());
      return;
    }

    const onWheel = (event: WheelEvent): void => {
      const now = window.performance.now();
      const maxScroll = Math.max(0, scrollElement.scrollHeight - scrollElement.clientHeight);
      const scrollTop = scrollElement.scrollTop;

      if (scrollTop <= HARD_SCROLL_UP.nearTopPx || maxScroll < HARD_SCROLL_UP.minScrollablePx) {
        publishVisible(createHardScrollUpDetectorState());
        clearIdleTimer();
        return;
      }

      if (now < suppressDetectionUntilRef.current) {
        return;
      }

      const previous = detectorRef.current;
      const next = reduceHardScrollUpOnWheel(previous, {
        scrollTop,
        maxScroll,
        t: now,
        deltaY: event.deltaY,
        deltaMode: event.deltaMode
      });
      applyDetectorResult(scrollElement, previous, next);
    };

    const onScroll = (): void => {
      const now = window.performance.now();
      const maxScroll = Math.max(0, scrollElement.scrollHeight - scrollElement.clientHeight);
      const scrollTop = scrollElement.scrollTop;

      if (scrollTop <= HARD_SCROLL_UP.nearTopPx || maxScroll < HARD_SCROLL_UP.minScrollablePx) {
        publishVisible(createHardScrollUpDetectorState());
        clearIdleTimer();
        return;
      }

      if (now < suppressDetectionUntilRef.current) {
        return;
      }

      if (!scrollbarDragRef.current && !touchScrollRef.current) {
        return;
      }

      const previous = detectorRef.current;
      const next = reduceHardScrollUpOnScroll(previous, {
        scrollTop,
        maxScroll,
        t: now
      });
      applyDetectorResult(scrollElement, previous, next);
    };

    const onPointerDown = (event: PointerEvent): void => {
      if (event.pointerType === "touch") {
        touchScrollRef.current = true;
        return;
      }
      const rect = scrollElement.getBoundingClientRect();
      const nativeScrollbarWidth = scrollElement.offsetWidth - scrollElement.clientWidth;
      const scrollbarHitWidth = Math.max(12, nativeScrollbarWidth);
      scrollbarDragRef.current =
        event.target === scrollElement && event.clientX >= rect.right - scrollbarHitWidth;
    };

    const onPointerEnd = (): void => {
      scrollbarDragRef.current = false;
      touchScrollRef.current = false;
    };

    scrollElement.addEventListener("wheel", onWheel, { passive: true });
    scrollElement.addEventListener("scroll", onScroll, { passive: true });
    scrollElement.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointerup", onPointerEnd, { passive: true });
    window.addEventListener("pointercancel", onPointerEnd, { passive: true });

    return () => {
      scrollElement.removeEventListener("wheel", onWheel);
      scrollElement.removeEventListener("scroll", onScroll);
      scrollElement.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerEnd);
      window.removeEventListener("pointercancel", onPointerEnd);
      onPointerEnd();
      clearIdleTimer();
    };
  }, [applyDetectorResult, clearIdleTimer, publishVisible, sidebarBody, displayProjects.length, projects.length, flatRows.length]);

  // Keyboard navigation — Orca worktree-keyboard-cycle semantics: arrows cycle with
  // wrap-around over the rows the projection rendered, Enter/Space activates the
  // focused row, F2 renames the focused session, Escape clears focus + batch selection.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isModalOpen) return;
      const target = e.target as HTMLElement;
      const isInputFocused = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || Boolean(target.isContentEditable);
      if (isInputFocused) return;

      const setFocus = (key: { type: "project" | "worktree" | "session"; id: string } | null) => {
        setFocusedSessionId(key?.type === "session" ? key.id : null);
        setFocusedWorktreePath(key?.type === "worktree" ? key.id : null);
        setFocusedProjectId(key?.type === "project" ? key.id : null);
      };

      // Escape: clear focus + clear batch selection (either sidebar body)
      if (e.key === "Escape") {
        e.preventDefault();
        setFocus(null);
        setSelectedSessions(new Set());
        return;
      }

      // The agents body owns its own keymap (SidebarAgentsList); this handler cycles
      // only the workspaces projection.
      if (sidebarBody !== "workspaces") return;

      const focused =
        (focusedSessionId && { type: "session" as const, id: focusedSessionId }) ||
        (focusedWorktreePath && { type: "worktree" as const, id: focusedWorktreePath }) ||
        (focusedProjectId && { type: "project" as const, id: focusedProjectId }) ||
        null;

      // Enter / Space: activate the focused row. The lookup runs against flatRows — the
      // row carries the objects (no id re-lookup), and a hidden/collapsed row is a no-op.
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (!focused) return;
        const row = flatRows.find(
          (r) =>
            (r.type === "session" && focused.type === "session" && r.session.id === focused.id) ||
            (r.type === "worktree" && focused.type === "worktree" && r.wt.path === focused.id) ||
            (r.type === "project-header" && focused.type === "project" && r.proj.id === focused.id)
        );
        if (!row) return;
        if (row.type === "session") onSelectSession(row.session.id);
        else if (row.type === "worktree") onSelectGitWorktree(row.wt);
        else if (row.type === "project-header") onSelectProject(row.proj);
        return;
      }

      // F2: Rename focused session
      if (e.key === "F2" && focusedSessionId) {
        e.preventDefault();
        const session = sessions.find((s) => s.id === focusedSessionId);
        if (session) {
          const newTitle = window.prompt("Enter new session title:", session.title);
          if (newTitle && newTitle.trim()) {
            invoke("save_session_record", { record: { id: session.id, project_path: session.project_path, title: newTitle.trim(), branch: session.branch, agent_name: session.agentName, executable: session.executable, created_at: Date.now(), updated_at: Date.now() } }).catch(console.error);
            // Parent App will handle the session update via the invoke callback
          }
        }
        return;
      }

      // Arrow cycling with wrap-around (Orca resolveCycledWorktreeId: at an edge the
      // cycle wraps; with no live focus, enter from the end the keypress points away from)
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const direction = e.key === "ArrowDown" ? "down" : "up";
        const next = resolveCycledFocusKey({ keys: focusableRows, focused, direction });
        if (!next) return;
        setFocus(next);
        // A virtualized viewport only paints focus rings on mounted rows — keep the
        // focused row visible (Orca: virtualizer.scrollToIndex with align auto).
        listRef.current?.scrollToRow({ index: next.rowIndex, align: "auto" });
        if (next.type === "session") onSelectNextSession?.(direction);
        return;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [flatRows, focusableRows, sidebarBody, isModalOpen, focusedSessionId, focusedWorktreePath, focusedProjectId, sessions, onSelectSession, onSelectGitWorktree, onSelectProject, onSelectNextSession, listRef]);

  // Row component for react-window virtualization
  const VirtualRow = ({ index, style, ariaAttributes }: RowComponentProps) => {
    const row = flatRows[index];
    if (!row) return null;
    // Common style for virtual row positioning
    const rowStyle: React.CSSProperties = { ...style, left: 0, right: 0, width: "100%" };

    if (row.type === "group-header") {
      const { group, count, isCollapsed, hasUnread = false } = row;
      const isGroupMenuOpen = activeGroupMenuId === group.id;
      // PR-12 (Orca Project Groups): decorative section header — like status-header it's
      // never keyboard-focusable (getFocusableRowKeys only emits project/worktree/session)
      // and never draggable (no drag handlers). Visual mirrors the project-header one
      // hierarchy step up: FolderTree icon, semibold label, session-count chip.
      return (
        <div
          style={rowStyle}
          {...ariaAttributes}
          className="px-2"
          onDragOver={(e) => {
            if (draggedProjectId) {
              e.preventDefault();
              setGroupDropTargetId(group.id);
            }
          }}
          onDragLeave={() => {
            if (groupDropTargetId === group.id) setGroupDropTargetId(null);
          }}
          onDrop={(e) => {
            if (draggedProjectId) {
              e.preventDefault();
              setGroupDropTargetId(null);
              window.dispatchEvent(
                new CustomEvent("hydra:move-project-to-group", {
                  detail: { projectId: draggedProjectId, groupId: group.id },
                })
              );
              setDraggedProjectId(null);
            }
          }}
        >
          <div
            onClick={() => toggleGroupCollapse(group.id)}
            title={isCollapsed ? "Expand group" : "Collapse group"}
            className={`group relative flex items-center justify-between px-2 py-1 rounded-lg cursor-pointer transition text-worktree-sidebar-foreground/80 border ${
              groupDropTargetId === group.id
                ? "border-emerald-500/80 bg-emerald-500/10 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                : "border-transparent hover:bg-worktree-sidebar-accent/50"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <FolderTree className="w-3.5 h-3.5 shrink-0 text-emerald-400/80" />
              {/* PR-16: dot agregado — algum membro (projeto/worktree/sessão) tem unread. */}
              {hasUnread && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 animate-pulse" title="Unread activity in this group" />}
              <span className="truncate text-[11px] font-bold uppercase tracking-wider text-worktree-sidebar-foreground/85">
                {group.name}
              </span>
              <span className="rounded-full border border-worktree-sidebar-border/80 bg-worktree-sidebar-accent/50 px-1.5 py-0.25 text-[9px] font-mono tabular-nums text-worktree-sidebar-foreground/70 shrink-0">
                {count}
              </span>
            </div>
            <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => toggleGroupCollapse(group.id)}
                title={isCollapsed ? "Expand group" : "Collapse group"}
                className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition cursor-pointer"
              >
                {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    setActiveGroupMenu((prev) =>
                      prev?.group.id === group.id
                        ? null
                        : { group, x: rect.right, y: rect.bottom + 4 }
                    );
                  }}
                  title="Group actions"
                  className={`p-1 rounded transition cursor-pointer ${isGroupMenuOpen ? "bg-neutral-800 text-white" : "text-neutral-400 hover:text-white hover:bg-neutral-800"}`}
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (row.type === "project-header") {
      const { proj, isActive, isCollapsed, isMenuOpen, inGroup } = row;
      return (
        <div style={rowStyle} {...ariaAttributes} className={`px-2 ${inGroup ? "pl-4" : ""}`} >
          <div
            draggable={true}
            onDragStart={(e) => handleProjectDragStart(e, proj.id)}
            onDragOver={(e) => handleProjectDragOver(e, proj.id)}
            onDrop={(e) => handleProjectDrop(e, proj.id)}
            onDragEnd={handleProjectDragEnd}
            onClick={() => onSelectProject(proj)}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onProjectContextMenu?.(e, proj);
            }}
            className={`group relative flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer transition ${
              draggedProjectId === proj.id ? "opacity-30" : ""
            } ${
              isActive
                ? "bg-worktree-sidebar-accent text-worktree-sidebar-accent-foreground border border-worktree-sidebar-border/60 font-medium shadow-xs"
                : "hover:bg-worktree-sidebar-accent/50 text-worktree-sidebar-foreground/80 border border-transparent"
            } ${focusedProjectId === proj.id ? "border-indigo-500/50 ring-indigo-500/20 bg-worktree-sidebar-accent/30" : ""}`}
          >
            {projectDropTarget?.id === proj.id && (
              <div
                className={`absolute left-1 right-1 h-[2px] bg-emerald-500 rounded-full z-20 pointer-events-none shadow-[0_0_8px_rgba(16,185,129,0.9)] ${
                  projectDropTarget.position === "top" ? "-top-0.5" : "-bottom-0.5"
                }`}
              />
            )}
            <div className="flex items-center gap-2 min-w-0">
              <GripVertical className="w-3 h-3 text-neutral-600 opacity-0 group-hover:opacity-60 hover:!opacity-100 cursor-grab active:cursor-grabbing shrink-0" />
              <FolderGit2 className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-emerald-400" : "text-neutral-500"}`} />
              {pinnedProjects?.has(proj.id) && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Pinned" />}
              {unreadProjects?.has(proj.id) && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 animate-pulse" title="Unread" />}
              {projectGroupMap?.[proj.id] && (() => { const g = projectGroups?.find((x) => x.id === projectGroupMap[proj.id]); return <span className="text-[8px] px-1 py-0.2 rounded bg-neutral-800 text-neutral-400 shrink-0 truncate max-w-[60px]" title={g?.name ?? projectGroupMap[proj.id]}>{(g?.name ?? projectGroupMap[proj.id]).slice(0,12)}</span>; })()}
              <span className="truncate text-[12px] font-semibold tracking-tight">{proj.name}</span>
            </div>
            <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => toggleProjectCollapse(proj.id)}
                title={isCollapsed ? "Expand workspaces" : "Collapse workspaces"}
                className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition cursor-pointer"
              >
                {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    setActiveProjectMenu((prev) =>
                      prev?.proj.id === proj.id
                        ? null
                        : { proj, x: rect.right, y: rect.bottom + 4 }
                    );
                  }}
                  title="Project actions"
                  className={`p-1 rounded transition cursor-pointer ${isMenuOpen ? "bg-neutral-800 text-white" : "text-neutral-400 hover:text-white hover:bg-neutral-800"}`}
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
              </div>
              <button onClick={() => { onSelectProject(proj); onOpenNewWorkspaceModal(proj); }} title={`New workspace for ${proj.name}`} className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition cursor-pointer"><Plus className="w-3.5 h-3.5 text-emerald-400" /></button>
            </div>
          </div>
        </div>
      );
    }

    if (row.type === "worktree") {
      const { wt, proj } = row;
      const isMain = wt.path === proj.path;
      const wtSessions = sessions.filter((s) => s.project_path === wt.path || (!s.project_path && isMain));
      return (
        // PR-16 (gap 2, Orca parity): um tree-step de padding-only (pl-4 = 16px,
        // alinha a surface do card com o ícone do project-header) em vez de
        // px-2 pl-6 + ml-2 + border-l (45px de conteúdo + trilho fragmentado).
        <div style={rowStyle} {...ariaAttributes} className="px-2 pl-4">
          <div
            draggable={true}
            onDragStart={(e) => handleWorktreeDragStart(e, wt.path)}
            onDragOver={(e) => handleWorktreeDragOver(e, wt.path)}
            onDrop={(e) => handleWorktreeDrop(e, wt.path)}
            onDragEnd={handleWorktreeDragEnd}
            onClick={() => onSelectGitWorktree(wt)}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onWorktreeContextMenu?.(e, wt, proj);
            }}
            className={`group relative ${compactCards ? "py-1.5 px-2 text-[11px]" : "p-2.5"} rounded-lg cursor-pointer worktree-sidebar-card-hover text-worktree-sidebar-foreground/80 hover:text-worktree-sidebar-foreground flex items-center justify-between transition-all border border-transparent ${
              draggedWorktreePath === wt.path ? "opacity-30" : ""
            } ${focusedWorktreePath === wt.path ? "border-indigo-500/50 ring-indigo-500/20 bg-worktree-sidebar-accent/30" : ""}`}
          >
            {worktreeDropTarget?.path === wt.path && (
              <div className={`absolute left-1 right-1 h-[2px] bg-emerald-500 rounded-full z-20 pointer-events-none shadow-[0_0_8px_rgba(16,185,129,0.9)] ${worktreeDropTarget.position === "top" ? "-top-0.5" : "-bottom-0.5"}`} />
            )}
            <div className="flex items-center gap-2 min-w-0">
              <GripVertical className="w-3 h-3 text-neutral-600 opacity-0 group-hover:opacity-60 hover:!opacity-100 cursor-grab active:cursor-grabbing shrink-0" />
              {pinnedWorktrees?.has(wt.path) && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Pinned" />}
              {unreadWorktrees?.has(wt.path) && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 animate-pulse" title="Unread" />}
              <GitBranch className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="truncate text-[11px] font-medium text-neutral-200" title={wt.branch || proj.name}>{wt.branch || proj.name}</span>
              {isMain && <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-900/40 border border-emerald-800/50 text-emerald-300 shrink-0 font-semibold">primary</span>}
              {wtSessions.length > 0 && <span className="text-[9px] px-1.5 py-0.2 rounded bg-neutral-800 border border-neutral-700 text-neutral-400 shrink-0 font-mono">{wtSessions.length} {wtSessions.length === 1 ? "agent" : "agents"}</span>}
              {formatAge(wt.created_at) && <span className="text-[9px] px-1 py-0.2 rounded bg-neutral-800/50 text-neutral-500 shrink-0 font-mono">{formatAge(wt.created_at)}</span>}
              {wt.status && <span className="text-[8px] px-1.5 py-0.5 rounded bg-red-900/30 border border-red-800/50 text-red-400 shrink-0" title={wt.status}>{wt.status}</span>}
            </div>
            {!isMain && (
              <button onClick={(e) => { e.stopPropagation(); onDeleteGitWorktree(wt, proj); }} title="Delete worktree from disk" className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-neutral-700 text-neutral-400 hover:text-red-400 transition cursor-pointer"><Trash2 className="w-3 h-3" /></button>
            )}
          </div>
        </div>
      );
    }

    if (row.type === "session") {
      const { session, proj, isNested } = row;
      const isActiveProject = proj.path === activeProject?.path;
      // PR-16 (gap 2): padding-only — as trilhas border-l por linha eram fragmentos
      // desalinhados; nested (sob worktree) dá um tree-step a mais que o card (~18px
      // Orca ⇒ pl-9), órfã/solta alinha com o worktree (pl-4).
      const indentClass = isNested ? "pl-9" : "pl-4";
      // Orca/manual parity: orphan session block sits below a hairline separator, after the
      // worktree lanes. In the flat viewport each row is its own container, so only the
      // first orphan of a consecutive run carries the divider.
      const prevRow = flatRows[index - 1];
      const isFirstOrphan = row.isOrphan && !(prevRow?.type === "session" && prevRow.isOrphan);
      const orphanDividerClass = isFirstOrphan ? "border-t border-worktree-sidebar-border/30 pt-1" : "";
      return (
        <div style={rowStyle} {...ariaAttributes} className={`px-2 ${indentClass} ${orphanDividerClass}`}>
          <div
            draggable={true}
            onDragStart={(e) => handleSessionDragStart(e, session.id)}
            onDragOver={(e) => handleSessionDragOver(e, session.id)}
            onDrop={(e) => handleSessionDrop(e, session.id)}
            onDragEnd={handleSessionDragEnd}
            onClick={(e) => handleSessionClick(e, session.id)}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSessionContextMenu?.(e, session);
            }}
            className={`group relative ${compactCards ? "py-1.5 px-2" : "p-2.5"} rounded-lg text-xs cursor-pointer select-none transition-all ${
              draggedSessionId === session.id ? "opacity-30 scale-[0.98]" : ""
            } ${
              session.active && isActiveProject
                ? "bg-worktree-sidebar-accent text-worktree-sidebar-accent-foreground border border-worktree-sidebar-border shadow-xs"
                : "worktree-sidebar-card-hover text-worktree-sidebar-foreground/70 hover:text-worktree-sidebar-foreground"
            } ${focusedSessionId === session.id ? "border-indigo-500/50 ring-indigo-500/20" : ""} ${
              selectedSessions.has(session.id) ? "bg-indigo-500/20 select-none" : ""
            }`}
          >
            {sessionDropTarget?.id === session.id && (
              <div className={`absolute left-1 right-1 h-[2px] bg-emerald-500 rounded-full z-20 pointer-events-none shadow-[0_0_8px_rgba(16,185,129,0.9)] ${sessionDropTarget.position === "top" ? "-top-0.5" : "-bottom-0.5"}`} />
            )}
            {session.active && isActiveProject && <div className="absolute left-0 top-2 bottom-2 w-[2px] bg-emerald-500 rounded-r" />}
            <div className="flex items-center justify-between mb-1 pl-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <GripVertical className="w-3 h-3 text-neutral-600 opacity-0 group-hover:opacity-60 hover:!opacity-100 cursor-grab active:cursor-grabbing shrink-0" />
                {(pinnedWorktrees?.has(session.id) || pinnedWorktrees?.has(session.project_path)) && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Pinned" />}
                {unreadWorktrees?.has(session.id) && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 animate-pulse" title="Unread" />}
                <SessionAgentIcon agentName={session.agentName} size={12} />
                <span className="font-medium truncate text-neutral-100 text-[11px]">{session.title}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className={`w-2 h-2 rounded-full shrink-0 ${session.state === "working" ? "bg-amber-400 animate-pulse" : session.state === "blocked" ? "bg-red-400 ring-2 ring-red-500/30" : session.state === "waiting" ? "bg-orange-400 animate-pulse" : session.state === "done" ? "bg-blue-400" : session.state === "idle" ? "bg-emerald-400" : "bg-neutral-500"}`} title={`Herdr State: ${session.state}`} />
                <button onClick={(e) => { e.stopPropagation(); onDeleteSession(session.id); }} className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-neutral-800 text-neutral-500 hover:text-red-400 transition"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] text-neutral-500 pl-1 font-mono">
              <span className="flex items-center gap-1 truncate"><GitBranch className="w-2.5 h-2.5 text-neutral-400" />{session.branch}</span>
              <span className="flex items-center gap-1">
                {formatAge(session.updated_at ?? session.created_at) && <span className="text-[9px] text-neutral-500 font-mono">{formatAge(session.updated_at ?? session.created_at)}</span>}
                <span className="flex items-center gap-1 text-neutral-400 text-[9px] bg-neutral-900 border border-neutral-800 px-1.5 py-0.2 rounded"><SessionAgentIcon agentName={session.agentName} size={10} />{session.agentName}</span>
              </span>
            </div>
          </div>
        </div>
      );
    }

    if (row.type === "hidden-pill") {
      const { hiddenCount } = row;
      return (
        <div style={rowStyle} {...ariaAttributes} className="px-2 pl-4">
          <button
            onClick={() => {
              setDisplayOptions({ groupBy: "repo", sortBy: "agent-activity", hideSleeping: false, hideDefaultBranch: false, hideAutomationCreated: false, hideCliCreated: false, hideDetachedHead: false });
            }}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-worktree-sidebar-border bg-worktree-sidebar-accent/30 text-[10px] font-medium text-worktree-sidebar-foreground/60 hover:text-worktree-sidebar-foreground hover:bg-worktree-sidebar-accent/50 hover:border-worktree-sidebar-border transition cursor-pointer"
            title="Clear filters to show hidden worktrees"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400/60" />
            <span>{hiddenCount} hidden {hiddenCount === 1 ? "worktree" : "worktrees"}</span>
            <span className="text-[9px] text-worktree-sidebar-foreground/40">— click to show</span>
          </button>
        </div>
      );
    }

    if (row.type === "empty") {
      return (
        <div style={rowStyle} {...ariaAttributes} className="px-2 pl-4">
          <div className="py-2 px-2 text-[11px] text-neutral-600 italic">No active worktrees in this project.</div>
        </div>
      );
    }

    if (row.type === "status-header") {
      return (
        <div style={rowStyle} {...ariaAttributes} className="px-2">
          <div className="flex items-center gap-2 px-1 py-0.5 text-[10px] font-semibold uppercase tracking-[0.05em] text-worktree-sidebar-foreground/50">
            <span className={`inline-flex size-3 shrink-0 items-center justify-center ${STATUS_HEADER_DOT[row.state]} rounded`} />
            <span className="truncate">{STATUS_HEADER_LABEL[row.state]}</span>
            <span className="ml-auto rounded-full border border-worktree-sidebar-border/80 bg-worktree-sidebar-accent/50 px-1.5 py-0.25 text-[9px] font-mono tabular-nums text-worktree-sidebar-foreground/70">
              {row.count}
            </span>
          </div>
        </div>
      );
    }

    return null;
  };

  const sidebarTintStyle = (() => {
    if (settings?.left_sidebar_appearance_mode === "tinted" && settings.left_sidebar_tint_color) {
      const color = settings.left_sidebar_tint_color;
      const opacity = settings.left_sidebar_tint_opacity ?? 0.1;
      return { backgroundColor: `color-mix(in srgb, ${color} ${Math.round(opacity * 100)}%, #121316)` } as const;
    }
    return {};
  })();

  return (
    <div className="flex flex-col h-full bg-worktree-sidebar select-none relative font-sans text-worktree-sidebar-foreground" style={sidebarTintStyle}>
      {/* 1. TOP NAV STRIP — Orca SidebarNav.tsx parity (Search, Tasks, Automations, Agent Dashboard, Orca Mobile) */}
      <SidebarNav
        onOpenCommandPalette={() => window.dispatchEvent(new CustomEvent("hydra:open-command-palette"))}
      />
      <div className="h-px bg-worktree-sidebar-border mx-3 my-1" />

      {/* 2. SIDEBAR HEADER (Orca SidebarHeader.tsx with Bell toggle) */}
      <SidebarHeader
        sidebarBody={sidebarBody}
        setSidebarBody={setSidebarBody}
        onOpenAddRepoDialog={onOpenAddRepoDialog}
        onOpenNewWorkspaceModal={onOpenNewWorkspaceModal}
        optionsButtonRef={optionsButtonRef}
        optionsMenuOpen={optionsMenuOpen}
        setOptionsMenuOpen={setOptionsMenuOpen}
        projects={projects}
      />

      {/* 3. Filter Search Bar - only show in workspaces view */}
      {sidebarBody === "workspaces" && (
        <div className="p-2 shrink-0">
          <div className="relative">
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              onKeyDown={(e) => {
                // Orca SidebarFilter pattern: Escape clears a non-empty query
                // first; with an empty query it just leaves the field. (The
                // window-level sidebar keymap ignores INPUT targets already.)
                if (e.key !== "Escape") return;
                e.stopPropagation();
                if (filter) {
                  setFilter("");
                } else {
                  e.currentTarget.blur();
                }
              }}
              placeholder="Filter projects and workspaces..."
              className="w-full bg-worktree-sidebar-accent/50 border border-worktree-sidebar-border rounded-md pl-2.5 pr-7 py-1 text-[11px] text-worktree-sidebar-foreground placeholder:text-worktree-sidebar-foreground/40 focus:outline-none focus:ring-1 focus:ring-worktree-sidebar-ring"
            />
            {filter ? (
              <button
                type="button"
                onClick={() => setFilter("")}
                aria-label="Clear filter"
                title="Clear filter"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex size-4 items-center justify-center rounded-sm text-worktree-sidebar-foreground/50 hover:text-worktree-sidebar-foreground hover:bg-worktree-sidebar-accent transition cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-worktree-sidebar-ring"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            ) : null}
          </div>
        </div>
      )}

      {/* 4. MAIN CONTENT AREA - Conditional: Workspaces Tree OR Agents List — always virtualized (Orca single viewport) */}
      {sidebarBody === "workspaces" ? (
        displayProjects.length === 0 ? (
          projects.length === 0 ? (
            <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-3">
              <div className="p-6 text-center text-neutral-500 text-xs space-y-3">
                <p className="text-neutral-400 font-medium">No projects added yet.</p>
                <p className="text-[11px] text-neutral-500">Add an existing project from disk to begin working with agents.</p>
                <button
                  onClick={onOpenAddRepoDialog}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-medium transition cursor-pointer"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>Add Existing Project</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-3">
              <div className="p-6 text-center text-neutral-500 text-xs space-y-3">
                <p className="text-neutral-400 font-medium">No projects match filter.</p>
                <p className="text-[11px] text-neutral-500">Clear Projects filter in Workspace options → Show.</p>
                <button
                  onClick={() => setDisplayOptions({ ...displayOptions, filterProjectIds: [] })}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-accent hover:bg-accent/80 text-foreground text-[11px] font-medium transition cursor-pointer border border-border"
                >
                  Clear filter
                </button>
              </div>
            </div>
          )
        ) : (
          <div className="relative flex-1 min-h-0 overflow-hidden">
            <List
              listRef={listRef}
              rowCount={flatRows.length}
              rowHeight={getRowHeight}
              rowComponent={VirtualRow}
              rowProps={{}}
              style={{ height: "100%", width: "100%" }}
              className="py-2"
              overscanCount={8}
            />
            {showScrollToTop && (
              <div className="pointer-events-none absolute bottom-3 right-3 z-30 flex items-center">
                <button
                  type="button"
                  onClick={handleScrollToTop}
                  className="pointer-events-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-worktree-sidebar-accent/90 hover:bg-worktree-sidebar-accent text-worktree-sidebar-foreground text-[11px] font-medium shadow-md border border-worktree-sidebar-border backdrop-blur-sm transition-all duration-150 animate-in fade-in-0 slide-in-from-bottom-2 cursor-pointer"
                  aria-label="Scroll to top"
                  title="Scroll to top"
                >
                  <ChevronsUp className="w-3.5 h-3.5 text-worktree-sidebar-foreground/70" />
                  <span>Topo</span>
                </button>
              </div>
            )}
          </div>
        )
      ) : (
        <SidebarAgentsList
          sessions={sessions}
          projects={projects}
          onSelectSession={onSelectSession}
          onDeleteSession={onDeleteSession}
          compactCards={compactCards}
          isModalOpen={isModalOpen}
          groupBy={agentsGroupBy}
          onGroupByChange={setAgentsGroupBy}
          statusFilter={agentsStatusFilter}
          onStatusFilterChange={setAgentsStatusFilter}
        />
      )}

      {/* 5. Orca Workspace Options Menu Overlay com ancoragem precisa */}
      <WorkspaceOptionsMenu
        isOpen={optionsMenuOpen}
        triggerRef={optionsButtonRef}
        options={displayOptions}
        projects={projects}
        onClose={() => setOptionsMenuOpen(false)}
        onOptionsChange={setDisplayOptions}
      />

      {/* 5b. Batch delete bar — only for explicit multi-select (Ctrl/Shift), never on single click */}
      {selectedSessions.size > 1 && (
        <div className="border-t border-red-500/20 bg-red-500/5 px-3 py-2 flex items-center justify-between text-[11px] shrink-0">
          <span className="text-red-300 font-medium">{selectedSessions.size} selected</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSelectedSessions(new Set())}
              className="px-2 py-1 rounded text-worktree-sidebar-foreground/60 hover:bg-worktree-sidebar-accent hover:text-worktree-sidebar-foreground transition cursor-pointer"
            >
              Clear
            </button>
            <button
              onClick={() => {
                selectedSessions.forEach((id) => onDeleteSession(id));
                setSelectedSessions(new Set());
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/20 transition cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      )}

      {/* 6. Orca Sidebar Footer — reveal-to-current only exists in the workspaces body */}
      <SidebarFooter
        appVersion={appVersion}
        gitStatus={gitStatus}
        onOpenSettings={onOpenSettings}
        onRevealCurrent={sidebarBody === "workspaces" ? handleRevealCurrent : undefined}
      />

      {/* Project Group Modals (Orca Parity) */}
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

      {/* Fixed Floating Menus — 100% opaque bg-[#141518], z-[99999] outside virtualized viewport */}
      {activeGroupMenu && (
        <>
          <div
            className="fixed inset-0 z-[99998]"
            onClick={() => setActiveGroupMenu(null)}
            onContextMenu={(e) => { e.preventDefault(); setActiveGroupMenu(null); }}
          />
          <div
            style={{
              position: "fixed",
              top: Math.min(window.innerHeight - 150, activeGroupMenu.y),
              left: Math.max(10, Math.min(window.innerWidth - 210, activeGroupMenu.x - 192)),
              zIndex: 99999,
            }}
            className="w-48 rounded-xl bg-[#141518] border border-[#2a2b30] shadow-2xl p-1.5 text-xs space-y-0.5 text-neutral-200 select-none animate-in fade-in-0 zoom-in-95 duration-100"
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
                  confirmLabel: "Save",
                  onSubmit: (name) => {
                    window.dispatchEvent(
                      new CustomEvent("hydra:rename-project-group", {
                        detail: { id: group.id, name },
                      })
                    );
                  },
                });
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-neutral-800 text-neutral-200 text-left transition cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5 text-neutral-400" />
              <span className="text-[11px]">Rename Group</span>
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
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-red-500/10 text-red-400 text-left transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="text-[11px]">Delete Group</span>
            </button>
          </div>
        </>
      )}

      {activeProjectMenu && (
        <>
          <div
            className="fixed inset-0 z-[99998]"
            onClick={() => setActiveProjectMenu(null)}
            onContextMenu={(e) => { e.preventDefault(); setActiveProjectMenu(null); }}
          />
          <div
            style={{
              position: "fixed",
              top: Math.min(window.innerHeight - 340, activeProjectMenu.y),
              left: Math.max(10, Math.min(window.innerWidth - 240, activeProjectMenu.x - 224)),
              zIndex: 99999,
            }}
            className="w-56 rounded-xl bg-[#141518] border border-[#2a2b30] shadow-2xl p-1.5 text-xs space-y-0.5 text-neutral-200 select-none max-h-[80vh] overflow-y-auto animate-in fade-in-0 zoom-in-95 duration-100"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setActiveProjectMenu(null);
                onOpenSettings();
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-neutral-800 text-neutral-200 text-left transition cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-neutral-400" />
              <span className="text-[11px]">Project Settings</span>
            </button>
            <button
              onClick={async () => {
                const proj = activeProjectMenu.proj;
                setActiveProjectMenu(null);
                const cur = (proj.worktree_base_path ?? "") as string;
                const input = window.prompt(
                  "Worktree base path (relative to project or absolute).\nEx: .worktrees  ou  /home/you/src/worktrees\nLeave empty to use global workspaceDir:",
                  cur
                );
                if (input === null) return;
                const trimmed = input.trim();
                try {
                  await invoke("set_project_worktree_base", {
                    path: proj.path,
                    basePath: trimmed ? trimmed : null,
                  });
                  window.dispatchEvent(new CustomEvent("hydra:refresh-projects"));
                } catch (e) {
                  console.error(e);
                }
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-neutral-800 text-neutral-200 text-left transition cursor-pointer"
            >
              <FolderTree className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px]">Configured Base Path...</span>
            </button>
            <button
              onClick={() => {
                const proj = activeProjectMenu.proj;
                setActiveProjectMenu(null);
                navigator.clipboard.writeText(proj.path);
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-neutral-800 text-neutral-200 text-left transition cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-neutral-400" />
              <span className="text-[11px]">Copy Project Path</span>
            </button>
            <button
              onClick={() => {
                const proj = activeProjectMenu.proj;
                setActiveProjectMenu(null);
                onOpenNewWorkspaceModal(proj);
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-neutral-800 text-neutral-200 text-left transition cursor-pointer"
            >
              <FolderTree className="w-3.5 h-3.5 text-neutral-400" />
              <span className="text-[11px]">New Worktree from Project</span>
            </button>

            <div className="h-px bg-neutral-800 my-1" />

            <button
              onClick={() => {
                const proj = activeProjectMenu.proj;
                setActiveProjectMenu(null);
                setGroupNameDialog({
                  open: true,
                  title: "New Project Group",
                  description: "Create a group to organize projects in your sidebar.",
                  initialName: `${proj.name} group`,
                  confirmLabel: "Create Group",
                  onSubmit: (name) => {
                    window.dispatchEvent(
                      new CustomEvent("hydra:create-project-group", {
                        detail: { name, projectId: proj.id },
                      })
                    );
                  },
                });
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-neutral-800 text-neutral-200 text-left transition cursor-pointer"
            >
              <FolderPlus className="w-3.5 h-3.5 text-neutral-400" />
              <span className="text-[11px]">New group from project</span>
            </button>

            {projectGroups && projectGroups.length > 0 && (
              <div className="pt-0.5 pb-0.5">
                <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                  Move to group
                </div>
                {projectGroups.map((g) => {
                  const proj = activeProjectMenu.proj;
                  const isCur = projectGroupMap?.[proj.id] === g.id;
                  return (
                    <button
                      key={g.id}
                      disabled={isCur}
                      onClick={() => {
                        setActiveProjectMenu(null);
                        window.dispatchEvent(
                          new CustomEvent("hydra:move-project-to-group", {
                            detail: { projectId: proj.id, groupId: g.id },
                          })
                        );
                      }}
                      className={`w-full flex items-center gap-2 px-2.5 py-1 rounded-lg text-left text-[11px] transition ${
                        isCur
                          ? "opacity-40 cursor-default text-neutral-500"
                          : "hover:bg-neutral-800 text-neutral-300 cursor-pointer"
                      }`}
                    >
                      <FolderInput className="w-3 h-3 text-neutral-400 shrink-0" />
                      <span className="truncate">{g.name}</span>
                    </button>
                  );
                })}
              </div>
            )}

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
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-neutral-800 text-neutral-200 text-left transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5 text-neutral-400" />
                <span className="text-[11px]">Remove from group</span>
              </button>
            )}

            <div className="h-px bg-neutral-800 my-1" />

            <button
              onClick={() => {
                const proj = activeProjectMenu.proj;
                setActiveProjectMenu(null);
                onRemoveProject(proj);
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-red-500/10 text-red-400 text-left transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="text-[11px]">Remove Project</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
