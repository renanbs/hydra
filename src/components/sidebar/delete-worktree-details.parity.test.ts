import { describe, expect, it } from "vitest";
import { getDeleteWorktreeDialogCopy } from "./delete-worktree-dialog-copy";
import {
  formatDirtyChangeHintText,
  getDeleteWorktreeDirtyChangeCounts,
  orderDeleteWorktreeStatusHydrationTargets,
} from "./delete-worktree-dirty-change-counts";
import { describeWorktreeDeleteFailure } from "./worktree-delete-failure";

describe("delete-worktree-dialog-copy (Orca parity)", () => {
  it("keeps folder workspaces non-destructive in single and mixed batches", () => {
    expect(
      getDeleteWorktreeDialogCopy({
        isBatchDelete: false,
        worktreeDisplayName: "docs",
        worktreeCount: 1,
        folderWorkspaceDeleteCount: 1,
        isFolderWorkspaceDelete: true,
      }).descriptionSuffix
    ).toContain("folder on disk will not be deleted");

    const mixed = getDeleteWorktreeDialogCopy({
      isBatchDelete: true,
      worktreeCount: 3,
      folderWorkspaceDeleteCount: 1,
      isFolderWorkspaceDelete: false,
    });
    expect(mixed.descriptionSuffix).toContain("only remove the Hydra workspace entry");
  });

  it("names the folder-project escape for a primary folder checkout", () => {
    expect(
      getDeleteWorktreeDialogCopy({
        isBatchDelete: false,
        worktreeCount: 1,
        folderWorkspaceDeleteCount: 1,
        isFolderWorkspaceDelete: true,
      }).mainWorktreeBlocker
    ).toContain("Remove the folder project");
  });
});

describe("delete dirty-change counts (Orca parity)", () => {
  it("orders hydration active → visible → rest", () => {
    const ordered = orderDeleteWorktreeStatusHydrationTargets({
      targets: [
        { id: "hidden", path: "/hidden" },
        { id: "visible", path: "/visible" },
        { id: "active", path: "/active" },
      ],
      visibleTargets: [{ id: "visible", path: "/visible" }],
      activeWorktreeId: "active",
    });
    expect(ordered.map((row) => row.id)).toEqual(["active", "visible", "hidden"]);
  });

  it("skips main/folder rows and keeps a backend-dirty warning at count 0", () => {
    const counts = getDeleteWorktreeDirtyChangeCounts({
      deleteTargets: [
        { id: "a", path: "/a" },
        { id: "main", path: "/main", isMainWorktree: true },
        { id: "folder", path: "/folder", isFolderWorkspace: true },
        { id: "b", path: "/b" },
      ],
      dirtyChangeCountByPath: { "/a": 3, "/main": 9, "/folder": 4, "/b": 0 },
      deleteStateByWorktreeId: {
        b: {
          isDeleting: false,
          error: null,
          canForceDelete: true,
          forceDeleteReason: "dirty",
        },
      },
    });
    expect(counts.get("/a")).toBe(3);
    expect(counts.has("/main")).toBe(false);
    expect(counts.has("/folder")).toBe(false);
    expect(counts.get("/b")).toBe(0);
  });

  it("uses singular/plural copy and hides an unknown count", () => {
    expect(formatDirtyChangeHintText(undefined)).toBeNull();
    expect(formatDirtyChangeHintText(1)).toBe("1 uncommitted or untracked change");
    expect(formatDirtyChangeHintText(2)).toBe("2 uncommitted or untracked changes");
  });
});

describe("PTY-stop failure separation (Orca parity)", () => {
  it("distinguishes a proven-live session from an unconfirmed stop", () => {
    const proven = describeWorktreeDeleteFailure(
      "Failed to physically stop every PTY for worktree: /w/a — still live: session 1"
    );
    expect(proven.ptyStop).toBe("proven-live");
    expect(proven.summary).toContain("still running");

    const unconfirmed = describeWorktreeDeleteFailure(
      "Timed out waiting for physical PTY teardown: /w/a"
    );
    expect(unconfirmed.ptyStop).toBe("unconfirmed");
    expect(unconfirmed.summary).toContain("could not be confirmed");
  });
});
