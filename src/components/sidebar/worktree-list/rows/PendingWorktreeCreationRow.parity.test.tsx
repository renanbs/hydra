import { describe, expect, it } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { PendingWorktreeCreationRow } from "./PendingWorktreeCreationRow";

describe("PendingWorktreeCreationRow (Orca parity)", () => {
  it("shows the branch being created and the agent/repo context", () => {
    render(
      <PendingWorktreeCreationRow branchName="feat/x" agentName="Claude" repoName="hydra" />
    );
    expect(screen.getByRole("status")).toHaveTextContent("Creating feat/x…");
    expect(screen.getByText("Claude")).toBeInTheDocument();
    expect(screen.getByText("hydra")).toBeInTheDocument();
  });

  it("falls back to a generic workspace label", () => {
    render(<PendingWorktreeCreationRow />);
    expect(screen.getByRole("status")).toHaveTextContent("Creating workspace…");
  });

  it("addresses the optimistic row by creation id (D03a-072)", () => {
    const { container } = render(<PendingWorktreeCreationRow creationId="creation-1" />);
    expect(
      container.querySelector('[data-pending-worktree-creation-id="creation-1"]')
    ).not.toBeNull();
  });
});
