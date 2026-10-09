// Row measurement and overscan in the virtualized viewport. jsdom has no layout, so the two
// heights the list reads (the scroll container's and each slot's) come from the synthetic
// layout in `src/test-setup.ts`: a 480px viewport of 40px rows. What is asserted here is the
// window the virtualizer derives from those numbers — which rows get mounted, what the scroll
// content claims to be — and that scrolling moves the window with the offset.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { useAppStore } from "@/store";
import { WorktreeList } from "../../WorktreeList";
import type { GitWorktreeInfo, HydraProject } from "../../types";
import type { WorkspaceDisplayOptions } from "../../WorkspaceOptionsMenu";

const PROJECT: HydraProject = {
  id: "repo_a",
  name: "hydra",
  path: "/repo/hydra",
  is_git: true,
  current_branch: "main",
};

const ROW_PITCH = 44;
const WORKTREE_COUNT = 40;

function worktree(index: number): GitWorktreeInfo {
  return {
    path: `/repo/hydra/w${index}`,
    head_commit: "abc1234",
    branch: `w${index}`,
    is_bare: false,
    is_locked: false,
  };
}

const WORKTREES: GitWorktreeInfo[] = Array.from({ length: WORKTREE_COUNT }, (_, index) =>
  worktree(index)
);

const DISPLAY_OPTIONS: WorkspaceDisplayOptions = {
  groupBy: "repo",
  sortBy: "name",
  hideSleeping: false,
  hideDefaultBranch: false,
  hideAutomationCreated: false,
  hideCliCreated: false,
  hideDetachedHead: false,
};

function resetStore(): void {
  useAppStore.setState({
    repos: [],
    sshTargetLabels: new Map(),
    sshConnectionStates: new Map(),
    runtimeEnvironments: [],
    settings: null,
    visibleWorkspaceHostIds: [],
    workspaceHostScope: null,
    worktreeLineageById: {},
  });
}

function renderList(): HTMLElement {
  const { container } = render(
    <WorktreeList
      projects={[PROJECT]}
      displayProjects={[PROJECT]}
      activeProject={PROJECT}
      sessions={[]}
      collapsedProjects={new Set()}
      collapsedGroups={new Set()}
      displayOptions={DISPLAY_OPTIONS}
      getFilteredAndSortedWorktrees={() => WORKTREES}
      onSelectProject={vi.fn()}
      onSelectGitWorktree={vi.fn()}
      onDeleteGitWorktree={vi.fn()}
      onSelectSession={vi.fn()}
      onOpenNewWorkspaceModal={vi.fn()}
      onOpenAddRepoDialog={vi.fn()}
      onToggleProjectCollapse={vi.fn()}
      onToggleGroupCollapse={vi.fn()}
      onAssignWorktreeStatus={vi.fn()}
    />
  );
  return container;
}

/** Row indexes currently painted, read from the paths the cards carry. */
function mountedWorktreeIndexes(container: HTMLElement): number[] {
  return Array.from(container.querySelectorAll<HTMLElement>("[data-worktree-path]"))
    .map((row) => Number(/w(\d+)$/.exec(row.getAttribute("data-worktree-path") ?? "")?.[1]))
    .filter((index) => Number.isFinite(index));
}

describe("virtualized viewport window", () => {
  beforeEach(() => resetStore());
  afterEach(() => {
    cleanup();
    resetStore();
    vi.restoreAllMocks();
  });

  it("mounts a window of measured rows instead of the whole list", () => {
    const container = renderList();

    const indexes = mountedWorktreeIndexes(container);
    expect(indexes.length).toBeGreaterThan(0);
    expect(indexes.length).toBeLessThan(WORKTREE_COUNT);
    expect(indexes).toContain(0);
    expect(indexes).not.toContain(WORKTREE_COUNT - 1);
  });

  it("measures each painted slot instead of trusting the row estimate", () => {
    const container = renderList();

    const slots = Array.from(
      container.querySelectorAll<HTMLElement>("[data-worktree-virtual-row]")
    );
    // The first header is the measured 40px tall in the synthetic layout (28px would be the
    // estimate), so the second slot starts at 40 + the 4px rhythm.
    expect(slots[1]?.style.transform).toBe("translateY(44px)");

    const content = container.querySelector<HTMLElement>('[data-worktree-sidebar] > div');
    // Rows below the window are still on the estimate, so the total sits between "everything
    // measured" (1800) and "nothing measured" (the 116px card estimate: ~5k).
    const total = Number.parseInt(content?.style.height ?? "0", 10);
    expect(total).toBeGreaterThan(WORKTREE_COUNT * ROW_PITCH);
    expect(total).toBeLessThan(WORKTREE_COUNT * 120);
  });

  it("keeps an overscan window mounted past the visible edge", () => {
    const container = renderList();

    // 11 rows fit the 480px viewport; the overscan keeps the next ten mounted as well.
    const indexes = mountedWorktreeIndexes(container);
    expect(indexes.length).toBeGreaterThan(11);
    expect(indexes).not.toContain(WORKTREE_COUNT - 1);
  });

  it("moves the window with the scroll offset", async () => {
    const container = renderList();
    const scroller = container.querySelector<HTMLElement>("[data-worktree-sidebar]")!;
    // jsdom keeps no scroll position; give the scroller a real, writable offset.
    Object.defineProperty(scroller, "scrollTop", {
      configurable: true,
      writable: true,
      value: 0,
    });

    await act(async () => {
      scroller.scrollTop = 1000;
      fireEvent.scroll(scroller);
    });

    const indexes = mountedWorktreeIndexes(container);
    expect(indexes).not.toContain(0);
    // The window followed the offset, minus the overscan rows it keeps mounted above it.
    expect(Math.min(...indexes)).toBeGreaterThan(5);
    expect(indexes.some((index) => index >= 20)).toBe(true);
  });
});
