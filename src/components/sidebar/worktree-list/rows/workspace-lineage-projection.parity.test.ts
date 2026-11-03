// D03a-077: the folder workspace card's synthetic review walks workspace lineage,
// which the live store never composes. This locks the projection that derives the
// workspace-keyed records from the lineage the sidebar already has — including the
// folder parent that only the app's path map can express.
import { describe, expect, it } from "vitest";
import { toWorktreeRow } from "../../../../shared/worktree/worktree-row";
import type { FolderWorkspace } from "../../../../shared/folder-workspace-types";
import type { WorktreeLineage } from "../../../../shared/worktree/lineage-types";
import type { Worktree } from "../../../../shared/worktree/types";
import { getProjectedWorkspaceLineageByChildKey } from "./workspace-lineage-projection";

const REPO_ID = "repo_a";

function worktree(id: string, path: string): Worktree {
  return {
    ...toWorktreeRow(
      { path, head_commit: "abc1234", branch: "feat", is_bare: false, is_main: false },
      { repoId: REPO_ID, hostId: "local" }
    ),
    id,
    instanceId: `${id}-instance`,
  } as Worktree;
}

function folderWorkspace(id: string, folderPath: string): FolderWorkspace {
  return {
    id,
    projectGroupId: "grp_1",
    name: id,
    folderPath,
    linkedTask: null,
    comment: "",
    isArchived: false,
    isUnread: false,
    isPinned: false,
    sortOrder: 0,
    lastActivityAt: 0,
    createdAt: 0,
    updatedAt: 0,
  };
}

function worktreeLineage(child: Worktree, parent: Worktree): WorktreeLineage {
  return {
    worktreeId: child.id,
    worktreeInstanceId: child.instanceId as string,
    parentWorktreeId: parent.id,
    parentWorktreeInstanceId: parent.instanceId as string,
    origin: "orchestration",
    capture: { source: "orchestration-context", confidence: "inferred" },
    taskId: "task_1",
    createdAt: 1_700_000_000_000,
  };
}

describe("getProjectedWorkspaceLineageByChildKey (D03a-077)", () => {
  it("resolves a folder-workspace parent from the app's path lineage", () => {
    const child = worktree("wt-child", "/repo/hydra/child");
    const projected = getProjectedWorkspaceLineageByChildKey({
      lineageByPath: { "/repo/hydra/child": "/clients/malha" },
      worktreeById: new Map([[child.id, child]]),
      folderWorkspaces: [folderWorkspace("fw-1", "/clients/malha")],
    });

    expect(projected["worktree:wt-child"]).toEqual({
      childWorkspaceKey: "worktree:wt-child",
      childInstanceId: "wt-child-instance",
      parentWorkspaceKey: "folder:fw-1",
      parentInstanceId: null,
      origin: "manual",
      capture: { source: "manual-action", confidence: "explicit" },
      createdAt: 0,
    });
  });

  it("carries a rich record through, mapping its parent to a workspace key", () => {
    const parent = worktree("wt-parent", "/repo/hydra/parent");
    const child = worktree("wt-child", "/repo/hydra/child");
    const projected = getProjectedWorkspaceLineageByChildKey({
      lineageById: { "wt-child": worktreeLineage(child, parent) },
      worktreeById: new Map([
        [child.id, child],
        [parent.id, parent],
      ]),
    });

    expect(projected["worktree:wt-child"]).toEqual({
      childWorkspaceKey: "worktree:wt-child",
      childInstanceId: "wt-child-instance",
      parentWorkspaceKey: "worktree:wt-parent",
      parentInstanceId: "wt-parent-instance",
      origin: "orchestration",
      capture: { source: "orchestration-context", confidence: "inferred" },
      taskId: "task_1",
      createdAt: 1_700_000_000_000,
    });
  });

  it("keeps a folder row's synthetic id as the parent workspace key", () => {
    const parent = worktree("wt-parent", "/repo/hydra/parent");
    const child = worktree("wt-child", "/repo/hydra/child");
    const projected = getProjectedWorkspaceLineageByChildKey({
      // A folder row is a worktree row whose id IS the folder workspace key, so a
      // record captured against it must not be re-prefixed into `worktree:folder:…`.
      lineageById: {
        "wt-child": {
          ...worktreeLineage(child, parent),
          parentWorktreeId: "folder:fw-1",
          parentWorktreeInstanceId: "",
        },
      },
      worktreeById: new Map([
        [child.id, child],
        [parent.id, parent],
      ]),
    });

    expect(projected["worktree:wt-child"]?.parentWorkspaceKey).toBe("folder:fw-1");
    expect(projected["worktree:wt-child"]?.parentInstanceId).toBeNull();
  });

  it("skips paths it cannot resolve and self-parents", () => {
    const child = worktree("wt-child", "/repo/hydra/child");
    const projected = getProjectedWorkspaceLineageByChildKey({
      lineageByPath: {
        "/repo/hydra/child": "/repo/hydra/unknown",
        "/repo/hydra/missing": "/repo/hydra/child",
        "/repo/hydra/child2": "/repo/hydra/child2",
      },
      worktreeById: new Map([
        [child.id, child],
        ["wt-child2", worktree("wt-child2", "/repo/hydra/child2")],
      ]),
    });

    expect(projected).toEqual({});
  });

  it("lets the app's path lineage win over a record for the same child", () => {
    const parent = worktree("wt-parent", "/repo/hydra/parent");
    const child = worktree("wt-child", "/repo/hydra/child");
    const projected = getProjectedWorkspaceLineageByChildKey({
      lineageById: { "wt-child": worktreeLineage(child, parent) },
      lineageByPath: { "/repo/hydra/child": "/clients/malha" },
      worktreeById: new Map([
        [child.id, child],
        [parent.id, parent],
      ]),
      folderWorkspaces: [folderWorkspace("fw-1", "/clients/malha")],
    });

    expect(projected["worktree:wt-child"]?.parentWorkspaceKey).toBe("folder:fw-1");
    expect(projected["worktree:wt-child"]?.origin).toBe("manual");
  });
});
