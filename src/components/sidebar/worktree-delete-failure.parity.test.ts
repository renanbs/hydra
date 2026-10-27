import { describe, expect, it } from "vitest";
import { describeWorktreeDeleteFailure } from "./worktree-delete-failure";

describe("describeWorktreeDeleteFailure (Orca parity)", () => {
  it("points a locked worktree at the unlock command", () => {
    const failure = describeWorktreeDeleteFailure(
      "fatal: '/work/repo' is a locked working tree, lock reason: manual",
      "/work/repo"
    );
    expect(failure.summary).toMatch(/locked/i);
    expect(failure.guidance).toContain("git worktree unlock /work/repo");
    expect(failure.canForce).toBe(true);
  });

  it("explains that force deletes local changes", () => {
    const failure = describeWorktreeDeleteFailure(
      "fatal: '/work/repo' contains modified or untracked files, use --force to delete it"
    );
    expect(failure.summary).toMatch(/uncommitted or untracked/i);
    expect(failure.guidance).toMatch(/permanently removes/i);
    expect(failure.canForce).toBe(true);
  });

  it("treats a vanished registration as leftover-directory recovery", () => {
    const failure = describeWorktreeDeleteFailure("fatal: '/work/repo' is not a working tree");
    expect(failure.summary).toMatch(/no longer tracks/i);
    expect(failure.canForce).toBe(true);
  });

  it("withholds force when the filesystem denies access", () => {
    const failure = describeWorktreeDeleteFailure(
      "Failed to delete worktree directory /work/repo: Permission denied (os error 13)"
    );
    expect(failure.summary).toMatch(/filesystem refused/i);
    expect(failure.canForce).toBe(false);
  });

  it("keeps an unknown message verbatim", () => {
    const failure = describeWorktreeDeleteFailure("something unexpected happened");
    expect(failure.summary).toBe("something unexpected happened");
    expect(failure.guidance).toBeNull();
  });

  it("falls back when the backend returns nothing", () => {
    expect(describeWorktreeDeleteFailure("   ").summary).toBe(
      "Could not delete this workspace."
    );
  });
});
