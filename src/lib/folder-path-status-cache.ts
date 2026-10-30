// Cache policy for folder-workspace path probes. A confirmed negative stays valid
// for the TTL; a positive is cheap to reuse. The probe itself lives in the hook so
// this module stays pure and testable.
import {
  FOLDER_WORKSPACE_PATH_STATUS_TTL_MS,
  isConfirmedStaleFolderPathStatus,
  type FolderWorkspacePathStatus,
} from "../shared/folder-workspace-path-status";

export type FolderPathStatusEntry = {
  status: FolderWorkspacePathStatus;
  probedAt: number;
};

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
