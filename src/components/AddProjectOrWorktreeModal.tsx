import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { 
  X, 
  FolderPlus, 
  GitBranch, 
  FolderOpen, 
  AlertCircle 
} from "lucide-react";

interface AddProjectOrWorktreeModalProps {
  isOpen: boolean;
  activeRepoPath?: string;
  onClose: () => void;
  onCreated: (type: "project" | "worktree", path: string) => void;
}

export function AddProjectOrWorktreeModal({
  isOpen,
  activeRepoPath = "/home/renan/src/hydra",
  onClose,
  onCreated,
}: AddProjectOrWorktreeModalProps) {
  const [tab, setTab] = useState<"worktree" | "project">("worktree");
  const [branchName, setBranchName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [parentDir, setParentDir] = useState("/home/renan/src");
  const [initGit, setInitGit] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);


  if (!isOpen) return null;

  const handleCreateWorktree = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName.trim()) return;
    setIsSubmitting(true);
    setError(null);

    invoke<string>("create_worktree", {
      repoPath: activeRepoPath,
      branchName: branchName.trim(),
      newBranch: true,
    })
      .then((createdPath) => {
        setIsSubmitting(false);
        onCreated("worktree", createdPath);
        onClose();
      })
      .catch((err) => {
        setIsSubmitting(false);
        setError(String(err));
      });
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;
    setIsSubmitting(true);
    setError(null);

    invoke<string>("create_project", {
      name: projectName.trim(),
      parentDir: parentDir.trim(),
      initGit,
    })
      .then((createdPath) => {
        setIsSubmitting(false);
        onCreated("project", createdPath);
        onClose();
      })
      .catch((err) => {
        setIsSubmitting(false);
        setError(String(err));
      });
  };

  return (
    <div onClick={onClose} className="fixed inset-0 z-[99998] flex items-center justify-center bg-black/75 backdrop-blur-xs select-none">
      <div onClick={(e) => e.stopPropagation()} className="relative w-[500px] rounded-xl bg-[#141518] border border-[#2a2b30] shadow-2xl overflow-hidden text-xs text-neutral-200">
        {/* Header */}
        <div className="h-11 border-b border-[#222327] px-4 flex items-center justify-between bg-[#111214]">
          <div className="flex items-center gap-2 font-semibold text-neutral-200">
            <FolderPlus className="w-4 h-4 text-emerald-400" />
            <span>Create New Workspace / Project</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection: Worktree vs New Project (Orca AddRepoDialog style) */}
        <div className="flex border-b border-[#222327] bg-[#0e0f11] px-4 pt-2 gap-4">
          <button
            onClick={() => {
              setTab("worktree");
              setError(null);
            }}
            className={`pb-2 text-xs font-medium border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              tab === "worktree"
                ? "border-emerald-500 text-neutral-100"
                : "border-transparent text-neutral-400 hover:text-neutral-300"
            }`}
          >
            <GitBranch className="w-3.5 h-3.5 text-emerald-400" />
            <span>New Agent Worktree (Parallel Branch)</span>
          </button>

          <button
            onClick={() => {
              setTab("project");
              setError(null);
            }}
            className={`pb-2 text-xs font-medium border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              tab === "project"
                ? "border-emerald-500 text-neutral-100"
                : "border-transparent text-neutral-400 hover:text-neutral-300"
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5 text-blue-400" />
            <span>New Repository / Project</span>
          </button>
        </div>

        {/* Content Form */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-2.5 rounded bg-red-500/15 border border-red-500/30 text-red-400 text-[11px] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="truncate">{error}</span>
            </div>
          )}

          {tab === "worktree" ? (
            <form onSubmit={handleCreateWorktree} className="space-y-4">
              <div>
                <label className="block text-neutral-400 mb-1 font-medium">Target Repository</label>
                <div className="p-2 rounded bg-neutral-950 border border-neutral-800 font-mono text-[11px] text-neutral-400 truncate">
                  {activeRepoPath}
                </div>
              </div>

              <div>
                <label className="block text-neutral-400 mb-1 font-medium">Branch / Worktree Name</label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. feat/jwt-auth or fix/approval-gate"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  className="w-full bg-[#0c0d0e] border border-[#2a2b30] rounded px-3 py-1.5 font-mono text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-emerald-500/80 font-sans"
                />
                <span className="text-[10px] text-neutral-500 mt-1 block">
                  Creates an isolated Git worktree so your agent can code in parallel without dirtying HEAD.
                </span>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !branchName.trim()}
                  className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmitting ? "Creating Worktree..." : "Create Worktree"}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-neutral-400 mb-1 font-medium">Project Name</label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. my-awesome-agent"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full bg-[#0c0d0e] border border-[#2a2b30] rounded px-3 py-1.5 font-mono text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-emerald-500/80 font-sans"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1 font-medium">Location Directory</label>
                <input
                  type="text"
                  required
                  value={parentDir}
                  onChange={(e) => setParentDir(e.target.value)}
                  className="w-full bg-[#0c0d0e] border border-[#2a2b30] rounded px-3 py-1.5 font-mono text-xs text-neutral-200 focus:outline-none focus:border-emerald-500/80 font-sans"
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded bg-neutral-950 border border-neutral-800">
                <span className="text-[11px] text-neutral-300">Initialize with git init</span>
                <input
                  type="checkbox"
                  checked={initGit}
                  onChange={(e) => setInitGit(e.target.checked)}
                  className="accent-emerald-500 w-4 h-4 cursor-pointer"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !projectName.trim()}
                  className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmitting ? "Creating Project..." : "Create Project"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
