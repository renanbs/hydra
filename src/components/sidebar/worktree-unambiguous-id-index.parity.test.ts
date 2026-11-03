// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/worktree-unambiguous-id-index.ts
import { describe, expect, it } from "vitest";
import {
  buildUnambiguousIdIndex,
  buildUnambiguousWorktreeIdIndex,
} from "./worktree-unambiguous-id-index";

type Row = { id: string; host: string };

describe("buildUnambiguousWorktreeIdIndex (D11-016)", () => {
  it("keeps a unique id with its row", () => {
    const row: Row = { id: "repo::main", host: "local" };
    expect(buildUnambiguousWorktreeIdIndex([row])).toEqual(new Map([[row.id, row]]));
  });

  it("drops an id published by two hosts", () => {
    const local: Row = { id: "repo::feature", host: "local" };
    const remote: Row = { id: "repo::feature", host: "ssh:prod" };
    const index = buildUnambiguousWorktreeIdIndex([local, remote]);
    expect(index.has("repo::feature")).toBe(false);
  });

  it("preserves unique ids that appear after a collision", () => {
    const local: Row = { id: "dup", host: "local" };
    const remote: Row = { id: "dup", host: "ssh:prod" };
    const other: Row = { id: "repo::other", host: "ssh:staging" };
    const index = buildUnambiguousWorktreeIdIndex([local, remote, other]);
    expect(index.get("repo::other")).toBe(other);
    expect(index.get("dup")).toBeUndefined();
  });

  it("keeps an ambiguous id out even when a third row repeats it", () => {
    const rows: Row[] = [
      { id: "dup", host: "local" },
      { id: "dup", host: "ssh:a" },
      { id: "dup", host: "ssh:b" },
    ];
    expect(buildUnambiguousWorktreeIdIndex(rows).size).toBe(0);
  });

  it("ignores empty ids without marking them ambiguous", () => {
    const index = buildUnambiguousIdIndex(
      [{ id: "", value: 1 }, { id: null, value: 2 }] as { id: string | null; value: number }[],
      (item) => item.id
    );
    expect(index.size).toBe(0);
  });
});
