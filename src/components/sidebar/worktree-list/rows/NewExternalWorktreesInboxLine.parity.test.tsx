// Parity guard for the compact discovered-worktree pill — Orca's second (continuous)
// inbox phase (`components/sidebar/NewExternalWorktreesInboxLine.tsx`): `(N) hidden
// worktree(s)` + count badge + `›`, with a suppressing `×` in the hover slot. Clicking
// the row opens the `Non-Hydra worktrees` visibility dialog.
// Gate: renders only once the repo's prompt completed
// (`externalWorktreeVisibilityPromptDismissedAt != null`) and it did not opt out.
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { RenderResult } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { GitWorktreeInfo } from "../../types";
import { NewExternalWorktreesInboxLine } from "./NewExternalWorktreesInboxLine";

function worktree(path: string, branch: string): GitWorktreeInfo {
  return { path, branch, head_commit: "abc123", is_bare: false, is_locked: false };
}

const REPO_WT_A = worktree("/home/me/src/repo/wt-a", "feature/a");
const REPO_WT_B = worktree("/home/me/src/repo/wt-b", "feature/b");
const OTHER_WT_C = worktree("/home/me/src/other/wt-c", "fix/c");
const HIDDEN = [REPO_WT_A, REPO_WT_B, OTHER_WT_C];

function renderLine(
  props: Partial<ComponentProps<typeof NewExternalWorktreesInboxLine>> = {}
): RenderResult {
  return render(
    <TooltipProvider>
      <NewExternalWorktreesInboxLine
        repoDisplayName="repo"
        hiddenWorktrees={HIDDEN}
        promptDismissedAt={1_700_000_000_000}
        onReview={vi.fn()}
        onSuppress={vi.fn()}
        {...props}
      />
    </TooltipProvider>
  );
}

describe("NewExternalWorktreesInboxLine (Orca parity)", () => {
  it("shows the count, the badge and the review control without expanding anything", () => {
    renderLine();

    expect(screen.getByText("hidden worktrees")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Review 3 hidden worktrees in repo" })
    ).toBeInTheDocument();
    // This surface is a pill only — it never renders the notice body or footer.
    expect(screen.queryByText("Change this later from the project menu.")).toBeNull();
    expect(screen.queryByText("feature/a")).toBeNull();
  });

  it("uses the singular label for a single hidden worktree", () => {
    renderLine({ hiddenWorktrees: [REPO_WT_A] });

    expect(screen.getByText("hidden worktree")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Review 1 hidden worktree in repo" })
    ).toBeInTheDocument();
  });

  it("opens the visibility dialog from the row and suppresses from the ×", () => {
    const onReview = vi.fn();
    const onSuppress = vi.fn();
    renderLine({ onReview, onSuppress });

    fireEvent.click(screen.getByRole("button", { name: "Review 3 hidden worktrees in repo" }));
    expect(onReview).toHaveBeenCalledTimes(1);

    fireEvent.click(
      screen.getByRole("button", { name: "Hide external worktrees permanently for repo" })
    );
    expect(onSuppress).toHaveBeenCalledTimes(1);
    // The × is a separate control: it must not also open the dialog.
    expect(onReview).toHaveBeenCalledTimes(1);
  });

  it("stays hidden outside the continuous phase", () => {
    // Prompt still pending: the expandable notice owns the row.
    const pending = renderLine({ promptDismissedAt: null });
    expect(pending.container).toBeEmptyDOMElement();

    const suppressed = renderLine({ suppressed: true });
    expect(suppressed.container).toBeEmptyDOMElement();

    const baselined = renderLine({
      baselinePaths: [REPO_WT_A.path, REPO_WT_B.path, OTHER_WT_C.path],
    });
    expect(baselined.container).toBeEmptyDOMElement();

    const noneHidden = renderLine({ hiddenWorktrees: [] });
    expect(noneHidden.container).toBeEmptyDOMElement();
  });

  it("counts only the paths the baseline did not acknowledge", () => {
    renderLine({ baselinePaths: [REPO_WT_A.path] });

    expect(screen.getByText("2")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Review 2 hidden worktrees in repo" })
    ).toBeInTheDocument();
  });
});
