// Parity guard for the discovered-worktree NOTICE (first inbox phase). Orca's rule
// (`ImportedWorktreesVisibilityLine.tsx` + `shared/external-worktree-inbox.ts:84-120`):
//   inbox rows = hidden externals MINUS `externalWorktreeInboxBaselinePaths`
// The line is collapsed by default; expanding groups rows by parent path, each group
// carrying its own count and previewing `PREVIEW_LIMIT` bullets (`Show N more` past
// that), at most `GROUP_LIMIT` groups (`+ N more locations` past that). The header `×`
// keeps the listed paths hidden (`KEEP_HIDDEN_LABEL`) and the footer offers Keep hidden
// (baseline) / Show (import).
// Gate: this is the first phase — it renders while the repo's initial visibility prompt
// is pending (`externalWorktreeVisibilityPromptDismissedAt == null`) and hands the row
// over to the compact pill (`NewExternalWorktreesInboxLine`) once it is stamped.
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { RenderResult } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { GitWorktreeInfo } from "../../types";
import {
  ImportedWorktreesVisibilityLine,
  getExternalWorktreeParentPath,
  groupWorktreesByParentPath,
  mergeExternalWorktreeInboxPaths,
  selectInboxWorktrees,
} from "./ImportedWorktreesVisibilityLine";

function worktree(path: string, branch: string): GitWorktreeInfo {
  return { path, branch, head_commit: "abc123", is_bare: false, is_locked: false };
}

const REPO_WT_A = worktree("/home/me/src/repo/wt-a", "feature/a");
const REPO_WT_B = worktree("/home/me/src/repo/wt-b", "feature/b");
const OTHER_WT_C = worktree("/home/me/src/other/wt-c", "fix/c");
const HIDDEN = [REPO_WT_A, REPO_WT_B, OTHER_WT_C];

function renderLine(
  props: Partial<ComponentProps<typeof ImportedWorktreesVisibilityLine>> = {}
): RenderResult {
  return render(
    <TooltipProvider>
      <ImportedWorktreesVisibilityLine
        repoDisplayName="repo"
        hiddenWorktrees={HIDDEN}
        onKeepHidden={vi.fn()}
        onShow={vi.fn()}
        {...props}
      />
    </TooltipProvider>
  );
}

