import { afterEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WorktreeCardDetailsHover } from "./WorktreeCardDetailsHover";

const WORKTREE = {
  path: "/repo/wt",
  branch: "feat/x",
  head_commit: "abcdef1234",
  is_bare: false,
  is_locked: false,
};

function openHover(overrides: Partial<Parameters<typeof WorktreeCardDetailsHover>[0]> = {}) {
  const onEditMetadata = vi.fn();
  render(
    <TooltipProvider>
      <WorktreeCardDetailsHover
        worktree={WORKTREE}
        project={{ id: "p", name: "hydra", path: "/repo", is_git: true, current_branch: "main" }}
        metadata={{
          comment: "**bold note**",
          linkedIssue: 12,
          linkedPR: 34,
          linkedLinearIssue: "ENG-7",
        }}
        onEditMetadata={onEditMetadata}
        {...overrides}
      >
        <span>card</span>
      </WorktreeCardDetailsHover>
    </TooltipProvider>
  );
  act(() => {
    vi.advanceTimersByTime(200);
  });
  fireEvent.mouseEnter(screen.getByText("card").parentElement!);
  act(() => {
    vi.advanceTimersByTime(200);
  });
  return { onEditMetadata };
}

describe("WorktreeCardDetailsHover metadata sections (Orca parity)", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders issue, review and Linear sections and the compact markdown note", async () => {
    vi.useFakeTimers();
    openHover();

    expect(screen.getByText("Issue")).toBeInTheDocument();
    expect(screen.getByText("#12")).toBeInTheDocument();
    expect(screen.getByText("Review")).toBeInTheDocument();
    expect(screen.getByText("#34")).toBeInTheDocument();
    expect(screen.getByText("Linear")).toBeInTheDocument();
    expect(screen.getByText("ENG-7")).toBeInTheDocument();
    // The markdown renderer is a lazy chunk; the raw-text fallback paints first.
    vi.useRealTimers();
    expect((await screen.findByText("bold note", undefined, { timeout: 5000 })).tagName).toBe(
      "STRONG"
    );
  });

  it("offers the metadata edit action from the section header", () => {
    vi.useFakeTimers();
    const { onEditMetadata } = openHover();
    fireEvent.click(screen.getByRole("button", { name: "Edit workspace metadata" }));
    expect(onEditMetadata).toHaveBeenCalledTimes(1);
  });

  it("shows the CLI provenance section only for CLI-created workspaces", () => {
    vi.useFakeTimers();
    openHover({ cliCreated: true });
    expect(screen.getByText("Created by CLI")).toBeInTheDocument();
  });
});
