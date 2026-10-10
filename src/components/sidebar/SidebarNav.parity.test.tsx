import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { formatShortcutKeyComboDetails } from "@/hooks/useShortcutLabel";
import { SidebarNav } from "./SidebarNav";

function renderNav() {
  const onOpenWorktreePalette = vi.fn();
  const utils = render(<SidebarNav onOpenWorktreePalette={onOpenWorktreePalette} />);
  return { onOpenWorktreePalette, ...utils };
}

describe("SidebarNav search entry (D01-016)", () => {
  it("opens the worktree palette on click", () => {
    const { onOpenWorktreePalette } = renderNav();

    fireEvent.click(
      screen.getByRole("button", { name: "Search worktrees and browser tabs" })
    );

    expect(onOpenWorktreePalette).toHaveBeenCalledTimes(1);
  });

  it("shows the real worktree.palette combo instead of a literal chip, revealed on hover and focus", () => {
    const { container } = renderNav();

    const chip = container.querySelector('[class*="group-focus-within:flex"]');
    expect(chip).not.toBeNull();
    expect(chip!.className).toContain("group-hover:flex");
    expect(chip!.className).toContain("group-focus-within:flex");

    const combos = formatShortcutKeyComboDetails("worktree.palette");
    expect(combos.length).toBeGreaterThan(0);
    for (const key of combos[0].keys) {
      expect(chip!.textContent).toContain(key);
    }

    expect(screen.queryByText("⌘P")).toBeNull();
  });
});
