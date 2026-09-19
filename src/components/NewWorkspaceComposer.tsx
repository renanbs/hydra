import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { 
  X, 
  GitBranch, 
  Bot, 
  Sparkles, 
  AlertCircle,
  FolderGit2
} from "lucide-react";
import type { AvailableAgent } from "./sidebar/WorktreeSidebar";

interface NewWorkspaceComposerProps {
  isOpen: boolean;
  activeProjectName: string;
  activeRepoPath: string;
  availableAgents: AvailableAgent[];
  onClose: () => void;
  onCreated: (worktreePath: string, agentName: string, executable: string) => void;
}

export function NewWorkspaceComposer({
  isOpen,
  activeProjectName,
  activeRepoPath,
  availableAgents,
  onClose,
  onCreated,
}: NewWorkspaceComposerProps) {
  const [name, setName] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState<string>("claude");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    setError(null);

    const chosenAgent = availableAgents.find((a) => a.id === selectedAgentId) || {
      id: "bash",
      name: "Bash",
      executable: "bash",
      is_installed: true,
    };

    invoke<string>("create_worktree", {
      repoPath: activeRepoPath,
      branchName: name.trim(),
      newBranch: true,
    })
      .then((createdPath) => {
        setIsSubmitting(false);
        onCreated(createdPath, chosenAgent.name, chosenAgent.executable);
        onClose();
      })
      .catch((err) => {
        setIsSubmitting(false);
        setError(String(err));
      });
  };

  return (
    <div className="fixed inset-0 z-[99998] flex items-center justify-center bg-black/75 backdrop-blur-xs select-none">
      <div className="relative w-[520px] rounded-xl bg-[#141518] border border-[#28292e] shadow-2xl overflow-hidden text-xs text-neutral-200">
        {/* Orca New Workspace Header */}
        <div className="h-11 border-b border-[#222327] px-4 flex items-center justify-between bg-[#111214]">
          <div className="flex items-center gap-2 font-semibold text-neutral-200">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>New Workspace</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="m-4 mb-0 p-2.5 rounded bg-red-500/15 border border-red-500/30 text-red-400 text-[11px] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="truncate">{error}</span>
          </div>
        )}

        <form onSubmit={handleCreate} className="p-5 space-y-4">
          {/* Project Context */}
          <div>
            <label className="block text-neutral-400 mb-1 font-medium">Project</label>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-[#0e0f11] border border-[#222327] text-neutral-300 font-mono text-[11px]">
              <FolderGit2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="font-semibold text-white">{activeProjectName}</span>
              <span className="text-neutral-500 truncate text-[10px]">({activeRepoPath})</span>
            </div>
          </div>

          {/* Workspace / Branch Name Input */}
          <div>
            <label className="block text-neutral-400 mb-1 font-medium">Workspace Name / Branch</label>
            <div className="relative flex items-center">
              <GitBranch className="w-3.5 h-3.5 text-neutral-500 absolute left-3 pointer-events-none" />
              <input
                type="text"
                required
                autoFocus
                placeholder="e.g. feat/auth-flow or fix/nav-bug"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#0c0d0e] border border-[#28292e] rounded-lg pl-9 pr-3 py-2 font-mono text-xs text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-emerald-500/80 font-sans"
              />
            </div>
            <span className="text-[10px] text-neutral-500 mt-1 block">
              Creates a dedicated Git worktree branch so agents can execute independently.
            </span>
          </div>

          {/* Agent Selection Section (Orca Style) */}
          <div>
            <label className="block text-neutral-400 mb-1.5 font-medium flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5 text-emerald-400" />
              <span>Initial Agent</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {availableAgents.map((agent) => (
                <button
                  key={agent.id}
                  type="button"
                  disabled={!agent.is_installed}
                  onClick={() => setSelectedAgentId(agent.id)}
                  className={`p-2.5 rounded-lg border text-left flex items-center justify-between transition cursor-pointer ${
                    selectedAgentId === agent.id
                      ? "border-emerald-500 bg-neutral-900 text-white font-medium"
                      : "border-[#222327] bg-[#0e0f11] text-neutral-400 hover:bg-neutral-800/60"
                  } ${!agent.is_installed ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  <div className="truncate pr-1 text-[11px]">{agent.name}</div>
                  {agent.is_installed ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  ) : (
                    <span className="text-[9px] text-neutral-600 font-mono">n/a</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex justify-end gap-2 border-t border-[#222327]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              {isSubmitting ? "Creating Workspace..." : "Create Workspace"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
