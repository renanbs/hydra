// D03a-080: the inline descendant renderer mirrors Orca's recursion — one card per direct
// child, grandchildren nested in their own parent's card — and the lineage toggle handlers
// keep a stable identity so the memoised card is not defeated on every list render.
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup, render } from "@testing-library/react";
import { toWorktreeRow } from "../../../../shared/worktree/worktree-row";
import type { WorktreeRow } from "../grouping/row-types";
import {
  createLineageToggleHandlerCache,
  renderWorktreeLineageDescendants,
} from "./item-row";

function itemRow(path: string, depth: number, isLastLineageChild = true): WorktreeRow {
  const worktree = toWorktreeRow(
    {
      path,
      head_commit: "abc1234",
      branch: path.split("/").pop() as string,
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
    depth,
    groupDepth: 0,
    lineageTrail: [],
    isLastLineageChild,
    lineageChildCount: 0,
  };
}

function renderChild(row: WorktreeRow, lineageChildren?: React.ReactNode): React.ReactNode {
  return <div data-row={row.rowKey}>{lineageChildren}</div>;
}

describe("renderWorktreeLineageDescendants (D03a-080)", () => {
  afterEach(cleanup);

  it("nests grandchildren under their own parent card", () => {
    const child = itemRow("/repo/a/child", 1, false);
    const grandchild = itemRow("/repo/a/grandchild", 2);

    const { container } = render(
      <>{renderWorktreeLineageDescendants([child, grandchild], 0, renderChild)}</>
    );

    const childNode = container.querySelector(`[data-row="${child.rowKey}"]`);
    const grandchildNode = container.querySelector(`[data-row="${grandchild.rowKey}"]`);
    expect(childNode).not.toBeNull();
    expect(grandchildNode).not.toBeNull();
    expect(childNode!.contains(grandchildNode!)).toBe(true);
    expect(grandchildNode!.closest("[data-worktree-lineage-child]")).toHaveAttribute(
      "data-worktree-lineage-depth",
      "2"
    );
  });

  it("marks the last sibling and stops bubbling the child's gestures to the parent", () => {
    const first = itemRow("/repo/a/first", 1, false);
    const last = itemRow("/repo/a/last", 1);
    const onParentClick = vi.fn();

    const { container } = render(
      <div onClick={onParentClick}>
        {renderWorktreeLineageDescendants([first, last], 0, renderChild)}
      </div>
    );

    const wrappers = container.querySelectorAll("[data-worktree-lineage-child]");
    expect(wrappers).toHaveLength(2);
    expect(wrappers[0]).not.toHaveAttribute("data-worktree-lineage-last-child");
    expect(wrappers[1]).toHaveAttribute("data-worktree-lineage-last-child");

    wrappers[0]!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onParentClick).not.toHaveBeenCalled();
  });

  it("returns undefined for a leaf branch", () => {
    expect(renderWorktreeLineageDescendants([], 0, renderChild)).toBeUndefined();
  });
});

describe("createLineageToggleHandlerCache (D03a-080)", () => {
  it("reuses one handler per group and records the anchor before toggling", () => {
    const toggleGroup = vi.fn();
    const getHandler = createLineageToggleHandlerCache(toggleGroup);

    const first = getHandler("lineage:parent");
    expect(getHandler("lineage:parent")).toBe(first);
    expect(getHandler("lineage:other")).not.toBe(first);

    const event = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as React.MouseEvent<HTMLButtonElement>;
    first(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.stopPropagation).toHaveBeenCalled();
    expect(toggleGroup).toHaveBeenCalledWith("lineage:parent");
  });
});
