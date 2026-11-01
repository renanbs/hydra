// Always-mounted probe for folder-workspace path health (D03a-057). The FolderX
// badge must be right after reconnects and repo/runtime changes, but probing every
// render would shell out per keystroke, so answers are cached with a TTL and only
// confirmed negatives are re-probed.
//
// The cache is keyed by (host, epoch, path), not by path: a folder on an SSH target
// must never reuse this machine's answer for the same path. Only the local host has
// a probe route today, so remote folders stay unknown (no entry) rather than being
// reported as present or gone from a local shell-out.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { FolderWorkspacePathStatus } from "../shared/folder-workspace-path-status";
import {
  collectMissingFolderPaths,
  folderPathStatusCacheKey,
  getFreshFolderPathStatus,
  isLocalFolderPathStatusEnvironment,
  resolveFolderPathStatusHost,
  selectPathsToProbe,
  type FolderPathStatusEntry,
  type FolderPathStatusEnvironment,
} from "../lib/folder-path-status-cache";

export type FolderWorkspacePathStatusTarget = {
  id: string;
  folderPath: string;
  /** `ssh:<target>` / `runtime:<env>` stamp; absent means this machine. */
  executionHostId?: string | null;
  /** Legacy SSH target spelling, read when the workspace has no host stamp. */
  connectionId?: string | null;
};

type FolderPathStatusProbeTarget = {
  folderPath: string;
  cacheKey: string;
  isLocal: boolean;
};

function buildProbeTargets(
  folderWorkspaces: readonly FolderWorkspacePathStatusTarget[],
  epoch: string | number
): FolderPathStatusProbeTarget[] {
  const seen = new Set<string>();
  const targets: FolderPathStatusProbeTarget[] = [];
  for (const workspace of folderWorkspaces) {
    const folderPath = workspace.folderPath?.trim() ?? "";
    // A path can only have one owner row; the first spelling wins so a duplicate
    // cannot make the answer flip between hosts.
    if (!folderPath || seen.has(folderPath)) continue;
    seen.add(folderPath);
    const environment: FolderPathStatusEnvironment = {
      executionHostId: resolveFolderPathStatusHost(workspace),
      epoch,
    };
    targets.push({
      folderPath,
      cacheKey: folderPathStatusCacheKey(environment, folderPath),
      isLocal: isLocalFolderPathStatusEnvironment(environment),
    });
  }
  return targets;
}

export function useFolderWorkspacePathStatuses(args: {
  folderWorkspaces: readonly FolderWorkspacePathStatusTarget[];
  /** Bumps on repo/ssh/runtime changes so cached answers are revalidated. */
  epoch: string | number;
}): {
  missingFolderPaths: Set<string>;
  statusByPath: ReadonlyMap<string, FolderWorkspacePathStatus>;
  /**
   * Orca `getFreshFolderWorkspacePathStatus`: the status only while its probe is
   * inside the TTL, and never for a remote host this client cannot probe. Create
   * and activation gates read this so an expired negative does not keep blocking.
   */
  getFreshFolderWorkspacePathStatus: (folderPath: string) => FolderWorkspacePathStatus | null;
} {
  const entriesRef = useRef<Map<string, FolderPathStatusEntry>>(new Map());
  const [entries, setEntries] = useState<Map<string, FolderPathStatusEntry>>(new Map());

  // Keyed by path + owning host + epoch: callers often pass a fresh array literal
  // per render, but a host or runtime-epoch change must re-key the probe even when
  // the path stays put.
  const targetsKey = `${String(args.epoch)}\0${args.folderWorkspaces
    .map((workspace) => {
      const folderPath = workspace.folderPath?.trim() ?? "";
      return folderPath ? `${folderPath}\0${resolveFolderPathStatusHost(workspace)}` : "";
    })
    .filter(Boolean)
    .join("\0")}`;
  const targets = useMemo(
    () => buildProbeTargets(args.folderWorkspaces, args.epoch),
    [targetsKey]
  );
  const targetByPath = useMemo(
    () => new Map(targets.map((target) => [target.folderPath, target])),
    [targets]
  );
  const localPaths = useMemo(
    () => targets.filter((target) => target.isLocal).map((target) => target.folderPath),
    [targets]
  );

  useEffect(() => {
    const now = Date.now();
    // Answers from another host or epoch are unreachable by key: drop them so a
    // path that moved between hosts cannot resurrect its old local result.
    const liveKeys = new Set(targets.map((target) => target.cacheKey));
    for (const key of entriesRef.current.keys()) {
      if (!liveKeys.has(key)) entriesRef.current.delete(key);
    }
    const currentEntries = new Map<string, FolderPathStatusEntry>();
    for (const target of targets) {
      const entry = entriesRef.current.get(target.cacheKey);
      if (entry) currentEntries.set(target.folderPath, entry);
    }
    // Remote hosts have no probe route; leaving them out keeps their status unknown.
    const toProbe = selectPathsToProbe(localPaths, currentEntries, now);
    if (toProbe.length === 0) {
      setEntries(new Map(entriesRef.current));
      return;
    }
    const probeTargetByPath = new Map(
      localPaths.flatMap((path) => {
        const target = targetByPath.get(path);
        return target ? [[path, target] as const] : [];
      })
    );
    let cancelled = false;
    void Promise.all(
      toProbe.map((path) =>
        invoke<FolderWorkspacePathStatus>("folder_path_status", { path })
          .then((status) => ({ path, status }))
          .catch(() => null)
      )
    ).then((results) => {
      if (cancelled) return;
      for (const result of results) {
        if (!result) continue;
        const target = probeTargetByPath.get(result.path);
        if (!target) continue;
        entriesRef.current.set(target.cacheKey, {
          status: result.status,
          probedAt: Date.now(),
        });
      }
      setEntries(new Map(entriesRef.current));
    });
    return () => {
      cancelled = true;
    };
  }, [targets, localPaths, targetByPath]);

  const missingFolderPaths = useMemo(() => {
    const currentEntries = new Map<string, FolderPathStatusEntry>();
    for (const target of targets) {
      const entry = entries.get(target.cacheKey);
      if (entry) currentEntries.set(target.folderPath, entry);
    }
    return collectMissingFolderPaths(currentEntries);
  }, [entries, targets]);

  const statusByPath = useMemo(() => {
    const map = new Map<string, FolderWorkspacePathStatus>();
    for (const target of targets) {
      const entry = entries.get(target.cacheKey);
      if (entry) map.set(target.folderPath, entry.status);
    }
    return map;
  }, [entries, targets]);

  const getFreshFolderWorkspacePathStatus = useCallback(
    (folderPath: string): FolderWorkspacePathStatus | null => {
      const target = targetByPath.get(folderPath.trim());
      // Never assert a local answer for a remote folder: unknown stays unknown
      // until a host-routed probe exists.
      if (!target?.isLocal) return null;
      return getFreshFolderPathStatus(entriesRef.current.get(target.cacheKey), Date.now());
    },
    [targetByPath]
  );

  return { missingFolderPaths, statusByPath, getFreshFolderWorkspacePathStatus };
}
