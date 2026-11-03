// Cache policy for folder-workspace path probes. A confirmed negative stays valid
// for the TTL; a positive is cheap to reuse. The probe itself lives in the hook so
// this module stays pure and testable.
import {
  FOLDER_WORKSPACE_PATH_STATUS_TTL_MS,
  isConfirmedStaleFolderPathStatus,
  type FolderWorkspacePathStatus,
} from "../shared/folder-workspace-path-status";
import { getRepoExecutionHostId, LOCAL_EXECUTION_HOST_ID } from "../shared/execution-host";

export type FolderPathStatusEntry = {
  status: FolderWorkspacePathStatus;
  probedAt: number;
};

/**
 * Identity of the machine a probe answers for (D03a-057). A local answer must
 * never stand in for a folder on another machine, so this — not the path alone —
 * is what keys the TTL cache.
 */
export type FolderPathStatusEnvironment = {
  /** `local`, `ssh:<target>` or `runtime:<env>`. */
  executionHostId: string;
  /** Repo/SSH/runtime generation: a bump restarts the answer's validity window. */
  epoch: string | number;
};

/**
 * Host that holds a folder workspace's files. The workspace's own stamp wins; a
 * row carrying only the legacy `connectionId` is still remote. No stamp means
 * local, because nothing else on the row names another machine.
 */
export function resolveFolderPathStatusHost(workspace: {
  executionHostId?: string | null;
  connectionId?: string | null;
}): string {
  return getRepoExecutionHostId(workspace);
}

/** Only this host can answer a `folder_path_status` probe today. */
export function isLocalFolderPathStatusEnvironment(
  environment: FolderPathStatusEnvironment
): boolean {
  return environment.executionHostId === LOCAL_EXECUTION_HOST_ID;
}

/** Cache key for one path on one environment: the isolation that stops a remote
 * repo from reusing a local result for the same path. */
export function folderPathStatusCacheKey(
  environment: FolderPathStatusEnvironment,
  path: string
): string {
  return `${environment.executionHostId}\0${String(environment.epoch)}\0${path.trim()}`;
}

/**
 * Orca `getFreshFolderWorkspacePathStatus`: the cached answer only while its
 * probe is inside the TTL. A create/activation gate must not act on an expired
 * negative the cache is about to re-probe.
 */
export function getFreshFolderPathStatus(
  entry: FolderPathStatusEntry | undefined,
  now: number,
  ttlMs = FOLDER_WORKSPACE_PATH_STATUS_TTL_MS
): FolderWorkspacePathStatus | null {
  if (!entry) return null;
  return now - entry.probedAt < ttlMs ? entry.status : null;
}

export function shouldProbeFolderPath(
  entry: FolderPathStatusEntry | undefined,
  now: number,
  ttlMs = FOLDER_WORKSPACE_PATH_STATUS_TTL_MS
): boolean {
  if (!entry) return true;
  // A confirmed-stale answer may have been transient (external mount, reconnect);
  // re-probe after the TTL. Healthy paths stay cached until the caller drops them.
  if (!isConfirmedStaleFolderPathStatus(entry.status)) return false;
  return now - entry.probedAt >= ttlMs;
}

export function collectMissingFolderPaths(
  entries: ReadonlyMap<string, FolderPathStatusEntry>
): Set<string> {
  const missing = new Set<string>();
  for (const [path, entry] of entries) {
    if (isConfirmedStaleFolderPathStatus(entry.status)) missing.add(path);
  }
  return missing;
}

/** Paths to (re)probe right now, deduplicated and stable-ordered. */
export function selectPathsToProbe(
  paths: readonly string[],
  entries: ReadonlyMap<string, FolderPathStatusEntry>,
  now: number
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const path of paths) {
    if (!path || seen.has(path)) continue;
    seen.add(path);
    if (shouldProbeFolderPath(entries.get(path), now)) out.push(path);
  }
  return out;
}
