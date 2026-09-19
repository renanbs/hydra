import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { usePanelResize } from "./hooks/usePanelResize";
import { TerminalDrawer } from "./components/TerminalDrawer";
import { WindowTitlebar } from "./components/WindowTitlebar";
import { CodeDiffViewer } from "./components/CodeDiffViewer";
import { WorktreeSidebar, type WorktreeSession, type AvailableAgent, type GitRepoStatus } from "./components/sidebar/WorktreeSidebar";
import { WorkbenchTabBar, type TabItem } from "./components/workbench/WorkbenchTabBar";
import { PairingModal } from "./components/PairingModal";
import { SettingsModal, type HydraSettings } from "./components/SettingsModal";
import { CommandPalette } from "./components/CommandPalette";
import { CustomContextMenu, type ContextMenuItem } from "./components/CustomContextMenu";
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
  Plus
} from "lucide-react";
import "./App.css";

const MOCK_ORIGINAL = `fn main() {
    println!("Hello from Hydra Core");
}`;

const MOCK_MODIFIED = `fn main() {
    // High-performance Herdr shadow buffer with zero UI leakage
    println!("Hello from Hydra ADE (Autonomous Development Environment)");
}`;

export default function App() {
  const [status, setStatus] = useState("Initializing...");
  const [promptInput, setPromptInput] = useState("");
  const [isPairingOpen, setIsPairingOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
  const [availableAgents, setAvailableAgents] = useState<AvailableAgent[]>([]);
  const [gitStatus, setGitStatus] = useState<GitRepoStatus | null>(null);

  // Estado do Menu de Contexto Customizado (Orca Style)
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    items: ContextMenuItem[];
  } | null>(null);

  // Agent Fleet Sessions
  const [sessions, setSessions] = useState<WorktreeSession[]>([
    {
      id: "sess_main",
      title: "Main Terminal Session",
      branch: "main",
      state: "idle",
      active: true,
      agentName: "bash",
      executable: "bash"
    }
  ]);

  // Center Workbench Tabs
  const [tabs, setTabs] = useState<TabItem[]>([
    { id: "tab_sess_main", title: "bash (active)", type: "terminal" },
    { id: "tab_diff_1", title: "main.rs (diff)", type: "diff" },
  ]);
  const [activeTabId, setActiveTabId] = useState("tab_sess_main");

  const [messages, setMessages] = useState<Array<{ id: number; role: string; content: string }>>([
    {
      id: 1,
      role: "agent",
      content: "Hydra ADE initialized. Press Ctrl+P for Command Palette, right-click anywhere for context menus."
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

  // Global Keyboard Shortcuts (Orca Style: Ctrl+P, Ctrl+B, Ctrl+J, Ctrl+,)
  useEffect(() => {
    // 1. Bloqueia 100% o menu de contexto padrão do WebKit/Navegador em todo o app
    const handleGlobalContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    window.addEventListener("contextmenu", handleGlobalContextMenu);

    // 2. Atalhos de Teclado
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+P / Cmd+P -> Command Palette
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
      // Ctrl+B / Cmd+B -> Toggle Left Sidebar
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setIsLeftSidebarOpen((prev) => !prev);
      }
      // Ctrl+J / Cmd+J -> Toggle Right Agent Panel
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setIsRightSidebarOpen((prev) => !prev);
      }
      // Ctrl+, -> Open Settings
      if ((e.ctrlKey || e.metaKey) && e.key === ",") {
        e.preventDefault();
        setIsSettingsOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("contextmenu", handleGlobalContextMenu);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    invoke<string>("get_system_status")
      .then(setStatus)
      .catch(console.error);

    invoke<AvailableAgent[]>("list_available_agents")
      .then(setAvailableAgents)
      .catch(console.error);

    invoke<GitRepoStatus>("get_repo_git_status")
      .then(setGitStatus)
      .catch(console.error);

    const interval = setInterval(() => {
      const currentActive = sessions.find((s) => s.active);
      if (!currentActive) return;

      invoke<string>("check_agent_state", { sessionId: currentActive.id })
        .then((detectedState) => {
          if (detectedState) {
            setSessions((prev) =>
              prev.map((s) =>
                s.active ? { ...s, state: detectedState as WorktreeSession["state"] } : s
              )
            );
          }
        })
        .catch(() => {});
    }, 1500);

    return () => clearInterval(interval);
  }, [sessions]);

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

  const handleNewSessionWithAgent = (agent: AvailableAgent) => {
    const id = `sess_${agent.id}_${Date.now().toString().slice(-4)}`;
    const newSession: WorktreeSession = {
      id,
      title: `${agent.name} Task`,
      branch: `feat/${agent.id}`,
      state: "working",
      active: true,
      agentName: agent.name,
      executable: agent.executable
    };

    setSessions((prev) => [
      newSession,
      ...prev.map((s) => ({ ...s, active: false }))
    ]);

    const tabId = `tab_${id}`;
    setTabs((prev) => [
      ...prev,
      { id: tabId, title: `${agent.id} (fleet)`, type: "terminal" }
    ]);
    setActiveTabId(tabId);

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        role: "agent",
        content: `Spawned ${agent.name} (${agent.executable}) inside persistent shadow buffer. Monitoring state...`
      }
    ]);
  };

  const handleDeleteSession = (id: string) => {
    if (sessions.length <= 1) return;
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setTabs((prev) => prev.filter((t) => t.id !== `tab_${id}`));
  };

  const handleNewTab = () => {
    const id = `tab_${Date.now()}`;
    setTabs((prev) => [...prev, { id, title: `bash #${prev.length + 1}`, type: "terminal" }]);
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

  // --- Handlers de Menus de Contexto Customizados ---
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
          label: "Close Tab",
          icon: <Trash2 className="w-3.5 h-3.5" />,
          shortcut: "Ctrl+W",
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
          icon: <Plus className="w-3.5 h-3.5" />,
          separator: true,
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
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        role: "agent",
        content: `Settings updated: font size ${newSettings.terminal_font_size}px, auto-approve reads: ${newSettings.auto_approve_reads ? "on" : "off"}.`
      }
    ]);
  };

  const currentTab = tabs.find((t) => t.id === activeTabId);
  const activeSession = sessions.find((s) => s.active);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0c0d0e] text-[#ededed] font-sans antialiased select-none overflow-hidden">
      {/* Custom Window Titlebar (Frameless / Orca Style) */}
      <WindowTitlebar 
        title={status} 
        isLeftOpen={isLeftSidebarOpen}
        isRightOpen={isRightSidebarOpen}
        onToggleLeft={() => setIsLeftSidebarOpen((prev) => !prev)}
        onToggleRight={() => setIsRightSidebarOpen((prev) => !prev)}
      />

      {/* Main Resizable Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Panel: Worktree / Fleet Manager */}
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
                gitStatus={gitStatus}
                onSelectSession={handleSelectSession}
                onNewSessionWithAgent={handleNewSessionWithAgent}
                onDeleteSession={handleDeleteSession}
                onOpenSettings={() => setIsSettingsOpen(true)}
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
        <main className="flex-1 flex flex-col bg-[#0c0d0e] min-w-0 overflow-hidden">
          <WorkbenchTabBar 
            tabs={tabs}
            activeTabId={activeTabId}
            onSelectTab={setActiveTabId}
            onCloseTab={handleCloseTab}
            onNewTab={handleNewTab}
            onTabContextMenu={handleTabContextMenu}
          />

          <div className="flex-1 overflow-hidden relative">
            {currentTab?.type === "diff" ? (
              <CodeDiffViewer 
                original={MOCK_ORIGINAL} 
                modified={MOCK_MODIFIED} 
                language="rust" 
              />
            ) : (
              <TerminalDrawer 
                key={activeSession?.id ?? "sess_main"}
                sessionId={activeSession?.id ?? "sess_main"} 
                executable={activeSession?.executable ?? "bash"}
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
                  <button
                    onClick={() => setIsPairingOpen(true)}
                    title="Pair Mobile Companion"
                    className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition flex items-center gap-1"
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
                      className="flex-1 py-1 px-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-[11px] flex items-center justify-center gap-1 transition"
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
                      className="px-3 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px] transition"
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
                    className="p-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white transition"
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

      {/* Command Palette (Ctrl+P / Orca Style) */}
      <CommandPalette 
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNewTerminal={handleNewTab}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenPairing={() => setIsPairingOpen(true)}
        onSwitchTab={setActiveTabId}
      />

      {/* Mobile Companion Pairing Modal */}
      <PairingModal isOpen={isPairingOpen} onClose={() => setIsPairingOpen(false)} />

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        onSaved={handleSettingsSaved}
      />
    </div>
  );
}
