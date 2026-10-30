// Parity guard for D03a-050: the 3s sort settle window.
//
// Orca debounces Smart/Recent re-sorts so time-decaying attention scores do not
// make rows jump while the user reads them; structural changes and manual drops
// still apply immediately. These tests pin that contract without the sidebar.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  SORT_SETTLE_MS,
  createSortSettleGate,
  resolveSortSettleDecision,
} from "./smart-sort";

const decision = (overrides: Partial<Parameters<typeof resolveSortSettleDecision>[0]> = {}) =>
  resolveSortSettleDecision({
    sortBy: "smart",
    sortEpoch: 2,
    appliedSortEpoch: 1,
    worktreeCount: 4,
    appliedWorktreeCount: 4,
    ...overrides,
  });

describe("resolveSortSettleDecision (Orca parity)", () => {
  it("leaves the applied epoch alone when nothing changed", () => {
    expect(decision({ sortEpoch: 7, appliedSortEpoch: 7 })).toBe("unchanged");
  });

  it("settles Smart and Recent background bumps", () => {
    expect(decision({ sortBy: "smart" })).toBe("settle");
    expect(decision({ sortBy: "recent" })).toBe("settle");
  });

  it("applies structural changes immediately", () => {
    expect(decision({ sortBy: "smart", worktreeCount: 5, appliedWorktreeCount: 4 })).toBe(
      "apply-now"
    );
  });

  it("never delays a manual drag/drop or the name/repo modes", () => {
    expect(decision({ sortBy: "manual" })).toBe("apply-now");
    expect(decision({ sortBy: "name" })).toBe("apply-now");
    expect(decision({ sortBy: "repo" })).toBe("apply-now");
  });
});

describe("createSortSettleGate (Orca parity)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("applies the epoch only after SORT_SETTLE_MS", () => {
    const applied: number[] = [];
    const gate = createSortSettleGate((epoch) => applied.push(epoch));

    gate.request({ sortBy: "smart", sortEpoch: 1, worktreeCount: 4 });
    expect(applied).toEqual([1]);

    gate.request({ sortBy: "smart", sortEpoch: 2, worktreeCount: 4 });
    vi.advanceTimersByTime(SORT_SETTLE_MS - 1);
    expect(applied).toEqual([1]);

    vi.advanceTimersByTime(1);
    expect(applied).toEqual([1, 2]);
    expect(gate.appliedSortEpoch()).toBe(2);
  });

  it("restarts the window on every bump and coalesces them into one reorder", () => {
    const applied: number[] = [];
    const gate = createSortSettleGate((epoch) => applied.push(epoch));

    gate.request({ sortBy: "recent", sortEpoch: 1, worktreeCount: 4 });
    gate.request({ sortBy: "recent", sortEpoch: 2, worktreeCount: 4 });
    vi.advanceTimersByTime(SORT_SETTLE_MS - 1);
    gate.request({ sortBy: "recent", sortEpoch: 3, worktreeCount: 4 });
    vi.advanceTimersByTime(SORT_SETTLE_MS - 1);
    expect(applied).toEqual([1]);

    vi.advanceTimersByTime(1);
    expect(applied).toEqual([1, 3]);
  });

  it("bypasses the window for adds, removals and manual drops", () => {
    const applied: number[] = [];
    const gate = createSortSettleGate((epoch) => applied.push(epoch));

    gate.request({ sortBy: "smart", sortEpoch: 1, worktreeCount: 4 });
    gate.request({ sortBy: "smart", sortEpoch: 2, worktreeCount: 5 });
    expect(applied).toEqual([1, 2]);

    gate.request({ sortBy: "manual", sortEpoch: 3, worktreeCount: 5 });
    expect(applied).toEqual([1, 2, 3]);
  });

  it("flush applies a pending epoch immediately; dispose cancels it", () => {
    const applied: number[] = [];
    const gate = createSortSettleGate((epoch) => applied.push(epoch));

    gate.request({ sortBy: "smart", sortEpoch: 1, worktreeCount: 4 });
    gate.request({ sortBy: "smart", sortEpoch: 2, worktreeCount: 4 });
    gate.flush();
    expect(applied).toEqual([1, 2]);
    vi.advanceTimersByTime(SORT_SETTLE_MS);
    expect(applied).toEqual([1, 2]);

    gate.request({ sortBy: "smart", sortEpoch: 3, worktreeCount: 4 });
    gate.dispose();
    vi.advanceTimersByTime(SORT_SETTLE_MS);
    expect(applied).toEqual([1, 2]);
  });
});
