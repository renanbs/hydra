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
import { RemoteFileBrowser } from "./RemoteFileBrowser";
import { abortClone, cloneRepository, createCloneId } from "../../lib/clone-client";
import { addPairedServerCatalogRepo, addRemoteCatalogRepo } from "../../lib/catalog-client";
import { cloneSshRepository, createSshProject } from "../../store/ssh-remote-bridge";
import {
  clonePairedServerRepository,
  createPairedServerProject
} from "../../store/paired-server-repo-bridge";
import { toRuntimeExecutionHostId, toSshExecutionHostId } from "../../shared/execution-host";
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
import { joinCreateProjectPath, type GitAvailability } from "./create-project-defaults";
import type { NestedRepoScanResult } from "../../shared/project-group-types";
import { extractIpcErrorMessage } from "../../lib/ipc-error";
import { importNestedCatalogRepos } from "../../lib/catalog-client";
import { toProjectGroupImportResult } from "../../lib/orca-api-shim";
import { PROJECTS_REFRESH_EVENT } from "../../lib/refresh-projects-awaitable";
import { addCatalogFolderWorkspace } from "../../lib/catalog-client";
import { buildNestedRepoImportActionTelemetry, createNestedRepoTelemetryAttemptId } from "../../shared/nested-repo-telemetry";
import { track } from "../../lib/telemetry";
import {
  resolveSshCreateParentDefault,
  resolveSshGitAvailability
} from "./ssh-create-defaults";

export type AddRepoProjectAddedKind = "project" | "folder";

/** Host captured when the add started; the async result must carry it. */
export type AddRepoProjectOwner = {
  connectionId?: string | null;
  executionHostId?: string | null;
  /** Telemetry/default-checkout source for the handoff (Orca `onGitRepoReady`). */
  source?:
    | "local_folder_picker"
    | "runtime_server_path"
    | "ssh_remote_path"
    | "clone_url"
    | "create_project";
};

/**
 * Orca `AddRepoDialogHostedController`: a host surface (the workspace composer)
 * may own the open state and close-autofocus while the dialog is layered above
 * it. When absent the dialog uses the store's singleton modal slot.
 */
export type AddRepoDialogHostedController = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectAdded?: (
    path?: string,
    kind?: AddRepoProjectAddedKind,
    owner?: AddRepoProjectOwner
  ) => void | Promise<void>;
  /** Received before focus returns to the host (Radix contract). */
  onCloseAutoFocus?: (event: Event) => void;
};

