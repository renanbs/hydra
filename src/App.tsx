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
import type { WorkspaceDisplayOptions } from "./components/sidebar/WorkspaceOptionsMenu";
import { AddRepoDialog } from "./components/sidebar/AddRepoDialog";
import { WorkbenchTabBar, type TabItem, type SplitPane, RUNNING_CLOSE_PROBE_TIMEOUT_MS, SHELL_EXECUTABLES, TAB_COLORS } from "./components/workbench/WorkbenchTabBar";
import {
  RunningTerminalCloseDialog,
  type RunningTerminalCloseConfirmRequest,
  type CloseTerminalDialogCopyKind,
} from "./components/RunningTerminalCloseDialog";
import { SplitTerminalGrid } from "./components/workbench/SplitTerminalGrid";
import { PairingModal } from "./components/PairingModal";
import { SettingsModal } from "./components/SettingsModal";
import type { HydraSettings } from "./shared/settings-types";
import { DEFAULT_HYDRA_SETTINGS, normalizeHydraSettings, DEFAULT_OPEN_IN_APPLICATIONS } from "./shared/settings-types";
import { applyDocumentTheme } from "./lib/document-theme";
import { CommandPalette } from "./components/CommandPalette";
import { WorktreeJumpPalette } from "./components/WorktreeJumpPalette";
import { RecentTabSwitcher } from "./components/workbench/RecentTabSwitcher";
import { buildTerminalQuickCommandItems } from "./components/workbench/TerminalQuickCommandsSubmenu";
import { resolveLeftSidebarStyleVariables } from "./lib/left-sidebar-appearance";
import { CustomContextMenu, type ContextMenuItem } from "./components/CustomContextMenu";
import { NewWorkspaceComposer } from "./components/NewWorkspaceComposer";
import { DeleteWorktreeDialog, type DeleteWorktreeDialogState } from "./components/DeleteWorktreeDialog";
import { PromptDialog, type PromptDialogProps } from "./components/PromptDialog";
import { ParentPickerModal, type ParentCandidate } from "./components/sidebar/ParentPickerModal";
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
  Kanban,
} from "lucide-react";
import { RightSidebar } from "./components/right-sidebar/RightSidebar";
import "./App.css";

const MOCK_ORIGINAL = `fn main() {
    println!("Hello from Hydra Core");
}`;

const MOCK_MODIFIED = `fn main() {
    // High-performance Herdr shadow buffer with zero UI leakage
    println!("Hello from Hydra ADE (Autonomous Development Environment)");
}`;

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

function asProjectGroupsPref(value: unknown): Array<{ id: string; name: string }> | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter(
    (g): g is { id: string; name: string } =>
      !!g && typeof g === "object" && "id" in g && typeof g.id === "string" && "name" in g && typeof g.name === "string"
  );
}

