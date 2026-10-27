// Parity guard for the painted sidebar's ROW MODEL. Orca renders the sidebar from
// one grouping pipeline (`worktree-list/grouping/build-rows.ts`): grouping mode
// decides the lane headers (All / status / PR / repo), a Pinned section sits on top,
// host sections appear when more than one host is visible, and the menu filters run
// on the same rows. Hydra used to paint a flat project list and re-derive grouping in
// the component, so every lane/filter toggle was inert — the divergence this locks out.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render } from "@testing-library/react";
import { useAppStore } from "@/store";
import { WorktreeList, type WorktreeListProps } from "./WorktreeList";
import type { WorkspaceDisplayOptions } from "./WorkspaceOptionsMenu";
import type { HydraProject, GitWorktreeInfo } from "./types";

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

function worktree(path: string, branch: string, isMain = false): GitWorktreeInfo {
  return {
    id: path,
    path,
    head_commit: "abc1234",
    branch,
    is_bare: false,
    is_locked: false,
    is_main: isMain,
  };
}

const BASE_DISPLAY_OPTIONS: WorkspaceDisplayOptions = {
  groupBy: "repo",
  sortBy: "name",
  hideSleeping: false,
  hideDefaultBranch: false,
  hideAutomationCreated: false,
  hideCliCreated: false,
  hideDetachedHead: false,
};

const BASE_STORE_STATE = {
  repos: [],
  sshTargetLabels: new Map(),
  sshConnectionStates: new Map(),
  runtimeEnvironments: [],
  settings: null,
  visibleWorkspaceHostIds: [],
  workspaceHostScope: null,
  worktreeLineageById: {},
};

function resetStore(overrides: Record<string, unknown> = {}) {
  useAppStore.setState({ ...BASE_STORE_STATE, ...overrides });
}

function renderList(
  props: Partial<WorktreeListProps> & {
    projects: HydraProject[];
    worktreesByProject: Record<string, GitWorktreeInfo[]>;
  }
) {
  const { projects, worktreesByProject, ...rest } = props;
  return render(
    <WorktreeList
      projects={projects}
      displayProjects={projects}
      activeProject={projects[0] ?? null}
      sessions={[]}
      collapsedProjects={new Set()}
      collapsedGroups={new Set()}
      displayOptions={BASE_DISPLAY_OPTIONS}
      getFilteredAndSortedWorktrees={(proj) => worktreesByProject[proj.path] ?? []}
      onSelectProject={vi.fn()}
      onSelectGitWorktree={vi.fn()}
      onDeleteGitWorktree={vi.fn()}
      onSelectSession={vi.fn()}
      onOpenNewWorkspaceModal={vi.fn()}
      onOpenAddRepoDialog={vi.fn()}
      onToggleProjectCollapse={vi.fn()}
      onToggleGroupCollapse={vi.fn()}
      {...rest}
    />
  );
}

