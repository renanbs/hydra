// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/pinned-section-worktrees.ts
import { describe, expect, it } from "vitest";
import type { WorktreeLineage } from "../../shared/worktree/lineage-types";
import { toWorktreeRow } from "../../shared/worktree/worktree-row";
import { getPinnedSectionWorktrees, isPinnedSectionWorktree } from "./pinned-section-worktrees";

function worktree(path: string, isPinned = false) {
  const row = toWorktreeRow(
    {
      id: path,
      path,
      head_commit: "abc1234",
      branch: path.split("/").pop() ?? path,
      is_bare: false,
      is_locked: false,
      is_main: false,
    },
    { repoId: "repo", isPinned }
  );
  return { ...row, instanceId: path };
}

function lineage(child: string, parent: string): WorktreeLineage {
  return {
    worktreeId: child,
    worktreeInstanceId: child,
    parentWorktreeId: parent,
    parentWorktreeInstanceId: parent,
    origin: "manual",
    capture: { source: "manual-action", confidence: "explicit" },
    createdAt: 0,
  };
}

describe("pinned section worktrees (D11-003)", () => {
  it("includes an explicitly pinned workspace", () => {
    const pinned = worktree("/repo/pinned", true);
    const other = worktree("/repo/other");
    const all = [pinned, other];
    const map = new Map(all.map((row) => [row.id, row]));
    expect(getPinnedSectionWorktrees(all, {}, map)).toEqual([pinned]);
  });

  it("follows a visible descendant of a pinned ancestor into Pinned", () => {
    const parent = worktree("/repo/parent", true);
    const child = worktree("/repo/child");
    const grandchild = worktree("/repo/grandchild");
    const all = [parent, child, grandchild];
    const map = new Map(all.map((row) => [row.id, row]));
    const lineageById = { "/repo/child": lineage("/repo/child", "/repo/parent"), "/repo/grandchild": lineage("/repo/grandchild", "/repo/child") };
    expect(getPinnedSectionWorktrees(all, lineageById, map)).toEqual([parent, child, grandchild]);
    expect(isPinnedSectionWorktree(child, all, lineageById, map)).toBe(true);
  });

  it("does not inherit pinning across execution hosts", () => {
    const parent = { ...worktree("/repo/parent", true), hostId: "local" as const };
    const child = { ...worktree("/repo/child"), hostId: "ssh:prod" as const };
    const all = [parent, child];
    const map = new Map(all.map((row) => [row.id, row]));
    const lineageById = { "/repo/child": lineage("/repo/child", "/repo/parent") };
    expect(getPinnedSectionWorktrees(all, lineageById, map)).toEqual([parent]);
    expect(isPinnedSectionWorktree(child, all, lineageById, map)).toBe(false);
  });

  it("keeps a detached descendant unpinned while its pinned ancestor is hidden", () => {
    const parent = worktree("/repo/parent", true);
    const child = worktree("/repo/child");
    const map = new Map([parent, child].map((row) => [row.id, row]));
    // Only the child is visible: the resolver walks through the pinned ancestor but
    // never adds a non-visible ancestor to the result.
    expect(getPinnedSectionWorktrees([child], {}, map)).toEqual([]);
  });
});
