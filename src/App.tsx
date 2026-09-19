import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Group, Panel, Separator } from "react-resizable-panels";
import { 
  Bot, 
  Terminal, 
  FolderTree, 
  Play, 
  CheckCircle2, 
  ShieldCheck, 
  ChevronRight,
  Sparkles,
  Smartphone
} from "lucide-react";
import "./App.css";

export default function App() {
  const [status, setStatus] = useState("Iniciando...");
  const [activeTab, setActiveTab] = useState<"chat" | "terminal">("chat");

  useEffect(() => {
    invoke<string>("get_system_status")
      .then(setStatus)
      .catch((err) => setStatus("Erro: " + String(err)));
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0c0d0e] text-[#ededed] font-sans antialiased select-none">
      {/* Top Navigation Bar */}
      <header className="h-10 border-b border-[#222] px-3 flex items-center justify-between text-xs bg-[#111214]">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-neutral-200 tracking-wider">HYDRA ADE</span>
          <span className="text-neutral-500">|</span>
          <span className="text-neutral-400">{status}</span>
        </div>
        <div className="flex items-center gap-4 text-neutral-400">
          <span className="flex items-center gap-1 hover:text-white cursor-pointer transition">
            <Smartphone className="w-3.5 h-3.5 text-blue-400" />
            <span>Mobile Companion (Tailscale / E2EE)</span>
          </span>
          <span className="px-2 py-0.5 rounded bg-neutral-800 text-[10px] text-neutral-300 font-mono">
            Wayland Native
          </span>
        </div>
      </header>

      {/* Main Resizable Workspace */}
      <div className="flex-1 overflow-hidden">
        <Group orientation="horizontal" >
          {/* Left Panel: Workspaces & File Tree */}
          <Panel defaultSize={20} minSize={15} maxSize={35} className="flex flex-col border-r border-[#222] bg-[#0e0f11]">
            <div className="h-8 border-b border-[#222] px-3 flex items-center justify-between text-[11px] uppercase tracking-wider text-neutral-500 font-medium">
              <span className="flex items-center gap-1.5">
                <FolderTree className="w-3.5 h-3.5" />
                Explorador
              </span>
            </div>
            <div className="p-3 text-xs text-neutral-400 space-y-1">
              <div className="text-neutral-500 text-[11px] mb-2 font-mono">/home/renan/src/hydra</div>
              <div className="flex items-center gap-2 py-1 px-2 rounded hover:bg-neutral-800/60 cursor-pointer text-neutral-200">
                <ChevronRight className="w-3 h-3 text-neutral-500" />
                <span>src-tauri (Rust Core)</span>
              </div>
              <div className="flex items-center gap-2 py-1 px-2 rounded hover:bg-neutral-800/60 cursor-pointer text-neutral-200">
                <ChevronRight className="w-3 h-3 text-neutral-500" />
                <span>src (React + shadcn)</span>
              </div>
              <div className="flex items-center gap-2 py-1 px-2 rounded hover:bg-neutral-800/60 cursor-pointer text-neutral-200">
                <ChevronRight className="w-3 h-3 text-neutral-500" />
                <span>70-Specs (Obsidian Vault)</span>
              </div>
            </div>
          </Panel>

          <Separator className="w-1 bg-[#1a1b1e] hover:bg-blue-500/50 transition-colors cursor-col-resize" />

          {/* Central Workspace: Editor / Diff / Visual Center */}
          <Panel defaultSize={50} minSize={30} className="flex flex-col bg-[#0c0d0e]">
            <div className="h-8 border-b border-[#222] px-3 flex items-center justify-between bg-[#111214] text-xs">
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 border-b-2 border-emerald-500 text-neutral-200 font-medium text-[11px]">
                  plataforma-agentes-tauri-rust.spec
                </span>
              </div>
            </div>

            <div className="flex-1 p-6 flex flex-col justify-center items-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-4 text-emerald-400">
                <Sparkles className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-medium text-neutral-100 mb-1">Hydra Autonomous Development Environment</h2>
              <p className="text-xs text-neutral-400 max-w-md mb-6 leading-relaxed">
                Daemon resiliente em Rust com terminal virtual headless (<code className="text-emerald-400 font-mono">vt100</code>) e interface inspirada no Orca.
              </p>

              {/* Status card inspired by Orca & Herdr */}
              <div className="w-full max-w-md bg-[#131417] border border-[#222] rounded-xl p-4 text-left shadow-lg">
                <div className="flex items-center justify-between mb-3 text-xs">
                  <div className="flex items-center gap-2 font-medium text-neutral-200">
                    <ShieldCheck className="w-4 h-4 text-blue-400" />
                    <span>Herdr State Engine: <strong className="text-emerald-400">Idle (Pronto)</strong></span>
                  </div>
                  <span className="text-[10px] text-neutral-500 font-mono">PIDs: 0 ativos</span>
                </div>
                <div className="p-2.5 rounded bg-neutral-950 border border-neutral-800/80 font-mono text-[11px] text-neutral-300 flex items-center justify-between">
                  <span>portable-pty + vt100 shadow buffer</span>
                  <span className="text-emerald-400 text-[10px]">Zero UI Leak</span>
                </div>
              </div>
            </div>

            {/* Bottom Collapsible Terminal Drawer */}
            <div className="h-44 border-t border-[#222] bg-[#0e0f11] flex flex-col">
              <div className="h-7 border-b border-[#222] px-3 flex items-center justify-between text-[11px] bg-[#111214]">
                <div className="flex items-center gap-3 text-neutral-400">
                  <button 
                    onClick={() => setActiveTab("chat")} 
                    className={`flex items-center gap-1.5 transition ${activeTab === "chat" ? "text-neutral-200 font-medium" : "hover:text-neutral-300"}`}
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    <span>Terminal Ativo (PTY)</span>
                  </button>
                </div>
                <span className="text-[10px] text-neutral-500 font-mono">/dev/pts/ptmx</span>
              </div>
              <div className="flex-1 p-3 font-mono text-xs text-neutral-400 overflow-y-auto">
                <div className="text-neutral-500">$ hydra-daemon --listen /run/user/1000/hydra.sock</div>
                <div className="text-emerald-400/90">[INFO] Headless terminal buffer inicializado em memória (vt100).</div>
                <div className="text-neutral-400">[INFO] Aguardando comandos ou requisições de agentes...</div>
              </div>
            </div>
          </Panel>

          <Separator className="w-1 bg-[#1a1b1e] hover:bg-blue-500/50 transition-colors cursor-col-resize" />

          {/* Right Panel: Agent Fleet & Actions (Orca Style) */}
          <Panel defaultSize={30} minSize={20} maxSize={45} className="flex flex-col border-l border-[#222] bg-[#0e0f11]">
            <div className="h-8 border-b border-[#222] px-3 flex items-center justify-between text-[11px] uppercase tracking-wider text-neutral-400 font-medium bg-[#111214]">
              <span className="flex items-center gap-1.5 text-neutral-200">
                <Bot className="w-3.5 h-3.5 text-emerald-400" />
                Agente Ativo
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
                Claude / Codex
              </span>
            </div>

            <div className="flex-1 p-3 overflow-y-auto space-y-3">
              {/* Agent Bubble */}
              <div className="p-3 rounded-lg bg-[#141518] border border-[#26272b] text-xs">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">
                    H
                  </div>
                  <span className="font-semibold text-neutral-200">Hydra Agent</span>
                  <span className="text-[10px] text-neutral-500">Agora</span>
                </div>
                <p className="text-neutral-300 leading-relaxed text-[11px]">
                  Ambiente inicializado. O terminal headless interceptará comandos pesados e resumirá a saída para economizar tokens.
                </p>
              </div>

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
                  <button className="flex-1 py-1 px-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-[11px] flex items-center justify-center gap-1 transition">
                    <CheckCircle2 className="w-3 h-3" />
                    Approve (Ctrl+Enter)
                  </button>
                  <button className="px-3 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px] transition">
                    Reject (Esc)
                  </button>
                </div>
              </div>
            </div>

            {/* Input Prompt */}
            <div className="p-3 border-t border-[#222] bg-[#111214]">
              <input 
                type="text"
                placeholder="Instrua o agente Hydra... (Shift+Enter para quebra)"
                className="w-full bg-[#0c0d0e] border border-[#26272b] rounded-md px-3 py-2 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-emerald-500/80 transition font-sans"
              />
            </div>
          </Panel>
        </Group>
      </div>
    </div>
  );
}
