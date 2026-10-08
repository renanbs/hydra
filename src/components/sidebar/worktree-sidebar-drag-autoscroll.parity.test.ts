// Pointer-drag autoscroll and row-rect geometry: the sidebar scrolls as the dragged
// card reaches an edge, and the drop bounds decide whether a release belongs to the
// list at all. jsdom has no layout, so every rect here is synthetic.
import { describe, expect, it } from "vitest";
import {
  getWorktreeSidebarBoundaryDrop,
  getWorktreeSidebarDragAutoscroll,
  getWorktreeSidebarDragRectsForGroup,
  refreshWorktreeSidebarDragSession,
  type WorktreeSidebarDragRect,
} from "./worktree-sidebar-drag-autoscroll";
import { getWorktreeDragUnitGroups } from "./worktree-drag-units";
import type { WorktreeDragGroup } from "./worktree-manual-order";

const CONTAINER = { left: 0, right: 300, top: 100, bottom: 500 };
const WITHIN_TOP_EDGE_Y = 110;
const WITHIN_BOTTOM_EDGE_Y = 490;
const MIDDLE_Y = 300;

function stubRect(
  element: Element,
  rect: { top: number; bottom: number; left?: number; right?: number }
): void {
  Object.defineProperty(element, "getBoundingClientRect", {
    configurable: true,
    value: () => ({
      top: rect.top,
      bottom: rect.bottom,
      left: rect.left ?? 0,
      right: rect.right ?? 300,
      width: (rect.right ?? 300) - (rect.left ?? 0),
      height: rect.bottom - rect.top,
      x: rect.left ?? 0,
      y: rect.top,
      toJSON: () => ({}),
    }),
  });
}

function buildScrollContainer(html: string, scrollTop = 0): HTMLDivElement {
  document.body.innerHTML = `<div id="sidebar-scroll">${html}</div>`;
  const container = document.getElementById("sidebar-scroll") as HTMLDivElement;
  stubRect(container, { top: CONTAINER.top, bottom: CONTAINER.bottom });
  Object.defineProperty(container, "scrollTop", { configurable: true, value: scrollTop, writable: true });
  return container;
}

describe("worktree sidebar drag autoscroll", () => {
  it("scrolls up when the pointer sits in the top edge zone", () => {
    const result = getWorktreeSidebarDragAutoscroll({
      point: { clientX: 120, clientY: WITHIN_TOP_EDGE_Y },
      containerRect: CONTAINER,
      scrollTop: 200,
      scrollHeight: 1000,
      clientHeight: 400,
      elapsedMs: 16,
    });

    expect(result?.scrollTop).toBeCloseTo(187.4, 1);
  });

  it("scrolls down when the pointer sits in the bottom edge zone", () => {
    const result = getWorktreeSidebarDragAutoscroll({
      point: { clientX: 120, clientY: WITHIN_BOTTOM_EDGE_Y },
      containerRect: CONTAINER,
      scrollTop: 200,
      scrollHeight: 1000,
      clientHeight: 400,
      elapsedMs: 16,
    });

    expect(result?.scrollTop).toBeCloseTo(212.6, 1);
  });

  it("clamps at the scroll bounds", () => {
    const topClamped = getWorktreeSidebarDragAutoscroll({
      point: { clientX: 120, clientY: WITHIN_TOP_EDGE_Y },
      containerRect: CONTAINER,
      scrollTop: 5,
      scrollHeight: 1000,
      clientHeight: 400,
      elapsedMs: 1000,
    });
    const bottomClamped = getWorktreeSidebarDragAutoscroll({
      point: { clientX: 120, clientY: 495 },
      containerRect: CONTAINER,
      scrollTop: 580,
      scrollHeight: 1000,
      clientHeight: 400,
      elapsedMs: 1000,
    });

    expect(topClamped?.scrollTop).toBe(0);
    expect(bottomClamped?.scrollTop).toBe(600);
  });

  it("leaves the list alone away from the edges and outside the column", () => {
    const middle = getWorktreeSidebarDragAutoscroll({
      point: { clientX: 120, clientY: MIDDLE_Y },
      containerRect: CONTAINER,
      scrollTop: 200,
      scrollHeight: 1000,
      clientHeight: 400,
      elapsedMs: 16,
    });
    const besideTheList = getWorktreeSidebarDragAutoscroll({
      point: { clientX: 400, clientY: WITHIN_TOP_EDGE_Y },
      containerRect: CONTAINER,
      scrollTop: 200,
      scrollHeight: 1000,
      clientHeight: 400,
      elapsedMs: 16,
    });
    const farAboveTheList = getWorktreeSidebarDragAutoscroll({
      point: { clientX: 120, clientY: CONTAINER.top - 60 },
      containerRect: CONTAINER,
      scrollTop: 200,
      scrollHeight: 1000,
      clientHeight: 400,
      elapsedMs: 16,
    });

    expect(middle).toBeNull();
    expect(besideTheList).toBeNull();
    expect(farAboveTheList).toBeNull();
  });

  it("never scrolls a list that has nothing to scroll, or a frame with no elapsed time", () => {
    const noOverflow = getWorktreeSidebarDragAutoscroll({
      point: { clientX: 120, clientY: WITHIN_TOP_EDGE_Y },
      containerRect: CONTAINER,
      scrollTop: 0,
      scrollHeight: 400,
      clientHeight: 400,
      elapsedMs: 16,
    });
    const noElapsedTime = getWorktreeSidebarDragAutoscroll({
      point: { clientX: 120, clientY: WITHIN_TOP_EDGE_Y },
      containerRect: CONTAINER,
      scrollTop: 100,
      scrollHeight: 1000,
      clientHeight: 400,
      elapsedMs: 0,
    });

    expect(noOverflow).toBeNull();
    expect(noElapsedTime).toBeNull();
  });
});

