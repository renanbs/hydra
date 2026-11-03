// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/visible-worktree-activity-inputs.ts
import { describe, expect, it, vi } from "vitest";
import { createWorktreeTabBucketProjection } from "@/lib/worktree-tab-bucket-projection";
import {
  createVisibleWorktreeTerminalActivityProjection,
  getVisibleWorktreeBrowserActivityTabs,
  getVisibleWorktreeTerminalActivityTabs,
} from "./visible-worktree-activity-inputs";

describe("visible worktree activity inputs (D11-006)", () => {
  it("projects only the tab id, dropping title metadata", () => {
    const terminal: Record<string, { id: string; title: string }[]> = {
      wt1: [{ id: "tab-1", title: "zsh" }],
    };
    expect(getVisibleWorktreeTerminalActivityTabs(terminal)).toEqual({
      wt1: [{ id: "tab-1" }],
    });

    const browser: Record<string, { id: string; url: string }[]> = {
      wt2: [{ id: "page-9", url: "https://example.com" }],
    };
    expect(getVisibleWorktreeBrowserActivityTabs(browser)).toEqual({
      wt2: [{ id: "page-9" }],
    });
  });

  it("keeps the bucket identity when only tab metadata changed", () => {
    const projection = createVisibleWorktreeTerminalActivityProjection();
    const first = projection.project({ wt1: [{ id: "tab-1" }] });
    const renamed = projection.project({ wt1: [{ id: "tab-1" }] });
    expect(renamed.wt1).toBe(first.wt1);
  });

  it("recomputes only the modified bucket and inspects it", () => {
    const inspected: string[] = [];
    const projection = createWorktreeTabBucketProjection<{ id: string }, { id: string }>({
      projectTab: (tab) => ({ id: tab.id }),
      isSameProjectedTab: (previous, next) => previous.id === next.id,
      onInspectBucket: (worktreeId) => inspected.push(worktreeId),
    });
    const buckets = Object.fromEntries(
      Array.from({ length: 300 }, (_, index) => [`wt${index}`, [{ id: `tab-${index}` }]])
    );
    const first = projection.project(buckets);
    inspected.length = 0;

    const next = projection.project({ ...buckets, wt7: [{ id: "tab-7b" }] });
    expect(inspected).toEqual(["wt7"]);
    expect(next.wt7).not.toBe(first.wt7);
    expect(next.wt8).toBe(first.wt8);
  });

  it("drops buckets for removed worktrees", () => {
    const projection = createVisibleWorktreeTerminalActivityProjection();
    const first = projection.project({ wt1: [{ id: "tab-1" }], wt2: [{ id: "tab-2" }] });
    const next = projection.project({ wt1: [{ id: "tab-1" }] });
    expect(first.wt2).toBeDefined();
    expect(next.wt2).toBeUndefined();
  });

  it("memoizes when the source record is unchanged", () => {
    const projection = createVisibleWorktreeTerminalActivityProjection();
    const inspected = vi.fn();
    const source = { wt1: [{ id: "tab-1" }] };
    const instrumented = createVisibleWorktreeTerminalActivityProjection(inspected);
    const first = instrumented.project(source);
    inspected.mockClear();
    const second = instrumented.project(source);
    expect(second).toBe(first);
    expect(inspected).not.toHaveBeenCalled();
    // The module-level projection still answers the same shape.
    expect(projection.project(source)).toEqual({ wt1: [{ id: "tab-1" }] });
  });
});
