// Always-mounted probe for folder-workspace path health (D03a-057). The FolderX
// badge must be right after reconnects and repo/runtime changes, but probing every
// render would shell out per keystroke, so answers are cached with a TTL and only
// confirmed negatives are re-probed.
import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { FolderWorkspacePathStatus } from "../shared/folder-workspace-path-status";
import {
  collectMissingFolderPaths,
  selectPathsToProbe,
  type FolderPathStatusEntry,
} from "../lib/folder-path-status-cache";

export function useFolderWorkspacePathStatuses(args: {
  folderWorkspaces: readonly { id: string; folderPath: string }[];
  /** Bumps on repo/ssh/runtime changes so cached answers are revalidated. */
  epoch: string | number;
}): {
  missingFolderPaths: Set<string>;
  statusByPath: ReadonlyMap<string, FolderWorkspacePathStatus>;
} {
  const entriesRef = useRef<Map<string, FolderPathStatusEntry>>(new Map());
  const [entries, setEntries] = useState<Map<string, FolderPathStatusEntry>>(new Map());

  // Keyed by the paths themselves: callers often pass a fresh array literal per
  // render, and depending on that identity would re-probe in a loop.
  const pathsKey = args.folderWorkspaces
    .map((workspace) => workspace.folderPath?.trim() ?? "")
    .filter(Boolean)
    .join("\0");
  const paths = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const path of pathsKey.split("\0")) {
      if (!path || seen.has(path)) continue;
      seen.add(path);
      out.push(path);
    }
    return out;
  }, [pathsKey]);

  useEffect(() => {
    const now = Date.now();
    // An epoch change invalidates cached negatives so a reconnect re-probes them.
    if (args.epoch) {
      for (const [path, entry] of entriesRef.current) {
        if (entry.status.exists === false) {
          entriesRef.current.set(path, { ...entry, probedAt: 0 });
        }
      }
    }
    const toProbe = selectPathsToProbe(paths, entriesRef.current, now);
    if (toProbe.length === 0) {
      setEntries(new Map(entriesRef.current));
      return;
    }
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
        entriesRef.current.set(result.path, {
          status: result.status,
          probedAt: Date.now(),
        });
      }
      setEntries(new Map(entriesRef.current));
    });
    return () => {
      cancelled = true;
    };
  }, [args.epoch, paths]);

  const missingFolderPaths = useMemo(() => collectMissingFolderPaths(entries), [entries]);
  const statusByPath = useMemo(() => {
    const map = new Map<string, FolderWorkspacePathStatus>();
    for (const [path, entry] of entries) map.set(path, entry.status);
    return map;
  }, [entries]);
  return { missingFolderPaths, statusByPath };
}
