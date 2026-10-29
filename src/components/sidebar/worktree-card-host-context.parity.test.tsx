import { describe, expect, it } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { WorktreeCard } from "./WorktreeCard";

const project = {
  id: "repo_1",
  name: "hydra",
  path: "/repo/hydra",
  is_git: true,
  current_branch: "main",
};

const worktree = {
  path: "/repo/hydra",
  head_commit: "abc1234",
  branch: "main",
  is_bare: false,
  is_locked: false,
  is_main: true,
};

function renderCard(props: Record<string, unknown> = {}) {
  return render(
    <WorktreeCard
      worktree={worktree}
      project={project}
      repo={project}
      status="active"
      branch="main"
      {...props}
    />
  );
}

describe("worktree card host context + runtime state (D04a-108/002)", () => {
  it("paints the host chip when the mount resolves a label", () => {
    renderCard({ hostContextLabel: "Build server" });
    expect(screen.getByText("Build server")).toBeInTheDocument();
  });

  it("omits the chip for a single-host project", () => {
    renderCard();
    expect(screen.queryByText("Build server")).toBeNull();
  });

  it("dims the card while its runtime host is disconnected", () => {
    const { container } = renderCard({ isRuntimeDisconnected: true });
    const surface = container.querySelector("[data-worktree-card-surface]");
    expect(surface).toHaveClass("opacity-60");
  });

  it("does not dim a connected card", () => {
    const { container } = renderCard();
    const surface = container.querySelector("[data-worktree-card-surface]");
    expect(surface).not.toHaveClass("opacity-60");
  });
});
