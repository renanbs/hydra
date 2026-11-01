// D03a-077: the folder workspace card paints a synthetic review inherited from the
// worktrees attached to it. Before this pass the sidebar handed the walk a null
// lineage map, so a nested worktree's review never reached the folder card.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import React from "react";
import { cleanup, render } from "@testing-library/react";
import { useAppStore } from "@/store";
import { WorktreeList } from "./WorktreeList";
import type { GitWorktreeInfo, HydraProject } from "./types";
import type { WorkspaceDisplayOptions } from "./WorkspaceOptionsMenu";

const PROJECT: HydraProject = {
  id: "repo_a",
  name: "hydra",
  path: "/repo/hydra",
  is_git: true,
  current_branch: "main",
};

const PROJECT_GROUP = { id: "grp_1", name: "Clients" };
const FOLDER_PATH = "/clients/malha";
const CHILD = "/repo/hydra/child";

const WORKTREES: GitWorktreeInfo[] = [
  {
    id: "wt-main",
    path: PROJECT.path,
    head_commit: "abc1234",
    branch: "main",
    is_bare: false,
    is_locked: false,
    is_main: true,
  },
  {
    id: "wt-child",
    path: CHILD,
    head_commit: "abc1234",
    branch: "feat/child",
    is_bare: false,
    is_locked: false,
  },
];

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
    keybindings: {},
  });
}

function renderList(props: { lineageByPath?: Record<string, string> } = {}) {
  return render(
    <WorktreeList
      projects={[PROJECT]}
      displayProjects={[PROJECT]}
      activeProject={PROJECT}
      activeWorktreePath={null}
      sessions={[]}
      collapsedProjects={new Set()}
      collapsedGroups={new Set()}
      displayOptions={DISPLAY_OPTIONS}
      getFilteredAndSortedWorktrees={() => WORKTREES}
      projectGroups={[PROJECT_GROUP]}
      projectGroupMap={{ [PROJECT.id]: PROJECT_GROUP.id }}
      folderWorkspaces={[
        {
          id: "fw_1",
          projectGroupId: PROJECT_GROUP.id,
          name: "MalhaClub",
          folderPath: FOLDER_PATH,
        },
      ]}
      prByPath={{
        [CHILD]: { number: 12, state: "open", status: "success", provider: "github" },
      }}
      lineageByPath={props.lineageByPath}
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
}

describe("WorktreeList folder workspace card review (D03a-077)", () => {
  beforeEach(() => resetStore());
  afterEach(() => {
    cleanup();
    resetStore();
  });

  it("paints the review inherited from a worktree nested under the folder", () => {
    const { container } = renderList({ lineageByPath: { [CHILD]: FOLDER_PATH } });

    expect(container.querySelector('[aria-label="MalhaClub"]')).not.toBeNull();
    const display = container.querySelector<HTMLElement>(
      "[data-folder-workspace-pr-display]"
    );
    expect(display).not.toBeNull();
    expect(display?.textContent).toContain("#12");
    expect(display?.getAttribute("aria-label")).toBe("PR #12 checks: Passing");
  });

  it("keeps the folder card reviewless without lineage", () => {
    const { container } = renderList();

    expect(container.querySelector('[aria-label="MalhaClub"]')).not.toBeNull();
    expect(
      container.querySelector("[data-folder-workspace-pr-display]")
    ).toBeNull();
  });
});
