import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useAppStore } from "@/store";
import type { PendingWorktreeCreation } from "@/lib/pending-worktree-creation";
import { PendingWorktreeCreationPanel } from "./PendingWorktreeCreationPanel";

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
      name: "feat-panel",
      displayName: "feat-panel",
    } as PendingWorktreeCreation["request"],
    ...overrides,
  };
}

describe("PendingWorktreeCreationPanel (D03b-021 routing surface)", () => {
  beforeEach(() => {
    useAppStore.setState({ pendingWorktreeCreations: {}, activePendingCreationId: null });
  });

  it("shows the active creation's progress and its cancel action", () => {
    const entry = pendingEntry();
    useAppStore.setState({
      pendingWorktreeCreations: { [entry.creationId]: entry },
      activePendingCreationId: entry.creationId,
    });
    render(<PendingWorktreeCreationPanel />);
    expect(screen.getByText("feat-panel")).toBeTruthy();
    expect(screen.getByText("Creating worktree…")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Cancel creation/ }));
    expect(useAppStore.getState().pendingWorktreeCreations).toEqual({});
    expect(useAppStore.getState().activePendingCreationId).toBeNull();
  });

  it("shows the failure reason and returns to workspaces without cancelling", () => {
    const entry = pendingEntry({ status: "error", error: "branch already exists" });
    useAppStore.setState({
      pendingWorktreeCreations: { [entry.creationId]: entry },
      activePendingCreationId: entry.creationId,
    });
    render(<PendingWorktreeCreationPanel />);
    expect(screen.getByText("branch already exists")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Back to workspaces/ }));
    expect(useAppStore.getState().activePendingCreationId).toBeNull();
    // The failed entry stays dismissible from the sidebar row.
    expect(useAppStore.getState().pendingWorktreeCreations[entry.creationId]).toBeTruthy();
  });

  it("renders nothing without an active creation", () => {
    const { container } = render(<PendingWorktreeCreationPanel />);
    expect(container.innerHTML).toBe("");
  });
});
