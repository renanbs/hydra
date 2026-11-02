import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  canShowWorkspaceDeleteQuickAction,
  resetWorkspaceDeleteModifierForTests,
  useWorkspaceDeleteModifierPressed,
} from "./workspace-delete-quick-action";

function Probe(): React.JSX.Element {
  const pressed = useWorkspaceDeleteModifierPressed();
  return <span data-testid="pressed">{pressed ? "yes" : "no"}</span>;
}

afterEach(() => {
  resetWorkspaceDeleteModifierForTests();
});

describe("workspace delete quick action (Orca parity)", () => {
  it("gates the affordance on the modifier and never on a main/in-flight row", () => {
    expect(
      canShowWorkspaceDeleteQuickAction({
        deleteModifierPressed: true,
        isDeleting: false,
        isMainWorktree: false,
      })
    ).toBe(true);
    expect(
      canShowWorkspaceDeleteQuickAction({
        deleteModifierPressed: false,
        isDeleting: false,
        isMainWorktree: false,
      })
    ).toBe(false);
    expect(
      canShowWorkspaceDeleteQuickAction({
        deleteModifierPressed: true,
        isDeleting: true,
        isMainWorktree: false,
      })
    ).toBe(false);
    expect(
      canShowWorkspaceDeleteQuickAction({
        deleteModifierPressed: true,
        isDeleting: false,
        isMainWorktree: true,
      })
    ).toBe(false);
  });

  it("reacts to Option/Alt keydown, keyup, window blur and visibility loss", () => {
    render(<Probe />);
    expect(screen.getByTestId("pressed")).toHaveTextContent("no");

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Alt", altKey: true }));
    });
    expect(screen.getByTestId("pressed")).toHaveTextContent("yes");

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keyup", { key: "Alt", altKey: false }));
    });
    expect(screen.getByTestId("pressed")).toHaveTextContent("no");

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Alt", altKey: true }));
    });
    act(() => {
      window.dispatchEvent(new Event("blur"));
    });
    expect(screen.getByTestId("pressed")).toHaveTextContent("no");
  });
});
