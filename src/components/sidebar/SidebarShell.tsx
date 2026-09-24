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
  FolderTree,
  GripVertical,
  Terminal
} from "lucide-react";
import { WorkspaceOptionsMenu, type WorkspaceDisplayOptions } from "./WorkspaceOptionsMenu";
import { SidebarHeader } from "./SidebarHeader";
import { SidebarAgentsList } from "./SidebarAgentsList";
import { SidebarNav } from "./SidebarNav";
import { AgentBrandIcon } from "../AgentIcon";
import { SidebarFooter } from "./SidebarFooter";
import type { HydraProject, GitWorktreeInfo, WorktreeSession, WorktreeSidebarProps } from "./types";
import { IDLE, resolveSessionAttention, resolveWorktreeAttention, type SessionAttention, type SessionAttentionInput } from "../../lib/smart-attention";
import { buildSidebarRows } from "./worktree-list/buildSidebarRows";
import {
  createSidebarDragPreview,
  isSidebarPointerDragBlocked,
  setSidebarPointerDragDocumentStyles,
  updateSidebarDragPreviewPosition,
} from "./worktree-list/pointer-drag-dom";
import type { SidebarRow, SidebarStatusState } from "./worktree-list/types";
import { getFocusableRowKeys, resolveCycledFocusKey } from "./worktree-list/keyboard-cycle";

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
}: WorktreeSidebarProps) {
  const [filter, setFilter] = useState("");
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set());
  const [focusedSessionId, setFocusedSessionId] = useState<string | null>(null);
  const [activeProjectMenuId, setActiveProjectMenuId] = useState<string | null>(null);
  const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);
  const [sidebarBody, setSidebarBody] = useState<"workspaces" | "agents">("workspaces");
  const [focusedWorktreePath, setFocusedWorktreePath] = useState<string | null>(null);
  const [focusedProjectId, setFocusedProjectId] = useState<string | null>(null);
  
  // Ref para ancoragem exata do botão SlidersHorizontal
  const optionsButtonRef = useRef<HTMLButtonElement | null>(null);

  const [displayOptions, setDisplayOptions] = useState<WorkspaceDisplayOptions>(() => {
    try {
      const saved = localStorage.getItem("hydra:display_options");
      if (saved) {
        const parsed = JSON.parse(saved) as WorkspaceDisplayOptions;
        // Ensure filterProjectIds is array
        if (!Array.isArray(parsed.filterProjectIds)) parsed.filterProjectIds = [];
        return parsed;
      }
    } catch {}
    return {
      groupBy: "repo",
      sortBy: "agent-activity",
      hideSleeping: false,
      hideDefaultBranch: false,
      hideAutomationCreated: false,
      hideCliCreated: false,
      hideDetachedHead: false,
      filterProjectIds: [],
    };
  });
  useEffect(() => {
    try {
      localStorage.setItem("hydra:display_options", JSON.stringify(displayOptions));
    } catch {}
  }, [displayOptions]);

  const displayProjects = useMemo(() => {
    if (!displayOptions.filterProjectIds?.length) return projects;
    return projects.filter((p) => displayOptions.filterProjectIds!.includes(p.id));
  }, [projects, displayOptions.filterProjectIds]);

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
      setActiveProjectMenuId(null);
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
    [displayProjects, projects, sessions, gitWorktrees, worktreesByProject, getWorktreesForProject, activeProject, collapsedProjects, activeProjectMenuId, filter, sidebarBody, displayOptions, isDefaultBranchWt, isDetachedHeadWt, isAutomationCreatedWt, isCliCreatedWt, isSleepingWorktree, sortWorktreesByOption, sortSessionsByOption]
  );

  const getRowHeight = useCallback(
    (index: number) => {
      const row = flatRows[index];
      if (!row) return 40;
      if (row.type === "status-header") return 28;
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

    if (row.type === "project-header") {
      const { proj, isActive, isCollapsed, isMenuOpen } = row;
      return (
        <div style={rowStyle} {...ariaAttributes} className="px-2" >
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
                    setActiveProjectMenuId(isMenuOpen ? null : proj.id);
                  }}
                  title="Project actions"
                  className={`p-1 rounded transition cursor-pointer ${isMenuOpen ? "bg-neutral-800 text-white" : "text-neutral-400 hover:text-white hover:bg-neutral-800"}`}
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
                {isMenuOpen && (
                  <div className="absolute right-0 top-7 w-56 rounded-xl bg-popover border border-border p-1.5 shadow-2xl z-50 text-xs space-y-0.5 text-popover-foreground" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => { setActiveProjectMenuId(null); onOpenSettings(); }} className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-muted text-popover-foreground text-left transition cursor-pointer"><Sliders className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-[11px]">Project Settings</span></button>
                    <button onClick={async () => { setActiveProjectMenuId(null); const cur = (proj.worktree_base_path ?? "") as string; const input = window.prompt("Worktree base path (relative to project or absolute).\nEx: .worktrees  ou  /home/you/src/worktrees\nLeave empty to use global workspaceDir:", cur); if (input === null) return; const trimmed = input.trim(); try { await invoke("set_project_worktree_base", { path: proj.path, basePath: trimmed ? trimmed : null }); window.dispatchEvent(new CustomEvent("hydra:refresh-projects")); } catch (e) { console.error(e); } }} className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-neutral-800 text-neutral-200 text-left transition cursor-pointer"><FolderTree className="w-3.5 h-3.5 text-emerald-400" /><span className="text-[11px]">Worktree Base: {proj.worktree_base_path || "global"}</span></button>
                    <button onClick={() => { setActiveProjectMenuId(null); navigator.clipboard.writeText(proj.path); }} className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-neutral-800 text-neutral-200 text-left transition cursor-pointer"><Copy className="w-3.5 h-3.5 text-neutral-400" /><span className="text-[11px]">Copy Project Path</span></button>
                    <button onClick={() => { setActiveProjectMenuId(null); onOpenNewWorkspaceModal(proj); }} className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-neutral-800 text-neutral-200 text-left transition cursor-pointer"><FolderTree className="w-3.5 h-3.5 text-neutral-400" /><span className="text-[11px]">New Worktree from Project</span></button>
                    <div className="h-px bg-border my-1" />
                    <button onClick={() => { setActiveProjectMenuId(null); onRemoveProject(proj); }} className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-red-500/10 text-red-400 text-left transition cursor-pointer"><Trash2 className="w-3.5 h-3.5" /><span className="text-[11px]">Remove Project</span></button>
                  </div>
                )}
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
        <div style={rowStyle} {...ariaAttributes} className="px-2 pl-6">
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
            className={`group relative ${compactCards ? "py-1.5 px-2 text-[11px]" : "p-2.5"} rounded-lg cursor-pointer worktree-sidebar-card-hover text-worktree-sidebar-foreground/80 hover:text-worktree-sidebar-foreground flex items-center justify-between transition-all ml-2 border-l border-worktree-sidebar-border pl-3 ${
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
              <button onClick={(e) => { e.stopPropagation(); onDeleteGitWorktree(wt); }} title="Delete worktree from disk" className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-neutral-700 text-neutral-400 hover:text-red-400 transition"><Trash2 className="w-3 h-3" /></button>
            )}
          </div>
        </div>
      );
    }

    if (row.type === "session") {
      const { session, proj, isNested } = row;
      const isActiveProject = proj.path === activeProject?.path;
      const indentClass = isNested ? "ml-8 pl-2 border-l border-worktree-sidebar-border/40" : "ml-6 pl-2 border-l border-worktree-sidebar-border";
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
        <div style={rowStyle} {...ariaAttributes} className="px-2 pl-6">
          <button
            onClick={() => {
              setDisplayOptions({ groupBy: "repo", sortBy: "agent-activity", hideSleeping: false, hideDefaultBranch: false, hideAutomationCreated: false, hideCliCreated: false, hideDetachedHead: false });
            }}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-worktree-sidebar-border bg-worktree-sidebar-accent/30 text-[10px] font-medium text-worktree-sidebar-foreground/60 hover:text-worktree-sidebar-foreground hover:bg-worktree-sidebar-accent/50 hover:border-worktree-sidebar-border transition cursor-pointer ml-2"
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
        <div style={rowStyle} {...ariaAttributes} className="px-2 pl-6">
          <div className="py-2 px-2 text-[11px] text-neutral-600 italic ml-2 border-l border-worktree-sidebar-border pl-3">No active worktrees in this project.</div>
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
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter projects and workspaces..."
            className="w-full bg-worktree-sidebar-accent/50 border border-worktree-sidebar-border rounded-md px-2.5 py-1 text-[11px] text-worktree-sidebar-foreground placeholder:text-worktree-sidebar-foreground/40 focus:outline-none focus:ring-1 focus:ring-worktree-sidebar-ring"
          />
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
          <div className="flex-1 min-h-0 overflow-hidden">
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
    </div>
  );
}
