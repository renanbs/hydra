import { describe, expect, it } from "vitest";
import { buildRows } from "./build-rows";
import { toWorktreeRow } from "../../../../shared/worktree/worktree-row";
import type { Repo } from "../../../../shared/repo-types";
import type { WorktreeLineage } from "../../../../shared/worktree/lineage-types";
import type { Worktree } from "../../../../shared/worktree/types";
import type { WorktreeRow } from "./row-types";

const REPO_ID = "repo_a";

function repo(): Repo {
  return {
    id: REPO_ID,
    path: "/repo/a",
    displayName: "a",
    badgeColor: "#64748b",
    addedAt: 0,
    projectGroupId: null,
  } as Repo;
}

function worktree(path: string, branch: string): Worktree {
  return toWorktreeRow(
    {
      path,
      head_commit: "abc1234",
      branch,
      is_bare: false,
      is_main: false,
    },
    { repoId: REPO_ID, hostId: "local" }
  );
}

function lineage(child: Worktree, parent: Worktree): WorktreeLineage {
  return {
    worktreeId: child.id,
    worktreeInstanceId: child.instanceId as string,
    parentWorktreeId: parent.id,
    parentWorktreeInstanceId: parent.instanceId as string,
    origin: "manual",
    capture: { source: "manual-action", confidence: "explicit" },
    createdAt: 0,
  };
}

describe("lineage nesting in the painted row pipeline (Orca parity)", () => {
  it("emits the child under its parent with one lineage step", () => {
    const parent = worktree("/repo/a/parent", "feat/parent");
    const child = worktree("/repo/a/child", "feat/child");
    const repoMap = new Map([[REPO_ID, repo()]]);
    const lineageById = { [child.id]: lineage(child, parent) };

    const rows = buildRows(
      "repo",
      [parent, child],
      repoMap,
      null,
      new Set(),
      undefined,
      undefined,
      "manual",
      lineageById,
      new Map([
        [parent.id, parent],
        [child.id, child],
      ]),
      true
    );

    const items = rows.filter((row): row is WorktreeRow => row.type === "item");
    const parentRow = items.find((row) => row.worktree.id === parent.id);
    const childRow = items.find((row) => row.worktree.id === child.id);
    expect(parentRow?.lineageChildCount).toBe(1);
    expect(childRow?.depth).toBe(1);
  });

  it("keeps the child at the top level when lineage is not projected", () => {
    const parent = worktree("/repo/a/parent", "feat/parent");
    const child = worktree("/repo/a/child", "feat/child");
    const repoMap = new Map([[REPO_ID, repo()]]);

    const rows = buildRows(
      "repo",
      [parent, child],
      repoMap,
      null,
      new Set(),
      undefined,
      undefined,
      "manual",
      {},
      new Map([
        [parent.id, parent],
        [child.id, child],
      ]),
      true
    );

    const childRow = rows
      .filter((row): row is WorktreeRow => row.type === "item")
      .find((row) => row.worktree.id === child.id);
    expect(childRow?.depth).toBe(0);
  });
});
