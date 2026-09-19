import { useState } from "react";
import { 
  GitBranch, 
  Plus, 
  Trash2, 
  FolderGit2
} from "lucide-react";

export interface WorktreeSession {
  id: string;
  title: string;
  branch: string;
  state: "working" | "blocked" | "idle" | "unknown";
  active: boolean;
  agentName: string;
}

interface WorktreeSidebarProps {
  sessions: WorktreeSession[];
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
}

export function WorktreeSidebar({
  sessions,
  onSelectSession,
  onNewSession,
  onDeleteSession,
}: WorktreeSidebarProps) {
  const [filter, setFilter] = useState("");

  const filtered = sessions.filter(
    (s) => s.title.toLowerCase().includes(filter.toLowerCase()) || s.branch.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-[#0e0f11] select-none">
      {/* Header do Repositório / Projeto (Orca Style) */}
      <div className="h-9 border-b border-[#222] px-3 flex items-center justify-between bg-[#111214] shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FolderGit2 className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
          <span className="font-semibold text-neutral-200 text-xs truncate">hydra</span>
          <span className="text-[10px] text-neutral-500 font-mono px-1.5 py-0.5 rounded bg-neutral-800 shrink-0">
            main
          </span>
        </div>
        <button
          onClick={onNewSession}
          title="Nova Tarefa / Nova Frota (+)"
          className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition shrink-0"
        >
          <Plus className="w-4 h-4 text-emerald-400" />
        </button>
      </div>

      {/* Barra de Filtro / Busca de Worktrees */}
      <div className="p-2 border-b border-[#222] bg-[#0e0f11] shrink-0">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filtrar agentes e branches..."
          className="w-full bg-[#141518] border border-[#222] rounded px-2 py-1 text-[11px] text-neutral-300 placeholder-neutral-600 focus:outline-none focus:border-emerald-500/50"
        />
      </div>

      {/* Lista de Frotas de Agentes / Worktrees */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
        {filtered.length === 0 ? (
          <div className="p-4 text-center text-neutral-500 text-xs">
            Nenhuma sessão encontrada.
          </div>
        ) : (
          filtered.map((session) => (
            <div
              key={session.id}
              onClick={() => onSelectSession(session.id)}
              className={`group relative p-2 rounded text-xs cursor-pointer border transition-all ${
                session.active
                  ? "bg-[#141518] border-neutral-700/80 text-neutral-100 shadow-sm"
                  : "bg-transparent border-transparent text-neutral-400 hover:bg-neutral-900 hover:text-neutral-300"
              }`}
            >
              {/* Indicador lateral de sessão ativa */}
              {session.active && (
                <div className="absolute left-0 top-1.5 bottom-1.5 w-[2px] bg-emerald-500 rounded-r" />
              )}

              <div className="flex items-center justify-between mb-1 pl-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-medium truncate text-neutral-200 text-[11px]">
                    {session.title}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {/* Badge de Estado do Herdr */}
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      session.state === "working"
                        ? "bg-amber-400 animate-pulse"
                        : session.state === "blocked"
                          ? "bg-red-400 ring-2 ring-red-500/30"
                          : "bg-emerald-400"
                    }`}
                    title={`Herdr State: ${session.state}`}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(session.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-neutral-800 text-neutral-500 hover:text-red-400 transition"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Sub-informações: Branch Git + Agente associado */}
              <div className="flex items-center justify-between text-[10px] text-neutral-500 pl-1 font-mono">
                <span className="flex items-center gap-1 truncate">
                  <GitBranch className="w-2.5 h-2.5" />
                  {session.branch}
                </span>
                <span className="text-neutral-400 text-[9px] bg-neutral-800/80 px-1 py-0.2 rounded">
                  {session.agentName}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer da Sidebar: Contador de frotas ativas */}
      <div className="h-7 border-t border-[#222] px-3 flex items-center justify-between text-[10px] text-neutral-500 font-mono bg-[#111214] shrink-0">
        <span>Frotas ativas: {sessions.filter((s) => s.state === "working").length}</span>
        <span className="text-emerald-500/80">Herdr daemon ok</span>
      </div>
    </div>
  );
}
