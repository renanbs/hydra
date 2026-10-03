// Parity guard for the discovered-worktree inbox. Orca's rule
// (`ImportedWorktreesVisibilityLine.tsx` + `shared/external-worktree-inbox.ts:84-120`):
//   inbox rows = hidden externals MINUS `externalWorktreeInboxBaselinePaths`
// The line is collapsed by default; expanding groups rows by parent path, each group
// carrying its own count, and the footer offers Keep hidden (baseline) / Show (import).
// Gate: every hidden worktree shows unless the repo opted out (`suppressed`). Orca also
// requires `externalWorktreeVisibilityPromptDismissedAt`, but Hydra has no initial-prompt
// surface yet, so gating on it would hide worktrees with no path back in the sidebar —
// the timestamp is stamped by the first inbox action instead.
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { RenderResult } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { GitWorktreeInfo } from "../../types";
import {
  NewExternalWorktreesInboxLine,
  getExternalWorktreeParentPath,
  groupWorktreesByParentPath,
  mergeExternalWorktreeInboxPaths,
  selectInboxWorktrees,
} from "./NewExternalWorktreesInboxLine";

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
        onSuppress={vi.fn()}
        {...props}
      />
    </TooltipProvider>
  );
}

describe("NewExternalWorktreesInboxLine (Orca parity)", () => {
  it("states the discovered count, keeps the body collapsed, and offers suppress", () => {
    renderLine();

    expect(screen.getByText("Hiding 3 discovered worktrees")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Expand 3 hidden worktrees for repo" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Hide external worktrees permanently for repo" })
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

  it("suppresses through the header × without expanding", () => {
    const onSuppress = vi.fn();
    renderLine({ onSuppress });

    fireEvent.click(
      screen.getByRole("button", { name: "Hide external worktrees permanently for repo" })
    );
    expect(onSuppress).toHaveBeenCalledTimes(1);
  });

  it("stays closed only when the repo opted out or nothing is hidden", () => {
    const suppressed = renderLine({ suppressed: true });
    expect(suppressed.container).toBeEmptyDOMElement();

    const baselined = renderLine({
      baselinePaths: [REPO_WT_A.path, REPO_WT_B.path, OTHER_WT_C.path],
    });
    expect(baselined.container).toBeEmptyDOMElement();

    const noneHidden = renderLine({ hiddenWorktrees: [] });
    expect(noneHidden.container).toBeEmptyDOMElement();

    // No prompt timestamp yet (Hydra has no initial-prompt surface): the worktrees
    // are still discoverable, otherwise they would be unreachable from the sidebar.
    const unprompted = renderLine({
      baselinePaths: [REPO_WT_A.path],
    });
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
