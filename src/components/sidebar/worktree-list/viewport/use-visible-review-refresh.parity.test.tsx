// Visible-review refresh: the sidebar reports the workspaces whose rows are on screen so the
// PR/CI coordinator refreshes exactly those. The listener contract is asserted directly, and the
// wiring through the painted list is asserted against the store action it reports to.
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { useAppStore } from "@/store";
import { WorktreeList } from "../../WorktreeList";
import type { GitWorktreeInfo, HydraProject } from "../../types";
import type { WorkspaceDisplayOptions } from "../../WorkspaceOptionsMenu";
import { installWorktreeVisibleRefreshVisibilityListener } from "./use-visible-review-refresh";

/** The store action the sidebar reports the visible window to. */
type ReportVisibleCandidates = (worktreeIds: string[], generation: number) => void;

const PROJECT_A: HydraProject = {
  id: "repo_a",
  name: "hydra",
  path: "/repo/hydra",
  is_git: true,
  current_branch: "main",
};

const PROJECT_B: HydraProject = {
  id: "repo_b",
  name: "orca",
  path: "/repo/orca",
  is_git: true,
  current_branch: "main",
};

const WORKTREE_COUNT = 40;

function worktree(repoPath: string, index: number): GitWorktreeInfo {
  return {
    path: `${repoPath}/w${index}`,
    head_commit: "abc1234",
    branch: `w${index}`,
    is_bare: false,
    is_locked: false,
  };
}

const WORKTREES_BY_PROJECT: Record<string, GitWorktreeInfo[]> = {
  repo_a: Array.from({ length: WORKTREE_COUNT }, (_, index) => worktree(PROJECT_A.path, index)),
  repo_b: Array.from({ length: WORKTREE_COUNT }, (_, index) => worktree(PROJECT_B.path, index)),
};

const DISPLAY_OPTIONS: WorkspaceDisplayOptions = {
  groupBy: "repo",
  sortBy: "name",
  hideSleeping: false,
  hideDefaultBranch: false,
  hideAutomationCreated: false,
  hideCliCreated: false,
  hideDetachedHead: false,
};

function seedStore(
  reportVisible: Mock<ReportVisibleCandidates>,
  overrides: Record<string, unknown> = {}
): void {
  useAppStore.setState({
    repos: [],
    sshTargetLabels: new Map(),
    sshConnectionStates: new Map(),
    runtimeEnvironments: [],
    settings: null,
    visibleWorkspaceHostIds: [],
    workspaceHostScope: null,
    worktreeLineageById: {},
    worktreeCardProperties: ["pr"],
    reportVisibleGitHubPRRefreshCandidates: reportVisible,
    ...overrides,
  });
}

function renderList(
  displayOptions: WorkspaceDisplayOptions = DISPLAY_OPTIONS
): { container: HTMLElement; scroller: HTMLElement } {
  const { container } = render(
    <WorktreeList
      projects={[PROJECT_A, PROJECT_B]}
      displayProjects={[PROJECT_A, PROJECT_B]}
      activeProject={PROJECT_A}
      sessions={[]}
      collapsedProjects={new Set()}
      collapsedGroups={new Set()}
      displayOptions={displayOptions}
      getFilteredAndSortedWorktrees={(project) => WORKTREES_BY_PROJECT[project.id] ?? []}
      onSelectProject={vi.fn()}
      onSelectGitWorktree={vi.fn()}
      onDeleteGitWorktree={vi.fn()}
      onSelectSession={vi.fn()}
      onOpenNewWorkspaceModal={vi.fn()}
      onOpenAddRepoDialog={vi.fn()}
      onToggleProjectCollapse={vi.fn()}
      onToggleGroupCollapse={vi.fn()}
    />
  );
  return { container, scroller: container.querySelector<HTMLElement>("[data-worktree-sidebar]")! };
}

describe("installWorktreeVisibleRefreshVisibilityListener", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("subscribes to document visibility changes so visible PR refresh can rerun on return", () => {
    const listeners = new Map<string, () => void>();
    const onChange = vi.fn();
    const addEventListener = vi.fn((event: string, listener: () => void) => {
      listeners.set(event, listener);
    });
    const removeEventListener = vi.fn();
    vi.stubGlobal("document", { addEventListener, removeEventListener });

    try {
      const cleanup = installWorktreeVisibleRefreshVisibilityListener(onChange);

      expect(addEventListener).toHaveBeenCalledWith("visibilitychange", onChange);
      listeners.get("visibilitychange")?.();
      expect(onChange).toHaveBeenCalledTimes(1);

      cleanup();
      expect(removeEventListener).toHaveBeenCalledWith("visibilitychange", onChange);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("visible review refresh reporting", () => {
  const VIEWPORT_HEIGHT = 480;
  let reportVisible: Mock<ReportVisibleCandidates>;

  beforeEach(() => {
    reportVisible = vi.fn<ReportVisibleCandidates>();
    seedStore(reportVisible);
  });
  afterEach(() => {
    cleanup();
    seedStore(vi.fn());
    vi.restoreAllMocks();
  });

  /**
   * jsdom lays nothing out: the reporter measures the window against `clientHeight`, which jsdom
   * reports as 0 for every element, and the virtualizer only re-reads its window when the
   * scroller moves. The test gives the scroller both, then lets the list settle.
   */
  async function settleWindow(scroller: HTMLElement, scrollTop = 0): Promise<void> {
    Object.defineProperty(scroller, "scrollTop", {
      configurable: true,
      writable: true,
      value: scrollTop,
    });
    Object.defineProperty(scroller, "clientHeight", { configurable: true, value: VIEWPORT_HEIGHT });
    await act(async () => {
      fireEvent.scroll(scroller);
    });
  }

  it("reports the workspaces whose rows are on screen, and not the ones below the fold", async () => {
    const { scroller } = renderList();
    await settleWindow(scroller, 1);

    const [reportedIds, generation] = reportVisible.mock.calls.at(-1) as [string[], number];
    expect(reportedIds).toContain("repo_a::/repo/hydra/w0");
    expect(reportedIds).not.toContain(`repo_a::/repo/hydra/w${WORKTREE_COUNT - 1}`);
    expect(typeof generation).toBe("number");
  });

  it("re-reports when the scroll moves a different window into view", async () => {
    const { scroller } = renderList();
    await settleWindow(scroller, 1);

    await act(async () => {
      scroller.scrollTop = 1000;
      fireEvent.scroll(scroller);
    });

    const lastCall = reportVisible.mock.calls.at(-1) as [string[]];
    expect(reportVisible.mock.calls.length).toBeGreaterThan(1);
    expect(lastCall[0]).not.toContain("repo_a::/repo/hydra/w0");
    expect(lastCall[0].length).toBeGreaterThan(0);
  });

  it("clears the report while no PR/CI chrome reads review data", () => {
    seedStore(reportVisible, { worktreeCardProperties: [] });

    renderList();

    expect(reportVisible).toHaveBeenCalledTimes(1);
    expect(reportVisible).toHaveBeenCalledWith([], expect.any(Number));
  });
});
