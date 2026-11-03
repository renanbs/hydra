import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { toast } from "sonner";
import { AlertCircle, X } from "lucide-react";
import { NonGitFolderDialog } from "./NonGitFolderDialog";
import { useAppStore } from "../../store";
import { getDefaultCloneParent } from "./clone-defaults";
import { AddRepoStepIndicator } from "./AddRepoStepIndicator";
import { AddRepoHostSelector } from "./AddRepoHostSelector";
import { AddRepoStartStep } from "./AddRepoStartStep";
import { AddRepoCloneStep } from "./AddRepoCloneStep";
import { AddRepoCreateStep } from "./AddRepoCreateStep";
import { AddRepoNestedImportStep } from "./AddRepoNestedImportStep";
import { AddProjectFromFolderDialog } from "./AddProjectFromFolderDialog";
import { useAddRepoHostSelection } from "./useAddRepoHostSelection";
import { useAddRepoHostChangeReset } from "./useAddRepoHostChangeReset";
import {
  createNestedRepoScanId,
  defaultProjectGroupNameForPath,
  type AddRepoDialogStep
} from "./add-repo-dialog-types";
import { routeAddRepoBrowse } from "./add-repo-browse-authority";
import { getAddRepoLocalStartActions } from "./add-repo-local-start-actions";
import {
  cancelLocalNestedRepoScan,
  getSelectedNestedRepoPathsInScanOrder,
  scanNestedReposLocal
} from "./nested-repo-scan-local";
import type { GitAvailability } from "./create-project-defaults";
import type { NestedRepoScanResult } from "../../shared/project-group-types";
import { extractIpcErrorMessage } from "../../lib/ipc-error";
import { importNestedCatalogRepos } from "../../lib/catalog-client";
import { toProjectGroupImportResult } from "../../lib/orca-api-shim";
import { PROJECTS_REFRESH_EVENT } from "../../lib/refresh-projects-awaitable";

export type AddRepoProjectAddedKind = "project" | "folder";

interface AddRepoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Orca `onGitRepoReady`: `path` names the added project (or folder workspace)
   * so the caller can select it instead of guessing from list order.
   */
  onProjectAdded: (path?: string, kind?: AddRepoProjectAddedKind) => void;
  /**
   * Orca `confirm-add-project-from-folder`: a folder dropped on the sidebar routes
   * here instead of being added silently, so the user still confirms the project.
   */
  initialFolderPath?: string | null;
}

type NestedReviewContext = {
  parentPath: string;
  scanId: string;
};

type PickedFolder = string | string[] | null;

function normalizePickedFolders(picked: PickedFolder): string[] {
  if (typeof picked === "string") return picked ? [picked] : [];
  return Array.isArray(picked) ? picked.filter((path): path is string => Boolean(path)) : [];
}

