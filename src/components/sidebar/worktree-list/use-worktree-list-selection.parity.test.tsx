import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { createRef } from "react";
import { useWorktreeListSelection } from "./use-worktree-list-selection";

function setup() {
  const container = document.createElement("div");
  const row = document.createElement("div");
  container.appendChild(row);
  document.body.appendChild(container);
  const containerRef = createRef<HTMLElement>();
  // @ts-expect-error test ref
  containerRef.current = container;
  const hook = renderHook(() =>
    useWorktreeListSelection({ visibleIdentities: ["local:a", "local:b"], containerRef })
  );
  return { container, row, hook };
}

describe("useWorktreeListSelection", () => {
  it("replaces the selection when right-clicking a row outside it", () => {
    const { hook } = setup();
    act(() => hook.result.current.selectForContextMenu("local:b"));
    expect([...hook.result.current.selectedWorktreeIdentities]).toEqual(["local:b"]);
  });

  it("keeps a multi-selection when the right-clicked row is part of it", () => {
    const { hook } = setup();
    act(() => hook.result.current.selectForContextMenu("local:b"));
    act(() => hook.result.current.selectForContextMenu("local:b"));
    expect([...hook.result.current.selectedWorktreeIdentities]).toEqual(["local:b"]);
  });

  it("clears the selection on a press outside the list, but not inside it", () => {
    const { container, row, hook } = setup();
    act(() => hook.result.current.selectForContextMenu("local:a"));
    act(() => {
      row.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    });
    expect(hook.result.current.selectedWorktreeIdentities.size).toBe(1);

    act(() => {
      document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    });
    expect(hook.result.current.selectedWorktreeIdentities.size).toBe(0);
    container.remove();
  });
});