function normalizeDisplayOptionsPref(value: unknown): WorkspaceDisplayOptions | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  // Boundary: object-ness já guardada acima; cada campo é validado antes do uso e o
  // resultado é um objeto fresco (nunca o blob mutado). filterProjectIds preenche
  // ausente/malformado com [] — mesma guarda do reader antigo do Shell.
  const src = value as Record<keyof WorkspaceDisplayOptions, unknown>;
  const { groupBy, sortBy, hideSleeping, hideDefaultBranch, hideAutomationCreated, hideCliCreated, hideDetachedHead } = src;
  if (groupBy !== "none" && groupBy !== "workspace-status" && groupBy !== "repo") return undefined;
  if (sortBy !== "agent-activity" && sortBy !== "name" && sortBy !== "recent") return undefined;
  if (
    typeof hideSleeping !== "boolean" || typeof hideDefaultBranch !== "boolean" ||
    typeof hideAutomationCreated !== "boolean" || typeof hideCliCreated !== "boolean" ||
    typeof hideDetachedHead !== "boolean"
  ) {
    return undefined;
  }
  return {
    groupBy,
    sortBy,
    hideSleeping,
    hideDefaultBranch,
    hideAutomationCreated,
    hideCliCreated,
    hideDetachedHead,
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
  const displayOptions = normalizeDisplayOptionsPref(src.displayOptions);
  if (displayOptions) out.displayOptions = displayOptions;
  if (
    src.agentsReadFilter === "all" || src.agentsReadFilter === "blocked" ||
    src.agentsReadFilter === "waiting" || src.agentsReadFilter === "working" ||
    src.agentsReadFilter === "done" || src.agentsReadFilter === "idle"
  ) {
    out.agentsReadFilter = src.agentsReadFilter;
  }
  if (src.agentsGroupBy === "state" || src.agentsGroupBy === "project") out.agentsGroupBy = src.agentsGroupBy;
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

export default function App() {
  const [status, setStatus] = useState("Initializing...");
  const [isPairingOpen, setIsPairingOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddRepoOpen, setIsAddRepoOpen] = useState(false);
  const [isNewWorkspaceOpen, setIsNewWorkspaceOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isJumpPaletteOpen, setIsJumpPaletteOpen] = useState(false);
  const [recentlyClosedTabs, setRecentlyClosedTabs] = useState<TabItem[]>([]);
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
  const [diffOriginal, setDiffOriginal] = useState(MOCK_ORIGINAL);
  const [diffModified, setDiffModified] = useState(MOCK_MODIFIED);
  const [previewLanguage, setPreviewLanguage] = useState("rust");
  const [fileTabContents, setFileTabContents] = useState<Record<string, { original: string; modified: string; lang: string }>>({});
  const [promptInput, setPromptInput] = useState("");
  const [availableAgents, setAvailableAgents] = useState<AvailableAgent[]>([]);
  const [projects, setProjects] = useState<HydraProject[]>([]);
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
  // Single tint source fix: leftSidebarStyle kept only for WindowTitlebar header continuity; outer aside uses WorktreeSidebar inner color-mix (12a73e2)
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
  } | null>(null);

  // Orca parity: dedicated DeleteWorktreeDialog state (openModal('delete-worktree')).
  const [deleteWorktreeModal, setDeleteWorktreeModal] = useState<{
    repoPath: string;
    worktrees: GitWorktreeInfo[];
    error: string | null;
  } | null>(null);
  const [deleteStateByWorktreeId, setDeleteStateByWorktreeId] = useState<DeleteWorktreeDialogState>({});
  const [dirtyChangeCountsByWorktreeId, setDirtyChangeCountsByWorktreeId] = useState<Record<string, number | null>>({});
  // Non-blocking prompt & picker dialogs (replaces window.prompt to prevent WebKitGTK / Wayland freezes)
  const [promptDialog, setPromptDialog] = useState<Omit<PromptDialogProps, "onOpenChange"> | null>(null);
  const [parentPickerModal, setParentPickerModal] = useState<{
    targetName: string;
    currentParentPath?: string | null;
    candidates: ParentCandidate[];
    onSelect: (path: string) => void;
    onRemoveParent?: () => void;
  } | null>(null);


  // PR-14: pinned/unread/groups migraram do localStorage para o SQLite
  // (sidebar_prefs, key "ui.sidebar"). Defaults até a hidratação assíncrona
  // completar (mesmo padrão do layout hydration abaixo). worktree_lineage segue
  // em localStorage — fora do escopo do PR-14.
  const [pinnedProjects, setPinnedProjects] = useState<Set<string>>(new Set());
  const [unreadProjects, setUnreadProjects] = useState<Set<string>>(new Set());
  const [pinnedWorktrees, setPinnedWorktrees] = useState<Set<string>>(new Set());
  const [unreadWorktrees, setUnreadWorktrees] = useState<Set<string>>(new Set());
  const [projectGroups, setProjectGroups] = useState<Array<{ id: string; name: string }>>([]);
  const [projectGroupMap, setProjectGroupMap] = useState<Record<string, string>>({});
  const [worktreeLineage, setWorktreeLineage] = useState<Record<string, string>>(() => {
    try { const v = localStorage.getItem("hydra:worktree_lineage"); return v ? JSON.parse(v) : {}; } catch { return {}; }
  });
  const persistLineage = (m: Record<string, string>) => { try { localStorage.setItem("hydra:worktree_lineage", JSON.stringify(m)); } catch {} };

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
    snap.projectGroups = projectGroups;
    snap.projectGroupMap = projectGroupMap;
    scheduleSidebarPrefsSave();
  }, [pinnedProjects, unreadProjects, pinnedWorktrees, unreadWorktrees, projectGroups, projectGroupMap, scheduleSidebarPrefsSave]);

  // Fatia Shell-owned (body/collapsed/displayOptions/agents*) sobe por este callback.
  const handleSidebarPrefsChange = useCallback((prefs: SidebarShellPrefs) => {
    const snap = sidebarPrefsRef.current;
    snap.sidebarBody = prefs.sidebarBody;
    snap.collapsedProjects = prefs.collapsedProjects;
    snap.collapsedGroups = prefs.collapsedGroups;
    snap.displayOptions = prefs.displayOptions;
    snap.agentsReadFilter = prefs.agentsReadFilter;
    snap.agentsGroupBy = prefs.agentsGroupBy;
    scheduleSidebarPrefsSave();
  }, [scheduleSidebarPrefsSave]);

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
  const [activeTabId, setActiveTabId] = useState("");
  const activeTabIdRef = useRef(activeTabId);
  activeTabIdRef.current = activeTabId;
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
      return tab.splitSessionIds.map((sid) => ({ sessionId: sid, executable: tab.executable, cwd: tab.cwd }));
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



  const [_messages, setMessages] = useState<Array<{ id: number; role: string; content: string }>>([
    {
      id: 1,
      role: "agent",
      content: "Hydra ADE initialized. Workspace switcher, Command Palette and live PTY active."
    }
  ]);

  // Orca parity: left panel resizes via useSidebarResize — rAF drag drafts go
  // straight to the DOM (containerRef), state commits only on mouseup.
  // PR-13 encaixe: o titlebar-left acompanha o draft de width ao vivo (sem
  // re-render) — o WindowTitlebar aplica este ref no div titlebar-left.
  const leftTitlebarRef = useRef<HTMLDivElement | null>(null);
  const onLeftSidebarDraftWidthChange = useCallback((width: number) => {
    leftSidebarWidthRef.current = width;
    leftTitlebarRef.current?.style.setProperty("width", `${width}px`);
  }, []);
  const leftSidebar = useSidebarResize<HTMLElement>({
    isOpen: isLeftSidebarOpen,
    width: leftSidebarWidth,
    minWidth: 180,
    maxWidth: 480,
    deltaSign: 1,
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
            const clamped = clampSidebarResizeWidth(persistedWidth, 180, 480);
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
        let recoveredLegacyGroups = false;
        if (migrated) {
          const storedHasGroups =
            (stored.projectGroups?.length ?? 0) > 0 ||
            Object.keys(stored.projectGroupMap ?? {}).length > 0;
          if (!storedHasGroups) {
            const legacyGroups = sanitizeSidebarPrefsSnapshot(readLegacyProjectGroupsRaw());
            const legacyGroupCount = legacyGroups.projectGroups?.length ?? 0;
            const legacyMappingCount = Object.keys(legacyGroups.projectGroupMap ?? {}).length;
            if (legacyGroupCount > 0 || legacyMappingCount > 0) {
              stored = { ...stored };
              if (legacyGroups.projectGroups) stored.projectGroups = legacyGroups.projectGroups;
              if (legacyGroups.projectGroupMap) stored.projectGroupMap = legacyGroups.projectGroupMap;
              recoveredLegacyGroups = true;
              // Feedback explícito de migração (uma vez por boot): grupos legados
              // recuperados mesmo com os demais campos em defaults.
              console.info(
                `[sidebar] PR-16: recuperados ${legacyGroupCount} grupo(s) e ${legacyMappingCount} mapeamento(s) de projeto do localStorage legado para as prefs SQLite`
              );
            }
          }
        }
        const merged = stored;
        // Fast-forward do ref ANTES de liberar a gate: qualquer change posterior
        // (Effects acima ou do Shell) faz merge sobre o blob hidratado.
        sidebarPrefsRef.current = merged;
        sidebarPrefsHydratedRef.current = true;
        // Fallback undefined → default atual = comportamento de first-run intacto.
        setPinnedProjects(new Set(merged.pinnedProjects ?? []));
        setUnreadProjects(new Set(merged.unreadProjects ?? []));
        setPinnedWorktrees(new Set(merged.pinnedWorktrees ?? []));
        setUnreadWorktrees(new Set(merged.unreadWorktrees ?? []));
        setProjectGroups(merged.projectGroups ?? []);
        setProjectGroupMap(merged.projectGroupMap ?? {});
        // Fatia Shell-owned desce como props one-shot (initialSidebarBody etc.).
        setInitialSidebarPrefs(merged);
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
    if (prevPath && prevPath !== currentWorkspacePath && tabsRef.current.length > 0) {
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

  const saveWorkbenchPersistence = useCallback(() => {
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
    invoke<{ visible: GitWorktreeInfo[]; hidden: GitWorktreeInfo[]; isSuppressed: boolean }>("scan_worktrees", { repoPath })
      .then((scan) => {
        setGitWorktrees(scan.visible);
        setWorktreesByProject((prev) => ({ ...prev, [repoPath]: scan.visible }));
        setHiddenWorktreesByProject((prev) => ({ ...prev, [repoPath]: scan.hidden }));
      })
      .catch(() => {
        invoke<GitWorktreeInfo[]>("list_worktrees", { repoPath })
          .then((wts) => {
            setGitWorktrees(wts);
            setWorktreesByProject((prev) => ({ ...prev, [repoPath]: wts }));
          })
          .catch(console.error);
      });
  };

  const refreshAllWorktrees = useCallback((projs: HydraProject[]) => {
    if (projs.length === 0) return;
    Promise.all(
      projs.map((proj) =>
        invoke<{ visible: GitWorktreeInfo[]; hidden: GitWorktreeInfo[]; isSuppressed: boolean }>("scan_worktrees", { repoPath: proj.path })
          .then((scan) => ({ path: proj.path, wts: scan.visible, hidden: scan.hidden }))
          .catch(() =>
            invoke<GitWorktreeInfo[]>("list_worktrees", { repoPath: proj.path })
              .then((wts) => ({ path: proj.path, wts, hidden: [] as GitWorktreeInfo[] }))
              .catch(() => ({ path: proj.path, wts: [] as GitWorktreeInfo[], hidden: [] as GitWorktreeInfo[] }))
          )
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
      if (activeProjectRef.current) {
        const activeWts = map[activeProjectRef.current.path];
        if (activeWts) setGitWorktrees(activeWts);
      } else if (projs[0]) {
        setGitWorktrees(map[projs[0].path] ?? []);
      }
    });
  }, []);

  // Hydrate Sessions and Projects on startup
  useEffect(() => {
    invoke<string>("get_system_status")
      .then(setStatus)
      .catch(console.error);

    invoke<HydraProject[]>("list_projects")
      .then((projs) => {
        let sorted = projs;
        try {
          const saved = localStorage.getItem("hydra:projects_order");
          if (saved) {
            const order: string[] = JSON.parse(saved);
            sorted = [...projs].sort((a, b) => {
              const idxA = order.indexOf(a.id);
              const idxB = order.indexOf(b.id);
              if (idxA === -1 && idxB === -1) return 0;
              if (idxA === -1) return 1;
              if (idxB === -1) return -1;
              return idxA - idxB;
            });
          }
        } catch {}
        setProjects(sorted);
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

    const handleRefreshProjects = () => {
      invoke<HydraProject[]>("list_projects").then((projs) => {
        let sorted = projs;
        try {
          const saved = localStorage.getItem("hydra:projects_order");
          if (saved) {
            const order: string[] = JSON.parse(saved);
            sorted = [...projs].sort((a,b) => {
              const idxA = order.indexOf(a.id);
              const idxB = order.indexOf(b.id);
              if (idxA === -1 && idxB === -1) return 0;
              if (idxA === -1) return 1;
              if (idxB === -1) return -1;
              return idxA - idxB;
            });
          }
        } catch {}
        setProjects(sorted);
        refreshAllWorktrees(sorted);
      }).catch(console.error);
    };
    window.addEventListener("hydra:refresh-projects", handleRefreshProjects);
    // PR-12: group-header menu mutations arrive as events (SidebarShell owns the menu UI;
    // App owns group state). PR-14: persistence deixou os updaters — o effect da fatia
    // App-owned observa o estado e grava o blob merged no SQLite (debounced 250ms).
    const handleCreateProjectGroup = (e: Event) => {
      const detail = (e as CustomEvent<{ name: string; projectId?: string }>).detail;
      if (!detail?.name || typeof detail.name !== "string" || !detail.name.trim()) return;
      const id = `grp_${Date.now()}`;
      const newGroup = { id, name: detail.name.trim() };
      setProjectGroups((prev) => [...prev, newGroup]);
      if (detail.projectId) {
        setProjectGroupMap((prev) => ({ ...prev, [detail.projectId!]: id }));
      }
      window.dispatchEvent(new CustomEvent("hydra:refresh-projects"));
    };
    const handleMoveProjectToGroup = (e: Event) => {
      const detail = (e as CustomEvent<{ projectId: string; groupId: string }>).detail;
      if (!detail?.projectId || !detail?.groupId) return;
      setProjectGroupMap((prev) => ({ ...prev, [detail.projectId]: detail.groupId }));
      window.dispatchEvent(new CustomEvent("hydra:refresh-projects"));
    };
    const handleRemoveProjectFromGroup = (e: Event) => {
      const detail = (e as CustomEvent<{ projectId: string }>).detail;
      if (!detail?.projectId) return;
      setProjectGroupMap((prev) => {
        const next = { ...prev };
        delete next[detail.projectId];
        return next;
      });
      window.dispatchEvent(new CustomEvent("hydra:refresh-projects"));
    };
    const handleRenameProjectGroup = (e: Event) => {
      const detail = (e as CustomEvent<{ id: string; name: string }>).detail;
      if (!detail?.id || typeof detail.name !== "string" || !detail.name.trim()) return;
      setProjectGroups((prev) => prev.map((g) => (g.id === detail.id ? { ...g, name: detail.name.trim() } : g)));
      window.dispatchEvent(new CustomEvent("hydra:refresh-projects"));
    };
    const handleDeleteProjectGroup = (e: Event) => {
      const detail = (e as CustomEvent<{ id: string }>).detail;
      if (!detail?.id) return;
      setProjectGroups((prev) => prev.filter((g) => g.id !== detail.id));
      // Delete strips the membership map — member projects render ungrouped again.
      setProjectGroupMap((prev) => {
        const entries = Object.entries(prev).filter(([, gid]) => gid !== detail.id);
        if (entries.length === Object.keys(prev).length) return prev;
        return Object.fromEntries(entries);
      });
      window.dispatchEvent(new CustomEvent("hydra:refresh-projects"));
    };
    window.addEventListener("hydra:create-project-group", handleCreateProjectGroup);
    window.addEventListener("hydra:move-project-to-group", handleMoveProjectToGroup);
    window.addEventListener("hydra:remove-project-from-group", handleRemoveProjectFromGroup);
    window.addEventListener("hydra:rename-project-group", handleRenameProjectGroup);
    window.addEventListener("hydra:delete-project-group", handleDeleteProjectGroup);
    const handleOpenPalette = () => setIsCommandPaletteOpen(true);
    window.addEventListener("hydra:open-command-palette", handleOpenPalette);
    const handleOpenJumpPalette = () => setIsJumpPaletteOpen(true);
    window.addEventListener("hydra:open-jump-palette", handleOpenJumpPalette);

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
      window.removeEventListener("hydra:delete-project-group", handleDeleteProjectGroup);
      window.removeEventListener("hydra:open-command-palette", handleOpenPalette);
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
        const un = await listen<{ session_id?: string; sessionId?: string; state: string; state_started_at?: number }>("agent:state", (event) => {
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
            const toolName = typeof payload.tool_name === "string" ? payload.tool_name : undefined;
            const toolInput = typeof payload.tool_input === "string" ? payload.tool_input : undefined;
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
    if (!workbenchLoaded) {
      loadSessionsForProject(proj.path);
    }
    refreshGitWorktrees(proj.path);
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        role: "agent",
        content: `Switched active workspace to "${proj.name}" (${proj.path}) on branch "${proj.current_branch}".`
      }
    ]);
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

  const handleRemoveProject = (proj: HydraProject) => {
    invoke("remove_project", { path: proj.path })
      .then(() => {
        invoke<HydraProject[]>("list_projects").then((updated) => {
          setProjects(updated);
          if (activeProject?.path === proj.path) {
            if (updated.length > 0) {
              handleSelectProject(updated[0]);
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

  const handleDeleteGitWorktree = (wt: GitWorktreeInfo, owningProj?: HydraProject) => {
    // If owning project is provided directly and is a git repo, use it!
    let repoPath = (owningProj && owningProj.is_git) ? owningProj.path : "";
    if (!repoPath) {
      for (const proj of projectsRef.current) {
        if (!proj.is_git) continue;
        const list = worktreesByProject[proj.path];
        if (list && list.some((w) => w.path === wt.path)) {
          repoPath = proj.path;
          break;
        }
      }
      if (!repoPath) {
        repoPath = owningProj?.path || activeProject?.path || "";
      }
    }
    if (!repoPath) return;

    if (hydraSettings.skip_delete_worktree_confirm) {
      setDeleteWorktreeModal(null);
      invoke("delete_worktree", { repoPath, worktreePath: wt.path })
        .then(() => {
          refreshGitWorktrees(repoPath);
          if (activeProject && activeProject.path !== repoPath) {
            refreshGitWorktrees(activeProject.path);
          }
          window.dispatchEvent(new CustomEvent("hydra:refresh-projects"));
        })
        .catch((err) => {
          console.error("delete_worktree failed:", err);
          setDeleteWorktreeModal({ repoPath, worktrees: [wt], error: String(err) });
        });
      return;
    }
    setDeleteWorktreeModal({ repoPath, worktrees: [wt], error: null });
  };

  // Orca parity (useDeleteWorktreeStatusHydration): hydrate dirty-change counts
  // for the dialog targets when it opens.
  useEffect(() => {
    if (!deleteWorktreeModal) return;
    for (const wt of deleteWorktreeModal.worktrees) {
      invoke<{ unstaged_count: number; untracked_count: number; staged_count: number }>(
        "get_detailed_git_status_cmd",
        { repoPath: wt.path }
      )
        .then((res) => {
          const dirty = (res?.unstaged_count ?? 0) + (res?.untracked_count ?? 0) + (res?.staged_count ?? 0);
          setDirtyChangeCountsByWorktreeId((prev) => ({ ...prev, [wt.path]: dirty }));
        })
        .catch(() => {
          setDirtyChangeCountsByWorktreeId((prev) => ({ ...prev, [wt.path]: null }));
        });
    }
  }, [deleteWorktreeModal]);


  const handleCreatedWorkspace = (worktreePath: string, branchName: string, agentName: string, executable: string) => {
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
    try {
      localStorage.setItem("hydra:projects_order", JSON.stringify(newProjects.map(p => p.id)));
    } catch {}
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

  const handleNewTerminalTab = useCallback((shell?: string) => {
    const sh = shell || resolveDefaultShell();
    const currentCwd = activeWorktreePathRef.current ?? activeProject?.path ?? "";
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

  const handleLaunchAgent = (agent: AvailableAgent) => {
    const sessionId = `sess_${agent.id}_${Date.now().toString().slice(-4)}`;
    const tabId = `tab_${sessionId}`;
    const newSession: WorktreeSession = {
      id: sessionId,
      project_path: activeProject?.path ?? "",
      title: `${agent.name} (active)`,
      branch: activeProject?.current_branch ?? "main",
      state: "working",
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
      cwd: newSession.project_path,
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
            // Unknown (probe error/timeout) is not idle: ask, so a degraded snapshot
            // costs a click instead of a killed command.
            const hasLive = states.some((s) => s === "working" || s === "blocked" || s === "waiting");
            const hasUnknown = states.some((s) => s === null || s === "unknown");
            if (hasLive || hasUnknown) confirmClose();
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
  const handleRenameTab = (tabId: string, newTitle: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, title: newTitle, customTitle: newTitle } : t))
    );
  };

  // Orca parity (resolveTerminalTabTitle): a user rename wins over the live
  // shell/process OSC title. Without a customTitle, the tab follows the title
  // the terminal emits (zsh, vim, agent frames).
  const handleTabTitleChange = useCallback((sessionId: string, title: string) => {
    setTabs((prev) =>
      prev.map((t) => {
        if (t.customTitle || t.sessionId !== sessionId) return t;
        return { ...t, title };
      })
    );
  }, []);


  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalContextMenu = (e: MouseEvent) => {
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
          setIsNewWorkspaceOpen(false);
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
      if (isChord && e.key.toLowerCase() === "b") {
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
    handleNavigateWorkspace
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
                setSessions((prev) => [...prev, { id: np.sessionId, project_path: np.cwd ?? "", title: `Terminal (${np.executable ?? "bash"})`, branch: activeProjectRef.current?.current_branch ?? "main", state: "idle", active: false, agentName: np.executable ?? "bash", executable: np.executable ?? "bash", created_at: Date.now(), updated_at: Date.now() }]);
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
  const sleepSessionsForPaths = (paths: string[]) => {
    const ids = sessions.filter((s) => paths.some((p) => s.project_path === p || s.project_path.startsWith(p))).map((s) => s.id);
    // close associated tabs and mark sessions inactive; emulate Orca sleep (close panels)
    setTabs((prev) => prev.filter((t) => !ids.some((id) => t.id === `tab_${id}` || t.sessionId === id)));
    setSessions((prev) => prev.map((s) => ids.includes(s.id) ? { ...s, state: "idle" as const } : s));
  };

  const togglePinProject = (id: string) => {
    setPinnedProjects((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };
  const toggleUnreadProject = (id: string) => {
    setUnreadProjects((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };
  const togglePinWorktree = (path: string) => {
    setPinnedWorktrees((prev) => { const next = new Set(prev); if (next.has(path)) next.delete(path); else next.add(path); return next; });
  };
  const toggleUnreadWorktree = (path: string) => {
    setUnreadWorktrees((prev) => { const next = new Set(prev); if (next.has(path)) next.delete(path); else next.add(path); return next; });
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
    const eligibleParents: ParentCandidate[] = projects
      .filter((p) => p.id !== proj.id)
      .map((p) => ({ id: p.id, name: p.name, path: p.path, branch: p.current_branch }))
      .concat(
        gitWorktrees
          .filter((w) => w.path !== proj.path)
          .map((w) => ({ id: w.path, name: w.branch || w.path, path: w.path, branch: w.branch }))
      );
    const developerRevealed = e.altKey;
    const openInChildren = getOpenInItems(proj.path);

    setContextMenu({
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
            window.dispatchEvent(new CustomEvent("hydra:open-new-group-dialog", { detail: { projectId: proj.id, defaultName: `${proj.name} group` } }));
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
              const nextMap = { ...projectGroupMap, [proj.id]: g.id };
              setProjectGroupMap(nextMap);
              window.dispatchEvent(new CustomEvent("hydra:refresh-projects"));
            },
          })),
          onClick: () => {},
        } as ContextMenuItem] : []),
        ...(groupId ? [{ label: "Remove from group", icon: <X className="w-3.5 h-3.5" />, onClick: () => { const m = { ...projectGroupMap }; delete m[proj.id]; setProjectGroupMap(m); window.dispatchEvent(new CustomEvent("hydra:refresh-projects")); } } as ContextMenuItem] : []),
        {
          label: lineageParent ? "Change Parent Worktree..." : "Set Parent Worktree...",
          icon: <FolderTree className="w-3.5 h-3.5" />,
          separator: true,
          disabled: eligibleParents.length === 0,
          title: eligibleParents.length === 0 ? "No eligible parents" : undefined,
          onClick: () => {
            if (eligibleParents.length === 0) return;
            const candidates: ParentCandidate[] = eligibleParents.map(
              (p: { id?: string; name?: string; path?: string; branch?: string }) => ({
                id: p.id || p.path || "",
                name: p.name || p.id || "",
                path: p.path || p.id || "",
                branch: p.branch,
              })
            );
            setParentPickerModal({
              targetName: proj.name,
              currentParentPath: lineageParent,
              candidates,
              onSelect: (selectedPath) => {
                const next = { ...worktreeLineage, [proj.path]: selectedPath };
                setWorktreeLineage(next);
                persistLineage(next);
              },
              onRemoveParent: () => {
                const next = { ...worktreeLineage };
                delete next[proj.path];
                setWorktreeLineage(next);
                persistLineage(next);
              },
            });
          },
        },
        ...(lineageParent ? [{ label: "Open Parent Worktree", icon: <Workflow className="w-3.5 h-3.5" />, onClick: () => {
              const parentProj = projects.find((p) => p.path === lineageParent);
              if (parentProj) handleSelectProject(parentProj);
              else invoke("open_in_file_manager", { path: lineageParent }).catch(console.error);
            } } as ContextMenuItem, { label: "Remove from Parent", icon: <Unlink className="w-3.5 h-3.5" />, onClick: () => { const m = { ...worktreeLineage }; delete m[proj.path]; setWorktreeLineage(m); persistLineage(m); } } as ContextMenuItem] : []),
        ...(developerRevealed ? [{ label: "Developer", isLabel: true, separator: true, onClick: () => {} } as ContextMenuItem, { label: `Path: ${proj.path}`, icon: <Copy className="w-3.5 h-3.5" />, onClick: () => navigator.clipboard.writeText(proj.path).catch(console.error) } as ContextMenuItem, { label: `Is Git: ${proj.is_git ? "yes" : "no"} · Branch: ${proj.current_branch}`, icon: <GitBranch className="w-3.5 h-3.5" />, onClick: () => {} } as ContextMenuItem] : []),
        { label: "Sleep", icon: <Moon className="w-3.5 h-3.5" />, separator: true, onClick: () => sleepSessionsForPaths([proj.path]) },
        { label: "Delete Worktree", icon: <Trash2 className="w-3.5 h-3.5" />, danger: true, disabled: true, title: "Primary worktree — can't be deleted. Remove the project instead.", onClick: () => {}, separator: true },
        { label: "Remove Project from Hydra", icon: <Trash2 className="w-3.5 h-3.5" />, danger: true, onClick: () => handleRemoveProject(proj) },
      ]
    });
  };

  const handleWorktreeContextMenu = (e: React.MouseEvent, wt: GitWorktreeInfo, proj: HydraProject) => {
    const isMain = wt.path === proj.path;
    const isPinned = pinnedWorktrees.has(wt.path);
    const isUnread = unreadWorktrees.has(wt.path);
    const lineageParent = worktreeLineage[wt.path];
    const eligibleParents: ParentCandidate[] = projects
      .filter((p) => p.path !== wt.path)
      .map((p) => ({ id: p.id, name: p.name, path: p.path, branch: p.current_branch }))
      .concat(
        gitWorktrees
          .filter((w) => w.path !== wt.path)
          .map((w) => ({ id: w.path, name: w.branch || w.path, path: w.path, branch: w.branch }))
      );
    const developerRevealed = e.altKey;
    const openInChildren = getOpenInItems(wt.path);
    const descendantCount = Object.values(worktreeLineage).filter((parent) => parent === wt.path).length;

    const handleAssignWorktreeStatus = async (status: string | null) => {
      try {
        await invoke("set_worktree_status", {
          worktreePath: wt.path,
          status,
        });
        setGitWorktrees((prev) =>
          prev.map((w) => (w.path === wt.path ? { ...w, status } : w))
        );
        setWorktreesByProject((prev) => {
          const next = { ...prev };
          for (const k of Object.keys(next)) {
            next[k] = next[k].map((w) => (w.path === wt.path ? { ...w, status } : w));
          }
          return next;
        });
        window.dispatchEvent(new CustomEvent("hydra:refresh-projects"));
      } catch (e) {
        console.error("Failed to set worktree status:", e);
      }
    };
    setContextMenu({
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
        { label: "Copy Path", icon: <Copy className="w-3.5 h-3.5" />, onClick: () => navigator.clipboard.writeText(wt.path).catch(console.error) },
        { label: `Copy Branch: ${wt.branch}`, icon: <GitBranch className="w-3.5 h-3.5" />, onClick: () => navigator.clipboard.writeText(wt.branch).catch(console.error) },
        { label: "Copy Commit", icon: <Copy className="w-3.5 h-3.5" />, onClick: () => navigator.clipboard.writeText(wt.head_commit).catch(console.error) },
        { label: isPinned ? "Unpin" : "Pin", icon: isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />, separator: true, onClick: () => togglePinWorktree(wt.path) },
        { label: isUnread ? "Mark Read" : "Mark Unread", icon: isUnread ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />, onClick: () => toggleUnreadWorktree(wt.path) },
        {
          label: "Status",
          icon: <Kanban className="w-3.5 h-3.5" />,
          children: [
            {
              label: "Blocked",
              icon: <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />,
              onClick: () => handleAssignWorktreeStatus("blocked"),
            },
            {
              label: "Waiting",
              icon: <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />,
              onClick: () => handleAssignWorktreeStatus("waiting"),
            },
            {
              label: "Working",
              icon: <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />,
              onClick: () => handleAssignWorktreeStatus("working"),
            },
            {
              label: "Done",
              icon: <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />,
              onClick: () => handleAssignWorktreeStatus("done"),
            },
            {
              label: "Idle",
              icon: <span className="w-2 h-2 rounded-full bg-neutral-400 shrink-0" />,
              onClick: () => handleAssignWorktreeStatus("idle"),
            },
            {
              label: "Clear Status",
              separator: true,
              onClick: () => handleAssignWorktreeStatus(null),
            },
          ],
          onClick: () => {},
        },
        {
          label: lineageParent ? "Change Parent Worktree..." : "Set Parent Worktree...",
          icon: <FolderTree className="w-3.5 h-3.5" />,
          separator: true,
          disabled: eligibleParents.length === 0,
          onClick: () => {
            if (eligibleParents.length === 0) return;
            const candidates: ParentCandidate[] = eligibleParents.map(
              (p: { id?: string; name?: string; path?: string; branch?: string }) => ({
                id: p.id || p.path || "",
                name: p.name || p.branch || p.id || "",
                path: p.path || p.id || "",
                branch: p.branch,
              })
            );
            setParentPickerModal({
              targetName: wt.branch || wt.path,
              currentParentPath: lineageParent,
              candidates,
              onSelect: (selectedPath) => {
                const next = { ...worktreeLineage, [wt.path]: selectedPath };
                setWorktreeLineage(next);
                persistLineage(next);
              },
              onRemoveParent: () => {
                const next = { ...worktreeLineage };
                delete next[wt.path];
                setWorktreeLineage(next);
                persistLineage(next);
              },
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
            } } as ContextMenuItem, { label: "Remove from Parent", icon: <Unlink className="w-3.5 h-3.5" />, onClick: () => { const m = { ...worktreeLineage }; delete m[wt.path]; setWorktreeLineage(m); persistLineage(m); } } as ContextMenuItem] : []),
        ...(developerRevealed ? [{ label: "Developer", isLabel: true, separator: true, onClick: () => {} } as ContextMenuItem, { label: `Head: ${wt.head_commit.slice(0,7)} · Bare: ${wt.is_bare ? "yes":"no"}`, icon: <MoreHorizontal className="w-3.5 h-3.5" />, onClick: () => navigator.clipboard.writeText(wt.head_commit).catch(console.error) } as ContextMenuItem] : []),
        { label: "Sleep", icon: <Moon className="w-3.5 h-3.5" />, separator: true, onClick: () => sleepSessionsForPaths([wt.path]) },
        ...(descendantCount > 0 ? [{ label: `Sleep with Descendants (${descendantCount})`, icon: <Moon className="w-3.5 h-3.5" />, onClick: () => {
              const subtree = Object.entries(worktreeLineage).filter(([, parent]) => parent === wt.path).map(([child]) => child);
              sleepSessionsForPaths([wt.path, ...subtree]);
            } } as ContextMenuItem] : []),
        ...(isMain ? [{ label: "Delete Worktree", icon: <Trash2 className="w-3.5 h-3.5" />, danger: true, disabled: true, title: "Primary worktree — can't be deleted. Remove the project instead.", separator: true, onClick: () => {} } as ContextMenuItem, { label: "Remove Project from Hydra", icon: <Trash2 className="w-3.5 h-3.5" />, danger: true, onClick: () => handleRemoveProject(proj) } as ContextMenuItem] : [{ label: descendantCount > 0 ? `Delete with Descendants…` : "Delete Worktree", icon: <Trash2 className="w-3.5 h-3.5" />, danger: true, separator: true, onClick: () => handleDeleteGitWorktree(wt) } as ContextMenuItem]),
      ]
    });
  };

  const handleSessionContextMenu = (e: React.MouseEvent, session: WorktreeSession) => {
    const isPinned = pinnedWorktrees.has(session.id) || pinnedWorktrees.has(session.project_path);
    const isUnread = unreadWorktrees.has(session.id);
    const lineageParent = worktreeLineage[session.project_path] || worktreeLineage[session.id];
    const openInChildren = getOpenInItems(session.project_path);
    const developerRevealed = e.altKey;
    setContextMenu({
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
          disabled: projects.length === 0,
          onClick: () => {
            const candidates: ParentCandidate[] = projects.map((p) => ({
              id: p.id,
              name: p.name,
              path: p.path,
              branch: p.current_branch,
            }));
            setParentPickerModal({
              targetName: session.title,
              currentParentPath: lineageParent,
              candidates,
              onSelect: (selectedPath) => {
                const next = {
                  ...worktreeLineage,
                  [session.project_path]: selectedPath,
                  [session.id]: selectedPath,
                };
                setWorktreeLineage(next);
                persistLineage(next);
              },
              onRemoveParent: () => {
                const next = { ...worktreeLineage };
                delete next[session.project_path];
                delete next[session.id];
                setWorktreeLineage(next);
                persistLineage(next);
              },
            });
          },
        },
        ...(lineageParent ? [{ label: "Open Parent Worktree", icon: <Workflow className="w-3.5 h-3.5" />, onClick: () => {
              const parentProj = projects.find((p) => p.path === lineageParent);
              if (parentProj) handleSelectProject(parentProj);
            } } as ContextMenuItem, { label: "Remove from Parent", icon: <Unlink className="w-3.5 h-3.5" />, onClick: () => { const m = { ...worktreeLineage }; delete m[session.project_path]; delete m[session.id]; setWorktreeLineage(m); persistLineage(m); } } as ContextMenuItem] : []),
        ...(developerRevealed ? [{ label: "Developer", isLabel: true, separator: true, onClick: () => {} } as ContextMenuItem, { label: `ID: ${session.id}`, icon: <Copy className="w-3.5 h-3.5" />, onClick: () => navigator.clipboard.writeText(session.id).catch(console.error) } as ContextMenuItem, { label: `Agent: ${session.agentName} · ${session.executable}`, icon: <MoreHorizontal className="w-3.5 h-3.5" />, onClick: () => {} } as ContextMenuItem] : []),
        { label: "Sleep", icon: <Moon className="w-3.5 h-3.5" />, separator: true, onClick: () => sleepSessionsForPaths([session.project_path]) },
        { label: "Close / Delete Fleet Session", icon: <Trash2 className="w-3.5 h-3.5" />, danger: true, separator: true, onClick: () => handleDeleteSession(session.id) },
      ]
    });
  };

  // kept for future prompt bar; suppress unused until agent tab returns
  void promptInput;
  const handleSendMessage = () => {
    if (!promptInput.trim()) return;
    const text = promptInput;
    setPromptInput("");

    const currentActive = sessions.find((s) => s.active);
    const sId = currentActive?.id ?? "sess_main";

    invoke<number>("save_chat_message", {
      sessionId: sId,
      role: "user",
      content: text
    }).catch(console.error);

    setMessages((prev) => [
      ...prev,
      { id: Date.now(), role: "user", content: text },
      { id: Date.now() + 1, role: "agent", content: `Command saved to SQLite: "${text}". Monitored by Herdr state engine.` }
    ]);
  };
  void handleSendMessage;

  const handleSettingsSaved = (newSettings: HydraSettings) => {
    const n = normalizeHydraSettings(newSettings);
    setHydraSettings(n);
    applyDocumentTheme(n.theme);
    try { localStorage.setItem("hydra:theme", n.theme); } catch {}
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        role: "agent",
        content: `Settings updated: theme ${n.theme} · terminal ${n.terminal_theme_dark} / ${n.terminal_theme_light} · font ${n.terminal_font_size}px · auto-approve reads: ${n.auto_approve_reads ? "on" : "off"}.`
      }
    ]);
  };

  const currentTab = tabs.find((t) => t.id === activeTabId);

  return (
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
          <>
            <aside 
              ref={leftSidebar.containerRef}
              className="flex flex-col border-r border-worktree-sidebar-border bg-worktree-sidebar shrink-0 overflow-hidden relative"
            >
              <WorktreeSidebar 
                sessions={sessions}
                availableAgents={availableAgents}
                projects={projects}
                activeProject={activeProject}
                gitStatus={gitStatus}
                activeWorktreePath={activeWorktreePath}
                gitWorktrees={gitWorktrees}
                worktreesByProject={worktreesByProject}
                onSelectProject={handleSelectProject}
                onRemoveProject={handleRemoveProject}
                onSelectSession={handleSelectSession}
                onSelectGitWorktree={handleSelectGitWorktree}
                onDeleteGitWorktree={handleDeleteGitWorktree}
                onNewSessionWithAgent={() => {}}
                onDeleteSession={handleDeleteSession}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onOpenAddRepoDialog={() => setIsAddRepoOpen(true)}
                onOpenNewWorkspaceModal={(proj) => {
                  if (proj) handleSelectProject(proj);
                  setIsNewWorkspaceOpen(true);
                }}
                onSessionContextMenu={handleSessionContextMenu}
                onProjectContextMenu={handleProjectContextMenu}
                onWorktreeContextMenu={handleWorktreeContextMenu}
                onReorderSessions={handleReorderSessions}
                onReorderProjects={handleReorderProjects}
                onReorderWorktrees={handleReorderWorktrees}
                pinnedProjects={pinnedProjects}
                unreadProjects={unreadProjects}
                pinnedWorktrees={pinnedWorktrees}
                unreadWorktrees={unreadWorktrees}
                hiddenWorktreesByProject={hiddenWorktreesByProject}
                projectGroupMap={projectGroupMap}
                projectGroups={projectGroups}
                initialSidebarBody={initialSidebarPrefs?.sidebarBody}
                initialCollapsedProjects={initialSidebarPrefs?.collapsedProjects}
                initialCollapsedGroups={initialSidebarPrefs?.collapsedGroups}
                initialDisplayOptions={initialSidebarPrefs?.displayOptions}
                initialAgentsReadFilter={initialSidebarPrefs?.agentsReadFilter}
                initialAgentsGroupBy={initialSidebarPrefs?.agentsGroupBy}
                onSidebarPrefsChange={handleSidebarPrefsChange}
                compactCards={Boolean(hydraSettings.compact_worktree_cards)}
                settings={hydraSettings as any}
                isModalOpen={isJumpPaletteOpen || isCommandPaletteOpen || isSettingsOpen || isAddRepoOpen || isNewWorkspaceOpen || isPairingOpen}
              />
            </aside>

            {/* Left Resize Handle */}
            <div 
              onMouseDown={leftSidebar.onResizeStart}
              className={`w-2.5 -ml-1.5 -mr-1.5 z-20 cursor-col-resize flex items-center justify-center group select-none transition-colors ${
                leftSidebar.isResizing ? "bg-emerald-500/40" : "hover:bg-emerald-500/30"
              }`}
            >
              <div className={`w-[2px] h-full transition-colors ${leftSidebar.isResizing ? "bg-emerald-400" : "group-hover:bg-emerald-400"}`} />
            </div>
          </>
        )}

        {/* Central Workspace: Multi-Tab Workbench Surface */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative" style={{ background: "var(--app-bg)" }}>
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
                onReorderTabs={setTabs}
                onTabContextMenu={handleTabContextMenu}
                onTabBarContextMenu={handleTabBarContextMenu}
                worktreePath={activeWorktreePath ?? activeProject?.path}
                recentlyClosedTabs={recentlyClosedTabs}
                onOpenFile={handleOpenFilePath}
                onRestoreClosedTab={handleRestoreClosedTab}
                onRunQuickCommand={handleRunQuickCommand}
              />

              <div className="flex-1 overflow-hidden relative">
                {currentTab?.type === "diff" ? (() => {
                  const c = fileTabContents[activeTabId] ?? { original: diffOriginal, modified: diffModified, lang: previewLanguage };
                  return (
                    <CodeDiffViewer 
                      original={c.original} 
                      modified={c.modified} 
                      language={c.lang}
                      theme={hydraSettings.theme === "light" ? "vs" : "vs-dark"}
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
                    const payload = { original: "", modified: diff || `No diff for ${relPath}`, lang: "diff" };
                    setFileTabContents(prev => ({ ...prev, [tabId]: payload }));
                    setDiffOriginal(payload.original);
                    setDiffModified(payload.modified);
                    setPreviewLanguage("diff");
                    setTabs(prev => prev.find(t=>t.id===tabId) ? prev : [...prev, { id: tabId, title, type:"diff" }]);
                    setActiveTabId(tabId);
                  } catch (e) { console.error(e); }
                }}
              />
            </aside>
          </>
        )}
      </div>

      {/* Custom Context Menu Overlay */}
      {contextMenu && (
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

      {/* Non-blocking Parent Picker Modal */}
      {parentPickerModal && (
        <ParentPickerModal
          open={true}
          targetName={parentPickerModal.targetName}
          currentParentPath={parentPickerModal.currentParentPath}
          candidates={parentPickerModal.candidates}
          onOpenChange={(open) => {
            if (!open) setParentPickerModal(null);
          }}
          onSelect={(parentPath) => {
            parentPickerModal.onSelect(parentPath);
            setParentPickerModal(null);
          }}
          onRemoveParent={
            parentPickerModal.onRemoveParent
              ? () => {
                  parentPickerModal.onRemoveParent?.();
                  setParentPickerModal(null);
                }
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
        }}
        onSelectSession={(sess) => handleSelectSession(sess.id)}
        onNewWorkspace={() => setIsNewWorkspaceOpen(true)}
        onNewTerminal={() => handleNewTerminalTab()}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Orca 100% Add Project Dialog (Clone / Create / Browse Folder) */}
      <AddRepoDialog
        isOpen={isAddRepoOpen}
        onClose={() => setIsAddRepoOpen(false)}
        onProjectAdded={() => {
          invoke<HydraProject[]>("list_projects").then((projs) => {
            setProjects(projs);
            if (projs.length > 0) {
              handleSelectProject(projs[0]);
              if (tabsRef.current.length === 0) {
                const tabId = `tab_${Date.now().toString().slice(-4)}`;
                const initialTab: TabItem = {
                  id: tabId,
                  title: `${projs[0].name} (main)`,
                  type: "terminal",
                  cwd: projs[0].path,
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
        onSelectProject={handleSelectProject}
        onOpenAddRepoDialog={() => setIsAddRepoOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onClose={() => setIsNewWorkspaceOpen(false)}
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
        deleteStateByWorktreeId={deleteStateByWorktreeId}
        dirtyChangeCountsByWorktreeId={dirtyChangeCountsByWorktreeId}
        onPersistSkipConfirmPreference={() => {
          const next = { ...hydraSettings, skip_delete_worktree_confirm: true } as HydraSettings;
          setHydraSettings(next);
          invoke("save_settings", { settings: next }).catch(console.error);
        }}
        onClose={() => setDeleteWorktreeModal(null)}
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
            for (const p of deletedPaths) delete next[p];
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


      {/* Settings Modal */}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        onLiveChange={(live) => { const n = normalizeHydraSettings(live); setHydraSettings(n); applyDocumentTheme(n.theme); }}
        onSaved={handleSettingsSaved}
      />
    </div>
  );
}