export function AddRepoDialog({
  isOpen,
  onClose,
  onProjectAdded,
  initialFolderPath = null
}: AddRepoDialogProps) {
  const settings = useAppStore((state) => state.settings);
  const repoCount = useAppStore((state) => state.repos.length);
  // Orca `useAddRepoLocalFolderFlow`: clone/create land in the configured workspace
  // directory, not a baked-in path. Empty until the settings hydrate.
  const workspaceDir = settings?.workspace_dir?.trim() ?? "";
  const hostSelection = useAddRepoHostSelection({ isOpen });
  const selectedHostKind = hostSelection.selectedParsedHost?.kind ?? null;
  const isLocalHost = selectedHostKind === "local";
  const isRemoteHost = !isLocalHost;
  const hostLabel = hostSelection.selectedHostOption?.label ?? null;
  const [step, setStep] = useState<AddRepoDialogStep>("add");
  const [isAdding, setIsAdding] = useState(false);
  const [busyLabel, setBusyLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gitAvailability, setGitAvailability] = useState<GitAvailability>("unknown");
  // Why: monotonic id so stale async folders/clone/create results cannot close or
  // overwrite the dialog after Back/close/host switch. Orca's generation ref.
  const addGenRef = useRef(0);

  const [cloneUrl, setCloneUrl] = useState("");
  // Orca `getDefaultCloneParent`: clones sit beside the "workspaces" tree, so a
  // workspace dir ending in /workspaces clones into its parent.
  const [cloneDest, setCloneDest] = useState(getDefaultCloneParent(workspaceDir));
  const [cloneError, setCloneError] = useState<string | null>(null);
  const [isCloning, setIsCloning] = useState(false);

  const [createName, setCreateName] = useState("");
  const [createParent, setCreateParent] = useState(workspaceDir);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [nonGitFolder, setNonGitFolder] = useState<string | null>(null);
  const [droppedFolder, setDroppedFolder] = useState<string | null>(null);
  const [droppedFolderError, setDroppedFolderError] = useState<string | null>(null);

  const [nestedScan, setNestedScan] = useState<NestedRepoScanResult | null>(null);
  const [nestedSelectedPaths, setNestedSelectedPaths] = useState<ReadonlySet<string>>(
    () => new Set()
  );
  const [nestedGroupName, setNestedGroupName] = useState("");
  const [scanInProgress, setScanInProgress] = useState(false);
  const [nestedReview, setNestedReview] = useState<NestedReviewContext | null>(null);
  // Why a ref: reset must cancel the active scan without its identity feeding
  // every callback that depends on reset (which would retrigger the open effect).
  const activeNestedScanIdRef = useRef<string | null>(null);

  const resetNestedReview = useCallback(() => {
    if (activeNestedScanIdRef.current) {
      cancelLocalNestedRepoScan(activeNestedScanIdRef.current);
      activeNestedScanIdRef.current = null;
    }
    setNestedScan(null);
    setNestedSelectedPaths(new Set());
    setNestedGroupName("");
    setScanInProgress(false);
    setNestedReview(null);
  }, []);

  const resetHostScopedState = useCallback(() => {
    addGenRef.current += 1;
    setIsAdding(false);
    setBusyLabel(null);
    setError(null);
    setCloneUrl("");
    setCloneDest(isLocalHost ? getDefaultCloneParent(workspaceDir) : "");
    setCloneError(null);
    setIsCloning(false);
    setCreateName("");
    setCreateParent(isLocalHost ? workspaceDir : "");
    setCreateError(null);
    setIsCreating(false);
    setDroppedFolderError(null);
    resetNestedReview();
    setStep("add");
  }, [isLocalHost, resetNestedReview, workspaceDir]);

  const resetOnClose = useCallback(() => {
    addGenRef.current += 1;
    setStep("add");
    setError(null);
    setNonGitFolder(null);
    setDroppedFolder(null);
    setDroppedFolderError(null);
    setBusyLabel(null);
    setIsAdding(false);
    resetNestedReview();
  }, [resetNestedReview]);

  useAddRepoHostChangeReset({
    isOpen,
    selectedHostId: hostSelection.selectedHostId,
    onResetClosed: resetOnClose,
    onResetHostScopedState: resetHostScopedState
  });

  // Clone progress: Orca subscribes to `window.api.repos.onCloneProgress`; Hydra's
  // `clone_project` command streams nothing yet, so the dialog passes no progress
  // and the step shows its indeterminate bar instead of a fabricated percentage.
  const cloneProgress = null as { phase: string; percent: number } | null;

  useEffect(() => {
    if (!isOpen) return;
    // Why reset: the dialog stays mounted between invocations, so a half-typed
    // clone URL or project name must not survive into the next open.
    setStep(initialFolderPath ? "folder" : "add");
    setError(null);
    setNonGitFolder(null);
    setDroppedFolder(initialFolderPath);
    setDroppedFolderError(null);
    setCloneUrl("");
    setCloneDest(isLocalHost ? getDefaultCloneParent(workspaceDir) : "");
    setCloneError(null);
    setIsCloning(false);
    setCreateName("");
    setCreateParent(isLocalHost ? workspaceDir : "");
    setCreateError(null);
    setIsCreating(false);
    resetNestedReview();
    setStep(initialFolderPath ? "folder" : "add");

    let cancelled = false;
    // Why probe on open: without git, clone and create cannot work — say so before
    // the user types a URL instead of failing after submit.
    setGitAvailability("checking");
    void invoke<{ git_installed: boolean }>("check_preflight_tools_cmd")
      .then((status) => {
        if (!cancelled) setGitAvailability(status.git_installed ? "available" : "unavailable");
      })
      .catch(() => {
        if (!cancelled) setGitAvailability("unknown");
      });
    return () => {
      cancelled = true;
    };
  }, [initialFolderPath, isOpen, resetNestedReview]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const handleClose = () => {
    addGenRef.current += 1;
    resetOnClose();
    onClose();
  };

  const addFolder = async (path: string): Promise<void> => {
    await invoke("catalog_add_folder", { path });
  };

  const beginNestedReview = (
    scan: NestedRepoScanResult,
    context: NestedReviewContext,
    inProgress: boolean
  ) => {
    activeNestedScanIdRef.current = context.scanId;
    setNestedScan(scan);
    setNestedSelectedPaths(new Set(scan.repos.map((repo) => repo.path)));
    setNestedGroupName(defaultProjectGroupNameForPath(scan.selectedPath));
    setNestedReview(context);
    setScanInProgress(inProgress);
    setStep("nested");
  };

  const handleStopNestedScan = useCallback(() => {
    const scanId = activeNestedScanIdRef.current;
    if (!scanId) return;
    // Why no eager `setScanInProgress(false)`: the scan promise still owns the
    // final result, and letting the review import before it settles would race
    // two catalog writes. The scanner settles the in-progress flag.
    cancelLocalNestedRepoScan(scanId);
  }, []);

  /**
   * Add one or more picked paths. In `batch` mode (multi-select) complex folders
   * with nested repositories are skipped and counted, and the navigation handoff
   * is deferred until every path settled — Orca's `handleAddLocalPaths`.
   */
  const handleAddLocalPaths = async (
    paths: string[],
    mode: "single" | "batch"
  ): Promise<void> => {
    if (isRemoteHost) {
      toast.error("Use a host path to add projects from a remote host.");
      return;
    }
    const gen = ++addGenRef.current;
    const busyFolderMode = paths.length > 1 ? "batch" : mode;
    let skippedCount = 0;
    let firstAddedPath: string | null = null;
    let firstAddedKind: AddRepoProjectAddedKind | null = null;

    setIsAdding(true);
    setError(null);
    try {
      for (const path of paths) {
        if (gen !== addGenRef.current) return;
        setBusyLabel("Scanning for repositories...");
        const scanId = createNestedRepoScanId();
        activeNestedScanIdRef.current = scanId;
        setNestedReview({ parentPath: path, scanId });
        setScanInProgress(true);
        let scan: NestedRepoScanResult;
        try {
          scan = await scanNestedReposLocal({
            path,
            scanId,
            onProgress: (progress) => {
              if (gen !== addGenRef.current) return;
              if (
                busyFolderMode === "batch" ||
                progress.selectedPathKind !== "non_git_folder" ||
                progress.repos.length === 0
              ) {
                return;
              }
              beginNestedReview(progress, { parentPath: path, scanId }, true);
            }
          });
        } catch (scanError) {
          activeNestedScanIdRef.current = null;
          setNestedReview(null);
          setScanInProgress(false);
          if (gen === addGenRef.current) {
            setError(extractIpcErrorMessage(scanError, String(scanError)));
            return;
          }
          return;
        }
        if (gen !== addGenRef.current) return;

        if (scan.selectedPathKind === "non_git_folder" && scan.repos.length > 0) {
          if (busyFolderMode === "batch") {
            activeNestedScanIdRef.current = null;
            setNestedReview(null);
            setScanInProgress(false);
            skippedCount += 1;
            continue;
          }
          setScanInProgress(false);
          beginNestedReview(scan, { parentPath: path, scanId }, false);
          return;
        }

        activeNestedScanIdRef.current = null;
        setNestedReview(null);
        setScanInProgress(false);
        setBusyLabel("Opening project...");
        const isGit = scan.selectedPathKind === "git_repo";
        try {
          await addFolder(path);
        } catch (addError) {
          if (gen === addGenRef.current) {
            setError(extractIpcErrorMessage(addError, String(addError)));
          }
          return;
        }
        if (gen !== addGenRef.current) return;
        firstAddedPath = path;
        firstAddedKind = isGit ? "project" : "folder";
        if (busyFolderMode === "single") {
          onProjectAdded(path, firstAddedKind);
          handleClose();
          return;
        }
      }

      if (gen !== addGenRef.current) return;
      if (skippedCount > 0) {
        toast.info("Some folders were skipped", {
          description: "Add skipped folders individually to review or confirm them."
        });
      }
      if (firstAddedPath) {
        onProjectAdded(firstAddedPath, firstAddedKind ?? "project");
        handleClose();
      }
    } finally {
      if (gen === addGenRef.current) {
        setIsAdding(false);
        setBusyLabel(null);
      }
    }
  };

  const handleBrowseFolder = async () => {
    try {
      setBusyLabel("Choose a folder...");
      const picked = (await open({
        directory: true,
        multiple: true,
        title: "Select Existing Project or Git Repository"
      })) as PickedFolder;
      const paths = normalizePickedFolders(picked);
      if (paths.length === 0) {
        setBusyLabel(null);
        return;
      }
      await handleAddLocalPaths(paths, paths.length > 1 ? "batch" : "single");
    } catch (browseError) {
      setBusyLabel(null);
      setError(extractIpcErrorMessage(browseError, String(browseError)));
    }
  };

  const handleBrowseByHost = () => {
    routeAddRepoBrowse(hostSelection.selectedParsedHost, {
      browseLocal: () => void handleBrowseFolder(),
      browseRuntime: () => setStep("server-path"),
      browseSsh: () => setStep("remote")
    });
  };

  const handlePickCloneDestination = async () => {
    if (!isLocalHost) {
      toast.error("Enter a host path for the clone destination.");
      return;
    }
    const gen = addGenRef.current;
    const picked = await open({ directory: true, multiple: false, title: "Choose clone destination" });
    const [dir] = normalizePickedFolders(picked as PickedFolder);
    if (dir && gen === addGenRef.current) {
      setCloneDest(dir);
      setCloneError(null);
    }
  };

  const handleClone = async () => {
    const url = cloneUrl.trim();
    const destination = cloneDest.trim();
    if (!url || !destination) return;
    if (!isLocalHost) {
      setCloneError(
        "Cloning on a remote host needs the SSH/runtime clone bridge, which this build does not ship."
      );
      return;
    }
    const gen = ++addGenRef.current;
    setIsCloning(true);
    setCloneError(null);
    try {
      const path = await invoke<string>("clone_project", { url, parentDir: destination });
      if (gen !== addGenRef.current) return;
      toast.success("Repository cloned");
      onProjectAdded(path, "project");
      handleClose();
    } catch (cloneFailure) {
      if (gen !== addGenRef.current) return;
      setCloneError(extractIpcErrorMessage(cloneFailure, String(cloneFailure)));
    } finally {
      if (gen === addGenRef.current) setIsCloning(false);
    }
  };

  const handlePickCreateParent = async () => {
    if (!isLocalHost) {
      toast.error("Enter a host parent path.");
      return;
    }
    const gen = addGenRef.current;
    const picked = await open({ directory: true, multiple: false, title: "Choose project parent folder" });
    const [dir] = normalizePickedFolders(picked as PickedFolder);
    if (dir && gen === addGenRef.current) {
      setCreateParent(dir);
      setCreateError(null);
    }
  };

  const handleCreate = async () => {
    const name = createName.trim();
    const parent = createParent.trim();
    if (!name || !parent) return;
    if (!isLocalHost) {
      setCreateError(
        "Creating a project on a remote host needs the SSH/runtime create bridge, which this build does not ship."
      );
      return;
    }
    const gen = ++addGenRef.current;
    setIsCreating(true);
    setCreateError(null);
    try {
      const path = await invoke<string>("create_project", {
        name,
        parentDir: parent,
        initGit: true
      });
      if (gen !== addGenRef.current) return;
      toast.success("Project created");
      onProjectAdded(path, "project");
      handleClose();
    } catch (createFailure) {
      if (gen !== addGenRef.current) return;
      setCreateError(extractIpcErrorMessage(createFailure, String(createFailure)));
    } finally {
      if (gen === addGenRef.current) setIsCreating(false);
    }
  };

  const confirmDroppedFolder = async () => {
    if (!droppedFolder) return;
    const gen = ++addGenRef.current;
    setIsAdding(true);
    setDroppedFolderError(null);
    try {
      const isGit = await invoke<boolean>("is_git_repository", { path: droppedFolder });
      if (gen !== addGenRef.current) return;
      if (!isGit) {
        setNonGitFolder(droppedFolder);
        return;
      }
      await addFolder(droppedFolder);
      if (gen !== addGenRef.current) return;
      onProjectAdded(droppedFolder, "project");
      handleClose();
    } catch (dropError) {
      if (gen === addGenRef.current) {
        setDroppedFolderError(extractIpcErrorMessage(dropError, String(dropError)));
      }
    } finally {
      if (gen === addGenRef.current) setIsAdding(false);
    }
  };

  const handleConfirmNonGitFolder = async () => {
    const folder = nonGitFolder;
    if (!folder) return;
    const gen = ++addGenRef.current;
    setIsAdding(true);
    setError(null);
    try {
      await addFolder(folder);
      if (gen !== addGenRef.current) return;
      onProjectAdded(folder, "folder");
      handleClose();
    } catch (folderError) {
      if (gen === addGenRef.current) {
        setError(extractIpcErrorMessage(folderError, String(folderError)));
      }
    } finally {
      if (gen === addGenRef.current) setIsAdding(false);
    }
  };

  /**
   * D02a-024: one bulk catalog write for the reviewed selection. The host
   * validates every selected path before persisting, so a failed import leaves
   * the catalog untouched instead of landing a partial batch.
   */
  const handleImportNestedRepos = async (mode: "group" | "separate") => {
    if (!nestedScan || !nestedReview) return;
    const paths = getSelectedNestedRepoPathsInScanOrder(nestedScan, nestedSelectedPaths);
    if (paths.length === 0) {
      setError("Select at least one repository to import.");
      return;
    }
    const gen = ++addGenRef.current;
    setIsAdding(true);
    setBusyLabel("Importing repositories...");
    setError(null);
    try {
      const catalogResult = await importNestedCatalogRepos(
        paths,
        mode === "group"
          ? nestedGroupName.trim() ||
              defaultProjectGroupNameForPath(nestedScan.selectedPath)
          : null
      );
      // The catalog is the authority. App refreshes it again in `onProjectAdded`,
      // so this notification is fire-and-forget; blocking here would couple the
      // import to whichever listener happens to be mounted.
      window.dispatchEvent(new CustomEvent(PROJECTS_REFRESH_EVENT));
      if (gen !== addGenRef.current) return;
      const result = toProjectGroupImportResult(catalogResult);
      if (result.failedCount > 0) {
        toast.warning("Some repositories could not be imported", {
          description: `${result.failedCount} failed`
        });
      }
      const firstImported = result.projects.find(
        (project) => project.status === "imported"
      )?.path;
      if (!firstImported) {
        toast.info("Nothing new to import", {
          description: "Every selected repository is already in the sidebar."
        });
        return;
      }
      toast.success(mode === "group" ? "Group imported" : "Repositories imported");
      onProjectAdded(firstImported, "project");
      handleClose();
    } catch (importError) {
      if (gen === addGenRef.current) {
        setError(extractIpcErrorMessage(importError, String(importError)));
      }
    } finally {
      if (gen === addGenRef.current) {
        setIsAdding(false);
        setBusyLabel(null);
      }
    }
  };

  const handleOpenNestedRootFolder = async () => {
    if (!nestedScan) return;
    const gen = ++addGenRef.current;
    setIsAdding(true);
    setBusyLabel("Opening project...");
    setError(null);
    try {
      // Why: `catalog_add_folder` on a non-git folder is the catalog's
      // open-as-folder path (group + folder workspace). It also imports direct
      // child repositories, which the catalog does today for this path.
      await addFolder(nestedScan.selectedPath);
      if (gen !== addGenRef.current) return;
      onProjectAdded(nestedScan.selectedPath, "folder");
      handleClose();
    } catch (openError) {
      if (gen === addGenRef.current) {
        setError(extractIpcErrorMessage(openError, String(openError)));
      }
    } finally {
      if (gen === addGenRef.current) {
        setIsAdding(false);
        setBusyLabel(null);
      }
    }
  };

  const goBack = () => {
    if (step === "nested" && isAdding) return;
    resetHostScopedState();
  };

  const startActions = useMemo(
    () =>
      getAddRepoLocalStartActions({
        isSshLikely: hostSelection.hostOptions.some((host) => host.kind === "ssh"),
        onBrowse: handleBrowseByHost,
        onOpenCloneStep: () => {
          setCloneError(null);
          setStep("clone");
        },
        onOpenRemoteStep: () => setStep("remote"),
        onOpenCreateStep: () => {
          setCreateError(null);
          setStep("create");
        },
        showRemoteAction: hostSelection.hostOptions.some((host) => host.kind === "ssh"),
        canCreateProject: hostSelection.selectedParsedHost?.kind !== "ssh",
        browseHostKind: selectedHostKind ?? "local"
      }),
    // Why: the handlers close over the current host/step state; rebuilding when
    // those change keeps the primary action's browse authority correct.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hostSelection.hostOptions, hostSelection.selectedParsedHost, selectedHostKind]
  );

  if (!isOpen) return null;

  return (
    <div
      onClick={handleClose}
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 select-none"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className={`relative rounded-xl bg-[#141518] border border-[#2a2b30] shadow-2xl overflow-hidden text-xs text-neutral-200 ${
          step === "nested" ? "w-[560px] max-h-[calc(100vh-2rem)] overflow-y-auto" : "w-[500px]"
        }`}
      >
        <div className="h-11 border-b border-[#222327] px-4 flex items-center justify-between bg-[#111214]">
          <div className="min-w-0">
            <span className="block truncate font-semibold text-neutral-200">
              {step === "add" && "Add Project"}
              {step === "clone" && "Clone from URL"}
              {step === "create" && "Create New Project"}
              {step === "folder" && "Add Project from Folder"}
              {step === "remote" && "Project on SSH host"}
              {step === "server-path" && "Project on server"}
              {step === "nested" && "Import repositories from folder"}
            </span>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 pt-2">
          <AddRepoStepIndicator step={step} isAdding={isAdding} onBack={goBack} />
        </div>

        {error ? (
          <div className="mx-4 mt-1 p-2.5 rounded bg-red-500/15 border border-red-500/30 text-red-400 text-[11px] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="min-w-0 break-words">{error}</span>
          </div>
        ) : null}

        {gitAvailability === "unavailable" ? (
          <div className="mx-4 mt-1 p-2.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Git is not installed or not on PATH. Cloning and creating projects are disabled.</span>
          </div>
        ) : null}

        {step === "folder" ? (
          <AddProjectFromFolderDialog
            folderPath={droppedFolder ?? ""}
            hostLabel={hostLabel}
            isSubmitting={isAdding}
            error={droppedFolderError}
            onCancel={handleClose}
            onConfirm={() => void confirmDroppedFolder()}
          />
        ) : null}

        {step === "add" ? (
          <div className="p-4">
            <AddRepoStartStep
              repoCount={repoCount}
              isAdding={isAdding}
              addProjectBusyLabel={busyLabel}
              nestedScanInProgress={scanInProgress}
              nestedScanId={nestedReview?.scanId ?? null}
              hostSelector={
                <AddRepoHostSelector
                  hostOptions={hostSelection.hostOptions}
                  selectedHostId={hostSelection.selectedHostId}
                  connectingTargetIds={hostSelection.connectingTargetIds}
                  onSelect={hostSelection.setSelectedHostId}
                  onConnect={hostSelection.connectTarget}
                />
              }
              actionsDisabled={!hostSelection.selectedHostOption}
              primaryAction={startActions.primaryAction}
              secondaryActions={startActions.secondaryActions}
              onStopNestedScan={handleStopNestedScan}
            />
          </div>
        ) : null}

        {step === "clone" ? (
          <AddRepoCloneStep
            cloneUrl={cloneUrl}
            cloneDestination={cloneDest}
            cloneError={cloneError}
            cloneProgress={cloneProgress}
            isCloning={isCloning}
            gitUnavailable={gitAvailability === "unavailable"}
            destinationIsRemote={isRemoteHost}
            hostLabel={hostLabel}
            onUrlChange={(value) => {
              setCloneUrl(value);
              setCloneError(null);
            }}
            onDestinationChange={(value) => {
              setCloneDest(value);
              setCloneError(null);
            }}
            onPickDestination={() => void handlePickCloneDestination()}
            onClone={() => void handleClone()}
          />
        ) : null}

        {step === "create" ? (
          <AddRepoCreateStep
            createName={createName}
            createParent={createParent}
            createError={createError}
            isCreating={isCreating}
            defaultParent={isLocalHost ? workspaceDir : ""}
            gitAvailability={gitAvailability}
            manualParentEntry={isRemoteHost}
            isRemoteHost={isRemoteHost}
            hostLabel={hostLabel}
            onNameChange={(value) => {
              setCreateName(value);
              setCreateError(null);
            }}
            onParentChange={(value) => {
              setCreateParent(value);
              setCreateError(null);
            }}
            onPickParent={() => void handlePickCreateParent()}
            onBrowseServer={() => setStep("server-path")}
            onCreate={() => void handleCreate()}
          />
        ) : null}

        {step === "nested" && nestedScan ? (
          <AddRepoNestedImportStep
            scan={nestedScan}
            groupName={nestedGroupName}
            selectedPaths={nestedSelectedPaths}
            isAdding={isAdding}
            scanInProgress={scanInProgress}
            onGroupNameChange={setNestedGroupName}
            onSelectedPathsChange={setNestedSelectedPaths}
            onImport={(mode) => void handleImportNestedRepos(mode)}
            onOpenAsFolder={() => void handleOpenNestedRootFolder()}
            onStopScan={handleStopNestedScan}
          />
        ) : null}

        {step === "remote" || step === "server-path" ? (
          <div className="p-5 space-y-3">
            <h2 className="text-sm font-semibold tracking-tight text-neutral-100">
              {step === "remote" ? "Project on SSH host" : "Project on server"}
            </h2>
            <p className="text-xs leading-relaxed text-neutral-400">
              {step === "remote"
                ? `Opening a project path on ${hostLabel ?? "this SSH host"} needs the SSH project bridge (remote path add + remote folder scan), which this build does not ship. The host selector and connection probe work; adding is blocked.`
                : "Opening a project path on a runtime server needs the runtime RPC bridge (`repo.add`), which this build does not ship. The host selector works; adding is blocked."}
            </p>
            <div className="rounded border border-[#2a2b30] bg-[#0e0f11] px-3 py-2 font-mono text-[11px] text-neutral-500">
              {hostLabel ?? "No host selected"}
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setStep("add")}
                className="px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition cursor-pointer"
              >
                Back
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <NonGitFolderDialog
        open={nonGitFolder != null}
        folderPath={nonGitFolder ?? ""}
        hostLabel={hostLabel}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setNonGitFolder(null);
        }}
        onConfirm={() => void handleConfirmNonGitFolder()}
      />
    </div>
  );
}
