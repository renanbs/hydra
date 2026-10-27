import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useWorkspaceBoardPanel } from "./use-workspace-board-panel";

describe("useWorkspaceBoardPanel drag preview (D03a-012)", () => {
  it("opens the board as a preview, solidifies on commit and closes on cancel", () => {
    const { result } = renderHook(() => useWorkspaceBoardPanel());

    act(() => result.current.previewWorkspaceBoardFromDrag());
    expect(result.current.workspaceBoardOpen).toBe(true);
    expect(result.current.workspaceBoardDragPreviewOpen).toBe(true);

    act(() => result.current.solidifyWorkspaceBoardFromDrag());
    expect(result.current.workspaceBoardOpen).toBe(true);
    expect(result.current.workspaceBoardDragPreviewOpen).toBe(false);

    act(() => result.current.cancelWorkspaceBoardDragPreview());
    expect(result.current.workspaceBoardOpen).toBe(false);
  });

  it("does not preview over a board the user already opened", () => {
    const { result } = renderHook(() => useWorkspaceBoardPanel());
    act(() => result.current.toggleWorkspaceBoard());
    const openBefore = result.current.workspaceBoardOpen;

    act(() => result.current.previewWorkspaceBoardFromDrag());
    expect(result.current.workspaceBoardOpen).toBe(openBefore);
    expect(result.current.workspaceBoardDragPreviewOpen).toBe(false);
  });
});
