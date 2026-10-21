import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DetailHeader, MetadataActionIcon } from "./worktree-card-detail-controls";

function wrap(node: React.ReactNode) {
  return render(<TooltipProvider>{node}</TooltipProvider>);
}

describe("worktree detail section controls (Orca parity)", () => {
  it("renders the header icon, label and actions slot", () => {
    wrap(
      <DetailHeader
        icon={<span data-testid="icon" />}
        label="Notes"
        actions={<button type="button">edit</button>}
      />
    );
    expect(screen.getByText("Notes")).toBeInTheDocument();
    expect(screen.getByTestId("icon")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "edit" })).toBeInTheDocument();
  });

  it("renders an action as a tooltip button that stops card activation", () => {
    const onClick = vi.fn();
    const parentClick = vi.fn();
    wrap(
      <div onClick={parentClick}>
        <MetadataActionIcon label="Edit workspace metadata" onClick={onClick}>
          <span>icon</span>
        </MetadataActionIcon>
      </div>
    );

    const button = screen.getByRole("button", { name: "Edit workspace metadata" });
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(parentClick).not.toHaveBeenCalled();
  });

  it("renders an action as an external link when given an href", () => {
    const parentClick = vi.fn();
    wrap(
      <div onClick={parentClick}>
        <MetadataActionIcon label="Open issue" href="https://example.com/issue/1">
          <span>icon</span>
        </MetadataActionIcon>
      </div>
    );

    const link = screen.getByRole("link", { name: "Open issue" });
    expect(link).toHaveAttribute("href", "https://example.com/issue/1");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noreferrer");
    fireEvent.click(link);
    expect(parentClick).not.toHaveBeenCalled();
  });
});
