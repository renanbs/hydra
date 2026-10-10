import React from "react";
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  SidebarChrome,
  WORKTREE_SIDEBAR_RESIZE_HANDLE_CLASS_NAME,
  WORKTREE_SIDEBAR_RESIZE_HANDLE_LINE_CLASS_NAME,
} from "./SidebarChrome";

function renderChrome(overrides?: { isResizing?: boolean }) {
  const onResizeStart = vi.fn();
  const onResizeReset = vi.fn();
  const containerRef = React.createRef<HTMLElement>();
  render(
    <SidebarChrome
      containerRef={containerRef}
      onResizeStart={onResizeStart}
      onResizeReset={onResizeReset}
      isResizing={overrides?.isResizing ?? false}
    >
      <div data-sidebar-body="" />
    </SidebarChrome>
  );
  const handle = document.querySelector<HTMLElement>("[data-sidebar-resize-handle]");
  return { onResizeStart, onResizeReset, containerRef, handle };
}

describe("SidebarChrome shell (D01-001/D01-003)", () => {
  it("renders the aside with data-sidebar and the resize handle", () => {
    const { containerRef, handle } = renderChrome();

    const aside = document.querySelector("aside[data-sidebar]");
    expect(aside).not.toBeNull();
    expect(containerRef.current).toBe(aside);

    expect(handle).not.toBeNull();
    expect(handle!.className).toContain("cursor-col-resize");
    expect(handle!.className).toContain("absolute");
    expect(WORKTREE_SIDEBAR_RESIZE_HANDLE_LINE_CLASS_NAME).toContain("group-hover:bg-ring/50");
    expect(WORKTREE_SIDEBAR_RESIZE_HANDLE_LINE_CLASS_NAME).toContain("group-active:bg-ring");
  });

  it("starts the drag on pointer down and resets on double click", () => {
    const { onResizeStart, onResizeReset, handle } = renderChrome();

    fireEvent.pointerDown(handle!);
    expect(onResizeStart).toHaveBeenCalledTimes(1);

    fireEvent.doubleClick(handle!);
    expect(onResizeReset).toHaveBeenCalledTimes(1);
  });

  it("marks the handle while resizing", () => {
    const { handle } = renderChrome({ isResizing: true });
    expect(handle!.className).toContain("bg-ring/10");
  });
});
