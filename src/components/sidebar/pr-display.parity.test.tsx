import { describe, expect, it } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render } from "@testing-library/react";
import {
  ReviewIcon,
  getProviderName,
  getReviewLabel,
  reviewLabel,
  reviewStatusLabel,
} from "./pr-display";
import type { PrDisplay } from "./pr-display";

const github: PrDisplay = { number: 12, state: "open", provider: "github" };
const gitlab: PrDisplay = { number: 7, state: "open", provider: "gitlab" };

describe("pr-display provider semantics (D04a-103)", () => {
  it("labels GitLab reviews as merge requests", () => {
    expect(getReviewLabel(github)).toBe("PR");
    expect(getReviewLabel(gitlab)).toBe("MR");
    expect(reviewLabel(gitlab)).toBe("MR #7");
    expect(reviewStatusLabel(gitlab)).toBe("MR #7: Open");
  });

  it("names the hosting provider", () => {
    expect(getProviderName(github)).toBe("GitHub");
    expect(getProviderName(gitlab)).toBe("GitLab");
    expect(getProviderName({ ...github, provider: "bitbucket" })).toBe("Bitbucket");
  });

  it("uses the provider glyph for an open review", () => {
    const pr = render(<ReviewIcon review={github} />);
    expect(pr.container.querySelector("svg")?.getAttribute("class")).toContain(
      "lucide-git-pull-request"
    );
    pr.unmount();

    const mr = render(<ReviewIcon review={gitlab} />);
    expect(mr.container.querySelector("svg")?.getAttribute("class")).toContain(
      "lucide-git-merge"
    );
  });

  it("keeps the state glyph ahead of the provider glyph when merged", () => {
    const merged = render(<ReviewIcon review={{ ...gitlab, state: "merged" }} />);
    expect(merged.container.querySelector("svg")?.getAttribute("class")).toContain(
      "lucide-git-merge"
    );
  });
});
