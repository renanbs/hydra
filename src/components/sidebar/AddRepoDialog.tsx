import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { 
  X, 
  FolderOpen, 
  Globe, 
  Plus, 
  AlertCircle, 
  ChevronRight,
  ArrowLeft
} from "lucide-react";

interface AddRepoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectAdded: () => void;
}

export function AddRepoDialog({ isOpen, onClose, onProjectAdded }: AddRepoDialogProps) {
  const [step, setStep] = useState<"start" | "clone" | "create">("start");
  const [cloneUrl, setCloneUrl] = useState("");
  const [cloneDest, setCloneDest] = useState("/home/renan/src");
  const [createName, setCreateName] = useState("");
  const [createParent, setCreateParent] = useState("/home/renan/src");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    setStep("start");
    setError(null);
    onClose();
  };

  // 1. AÇÃO PRINCIPAL DO ORCA: Browse Folder (Selecionar pasta existente no sistema)
  const handleBrowseFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Select Existing Project or Git Repository",
      });

      if (selected && typeof selected === "string") {
        setIsSubmitting(true);
        setError(null);
        await invoke("register_existing_project", { path: selected });
        setIsSubmitting(false);
        onProjectAdded();
        handleClose();
      }
    } catch (err) {
      setIsSubmitting(false);
      setError(String(err));
    }
  };

  const handleClone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cloneUrl.trim()) return;
    setIsSubmitting(true);
    setError(null);

    const repoName = cloneUrl.split("/").pop()?.replace(".git", "") || "repo";

    invoke<string>("create_project", {
      name: repoName,
      parentDir: cloneDest,
      initGit: false,
    })
      .then(() => {
        setIsSubmitting(false);
        onProjectAdded();
        handleClose();
      })
      .catch((err) => {
        setIsSubmitting(false);
        setError(String(err));
      });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) return;
    setIsSubmitting(true);
    setError(null);

    invoke<string>("create_project", {
      name: createName.trim(),
      parentDir: createParent.trim(),
      initGit: true,
    })
      .then(() => {
        setIsSubmitting(false);
        onProjectAdded();
        handleClose();
      })
      .catch((err) => {
        setIsSubmitting(false);
        setError(String(err));
      });
  };

  return (
    <div className="fixed inset-0 z-[99998] flex items-center justify-center bg-black/75 backdrop-blur-xs select-none">
      <div className="relative w-[500px] rounded-xl bg-[#141518] border border-[#2a2b30] shadow-2xl overflow-hidden text-xs text-neutral-200">
        {/* Orca AddRepoStepIndicator Header */}
        <div className="h-11 border-b border-[#222327] px-4 flex items-center justify-between bg-[#111214]">
          <div className="flex items-center gap-2 font-semibold text-neutral-200">
            {step !== "start" && (
              <button
                onClick={() => setStep("start")}
                className="p-1 -ml-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <span>
              {step === "start" && "Add Project"}
              {step === "clone" && "Clone from URL"}
              {step === "create" && "Create New Project"}
            </span>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error message banner */}
        {error && (
          <div className="m-4 mb-0 p-2.5 rounded bg-red-500/15 border border-red-500/30 text-red-400 text-[11px] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="truncate">{error}</span>
          </div>
        )}

        {/* 1. START STEP: 100% Orca AddRepoLocalStartStep actions */}
        {step === "start" && (
          <div className="p-4 space-y-2">
            {/* Primary Action 1 (Orca): Browse Folder */}
            <button
              onClick={handleBrowseFolder}
              className="w-full flex items-center gap-3.5 p-3.5 rounded-xl border border-emerald-500/40 bg-neutral-900/60 hover:bg-neutral-800/80 transition text-left cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition">
                <FolderOpen className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-neutral-100 text-xs flex items-center gap-1.5">
                  <span>Browse folder</span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-400 uppercase font-bold">Existing</span>
                </div>
                <div className="text-[11px] text-neutral-400">Open an existing Git repository or project folder from disk</div>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-emerald-400 transition" />
            </button>

            {/* Action 2: Clone from URL */}
            <button
              onClick={() => setStep("clone")}
              className="w-full flex items-center gap-3.5 p-3 rounded-xl border border-neutral-800/80 bg-[#0e0f11] hover:bg-neutral-800/60 transition text-left cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-blue-400 group-hover:border-blue-500/50 transition">
                <Globe className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-neutral-100 text-xs">Clone from URL</div>
                <div className="text-[11px] text-neutral-500">Clone a remote Git repository from GitHub, GitLab, or URL</div>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-600 group-hover:text-neutral-300 transition" />
            </button>

            {/* Action 3: Create new project */}
            <button
              onClick={() => setStep("create")}
              className="w-full flex items-center gap-3.5 p-3 rounded-xl border border-neutral-800/80 bg-[#0e0f11] hover:bg-neutral-800/60 transition text-left cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-300 group-hover:border-neutral-700 transition">
                <Plus className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-neutral-100 text-xs">Create new project</div>
                <div className="text-[11px] text-neutral-500">Start from an empty folder with git repository initialized</div>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-600 group-hover:text-neutral-300 transition" />
            </button>
          </div>
        )}

        {/* 2. CLONE STEP */}
        {step === "clone" && (
          <form onSubmit={handleClone} className="p-5 space-y-4">
            <div>
              <label className="block text-neutral-400 mb-1 font-medium">Git Repository URL</label>
              <input
                type="text"
                required
                autoFocus
                placeholder="https://github.com/user/repo.git or git@github.com:..."
                value={cloneUrl}
                onChange={(e) => setCloneUrl(e.target.value)}
                className="w-full bg-[#0c0d0e] border border-[#2a2b30] rounded px-3 py-1.5 font-mono text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-emerald-500/80"
              />
            </div>

            <div>
              <label className="block text-neutral-400 mb-1 font-medium">Destination Directory</label>
              <input
                type="text"
                required
                value={cloneDest}
                onChange={(e) => setCloneDest(e.target.value)}
                className="w-full bg-[#0c0d0e] border border-[#2a2b30] rounded px-3 py-1.5 font-mono text-xs text-neutral-200 focus:outline-none focus:border-emerald-500/80"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setStep("start")}
                className="px-3.5 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !cloneUrl.trim()}
                className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition disabled:opacity-50"
              >
                {isSubmitting ? "Cloning..." : "Clone Project"}
              </button>
            </div>
          </form>
        )}

        {/* 3. CREATE STEP */}
        {step === "create" && (
          <form onSubmit={handleCreate} className="p-5 space-y-4">
            <div>
              <label className="block text-neutral-400 mb-1 font-medium">Project Name</label>
              <input
                type="text"
                required
                autoFocus
                placeholder="e.g. my-awesome-project"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                className="w-full bg-[#0c0d0e] border border-[#2a2b30] rounded px-3 py-1.5 font-mono text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-emerald-500/80"
              />
            </div>

            <div>
              <label className="block text-neutral-400 mb-1 font-medium">Location Directory</label>
              <input
                type="text"
                required
                value={createParent}
                onChange={(e) => setCreateParent(e.target.value)}
                className="w-full bg-[#0c0d0e] border border-[#2a2b30] rounded px-3 py-1.5 font-mono text-xs text-neutral-200 focus:outline-none focus:border-emerald-500/80"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setStep("start")}
                className="px-3.5 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !createName.trim()}
                className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition disabled:opacity-50"
              >
                {isSubmitting ? "Creating..." : "Create Project"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
