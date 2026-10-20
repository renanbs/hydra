import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import type { WorktreeDropCommitContext } from "./drop-commit-context";
import {
  findWorktreeNestingTarget,
  isEligibleWorktreeNestingParent,
  updateWorktreeLineageDropTargetVisual,
  WORKTREE_NESTING_HOVER_ATTRIBUTE,
} from "./nesting";
import { flushWorktreePointerDragFrame } from "./pointer-flush";
import { commitWorktreePointerDrop } from "./pointer-commit";
import type { WorktreePointerDrag, WorktreeRowDragState } from "./row-state";

const PARENTS = new Map([
  ["child", "parent"],
  ["grandchild", "child"],
]);

function cardFor(id: string): HTMLElement {
  const element = document.createElement("div");
  element.setAttribute("data-worktree-nesting-id", id);
  element.getBoundingClientRect = () =>
    ({ top: 100, bottom: 140, left: 0, right: 300, width: 300, height: 40, x: 0, y: 100, toJSON: () => ({}) }) as DOMRect;
  document.body.appendChild(element);
  return element;
}

function drag(overrides: Partial<WorktreePointerDrag> = {}): WorktreePointerDrag {
  const preview = document.createElement("div");
  return {
    pointerId: 1,
    sourceRow: document.createElement("div"),
    startX: 10,
    startY: 10,
    currentX: 40,
    currentY: 120,
    worktreeId: "child",
    draggedIds: ["child"],
    reorderDraggedIds: ["child"],
    reorderUnitDraggedIds: ["child"],
    sourceGroupKey: "group",
    rects: [],
    active: true,
    preview,
    previewOffsetX: 0,
    previewOffsetY: 0,
    frameId: null,
    reorderIntent: null,
    ...overrides,
  };
}

