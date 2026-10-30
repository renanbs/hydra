import { describe, expect, it } from "vitest";
import {
  getFolderWorkspaceRevealGroupKeys,
  getKnownSidebarWorktreeById,
  getPinnedWorktreeRevealCollapsedGroupKeys,
  sidebarWorkspaceStillExists,
} from "./sidebar-reveal-lookups";
import { getWorktreeHostIdentity } from "../../shared/worktree/host-qualified-identity";

const worktree = {
  id: "wt-1",
  repoId: "repo-1",
  path: "/repo/wt-1",
  branch: "feat/x",
  hostId: "local",
} as never;

const folder = { id: "fw-1", projectGroupId: "grp-child" } as never;

describe("sidebar reveal lookups", () => {
  it("resolves a worktree by map id, host-qualified identity, then folder key", () => {
    const map = new Map([["wt-1", worktree as never]]);
    expect(getKnownSidebarWorktreeById("wt-1", map, [], [])).toEqual({
      kind: "worktree",
      worktree,
    });
    const identity = getWorktreeHostIdentity(worktree);
    expect(
      getKnownSidebarWorktreeById(identity, new Map(), [], [worktree])
    ).toEqual({ kind: "worktree", worktree });
    expect(getKnownSidebarWorktreeById("folder:fw-1", new Map(), [folder], [])).toEqual({
      kind: "folder-workspace",
      folderWorkspace: folder,
    });
    expect(getKnownSidebarWorktreeById("nope", new Map(), [], [])).toBeNull();
  });

  it("knows whether the revealed target still exists", () => {
    expect(
      sidebarWorkspaceStillExists({ kind: "worktree", worktree }, [worktree], [])
    ).toBe(true);
    expect(
      sidebarWorkspaceStillExists(
        { kind: "worktree", worktree },
        [{ ...worktree, id: "wt-2", path: "/repo/other" } as never],
        []
      )
    ).toBe(false);
    expect(
      sidebarWorkspaceStillExists(
        { kind: "folder-workspace", folderWorkspace: folder },
        [],
        [folder]
      )
    ).toBe(true);
  });

  it("walks the project-group ancestry innermost-last", () => {
    const groups = [
      { id: "grp-root", parentGroupId: null },
      { id: "grp-child", parentGroupId: "grp-root" },
    ] as never[];
    expect(getFolderWorkspaceRevealGroupKeys(folder, groups)).toEqual([
      "project-group:grp-root",
      "project-group:grp-child",
    ]);
  });

  it("names the Pinned section as a collapsed key to expand", () => {
    expect(getPinnedWorktreeRevealCollapsedGroupKeys()).toEqual(["pinned"]);
  });
});
