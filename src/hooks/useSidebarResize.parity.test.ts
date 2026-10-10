import React from "react";
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clampSidebarResizeWidth,
  getNextSidebarResizeWidth,
  getRenderedSidebarWidthCssValue,
  useSidebarResize,
} from "./useSidebarResize";

type CaptureTarget = Element & {
  setPointerCapture: (pointerId: number) => void;
  releasePointerCapture: (pointerId: number) => void;
  hasPointerCapture: (pointerId: number) => boolean;
};

function captureTarget(): CaptureTarget {
  return {
    setPointerCapture: vi.fn(),
    releasePointerCapture: vi.fn(),
    hasPointerCapture: vi.fn(() => true),
  } as unknown as CaptureTarget;
}

function pointerEvent(target: Element, clientX: number, pointerId: number): React.PointerEvent {
  return {
    preventDefault: vi.fn(),
    clientX,
    pointerId,
    currentTarget: target,
  } as unknown as React.PointerEvent;
}

function renderResize(overrides?: {
  width?: number;
  defaultWidth?: number;
  setWidth?: (width: number) => void;
}) {
  const setWidth = overrides?.setWidth ?? vi.fn();
  return renderHook(() =>
    useSidebarResize<HTMLElement>({
      isOpen: true,
      width: overrides?.width ?? 280,
      minWidth: 220,
      maxWidth: 500,
      deltaSign: 1,
      defaultWidth: overrides?.defaultWidth ?? 280,
      setWidth,
    })
  );
}

afterEach(() => {
  document.body.style.cursor = "";
  document.body.style.userSelect = "";
});

describe("useSidebarResize helpers", () => {
  it("clamps sidebar widths to the Orca bounds", () => {
    expect(clampSidebarResizeWidth(100, 220, 500)).toBe(220);
    expect(clampSidebarResizeWidth(320, 220, 500)).toBe(320);
    expect(clampSidebarResizeWidth(640, 220, 500)).toBe(500);
  });

  it("grows the sidebar as the pointer moves right", () => {
    expect(
      getNextSidebarResizeWidth({
        clientX: 460,
        startX: 400,
        startWidth: 280,
        deltaSign: 1,
        minWidth: 220,
        maxWidth: 500,
      })
    ).toBe(340);
  });

  it("renders closed sidebars at zero width", () => {
    expect(getRenderedSidebarWidthCssValue(false, 280, 40)).toBe("0px");
    expect(getRenderedSidebarWidthCssValue(true, 280, 40)).toBe("320px");
  });
});

describe("useSidebarResize pointer capture and reset (D01-003)", () => {
  it("captures the pointer on start and releases it when the drag ends", () => {
    const target = captureTarget();
    const { result } = renderResize();

    act(() => {
      result.current.onResizeStart(pointerEvent(target, 300, 7));
    });

    expect(target.setPointerCapture).toHaveBeenCalledWith(7);
    expect(document.body.style.cursor).toBe("col-resize");

    act(() => {
      window.dispatchEvent(new MouseEvent("mouseup"));
    });

    expect(target.releasePointerCapture).toHaveBeenCalledWith(7);
    expect(document.body.style.cursor).toBe("");
  });

  it("restores the default width on double-click reset", () => {
    const setWidth = vi.fn();
    const { result } = renderResize({ width: 400, defaultWidth: 280, setWidth });

    act(() => {
      result.current.onResizeReset();
    });

    expect(setWidth).toHaveBeenCalledWith(280);
  });

  it("clamps the reset width to the configured bounds", () => {
    const setWidth = vi.fn();
    const { result } = renderResize({ width: 400, defaultWidth: 900, setWidth });

    act(() => {
      result.current.onResizeReset();
    });

    expect(setWidth).toHaveBeenCalledWith(500);
  });
});
