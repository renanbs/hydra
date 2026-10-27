import { describe, expect, it } from "vitest";
import {
  resolveActiveSurfaceVariant,
  resolvePrimaryActiveRowKey,
} from "./active-row";
import type { HostSectionRow } from "../../host-section-rows";

function itemRow(rowKey: string, path: string, sectionKey: string): HostSectionRow {
  return {
    type: "item",
    rowKey,
    sectionKey,
    worktree: { id: path, path },
    repo: undefined,
    depth: 0,
    groupDepth: 0,
    lineageTrail: [],
    isLastLineageChild: true,
    lineageChildCount: 0,
  } as unknown as HostSectionRow;
}

const ROWS = [
  itemRow("pinned-wt", "/repo/wt", "pinned"),
  itemRow("other", "/repo/other", "repo:a"),
  itemRow("natural-wt", "/repo/wt", "repo:a"),
];

describe("active sidebar row (Orca parity)", () => {
  it("prefers the natural copy over the Pinned mirror as the primary surface", () => {
    expect(resolvePrimaryActiveRowKey(ROWS, "/repo/wt", "pinned")).toBe("natural-wt");
    expect(resolveActiveSurfaceVariant("natural-wt", "natural-wt")).toBe("primary");
    expect(resolveActiveSurfaceVariant("pinned-wt", "natural-wt")).toBe("secondary");
  });

  it("falls back to the first match when only the Pinned copy exists", () => {
    expect(resolvePrimaryActiveRowKey([ROWS[0]!], "/repo/wt", "pinned")).toBe("pinned-wt");
  });

  it("returns no variant when nothing is active", () => {
    expect(resolvePrimaryActiveRowKey(ROWS, "/missing", "pinned")).toBeNull();
    expect(resolveActiveSurfaceVariant("other", null)).toBeUndefined();
  });
});
