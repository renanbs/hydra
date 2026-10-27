// Drop preview geometry and the within-group reorder a release commits: the
// insertion slot, the offsets the other rows animate to, and the resulting order the
// manual-order module hands the writer.
import { describe, expect, it } from "vitest";
import { computeWorktreeSidebarDropPreview } from "./worktree-sidebar-drop-preview";
import { applyWorktreeGroupOrder } from "./worktree-group-order";
import {
  buildManualOrderUpdatesForVisibleGroups,
  type WorktreeDragGroup,
} from "./worktree-manual-order";
import type { WorktreeSidebarDragRect } from "./worktree-sidebar-drag-autoscroll";
import type { GitWorktreeInfo } from "./types";

const ROW_HEIGHT = 40;
const ROW_GAP = 4;
const ROW_PITCH = ROW_HEIGHT + ROW_GAP;
const GROUP_IDS = ["w0", "w1", "w2", "w3"];
const GRAB = { offsetY: 20, height: ROW_HEIGHT };

const RECTS: WorktreeSidebarDragRect[] = GROUP_IDS.map((worktreeId, index) => ({
  worktreeId,
  groupIndex: index,
  top: index * ROW_PITCH,
  bottom: index * ROW_PITCH + ROW_HEIGHT,
}));

function preview(args: {
  pointerY: number;
  draggingWorktreeId: string;
  draggedIds?: readonly string[];
  grab?: { offsetY: number; height: number } | null;
}) {
  return computeWorktreeSidebarDropPreview({
    pointerY: args.pointerY,
    containerTop: 0,
    scrollTop: 0,
    rects: RECTS,
    groupIds: GROUP_IDS,
    draggedIds: args.draggedIds ?? [args.draggingWorktreeId],
    draggingWorktreeId: args.draggingWorktreeId,
    fallbackGap: ROW_GAP,
    grab: args.grab === undefined ? GRAB : args.grab,
  });
}

describe("worktree sidebar drop preview", () => {
  it("opens the gap below the card the pointer crossed, and parks the line in it", () => {
    // w1's band: the closest-centre model puts the dragged card after w1.
    const result = preview({ pointerY: 64, draggingWorktreeId: "w0" });

    expect(result?.dropIndex).toBe(2);
    expect(result?.dropAnchorId).toBe("w2");
    expect(result?.dropIndicatorY).toBe(41);
    expect([...(result?.previewOffsetsByWorktreeId ?? [])]).toEqual([["w1", -44]]);
  });

  it("opens the gap above the card when the pointer moves up", () => {
    const result = preview({ pointerY: 20, draggingWorktreeId: "w2", grab: GRAB });

    expect(result?.dropIndex).toBe(0);
    expect(result?.dropAnchorId).toBe("w0");
    expect(result?.dropIndicatorY).toBe(0);
    expect([...(result?.previewOffsetsByWorktreeId ?? [])]).toEqual([
      ["w0", 44],
      ["w1", 44],
    ]);
  });

  it("keeps the line on the dragged card's own edge while the drop is a no-op", () => {
    const result = preview({ pointerY: 64, draggingWorktreeId: "w1" });

    expect(result?.dropIndex).toBe(1);
    expect(result?.dropIndicatorY).toBe(41);
    expect((result?.previewOffsetsByWorktreeId ?? new Map()).size).toBe(0);
  });

  it("snaps to the group's first slot from just above the list", () => {
    const result = preview({ pointerY: -30, draggingWorktreeId: "w1" });

    expect(result?.dropIndex).toBe(0);
    expect(result?.dropIndicatorY).toBe(0);
    expect([...(result?.previewOffsetsByWorktreeId ?? [])]).toEqual([["w0", 44]]);
  });

  it("has no preview for releases outside the list bounds", () => {
    expect(preview({ pointerY: -100, draggingWorktreeId: "w1" })).toBeNull();
    expect(preview({ pointerY: 400, draggingWorktreeId: "w1" })).toBeNull();
  });
});

describe("within-group reorder commit", () => {
  const groups: WorktreeDragGroup[] = [{ key: "repo:1", worktreeIds: [...GROUP_IDS] }];
  const allWorktreeIds = [...GROUP_IDS];

  function reorder(draggedIds: readonly string[], dropIndex: number) {
    return buildManualOrderUpdatesForVisibleGroups({
      groups,
      sourceGroupKey: "repo:1",
      draggedIds,
      dropIndex,
      now: 1_700_000_000_000,
      allWorktreeIds,
    });
  }

  it("moves a card up to the head of its group", () => {
    const result = reorder(["w2"], 0);

    expect(result.changed).toBe(true);
    expect(result.orderedIds).toEqual(["w2", "w0", "w1", "w3"]);
  });

  it("moves a card down past its neighbours", () => {
    const result = reorder(["w0"], 3);

    expect(result.changed).toBe(true);
    expect(result.orderedIds).toEqual(["w1", "w2", "w0", "w3"]);
  });

  it("reports no change when the card lands back in its own slot", () => {
    const result = reorder(["w1"], 1);

    expect(result.changed).toBe(false);
    expect(result.orderedIds).toEqual([...GROUP_IDS]);
  });

  it("leaves every other group in place", () => {
    const result = buildManualOrderUpdatesForVisibleGroups({
      groups: [groups[0]!, { key: "repo:2", worktreeIds: ["e", "f"] }],
      sourceGroupKey: "repo:1",
      draggedIds: ["w3"],
      dropIndex: 0,
      now: 1_700_000_000_000,
      allWorktreeIds: [...GROUP_IDS, "e", "f"],
    });

    expect(result.orderedIds).toEqual(["w3", "w0", "w1", "w2", "e", "f"]);
  });
});

describe("replaying a group order onto a project's worktrees", () => {
  function worktree(path: string): GitWorktreeInfo {
    return {
      path,
      head_commit: "abc1234",
      branch: path,
      is_bare: false,
      is_locked: false,
    };
  }

  it("leaves rows the sidebar filtered out exactly where they were", () => {
    const hidden = worktree("/repo/hidden");
    const list = ["/repo/a", "/repo/b", "/repo/c", "/repo/d"].map(worktree);

    const next = applyWorktreeGroupOrder(
      [hidden, ...list],
      ["/repo/c", "/repo/a", "/repo/b", "/repo/d"].map(worktree)
    );

    expect(next.map((entry) => entry.path)).toEqual([
      "/repo/hidden",
      "/repo/c",
      "/repo/a",
      "/repo/b",
      "/repo/d",
    ]);
  });

  it("hands back the untouched list when the order names a row the project does not have", () => {
    const list = ["/repo/a", "/repo/b"].map(worktree);

    const next = applyWorktreeGroupOrder(list, [worktree("/repo/b"), worktree("/repo/z")]);

    expect(next.map((entry) => entry.path)).toEqual(["/repo/a", "/repo/b"]);
    expect(next).not.toBe(list);
  });
});
