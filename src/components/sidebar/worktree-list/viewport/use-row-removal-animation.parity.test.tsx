// Row-removal animation: a deleted workspace closes its slot in one commit, so the survivors
// are played back from the viewport positions they had before it. The motions are asserted on
// the pure builder, and the hook's DOM leg against the Web Animations call it issues.
import { afterEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import React, { useRef } from "react";
import { cleanup, render } from "@testing-library/react";
import type { VirtualItem } from "@tanstack/react-virtual";
import { toWorktreeRow } from "../../../../shared/worktree/worktree-row";
import type { HostSectionRow } from "../../host-section-rows";
import {
  WORKTREE_ROW_REMOVAL_ANIMATION_MS,
  buildVirtualRowRemovalMotions,
  useVirtualRowRemovalAnimation,
  type VirtualRowLayoutSnapshot,
} from "./use-row-removal-animation";

function itemRow(rowKey: string): HostSectionRow {
  return {
    type: "item",
    rowKey,
    sectionKey: "all",
    worktree: toWorktreeRow(
      { path: `/repo/hydra/${rowKey}`, head_commit: "abc1234", branch: rowKey, is_bare: false },
      { repoId: "repo_a" }
    ),
    repo: undefined,
    depth: 0,
    groupDepth: 0,
    lineageTrail: [],
    isLastLineageChild: true,
    lineageChildCount: 0,
  };
}

function snapshot(args: {
  identities: string[];
  scrollTop: number;
  starts: [string, number][];
}): VirtualRowLayoutSnapshot {
  return {
    rowIdentityKeys: new Set(args.identities),
    scrollTop: args.scrollTop,
    startsByKey: new Map(args.starts),
  };
}

function item(index: number, start: number, key: string): VirtualItem {
  return { key, index, start, end: start + 44, size: 44, lane: 0 };
}

describe("buildVirtualRowRemovalMotions", () => {
  it("moves surviving rows from their pre-delete viewport positions", () => {
    const motions = buildVirtualRowRemovalMotions({
      previous: snapshot({
        identities: ["wt:a", "wt:b", "wt:c"],
        scrollTop: 100,
        starts: [
          ["wt:a", 100],
          ["wt:b", 220],
          ["wt:c", 340],
        ],
      }),
      current: snapshot({
        identities: ["wt:a", "wt:c"],
        scrollTop: 100,
        starts: [
          ["wt:a", 100],
          ["wt:c", 220],
        ],
      }),
    });

    expect(motions).toEqual([{ key: "wt:c", deltaY: 120 }]);
  });

  it("does not double-move rows when anchor restoration offsets a deletion above the viewport", () => {
    const motions = buildVirtualRowRemovalMotions({
      previous: snapshot({
        identities: ["wt:deleted", "wt:a"],
        scrollTop: 240,
        starts: [["wt:a", 240]],
      }),
      current: snapshot({
        identities: ["wt:a"],
        scrollTop: 120,
        starts: [["wt:a", 120]],
      }),
    });

    expect(motions).toEqual([]);
  });

  it("ignores additions and measurement-only movement", () => {
    const previous = snapshot({
      identities: ["wt:a"],
      scrollTop: 0,
      starts: [["wt:a", 100]],
    });

    expect(
      buildVirtualRowRemovalMotions({
        previous,
        current: snapshot({
          identities: ["wt:a", "wt:b"],
          scrollTop: 0,
          starts: [["wt:a", 140]],
        }),
      })
    ).toEqual([]);
  });

  it("ignores a window that only remeasured, and a deletion below the window", () => {
    expect(
      buildVirtualRowRemovalMotions({
        previous: snapshot({
          identities: ["wt:a", "wt:b"],
          scrollTop: 0,
          starts: [
            ["wt:a", 0],
            ["wt:b", 44],
          ],
        }),
        current: snapshot({
          identities: ["wt:a", "wt:b"],
          scrollTop: 200,
          starts: [
            ["wt:a", 0],
            ["wt:b", 44],
          ],
        }),
      })
    ).toEqual([]);

    // "wt:deleted" sat below the window, so nothing the user can see moved.
    expect(
      buildVirtualRowRemovalMotions({
        previous: snapshot({
          identities: ["wt:a", "wt:b", "wt:deleted"],
          scrollTop: 0,
          starts: [
            ["wt:a", 0],
            ["wt:b", 44],
            ["wt:deleted", 88],
          ],
        }),
        current: snapshot({
          identities: ["wt:a", "wt:b"],
          scrollTop: 0,
          starts: [
            ["wt:a", 0],
            ["wt:b", 44],
          ],
        }),
      })
    ).toEqual([]);
  });
});

function RemovalHarness({
  items,
  stickyKeys = [],
}: {
  items: VirtualItem[];
  stickyKeys?: string[];
}): React.JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null);
  const rows = items.map((entry) => itemRow(String(entry.key).replace(/^wt:/, "")));
  useVirtualRowRemovalAnimation({ rows, scrollRef, virtualItems: items });
  return (
    <div data-worktree-sidebar ref={scrollRef}>
      {items.map((entry) => (
        <div
          key={String(entry.key)}
          data-worktree-virtual-row-key={String(entry.key)}
          data-worktree-sticky-header-active={stickyKeys.includes(String(entry.key)) ? "" : undefined}
        >
          <div data-testid={`card-${String(entry.key)}`} />
        </div>
      ))}
    </div>
  );
}

describe("useVirtualRowRemovalAnimation", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("plays the survivors back and drops the deleted row from the flow", () => {
    const animate = vi.spyOn(Element.prototype, "animate");
    const { container, rerender } = render(
      <RemovalHarness items={[item(0, 0, "wt:a"), item(1, 44, "wt:b"), item(2, 88, "wt:c")]} />
    );
    expect(container.querySelector('[data-worktree-virtual-row-key="wt:b"]')).not.toBeNull();
    animate.mockClear();

    rerender(<RemovalHarness items={[item(0, 0, "wt:a"), item(1, 44, "wt:c")]} />);

    // The deleted row is out of the flow, and only the row that moved is played back.
    expect(container.querySelector('[data-worktree-virtual-row-key="wt:b"]')).toBeNull();
    expect(animate).toHaveBeenCalledTimes(1);
    expect(animate).toHaveBeenCalledWith([{ translate: "0 44px" }, { translate: "0 0" }], {
      duration: WORKTREE_ROW_REMOVAL_ANIMATION_MS,
      easing: "cubic-bezier(0.16, 1, 0.3, 1)",
    });
    expect(animate.mock.instances[0]).toBe(container.querySelector('[data-testid="card-wt:c"]'));
  });

  it("leaves the pinned row where the sticky frame put it", () => {
    const animate = vi.spyOn(Element.prototype, "animate");
    const { rerender } = render(
      <RemovalHarness items={[item(0, 0, "wt:a"), item(1, 44, "wt:b"), item(2, 88, "wt:c")]} />
    );
    animate.mockClear();

    rerender(
      <RemovalHarness
        items={[item(0, 0, "wt:a"), item(1, 44, "wt:c")]}
        stickyKeys={["wt:c"]}
      />
    );

    expect(animate).not.toHaveBeenCalled();
  });
});
