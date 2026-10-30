// D03a-077: a folder workspace card's synthetic review comes from the worktrees
// attached to the folder, most urgent check status first.
import { describe, expect, it } from "vitest";
import { toWorktreeRow } from "../../../../shared/worktree/worktree-row";
import type { WorkspaceLineage, WorktreeLineage } from "../../../../shared/worktree/lineage-types";
import type { Worktree } from "../../../../shared/worktree/types";
import { getFolderWorkspaceCardPrDisplay } from "./folder-workspace-card-pr-display";

const REPO_ID = "repo_a";

function worktree(id: string, path: string, branch = "feat"): Worktree {
  return {
    ...toWorktreeRow(
      { path, head_commit: "abc1234", branch, is_bare: false, is_main: false },
      { repoId: REPO_ID, hostId: "local" }
    ),
    id,
  } as Worktree;
}

function workspaceLineage(child: string, parent: string): WorkspaceLineage {
  return {
    childWorkspaceKey: `worktree:${child}`,
    parentWorkspaceKey: parent,
    origin: "manual",
    capture: { source: "manual-action", confidence: "explicit" },
    createdAt: 0,
  } as WorkspaceLineage;
}

function worktreeLineage(child: Worktree, parent: Worktree): WorktreeLineage {
  return {
    worktreeId: child.id,
    worktreeInstanceId: child.instanceId as string,
    parentWorktreeId: parent.id,
    parentWorktreeInstanceId: parent.instanceId as string,
    origin: "manual",
    capture: { source: "manual-action", confidence: "explicit" },
    createdAt: 0,
  };
}

describe("getFolderWorkspaceCardPrDisplay (D03a-077)", () => {
  it("returns null when no attached worktree has a review", () => {
    const child = worktree("wt-1", "/repo/a/child");
    expect(
      getFolderWorkspaceCardPrDisplay({
        folderWorkspaceId: "fw-1",
        workspaceLineageByChildKey: { "worktree:wt-1": workspaceLineage("wt-1", "folder:fw-1") },
        worktreeById: new Map([[child.id, child]]),
        prByPath: {},
      })
    ).toBeNull();
  });

  it("reads the review of a direct workspace-lineage child", () => {
    const child = worktree("wt-1", "/repo/a/child");
    const display = getFolderWorkspaceCardPrDisplay({
      folderWorkspaceId: "fw-1",
      workspaceLineageByChildKey: { "worktree:wt-1": workspaceLineage("wt-1", "folder:fw-1") },
      worktreeById: new Map([[child.id, child]]),
      prByPath: { "/repo/a/child": { number: 12, state: "open", status: "success" } },
    });
    expect(display?.number).toBe(12);
  });

  it("picks the most urgent check status across lineage descendants", () => {
    const child = worktree("wt-1", "/repo/a/child");
    const grandchild = worktree("wt-2", "/repo/a/grandchild");
    const display = getFolderWorkspaceCardPrDisplay({
      folderWorkspaceId: "fw-1",
      workspaceLineageByChildKey: { "worktree:wt-1": workspaceLineage("wt-1", "folder:fw-1") },
      worktreeLineageById: { "wt-2": worktreeLineage(grandchild, child) },
      worktreeById: new Map([
        [child.id, child],
        [grandchild.id, grandchild],
      ]),
      prByPath: {
        "/repo/a/child": { number: 1, state: "open", status: "success" },
        "/repo/a/grandchild": { number: 2, state: "open", status: "failure" },
      },
    });
    expect(display?.number).toBe(2);
  });

  it("ignores worktrees attached to a different folder", () => {
    const child = worktree("wt-1", "/repo/a/child");
    expect(
      getFolderWorkspaceCardPrDisplay({
        folderWorkspaceId: "fw-1",
        workspaceLineageByChildKey: { "worktree:wt-1": workspaceLineage("wt-1", "folder:other") },
        worktreeById: new Map([[child.id, child]]),
        prByPath: { "/repo/a/child": { number: 12, state: "open" } },
      })
    ).toBeNull();
  });
});
