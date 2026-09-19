import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { usePanelResize } from "./hooks/usePanelResize";
import { TerminalDrawer } from "./components/TerminalDrawer";
import { WindowTitlebar } from "./components/WindowTitlebar";
import { CodeDiffViewer } from "./components/CodeDiffViewer";
import { 
  Bot, 
  Terminal, 
  FolderTree, 
  Play, 
  CheckCircle2,
  ChevronRight,
  Code2,
  FileCode,
  Send
} from "lucide-react";
import "./App.css";

const MOCK_ORIGINAL = `fn main() {
    println!("Hello from Hydra Core");
}`;

const MOCK_MODIFIED = `fn main() {
    // Optimized with Herdr detection and vt100 shadow buffer
    println!("Hello from Hydra ADE (Autonomous Development Environment)");
}`;

export default function App() {
  const [status, setStatus] = useState("Iniciando...");
  const [agentState, setAgentState] = useState<string>("idle");
  const [activeCenterTab, setActiveCenterTab] = useState<"diff" | "overview">("diff");
  const [promptInput, setPromptInput] = useState("");
  const [messages, setMessages] = useState<Array<{ id: number; role: string; content: string }>>([
    {
      id: 1,
      role: "agent",
      content: "Hydra ADE ativo. Fases 2, 3 e 4 integradas: Herdr State Engine, SQLite WAL e Monaco Diff Viewer."
    }
  ]);

  const leftSidebar = usePanelResize({
    initialWidth: 240,
    minWidth: 160,
    maxWidth: 480,
    deltaSign: 1,
  });

  const rightSidebar = usePanelResize({
    initialWidth: 360,
    minWidth: 260,
    maxWidth: 600,
    deltaSign: -1,
  });

  useEffect(() => {
    invoke<string>("get_system_status")
      .then(setStatus)
      .catch(console.error);

    // Polling leve para ler o estado do agente a partir do buffer vt100 (Herdr style)
    const interval = setInterval(() => {
      invoke<string>("check_agent_state")
        .then((state) => {
          if (state) setAgentState(state);
        })
        .catch(console.error);
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  const handleSendMessage = () => {
    if (!promptInput.trim()) return;
    const text = promptInput;
    setPromptInput("");

    // Salva no banco SQLite WAL local
    invoke<number>("save_chat_message", {
      sessionId: "default",
      role: "user",
      content: text
    }).catch(console.error);

    setMessages((prev) => [
      ...prev,
      { id: Date.now(), role: "user", content: text },
      { id: Date.now() + 1, role: "agent", content: `Comando registrado no SQLite: "${text}". Processando via headless buffer...` }
    ]);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0c0d0e] text-[#ededed] font-sans antialiased select-none overflow-hidden">
      {/* Custom Window Titlebar (Frameless / Orca Style) */}
      <WindowTitlebar title={status} />

      {/* Main Resizable Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Panel: Workspaces & File Tree */}
        <aside 
          ref={leftSidebar.containerRef}
          style={{ width: `${leftSidebar.width}px` }}
          className="flex flex-col border-r border-[#222] bg-[#0e0f11] shrink-0 overflow-hidden relative"
        >
          <div className="h-8 border-b border-[#222] px-3 flex items-center justify-between text-[11px] uppercase tracking-wider text-neutral-500 font-medium shrink-0">
            <span className="flex items-center gap-1.5">
              <FolderTree className="w-3.5 h-3.5" />
              Explorador
            </span>
          </div>
          <div className="p-3 text-xs text-neutral-400 space-y-1 overflow-y-auto">
            <div className="text-neutral-500 text-[11px] mb-2 font-mono">/home/renan/src/hydra</div>
            <div className="flex items-center gap-2 py-1 px-2 rounded hover:bg-neutral-800/60 cursor-pointer text-neutral-200">
              <ChevronRight className="w-3 h-3 text-neutral-500" />
              <span>src-tauri (Rust Core + SQLite)</span>
            </div>
            <div className="flex items-center gap-2 py-1 px-2 rounded hover:bg-neutral-800/60 cursor-pointer text-neutral-200">
              <ChevronRight className="w-3 h-3 text-neutral-500" />
              <span>src (React + shadcn + Monaco)</span>
            </div>
            <div className="flex items-center gap-2 py-1 px-2 rounded hover:bg-neutral-800/60 cursor-pointer text-neutral-200">
              <FileCode className="w-3 h-3 text-emerald-400" />
              <span>main.rs (Diff ativo)</span>
            </div>
          </div>
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

        {/* Central Workspace: Monaco Diff Viewer & Terminal */}
        <main className="flex-1 flex flex-col bg-[#0c0d0e] min-w-0 overflow-hidden">
          {/* Editor Header Tabs */}
          <div className="h-8 border-b border-[#222] px-3 flex items-center justify-between bg-[#111214] text-xs shrink-0">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setActiveCenterTab("diff")}
                className={`px-2 py-1 flex items-center gap-1.5 text-[11px] font-medium border-b-2 transition ${
                  activeCenterTab === "diff" ? "border-emerald-500 text-neutral-200" : "border-transparent text-neutral-400 hover:text-neutral-300"
                }`}
              >
                <Code2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>main.rs (Diff Viewer)</span>
              </button>
            </div>
          </div>

          {/* Central Area: Code Diff Viewer */}
          <div className="flex-1 overflow-hidden relative">
            <CodeDiffViewer 
              original={MOCK_ORIGINAL} 
              modified={MOCK_MODIFIED} 
              language="rust" 
            />
          </div>

          {/* Bottom Collapsible Terminal Drawer */}
          <div className="h-56 border-t border-[#222] bg-[#0c0d0e] flex flex-col shrink-0">
            <div className="h-7 border-b border-[#222] px-3 flex items-center justify-between text-[11px] bg-[#111214] shrink-0">
              <div className="flex items-center gap-3 text-neutral-400">
                <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Terminal Interativo PTY (vt100 Shadow Buffer)</span>
                </span>
              </div>
              <span className="text-[10px] text-emerald-500/80 font-mono">portable-pty active</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <TerminalDrawer />
            </div>
          </div>
        </main>

        {/* Right Resize Handle */}
        <div 
          onMouseDown={rightSidebar.onResizeStart}
          className={`w-2.5 -ml-1.5 -mr-1.5 z-20 cursor-col-resize flex items-center justify-center group select-none transition-colors ${
            rightSidebar.isResizing ? "bg-emerald-500/40" : "hover:bg-emerald-500/30"
          }`}
        >
          <div className={`w-[2px] h-full transition-colors ${rightSidebar.isResizing ? "bg-emerald-400" : "group-hover:bg-emerald-400"}`} />
        </div>

        {/* Right Panel: Agent Fleet, Chat & Actions (Orca Style) */}
        <aside 
          ref={rightSidebar.containerRef}
          style={{ width: `${rightSidebar.width}px` }}
          className="flex flex-col border-l border-[#222] bg-[#0e0f11] shrink-0 overflow-hidden relative"
        >
          <div className="h-8 border-b border-[#222] px-3 flex items-center justify-between text-[11px] uppercase tracking-wider text-neutral-400 font-medium bg-[#111214] shrink-0">
            <span className="flex items-center gap-1.5 text-neutral-200">
              <Bot className="w-3.5 h-3.5 text-emerald-400" />
              Agente Ativo
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-medium ${
              agentState === "working" 
                ? "bg-amber-500/20 text-amber-400 animate-pulse" 
                : agentState === "blocked" 
                  ? "bg-red-500/20 text-red-400" 
                  : "bg-emerald-500/20 text-emerald-400"
            }`}>
              {agentState.toUpperCase()}
            </span>
          </div>

          <div className="flex-1 p-3 overflow-y-auto space-y-3">
            {/* Messages Feed (SQLite WAL Sync) */}
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
                  Pedido de Execução (Tool Call)
                </span>
                <span className="text-[10px] text-neutral-500 font-mono">bash</span>
              </div>
              <div className="bg-[#111214] p-2 rounded font-mono text-[11px] text-neutral-200 border border-neutral-800 mb-3 overflow-x-auto">
                cargo check --workspace
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    invoke("resolve_tool_approval", {
                      approvalId: "appr_1",
                      sessionId: "default",
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
                      sessionId: "default",
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
                placeholder="Instrua o agente Hydra... (Enter para enviar)"
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
      </div>
    </div>
  );
}