interface AddRepoDialogProps {
  /** Controlled mode (tests/legacy). Omitted in the app: the store modal owns it. */
  isOpen?: boolean;
  onClose?: () => void;
  /**
   * Orca `onGitRepoReady`: `path` names the added project (or folder workspace)
   * so the caller can select it instead of guessing from list order.
   */
  onProjectAdded?: (
    path?: string,
    kind?: AddRepoProjectAddedKind,
    owner?: AddRepoProjectOwner
  ) => void | Promise<void>;
  /**
   * Orca `confirm-add-project-from-folder`: a folder dropped on the sidebar routes
   * here instead of being added silently, so the user still confirms the project.
   */
  initialFolderPath?: string | null;
  hosted?: AddRepoDialogHostedController;
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
  initialFolderPath = null,
  hosted
}: AddRepoDialogProps) {
  const settings = useAppStore((state) => state.settings);
  const storeActiveModal = useAppStore((state) => state.activeModal);
  const storeModalData = useAppStore((state) => state.modalData);
  const storeCloseModal = useAppStore((state) => state.closeModal);
  // Why: Orca opens this dialog through `activeModal === 'add-repo'` and carries
  // a dropped path in `modalData`; a passed `isOpen` keeps tests/controlled use.
  const isOpenNow = hosted ? hosted.open : isOpen ?? storeActiveModal === "add-repo";
  const droppedLocalPath =
    hosted || isOpen !== undefined
      ? initialFolderPath
      : typeof storeModalData?.droppedLocalPath === "string"
        ? storeModalData.droppedLocalPath
        : initialFolderPath;
  const closeModal = useCallback(() => {
    if (hosted) {
      hosted.onOpenChange(false);
      hosted.onCloseAutoFocus?.(new Event("closeAutoFocus"));
      return;
    }
    if (onClose) {
      onClose();
      return;
    }
    storeCloseModal();
  }, [hosted, onClose, storeCloseModal]);
  const notifyProjectAdded = useCallback(
    (path?: string, kind?: AddRepoProjectAddedKind, owner?: AddRepoProjectOwner) => {
      const target = hosted ? hosted.onProjectAdded : onProjectAdded;
      // Arity is preserved: legacy callers/tests assert the two-argument call.
      void (owner ? target?.(path, kind, owner) : target?.(path, kind));
    },
    [hosted, onProjectAdded]
  );
  const repoCount = useAppStore((state) => state.repos.length);
  // Orca `useAddRepoLocalFolderFlow`: clone/create land in the configured workspace
  // directory, not a baked-in path. Empty until the settings hydrate.
  const workspaceDir = settings?.workspace_dir?.trim() ?? "";
  const hostSelection = useAddRepoHostSelection({ isOpen: isOpenNow });
  const selectedHostKind = hostSelection.selectedParsedHost?.kind ?? null;
  const isLocalHost = selectedHostKind === "local";
  const isRemoteHost = !isLocalHost;
  const sshTargetId = hostSelection.selectedSshTargetId;
  // Why: only an SSH target has the remote execution commands; a paired runtime
  // server still needs its RPC bridge.
  const isSshHost = selectedHostKind === "ssh" && sshTargetId !== null;
  const runtimeEnvironmentId =
    selectedHostKind === "runtime" && hostSelection.selectedHostId.startsWith("runtime:")
      ? decodeURIComponent(hostSelection.selectedHostId.slice("runtime:".length)) || null
      : null;
  const isRuntimeHost = selectedHostKind === "runtime" && runtimeEnvironmentId !== null;
  const hostLabel = hostSelection.selectedHostOption?.label ?? null;
  const [step, setStep] = useState<AddRepoDialogStep>("add");
  const [isAdding, setIsAdding] = useState(false);
  const [busyLabel, setBusyLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gitAvailability, setGitAvailability] = useState<GitAvailability>("unknown");
  // D02a-017: an SSH host is probed on the host; the client's own `git` says
  // nothing about the machine that will actually create the repository.
  const [sshGitAvailability, setSshGitAvailability] = useState<GitAvailability>("unknown");
  const sshCreateDefaultGenRef = useRef(0);
  const sshGitProbeGenRef = useRef(0);
  // Why: monotonic id so stale async folders/clone/create results cannot close or
  // overwrite the dialog after Back/close/host switch. Orca's generation ref.
  const addGenRef = useRef(0);
  // Id of the running local clone, so Cancel and close/back-out have the
  // process handle `clone_abort` needs (Orca `repos.cloneAbort`).
  const cloneIdRef = useRef<string | null>(null);
  const abortActiveClone = useCallback(() => {
    const cloneId = cloneIdRef.current;
    cloneIdRef.current = null;
    if (!cloneId) return;
    void abortClone(cloneId).catch(() => {
      // The clone promise owns the user-facing error surface; teardown is silent.
    });
  }, []);
  // Which host-path field the remote folder picker is filling.
  const [remotePicker, setRemotePicker] = useState<"clone" | "create" | null>(null);

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
  // Telemetry identity for the scan/review pair; independent of the scan id so
  // cancelling a scan cannot merge two attempts in the event stream.
  const nestedAttemptIdRef = useRef<string | null>(null);

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
    abortActiveClone();
    setIsAdding(false);
    setBusyLabel(null);
    setError(null);
    setCloneUrl("");
    setCloneDest(isLocalHost ? getDefaultCloneParent(workspaceDir) : "");
    setCloneError(null);
    setIsCloning(false);
    setRemotePicker(null);
    setCreateName("");
    setCreateParent(isLocalHost ? workspaceDir : "");
    setCreateError(null);
    setIsCreating(false);
    setSshGitAvailability("unknown");
    setDroppedFolderError(null);
    resetNestedReview();
    setStep("add");
  }, [abortActiveClone, isLocalHost, resetNestedReview, workspaceDir]);

  const resetOnClose = useCallback(() => {
    addGenRef.current += 1;
    abortActiveClone();
    setStep("add");
    setError(null);
    setNonGitFolder(null);
    setDroppedFolder(null);
    setDroppedFolderError(null);
    setBusyLabel(null);
    setIsAdding(false);
    setRemotePicker(null);
    resetNestedReview();
  }, [abortActiveClone, resetNestedReview]);

  useAddRepoHostChangeReset({
    isOpen: isOpenNow,
    selectedHostId: hostSelection.selectedHostId,
    onResetClosed: resetOnClose,
    onResetHostScopedState: resetHostScopedState
  });

  // Clone progress: Orca subscribes to `window.api.repos.onCloneProgress`; Hydra's
  // `clone_project` command streams nothing yet, so the dialog passes no progress
  // and the step shows its indeterminate bar instead of a fabricated percentage.
  const cloneProgress = null as { phase: string; percent: number } | null;

  useEffect(() => {
    if (!isOpenNow) return;
    // Why reset: the dialog stays mounted between invocations, so a half-typed
    // clone URL or project name must not survive into the next open.
    setStep(droppedLocalPath ? "folder" : "add");
    setError(null);
    setNonGitFolder(null);
    setDroppedFolder(droppedLocalPath ?? null);
    setDroppedFolderError(null);
    setCloneUrl("");
    setCloneDest(isLocalHost ? getDefaultCloneParent(workspaceDir) : "");
    setCloneError(null);
    setIsCloning(false);
    setRemotePicker(null);
    setCreateName("");
    setCreateParent(isLocalHost ? workspaceDir : "");
    setCreateError(null);
    setIsCreating(false);
    resetNestedReview();
    setStep(droppedLocalPath ? "folder" : "add");

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
  }, [droppedLocalPath, isOpenNow, resetNestedReview, workspaceDir]);

  // D02a-017: default a new SSH project to `~/orca/projects` on that host. The
  // listing resolves `~`; the literal remains the fallback when the box is slow.
  useEffect(() => {
    if (step !== "create" || !isSshHost || !sshTargetId) return;
    if (createParent.trim()) return;
    const gen = ++sshCreateDefaultGenRef.current;
    void resolveSshCreateParentDefault(sshTargetId).then((parent) => {
      if (gen !== sshCreateDefaultGenRef.current) return;
      setCreateParent((current) => (current.trim() ? current : parent));
    });
  }, [createParent, isSshHost, sshTargetId, step]);

  useEffect(() => {
    if (step !== "create" || !isSshHost || !sshTargetId) {
      setSshGitAvailability("unknown");
      return;
    }
    const gen = ++sshGitProbeGenRef.current;
    setSshGitAvailability("checking");
    void resolveSshGitAvailability(sshTargetId, createParent).then((availability) => {
      if (gen === sshGitProbeGenRef.current) setSshGitAvailability(availability);
    });
  }, [createParent, isSshHost, sshTargetId, step]);

  // A path dropped while the dialog is already open replaces the form instead
  // of waiting for the next open (Orca reads `modalData.droppedLocalPath` live).
  useEffect(() => {
    if (!isOpenNow || !droppedLocalPath) return;
    setDroppedFolder(droppedLocalPath);
    setDroppedFolderError(null);
    setStep("folder");
  }, [droppedLocalPath, isOpenNow]);

  useEffect(() => {
    if (!isOpenNow) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const handleClose = () => {
    addGenRef.current += 1;
    resetOnClose();
    closeModal();
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
    nestedAttemptIdRef.current = createNestedRepoTelemetryAttemptId();
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
          notifyProjectAdded(path, firstAddedKind);
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
        notifyProjectAdded(firstAddedPath, firstAddedKind ?? "project");
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
      browseRuntime: () => {
        if (isRuntimeHost) {
          setRemotePicker("clone");
          return;
        }
        setStep("server-path");
      },
      browseSsh: () => setStep("remote")
    });
  };

  const handlePickCloneDestination = async () => {
    if (isSshHost || isRuntimeHost) {
      setRemotePicker("clone");
      return;
    }
    if (isRemoteHost) {
      toast.error("Select a host to browse.");
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

  const handlePickCreateParent = async () => {
    if (isSshHost || isRuntimeHost) {
      setRemotePicker("create");
      return;
    }
    if (isRemoteHost) {
      toast.error("Select a host to browse.");
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

  /** Catalog-side dedup: a create for a path already in the catalog must not
   *  surface a raw "directory exists" error (Orca "Project already added"). */
  const catalogContainsPath = (path: string, connectionId?: string | null) => {
    const normalize = (value: string) => value.replace(/\\/g, "/").replace(/\/+$/, "");
    const target = normalize(path);
    return useAppStore
      .getState()
      .repos.some(
        (repo) =>
          normalize(repo.path) === target &&
          (repo.connectionId ?? null) === (connectionId ?? null)
      );
  };

  const handleClone = async () => {
    const url = cloneUrl.trim();
    const destination = cloneDest.trim();
    if (!url || !destination) return;
    if (!isLocalHost && !isSshHost && !isRuntimeHost) {
      setCloneError("Select a host to clone onto.");
      return;
    }
    const gen = ++addGenRef.current;
    setIsCloning(true);
    setCloneError(null);
    // Only the local clone is a cancellable child process; the SSH clone is one
    // remote command with no abort surface.
    const cloneId = isLocalHost ? createCloneId() : null;
    cloneIdRef.current = cloneId;
    try {
      let path: string;
      if (isSshHost && sshTargetId) {
        path = (
          await cloneSshRepository({
            connectionId: sshTargetId,
            url,
            destination
          })
        ).path;
        if (gen !== addGenRef.current) return;
        // Why: the checkout lives on the host, so the row must carry its stamps
        // or the sidebar would treat it as a local path.
        await addRemoteCatalogRepo({
          path,
          connectionId: sshTargetId,
          executionHostId: toSshExecutionHostId(sshTargetId),
          kind: "git"
        });
      } else if (isRuntimeHost && runtimeEnvironmentId) {
        path = (
          await clonePairedServerRepository({
            environmentId: runtimeEnvironmentId,
            url,
            destination
          })
        ).path;
        if (gen !== addGenRef.current) return;
        await addPairedServerCatalogRepo({
          path,
          environmentId: runtimeEnvironmentId,
          kind: "git"
        });
      } else {
        path = await cloneRepository(url, destination, cloneId ?? createCloneId());
      }
      if (gen !== addGenRef.current) return;
      toast.success("Repository cloned");
      notifyProjectAdded(
        path,
        "project",
        isSshHost && sshTargetId
          ? {
              connectionId: sshTargetId,
              executionHostId: toSshExecutionHostId(sshTargetId),
              source: "clone_url",
            }
          : isRuntimeHost && runtimeEnvironmentId
            ? {
                executionHostId: toRuntimeExecutionHostId(runtimeEnvironmentId),
                source: "clone_url",
              }
            : undefined
      );
      handleClose();
    } catch (cloneFailure) {
      if (gen !== addGenRef.current) return;
      setCloneError(extractIpcErrorMessage(cloneFailure, String(cloneFailure)));
    } finally {
      cloneIdRef.current = null;
      if (gen === addGenRef.current) setIsCloning(false);
    }
  };

  const handleCancelClone = () => {
    const cloneId = cloneIdRef.current;
    if (!cloneId) return;
    void abortClone(cloneId)
      .then((result) => {
        // Why: the clone promise owns the error surface. Only a failed kill needs
        // its own message; a cancelled clone rejects with "Clone cancelled".
        if (!result.cancelled) {
          toast.error("Could not cancel the clone", {
            description: "The clone is still running in the background."
          });
        }
      })
      .catch((abortFailure: unknown) => {
        toast.error(extractIpcErrorMessage(abortFailure, String(abortFailure)));
      });
  };

  const handleCreate = async () => {
    const name = createName.trim();
    const parent = createParent.trim();
    if (!name || !parent) return;
    if (!isLocalHost && !isSshHost && !isRuntimeHost) {
      setCreateError("Select a host to create the project on.");
      return;
    }
    const createOwner = isSshHost && sshTargetId
      ? {
          connectionId: sshTargetId,
          executionHostId: toSshExecutionHostId(sshTargetId),
          source: "create_project" as const,
        }
      : isRuntimeHost && runtimeEnvironmentId
        ? {
            executionHostId: toRuntimeExecutionHostId(runtimeEnvironmentId),
            source: "create_project" as const,
          }
        : undefined;
    const expectedPath = joinCreateProjectPath(parent, name);
    if (catalogContainsPath(expectedPath, sshTargetId)) {
      toast.info("Project already added", { description: name });
      notifyProjectAdded(expectedPath, "project", createOwner);
      handleClose();
      return;
    }
    const gen = ++addGenRef.current;
    setIsCreating(true);
    setCreateError(null);
    try {
      let path: string;
      if (isSshHost && sshTargetId) {
        path = (
          await createSshProject({
            connectionId: sshTargetId,
            path: parent,
            name,
            initGit: true
          })
        ).path;
        if (gen !== addGenRef.current) return;
        await addRemoteCatalogRepo({
          path,
          connectionId: sshTargetId,
          executionHostId: toSshExecutionHostId(sshTargetId),
          kind: "git"
        });
      } else if (isRuntimeHost && runtimeEnvironmentId) {
        path = (
          await createPairedServerProject({
            environmentId: runtimeEnvironmentId,
            path: parent,
            name
          })
        ).path;
        if (gen !== addGenRef.current) return;
        await addPairedServerCatalogRepo({
          path,
          environmentId: runtimeEnvironmentId,
          kind: "git"
        });
      } else {
        path = await invoke<string>("create_project", {
          name,
          parentDir: parent,
          initGit: true
        });
        if (gen !== addGenRef.current) return;
      }
      toast.success("Project created");
      notifyProjectAdded(
        path,
        "project",
        createOwner
      );
      handleClose();
    } catch (createFailure) {
      if (gen !== addGenRef.current) return;
      setCreateError(extractIpcErrorMessage(createFailure, String(createFailure)));
    } finally {
      if (gen === addGenRef.current) setIsCreating(false);
    }
  };

  /** A folder chosen in the remote browser fills the field the picker was opened for. */
  const handleRemotePick = (path: string) => {
    if (remotePicker === "clone") {
      setCloneDest(path);
      setCloneError(null);
    } else if (remotePicker === "create") {
      setCreateParent(path);
      setCreateError(null);
    }
    setRemotePicker(null);
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
      notifyProjectAdded(droppedFolder, "project");
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
      notifyProjectAdded(folder, "folder");
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
      notifyProjectAdded(firstImported, "project");
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
    const enteredName = nestedGroupName.trim();
    // Why: only an edited name overrides host naming, so an untouched prefill
    // still lets the host pick the folder's basename.
    const displayName =
      enteredName && enteredName !== defaultProjectGroupNameForPath(nestedScan.selectedPath)
        ? enteredName
        : undefined;
    const attemptId = nestedAttemptIdRef.current;
    if (attemptId) {
      track(
        "add_repo_nested_import_action",
        buildNestedRepoImportActionTelemetry({
          attemptId,
          surface: "sidebar",
          runtimeKind: "local",
          action: "open_as_folder",
          foundCount: nestedScan.repos.length,
          selectedCount: nestedSelectedPaths.size
        })
      );
    }
    const gen = ++addGenRef.current;
    setIsAdding(true);
    setBusyLabel("Opening project...");
    setError(null);
    try {
      // Orca `completeNestedFolderOpen`: on a remote host the root goes through
      // the non-git confirm modal (SSH connectionId / runtime environmentId ride the
      // modal payload); locally it becomes a folder workspace directly.
      if (isSshHost && sshTargetId) {
        useAppStore.getState().openModal('confirm-non-git-folder', {
          folderPath: nestedScan.selectedPath,
          connectionId: sshTargetId,
          ...(displayName ? { displayName } : {})
        })
        if (gen === addGenRef.current) {
          setIsAdding(false)
          setBusyLabel(null)
        }
        return
      }
      if (isRuntimeHost && runtimeEnvironmentId) {
        useAppStore.getState().openModal('confirm-non-git-folder', {
          folderPath: nestedScan.selectedPath,
          runtimeEnvironmentId,
          ...(displayName ? { displayName } : {})
        })
        if (gen === addGenRef.current) {
          setIsAdding(false)
          setBusyLabel(null)
        }
        return
      }
      await addCatalogFolderWorkspace({
        parentPath: nestedScan.selectedPath,
        name: displayName ?? null
      });
      if (gen !== addGenRef.current) return;
      notifyProjectAdded(nestedScan.selectedPath, "folder");
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
        browseHostKind: selectedHostKind ?? "local"
      }),
    // Why: the handlers close over the current host/step state; rebuilding when
    // those change keeps the primary action's browse authority correct.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hostSelection.hostOptions, hostSelection.selectedParsedHost, selectedHostKind]
  );

  if (!isOpenNow) return null;

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
                  sshTargetsById={hostSelection.sshTargetsById}
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
              gitUnavailable={
                (isLocalHost && gitAvailability === "unavailable") ||
                (isSshHost && sshGitAvailability === "unavailable")
              }
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
              onCancelClone={isLocalHost ? handleCancelClone : undefined}
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
              gitAvailability={
                isLocalHost ? gitAvailability : isSshHost ? sshGitAvailability : "unknown"
              }
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
              onBrowseServer={() => {
                setRemotePicker("create");
              }}
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

        {step === "remote" ? (
          <div className="p-5 space-y-3">
            <h2 className="text-sm font-semibold tracking-tight text-neutral-100">
              Project on SSH host
            </h2>
            <p className="text-xs leading-relaxed text-neutral-400">
              {`Opening an existing path on ${hostLabel ?? "this SSH host"} needs a remote repository probe (is this path a Git checkout?), which this build does not ship. Cloning and creating on this host work; the host selector, connection probe and folder picker work.`}
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

      {remotePicker && ((isSshHost && sshTargetId) || (isRuntimeHost && runtimeEnvironmentId)) ? (
        <div
          className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/75 p-6"
          onClick={() => setRemotePicker(null)}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="flex max-h-[calc(100vh-3rem)] w-[min(900px,calc(100vw-3rem))] flex-col gap-3 overflow-auto rounded-xl border border-[#2a2b30] bg-[#141518] p-5 text-xs text-neutral-200 shadow-2xl"
          >
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-neutral-100">
                {remotePicker === "clone"
                  ? `Clone destination on ${hostLabel ?? "this host"}`
                  : `Project parent on ${hostLabel ?? "this host"}`}
              </h2>
              <p className="mt-1 text-[11px] text-neutral-400">
                Navigate to a directory and choose Select to use it.
              </p>
            </div>
            <RemoteFileBrowser
              source={
                isSshHost && sshTargetId
                  ? { kind: "ssh", targetId: sshTargetId }
                  : { kind: "runtime", runtimeEnvironmentId: runtimeEnvironmentId ?? "" }
              }
              initialPath={
                (remotePicker === "clone" ? cloneDest : createParent).trim() || "~"
              }
              onSelect={handleRemotePick}
              onCancel={() => setRemotePicker(null)}
            />
          </div>
        </div>
      ) : null}

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
