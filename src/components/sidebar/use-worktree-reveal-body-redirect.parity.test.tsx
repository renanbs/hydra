import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import {
  SIDEBAR_REVEAL_REQUEST_EVENT,
  useWorktreeRevealBodyRedirect,
} from "./use-worktree-reveal-body-redirect";

describe("useWorktreeRevealBodyRedirect (Orca parity)", () => {
  it("switches to workspaces on a reveal request and replays the path", () => {
    const onShowWorkspaces = vi.fn();
    const onReveal = vi.fn();
    const { rerender } = renderHook(
      ({ agents }) =>
        useWorktreeRevealBodyRedirect({
          agentsBodyShowing: agents,
          onShowWorkspaces,
          onReveal,
        }),
      { initialProps: { agents: true } }
    );

    act(() => {
      window.dispatchEvent(
        new CustomEvent(SIDEBAR_REVEAL_REQUEST_EVENT, { detail: { path: "/repo/wt" } })
      );
    });
    expect(onShowWorkspaces).toHaveBeenCalledTimes(1);
    expect(onReveal).not.toHaveBeenCalled();

    rerender({ agents: false });
    expect(onReveal).toHaveBeenCalledWith("/repo/wt");
  });

  it("does not capture requests while the workspaces body is already showing", () => {
    const onShowWorkspaces = vi.fn();
    renderHook(() =>
      useWorktreeRevealBodyRedirect({
        agentsBodyShowing: false,
        onShowWorkspaces,
        onReveal: vi.fn(),
      })
    );
    act(() => {
      window.dispatchEvent(new CustomEvent(SIDEBAR_REVEAL_REQUEST_EVENT));
    });
    expect(onShowWorkspaces).not.toHaveBeenCalled();
  });
});