describe("WorktreeList row model (Orca parity)", () => {
  beforeEach(() => resetStore());
  afterEach(() => resetStore());

  it("paints repo headers with data-repo-header-id in repo mode", () => {
    const { container } = renderList({
      projects: [PROJECT_A, PROJECT_B],
      worktreesByProject: {
        [PROJECT_A.path]: [worktree("/repo/hydra", "main", true)],
        [PROJECT_B.path]: [worktree("/repo/orca", "main", true)],
      },
    });

    const headers = container.querySelectorAll("[data-repo-header-id]");
    expect(headers).toHaveLength(2);
    // Repo mode has no lane headers — grouping lives in the repo sections.
    expect(container.querySelectorAll("[data-section-header-id]")).toHaveLength(0);
    expect(container.querySelectorAll("[data-worktree-card-surface]")).toHaveLength(2);
  });

  it("renders a single flat 'All' lane in groupBy=none", () => {
    const { container } = renderList({
      projects: [PROJECT_A, PROJECT_B],
      worktreesByProject: {
        [PROJECT_A.path]: [worktree("/repo/hydra", "main", true)],
        [PROJECT_B.path]: [worktree("/repo/orca", "main", true)],
      },
      displayOptions: { ...BASE_DISPLAY_OPTIONS, groupBy: "none" },
    });

    expect(container.querySelector('[data-section-header-id="all"]')).not.toBeNull();
    expect(container.querySelectorAll("[data-repo-header-id]")).toHaveLength(0);
    expect(container.querySelectorAll("[data-worktree-card-surface]")).toHaveLength(2);
  });

  it("buckets worktrees into workspace-status lanes only in status mode", () => {
    const props = {
      projects: [PROJECT_A],
      worktreesByProject: { [PROJECT_A.path]: [worktree("/repo/hydra", "main", true)] },
    };
    const repoMode = renderList(props);
    expect(
      repoMode.container.querySelector('[data-section-header-id^="workspace-status:"]')
    ).toBeNull();

    const statusMode = renderList({
      ...props,
      displayOptions: { ...BASE_DISPLAY_OPTIONS, groupBy: "workspace-status" },
    });
    const statusHeaders = statusMode.container.querySelectorAll(
      '[data-section-header-id^="workspace-status:"]'
    );
    expect(statusHeaders).toHaveLength(1);
    expect(statusHeaders[0]?.getAttribute("data-section-header-id")).toBe(
      "workspace-status:in-progress"
    );
  });

  it("buckets PR lanes from prByPath (the Orca prCache bridge)", () => {
    const merged = renderList({
      projects: [PROJECT_A],
      worktreesByProject: { [PROJECT_A.path]: [worktree("/repo/hydra", "main", true)] },
      prByPath: {
        "/repo/hydra": { number: 12, state: "merged", status: null, provider: "github" },
      },
      displayOptions: { ...BASE_DISPLAY_OPTIONS, groupBy: "pr-status" },
    });
    expect(merged.container.querySelector('[data-section-header-id="pr:done"]')).not.toBeNull();

    const open = renderList({
      projects: [PROJECT_A],
      worktreesByProject: { [PROJECT_A.path]: [worktree("/repo/hydra", "main", true)] },
      prByPath: {
        "/repo/hydra": { number: 12, state: "open", status: null, provider: "github" },
      },
      displayOptions: { ...BASE_DISPLAY_OPTIONS, groupBy: "pr-status" },
    });
    expect(open.container.querySelector('[data-section-header-id="pr:in-review"]')).not.toBeNull();
  });

  it("puts the Pinned section on top and moves the pinned card into it", () => {
    const pinnedPath = "/repo/hydra-pinned";
    const { container } = renderList({
      projects: [PROJECT_A],
      worktreesByProject: {
        [PROJECT_A.path]: [worktree("/repo/hydra", "main", true), worktree(pinnedPath, "feat/x")],
      },
      pinnedWorktrees: new Set([pinnedPath]),
    });

    const orderedHeaders = container.querySelectorAll(
      "[data-section-header-id],[data-repo-header-id]"
    );
    expect(orderedHeaders[0]?.getAttribute("data-section-header-id")).toBe("pinned");
    // Default policy is single-location: the card renders once, under Pinned.
    expect(container.querySelectorAll("[data-worktree-card-surface]")).toHaveLength(2);
    const pinnedHeader = container.querySelector('[data-section-header-id="pinned"]');
    const repoHeader = container.querySelector('[data-repo-header-id="repo_a"]');
    expect(pinnedHeader).not.toBeNull();
    expect(repoHeader).not.toBeNull();
    expect(
      pinnedHeader!.compareDocumentPosition(repoHeader!) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("splits into host sections when more than one host is visible", () => {
    resetStore({
      repos: [
        { id: "repo_a", connectionId: null, executionHostId: "local" },
        { id: "repo_b", connectionId: "srv", executionHostId: "ssh:srv" },
      ],
      visibleWorkspaceHostIds: ["local", "ssh:srv"],
      workspaceHostScope: "all",
      sshTargetLabels: new Map([["srv", "Build server"]]),
      sshConnectionStates: new Map(),
    });

    const { container } = renderList({
      projects: [PROJECT_A, PROJECT_B],
      worktreesByProject: {
        [PROJECT_A.path]: [worktree("/repo/hydra", "main", true)],
        [PROJECT_B.path]: [worktree("/repo/orca", "main", true)],
      },
    });

    const hostHeaders = container.querySelectorAll("[data-host-header-id]");
    expect(hostHeaders).toHaveLength(2);
    expect([...hostHeaders].map((header) => header.getAttribute("data-host-header-id"))).toEqual([
      "local",
      "ssh:srv",
    ]);
  });

  it("applies the menu's Hide sleeping filter on the painted rows", () => {
    const shown = renderList({
      projects: [PROJECT_A],
      worktreesByProject: {
        [PROJECT_A.path]: [worktree("/repo/hydra", "main", true), worktree("/repo/hydra-idle", "feat/idle")],
      },
    });
    expect(shown.container.querySelectorAll("[data-worktree-card-surface]")).toHaveLength(2);

    const hidden = renderList({
      projects: [PROJECT_A],
      worktreesByProject: {
        [PROJECT_A.path]: [worktree("/repo/hydra", "main", true), worktree("/repo/hydra-idle", "feat/idle")],
      },
      displayOptions: { ...BASE_DISPLAY_OPTIONS, hideSleeping: true },
    });
    // The main worktree is exempt (Orca's sweep exemption); the idle one is not.
    expect(hidden.container.querySelectorAll("[data-worktree-card-surface]")).toHaveLength(1);
  });

  it("renders project groups with their folder-workspace rows", () => {
    const { container } = renderList({
      projects: [PROJECT_A],
      worktreesByProject: { [PROJECT_A.path]: [worktree("/repo/hydra", "main", true)] },
      projectGroups: [{ id: "grp_1", name: "Clients" }],
      projectGroupMap: { repo_a: "grp_1" },
      folderWorkspaces: [
        { id: "fw_1", projectGroupId: "grp_1", name: "MalhaClub", folderPath: "/clients/malha" },
      ],
    });

    expect(container.querySelector('[data-section-header-id="project-group:grp_1"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="MalhaClub"]')).not.toBeNull();
  });
});
