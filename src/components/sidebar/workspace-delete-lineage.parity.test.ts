import { describe, expect, it } from "vitest";
import {
  getWorkspaceDeleteLineage,
  type WorkspaceDeleteLineageRow,
} from "./workspace-delete-lineage";

const LOCAL = "local" as const;
const SSH = "ssh:build-box" as const;

function row(
  id: string,
  path: string,
  overrides: Partial<WorkspaceDeleteLineageRow> = {}
): WorkspaceDeleteLineageRow {
  return { id, path, hostId: LOCAL, ...overrides };
}

describe("getWorkspaceDeleteLineage (Orca parity)", () => {
  it("returns only the parent when no lineage is recorded", () => {
    const parent = row("a", "/work/a");
    expect(getWorkspaceDeleteLineage(parent, [parent], undefined)).toEqual({
      descendants: [],
      deleteAllTargets: [parent],
    });
    expect(getWorkspaceDeleteLineage(parent, [parent], {})).toEqual({
      descendants: [],
      deleteAllTargets: [parent],
    });
  });

  it("walks the whole tree and emits targets child-first", () => {
    const parent = row("a", "/work/a");
    const child = row("b", "/work/b");
    const grandchild = row("c", "/work/c");
    const sibling = row("d", "/work/d");
    const lineage = { "/work/b": "/work/a", "/work/c": "/work/b", "/work/d": "/work/a" };

    const lineageResult = getWorkspaceDeleteLineage(
      parent,
      [parent, child, grandchild, sibling],
      lineage
    );

    expect(lineageResult.descendants.map((entry) => entry.id)).toEqual(["b", "c", "d"]);
    // Post-order: a child that lives inside the parent directory must go first.
    expect(lineageResult.deleteAllTargets.map((entry) => entry.id)).toEqual(["c", "b", "d", "a"]);
  });

  it("lists a main worktree descendant but never targets it", () => {
    const parent = row("a", "/work/a");
    const mainChild = row("b", "/work/main", { isMainWorktree: true });

    const lineageResult = getWorkspaceDeleteLineage(parent, [parent, mainChild], {
      "/work/main": "/work/a",
    });

    expect(lineageResult.descendants.map((entry) => entry.id)).toEqual(["b"]);
    expect(lineageResult.deleteAllTargets.map((entry) => entry.id)).toEqual(["a"]);
  });

  it("resolves a colliding path on the parent's host", () => {
    const parent = row("a", "/work/a", { hostId: SSH });
    const localTwin = row("b-local", "/work/b", { hostId: LOCAL });
    const sshChild = row("b-ssh", "/work/b", { hostId: SSH });

    const lineageResult = getWorkspaceDeleteLineage(parent, [parent, localTwin, sshChild], {
      "/work/b": "/work/a",
    });

    expect(lineageResult.descendants).toEqual([sshChild]);
    expect(lineageResult.deleteAllTargets).toEqual([sshChild, parent]);
  });

  it("does not pull a descendant that only exists on another host", () => {
    const parent = row("a", "/work/a", { hostId: SSH });
    const localChild = row("b", "/work/b", { hostId: LOCAL });

    const lineageResult = getWorkspaceDeleteLineage(parent, [parent, localChild], {
      "/work/b": "/work/a",
    });

    expect(lineageResult.descendants).toEqual([]);
    expect(lineageResult.deleteAllTargets).toEqual([parent]);
  });

  it("requires an unambiguous path when the parent has no host", () => {
    const parent = row("a", "/work/a", { hostId: undefined });
    const localChild = row("b", "/work/b", { hostId: LOCAL });

    expect(
      getWorkspaceDeleteLineage(parent, [parent, localChild], { "/work/b": "/work/a" })
        .descendants
    ).toEqual([localChild]);

    const sshChild = row("b-ssh", "/work/b", { hostId: SSH });
    expect(
      getWorkspaceDeleteLineage(parent, [parent, localChild, sshChild], {
        "/work/b": "/work/a",
      }).descendants
    ).toEqual([]);
  });

  it("survives cycles and self-parent entries", () => {
    const parent = row("a", "/work/a");
    const child = row("b", "/work/b");

    const lineageResult = getWorkspaceDeleteLineage(parent, [parent, child], {
      "/work/a": "/work/b",
      "/work/b": "/work/a",
    });

    expect(lineageResult.descendants.map((entry) => entry.id)).toEqual(["b"]);
    expect(lineageResult.deleteAllTargets.map((entry) => entry.id)).toEqual(["b", "a"]);
  });

  it("ignores lineage paths with no live row", () => {
    const parent = row("a", "/work/a");
    const lineageResult = getWorkspaceDeleteLineage(parent, [parent], {
      "/work/gone": "/work/a",
    });
    expect(lineageResult.descendants).toEqual([]);
    expect(lineageResult.deleteAllTargets).toEqual([parent]);
  });
});
