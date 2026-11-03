import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useAppStore } from "@/store";
import {
  TOGGLE_WORKSPACE_BOARD_EVENT,
  useWorkspaceBoardPanel,
} from "./use-workspace-board-panel";

describe("useWorkspaceBoardPanel drag preview (D08-002)", () => {
  it("renders as a preview without counting as a user open, solidifies on commit and closes on cancel", () => {
    const { result } = renderHook(() => useWorkspaceBoardPanel());

    act(() => result.current.previewWorkspaceBoardFromDrag());
    // Orca: a preview renders the sheet but is not the user's open.
    expect(result.current.workspaceBoardOpen).toBe(false);
    expect(result.current.workspaceBoardDragPreviewOpen).toBe(true);
    expect(result.current.workspaceBoardRenderedOpen).toBe(true);

    act(() => result.current.solidifyWorkspaceBoardFromDrag());
    expect(result.current.workspaceBoardOpen).toBe(true);
    expect(result.current.workspaceBoardDragPreviewOpen).toBe(false);

    act(() => result.current.cancelWorkspaceBoardDragPreview());
    expect(result.current.workspaceBoardOpen).toBe(true);
    expect(result.current.workspaceBoardDragPreviewOpen).toBe(false);
  });

  it("cancels an un-solidified preview back to closed", () => {
    const { result } = renderHook(() => useWorkspaceBoardPanel());

    act(() => result.current.previewWorkspaceBoardFromDrag());
    act(() => result.current.cancelWorkspaceBoardDragPreview());

    expect(result.current.workspaceBoardOpen).toBe(false);
    expect(result.current.workspaceBoardDragPreviewOpen).toBe(false);
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

describe('useWorkspaceBoardPanel open/close state (D08-001)', () => {
  it('records the feature interaction on a user open and on a solidified drag, never on a preview', () => {
    useAppStore.setState({ persistedUIReady: true, featureInteractions: {} })
    const { result } = renderHook(() => useWorkspaceBoardPanel())

    act(() => result.current.previewWorkspaceBoardFromDrag())
    expect(useAppStore.getState().featureInteractions['workspace-board']).toBeUndefined()

    act(() => result.current.solidifyWorkspaceBoardFromDrag())
    expect(
      useAppStore.getState().featureInteractions['workspace-board']?.interactionCount
    ).toBe(1)

    act(() => result.current.closeWorkspaceBoard())
    act(() => result.current.openWorkspaceBoard())
    expect(
      useAppStore.getState().featureInteractions['workspace-board']?.interactionCount
    ).toBe(2)
  })

  it('clears the drag preview and menu state when the board closes', () => {
    const { result } = renderHook(() => useWorkspaceBoardPanel())

    act(() => result.current.previewWorkspaceBoardFromDrag())
    act(() => result.current.setWorkspaceBoardMenuOpen(true))
    expect(result.current.workspaceBoardMenuOpen).toBe(true)

    act(() => result.current.closeWorkspaceBoard())
    expect(result.current.workspaceBoardDragPreviewOpen).toBe(false)
    expect(result.current.workspaceBoardMenuOpen).toBe(false)
    // Why not renderedOpen: the sheet deliberately outlives `open` by its close
    // animation, which is what the linger hook measures.
  })

  it('toggles from the registry event and ignores a preview when already open', () => {
    const { result } = renderHook(() => useWorkspaceBoardPanel())

    act(() => {
      window.dispatchEvent(new CustomEvent(TOGGLE_WORKSPACE_BOARD_EVENT))
    })
    expect(result.current.workspaceBoardOpen).toBe(true)

    act(() => result.current.previewWorkspaceBoardFromDrag())
    expect(result.current.workspaceBoardDragPreviewOpen).toBe(false)
  })
})
