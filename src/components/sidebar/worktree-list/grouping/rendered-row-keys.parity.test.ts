// D03a-052: the rendered row key set is the contract the reveal path reads before
// relaxing sidebar filters.
import { describe, expect, it } from "vitest";
import { toWorktreeRow } from "../../../../shared/worktree/worktree-row";
import type { Repo } from "../../../../shared/repo-types";
import type { Worktree } from "../../../../shared/worktree/types";
import type { HostSectionRow } from "../../host-section-rows";
import { buildRows } from "./build-rows";
import type { Row } from "./row-types";
import {
  collectRenderedSidebarRowKeys,
  shouldRelaxFiltersForRevealRow,
} from "./rendered-row-keys";

const REPO_ID = "repo_a";

function repo(): Repo {
  return {
    id: REPO_ID,
    path: "/repo/a",
    displayName: "a",
    badgeColor: "#64748b",
    addedAt: 0,
    projectGroupId: null,
  } as Repo;
}

function worktree(path: string, branch: string): Worktree {
  return toWorktreeRow(
    { path, head_commit: "abc1234", branch, is_bare: false, is_main: false },
    { repoId: REPO_ID, hostId: "local" }
  );
}

describe("collectRenderedSidebarRowKeys (D03a-052)", () => {
  it("collects header, item, folder and pending-creation keys", () => {
    const rows: HostSectionRow[] = [
      {
        type: "header",
        key: "repo:repo_a",
        label: "a",
        count: 1,
        tone: "",
        repo: repo(),
      },
      {
        type: "item",
        rowKey: "repo:repo_a:wt-1",
        sectionKey: "repo:repo_a",
        worktree: worktree("/repo/a/wt", "feat"),
        repo: repo(),
        depth: 0,
        groupDepth: 0,
        lineageTrail: [],
        isLastLineageChild: false,
        lineageChildCount: 0,
      },
      {
        type: "folder-workspace",
        key: "folder-workspace:fw-1",
        folderWorkspace: {
          id: "fw-1",
          projectGroupId: "g1",
          name: "notes",
          folderPath: "/notes",
          linkedTask: null,
          comment: "",
          isArchived: false,
          isUnread: false,
          isPinned: false,
          sortOrder: 0,
          lastActivityAt: 0,
          createdAt: 0,
          updatedAt: 0,
        },
        projectGroup: { id: "g1", name: "g1", tabOrder: 0 } as never,
        depth: 0,
        groupDepth: 0,
      },
      {
        type: "pending-creation",
        key: "pending:creation-1",
        creationId: "creation-1",
        repo: repo(),
      },
    ];

    const keys = collectRenderedSidebarRowKeys(rows);

    expect(keys.has("repo:repo_a")).toBe(true);
    expect(keys.has("repo:repo_a:wt-1")).toBe(true);
    expect(keys.has("folder-workspace:fw-1")).toBe(true);
    expect(keys.has("folder:fw-1")).toBe(true);
    expect(keys.has("pending:creation-1")).toBe(true);
  });

  it("matches the row model buildRows paints, including notice rows", () => {
    const rows: Row[] = buildRows(
      "repo",
      [],
      new Map([[REPO_ID, repo()]]),
      null,
      new Set(),
      undefined,
      undefined,
      "manual",
      {},
      new Map(),
      false,
      undefined,
      [],
      new Set([REPO_ID]),
      new Map([
        [
          REPO_ID,
          {
            repo: repo(),
            hiddenWorktrees: [{ path: "/repo/a/external", branch: "feat" }],
          },
        ],
      ]),
      new Map()
    );

    const keys = collectRenderedSidebarRowKeys(rows);
    expect(keys.has("repo:repo_a")).toBe(true);
    expect(keys.has("imported-worktrees-card:repo-group:repo_a")).toBe(true);
  });
});

describe("shouldRelaxFiltersForRevealRow (D03a-052)", () => {
  const rendered = new Set(["repo:repo_a"]);

  it("relaxes when a filter hides a still-existing target", () => {
    expect(
      shouldRelaxFiltersForRevealRow({
        rowKey: "repo:repo_b",
        renderedSidebarRowKeys: rendered,
        hasFilters: true,
        targetResolved: true,
      })
    ).toBe(true);
  });

  it("does not relax when the row is painted", () => {
    expect(
      shouldRelaxFiltersForRevealRow({
        rowKey: "repo:repo_a",
        renderedSidebarRowKeys: rendered,
        hasFilters: true,
        targetResolved: true,
      })
    ).toBe(false);
  });

  it("does not relax when no filter is active or the target vanished", () => {
    expect(
      shouldRelaxFiltersForRevealRow({
        rowKey: "repo:repo_b",
        renderedSidebarRowKeys: rendered,
        hasFilters: false,
        targetResolved: true,
      })
    ).toBe(false);
    expect(
      shouldRelaxFiltersForRevealRow({
        rowKey: "repo:repo_b",
        renderedSidebarRowKeys: rendered,
        hasFilters: true,
        targetResolved: false,
      })
    ).toBe(false);
  });
});
