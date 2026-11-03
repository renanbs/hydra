import { describe, expect, it } from "vitest";
import {
  collectMissingFolderPaths,
  folderPathStatusCacheKey,
  getFreshFolderPathStatus,
  isLocalFolderPathStatusEnvironment,
  resolveFolderPathStatusHost,
  selectPathsToProbe,
  type FolderPathStatusEntry,
} from "./folder-path-status-cache";
import { FOLDER_WORKSPACE_PATH_STATUS_TTL_MS } from "../shared/folder-workspace-path-status";

const stale: FolderPathStatusEntry = {
  status: { path: "/gone", exists: false, reason: "missing" },
  probedAt: 1_000,
};
const healthy: FolderPathStatusEntry = {
  status: { path: "/ok", exists: true },
  probedAt: 1_000,
};

describe("folder path status cache", () => {
  it("reuses a healthy answer and re-probes a stale one only after the TTL", () => {
    expect(
      selectPathsToProbe(["/ok"], new Map([["/ok", healthy]]), 1_500)
    ).toEqual([]);
    expect(
      selectPathsToProbe(["/gone"], new Map([["/gone", stale]]), 1_000 + FOLDER_WORKSPACE_PATH_STATUS_TTL_MS - 1)
    ).toEqual([]);
    expect(
      selectPathsToProbe(["/gone"], new Map([["/gone", stale]]), 1_000 + FOLDER_WORKSPACE_PATH_STATUS_TTL_MS)
    ).toEqual(["/gone"]);
  });

  it("dedupes paths and skips blanks", () => {
    expect(selectPathsToProbe(["", "/a", "/a", "/b"], new Map(), 0)).toEqual(["/a", "/b"]);
  });

  it("collects only confirmed-stale paths", () => {
    expect(
      [...collectMissingFolderPaths(new Map([["/gone", stale], ["/ok", healthy]]))]
    ).toEqual(["/gone"]);
  });

  it("keys the same path separately on two hosts", () => {
    const local = { executionHostId: "local", epoch: "3:1:0" };
    const ssh = { executionHostId: "ssh:box", epoch: "3:1:0" };
    expect(folderPathStatusCacheKey(local, "/srv/repo")).toBe(
      folderPathStatusCacheKey({ ...local }, "/srv/repo")
    );
    expect(folderPathStatusCacheKey(local, "/srv/repo")).not.toBe(
      folderPathStatusCacheKey(ssh, "/srv/repo")
    );
    expect(folderPathStatusCacheKey(local, "/srv/repo")).not.toBe(
      folderPathStatusCacheKey(local, "/srv/other")
    );
  });

  it("keys the same host and path separately per runtime epoch", () => {
    const before = { executionHostId: "local", epoch: "3:1:0" };
    const after = { executionHostId: "local", epoch: "4:1:0" };
    expect(folderPathStatusCacheKey(before, "/srv/repo")).not.toBe(
      folderPathStatusCacheKey(after, "/srv/repo")
    );
  });

  it("reads a folder's host from its stamp, its legacy connection, or local", () => {
    expect(resolveFolderPathStatusHost({})).toBe("local");
    expect(resolveFolderPathStatusHost({ connectionId: "box" })).toBe("ssh:box");
    expect(
      resolveFolderPathStatusHost({ executionHostId: "ssh:box", connectionId: "other" })
    ).toBe("ssh:box");
    expect(isLocalFolderPathStatusEnvironment({ executionHostId: "local", epoch: 0 })).toBe(
      true
    );
    expect(isLocalFolderPathStatusEnvironment({ executionHostId: "ssh:box", epoch: 0 })).toBe(
      false
    );
  });

  it("refuses to serve an answer that aged past the TTL", () => {
    expect(getFreshFolderPathStatus(undefined, 1_000)).toBeNull();
    expect(
      getFreshFolderPathStatus(stale, 1_000 + FOLDER_WORKSPACE_PATH_STATUS_TTL_MS - 1)
    ).toEqual(stale.status);
    expect(
      getFreshFolderPathStatus(stale, 1_000 + FOLDER_WORKSPACE_PATH_STATUS_TTL_MS)
    ).toBeNull();
  });
});