function context(overrides: Partial<WorktreeDropCommitContext> = {}): WorktreeDropCommitContext {
  const scroll = document.createElement("div");
  scroll.getBoundingClientRect = () =>
    ({ left: 0, right: 300, top: 0, bottom: 400, width: 300, height: 400, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
  return {
    scrollRef: { current: scroll },
    worktreeDragGroups: [],
    worktreeDragUnitGroups: [],
    computeWorktreeDrop: vi.fn(() => ({
      dropIndex: 0,
      dropIndicatorY: 10,
      dropAnchorId: null,
      previewOffsetsByWorktreeId: new Map(),
    })),
    refreshWorktreeDragSession: () => true,
    clearWorktreeDrag: vi.fn(),
    resolveDraggedWorktreeIds: () => ["child"],
    onReorderWorktrees: vi.fn(),
    onAssignWorktreesStatus: vi.fn(),
    onPinWorktrees: vi.fn(),
    lineageParentIdByChildId: PARENTS,
    onNestWorktrees: vi.fn(),
    onUnnestWorktrees: vi.fn(),
    ...overrides,
  };
}

const elementFromPoint = vi.fn<(x: number, y: number) => Element | null>(() => null);

beforeEach(() => {
  Object.defineProperty(document, "elementFromPoint", {
    configurable: true,
    value: elementFromPoint,
  });
  elementFromPoint.mockReturnValue(null);
});

afterEach(() => {
  vi.restoreAllMocks();
  elementFromPoint.mockReset();
  document.body.innerHTML = "";
});

describe("worktree nesting eligibility (Orca parity)", () => {
  it("rejects the dragged cards, their children and deeper descendants", () => {
    expect(
      isEligibleWorktreeNestingParent({
        candidateId: "child",
        draggedIds: ["child"],
        parentIdByChildId: PARENTS,
      })
    ).toBe(false);
    expect(
      isEligibleWorktreeNestingParent({
        candidateId: "grandchild",
        draggedIds: ["child"],
        parentIdByChildId: PARENTS,
      })
    ).toBe(false);
  });

  it("accepts an unrelated card and one whose ancestors are clear", () => {
    expect(
      isEligibleWorktreeNestingParent({
        candidateId: "unrelated",
        draggedIds: ["child"],
        parentIdByChildId: PARENTS,
      })
    ).toBe(true);
    expect(
      isEligibleWorktreeNestingParent({
        candidateId: "parent",
        draggedIds: ["grandchild"],
        parentIdByChildId: PARENTS,
      })
    ).toBe(true);
  });

  it("reads the card under the pointer and paints its hover ring", () => {
    const card = cardFor("parent");
    elementFromPoint.mockReturnValue(card);

    expect(
      findWorktreeNestingTarget({
        pointerX: 10,
        pointerY: 120,
        draggedIds: ["child"],
        parentIdByChildId: new Map(),
      })
    ).toBe("parent");

    updateWorktreeLineageDropTargetVisual("parent");
    expect(card).toHaveAttribute(WORKTREE_NESTING_HOVER_ATTRIBUTE, "true");
    updateWorktreeLineageDropTargetVisual(null);
    expect(card).not.toHaveAttribute(WORKTREE_NESTING_HOVER_ATTRIBUTE);
  });

  it("keeps the card's top and bottom edges as reorder zones", () => {
    const card = cardFor("parent");
    elementFromPoint.mockReturnValue(card);

    expect(
      findWorktreeNestingTarget({
        pointerX: 10,
        pointerY: 102,
        draggedIds: ["child"],
        parentIdByChildId: new Map(),
      })
    ).toBeNull();
    expect(
      findWorktreeNestingTarget({
        pointerX: 10,
        pointerY: 138,
        draggedIds: ["child"],
        parentIdByChildId: new Map(),
      })
    ).toBeNull();
    expect(
      findWorktreeNestingTarget({
        pointerX: 10,
        pointerY: 120,
        draggedIds: ["child"],
        parentIdByChildId: new Map(),
      })
    ).toBe("parent");
  });

  it("never returns a card inside the dragged subtree", () => {
    const card = cardFor("grandchild");
    elementFromPoint.mockReturnValue(card);
    expect(
      findWorktreeNestingTarget({
        pointerX: 10,
        pointerY: 120,
        draggedIds: ["child"],
        parentIdByChildId: PARENTS,
      })
    ).toBeNull();
  });
});

describe("pointer drag frame and release with a nest target", () => {
  it("suppresses the insertion line while a card is a nest target", () => {
    const card = cardFor("parent");
    elementFromPoint.mockReturnValue(card);
    const setState = vi.fn();
    const ctx = context();

    flushWorktreePointerDragFrame({
      drag: drag({ active: true }),
      ctx,
      setWorktreeDragState: setState,
    });

    const apply = setState.mock.calls[0][0] as (
      previous: WorktreeRowDragState
    ) => WorktreeRowDragState;
    const next = apply({
      draggingWorktreeId: "child",
      dropIndex: 0,
      dropIndicatorY: 10,
      lineageDropTargetId: null,
      previewOffsetsByWorktreeId: new Map(),
    });
    expect(next.lineageDropTargetId).toBe("parent");
    expect(next.dropIndex).toBeNull();
    expect(ctx.computeWorktreeDrop).not.toHaveBeenCalled();
    expect(card).toHaveAttribute(WORKTREE_NESTING_HOVER_ATTRIBUTE, "true");
  });

  it("commits a nest instead of a reorder and clears the ring", () => {
    const card = cardFor("parent");
    elementFromPoint.mockReturnValue(card);
    const ctx = context();

    commitWorktreePointerDrop({ drag: drag(), ctx });

    expect(ctx.onNestWorktrees).toHaveBeenCalledWith("parent", ["child"]);
    expect(ctx.onReorderWorktrees).not.toHaveBeenCalled();
    expect(ctx.clearWorktreeDrag).toHaveBeenCalledTimes(1);
    expect(card).not.toHaveAttribute(WORKTREE_NESTING_HOVER_ATTRIBUTE);
  });

  it("detaches a nested card from its parent when it lands on a reorder line", () => {
    elementFromPoint.mockReturnValue(null);
    const ctx = context();

    commitWorktreePointerDrop({ drag: drag(), ctx });

    expect(ctx.onUnnestWorktrees).toHaveBeenCalledWith(["child"]);
    expect(ctx.onReorderWorktrees).toHaveBeenCalledTimes(1);
    expect(ctx.onNestWorktrees).not.toHaveBeenCalled();
  });
});


describe("reorder intent hysteresis (D03a-003)", () => {
  it("holds the previous offsets for 160ms before moving the insertion line", () => {
    const now = vi.spyOn(performance, "now").mockReturnValue(1_000);
    const raf = vi.spyOn(window, "requestAnimationFrame").mockReturnValue(7);
    const setState = vi.fn();
    const pointerDrag = { ...drag(), reorderIntent: null };
    const ctx = context();
    const previous: WorktreeRowDragState = {
      draggingWorktreeId: "child",
      dropIndex: 3,
      dropIndicatorY: 200,
      lineageDropTargetId: null,
      previewOffsetsByWorktreeId: new Map([["child", 44]]),
    };

    flushWorktreePointerDragFrame({
      drag: pointerDrag,
      ctx,
      setWorktreeDragState: setState,
    });

    const next = (setState.mock.calls[0][0] as (state: WorktreeRowDragState) => WorktreeRowDragState)(
      previous
    );
    expect(next.dropIndex).toBeNull();
    expect(next.previewOffsetsByWorktreeId.get("child")).toBe(44);
    expect(pointerDrag.reorderIntent?.startedAt).toBe(1_000);
    expect(raf).toHaveBeenCalledTimes(1);

    // A later frame after the intent settles applies the slot.
    now.mockReturnValue(1_200);
    pointerDrag.frameId = null;
    setState.mockClear();
    flushWorktreePointerDragFrame({ drag: pointerDrag, ctx, setWorktreeDragState: setState });
    const settled = (
      setState.mock.calls[0][0] as (state: WorktreeRowDragState) => WorktreeRowDragState
    )(previous);
    expect(settled.dropIndex).toBe(0);
    expect(settled.dropIndicatorY).toBe(10);
  });

  it("does not renew the intent when autoscroll changes the slot under a still pointer", () => {
    const now = vi.spyOn(performance, "now").mockReturnValue(1_000);
    vi.spyOn(window, "requestAnimationFrame").mockReturnValue(7);
    const setState = vi.fn();
    const computeWorktreeDrop = vi.fn(() => ({
      dropIndex: 2,
      dropIndicatorY: 80,
      dropAnchorId: null,
      previewOffsetsByWorktreeId: new Map<string, number>(),
    }));
    const pointerDrag = { ...drag(), currentY: 120, reorderIntent: null };
    const ctx = context({ computeWorktreeDrop });

    flushWorktreePointerDragFrame({ drag: pointerDrag, ctx, setWorktreeDragState: setState });
    now.mockReturnValue(1_400);
    computeWorktreeDrop.mockReturnValue({
      dropIndex: 3,
      dropIndicatorY: 120,
      dropAnchorId: null,
      previewOffsetsByWorktreeId: new Map<string, number>(),
    });
    // Same pointerY: autoscroll moved the slot, not the pointer.
    flushWorktreePointerDragFrame({ drag: pointerDrag, ctx, setWorktreeDragState: setState });

    expect(pointerDrag.reorderIntent?.dropIndex).toBe(3);
    expect(pointerDrag.reorderIntent?.startedAt).toBe(1_000);
  });
});


describe("list section drops (D03a-009 / D03a-010)", () => {
  function header(attributes: Record<string, string>): HTMLElement {
    const element = document.createElement("div");
    for (const [name, value] of Object.entries(attributes)) {
      element.setAttribute(name, value);
    }
    document.body.appendChild(element);
    return element;
  }

  it("moves the dragged cards to the status lane under the pointer", () => {
    const lane = header({
      "data-workspace-status-drop-target": "",
      "data-workspace-status": "in-progress",
    });
    elementFromPoint.mockReturnValue(lane);
    const ctx = context();

    commitWorktreePointerDrop({ drag: drag(), ctx });

    expect(ctx.onAssignWorktreesStatus).toHaveBeenCalledWith(["child"], "in-progress");
    expect(ctx.onReorderWorktrees).not.toHaveBeenCalled();
    expect(ctx.onNestWorktrees).not.toHaveBeenCalled();
    expect(ctx.clearWorktreeDrag).toHaveBeenCalledTimes(1);
  });

  it("pins the dragged cards on the Pinned header", () => {
    const pinned = header({ "data-workspace-pin-drop-target": "" });
    elementFromPoint.mockReturnValue(pinned);
    const ctx = context();

    commitWorktreePointerDrop({ drag: drag(), ctx });

    expect(ctx.onPinWorktrees).toHaveBeenCalledWith(["child"]);
    expect(ctx.onAssignWorktreesStatus).not.toHaveBeenCalled();
    expect(ctx.onReorderWorktrees).not.toHaveBeenCalled();
  });

  it("suppresses the insertion line while a section header is hovered", () => {
    const lane = header({
      "data-workspace-status-drop-target": "",
      "data-workspace-status": "done",
    });
    elementFromPoint.mockReturnValue(lane);
    const setState = vi.fn();
    const ctx = context();

    flushWorktreePointerDragFrame({
      drag: { ...drag(), reorderIntent: null },
      ctx,
      setWorktreeDragState: setState,
    });

    const next = (setState.mock.calls[0][0] as (state: WorktreeRowDragState) => WorktreeRowDragState)({
      draggingWorktreeId: "child",
      dropIndex: 2,
      dropIndicatorY: 88,
      lineageDropTargetId: null,
      previewOffsetsByWorktreeId: new Map([["child", 44]]),
    });
    expect(next.dropIndex).toBeNull();
    expect(next.previewOffsetsByWorktreeId.get("child")).toBe(44);
    expect(ctx.computeWorktreeDrop).not.toHaveBeenCalled();
    expect(lane).toHaveAttribute("data-workspace-section-drop-hover", "true");
  });
});
