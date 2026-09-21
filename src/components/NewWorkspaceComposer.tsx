import { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { 
  X, 
  Bot, 
  FolderPlus, 
  Settings2, 
  ChevronDown, 
  ChevronsUpDown, 
  Check, 
  FolderGit2, 
  CornerDownLeft, 
  Loader2 
} from "lucide-react";
import type { AvailableAgent, HydraProject } from "./sidebar/WorktreeSidebar";

interface NewWorkspaceComposerProps {
  isOpen: boolean;
  activeProject: HydraProject | null;
  projects: HydraProject[];
  availableAgents: AvailableAgent[];
  onSelectProject?: (proj: HydraProject) => void;
  onOpenAddRepoDialog?: () => void;
  onOpenSettings?: () => void;
  onClose: () => void;
  onCreated: (worktreePath: string, branchName: string, agentName: string, executable: string) => void;
}

export function NewWorkspaceComposer({
  isOpen,
  activeProject,
  projects,
  availableAgents,
  onSelectProject,
  onOpenAddRepoDialog,
  onOpenSettings,
  onClose,
  onCreated,
}: NewWorkspaceComposerProps) {
  const [name, setName] = useState("");
  const [customBranch, setCustomBranch] = useState("");
  const [note, setNote] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState<string>("claude");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [createMultiple, setCreateMultiple] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [projectPickerOpen, setProjectPickerOpen] = useState(false);
  const [agentPickerOpen, setAgentPickerOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);

  // Focus name field on open & auto-select project if missing
  useEffect(() => {
    if (isOpen) {
      if (!activeProject && projects.length > 0) {
        onSelectProject?.(projects[0]);
      }
      setName("");
      setCustomBranch("");
      setNote("");
      setError(null);
      setAdvancedOpen(false);
      setProjectPickerOpen(false);
      setAgentPickerOpen(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, activeProject, projects, onSelectProject]);

  // Handle global shortcuts inside composer (Esc to close, Ctrl+Enter to submit)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  if (!isOpen) return null;

  const effectiveProject = activeProject || (projects.length > 0 ? projects[0] : null);
  const isGit = effectiveProject?.is_git ?? true;
  const primaryActionLabel = isGit ? "Create worktree" : "Create workspace";

  const chosenAgent = availableAgents.find((a) => a.id === selectedAgentId) || {
    id: "bash",
    name: "Plain Bash Shell",
    executable: "bash",
    is_installed: true,
  };

  const handleSubmit = (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    const proj = effectiveProject;
    if (!proj) {
      setError("Please select a project first.");
      return;
    }

    const branchToUse = (customBranch.trim() || name.trim() || `workspace-${Date.now().toString().slice(-4)}`);
    setIsSubmitting(true);
    setError(null);

    invoke<string>("create_worktree", {
      repoPath: proj.path,
      branchName: branchToUse,
      newBranch: true,
    })
      .then((createdPath) => {
        setIsSubmitting(false);
        onCreated(createdPath, branchToUse, chosenAgent.name, chosenAgent.executable);
        if (!createMultiple) {
          onClose();
        } else {
          setName("");
          setCustomBranch("");
          setNote("");
        }
      })
      .catch((err) => {
        setIsSubmitting(false);
        setError(String(err));
      });
  };

  return (
    <div 
      className="fixed inset-0 z-[99998] flex items-center justify-center bg-black/60 select-none"
      onClick={onClose}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[512px] rounded-xl bg-[#141518] border border-[#28292e] shadow-2xl overflow-visible text-neutral-200 font-sans p-6 space-y-4"
      >
        {/* Orca Dialog Header: Clean Title + Close X */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-neutral-100 tracking-tight">
            {primaryActionLabel}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm p-1 text-neutral-400 hover:text-white hover:bg-neutral-800/60 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. Project Section */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-neutral-400">
                Project
              </label>
              {onOpenAddRepoDialog && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAddRepoDialog();
                  }}
                  className="size-5 rounded text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 inline-flex items-center justify-center transition cursor-pointer"
                  title="Add project"
                >
                  <FolderPlus className="size-3.5" />
                </button>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setProjectPickerOpen(!projectPickerOpen);
                  setAgentPickerOpen(false);
                }}
                className="h-9 w-full min-w-0 rounded-md border border-[#27272a] bg-[#101114] px-3 py-1.5 text-sm text-left flex items-center justify-between shadow-xs hover:border-[#3f3f46] transition focus:outline-none focus:border-emerald-500/70 focus:ring-1 focus:ring-emerald-500/30 cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FolderGit2 className="size-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate text-xs font-medium text-neutral-200">
                    {effectiveProject?.name ?? "Choose project"}
                  </span>
                  {effectiveProject?.current_branch && (
                    <span className="text-[11px] text-neutral-500 font-mono truncate">
                      ({effectiveProject.current_branch})
                    </span>
                  )}
                </div>
                <ChevronDown className="size-3.5 text-neutral-400 shrink-0" />
              </button>

              {/* Project Dropdown */}
              {projectPickerOpen && (
                <div className="absolute left-0 right-0 top-10 rounded-lg bg-[#18191d] border border-[#2c2d33] shadow-2xl p-1 z-50 max-h-48 overflow-y-auto space-y-0.5">
                  {projects.map((proj) => (
                    <button
                      key={proj.id}
                      type="button"
                      onClick={() => {
                        onSelectProject?.(proj);
                        setProjectPickerOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs text-left transition cursor-pointer ${
                        proj.path === effectiveProject?.path 
                          ? "bg-emerald-500/15 text-emerald-400 font-medium" 
                          : "text-neutral-300 hover:bg-neutral-800/80"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FolderGit2 className="size-3.5 shrink-0 text-neutral-400" />
                        <span className="truncate">{proj.name}</span>
                        <span className="text-[10px] text-neutral-500 font-mono truncate">
                          ({proj.current_branch})
                        </span>
                      </div>
                      {proj.path === effectiveProject?.path && (
                        <Check className="size-3.5 text-emerald-400 shrink-0" />
                      )}
                    </button>
                  ))}
                  {onOpenAddRepoDialog && (
                    <>
                      <div className="h-px bg-[#26272b] my-1" />
                      <button
                        type="button"
                        onClick={() => {
                          setProjectPickerOpen(false);
                          onClose();
                          onOpenAddRepoDialog();
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-emerald-400 hover:bg-emerald-500/10 text-left transition cursor-pointer"
                      >
                        <FolderPlus className="size-3.5" />
                        <span>Add project...</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 2. Workspace Name Section (Orca SmartWorkspaceNameField) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-neutral-400">
              Workspace name <span className="text-neutral-500 font-normal">[Optional]</span>
            </label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. feat/auth-flow or fix/nav-bug"
              className="h-9 w-full min-w-0 rounded-md border border-[#27272a] bg-[#101114] px-3 py-1.5 text-xs text-neutral-200 placeholder:text-neutral-500 shadow-xs outline-none focus:border-emerald-500/70 focus:ring-1 focus:ring-emerald-500/30 transition font-sans"
            />
          </div>

          {/* 3. Agent Section (Orca AgentCombobox) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-neutral-400">
                Agent
              </label>
              {onOpenSettings && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSettings();
                  }}
                  className="size-5 rounded text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 inline-flex items-center justify-center transition cursor-pointer"
                  title="Configure agents"
                >
                  <Settings2 className="size-3.5" />
                </button>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setAgentPickerOpen(!agentPickerOpen);
                  setProjectPickerOpen(false);
                }}
                className="h-9 w-full min-w-0 rounded-md border border-[#27272a] bg-[#101114] px-3 py-1.5 text-sm text-left flex items-center justify-between shadow-xs hover:border-[#3f3f46] transition focus:outline-none focus:border-emerald-500/70 focus:ring-1 focus:ring-emerald-500/30 cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Bot className="size-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate text-xs font-medium text-neutral-200">
                    {chosenAgent.name}
                  </span>
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${chosenAgent.is_installed ? "bg-emerald-400" : "bg-neutral-600"}`} />
                </div>
                <ChevronsUpDown className="size-3.5 text-neutral-400 shrink-0" />
              </button>

              {/* Agent Dropdown */}
              {agentPickerOpen && (
                <div className="absolute left-0 right-0 top-10 rounded-lg bg-[#18191d] border border-[#2c2d33] shadow-2xl p-1 z-50 max-h-56 overflow-y-auto space-y-0.5">
                  {availableAgents.map((agent) => (
                    <button
                      key={agent.id}
                      type="button"
                      onClick={() => {
                        setSelectedAgentId(agent.id);
                        setAgentPickerOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs text-left transition cursor-pointer ${
                        agent.id === selectedAgentId 
                          ? "bg-emerald-500/15 text-emerald-400 font-medium" 
                          : "text-neutral-300 hover:bg-neutral-800/80"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Bot className="size-3.5 shrink-0 text-neutral-400" />
                        <span className="truncate">{agent.name}</span>
                        {!agent.is_installed && (
                          <span className="text-[10px] text-neutral-500 font-mono">(n/a)</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`w-1.5 h-1.5 rounded-full ${agent.is_installed ? "bg-emerald-400" : "bg-neutral-600"}`} />
                        {agent.id === selectedAgentId && (
                          <Check className="size-3.5 text-emerald-400" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 4. Advanced Disclosure (Orca NewWorkspaceComposerAdvancedSection) */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setAdvancedOpen(!advancedOpen)}
              className="-ml-1.5 text-xs text-neutral-400 hover:text-neutral-200 flex items-center gap-1 py-1 font-medium transition cursor-pointer"
            >
              <span>Advanced</span>
              <ChevronDown className={`size-3.5 transition-transform duration-150 ${advancedOpen ? "rotate-180" : ""}`} />
            </button>

            {advancedOpen && (
              <div className="mt-2 space-y-3 pt-2 border-t border-[#222327]">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-400">
                    Branch name
                  </label>
                  <input
                    type="text"
                    value={customBranch}
                    onChange={(e) => setCustomBranch(e.target.value)}
                    placeholder="feature/my-branch"
                    className="h-9 w-full min-w-0 rounded-md border border-[#27272a] bg-[#101114] px-3 py-1.5 text-xs text-neutral-200 placeholder:text-neutral-500 shadow-xs outline-none focus:border-emerald-500/70 focus:ring-1 focus:ring-emerald-500/30 transition font-sans"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-400">
                    Note
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Write a note for this workspace..."
                    rows={2}
                    className="w-full min-w-0 rounded-md border border-[#27272a] bg-[#101114] px-3 py-1.5 text-xs text-neutral-200 placeholder:text-neutral-500 shadow-xs outline-none focus:border-emerald-500/70 focus:ring-1 focus:ring-emerald-500/30 transition font-sans resize-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 5. Orca Footer: Create More Toggle on Left + Primary Button with Shortcut on Right */}
          <div className="flex items-center justify-between pt-3 border-t border-[#222327]">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-400 hover:text-neutral-200 select-none">
              <button
                type="button"
                role="switch"
                aria-checked={createMultiple}
                onClick={() => setCreateMultiple(!createMultiple)}
                className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer items-center rounded-full border transition-colors ${
                  createMultiple ? "bg-emerald-600 border-emerald-600" : "bg-neutral-800 border-neutral-700"
                }`}
              >
                <span 
                  className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${
                    createMultiple ? "translate-x-3" : "translate-x-0.5"
                  }`} 
                />
              </button>
              <span>Create more</span>
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="h-8 px-3.5 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-xs inline-flex items-center gap-1.5 transition cursor-pointer shadow-sm"
            >
              {isSubmitting && <Loader2 className="size-3.5 animate-spin" />}
              <span>{primaryActionLabel}</span>
              <span className="ml-1 inline-flex items-center gap-0.5 rounded border border-white/20 px-1.5 py-0.5 text-[10px] font-medium leading-none text-white/90">
                <span>Ctrl</span>
                <CornerDownLeft className="size-2.5" />
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
