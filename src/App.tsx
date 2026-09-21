import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
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
  const [fileTabContents, setFileTabContents] = useState<Record<string, { original: string; modified: string; lang: string }>>({
    "tab_diff_1": { original: MOCK_ORIGINAL, modified: MOCK_MODIFIED, lang: "rust" },
  });
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

  // Agent Fleet Sessions
  const [sessions, setSessions] = useState<WorktreeSession[]>([]);

  // Center Workbench Tabs
  const [tabs, setTabs] = useState<TabItem[]>([
    { id: "tab_main", title: "bash (active)", type: "terminal" },
    { id: "tab_diff_1", title: "main.rs (diff)", type: "diff" },
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
        setProjects(projs);
        if (projs.length > 0) {
          setActiveProject(projs[0]);
          loadSessionsForProject(projs[0].path);
          refreshGitWorktrees(projs[0].path);
        }
      })
      .catch(console.error);

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
  }, []);

  const loadSessionsForProject = (projectPath: string) => {
    invoke<DbSessionRecord[]>("list_persisted_sessions", { projectPath })
      .then((persisted) => {
        if (persisted && persisted.length > 0) {
          const loaded: WorktreeSession[] = persisted.map((p, idx) => ({
            id: p.id,
            project_path: p.project_path,
            title: p.title,
            branch: p.branch,
            agentName: p.agent_name,
            executable: p.executable,
            state: "idle",
            active: idx === 0,
          }));
          setSessions(loaded);
          const firstTabId = `tab_${loaded[0].id}`;
          setTabs([
            { id: firstTabId, title: `${loaded[0].executable} (active)`, type: "terminal" },
            { id: "tab_diff_1", title: "main.rs (diff)", type: "diff" },
          ]);
          setActiveTabId(firstTabId);
        } else {
          const effectiveShell = (hydraSettings as any).terminal_default_shell || "bash";
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
            { id: firstTabId, title: "bash (active)", type: "terminal" },
            { id: "tab_diff_1", title: "main.rs (diff)", type: "diff" },
          ]);
          setActiveTabId(firstTabId);
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
    if (!tabsRef.current.some((t) => t.id === tabId)) {
      const targetSession = sessions.find((s) => s.id === id);
      setTabs((prev) => [
        ...prev,
        { id: tabId, title: `${targetSession?.executable ?? "shell"}`, type: "terminal" }
      ]);
    }
    setActiveTabId(tabId);
  };

  const handleDeleteSession = (id: string) => {
    if (sessions.length <= 1) return;
    invoke("delete_session_record", { sessionId: id }).catch(console.error);
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setTabs((prev) => prev.filter((t) => t.id !== `tab_${id}`));
  };

  const handleSelectTab = (id: string) => {
    setActiveTabId(id);
    const sId = id.replace(/^tab_/, "");
    setSessions((prev) => {
      if (prev.some((s) => s.id === sId)) {
        return prev.map((s) => ({ ...s, active: s.id === sId }));
      }
      return prev;
    });
  };

  const handleNewTab = () => {
    const sId = `sess_${Date.now()}`;
    const tabId = `tab_${sId}`;
    const sh = hydraSettings.terminal_default_shell || "bash";
    const terminalCount = tabsRef.current.filter((t) => t.type === "terminal").length;
    const title = terminalCount === 0 ? "Terminal" : `Terminal ${terminalCount + 1}`;
    const newSession: WorktreeSession = {
      id: sId,
      project_path: activeProject?.path || "",
      title,
      branch: activeProject?.current_branch || "main",
      state: "idle",
      active: true,
      agentName: sh,
      executable: sh,
    };
    setSessions((prev) => [newSession, ...prev.map((s) => ({ ...s, active: false }))]);
    setTabs((prev) => [...prev, { id: tabId, title, type: "terminal" }]);
    setActiveTabId(tabId);
  };

  const handleCloseTab = (id: string) => {
    const sId = id.replace(/^tab_/, "");
    setSessions((prev) => prev.filter((s) => s.id !== sId));
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


  const handleSessionContextMenu = (e: React.MouseEvent, session: WorktreeSession) => {
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        {
          label: `Copy Branch: ${session.branch}`,
          icon: <GitBranch className="w-3.5 h-3.5" />,
          onClick: () => navigator.clipboard.writeText(session.branch).catch(console.error)
        },
        {
          label: "Rename Session...",
          icon: <Pencil className="w-3.5 h-3.5" />,
          onClick: () => {
            const newTitle = window.prompt("Enter new session title:", session.title);
            if (newTitle && newTitle.trim()) {
              const updated = { ...session, title: newTitle.trim() };
              setSessions((prev) => prev.map((s) => (s.id === session.id ? updated : s)));
              invoke("save_session_record", {
                record: {
                  id: updated.id,
                  project_path: activeProject?.path ?? "",
                  title: updated.title,
                  branch: updated.branch,
                  agent_name: updated.agentName,
                  executable: updated.executable,
                  created_at: Date.now(),
                  updated_at: Date.now(),
                }
              }).catch(console.error);
            }
          }
        },
        {
          label: "Close / Delete Fleet Session",
          icon: <Trash2 className="w-3.5 h-3.5" />,
          danger: true,
          separator: true,
          onClick: () => handleDeleteSession(session.id)
        }
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
  const activeSession = sessions.find((s) => s.active);
  const terminalSessionId = activeTabId.startsWith("tab_")
    ? activeTabId.replace(/^tab_/, "")
    : (activeSession?.id ?? "sess_main");

  return (
    <div className="flex flex-col h-screen w-screen font-sans antialiased select-none overflow-hidden" style={{ background: "var(--app-bg)", color: "var(--app-fg)" }}>
      {/* Custom Window Titlebar */}
      <WindowTitlebar 
        title={status} 
        isLeftOpen={isLeftSidebarOpen}
        isRightOpen={isRightSidebarOpen}
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
              style={{ width: `${leftSidebar.width}px` }}
              className="flex flex-col border-r border-[#222] bg-[#0e0f11] shrink-0 overflow-hidden relative"
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
                onSelectTab={handleSelectTab}
                onCloseTab={handleCloseTab}
                onNewTab={handleNewTab}
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
                })() : (
                  <TerminalDrawer 
                    key={`${terminalSessionId}-${hydraSettings.terminal_default_shell}`}
                    sessionId={terminalSessionId} 
                    executable={activeSession?.executable ?? (hydraSettings.terminal_default_shell || "bash")}
                    cwd={activeSession?.project_path || activeProject?.path}
                    settings={hydraSettings}
                    onContextMenu={handleTerminalContextMenu}
                  />
                )}
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
                if (!activeProject && projects.length > 0) {
                  handleSelectProject(projects[0]);
                }
                setIsNewWorkspaceOpen(true);
              }}
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
              className="flex flex-col border-l border-[#222] bg-[#0e0f11] shrink-0 overflow-hidden relative"
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
        onNewTerminal={handleNewTab}
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
            if (projs.length > 0) handleSelectProject(projs[0]);
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