describe("ImportedWorktreesVisibilityLine (Orca parity)", () => {
  it("states the discovered count, keeps the body collapsed, and offers the keep-hidden ×", () => {
    renderLine();

    expect(screen.getByText("Hiding 3 discovered worktrees")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Expand 3 hidden worktrees for repo" })).toBeInTheDocument();
    // Orca drops the count badge: the text already carries the count, so the header
    // renders no second "3" alongside it.
    expect(screen.queryAllByText("3")).toHaveLength(0);
    expect(
      screen.getByRole("button", {
        name: "Keep 3 discovered worktrees hidden for repo; recover from the project menu",
      })
    ).toBeInTheDocument();
    // Collapsed by default: only the header exists until the chevron is pressed.
    expect(screen.queryByText("Change this later from the project menu.")).toBeNull();
    expect(screen.queryByText("feature/a")).toBeNull();
  });

  it("expands into parent-path groups with per-folder counts and branch bullets", () => {
    renderLine();

    fireEvent.click(screen.getByRole("button", { name: "Expand 3 hidden worktrees for repo" }));

    expect(screen.getByText("/home/me/src/repo")).toBeInTheDocument();
    expect(screen.getByText("/home/me/src/other")).toBeInTheDocument();
    // Each folder badge shows its own count (2 in repo/, 1 in other/).
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("feature/a")).toBeInTheDocument();
    expect(screen.getByText("feature/b")).toBeInTheDocument();
    expect(screen.getByText("fix/c")).toBeInTheDocument();
    expect(screen.getByText("Change this later from the project menu.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Collapse 3 hidden worktrees for repo" }));
    expect(screen.queryByText("Change this later from the project menu.")).toBeNull();
  });

  it("hands Keep hidden every listed path and Show one import per path", () => {
    const onKeepHidden = vi.fn();
    const onShow = vi.fn();
    renderLine({ onKeepHidden, onShow });

    fireEvent.click(screen.getByRole("button", { name: "Expand 3 hidden worktrees for repo" }));
    fireEvent.click(screen.getByRole("button", { name: "Keep hidden" }));
    expect(onKeepHidden).toHaveBeenCalledTimes(1);
    expect(onKeepHidden).toHaveBeenCalledWith([
      REPO_WT_A.path,
      REPO_WT_B.path,
      OTHER_WT_C.path,
    ]);

    fireEvent.click(screen.getByRole("button", { name: "Show in worktree list" }));
    expect(onShow).toHaveBeenCalledTimes(3);
    expect(onShow.mock.calls.map(([path]) => path)).toEqual([
      REPO_WT_A.path,
      REPO_WT_B.path,
      OTHER_WT_C.path,
    ]);
  });

  it("keeps every listed path hidden through the header × without expanding", () => {
    const onKeepHidden = vi.fn();
    renderLine({ onKeepHidden });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Keep 3 discovered worktrees hidden for repo; recover from the project menu",
      })
    );
    expect(onKeepHidden).toHaveBeenCalledTimes(1);
    expect(onKeepHidden).toHaveBeenCalledWith([
      REPO_WT_A.path,
      REPO_WT_B.path,
      OTHER_WT_C.path,
    ]);
    // The × only acknowledges: it never expands the grouped body.
    expect(screen.queryByText("Change this later from the project menu.")).toBeNull();
  });

  it("previews PREVIEW_LIMIT bullets per group behind Show N more / Show fewer", () => {
    const GROUP = [
      worktree("/home/me/src/repo/wt-1", "feature/1"),
      worktree("/home/me/src/repo/wt-2", "feature/2"),
      worktree("/home/me/src/repo/wt-3", "feature/3"),
      worktree("/home/me/src/repo/wt-4", "feature/4"),
    ];
    renderLine({ hiddenWorktrees: GROUP });

    fireEvent.click(screen.getByRole("button", { name: "Expand 4 hidden worktrees for repo" }));

    // Only the first three bullets render; the fourth is behind the toggle.
    expect(screen.getByText("feature/1")).toBeInTheDocument();
    expect(screen.getByText("feature/2")).toBeInTheDocument();
    expect(screen.getByText("feature/3")).toBeInTheDocument();
    expect(screen.queryByText("feature/4")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Show 1 more" }));
    expect(screen.getByText("feature/4")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show fewer" }));
    expect(screen.queryByText("feature/4")).toBeNull();
    expect(screen.getByText("feature/3")).toBeInTheDocument();
  });

  it("caps the rail at GROUP_LIMIT groups and summarizes the rest", () => {
    const MANY = Array.from({ length: 7 }, (_, index) =>
      worktree(`/home/me/src/g${index}/wt`, `feature/g${index}`)
    );
    renderLine({ hiddenWorktrees: MANY });

    fireEvent.click(screen.getByRole("button", { name: "Expand 7 hidden worktrees for repo" }));

    // Seven groups exist but only the first five get a rail entry.
    expect(screen.getByText("/home/me/src/g0")).toBeInTheDocument();
    expect(screen.getByText("/home/me/src/g4")).toBeInTheDocument();
    expect(screen.queryByText("/home/me/src/g5")).toBeNull();
    expect(screen.queryByText("/home/me/src/g6")).toBeNull();
    expect(screen.getByText("+ 2 more locations")).toBeInTheDocument();
  });

  it("stays closed when the repo opted out, nothing is hidden, or the prompt phase ended", () => {
    const suppressed = renderLine({ suppressed: true });
    expect(suppressed.container).toBeEmptyDOMElement();

    const baselined = renderLine({
      baselinePaths: [REPO_WT_A.path, REPO_WT_B.path, OTHER_WT_C.path],
    });
    expect(baselined.container).toBeEmptyDOMElement();

    const noneHidden = renderLine({ hiddenWorktrees: [] });
    expect(noneHidden.container).toBeEmptyDOMElement();

    // Prompt completed: the continuous-phase pill owns the row from here on.
    const prompted = renderLine({ promptDismissedAt: 1_700_000_000_000 });
    expect(prompted.container).toBeEmptyDOMElement();

    // Still pending: the notice is the discoverable path back into the list.
    const unprompted = renderLine({ baselinePaths: [REPO_WT_A.path] });
    expect(unprompted.container).not.toBeEmptyDOMElement();
    expect(screen.getByText("Hiding 2 discovered worktrees")).toBeInTheDocument();
  });

  it("subtracts the baseline so acknowledged paths are not offered again", () => {
    // The trailing slash is folded by the comparison key (oracle: POSIX is case-sensitive,
    // so only the spelled path is subtracted).
    renderLine({ baselinePaths: [`${REPO_WT_A.path}/`] });

    expect(screen.getByText("Hiding 2 discovered worktrees")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Expand 2 hidden worktrees for repo" }));
    expect(screen.queryByText("feature/a")).toBeNull();
    expect(screen.getByText("feature/b")).toBeInTheDocument();
    expect(screen.getByText("fix/c")).toBeInTheDocument();
  });
});

describe("discovered-worktree inbox helpers (Orca parity)", () => {
  it("groups by parent path, keeping insertion order", () => {
    const groups = groupWorktreesByParentPath([OTHER_WT_C, REPO_WT_A, REPO_WT_B]);
    expect(groups.map((group) => group.path)).toEqual(["/home/me/src/other", "/home/me/src/repo"]);
    expect(groups.map((group) => group.worktrees.length)).toEqual([1, 2]);
  });

  it("resolves parent paths for POSIX, Windows drive and UNC spellings", () => {
    expect(getExternalWorktreeParentPath("/home/me/src/repo/wt")).toBe("/home/me/src/repo");
    expect(getExternalWorktreeParentPath("/home/me/src/repo/wt/")).toBe("/home/me/src/repo");
    expect(getExternalWorktreeParentPath("C:\\src\\repo\\wt")).toBe("C:/src/repo");
    expect(getExternalWorktreeParentPath("C:/src/wt")).toBe("C:/src");
    expect(getExternalWorktreeParentPath("//server/share/wt")).toBe("//server/share");
    expect(getExternalWorktreeParentPath("/wt")).toBe("/");
    expect(getExternalWorktreeParentPath(undefined)).toBe("Unknown location");
    expect(getExternalWorktreeParentPath("")).toBe("Unknown location");
  });

  it("filters the baseline by normalized comparison path", () => {
    expect(selectInboxWorktrees(HIDDEN, [])).toHaveLength(3);
    expect(selectInboxWorktrees(HIDDEN, undefined)).toHaveLength(3);
    expect(selectInboxWorktrees(HIDDEN, ["/home/me/src/repo/wt-a/"])).toEqual([
      REPO_WT_B,
      OTHER_WT_C,
    ]);
  });

  it("merges baseline additions without duplicating or losing the caller's spelling", () => {
    expect(mergeExternalWorktreeInboxPaths(["/a/b/"], ["/a/b", "/c/d"])).toEqual([
      "/a/b/",
      "/c/d",
    ]);
    expect(mergeExternalWorktreeInboxPaths(undefined, ["/c/d"])).toEqual(["/c/d"]);
  });
});
