// D03a-079/D03a-080: the worktree item row's geometry projection (grouped row,
// lineage child, folder-backed repo child).
import { describe, expect, it } from "vitest";
import { getWorktreeItemRowGeometry } from "./item-row-geometry";
import {
  getFolderBackedRepoWorktreeCardContentIndent,
  getFolderBackedRepoWorktreeCardSurfaceInset,
  getLineageNestedRowGeometry,
  getWorktreeCardContentIndent,
  getWorktreeCardSurfaceInset,
  LINEAGE_CHILDREN_INLINE_OFFSET,
} from "./indentation";

describe("getWorktreeItemRowGeometry (D03a-079)", () => {
  it("matches the plain grouped row geometry", () => {
    const geometry = getWorktreeItemRowGeometry({
      row: { depth: 0, groupDepth: 2 },
      groupBy: "repo",
      experimentalNewWorktreeCardStyle: false,
      isFolderBackedRepoChild: false,
    });
    const surfaceInset = getWorktreeCardSurfaceInset({ isGrouped: true, groupDepth: 2 });
    expect(geometry.surfaceInset).toBe(surfaceInset);
    expect(geometry.cardContentIndent).toBe(
      Math.max(
        0,
        getWorktreeCardContentIndent({ isGrouped: true, groupDepth: 2, lineageDepth: 0 }) -
          surfaceInset
      )
    );
  });

  it("flattens depth for a flat (ungrouped) list", () => {
    const geometry = getWorktreeItemRowGeometry({
      row: { depth: 0, groupDepth: 0 },
      groupBy: "none",
      experimentalNewWorktreeCardStyle: false,
      isFolderBackedRepoChild: false,
    });
    expect(geometry.surfaceInset).toBe(0);
    expect(geometry.cardContentIndent).toBe(0);
  });

  it("seats a folder-backed repo child on its compact header anchor", () => {
    const geometry = getWorktreeItemRowGeometry({
      row: { depth: 0, groupDepth: 1 },
      groupBy: "repo",
      experimentalNewWorktreeCardStyle: false,
      isFolderBackedRepoChild: true,
    });
    expect(geometry.surfaceInset).toBe(
      getFolderBackedRepoWorktreeCardSurfaceInset({ groupDepth: 1, lineageDepth: 0 })
    );
    expect(geometry.cardContentIndent).toBe(
      Math.max(
        0,
        getFolderBackedRepoWorktreeCardContentIndent({ groupDepth: 1, lineageDepth: 0 }) -
          geometry.surfaceInset
      )
    );
  });

  it("inherits the parent surface for a legacy lineage child", () => {
    const geometry = getWorktreeItemRowGeometry({
      row: { depth: 1, groupDepth: 1 },
      groupBy: "repo",
      experimentalNewWorktreeCardStyle: false,
      isFolderBackedRepoChild: false,
    });
    const nested = getLineageNestedRowGeometry({
      experimentalNewWorktreeCardStyle: false,
      inheritedCardContentIndent: getWorktreeCardContentIndent({
        isGrouped: true,
        groupDepth: 1,
        lineageDepth: 0,
      }),
      lineageDepth: 1,
    });
    expect(geometry.surfaceInset).toBe(nested.surfaceInset);
    expect(geometry.cardContentIndent).toBe(nested.cardContentIndent);
    expect(geometry.lineageChildrenInlineOffset).toBe(LINEAGE_CHILDREN_INLINE_OFFSET);
  });

  it("uses the new-card-style inline offset without double-counting lineage depth", () => {
    const geometry = getWorktreeItemRowGeometry({
      row: { depth: 2, groupDepth: 1 },
      groupBy: "repo",
      experimentalNewWorktreeCardStyle: true,
      isFolderBackedRepoChild: false,
    });
    expect(geometry.surfaceInset).toBe(0);
    expect(geometry.cardContentIndent).toBe(0);
    expect(geometry.lineageChildrenInlineOffset).toBe(LINEAGE_CHILDREN_INLINE_OFFSET);
  });
});
