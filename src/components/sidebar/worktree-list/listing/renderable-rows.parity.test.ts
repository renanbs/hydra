// D03a-080: the painted row model folds each visible lineage subtree into one render row
// so the parent card can paint its descendants inline instead of as sibling virtual rows.
import { describe, expect, it } from "vitest";
import { toWorktreeRow } from "../../../../shared/worktree/worktree-row";
import type { HostSectionRow } from "../../host-section-rows";
import type { WorktreeRow } from "../grouping/row-types";
import { buildRenderableRows } from "./renderable-rows";
import { getRenderRowKey, getRenderRowItemRows } from "./render-row";

function itemRow(args: {
  path: string;
  depth: number;
  lineageChildCount?: number;
  lineageCollapsed?: boolean;
  isLastLineageChild?: boolean;
}): WorktreeRow {
  const worktree = toWorktreeRow(
    {
      path: args.path,
      head_commit: "abc1234",
      branch: args.path.split("/").pop() as string,
      is_bare: false,
    },
    { repoId: "repo_a" }
  );
  return {
    type: "item",
    rowKey: `all:${worktree.id}`,
    sectionKey: "all",
    worktree,
    repo: undefined,
    depth: args.depth,
    groupDepth: 0,
    lineageTrail: [],
    isLastLineageChild: args.isLastLineageChild ?? true,
    lineageChildCount: args.lineageChildCount ?? 0,
    ...(args.lineageChildCount
      ? { lineageGroupKey: `lineage:${worktree.id}`, lineageCollapsed: args.lineageCollapsed }
      : {}),
  };
}

function headerRow(): HostSectionRow {
  return {
    type: "header",
    key: "all",
    label: "All",
    count: 0,
    tone: "text-foreground",
  };
}

describe("buildRenderableRows (D03a-080)", () => {
  it("folds a parent and its descendants into one render row", () => {
    const parent = itemRow({ path: "/repo/a/parent", depth: 0, lineageChildCount: 1 });
    const child = itemRow({ path: "/repo/a/child", depth: 1 });
    const grandchild = itemRow({ path: "/repo/a/grandchild", depth: 2 });

    const renderRows = buildRenderableRows([headerRow(), parent, child, grandchild]);

    expect(renderRows).toHaveLength(2);
    expect(renderRows[1]).toMatchObject({
      type: "lineage-group",
      key: "all:lineage:repo_a::/repo/a/parent",
      rows: [parent, child, grandchild],
    });
    expect(getRenderRowKey(renderRows[1]!)).toBe(
      "lineage-group:all:lineage:repo_a::/repo/a/parent"
    );
    expect(getRenderRowItemRows(renderRows[1]!).map((row) => row.rowKey)).toEqual([
      parent.rowKey,
      child.rowKey,
      grandchild.rowKey,
    ]);
  });

  it("does not fold a collapsed parent's subtree", () => {
    const parent = itemRow({
      path: "/repo/a/parent",
      depth: 0,
      lineageChildCount: 1,
      lineageCollapsed: true,
    });

    const renderRows = buildRenderableRows([headerRow(), parent]);

    expect(renderRows[1]).toBe(parent);
    expect(renderRows.some((row) => row.type === "lineage-group")).toBe(false);
  });

  it("does not fold a parent whose next row is not a deeper item", () => {
    const parent = itemRow({ path: "/repo/a/parent", depth: 0, lineageChildCount: 1 });
    const sibling = itemRow({ path: "/repo/a/sibling", depth: 0 });

    const renderRows = buildRenderableRows([parent, sibling]);

    expect(renderRows).toEqual([parent, sibling]);
    expect(renderRows.some((row) => row.type === "lineage-group")).toBe(false);
  });

  it("stops the group at the next row that leaves the subtree", () => {
    const parent = itemRow({ path: "/repo/a/parent", depth: 0, lineageChildCount: 1 });
    const child = itemRow({ path: "/repo/a/child", depth: 1 });
    const finished = itemRow({ path: "/repo/a/finished", depth: 0 });

    const renderRows = buildRenderableRows([parent, child, finished]);

    expect(renderRows).toHaveLength(2);
    expect(renderRows[0]).toMatchObject({ type: "lineage-group", rows: [parent, child] });
    expect(renderRows[1]).toBe(finished);
  });
});
