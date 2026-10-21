import { describe, expect, it } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  WorktreeCardMetaBadges,
  hasWorktreeCardDetails,
} from "./worktree-card-metadata-badges";

const EMPTY = { comment: "", linkedIssue: null, linkedLinearIssue: null };

describe("worktree card metadata badges (Orca parity)", () => {
  it("decides whether the card has any detail to show", () => {
    expect(hasWorktreeCardDetails({})).toBe(false);
    expect(hasWorktreeCardDetails({ comment: "  " })).toBe(false);
    expect(hasWorktreeCardDetails({ comment: "note" })).toBe(true);
    expect(hasWorktreeCardDetails({ linkedIssue: 12 })).toBe(true);
    expect(hasWorktreeCardDetails({ linkedLinearIssue: "ENG-7" })).toBe(true);
    expect(hasWorktreeCardDetails({ automationProvenance: {} })).toBe(true);
    expect(hasWorktreeCardDetails({ cliProvenance: {} })).toBe(true);
    expect(hasWorktreeCardDetails({ hasReview: true })).toBe(true);
  });

  it("renders icon badges with accessible labels for each metadata kind", () => {
    render(
      <TooltipProvider>
        <WorktreeCardMetaBadges
          metadata={{ comment: "note", linkedIssue: 12, linkedLinearIssue: "ENG-7" }}
          automationCreated
          cliCreated
          hasReview
        />
      </TooltipProvider>
    );

    expect(screen.getByRole("img", { name: "Workspace notes" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Created by automation" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Created by CLI" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Linked issue #12" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Linked Linear ENG-7" })).toBeInTheDocument();
  });

  it("renders nothing for an empty workspace", () => {
    const { container } = render(
      <WorktreeCardMetaBadges metadata={EMPTY} hasReview={false} />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
