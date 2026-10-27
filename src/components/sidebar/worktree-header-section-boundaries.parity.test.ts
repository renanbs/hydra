import { describe, expect, it } from "vitest";
import { buildRows } from "./worktree-list/grouping/build-rows";
import { computeHeaderSectionBounds } from "./worktree-header-section-boundaries";
import { estimateRenderRowSize } from "./worktree-list/viewport/virtual-rows";
import { toWorktreeRow } from "../../shared/worktree/worktree-row";
import type { Repo } from "../../shared/repo-types";

function repo(id: string): Repo {
  return {
    id,
    path: `/repo/${id}`,
    displayName: id,
    badgeColor: "#64748b",
    addedAt: 0,
    projectGroupId: null,
  } as Repo;
}

function worktree(repoId: string, path: string): ReturnType<typeof toWorktreeRow> {
  return toWorktreeRow(
    { path, head_commit: "abc1234", branch: path.split("/").pop()!, is_bare: false, is_main: false },
    { repoId, hostId: "local" }
  );
}

describe("header section bounds (Orca parity)", () => {
  it("ends a repo section at the next repo header", () => {
    const repoA = repo("repo_a");
    const repoB = repo("repo_b");
    const rows = buildRows(
      "repo",
      [worktree("repo_a", "/repo/a/w0"), worktree("repo_b", "/repo/b/w0")],
      new Map([
        [repoA.id, repoA],
        [repoB.id, repoB],
      ]),
      null,
      new Set(),
      undefined,
      undefined,
      "manual",
      {},
      new Map([
        ["/repo/a/w0", worktree("repo_a", "/repo/a/w0")],
        ["/repo/b/w0", worktree("repo_b", "/repo/b/w0")],
      ]),
      true
    );
    const firstHeaderIndex = rows.findIndex((row) => row.type === "header");

    const bounds = computeHeaderSectionBounds({ rows, firstHeaderIndex });
    const secondHeaderIndex = rows.findIndex(
      (row, index) => index > firstHeaderIndex && row.type === "header"
    );
    let expectedEnd = 0;
    for (let index = 0; index < secondHeaderIndex; index++) {
      expectedEnd += estimateRenderRowSize(rows, index, firstHeaderIndex);
    }

    expect(bounds.repoSectionEndByRepoId.get("repo_a")).toBe(expectedEnd);
    expect(bounds.repoSectionEndByRepoId.get("repo_b")).toBeGreaterThan(expectedEnd);
  });

  it("keys group boundaries by group id when group headers are painted", () => {
    const repoA = repo("repo_a");
    const rows = buildRows(
      "repo",
      [worktree("repo_a", "/repo/a/w0")],
      new Map([[repoA.id, { ...repoA, projectGroupId: "group_1" }]]),
      null,
      new Set(),
      undefined,
      undefined,
      "manual",
      {},
      new Map([["/repo/a/w0", worktree("repo_a", "/repo/a/w0")]]),
      true,
      undefined,
      [{ id: "group_1", name: "Group", tabOrder: 0, parentPath: null }]
    );
    const firstHeaderIndex = rows.findIndex((row) => row.type === "header");
    const bounds = computeHeaderSectionBounds({ rows, firstHeaderIndex });

    expect(bounds.projectGroupSectionEndByGroupId.get("group_1")).toBeGreaterThan(0);
  });
});
