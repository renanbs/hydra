import { describe, expect, it } from "vitest";
import {
  getFolderWorkspaceRevealGroupKeys,
  getKnownSidebarWorktreeById,
  getPinnedWorktreeRevealCollapsedGroupKeys,
  getRevealCandidateWorktrees,
  getRevealMountedOptionIds,
  sidebarWorkspaceStillExists,
} from "./sidebar-reveal-lookups";
import { getWorktreeHostIdentity } from "../../shared/worktree/host-qualified-identity";
import { getWorktreeOptionId } from "./worktree-list/viewport/option-id";

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

  it("narrows reveal candidates to the requested host and drops archived rows", () => {
    const archived = { ...(worktree as object), id: "wt-archived", isArchived: true } as never;
    const remote = { ...(worktree as object), id: "wt-remote", hostId: "ssh-1" } as never;
    const hostless = { ...(worktree as object), id: "wt-hostless", hostId: undefined } as never;

    expect(
      getRevealCandidateWorktrees([worktree as never, archived, remote, hostless])
    ).toEqual([worktree, remote, hostless]);
    expect(
      getRevealCandidateWorktrees([worktree as never, archived, remote, hostless], "ssh-1")
    ).toEqual([remote, hostless]);
  });

  it("derives the mounted option ids for every section a row can paint under", () => {
    const identity = getWorktreeHostIdentity(worktree);
    expect(
      getRevealMountedOptionIds({
        sectionKeys: ["repo:repo-1", "pinned"],
        worktree,
      })
    ).toEqual([
      getWorktreeOptionId(`repo:repo-1:${identity}`),
      getWorktreeOptionId(`pinned:${identity}`),
    ]);

    const folderId = getWorktreeOptionId("folder-workspace:fw-1");
    expect(
      getRevealMountedOptionIds({
        sectionKeys: [],
        folderWorkspace: folder,
      })
    ).toEqual([folderId]);
  });
});
