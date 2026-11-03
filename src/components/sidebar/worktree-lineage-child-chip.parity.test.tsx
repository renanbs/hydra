// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/worktree-card-secondary-rows.tsx (lineage child chip)
import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WorktreeLineageChildChip } from "./worktree-lineage-child-chip";

function renderChip(node: React.ReactNode) {
  return render(<TooltipProvider>{node}</TooltipProvider>);
}

describe("WorktreeLineageChildChip (D11-014)", () => {
  it("renders nothing for a leaf card", () => {
    const { container } = renderChip(
      <WorktreeLineageChildChip childCount={0} collapsed={false} onToggle={vi.fn()} />
    );
    expect(container.querySelector("[data-worktree-lineage-child-chip]")).toBeNull();
  });

  it("renders nothing when the card has no lineage toggle", () => {
    const { container } = renderChip(
      <WorktreeLineageChildChip childCount={2} collapsed={false} />
    );
    expect(container.querySelector("[data-worktree-lineage-child-chip]")).toBeNull();
  });

  it("labels one child and reports the expanded state", () => {
    renderChip(<WorktreeLineageChildChip childCount={1} collapsed={false} onToggle={vi.fn()} />);
    const button = screen.getByRole("button", { name: "Hide 1 child workspace" });
    expect(button).toHaveTextContent("1 child");
    expect(button).toHaveAttribute("aria-expanded", "true");
  });

  it("labels many child workspaces and reports the collapsed state", () => {
    renderChip(<WorktreeLineageChildChip childCount={3} collapsed onToggle={vi.fn()} />);
    const button = screen.getByRole("button", { name: "Show 3 child workspaces" });
    expect(button).toHaveTextContent("3 children");
    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  it("forwards the toggle without activating the card", () => {
    const onToggle = vi.fn((event: React.MouseEvent<HTMLButtonElement>) =>
      event.stopPropagation()
    );
    const onCardActivate = vi.fn();
    renderChip(
      <div onClick={onCardActivate}>
        <WorktreeLineageChildChip childCount={2} collapsed={false} onToggle={onToggle} />
      </div>
    );
    fireEvent.click(screen.getByRole("button", { name: "Hide 2 child workspaces" }));
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onCardActivate).not.toHaveBeenCalled();
  });
});
