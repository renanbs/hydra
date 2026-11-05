// Parity guard for D03a-067: reveal/row lookups.
//
// Orca resolves a reveal to the workspace's preferred render row so a Pinned
// duplicate or a collapsed header never shadows the expanded natural row. Hydra
// paints flat sections, so these tests pin the adapted containment rules and the
// path-based entry point the virtualizer scroll uses.
import { describe, expect, it } from "vitest";
import type { FolderWorkspace } from "../../../../shared/folder-workspace-types";
import type { ProjectGroup } from "../../../../shared/project-group-types";
import { toWorktreeRow } from "../../../../shared/worktree/worktree-row";
import type { HostSectionRow } from "../../host-section-rows";
import type { GroupHeaderRow, WorktreeRow } from "../grouping/row-types";
import {
  findPreferredRenderRowIndexForWorktree,
  findRevealRowIndex,
  renderRowContainsWorktree,
  rowKeyMatchesRenderRow,
} from "./reveal-row-lookup";

const REPO_ID = "repo_a";

function worktree(path: string) {
  return toWorktreeRow(
    {
      path,
      head_commit: "abc1234",
      branch: "feat/a",
      is_bare: false,
      is_main: false,
    },
    { repoId: REPO_ID, hostId: "local" }
  );
}

function itemRow(worktreeRow: ReturnType<typeof worktree>, sectionKey: string): WorktreeRow {
  return {
    type: "item",
    rowKey: `${sectionKey}:local|${worktreeRow.id}`,
    sectionKey,
    worktree: worktreeRow,
    repo: undefined,
    depth: 0,
    groupDepth: 0,
    lineageTrail: [],
    isLastLineageChild: false,
    lineageChildCount: 0,
  };
}

function headerRow(key: string, worktreeIds: string[]): GroupHeaderRow {
  return { type: "header", key, label: key, count: worktreeIds.length, tone: "", worktreeIds };
}

function folderRow(id: string, folderPath: string): HostSectionRow {
  return {
    type: "folder-workspace",
    key: `folder-workspace:${id}`,
    folderWorkspace: { id, folderPath } as FolderWorkspace,
    projectGroup: { id: "g" } as ProjectGroup,
    depth: 0,
    groupDepth: 0,
  };
}

describe("renderRowContainsWorktree (Orca parity)", () => {
  const wt = worktree("/repo/a/wt");
  const item = itemRow(wt, "repo:repo_a");

  it("matches an item row by workspace id, never a null id", () => {
    expect(renderRowContainsWorktree(item, wt.id)).toBe(true);
    expect(renderRowContainsWorktree(item, null)).toBe(false);
    expect(renderRowContainsWorktree(item, "other")).toBe(false);
  });

  it("treats a header's worktreeIds as containment for a collapsed group", () => {
    expect(renderRowContainsWorktree(headerRow("repo:repo_a", [wt.id]), wt.id)).toBe(true);
    expect(renderRowContainsWorktree(headerRow("repo:repo_a", []), wt.id)).toBe(false);
  });

  it("matches a folder workspace by its workspace key", () => {
    expect(renderRowContainsWorktree(folderRow("fw_1", "/repo/a"), "folder:fw_1")).toBe(true);
  });
});

describe("findPreferredRenderRowIndexForWorktree (Orca parity)", () => {
  it("prefers the natural-group item over its Pinned duplicate", () => {
    const wt = worktree("/repo/a/wt");
    const rows: HostSectionRow[] = [
      headerRow("pinned", [wt.id]),
      itemRow(wt, "pinned"),
      headerRow("repo:repo_a", [wt.id]),
      itemRow(wt, "repo:repo_a"),
    ];
    expect(findPreferredRenderRowIndexForWorktree(rows, wt.id, "duplicate-in-groups")).toBe(3);
  });

  it("prefers an item row over a header that also contains the workspace", () => {
    const wt = worktree("/repo/a/wt");
    const rows: HostSectionRow[] = [headerRow("repo:repo_a", [wt.id]), itemRow(wt, "repo:repo_a")];
    expect(findPreferredRenderRowIndexForWorktree(rows, wt.id, "single-location")).toBe(1);
  });

  it("falls back to the containing header while the group is collapsed", () => {
    const wt = worktree("/repo/a/wt");
    const rows: HostSectionRow[] = [headerRow("repo:repo_a", [wt.id])];
    expect(findPreferredRenderRowIndexForWorktree(rows, wt.id, "single-location")).toBe(0);
  });
});

describe("findRevealRowIndex (Orca parity)", () => {
  it("keeps folder-workspace path reveals on the folder row", () => {
    const rows: HostSectionRow[] = [headerRow("project-group:g", []), folderRow("fw_1", "/repo/a")];
    expect(findRevealRowIndex(rows, "/repo/a")).toBe(1);
  });

  it("resolves a worktree path to its preferred row, not the pinned duplicate", () => {
    const wt = worktree("/repo/a/wt");
    const rows: HostSectionRow[] = [
      itemRow(wt, "pinned"),
      headerRow("repo:repo_a", [wt.id]),
      itemRow(wt, "repo:repo_a"),
    ];
    expect(findRevealRowIndex(rows, "/repo/a/wt")).toBe(2);
  });

  it("returns -1 when no row paints the path", () => {
    expect(findRevealRowIndex([headerRow("repo:repo_a", [])], "/repo/a/missing")).toBe(-1);
  });
});

describe("rowKeyMatchesRenderRow (Orca parity)", () => {
  it("addresses headers by section key and items by row key", () => {
    const wt = worktree("/repo/a/wt");
    const item = itemRow(wt, "repo:repo_a");
    expect(rowKeyMatchesRenderRow(headerRow("repo:repo_a", []), "repo:repo_a")).toBe(true);
    expect(rowKeyMatchesRenderRow(item, item.rowKey)).toBe(true);
    expect(rowKeyMatchesRenderRow(item, "repo:repo_a")).toBe(false);
  });

  it("addresses folder workspaces by their workspace key", () => {
    expect(rowKeyMatchesRenderRow(folderRow("fw_1", "/repo/a"), "folder:fw_1")).toBe(true);
  });
});
