import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { usePanelResize } from "./hooks/usePanelResize";
import { TerminalDrawer } from "./components/TerminalDrawer";
import { WindowTitlebar } from "./components/WindowTitlebar";
import { CodeDiffViewer } from "./components/CodeDiffViewer";
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
import { DEFAULT_HYDRA_SETTINGS, normalizeHydraSettings } from "./shared/settings-types";
import { applyDocumentTheme } from "./lib/document-theme";
import { CommandPalette } from "./components/CommandPalette";
import { CustomContextMenu, type ContextMenuItem } from "./components/CustomContextMenu";
import { NewWorkspaceComposer } from "./components/NewWorkspaceComposer";
import { 
  Bot, 
  Play, 
  CheckCircle2, 
  Send,
  Smartphone,
  Copy,
  ClipboardPaste,
  Eraser,
  SplitSquareVertical,
  Trash2,
  GitBranch,
  Pencil,
  Coffee
} from "lucide-react";
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
  const [promptInput, setPromptInput] = useState("");
  const [isPairingOpen, setIsPairingOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddRepoOpen, setIsAddRepoOpen] = useState(false);
  const [isNewWorkspaceOpen, setIsNewWorkspaceOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
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
  const [keepAwakeActive, setKeepAwakeActive] = useState(false);

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
  const [activeTabId, setActiveTabId] = useState("tab_main");

  const [messages, setMessages] = useState<Array<{ id: number; role: string; content: string }>>([
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
      const isChord = e.ctrlKey || e.metaKey;
      if (isChord && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
      if (isChord && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setIsLeftSidebarOpen((prev) => {
          const next = !prev;
          updateLeftSidebar(next);
          return next;
        });
      }
      if (isChord && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setIsRightSidebarOpen((prev) => {
          const next = !prev;
          updateRightSidebar(next);
          return next;
        });
      }
      if (isChord && e.key === ",") {
        e.preventDefault();
        setIsSettingsOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("contextmenu", handleGlobalContextMenu);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isLeftSidebarOpen, isRightSidebarOpen, leftSidebar.width, rightSidebar.width]);

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
    }).catch(console.error);

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
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        role: "agent",
        content: `Switched active workspace to "${proj.name}" (${proj.path}) on branch "${proj.current_branch}".`
      }
    ]);
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
    const id = `sess_wt_${wt.branch.replace('/', '_')}`;
    if (!sessions.some((s) => s.id === id)) {
      const newSess: WorktreeSession = {
        id,
        project_path: activeProject?.path ?? "",
        title: `Worktree: ${wt.branch}`,
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
    if (!tabs.some((t) => t.id === tabId)) {
      setTabs((prev) => [...prev, { id: tabId, title: `${wt.branch} (wt)`, type: "terminal" }]);
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

  const handleCreatedWorkspace = (worktreePath: string, agentName: string, executable: string) => {
    if (activeProject) refreshGitWorktrees(activeProject.path);
    const branchName = worktreePath.split("-").pop() ?? "feature";
    const id = `sess_wt_${Date.now().toString().slice(-4)}`;
    const newSession: WorktreeSession = {
      id,
      project_path: activeProject?.path ?? "",
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
        project_path: activeProject?.path ?? "",
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
    if (!tabs.some((t) => t.id === tabId)) {
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

  const handleNewTab = () => {
    const id = `tab_${Date.now()}`;
    const sh = (hydraSettings as any).terminal_default_shell || "bash";
    setTabs((prev) => [...prev, { id, title: `${sh} #${prev.length + 1}`, type: "terminal" }]);
    setActiveTabId(id);
  };

  const handleCloseTab = (id: string) => {
    if (tabs.length <= 1) return;
    const remaining = tabs.filter((t) => t.id !== id);
    setTabs(remaining);
    if (activeTabId === id) {
      setActiveTabId(remaining[remaining.length - 1].id);
    }
  };

  const handleRenameTab = (tabId: string, newTitle: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, title: newTitle } : t))
    );
  };

  // Context Menu Handlers
  const handleTerminalContextMenu = (x: number, y: number) => {
    const currentActive = sessions.find((s) => s.active);
    const sId = currentActive?.id ?? "sess_main";

    setContextMenu({
      x,
      y,
      items: [
        {
          label: "Copy Selection",
          icon: <Copy className="w-3.5 h-3.5" />,
          shortcut: "Ctrl+Shift+C",
          onClick: () => {
            const sel = window.getSelection()?.toString();
            if (sel) navigator.clipboard.writeText(sel);
          }
        },
        {
          label: "Paste into Terminal",
          icon: <ClipboardPaste className="w-3.5 h-3.5" />,
          shortcut: "Ctrl+Shift+V",
          onClick: () => {
            navigator.clipboard.readText().then((txt) => {
              if (txt) invoke("send_terminal_input", { sessionId: sId, input: txt });
            });
          }
        },
        {
          label: "Clear Terminal Screen",
          icon: <Eraser className="w-3.5 h-3.5" />,
          shortcut: "Ctrl+L",
          separator: true,
          onClick: () => {
            invoke("send_terminal_input", { sessionId: sId, input: "\x0c" });
          }
        },
        {
          label: "Split Terminal Tab",
          icon: <SplitSquareVertical className="w-3.5 h-3.5" />,
          onClick: () => handleNewTab()
        }
      ]
    });
  };

  const handleTabContextMenu = (e: React.MouseEvent, tab: TabItem) => {
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        {
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
          label: "Close Tab",
          icon: <Trash2 className="w-3.5 h-3.5" />,
          shortcut: "Ctrl+W",
          separator: true,
          onClick: () => handleCloseTab(tab.id)
        },
        {
          label: "Close Other Tabs",
          onClick: () => {
            setTabs([tab]);
            setActiveTabId(tab.id);
          }
        },
        {
          label: "Duplicate Tab",
          onClick: () => {
            const newId = `tab_${Date.now()}`;
            setTabs((prev) => [...prev, { ...tab, id: newId, title: `${tab.title} (copy)` }]);
            setActiveTabId(newId);
          }
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
          onClick: () => navigator.clipboard.writeText(session.branch)
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
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden" style={{ background: "var(--app-bg)" }}>
          <WorkbenchTabBar 
            tabs={tabs}
            activeTabId={activeTabId}
            onSelectTab={setActiveTabId}
            onCloseTab={handleCloseTab}
            onNewTab={handleNewTab}
            onRenameTab={handleRenameTab}
            onTabContextMenu={handleTabContextMenu}
          />

          <div className="flex-1 overflow-hidden relative">
            {currentTab?.type === "diff" ? (
              <CodeDiffViewer 
                original={MOCK_ORIGINAL} 
                modified={MOCK_MODIFIED} 
                language="rust"
                theme={hydraSettings.theme === "light" ? "vs" : "vs-dark"}
              />
            ) : (
              <TerminalDrawer 
                key={`${activeSession?.id ?? "sess_main"}-${hydraSettings.terminal_default_shell}`}
                sessionId={activeSession?.id ?? "sess_main"} 
                executable={activeSession?.executable ?? (hydraSettings.terminal_default_shell || "bash")}
                settings={hydraSettings}
                onContextMenu={handleTerminalContextMenu}
              />
            )}
          </div>
        </main>

        {/* Right Panel: Agent Fleet, Chat & Actions */}
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
              <div className="h-8 border-b border-[#222] px-3 flex items-center justify-between text-[11px] uppercase tracking-wider text-neutral-400 font-medium bg-[#111214] shrink-0">
                <span className="flex items-center gap-1.5 text-neutral-200">
                  <Bot className="w-3.5 h-3.5 text-emerald-400" />
                  Active Agent
                </span>
                <div className="flex items-center gap-2">
                  {keepAwakeActive && (
                    <span title="Keep awake active — preventing display/system sleep while agents work" className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      <Coffee className="w-3 h-3" />
                      awake
                    </span>
                  )}
                  <button
                    onClick={() => setIsPairingOpen(true)}
                    title="Pair Mobile Companion"
                    className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition flex items-center gap-1 cursor-pointer"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                  </button>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-medium ${
                    activeSession?.state === "working" 
                      ? "bg-amber-500/20 text-amber-400 animate-pulse" 
                      : activeSession?.state === "blocked" 
                        ? "bg-red-500/20 text-red-400" 
                        : "bg-emerald-500/20 text-emerald-400"
                  }`}>
                    {activeSession?.state.toUpperCase() ?? "IDLE"}
                  </span>
                </div>
              </div>

              <div className="flex-1 p-3 overflow-y-auto space-y-3">
                {messages.map((m) => (
                  <div 
                    key={m.id} 
                    className={`p-3 rounded-lg border text-xs ${
                      m.role === "user" 
                        ? "bg-[#18191d] border-[#2c2d33] text-neutral-100 ml-4" 
                        : "bg-[#141518] border-[#26272b] text-neutral-300 mr-4"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                        m.role === "user" ? "bg-blue-500/20 text-blue-400" : "bg-emerald-500/20 text-emerald-400"
                      }`}>
                        {m.role === "user" ? "U" : "H"}
                      </div>
                      <span className="font-semibold text-neutral-300 capitalize">{m.role}</span>
                    </div>
                    <p className="leading-relaxed text-[11px]">{m.content}</p>
                  </div>
                ))}

                {/* Tool Approval Card (Orca Style) */}
                <div className="p-3 rounded-lg bg-neutral-950 border border-amber-500/30 text-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 flex items-center gap-1">
                      <Play className="w-3 h-3" />
                      Tool Execution Request
                    </span>
                    <span className="text-[10px] text-neutral-500 font-mono">bash</span>
                  </div>
                  <div className="bg-[#111214] p-2 rounded font-mono text-[11px] text-neutral-200 border border-neutral-800 mb-3 overflow-x-auto">
                    cargo test --workspace
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        invoke("resolve_tool_approval", {
                          approvalId: "appr_1",
                          sessionId: activeSession?.id ?? "sess_main",
                          status: "approved"
                        }).catch(console.error);
                      }}
                      className="flex-1 py-1 px-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-[11px] flex items-center justify-center gap-1 transition cursor-pointer"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      Approve (Ctrl+Enter)
                    </button>
                    <button 
                      onClick={() => {
                        invoke("resolve_tool_approval", {
                          approvalId: "appr_1",
                          sessionId: activeSession?.id ?? "sess_main",
                          status: "rejected"
                        }).catch(console.error);
                      }}
                      className="px-3 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px] transition cursor-pointer"
                    >
                      Reject (Esc)
                    </button>
                  </div>
                </div>
              </div>

              {/* Input Prompt */}
              <div className="p-3 border-t border-[#222] bg-[#111214] shrink-0">
                <div className="flex items-center gap-2">
                  <input 
                    type="text"
                    value={promptInput}
                    onChange={(e) => setPromptInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Instruct Hydra agent... (Enter to send)"
                    className="flex-1 bg-[#0c0d0e] border border-[#26272b] rounded-md px-3 py-2 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-emerald-500/80 transition font-sans"
                  />
                  <button 
                    onClick={handleSendMessage}
                    className="p-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white transition cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
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
        activeProjectName={activeProject?.name ?? "hydra"}
        activeRepoPath={activeProject?.path ?? "/home/renan/src/hydra"}
        availableAgents={availableAgents}
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
