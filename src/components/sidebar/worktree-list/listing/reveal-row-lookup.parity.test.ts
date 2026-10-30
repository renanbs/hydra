import { describe, expect, it } from "vitest";
import {
  findPreferredRenderRowIndexForWorktree,
  findRevealRowIndex,
  renderRowContainsWorktree,
  rowKeyMatchesRenderRow,
} from "./reveal-row-lookup";

const worktree = { id: "wt-1", hostId: "local", path: "/repo/wt-1" };
const other = { id: "wt-2", hostId: "local", path: "/repo/wt-2" };

const itemRow = { type: "item", rowKey: "wt:wt-1", worktree } as never;
const pinnedItemRow = {
  type: "item",
  rowKey: "pinned:wt-1",
  sectionKey: "pinned",
  worktree,
} as never;
const headerRow = {
  type: "header",
  key: "repo:repo-1",
  worktreeIds: [worktree.id, other.id],
} as never;
const folderRow = {
  type: "folder-workspace",
  key: "folder-workspace:fw-1",
  folderWorkspace: { id: "fw-1", folderPath: "/repo/folder" },
} as never;
const lineageGroupRow = {
  type: "lineage-group",
  key: "all:lineage:wt-1",
  rows: [itemRow, pinnedItemRow],
} as never;

describe("reveal row lookup", () => {
  it("matches rows by key", () => {
    expect(rowKeyMatchesRenderRow(itemRow, "wt:wt-1")).toBe(true);
    expect(rowKeyMatchesRenderRow(itemRow, "repo:repo-1")).toBe(false);
  });

  it("detects containment for items and headers", () => {
    expect(renderRowContainsWorktree(itemRow, worktree)).toBe(true);
    expect(renderRowContainsWorktree(itemRow, other)).toBe(false);
    expect(renderRowContainsWorktree(headerRow, other)).toBe(true);
  });

  it("prefers the item row over the header that contains it", () => {
    expect(
      findPreferredRenderRowIndexForWorktree([headerRow, itemRow], worktree)
    ).toBe(1);
  });

  it("falls back to the containing header when the item is not painted", () => {
    expect(findPreferredRenderRowIndexForWorktree([headerRow], worktree)).toBe(0);
    expect(findPreferredRenderRowIndexForWorktree([headerRow], { ...other, id: "gone" })).toBe(-1);
  });

  it("prefers the natural section over the Pinned duplicate", () => {
    expect(
      findPreferredRenderRowIndexForWorktree(
        [pinnedItemRow, headerRow, itemRow],
        worktree
      )
    ).toBe(2);
  });

  it("resolves a path reveal through the preferred row", () => {
    expect(findRevealRowIndex([pinnedItemRow, headerRow, itemRow], "/repo/wt-1")).toBe(2);
    expect(findRevealRowIndex([headerRow, folderRow], "/repo/folder")).toBe(1);
    expect(findRevealRowIndex([headerRow], "/repo/missing")).toBe(-1);
  });

  it("resolves the lineage group when a reveal names a folded child", () => {
    const group = {
      type: "lineage-group",
      key: "all:lineage:repo_a::/repo/parent",
      rows: [
        {
          type: "item",
          rowKey: "all:repo_a::/repo/parent",
          sectionKey: "all",
          worktree: { id: "parent", hostId: undefined, path: "/repo/parent" },
        },
        {
          type: "item",
          rowKey: "all:repo_a::/repo/child",
          sectionKey: "all",
          worktree: { id: "child", hostId: undefined, path: "/repo/child" },
        },
      ],
    } as never;

    // The child owns no virtual slot of its own; the group's slot is the scroll target.
    expect(findRevealRowIndex([headerRow, group], "/repo/child")).toBe(1);
    expect(findPreferredRenderRowIndexForWorktree([headerRow, group], {
      id: "child",
      hostId: undefined,
      path: "/repo/child",
    })).toBe(1);
  });

  it("matches a folded child's row key", () => {
    expect(rowKeyMatchesRenderRow(lineageGroupRow, "wt:wt-1")).toBe(true);
    expect(rowKeyMatchesRenderRow(lineageGroupRow, "wt:missing")).toBe(false);
  });
});
