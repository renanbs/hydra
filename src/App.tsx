import { useState, useEffect, useRef, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open as openFileDialog } from "@tauri-apps/plugin-dialog";
import { usePanelResize } from "./hooks/usePanelResize";
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
  type GitWorktreeInfo 
} from "./components/sidebar/WorktreeSidebar";
import { AddRepoDialog } from "./components/sidebar/AddRepoDialog";
import { WorkbenchTabBar, type TabItem } from "./components/workbench/WorkbenchTabBar";
import { PairingModal } from "./components/PairingModal";
import { SettingsModal } from "./components/SettingsModal";
import type { HydraSettings } from "./shared/settings-types";
import { DEFAULT_HYDRA_SETTINGS, normalizeHydraSettings, DEFAULT_OPEN_IN_APPLICATIONS } from "./shared/settings-types";
import { applyDocumentTheme } from "./lib/document-theme";
import { CommandPalette } from "./components/CommandPalette";
import { resolveLeftSidebarStyleVariables } from "./lib/left-sidebar-appearance";
import { CustomContextMenu, type ContextMenuItem } from "./components/CustomContextMenu";
import { NewWorkspaceComposer } from "./components/NewWorkspaceComposer";
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

export default function App() {
  const [status, setStatus] = useState("Initializing...");
  const [isPairingOpen, setIsPairingOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddRepoOpen, setIsAddRepoOpen] = useState(false);
  const [isNewWorkspaceOpen, setIsNewWorkspaceOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
  const [diffOriginal, setDiffOriginal] = useState(MOCK_ORIGINAL);
  const [diffModified, setDiffModified] = useState(MOCK_MODIFIED);
  const [previewLanguage, setPreviewLanguage] = useState("rust");
  const [fileTabContents, setFileTabContents] = useState<Record<string, { original: string; modified: string; lang: string }>>({});
  const [promptInput, setPromptInput] = useState("");
  const [availableAgents, setAvailableAgents] = useState<AvailableAgent[]>([]);
  const [projects, setProjects] = useState<HydraProject[]>([]);
  const [activeProject, setActiveProject] = useState<HydraProject | null>(null);
  const [gitStatus, setGitStatus] = useState<GitRepoStatus | null>(null);
  const [gitWorktrees, setGitWorktrees] = useState<GitWorktreeInfo[]>([]);
  const [hydraSettings, setHydraSettings] = useState<HydraSettings>(DEFAULT_HYDRA_SETTINGS);
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
  // Left sidebar appearance style (Orca leftSidebarAppearanceMode)
  const leftSidebarStyle = useMemo(() => {
    const sysDark = typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)").matches : true;
    return resolveLeftSidebarStyleVariables(hydraSettings, sysDark) as React.CSSProperties | undefined;
  }, [hydraSettings]);
  const syncKeepAwake = (enabled: boolean, workingCount: number) => {
    invoke("sync_keep_awake", { enabled, workingCount }).catch(()=>{});
  };
  const [_keepAwakeActive, setKeepAwakeActive] = useState(false);
  const isMac = typeof navigator !== "undefined" && navigator.userAgent.includes("Mac");
  const projectsRef = useRef(projects);
  projectsRef.current = projects;
  const activeProjectRef = useRef(activeProject);
  activeProjectRef.current = activeProject;

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    items: ContextMenuItem[];
  } | null>(null);

  // Orca parity: pinned/unread/groups/lineage persisted via localStorage
  const [pinnedProjects, setPinnedProjects] = useState<Set<string>>(() => {
    try { const v = localStorage.getItem("hydra:pinned_projects"); return v ? new Set(JSON.parse(v)) : new Set(); } catch { return new Set(); }
  });
  const [unreadProjects, setUnreadProjects] = useState<Set<string>>(() => {
    try { const v = localStorage.getItem("hydra:unread_projects"); return v ? new Set(JSON.parse(v)) : new Set(); } catch { return new Set(); }
  });
  const [pinnedWorktrees, setPinnedWorktrees] = useState<Set<string>>(() => {
    try { const v = localStorage.getItem("hydra:pinned_worktrees"); return v ? new Set(JSON.parse(v)) : new Set(); } catch { return new Set(); }
  });
  const [unreadWorktrees, setUnreadWorktrees] = useState<Set<string>>(() => {
    try { const v = localStorage.getItem("hydra:unread_worktrees"); return v ? new Set(JSON.parse(v)) : new Set(); } catch { return new Set(); }
  });
  const [projectGroups, setProjectGroups] = useState<Array<{ id: string; name: string }>>(() => {
    try { const v = localStorage.getItem("hydra:project_groups"); return v ? JSON.parse(v) : []; } catch { return []; }
  });
  const [projectGroupMap, setProjectGroupMap] = useState<Record<string, string>>(() => {
    try { const v = localStorage.getItem("hydra:project_group_map"); return v ? JSON.parse(v) : {}; } catch { return {}; }
  });
  const [worktreeLineage, setWorktreeLineage] = useState<Record<string, string>>(() => {
    try { const v = localStorage.getItem("hydra:worktree_lineage"); return v ? JSON.parse(v) : {}; } catch { return {}; }
  });
  const persistSet = (key: string, set: Set<string>) => { try { localStorage.setItem(key, JSON.stringify([...set])); } catch {} };
  const persistGroups = (groups: Array<{ id: string; name: string }>) => { try { localStorage.setItem("hydra:project_groups", JSON.stringify(groups)); } catch {} };
  const persistGroupMap = (m: Record<string, string>) => { try { localStorage.setItem("hydra:project_group_map", JSON.stringify(m)); } catch {} };
  const persistLineage = (m: Record<string, string>) => { try { localStorage.setItem("hydra:worktree_lineage", JSON.stringify(m)); } catch {} };

  // Agent Fleet Sessions
  const [sessions, setSessions] = useState<WorktreeSession[]>([]);

  // Center Workbench Tabs
  const [tabs, setTabs] = useState<TabItem[]>([
    { id: "tab_main", title: "bash (active)", type: "terminal" },
  ]);
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;
  const [activeTabId, setActiveTabId] = useState("tab_main");
  const activeTabIdRef = useRef(activeTabId);
  activeTabIdRef.current = activeTabId;

  const [_messages, setMessages] = useState<Array<{ id: number; role: string; content: string }>>([
    {
      id: 1,
      role: "agent",
      content: "Hydra ADE initialized. Workspace switcher, Command Palette and live PTY active."
    }
  ]);

  const leftSidebar = usePanelResize({
    initialWidth: 260,
    minWidth: 180,
    maxWidth: 480,
    deltaSign: 1,
  });

  const rightSidebar = usePanelResize({
    initialWidth: 360,
    minWidth: 260,
    maxWidth: 600,
    deltaSign: -1,
  });

  // 1. Carrega o estado persistido de visibilidade dos painéis
  useEffect(() => {
    invoke<UiLayoutState>("get_layout_persistence")
      .then((layout) => {
        if (layout) {
          setIsLeftSidebarOpen(layout.left_sidebar_open);
          setIsRightSidebarOpen(layout.right_sidebar_open);
        }
      })
      .catch(console.error);
  }, []);

  const updateLeftSidebar = (open: boolean) => {
    setIsLeftSidebarOpen(open);
    invoke("save_layout_persistence", {
      layout: {
        left_sidebar_open: open,
        right_sidebar_open: isRightSidebarOpen,
        left_sidebar_width: leftSidebar.width,
        right_sidebar_width: rightSidebar.width,
      }
    }).catch(console.error);
  };

  const updateRightSidebar = (open: boolean) => {
    setIsRightSidebarOpen(open);
    invoke("save_layout_persistence", {
      layout: {
        left_sidebar_open: isLeftSidebarOpen,
        right_sidebar_open: open,
        left_sidebar_width: leftSidebar.width,
        right_sidebar_width: rightSidebar.width,
      }
    }).catch(console.error);
  };

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
      const isModalOpen = isCommandPaletteOpen || isSettingsOpen || isAddRepoOpen || isNewWorkspaceOpen || isPairingOpen;
      const isChord = e.ctrlKey || e.metaKey;
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
      if (isChord && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setIsRightSidebarOpen((prev) => {
          const next = !prev;
          updateRightSidebar(next);
          return next;
        });
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
      if (isChord && !e.shiftKey && e.key.toLowerCase() === "w") {
        e.preventDefault();
        if (activeTabIdRef.current) {
          handleCloseTab(activeTabIdRef.current);
        }
      }
      if (isChord && !e.shiftKey && e.key.toLowerCase() === "t") {
        e.preventDefault();
        handleNewTab();
      }
      if (isChord && e.shiftKey && e.key === "ArrowUp") {
        e.preventDefault();
        handleNavigateWorkspace("up");
      }
      if (isChord && e.shiftKey && e.key === "ArrowDown") {
        e.preventDefault();
        handleNavigateWorkspace("down");
      }
      if (isChord && e.key.toLowerCase() === "t") {
        e.preventDefault();
        handleNewTerminalTab();
      }
      if (isChord && e.key.toLowerCase() === "n" && !e.shiftKey) {
        e.preventDefault();
        handleNewFileTab();
      }
      if (isChord && e.key.toLowerCase() === "o") {
        e.preventDefault();
        handleOpenFileTab();
      }
      if (isChord && e.shiftKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        handleOpenDiffTab();
      }
      if (isChord && e.shiftKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setIsNewWorkspaceOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("contextmenu", handleGlobalContextMenu);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    isLeftSidebarOpen,
    isRightSidebarOpen,
    leftSidebar.width,
    rightSidebar.width,
    contextMenu,
    isCommandPaletteOpen,
    isSettingsOpen,
    isNewWorkspaceOpen,
    isAddRepoOpen,
    isPairingOpen
  ]);

  const refreshGitWorktrees = (repoPath: string) => {
    invoke<GitWorktreeInfo[]>("list_worktrees", { repoPath })
      .then(setGitWorktrees)
      .catch(console.error);
  };

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
          loadAllSessions();
          refreshGitWorktrees(sorted[0].path);
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
      }).catch(console.error);
    };
    window.addEventListener("hydra:refresh-projects", handleRefreshProjects);

    invoke<AvailableAgent[]>("list_available_agents")
      .then(setAvailableAgents)
      .catch(console.error);

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
      window.removeEventListener("hydra:refresh-projects", handleRefreshProjects);
      mql.removeEventListener("change", onSystemChange);
    };
  }, []);

  const loadSessionsForProject = (projectPath: string) => {
    invoke<DbSessionRecord[]>("list_persisted_sessions", { projectPath })
      .then((persisted) => {
        if (persisted && persisted.length > 0) {
          let loaded: WorktreeSession[] = persisted.map((p, idx) => ({
            id: p.id,
            project_path: p.project_path,
            title: p.title,
            branch: p.branch,
            agentName: p.agent_name,
            executable: p.executable,
            state: "idle",
            active: idx === 0,
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
        } else {
          const effectiveShell = hydraSettings.terminal_default_shell || "bash";
          const defaultSession: WorktreeSession = {
            id: `sess_main_${Date.now().toString().slice(-4)}`,
            project_path: projectPath,
            title: "Main Terminal Session",
            branch: "main",
            state: "idle",
            active: true,
            agentName: effectiveShell,
            executable: effectiveShell,
          };
          setSessions([defaultSession]);
          invoke("save_session_record", {
            record: {
              id: defaultSession.id,
              project_path: projectPath,
              title: defaultSession.title,
              branch: defaultSession.branch,
              agent_name: defaultSession.agentName,
              executable: defaultSession.executable,
              created_at: Date.now(),
              updated_at: Date.now(),
            }
          }).catch(console.error);
          const firstTabId = `tab_${defaultSession.id}`;
          setTabs([
            {
              id: firstTabId,
              title: `${defaultSession.executable} (active)`,
              type: "terminal",
              sessionId: defaultSession.id,
              executable: defaultSession.executable,
              cwd: defaultSession.project_path || projectPath,
            },
          ]);
          setActiveTabId(firstTabId);
        }
      })
      .catch(console.error);
  };

  // Load ALL sessions from ALL projects (for Agents view)
  const loadAllSessions = () => {
    invoke<DbSessionRecord[]>("list_persisted_sessions", { projectPath: null })
      .then((persisted) => {
        if (persisted && persisted.length > 0) {
          let loaded: WorktreeSession[] = persisted.map((p, idx) => ({
            id: p.id,
            project_path: p.project_path,
            title: p.title,
            branch: p.branch,
            agentName: p.agent_name,
            executable: p.executable,
            state: "idle",
            active: idx === 0,
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
        } else if (activeProject) {
          // Fallback: create default session for active project
          loadSessionsForProject(activeProject.path);
        }
      })
      .catch(console.error);
  };

  // Live polling of Herdr state engine + keep-awake sync (Orca AgentAwakeService auto)
  useEffect(() => {
    // Initial sync on hydraSettings change
    const workingInitial = sessions.filter((s) => s.state === "working").length;
    syncKeepAwake(Boolean((hydraSettings as any).keep_computer_awake_while_agents_run), workingInitial);
  }, [hydraSettings, sessions.map(s=>s.state).join(",")]);

  useEffect(() => {
    const interval = setInterval(() => {
      const currentActive = sessions.find((s) => s.active);
      if (currentActive) {
        invoke<string>("check_agent_state", { sessionId: currentActive.id })
          .then((detectedState) => {
            if (detectedState) {
              setSessions((prev) => {
                const next = prev.map((s) => s.active ? { ...s, state: detectedState as WorktreeSession["state"] } : s);
                // Sync keep-awake with new working count
                const wc = next.filter((s) => s.state === "working").length;
                syncKeepAwake(Boolean((hydraSettings as any).keep_computer_awake_while_agents_run), wc);
                return next;
              });
            } else {
              const wc = sessions.filter((s) => s.state === "working").length;
              syncKeepAwake(Boolean((hydraSettings as any).keep_computer_awake_while_agents_run), wc);
            }
          })
          .catch(() => {});
      } else {
        const wc = sessions.filter((s) => s.state === "working").length;
        syncKeepAwake(Boolean((hydraSettings as any).keep_computer_awake_while_agents_run), wc);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [sessions, hydraSettings]);

  // Poll keep-awake status for UI indicator (like Orca CaffeinateStatusSegment)
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

  const handleSelectProject = (proj: HydraProject) => {
    setActiveProject(proj);
    loadSessionsForProject(proj.path);
    refreshGitWorktrees(proj.path);
    if (tabs.length === 0) {
      const sId = `sess_${Date.now()}`;
      const id = `tab_${sId}`;
      const sh = hydraSettings.terminal_default_shell || "bash";
      const newSession: WorktreeSession = {
        id: sId,
        project_path: proj.path,
        title: proj.name,
        branch: proj.current_branch || "main",
        state: "idle",
        active: true,
        agentName: sh,
        executable: sh,
      };
      setSessions([newSession]);
      setTabs([{ id, title: proj.name, type: "terminal" }]);
      setActiveTabId(id);
    }
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        role: "agent",
        content: `Switched active workspace to "${proj.name}" (${proj.path}) on branch "${proj.current_branch}".`
      }
    ]);
  };

  const handleNavigateWorkspace = (direction: "up" | "down") => {
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
  };

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
    const id = `sess_wt_${wt.branch.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    if (!sessions.some((s) => s.id === id)) {
      const newSess: WorktreeSession = {
        id,
        project_path: wt.path,
        title: wt.branch,
        branch: wt.branch,
        state: "idle",
        active: true,
        agentName: "bash",
        executable: "bash",
      };
      setSessions((prev) => [newSess, ...prev.map((s) => ({ ...s, active: false }))]);
    } else {
      setSessions((prev) => prev.map((s) => ({ ...s, active: s.id === id })));
    }
    const tabId = `tab_${id}`;
    if (!tabsRef.current.some((t) => t.id === tabId)) {
      setTabs((prev) => [...prev, { id: tabId, title: wt.branch, type: "terminal" }]);
    }
    setActiveTabId(tabId);
  };

  const handleDeleteGitWorktree = (wt: GitWorktreeInfo) => {
    if (!activeProject) return;
    invoke("delete_worktree", {
      repoPath: activeProject.path,
      worktreePath: wt.path,
    })
      .then(() => {
        refreshGitWorktrees(activeProject.path);
      })
      .catch(console.error);
  };

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
    setTabs((prev) => [...prev, { id: tabId, title: `${branchName} (fleet)`, type: "terminal" }]);
    setActiveTabId(tabId);
  };

  const handleSelectSession = (id: string) => {
    setSessions((prev) =>
      prev.map((s) => ({ ...s, active: s.id === id }))
    );
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

  const handleReorderWorktrees = (newWorktrees: GitWorktreeInfo[]) => {
    setGitWorktrees(newWorktrees);
    try {
      localStorage.setItem("hydra:worktrees_order", JSON.stringify(newWorktrees.map(w => w.path)));
    } catch {}
  };

  const handleNewTerminalTab = (shell?: string) => {
    const sh = shell || hydraSettings.terminal_default_shell || "bash";
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const tabId = `tab_${sessionId}`;
    const terminalCount = tabsRef.current.filter((t) => t.type === "terminal").length;
    const title = terminalCount === 0 ? "Terminal" : `Terminal ${terminalCount + 1}`;
    const newSession: WorktreeSession = {
      id: sessionId,
      project_path: activeProject?.path ?? "",
      title: `Terminal (${sh})`,
      branch: activeProject?.current_branch ?? "main",
      state: "idle",
      active: true,
      agentName: sh,
      executable: sh,
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
    setTabs((prev) => [
      ...prev,
      {
        id: tabId,
        title,
        type: "terminal",
        sessionId,
        executable: sh,
        cwd: newSession.project_path,
      },
    ]);
    setActiveTabId(tabId);
  };
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
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(tabId);
  };

  const handleSelectWorkbenchTab = (tabId: string) => {
    setActiveTabId(tabId);
    const sId = tabId.startsWith("tab_") ? tabId.replace("tab_", "") : tabId;
    setSessions((prev) =>
      prev.map((s) => ({ ...s, active: s.id === sId }))
    );
  };

  const handleNewFileTab = () => {
    const count = Object.keys(fileTabContents).filter((k) => k.startsWith("tab_untitled_")).length + 1;
    const id = `tab_untitled_${Date.now()}`;
    const fileName = `Untitled-${count}.txt`;
    setFileTabContents((prev) => ({ ...prev, [id]: { original: "", modified: "", lang: "plaintext" } }));
    setTabs((prev) => [...prev, { id, title: fileName, type: "editor" }]);
    setActiveTabId(id);
  };


  const handleOpenFileTab = async () => {
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
  };

  const handleOpenDiffTab = () => {
    const tabId = `tab_diff_${Date.now()}`;
    setFileTabContents((prev) => ({
      ...prev,
      [tabId]: { original: diffOriginal, modified: diffModified, lang: previewLanguage },
    }));
    const title = activeProject?.name ? `${activeProject.name} (diff)` : "Git Diff";
    setTabs((prev) => [...prev, { id: tabId, title, type: "diff" }]);
    setActiveTabId(tabId);
  };

  const handleCloseTab = (id: string) => {
    if (id.startsWith("tab_sess_")) {
      const sId = id.replace("tab_", "");
      invoke("delete_session_record", { sessionId: sId }).catch(console.error);
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
  };

  const handleCloseTabsToRight = (id: string) => {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === id);
      if (idx === -1) return prev;
      const remaining = prev.slice(0, idx + 1);
      if (!remaining.some((t) => t.id === activeTabIdRef.current)) {
        setActiveTabId(id);
      }
      return remaining;
    });
  };

  const handleCloseTabsToLeft = (id: string) => {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === id);
      if (idx === -1) return prev;
      const remaining = prev.slice(idx);
      if (!remaining.some((t) => t.id === activeTabIdRef.current)) {
        setActiveTabId(id);
      }
      return remaining;
    });
  };

  const handleCloseAllTabs = () => {
    setTabs([]);
    setFileTabContents({});
    setActiveTabId("");
  };
  const handleRenameTab = (tabId: string, newTitle: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, title: newTitle } : t))
    );
  };


  // Context Menu Handlers
  const handleTerminalContextMenu = (
    x: number,
    y: number,
    actions?: TerminalContextActions
  ) => {
    const currentActive = sessions.find((s) => s.active);
    const sId = currentActive?.id ?? "sess_main";
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
                  if (txt) invoke("send_terminal_input", { sessionId: sId, input: txt });
                })
                .catch(console.error);
            }
          }
        },
        {
          separator: true,
          label: "Split Terminal Right",
          icon: <PanelRightClose className="w-3.5 h-3.5" />,
          shortcut: isMac ? "⌘\\" : "Ctrl+Shift+D",
          onClick: () => handleNewTab()
        },
        {
          label: "Split Terminal Down",
          icon: <PanelBottomClose className="w-3.5 h-3.5" />,
          shortcut: isMac ? "⌘Shift+\\" : "Ctrl+Shift+E",
          onClick: () => handleNewTab()
        },
        {
          separator: true,
          label: "Set Title…",
          icon: <Pencil className="w-3.5 h-3.5" />,
          shortcut: "Ctrl+Shift+R",
          onClick: () => {
            const currentTab = tabs.find((t) => t.id === activeTabId);
            const newName = window.prompt("Enter new tab name:", currentTab?.title ?? "Terminal");
            if (newName && newName.trim()) {
              handleRenameTab(activeTabId, newName.trim());
            }
          }
        },
        {
          label: "Copy Terminal ID",
          icon: <Copy className="w-3.5 h-3.5" />,
          onClick: () => {
            navigator.clipboard.writeText(sId).catch(console.error);
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
              invoke("send_terminal_input", { sessionId: sId, input: "\x0c" });
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
          label: "Close Terminal",
          icon: <Trash2 className="w-3.5 h-3.5" />,
          shortcut: isMac ? "⌘W" : "Ctrl+W",
          danger: true,
          onClick: () => {
            handleCloseTab(activeTabId);
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
          onClick: () => handleNewTab()
        },
        {
          label: "Split Terminal Down",
          icon: <PanelBottomClose className="w-3.5 h-3.5" />,
          shortcut: isMac ? "⌘Shift+\\" : "Ctrl+Shift+E",
          onClick: () => handleNewTab()
        },
        {
          separator: true,
          label: "Rename Tab...",
          icon: <Pencil className="w-3.5 h-3.5" />,
          onClick: () => {
            const newName = window.prompt("Enter new tab name:", tab.title);
            if (newName && newName.trim()) {
              handleRenameTab(tab.id, newName.trim());
            }
          }
        },
        {
          label: "Duplicate Tab",
          icon: <Copy className="w-3.5 h-3.5" />,
          onClick: () => {
            const newId = `tab_${Date.now()}`;
            setTabs((prev) => [...prev, { ...tab, id: newId, title: `${tab.title} (copy)` }]);
            setActiveTabId(newId);
          }
        },
        {
          separator: true,
          label: "Close Tab",
          icon: <X className="w-3.5 h-3.5" />,
          shortcut: isMac ? "⌘W" : "Ctrl+W",
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
    setPinnedProjects((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); persistSet("hydra:pinned_projects", next); return next; });
  };
  const toggleUnreadProject = (id: string) => {
    setUnreadProjects((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); persistSet("hydra:unread_projects", next); return next; });
  };
  const togglePinWorktree = (path: string) => {
    setPinnedWorktrees((prev) => { const next = new Set(prev); if (next.has(path)) next.delete(path); else next.add(path); persistSet("hydra:pinned_worktrees", next); return next; });
  };
  const toggleUnreadWorktree = (path: string) => {
    setUnreadWorktrees((prev) => { const next = new Set(prev); if (next.has(path)) next.delete(path); else next.add(path); persistSet("hydra:unread_worktrees", next); return next; });
  };

  const handleProjectContextMenu = (e: React.MouseEvent, proj: HydraProject) => {
    const isPinned = pinnedProjects.has(proj.id);
    const isUnread = unreadProjects.has(proj.id);
    const groupId = projectGroupMap[proj.id];
    const groupName = groupId ? projectGroups.find((g) => g.id === groupId)?.name : undefined;
    void groupName;
    const lineageParent = worktreeLineage[proj.path];
    const eligibleParents = projects.filter((p) => p.id !== proj.id).concat(gitWorktrees.filter((w) => w.path !== proj.path).map((w) => ({ id: w.path, name: w.branch || w.path } as any)));
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
            const newName = window.prompt("Project display name:", proj.name);
            if (newName && newName.trim() && newName.trim() !== proj.name) {
              try {
                const overrides = JSON.parse(localStorage.getItem("hydra:project_name_overrides") || "{}");
                overrides[proj.id] = newName.trim();
                localStorage.setItem("hydra:project_name_overrides", JSON.stringify(overrides));
                setProjects((prev) => prev.map((p) => p.id === proj.id ? { ...p, name: newName.trim() } : p));
                if (activeProject?.id === proj.id) setActiveProject((prev) => prev ? { ...prev, name: newName.trim() } : prev);
              } catch {}
            }
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
            const name = window.prompt("New group name:", `${proj.name} group`);
            if (!name || !name.trim()) return;
            const id = `grp_${Date.now()}`;
            const next = [...projectGroups, { id, name: name.trim() }];
            setProjectGroups(next); persistGroups(next);
            const nextMap = { ...projectGroupMap, [proj.id]: id };
            setProjectGroupMap(nextMap); persistGroupMap(nextMap);
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
              setProjectGroupMap(nextMap); persistGroupMap(nextMap);
            },
          })),
          onClick: () => {},
        } as ContextMenuItem] : []),
        ...(groupId ? [{ label: "Remove from group", icon: <X className="w-3.5 h-3.5" />, onClick: () => { const m = { ...projectGroupMap }; delete m[proj.id]; setProjectGroupMap(m); persistGroupMap(m); } } as ContextMenuItem] : []),
        { label: lineageParent ? "Change Parent Worktree..." : "Set Parent Worktree...", icon: <FolderTree className="w-3.5 h-3.5" />, separator: true, disabled: eligibleParents.length === 0, title: eligibleParents.length === 0 ? "No eligible parents" : undefined, onClick: () => {
            if (eligibleParents.length === 0) return;
            const opts = eligibleParents.map((p: any) => `${p.name} — ${p.path || p.id}`).join("\n");
            const sel = window.prompt(`Choose parent (paste path):\n${opts}\n\nEnter parent path:`);
            if (sel && sel.trim()) {
              const next = { ...worktreeLineage, [proj.path]: sel.trim() };
              setWorktreeLineage(next); persistLineage(next);
            }
          }
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
    const eligibleParents = projects.filter((p) => p.path !== wt.path).concat(gitWorktrees.filter((w) => w.path !== wt.path).map((w) => ({ id: w.path, name: w.branch } as any)));
    const developerRevealed = e.altKey;
    const openInChildren = getOpenInItems(wt.path);
    const descendantCount = Object.values(worktreeLineage).filter((parent) => parent === wt.path).length;

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        { label: "Workspace", isLabel: true, onClick: () => {} },
        { label: "Update Worktree...", icon: <Pencil className="w-3.5 h-3.5" />, onClick: () => {
            const newBranch = window.prompt("Rename branch / display:", wt.branch);
            if (newBranch && newBranch.trim() && newBranch.trim() !== wt.branch) {
              // Not implemented as git rename; just copy for now
              navigator.clipboard.writeText(newBranch.trim()).catch(console.error);
            }
          }
        },
        { label: "Open in", icon: <FolderOpen className="w-3.5 h-3.5" />, children: openInChildren, onClick: () => {} },
        { label: "Copy Path", icon: <Copy className="w-3.5 h-3.5" />, onClick: () => navigator.clipboard.writeText(wt.path).catch(console.error) },
        { label: `Copy Branch: ${wt.branch}`, icon: <GitBranch className="w-3.5 h-3.5" />, onClick: () => navigator.clipboard.writeText(wt.branch).catch(console.error) },
        { label: "Copy Commit", icon: <Copy className="w-3.5 h-3.5" />, onClick: () => navigator.clipboard.writeText(wt.head_commit).catch(console.error) },
        { label: isPinned ? "Unpin" : "Pin", icon: isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />, separator: true, onClick: () => togglePinWorktree(wt.path) },
        { label: isUnread ? "Mark Read" : "Mark Unread", icon: isUnread ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />, onClick: () => toggleUnreadWorktree(wt.path) },
        { label: lineageParent ? "Change Parent Worktree..." : "Set Parent Worktree...", icon: <FolderTree className="w-3.5 h-3.5" />, separator: true, disabled: eligibleParents.length === 0, onClick: () => {
            const opts = eligibleParents.map((p: any) => `${p.name} — ${p.path || p.id}`).join("\n");
            const sel = window.prompt(`Choose parent:\n${opts}\n\nEnter parent path:`);
            if (sel && sel.trim()) { const next = { ...worktreeLineage, [wt.path]: sel.trim() }; setWorktreeLineage(next); persistLineage(next); }
          }
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
        { label: "Update Session...", icon: <Pencil className="w-3.5 h-3.5" />, onClick: () => {
            const newTitle = window.prompt("Enter new session title:", session.title);
            if (newTitle && newTitle.trim()) {
              const updated = { ...session, title: newTitle.trim() };
              setSessions((prev) => prev.map((s) => (s.id === session.id ? updated : s)));
              invoke("save_session_record", { record: { id: updated.id, project_path: session.project_path, title: updated.title, branch: updated.branch, agent_name: updated.agentName, executable: updated.executable, created_at: Date.now(), updated_at: Date.now() } }).catch(console.error);
            }
          }
        },
        { label: "Open in", icon: <FolderOpen className="w-3.5 h-3.5" />, children: openInChildren, onClick: () => {} },
        { label: `Copy Branch: ${session.branch}`, icon: <GitBranch className="w-3.5 h-3.5" />, onClick: () => navigator.clipboard.writeText(session.branch).catch(console.error) },
        { label: "Copy Path", icon: <Copy className="w-3.5 h-3.5" />, onClick: () => navigator.clipboard.writeText(session.project_path).catch(console.error) },
        { label: "Copy Session Title", icon: <Copy className="w-3.5 h-3.5" />, onClick: () => navigator.clipboard.writeText(session.title).catch(console.error) },
        { label: isPinned ? "Unpin" : "Pin", icon: isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />, separator: true, onClick: () => togglePinWorktree(session.id) },
        { label: isUnread ? "Mark Read" : "Mark Unread", icon: isUnread ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />, onClick: () => toggleUnreadWorktree(session.id) },
        { label: "Duplicate Session", icon: <Copy className="w-3.5 h-3.5" />, onClick: () => {
            const newId = `sess_${Date.now()}`;
            const dup: WorktreeSession = { ...session, id: newId, title: `${session.title} (copy)`, active: false };
            setSessions((prev) => [...prev, dup]);
            invoke("save_session_record", { record: { id: dup.id, project_path: dup.project_path, title: dup.title, branch: dup.branch, agent_name: dup.agentName, executable: dup.executable, created_at: Date.now(), updated_at: Date.now() } }).catch(console.error);
          }
        },
        { label: lineageParent ? "Change Parent Worktree..." : "Set Parent Worktree...", icon: <FolderTree className="w-3.5 h-3.5" />, separator: true, disabled: projects.length === 0, onClick: () => {
            const opts = projects.map((p) => `${p.name} — ${p.path}`).join("\n");
            const sel = window.prompt(`Choose parent:\n${opts}\n\nEnter parent path:`);
            if (sel && sel.trim()) { const next = { ...worktreeLineage, [session.project_path]: sel.trim(), [session.id]: sel.trim() }; setWorktreeLineage(next); persistLineage(next); }
          }
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
        leftWidth={leftSidebar.width}
        leftStyle={leftSidebarStyle}
        onToggleLeft={() => updateLeftSidebar(!isLeftSidebarOpen)}
        onToggleRight={() => updateRightSidebar(!isRightSidebarOpen)}
      />

      {/* Main Resizable Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Panel: Worktree / Fleet Manager with Project Switcher */}
        {isLeftSidebarOpen && (
          <>
            <aside 
              ref={leftSidebar.containerRef}
              style={{ width: `${leftSidebar.width}px`, ...leftSidebarStyle }}
              className="flex flex-col border-r border-worktree-sidebar-border bg-worktree-sidebar shrink-0 overflow-hidden relative"
            >
              <WorktreeSidebar 
                sessions={sessions}
                availableAgents={availableAgents}
                projects={projects}
                activeProject={activeProject}
                gitStatus={gitStatus}
                gitWorktrees={gitWorktrees}
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
                projectGroupMap={projectGroupMap}
                projectGroups={projectGroups}
                compactCards={Boolean(hydraSettings.compact_worktree_cards)}
                isModalOpen={isCommandPaletteOpen || isSettingsOpen || isAddRepoOpen || isNewWorkspaceOpen || isPairingOpen}
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
                onSelectTab={handleSelectWorkbenchTab}
                onCloseTab={handleCloseTab}
                onNewTab={() => handleNewTerminalTab()}
                onNewTerminalTab={handleNewTerminalTab}
                onNewFileTab={handleNewFileTab}
                onOpenFileTab={handleOpenFileTab}
                onLaunchAgent={handleLaunchAgent}
                detectedAgents={availableAgents}
                onRenameTab={handleRenameTab}
                onTabContextMenu={handleTabContextMenu}
                onTabBarContextMenu={handleTabBarContextMenu}
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

                {/* Orca TerminalOverlaySlot parity: keep each terminal tab mounted in DOM and toggle visibility via hidden so processes and scrollback survive tab switching */}
                {tabs
                  .filter((t) => t.type === "terminal")
                  .map((t) => {
                    const isActive = currentTab?.type === "terminal" && activeTabId === t.id;
                    const sId = t.sessionId || (t.id.startsWith("tab_") ? t.id.replace("tab_", "") : t.id);
                    return (
                      <div
                        key={t.id}
                        className={`absolute inset-0 w-full h-full ${isActive ? "block" : "hidden pointer-events-none"}`}
                      >
                        <TerminalDrawer 
                          sessionId={sId} 
                          executable={t.executable ?? (hydraSettings.terminal_default_shell || "bash")}
                          cwd={t.cwd || activeProject?.path}
                          settings={hydraSettings}
                          onContextMenu={handleTerminalContextMenu}
                        />
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
                rootPath={activeProject?.path ?? null}
                isGit={activeProject?.is_git ?? false}
                openInApps={hydraSettings.open_in_applications ?? DEFAULT_OPEN_IN_APPLICATIONS}
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
                  if (!activeProject?.path) return;
                  try {
                    const diff = await invoke<string>("git_diff_cmd", { repoPath: activeProject.path, file: relPath, staged });
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

      {/* Command Palette */}
      <CommandPalette 
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNewTerminal={() => handleNewTerminalTab()}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenPairing={() => setIsPairingOpen(true)}
        onSwitchTab={setActiveTabId}
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
