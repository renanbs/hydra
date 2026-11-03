import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WorktreeCardDetailsHover } from "./WorktreeCardDetailsHover";

const WORKTREE = {
  path: "/repo/wt",
  branch: "feat/x",
  head_commit: "abcdef1234",
  is_bare: false,
  is_locked: false,
};

const OPEN_CONTROL = {
  hoverOpen: true,
  issueMenuOpen: false,
  reviewMenuOpen: false,
  handleHoverOpenChange: vi.fn(),
  handleIssueMenuOpenChange: vi.fn(),
  handleReviewMenuOpenChange: vi.fn(),
  closeHover: vi.fn(),
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
        // Why the explicit control: Radix hover input needs a pointer-capable
        // document, so the content contract is exercised through the public
        // open-state handle instead of a synthetic hover.
        hoverControl={OPEN_CONTROL}
        onEditMetadata={onEditMetadata}
        {...overrides}
      >
        <span>card</span>
      </WorktreeCardDetailsHover>
    </TooltipProvider>
  );
  return { onEditMetadata };
}

describe("WorktreeCardDetailsHover metadata sections (Orca parity)", () => {
  it("renders issue, review and Linear sections and the compact markdown note", async () => {
    openHover();

    // Orca section headings name the work item, not the slots: "Issue #12".
    expect(screen.getByText("Issue #12")).toBeInTheDocument();
    expect(screen.getByText("PR #34")).toBeInTheDocument();
    expect(screen.getByText("Linear ENG-7")).toBeInTheDocument();
    // The markdown renderer is a lazy chunk; the raw-text fallback paints first.
    expect((await screen.findByText("bold note", undefined, { timeout: 5000 })).tagName).toBe(
      "STRONG"
    );
  });

  it("offers the metadata edit action from the section header", () => {
    const { onEditMetadata } = openHover();
    fireEvent.click(screen.getByRole("button", { name: "Edit workspace metadata" }));
    expect(onEditMetadata).toHaveBeenCalledTimes(1);
  });

  it("shows the CLI provenance section only for CLI-created workspaces", () => {
    openHover({ cliCreated: true });
    expect(screen.getByText("CLI")).toBeInTheDocument();
  });

  it("projects a persisted Jira key into the section without inventing a URL", () => {
    openHover({
      metadata: {
        comment: "",
        linkedIssue: null,
        linkedPR: null,
        linkedLinearIssue: null,
        linkedJiraIssue: "OPS-9",
      },
    });
    expect(screen.getByText("Jira OPS-9")).toBeInTheDocument();
    // A bare key has no site URL, so the external action must stay absent.
    expect(screen.queryByRole("link", { name: "View on Jira" })).toBeNull();
  });

  it("derives the identifier from a persisted Jira URL and links it", () => {
    openHover({
      metadata: {
        comment: "",
        linkedIssue: null,
        linkedPR: null,
        linkedLinearIssue: null,
        linkedJiraIssue: "https://jira.example.com/browse/OPS-9",
      },
    });
    expect(screen.getByText("Jira OPS-9")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View on Jira" })).toHaveAttribute(
      "href",
      "https://jira.example.com/browse/OPS-9"
    );
  });

  it("renders the Jira section only when the provider projection exists", () => {
    openHover({
      jiraIssue: { identifier: "OPS-4", title: "Rotate the token", url: "https://jira/OPS-4" },
    });
    expect(screen.getByText("Jira OPS-4")).toBeInTheDocument();
    expect(screen.getByText("Rotate the token")).toBeInTheDocument();
  });
});
