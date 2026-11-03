import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useAppStore } from "@/store";
import type { PendingWorktreeCreation } from "@/lib/pending-worktree-creation";
import { PendingWorktreeCreationRow } from "./PendingWorktreeCreationRow";

function pendingEntry(
  overrides: Partial<PendingWorktreeCreation> = {}
): PendingWorktreeCreation {
  return {
    creationId: "creation_1",
    phase: "creating",
    status: "creating",
    startedAt: 0,
    indeterminate: false,
    loaderVisible: true,
    request: {
      repoId: "repo_a",
      name: "feat-row",
      displayName: "feat-row",
    } as PendingWorktreeCreation["request"],
    ...overrides,
  };
}

function seed(entry: PendingWorktreeCreation): void {
  useAppStore.setState({
    pendingWorktreeCreations: { [entry.creationId]: entry },
    activePendingCreationId: entry.creationId,
  });
}

describe("PendingWorktreeCreationRow (Orca parity, D03b-021/022)", () => {
  beforeEach(() => {
    useAppStore.setState({ pendingWorktreeCreations: {}, activePendingCreationId: null });
  });

  it("paints the workspace name with its progress label", () => {
    seed(pendingEntry());
    render(<PendingWorktreeCreationRow creationId="creation_1" repoName="repo" />);
    const row = screen.getByRole("status");
    expect(row).toHaveAttribute("data-pending-worktree-creation-id", "creation_1");
    expect(screen.getByText("feat-row")).toBeTruthy();
    expect(screen.getByText("Creating worktree…")).toBeTruthy();
    expect(screen.getByText("repo")).toBeTruthy();
  });

  it("paints the failure reason instead of progress", () => {
    seed(pendingEntry({ status: "error", error: "git worktree add failed" }));
    render(<PendingWorktreeCreationRow creationId="creation_1" />);
    expect(screen.getByText("git worktree add failed")).toBeTruthy();
    expect(screen.getByLabelText("Worktree creation failed")).toBeTruthy();
  });

  it("cancels through removePendingWorktreeCreation", () => {
    seed(pendingEntry());
    render(<PendingWorktreeCreationRow creationId="creation_1" />);
    fireEvent.click(screen.getByLabelText("Cancel worktree creation"));
    expect(useAppStore.getState().pendingWorktreeCreations).toEqual({});
    expect(useAppStore.getState().activePendingCreationId).toBeNull();
  });

  it("routes a click to the creation content surface", () => {
    seed(pendingEntry());
    useAppStore.setState({ activePendingCreationId: null });
    render(<PendingWorktreeCreationRow creationId="creation_1" />);
    fireEvent.click(screen.getByText("feat-row"));
    expect(useAppStore.getState().activePendingCreationId).toBe("creation_1");
  });

  it("renders nothing for a settled creation", () => {
    const { container } = render(<PendingWorktreeCreationRow creationId="missing" />);
    expect(container.innerHTML).toBe("");
  });
});