describe("worktree sidebar boundary drop", () => {
  const firstRect: WorktreeSidebarDragRect = { worktreeId: "a", groupIndex: 0, top: 0, bottom: 40 };
  const lastRect: WorktreeSidebarDragRect = { worktreeId: "d", groupIndex: 3, top: 120, bottom: 160 };
  const sourceGroupSize = 4;

  function boundaryAt(localY: number, first: WorktreeSidebarDragRect = firstRect) {
    return getWorktreeSidebarBoundaryDrop({
      localY,
      firstRect: first,
      lastRect,
      sourceGroupSize,
    });
  }

  it("reports a slot for releases just above the first row and just below the last", () => {
    expect(boundaryAt(-30)).toEqual({ kind: "drop", dropIndex: 0, indicatorY: 0 });
    expect(boundaryAt(200)).toEqual({ kind: "drop", dropIndex: 4, indicatorY: 163 });
  });

  it("stays inside between the rows and leaves the list past the edge zones", () => {
    expect(boundaryAt(20)).toEqual({ kind: "inside" });
    expect(boundaryAt(-100)).toEqual({ kind: "outside" });
    expect(boundaryAt(300)).toEqual({ kind: "outside" });
  });

  it("refuses an edge slot when the measured rows are not the group's first or last", () => {
    expect(boundaryAt(-30, { ...firstRect, groupIndex: 2 })).toEqual({ kind: "outside" });
  });
});

describe("worktree sidebar row rects", () => {
  it("measures only the group's rows, in content coordinates and top-first order", () => {
    const container = buildScrollContainer(
      `
      <div data-worktree-drag-id="c" data-worktree-drag-group-key="repo:1" data-worktree-drag-group-index="2"></div>
      <div data-worktree-drag-id="b" data-worktree-drag-group-key="repo:1" data-worktree-drag-group-index="1"></div>
      <div data-worktree-drag-id="x" data-worktree-drag-group-key="repo:2" data-worktree-drag-group-index="0"></div>
      <div data-worktree-drag-id="a" data-worktree-drag-group-key="repo:1" data-worktree-drag-group-index="0"></div>
      <div data-worktree-drag-id="d" data-worktree-drag-group-key="repo:1"></div>
      `,
      40
    );
    stubRect(container.querySelectorAll("[data-worktree-drag-id]")[0]!, { top: 300, bottom: 340 });
    stubRect(container.querySelectorAll("[data-worktree-drag-id]")[1]!, { top: 200, bottom: 240 });
    stubRect(container.querySelectorAll("[data-worktree-drag-id]")[2]!, { top: 150, bottom: 190 });
    stubRect(container.querySelectorAll("[data-worktree-drag-id]")[3]!, { top: 100, bottom: 140 });

    expect(getWorktreeSidebarDragRectsForGroup(container, "repo:1")).toEqual([
      { worktreeId: "a", groupIndex: 0, top: 40, bottom: 80 },
      { worktreeId: "b", groupIndex: 1, top: 140, bottom: 180 },
      { worktreeId: "c", groupIndex: 2, top: 240, bottom: 280 },
    ]);
  });
});

describe("refresh worktree sidebar drag session", () => {
  const rows = [
    { type: "header", key: "repo:1" },
    { type: "item", worktree: { id: "a" }, depth: 0, sectionKey: "repo:1" },
    { type: "item", worktree: { id: "b" }, depth: 0, sectionKey: "repo:1" },
  ];
  const groups: WorktreeDragGroup[] = [{ key: "repo:1", worktreeIds: ["a", "b"] }];
  const unitGroups = getWorktreeDragUnitGroups(rows);

  function sessionFor(draggingWorktreeId: string, sourceGroupKey: string) {
    return {
      draggingWorktreeId,
      sourceGroupKey,
      draggedIds: [draggingWorktreeId],
      reorderDraggedIds: [draggingWorktreeId],
      reorderUnitDraggedIds: [draggingWorktreeId],
      rects: [] as WorktreeSidebarDragRect[],
      grab: null,
      anchor: null,
    };
  }

  it("takes the freshly measured rects", () => {
    const rects: WorktreeSidebarDragRect[] = [
      { worktreeId: "a", groupIndex: 0, top: 0, bottom: 40 },
      { worktreeId: "b", groupIndex: 1, top: 44, bottom: 84 },
    ];

    const refreshed = refreshWorktreeSidebarDragSession({
      session: sessionFor("a", "repo:1"),
      groups,
      unitGroups,
      rects,
    });

    expect(refreshed?.rects).toEqual(rects);
  });

  it("ends the session when the dragged row left its group", () => {
    const refreshed = refreshWorktreeSidebarDragSession({
      session: sessionFor("a", "repo:1"),
      groups: [{ key: "repo:1", worktreeIds: ["b"] }],
      unitGroups,
      rects: [],
    });

    expect(refreshed).toBeNull();
  });
});
