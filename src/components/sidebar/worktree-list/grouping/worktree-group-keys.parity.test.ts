// Parity guard for D03a-040: reveal/expand group keys.
//
// Orca walks a worktree's Project Group ancestry (outermost first) and adds the
// Pinned section when the target lives there, so a reveal opens every header
// that hides the row. These tests pin the pure contract the reveal path calls;
// they do not paint the sidebar.
import { describe, expect, it } from "vitest";
import type { ProjectGroup } from "../../../../shared/project-group-types";
import type { Repo } from "../../../../shared/repo-types";
import { toWorktreeRow } from "../../../../shared/worktree/worktree-row";
import { getWorkspaceStatusGroupKey } from "../../workspace-status";
import { cloneDefaultWorkspaceStatuses } from "../../../../shared/workspace-statuses";
import { getWorkspaceStatus } from "../../workspace-status";
import { getGroupKeysForWorktree, getRevealGroupKeysToExpand } from "./worktree-group-keys";

const REPO_ID = "repo_a";

function repo(overrides: Partial<Repo> = {}): Repo {
  return {
    id: REPO_ID,
    path: "/repo/a",
    displayName: "a",
    badgeColor: "#64748b",
    addedAt: 0,
    projectGroupId: null,
    ...overrides,
  } as Repo;
}

function worktree(options: { path?: string; branch?: string } = {}) {
  return toWorktreeRow(
    {
      path: options.path ?? "/repo/a/wt",
      head_commit: "abc1234",
      branch: options.branch ?? "feat/a",
      is_bare: false,
      is_main: false,
    },
    { repoId: REPO_ID, hostId: "local" }
  );
}

function group(
  id: string,
  parentGroupId: string | null,
  tabOrder = 0
): ProjectGroup {
  return {
    id,
    name: id,
    parentPath: null,
    parentGroupId,
    createdFrom: "manual",
    tabOrder,
    isCollapsed: false,
    color: null,
    createdAt: 0,
    updatedAt: 0,
  };
}

describe("getGroupKeysForWorktree (Orca parity)", () => {
  it("returns the single section key for non-repo grouping", () => {
    expect(getGroupKeysForWorktree("none", worktree(), new Map(), null)).toEqual(["all"]);

    const statusWorktree = worktree();
    expect(
      getGroupKeysForWorktree("workspace-status", statusWorktree, new Map(), null)
    ).toEqual([
      getWorkspaceStatusGroupKey(
        getWorkspaceStatus(statusWorktree, cloneDefaultWorkspaceStatuses())
      ),
    ]);

    const [prKey] = getGroupKeysForWorktree("pr-status", worktree(), new Map(), null);
    expect(prKey?.startsWith("pr:")).toBe(true);
  });

  it("walks Project Group ancestry outermost-first, then the repo header", () => {
    const repoMap = new Map([[REPO_ID, repo({ projectGroupId: "inner" })]]);
    const groups = [group("outer", null), group("inner", "outer")];

    expect(
      getGroupKeysForWorktree("repo", worktree(), repoMap, null, undefined, undefined, groups)
    ).toEqual(["project-group:outer", "project-group:inner", `repo:${REPO_ID}`]);
  });

  it("falls back to the repo header when the group metadata has not arrived", () => {
    const repoMap = new Map([[REPO_ID, repo({ projectGroupId: "late" })]]);
    expect(getGroupKeysForWorktree("repo", worktree(), repoMap, null)).toEqual([
      `repo:${REPO_ID}`,
    ]);
  });

  it("adds the Pinned header for a worktree painted in the Pinned section", () => {
    expect(
      getGroupKeysForWorktree(
        "none",
        worktree(),
        new Map(),
        null,
        undefined,
        undefined,
        [],
        undefined,
        true
      )
    ).toEqual(["pinned", "all"]);
  });

  it("does not duplicate the Pinned key when it is already present", () => {
    const keys = getGroupKeysForWorktree(
      "repo",
      worktree(),
      new Map([[REPO_ID, repo()]]),
      null,
      undefined,
      undefined,
      [],
      undefined,
      true
    );
    expect(keys.filter((key) => key === "pinned")).toHaveLength(1);
  });
});

describe("getRevealGroupKeysToExpand (Orca parity)", () => {
  it("returns only the group headers still collapsed on the way to the target", () => {
    const repoMap = new Map([[REPO_ID, repo({ projectGroupId: "inner" })]]);
    const groups = [group("outer", null), group("inner", "outer")];

    expect(
      getRevealGroupKeysToExpand({
        groupBy: "repo",
        worktree: worktree(),
        repoMap,
        prCache: null,
        collapsedGroups: new Set(["project-group:inner", "unrelated"]),
        projectGroups: groups,
      })
    ).toEqual(["project-group:inner"]);
  });

  it("opens the Pinned header when the revealed workspace lives there", () => {
    expect(
      getRevealGroupKeysToExpand({
        groupBy: "none",
        worktree: worktree(),
        repoMap: new Map(),
        prCache: null,
        collapsedGroups: new Set(["pinned", "all"]),
        isPinnedSectionWorktree: true,
      })
    ).toEqual(["pinned", "all"]);
  });
});
