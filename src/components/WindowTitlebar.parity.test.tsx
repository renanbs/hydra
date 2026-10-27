// D01-052: the titlebar's sidebar toggle used to hardcode "Toggle Left Sidebar
// (Ctrl+B)". Its label is now derived from the keybinding registry, so a remap (or
// an alias list) shows what the user actually has bound.
import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { useAppStore } from "@/store";
import { WindowTitlebar } from "./WindowTitlebar";

function toggleTitle(): string {
  const view = render(
    <WindowTitlebar
      title="hydra"
      isLeftOpen
      isRightOpen
      onToggleLeft={vi.fn()}
      onToggleRight={vi.fn()}
    />
  );
  const title = screen.getByRole("button", { name: "Toggle sidebar" }).getAttribute("title") ?? "";
  view.unmount();
  return title;
}

describe("WindowTitlebar sidebar toggle label (D01-052)", () => {
  it("labels the toggle with the registry shortcut", () => {
    useAppStore.setState({ keybindings: {} });
    expect(toggleTitle()).toMatch(/^Toggle sidebar \(.+\)$/);
  });

  it("reflects a remapped chord instead of a hardcoded one", () => {
    useAppStore.setState({ keybindings: {} });
    const defaultTitle = toggleTitle();

    useAppStore.setState({ keybindings: { "sidebar.left.toggle": ["Ctrl+Alt+B"] } });
    const remappedTitle = toggleTitle();

    expect(remappedTitle).not.toBe(defaultTitle);
    expect(remappedTitle).toContain("Alt");
  });
});
