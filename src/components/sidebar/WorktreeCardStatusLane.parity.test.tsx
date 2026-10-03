// Parity guard for the card's status lane. Orca's precedence is strict
// (`WorktreeCardStatusSlot.tsx:106-141`):
//   review glyph (merged = purple) > branch glyph (no PR, quiet status) > status dot
// and the swap only happens while the status is QUIET (`active | done | inactive`);
// a working or needs-attention pane must keep the activity dot.
import { describe, expect, it } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render } from "@testing-library/react";
import { WorktreeCardStatusLane } from "./WorktreeCardStatusLane";
import { getReviewStateTone } from "./pr-display";

const MERGED_PR = { number: 12, state: "merged" as const, status: null, provider: "github" };

describe("WorktreeCardStatusLane (Orca parity)", () => {
  it("paints the review glyph and its purple merged tone", () => {
    const { container } = render(
      <WorktreeCardStatusLane status="active" branch="feature/auth" prDisplay={MERGED_PR} />
    );
    const lane = container.querySelector('[data-worktree-status-lane="review"]');
    expect(lane).not.toBeNull();
    // Purple is what makes a merged PR readable at a glance.
    expect(container.querySelector("svg")?.getAttribute("class")).toContain("text-purple-400/70");
    expect(getReviewStateTone("merged")).toContain("purple");
  });

  it("falls back to the branch glyph when there is no PR", () => {
    const { container } = render(
      <WorktreeCardStatusLane status="active" branch="develop" prDisplay={null} />
    );
    expect(container.querySelector('[data-worktree-status-lane="branch"]')).not.toBeNull();
    expect(container.querySelector('[data-worktree-status-lane="review"]')).toBeNull();
  });

  it("keeps the status dot when the branch identity is empty", () => {
    const { container } = render(
      <WorktreeCardStatusLane status="inactive" branch="" prDisplay={null} />
    );
    expect(container.querySelector('[data-worktree-status-lane="status"]')).not.toBeNull();
    expect(container.querySelector("span.bg-neutral-500\\/40")).not.toBeNull();
  });

  it("does NOT hide activity behind a glyph while working or blocked", () => {
    const working = render(
      <WorktreeCardStatusLane status="working" branch="develop" prDisplay={MERGED_PR} />
    );
    expect(working.container.querySelector('[data-worktree-status-lane="review"]')).toBeNull();
    expect(working.container.querySelector("span.animate-spin")).not.toBeNull();

    const blocked = render(
      <WorktreeCardStatusLane status="permission" branch="develop" prDisplay={MERGED_PR} />
    );
    expect(blocked.container.querySelector('[data-worktree-status-lane="status"]')).not.toBeNull();
  });

  it("tones open reviews emerald and closed/draft muted (Orca getStateTone)", () => {
    expect(getReviewStateTone("open")).toContain("emerald");
    expect(getReviewStateTone("closed")).toContain("muted-foreground");
    expect(getReviewStateTone("draft")).toContain("muted-foreground");
  });
});
