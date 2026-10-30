// D03a-050: the sidebar routes sort recomputation through the settle gate. Smart and
// Recent hold a fresh epoch for SORT_SETTLE_MS; a structural change or Manual sort
// applies it on the next paint.
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SORT_SETTLE_MS, type SortBy } from "../../smart-sort";
import { useSettledSortEpoch } from "./use-sort-settle-epoch";

type Props = { sortBy: SortBy; epoch: number; worktreeCount: number };

function render(initial: Props) {
  return renderHook(
    ({ sortBy, epoch, worktreeCount }: Props) =>
      useSettledSortEpoch({ sortBy, sortEpoch: epoch, worktreeCount }),
    { initialProps: initial }
  );
}

describe("useSettledSortEpoch (Orca parity)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("holds a Smart epoch until the settle window elapses", () => {
    const { result, rerender } = render({ sortBy: "smart", epoch: 1, worktreeCount: 4 });
    expect(result.current).toBe(1);

    rerender({ sortBy: "smart", epoch: 2, worktreeCount: 4 });
    act(() => {
      vi.advanceTimersByTime(SORT_SETTLE_MS - 1);
    });
    expect(result.current).toBe(1);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe(2);
  });

  it("restarts the window on a burst so only the last epoch lands", () => {
    const { result, rerender } = render({ sortBy: "recent", epoch: 1, worktreeCount: 3 });
    rerender({ sortBy: "recent", epoch: 2, worktreeCount: 3 });
    act(() => {
      vi.advanceTimersByTime(SORT_SETTLE_MS - 1);
    });
    rerender({ sortBy: "recent", epoch: 3, worktreeCount: 3 });
    act(() => {
      vi.advanceTimersByTime(SORT_SETTLE_MS - 1);
    });
    expect(result.current).toBe(1);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe(3);
  });

  it("applies a structural change immediately", () => {
    const { result, rerender } = render({ sortBy: "smart", epoch: 1, worktreeCount: 4 });
    rerender({ sortBy: "smart", epoch: 2, worktreeCount: 5 });
    expect(result.current).toBe(2);
  });

  it("applies a Manual reorder immediately", () => {
    const { result, rerender } = render({ sortBy: "manual", epoch: 1, worktreeCount: 4 });
    rerender({ sortBy: "manual", epoch: 2, worktreeCount: 4 });
    expect(result.current).toBe(2);
  });
});
