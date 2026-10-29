import { describe, expect, it } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render } from "@testing-library/react";
import { WorktreeCardReviewBadge } from "./WorktreeCardReviewBadge";

describe("WorktreeCardReviewBadge provider semantics (D04a-103)", () => {
  it("names a GitLab review as MR with the merge glyph", () => {
    const { container, getByLabelText } = render(
      <WorktreeCardReviewBadge review={{ pr_number: 7, state: "open", provider: "gitlab" }} />
    );
    expect(getByLabelText(/^MR #7/)).toBeInTheDocument();
    expect(container.querySelector("svg")?.getAttribute("class")).toContain("lucide-git-merge");
  });

  it("keeps GitHub reviews as PR with the pull-request glyph", () => {
    const { container, getByLabelText } = render(
      <WorktreeCardReviewBadge review={{ pr_number: 12, state: "open", provider: "github" }} />
    );
    expect(getByLabelText(/^PR #12/)).toBeInTheDocument();
    expect(container.querySelector("svg")?.getAttribute("class")).toContain(
      "lucide-git-pull-request"
    );
  });
});
