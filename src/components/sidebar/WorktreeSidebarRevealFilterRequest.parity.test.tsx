// D09-018: revealing a workspace must land on the state the sidebar RENDERS.
// `worktree-activation` used to mutate the store's filter flags, which the painted
// sidebar never reads (`displayOptions.filterProjectIds`), so an activation could
// reveal a card that its own project filter still hid. Activation now publishes the
// target and the sidebar's single display-options writer relaxes only the blocking
// filters (Orca `revealWorkspaceFilters`).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAppStore } from "@/store";
import { cloneDefaultWorkspaceStatuses } from "../../shared/workspace-statuses";
import { WorktreeSidebar } from "./WorktreeSidebar";
import { requestSidebarFilterRelaxation } from "./reveal-filter-request";
import type { GitWorktreeInfo, HydraProject } from "./types";
import type { WorkspaceDisplayOptions } from "./WorkspaceOptionsMenu";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn().mockResolvedValue(null) }));

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;

const PROJECT_A: HydraProject = {
  id: "repo_a",
  name: "alpha",
  path: "/repo/a",
  is_git: true,
  current_branch: "main",
};
const PROJECT_B: HydraProject = {
  id: "repo_b",
  name: "beta",
  path: "/repo/b",
  is_git: true,
  current_branch: "main",
};

function worktree(path: string): GitWorktreeInfo {
  return {
    id: path,
    path,
    head_commit: "abc1234",
    branch: path.split("/").pop() as string,
    is_bare: false,
    is_locked: false,
  };
}

const WT_A = worktree("/repo/a/wt-1");
const WT_B = worktree("/repo/b/wt-1");

const DISPLAY_OPTIONS: WorkspaceDisplayOptions = {
  groupBy: "repo",
  sortBy: "name",
  hideSleeping: false,
  hideDefaultBranch: false,
  hideAutomationCreated: false,
  hideCliCreated: false,
  hideDetachedHead: false,
  alwaysShowDefaultBranch: true,
  filterProjectIds: ["repo_b"],
};

function resetStore(overrides: Record<string, unknown> = {}): void {
  useAppStore.setState({
    repos: [],
    sshTargetLabels: new Map(),
    sshConnectionStates: new Map(),
    runtimeEnvironments: [],
    settings: null,
    visibleWorkspaceHostIds: [],
    workspaceHostScope: null,
    worktreeLineageById: {},
    workspaceStatuses: cloneDefaultWorkspaceStatuses(),
    worktreesByRepo: {},
    pendingRevealWorktree: null,
    pendingRevealSidebarRow: null,
    keybindings: {},
    ...overrides,
  });
}

function renderSidebar() {
  return render(
    <TooltipProvider>
      <WorktreeSidebar
        sessions={[]}
        projects={[PROJECT_A, PROJECT_B]}
        activeProject={PROJECT_A}
        activeWorktreePath={null}
        gitStatus={null}
        gitWorktrees={[WT_A]}
        worktreesByProject={{ [PROJECT_A.path]: [WT_A], [PROJECT_B.path]: [WT_B] }}
        onSelectProject={vi.fn()}
        onRemoveProject={vi.fn()}
        onSelectSession={vi.fn()}
        onSelectGitWorktree={vi.fn()}
        onDeleteGitWorktree={vi.fn()}
        onDeleteSession={vi.fn()}
        onOpenSettings={vi.fn()}
        onOpenAddRepoDialog={vi.fn()}
        onOpenNewWorkspaceModal={vi.fn()}
        onAssignWorktreeStatus={vi.fn()}
        onPinWorktree={vi.fn()}
        onCreateWorktree={vi.fn()}
        initialDisplayOptions={DISPLAY_OPTIONS}
      />
    </TooltipProvider>
  );
}

describe("WorktreeSidebar reveal filter request (D09-018)", () => {
  beforeEach(() => resetStore());
  afterEach(() => {
    cleanup();
    resetStore();
  });

  it("un-hides the reveal target's project through the painted display options", async () => {
    const view = renderSidebar();
    // The project filter paints only repo_b, so alpha's card is not on screen.
    expect(view.container.querySelector(`[data-worktree-path="${WT_A.path}"]`)).toBeNull();
    expect(view.container.querySelector(`[data-worktree-path="${WT_B.path}"]`)).not.toBeNull();

    act(() => {
      requestSidebarFilterRelaxation({
        path: WT_A.path,
        projectId: PROJECT_A.id,
        isMainWorktree: false,
        automationCreated: false,
        cliCreated: false,
        detachedHead: false,
      });
    });

    await waitFor(() =>
      expect(view.container.querySelector(`[data-worktree-path="${WT_A.path}"]`)).not.toBeNull()
    );
  });
});
