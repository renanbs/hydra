import { describe, expect, it } from "vitest";
import {
  collectMissingFolderPaths,
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
});
