import { describe, expect, it } from "vitest";
import {
  EMPTY_PENDING_WORKTREE_CREATION_KEYS,
  selectPendingWorktreeCreationKeys,
} from "./pending-worktree-creation-keys";

describe("pending creation keys (Orca parity)", () => {
  it("uses one frozen empty identity", () => {
    expect(selectPendingWorktreeCreationKeys(undefined)).toBe(
      EMPTY_PENDING_WORKTREE_CREATION_KEYS
    );
    expect(selectPendingWorktreeCreationKeys([])).toBe(
      EMPTY_PENDING_WORKTREE_CREATION_KEYS
    );
  });

  it("builds '<creationId> <repoId>' keys and caches the array identity", () => {
    const source = [{ creationId: "abc", repoId: "repo_a" }];
    const first = selectPendingWorktreeCreationKeys(source);
    expect(first).toEqual(["abc repo_a"]);
    expect(selectPendingWorktreeCreationKeys(source)).toBe(first);
  });

  it("rebuilds when the source slice is replaced", () => {
    const a = selectPendingWorktreeCreationKeys([{ creationId: "a", repoId: "r" }]);
    const b = selectPendingWorktreeCreationKeys([{ creationId: "a", repoId: "r" }]);
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });
});
