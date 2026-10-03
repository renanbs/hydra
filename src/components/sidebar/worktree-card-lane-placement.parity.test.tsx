// Parity guard for WHERE the status lane lives. Orca mounts it inside the parent
// content, as a sibling of the header AND the meta row
// (`worktree-card-parent-content.tsx:135-150`), so the branch line under the title
// starts in the same column. Hydra mounted it inside the header once, which indented
// only the title and left the branch line outdented — the misalignment this locks out.
import { describe, expect, it } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render } from "@testing-library/react";
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

describe("worktree card status lane placement (Orca parity)", () => {
  it("renders the lane inside the parent content, not inside the header", () => {
    const { container } = render(
      <WorktreeCard worktree={worktree} project={project} repo={project} status="active" branch="main" />
    );

    const lane = container.querySelector("[data-worktree-card-status-slot]");
    expect(lane, "the card must render the status lane").not.toBeNull();

    const parentContent = container.querySelector("[data-worktree-card-parent-content]");
    expect(parentContent).not.toBeNull();
    expect(parentContent!.contains(lane!)).toBe(true);

    // The lane precedes the content column, so title and meta row share the column.
    expect(lane!.nextElementSibling).not.toBeNull();
    const metaRow = container.querySelector("[data-worktree-card-meta-row]");
    if (metaRow) {
      expect(lane!.compareDocumentPosition(metaRow) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });
});
