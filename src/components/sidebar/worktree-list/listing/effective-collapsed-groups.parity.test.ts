// Parity guard for D03b-012: a collapsed section must open while the agent send
// picker targets a workspace inside it (Orca `useEffectiveCollapsedGroups`).
import { describe, expect, it } from "vitest";
import type { FolderWorkspace } from "../../../../shared/folder-workspace-types";
import type { ProjectGroup } from "../../../../shared/project-group-types";
import type { Repo } from "../../../../shared/repo-types";
import type { Worktree, WorktreeLineage } from "../../../../shared/worktree/types";
import { cloneDefaultWorkspaceStatuses } from "../../../../shared/workspace-statuses";
import { toWorktreeRow } from "../../../../shared/worktree/worktree-row";
import { PINNED_GROUP_KEY, getWorktreeLineageGroupKey } from "../grouping/group-keys";
import { getEffectiveCollapsedGroups } from "./effective-collapsed-groups";

const REPO_ID = "repo_a";

function repo(overrides: Partial<Repo> = {}): Repo {
  return {
    id: REPO_ID,
    path: "/repo/a",
    displayName: "a",
    badgeColor: "#64748b",
    addedAt: 0,
    projectGroupId: null,
    ...overrides,
  } as Repo;
}

function worktree(options: {
  path?: string;
  branch?: string;
  status?: Worktree["workspaceStatus"];
  isPinned?: boolean;
} = {}): Worktree {
  return {
    ...toWorktreeRow(
      {
        path: options.path ?? "/repo/a/wt",
        head_commit: "abc1234",
        branch: options.branch ?? "feat/a",
        is_bare: false,
        is_main: false,
      },
      { repoId: REPO_ID, hostId: "local" }
    ),
    isPinned: options.isPinned ?? false,
    workspaceStatus: options.status ?? "todo",
  };
}

function group(id: string, parentGroupId: string | null = null): ProjectGroup {
  return {
    id,
    name: id,
    parentPath: null,
    parentGroupId,
    createdFrom: "manual",
    tabOrder: 0,
    isCollapsed: false,
    color: null,
    createdAt: 0,
    updatedAt: 0,
  };
}

function folderWorkspace(overrides: Partial<FolderWorkspace> = {}): FolderWorkspace {
  return {
    id: "folder_1",
    name: "folder",
    folderPath: "/repo/a/folder",
    projectGroupId: "group_outer",
    executionHostId: "local",
    createdAt: 0,
  } as FolderWorkspace;
}

const baseArgs = {
  groupBy: "workspace-status" as const,
  pinnedDisplayPolicy: "single-location" as const,
  projectGroups: [] as ProjectGroup[],
  repoMap: new Map([[REPO_ID, repo()]]),
  prCache: null,
  workspaceStatuses: cloneDefaultWorkspaceStatuses(),
  worktreeLineageById: {} as Record<string, WorktreeLineage>,
};

describe("effective collapsed groups (Orca parity)", () => {
  it("returns the same set while no send target is armed", () => {
    const collapsedGroups = new Set(["workspace-status:inactive"]);
    const wt = worktree();
    expect(
      getEffectiveCollapsedGroups({
        ...baseArgs,
        collapsedGroups,
        agentSendTargetWorktreeId: null,
        worktrees: [wt],
        worktreeMap: new Map([[wt.id, wt]]),
        folderWorkspaces: [],
      })
    ).toBe(collapsedGroups);
  });

  it("opens the natural lane of the targeted workspace", () => {
    const wt = worktree({ status: "completed" });
    const collapsedGroups = new Set(["workspace-status:completed", "workspace-status:todo"]);
    const effective = getEffectiveCollapsedGroups({
      ...baseArgs,
      collapsedGroups,
      agentSendTargetWorktreeId: wt.id,
      worktrees: [wt],
      worktreeMap: new Map([[wt.id, wt]]),
      folderWorkspaces: [],
    });
    expect(effective.has("workspace-status:completed")).toBe(false);
    expect(effective.has("workspace-status:todo")).toBe(true);
    // Never mutates the persisted set.
    expect(collapsedGroups.has("workspace-status:completed")).toBe(true);
  });

  it("opens the Pinned lane for a pinned target under single-location", () => {
    const wt = worktree({ isPinned: true });
    const effective = getEffectiveCollapsedGroups({
      ...baseArgs,
      collapsedGroups: new Set([PINNED_GROUP_KEY, "workspace-status:todo"]),
      agentSendTargetWorktreeId: wt.id,
      worktrees: [wt],
      worktreeMap: new Map([[wt.id, wt]]),
      folderWorkspaces: [],
      pinnedWorktreePaths: new Set([wt.path]),
    });
    expect(effective.has(PINNED_GROUP_KEY)).toBe(false);
  });

  it("opens the project-group ancestry for a repo-grouped target", () => {
    const inner = group("group_inner", "group_outer");
    const outer = group("group_outer");
    const wt = worktree();
    const effective = getEffectiveCollapsedGroups({
      ...baseArgs,
      groupBy: "repo",
      projectGroups: [outer, inner],
      repoMap: new Map([[REPO_ID, repo({ projectGroupId: "group_inner" })]]),
      collapsedGroups: new Set(["project-group:group_outer", "project-group:group_inner"]),
      agentSendTargetWorktreeId: wt.id,
      worktrees: [wt],
      worktreeMap: new Map([[wt.id, wt]]),
      folderWorkspaces: [],
    });
    expect(effective.size).toBe(0);
  });

  it("opens collapsed lineage folds above the target", () => {
    const parent = worktree({ path: "/repo/a/parent" });
    const child = worktree({ path: "/repo/a/child" });
    const lineageById: Record<string, WorktreeLineage> = {
      [child.id]: {
        worktreeId: child.id,
        worktreeInstanceId: child.instanceId as string,
        parentWorktreeId: parent.id,
        parentWorktreeInstanceId: parent.instanceId as string,
        origin: "manual",
        capture: { source: "manual-action", confidence: "explicit" },
        createdAt: 0,
      },
    };
    const effective = getEffectiveCollapsedGroups({
      ...baseArgs,
      collapsedGroups: new Set([getWorktreeLineageGroupKey(parent)]),
      agentSendTargetWorktreeId: child.id,
      worktrees: [parent, child],
      worktreeMap: new Map([
        [parent.id, parent],
        [child.id, child],
      ]),
      worktreeLineageById: lineageById,
      folderWorkspaces: [],
    });
    expect(effective.has(getWorktreeLineageGroupKey(parent))).toBe(false);
  });

  it("opens the project-group ancestry of a targeted folder workspace", () => {
    const effective = getEffectiveCollapsedGroups({
      ...baseArgs,
      groupBy: "repo",
      projectGroups: [group("group_outer")],
      collapsedGroups: new Set(["project-group:group_outer"]),
      agentSendTargetWorktreeId: "folder_1",
      worktrees: [],
      worktreeMap: new Map(),
      folderWorkspaces: [folderWorkspace()],
    });
    expect(effective.size).toBe(0);
  });
});
