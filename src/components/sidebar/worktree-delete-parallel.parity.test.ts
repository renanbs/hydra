import { describe, expect, it } from "vitest";
import { runWorktreeDeletesInParallel, type ParallelDeleteTarget } from "./worktree-delete-parallel";

function target(id: string, overrides: Partial<ParallelDeleteTarget> = {}): ParallelDeleteTarget {
  return {
    id,
    path: `/work/${id}`,
    repoPath: "/repo",
    hostId: "local",
    ...overrides,
  };
}

describe("runWorktreeDeletesInParallel (Orca parity)", () => {
  it("marks every target deleting up front and deletes deepest paths first", async () => {
    const order: string[] = [];
    const marked: string[] = [];
    const child = target("child", { path: "/work/parent/child" });
    const parent = target("parent", { path: "/work/parent" });
    const sibling = target("sibling", { path: "/work/sib", repoPath: "/other" });

    const result = await runWorktreeDeletesInParallel([parent, sibling, child], {
      resolveLiveTarget: (id) => [parent, sibling, child].find((row) => row.id === id),
      deleteTarget: async (row) => {
        order.push(row.id);
        return { ok: true };
      },
      markDeleting: (rows) => marked.push(...rows.map((row) => row.id)),
      clearDeleting: () => {},
      onListChanged: () => {},
      showPreservedBranches: () => {},
    });

    expect(marked.sort()).toEqual(["child", "parent", "sibling"]);
    // /work/parent/child is longer, so it leaves before /work/parent.
    expect(order.indexOf("child")).toBeLessThan(order.indexOf("parent"));
    expect(result.deleted).toHaveLength(3);
  });

  it("cancels an ancestor whose descendant failed", async () => {
    const child = target("child", { path: "/work/parent/child" });
    const parent = target("parent", { path: "/work/parent" });
    const attempts: string[] = [];
    const result = await runWorktreeDeletesInParallel([parent, child], {
      resolveLiveTarget: (id) => [parent, child].find((row) => row.id === id),
      deleteTarget: async (row) => {
        attempts.push(row.id);
        return row.id === "child" ? { ok: false, error: "dirty" } : { ok: true };
      },
      markDeleting: () => {},
      clearDeleting: () => {},
      onListChanged: () => {},
      showPreservedBranches: () => {},
    });
    expect(attempts).toEqual(["child"]);
    expect(result.failed.map((row) => row.id)).toEqual(["child"]);
  });

  it("reports a stale list when a queued row vanished", async () => {
    const row = target("a");
    const listChanged: boolean[] = [];
    await runWorktreeDeletesInParallel([row], {
      resolveLiveTarget: () => undefined,
      deleteTarget: async () => ({ ok: true }),
      markDeleting: () => {},
      clearDeleting: () => {},
      onListChanged: () => listChanged.push(true),
      showPreservedBranches: () => {},
    });
    expect(listChanged).toEqual([true]);
  });

  it("forwards the batch force/waiver options to every target", async () => {
    const rows = [target("a"), target("b")];
    const received: ({ force?: boolean; allowArchiveSkip?: boolean } | undefined)[] = [];
    await runWorktreeDeletesInParallel(rows, {
      resolveLiveTarget: (id) => rows.find((row) => row.id === id),
      deleteTarget: async (_row, options) => {
        received.push(options);
        return { ok: true };
      },
      deleteOptions: { force: true, allowArchiveSkip: true },
      markDeleting: () => {},
      clearDeleting: () => {},
      onListChanged: () => {},
      showPreservedBranches: () => {},
    });
    expect(received).toEqual([
      { force: true, allowArchiveSkip: true },
      { force: true, allowArchiveSkip: true },
    ]);
  });

  it("aggregates preserved branches into one toast", async () => {
    const rows = [target("a"), target("b")];
    const preservedBatches: number[] = [];
    await runWorktreeDeletesInParallel(rows, {
      resolveLiveTarget: (id) => rows.find((row) => row.id === id),
      deleteTarget: async (row) => ({
        ok: true,
        preservedBranch: { worktreeId: row.id, branchName: `branch-${row.id}` },
      }),
      markDeleting: () => {},
      clearDeleting: () => {},
      onListChanged: () => {},
      showPreservedBranches: (_count, branches) => preservedBatches.push(branches.length),
    });
    expect(preservedBatches).toEqual([2]);
  });
});
