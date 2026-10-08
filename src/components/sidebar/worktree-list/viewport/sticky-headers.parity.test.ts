// Sticky section headers in the virtualized workspaces viewport: which rows can pin, and which
// one is pinned for a given scroll position. The host card is the outer tier and project/group
// headers the inner one, so the two are asserted together — including the case where a group
// from the previous host must NOT pin beneath the next host's card.
import { describe, expect, it } from "vitest";
import "@testing-library/jest-dom/vitest";
import type { ExecutionHostId } from "../../../../shared/execution-host";
import type { ProjectGroup } from "../../../../shared/project-group-types";
import type { Repo } from "../../../../shared/repo-types";
import type { Worktree } from "../../../../shared/worktree/types";
import type { HostSectionRow } from "../../host-section-rows";
import { buildRows } from "../grouping/build-rows";
import {
  HOST_STICKY_PINNED_HEIGHT,
  extractWorktreeVirtualRowIndexes,
  getActiveStickyIndexesForScroll,
  getStickyHeaderIndexes,
} from "./virtual-rows";

const REPO: Repo = {
  id: "repo_a",
  path: "/repo/hydra",
  displayName: "hydra",
  badgeColor: "#64748b",
  addedAt: 0,
};

function hostRow(hostId: ExecutionHostId): HostSectionRow {
  return {
    type: "host-header",
    key: `host:${hostId}`,
    hostId,
    kind: "ssh",
    label: hostId,
    detail: "SSH",
    health: "available",
    collapsed: false,
    count: 1,
  };
}

function groupRow(key: string, projectGroupDepth?: number): HostSectionRow {
  return {
    type: "header",
    key,
    label: key,
    count: 1,
    tone: "text-foreground",
    ...(projectGroupDepth === undefined ? {} : { projectGroupDepth }),
  };
}

function makeWorktree(id: string, repoId = REPO.id): Worktree {
  return {
    id,
    repoId,
    path: `/repo/hydra/${id}`,
    head: "abc1234",
    branch: `refs/heads/${id}`,
    isBare: false,
    isMainWorktree: false,
    displayName: id,
    comment: "",
    linkedIssue: null,
    linkedPR: null,
    linkedLinearIssue: null,
    linkedGitLabMR: null,
    linkedGitLabIssue: null,
    isArchived: false,
    isUnread: false,
    isPinned: false,
    sortOrder: 0,
    lastActivityAt: 0,
  };
}

function itemRow(rowKey: string, id: string): HostSectionRow {
  return {
    type: "item",
    rowKey,
    sectionKey: rowKey.split(":")[0] ?? "all",
    worktree: makeWorktree(id),
    repo: REPO,
    depth: 0,
    groupDepth: 0,
    lineageTrail: [],
    isLastLineageChild: true,
    lineageChildCount: 0,
  };
}

/** A slot as TanStack hands it to the range extractor: identity plus its painted geometry. */
function slot(index: number, start: number, size = 44) {
  return { key: `row:${index}`, index, start, end: start + size, size, lane: 0 };
}

const TWO_TIER_ROWS: HostSectionRow[] = [
  hostRow("local"),
  groupRow("repo:repo_a", 0),
  itemRow("all:repo_a|wt-1", "wt-1"),
  hostRow("ssh:srv"),
  groupRow("repo:repo_b", 0),
  itemRow("all:repo_b|wt-2", "wt-2"),
];

describe("getStickyHeaderIndexes", () => {
  it("keeps nested project rows from replacing their top-level project group header", () => {
    expect(
      getStickyHeaderIndexes([
        groupRow("project-group:personal", 0),
        groupRow("repo:autogenie", 1),
        itemRow("all:repo_a|wt-1", "wt-1"),
        groupRow("repo:ungrouped", 0),
      ])
    ).toEqual([0, 3]);
  });

  it("uses the real project-group hierarchy when choosing sticky headers", () => {
    const projectGroup: ProjectGroup = {
      id: "group-personal",
      name: "personal",
      parentPath: "/workspace",
      parentGroupId: null,
      createdFrom: "manual",
      tabOrder: 0,
      isCollapsed: false,
      color: null,
      createdAt: 1,
      updatedAt: 1,
    };
    const groupedRepo: Repo = {
      ...REPO,
      id: "repo-autogenie",
      displayName: "AutoGenie",
      projectGroupId: projectGroup.id,
      projectGroupOrder: 0,
    };
    const ungroupedRepo: Repo = { ...REPO, id: "repo-hydra", displayName: "hydra" };
    const rows = buildRows(
      "repo",
      [
        { ...makeWorktree("main", groupedRepo.id), id: "wt-autogenie-main", isMainWorktree: true },
        { ...makeWorktree("main", ungroupedRepo.id), id: "wt-hydra-main", isMainWorktree: true },
      ],
      new Map([
        [groupedRepo.id, groupedRepo],
        [ungroupedRepo.id, ungroupedRepo],
      ]),
      null,
      new Set(),
      new Map([
        [groupedRepo.id, 0],
        [ungroupedRepo.id, 1],
      ]),
      undefined,
      "manual",
      undefined,
      undefined,
      false,
      undefined,
      [projectGroup]
    );

    expect(rows.filter((row) => row.type === "header").map((row) => row.key)).toEqual([
      "project-group:group-personal",
      "repo:repo-autogenie",
      "repo:repo-hydra",
    ]);
    expect(getStickyHeaderIndexes(rows)).toEqual([0, 3]);
  });

  it("pins host cards as well as top-level group headers", () => {
    expect(getStickyHeaderIndexes(TWO_TIER_ROWS)).toEqual([0, 1, 3, 4]);
  });
});

describe("getActiveStickyIndexesForScroll", () => {
  const sticky = getStickyHeaderIndexes(TWO_TIER_ROWS);

  it("pins nothing before the first header", () => {
    expect(
      getActiveStickyIndexesForScroll({
        rows: TWO_TIER_ROWS,
        rangeStartIndex: 0,
        scrollOffset: 0,
        stickyHeaderIndexes: [],
        virtualItems: [],
      })
    ).toEqual({ hostIndex: null, groupIndex: null });
  });

  it("degrades to the single-tier rules when the list paints no host sections", () => {
    const rows: HostSectionRow[] = [
      groupRow("repo:a", 0),
      itemRow("all:repo_a|wt-1", "wt-1"),
      groupRow("repo:b", 0),
      itemRow("all:repo_b|wt-2", "wt-2"),
    ];
    const indexes = getStickyHeaderIndexes(rows);

    // The first group pins from the start and hands off only once the next one reaches the top.
    expect(
      getActiveStickyIndexesForScroll({
        rows,
        rangeStartIndex: 1,
        scrollOffset: 40,
        stickyHeaderIndexes: indexes,
        virtualItems: [slot(0, 0), slot(1, 44), slot(2, 88)],
      })
    ).toEqual({ hostIndex: null, groupIndex: 0 });

    expect(
      getActiveStickyIndexesForScroll({
        rows,
        rangeStartIndex: 2,
        scrollOffset: 80,
        stickyHeaderIndexes: indexes,
        virtualItems: [slot(0, 0), slot(2, 88)],
      })
    ).toEqual({ hostIndex: null, groupIndex: 0 });

    expect(
      getActiveStickyIndexesForScroll({
        rows,
        rangeStartIndex: 2,
        scrollOffset: 88,
        stickyHeaderIndexes: indexes,
        virtualItems: [slot(0, 0), slot(2, 88)],
      })
    ).toEqual({ hostIndex: null, groupIndex: 2 });
  });

  it("keeps the host card pinned while its own group hands off beneath it", () => {
    // The group pins at the bottom edge of the host card, not at the viewport top.
    expect(
      getActiveStickyIndexesForScroll({
        rows: TWO_TIER_ROWS,
        rangeStartIndex: 2,
        scrollOffset: 100,
        stickyHeaderIndexes: sticky,
        virtualItems: [slot(0, 0, 32), slot(1, 36), slot(2, 80), slot(3, 400, 32), slot(4, 436)],
      })
    ).toEqual({ hostIndex: 0, groupIndex: 1 });
  });

  it("hands the group tier to the next host's own group, and never to the previous host's", () => {
    const hostCard = slot(0, 0, 32);
    const pinnedGroup = slot(1, 36);
    const firstItem = slot(2, 80);
    const nextHostCard = slot(3, 400, 32);
    // The next host's first group is still far below the pinned slot.
    const incomingGroupFarBelow = slot(4, 900);

    // The previous host is still the pinned one, so its group stays pinned under it.
    expect(
      getActiveStickyIndexesForScroll({
        rows: TWO_TIER_ROWS,
        rangeStartIndex: 2,
        scrollOffset: 380,
        stickyHeaderIndexes: sticky,
        virtualItems: [hostCard, pinnedGroup, firstItem, nextHostCard, incomingGroupFarBelow],
      })
    ).toEqual({ hostIndex: 0, groupIndex: 1 });

    // The next host takes the outer tier; the previous host's group is no longer eligible and
    // the incoming group has not reached the slot yet, so the group tier waits (pins nothing).
    expect(
      getActiveStickyIndexesForScroll({
        rows: TWO_TIER_ROWS,
        rangeStartIndex: 4,
        scrollOffset: 400,
        stickyHeaderIndexes: sticky,
        virtualItems: [hostCard, pinnedGroup, firstItem, nextHostCard, incomingGroupFarBelow],
      })
    ).toEqual({ hostIndex: 3, groupIndex: null });

    // Once it reaches the slot it pins, one pixel above the host card's bottom edge.
    expect(
      getActiveStickyIndexesForScroll({
        rows: TWO_TIER_ROWS,
        rangeStartIndex: 4,
        scrollOffset: 400,
        stickyHeaderIndexes: sticky,
        virtualItems: [
          hostCard,
          pinnedGroup,
          firstItem,
          nextHostCard,
          slot(4, 400 + HOST_STICKY_PINNED_HEIGHT),
        ],
      })
    ).toEqual({ hostIndex: 3, groupIndex: 4 });
  });

  it("keeps a host id when the window has not mounted it yet, but makes the group tier wait", () => {
    // The incoming host is not mounted yet: the previous host stays pinned, and its own group
    // stays pinned under it — the window has not reached the handoff yet.
    expect(
      getActiveStickyIndexesForScroll({
        rows: TWO_TIER_ROWS,
        rangeStartIndex: 4,
        scrollOffset: 400,
        stickyHeaderIndexes: sticky,
        virtualItems: [slot(0, 0, 32), slot(1, 36), slot(2, 80)],
      })
    ).toEqual({ hostIndex: 0, groupIndex: 1 });

    // The incoming host IS mounted, so it takes the outer tier; its group has no geometry yet,
    // so the group tier waits instead of pinning the previous host's group over the new card.
    expect(
      getActiveStickyIndexesForScroll({
        rows: TWO_TIER_ROWS,
        rangeStartIndex: 4,
        scrollOffset: 400,
        stickyHeaderIndexes: sticky,
        virtualItems: [slot(0, 0, 32), slot(1, 36), slot(3, 400, 32)],
      })
    ).toEqual({ hostIndex: 3, groupIndex: null });

    // Host tier with no previous mount either: the id is kept so the card cannot vanish.
    expect(
      getActiveStickyIndexesForScroll({
        rows: TWO_TIER_ROWS,
        rangeStartIndex: 4,
        scrollOffset: 400,
        stickyHeaderIndexes: sticky,
        virtualItems: [slot(2, 80), slot(5, 950)],
      })
    ).toEqual({ hostIndex: 3, groupIndex: null });
  });
});

describe("extractWorktreeVirtualRowIndexes", () => {
  it("extracts the active and previous sticky headers with the visible range", () => {
    expect(
      extractWorktreeVirtualRowIndexes({
        range: { startIndex: 8, endIndex: 10, overscan: 1, count: 20 },
        stickyHeaderIndexes: [0, 5, 9],
      })
    ).toEqual([0, 5, 7, 8, 9, 10, 11]);
  });

  it("falls back to the default range when no sticky header is active", () => {
    expect(
      extractWorktreeVirtualRowIndexes({
        range: { startIndex: 2, endIndex: 3, overscan: 1, count: 10 },
        stickyHeaderIndexes: [5],
      })
    ).toEqual([1, 2, 3, 4]);
  });

  it("keeps a pinned host card mounted even when it sits far above the window", () => {
    const rows = [
      hostRow("local"),
      groupRow("repo:repo_a", 0),
      ...Array.from({ length: 16 }, (_, index) => itemRow(`all:repo_a|wt-${index}`, `wt-${index}`)),
      hostRow("ssh:srv"),
      groupRow("repo:repo_b", 0),
      itemRow("all:repo_b|wt-b", "wt-b"),
    ];
    const indexes = getStickyHeaderIndexes(rows);

    // The window sits at the bottom of the first host's section: its card (index 0) and the
    // group header (index 1) are both 16 rows above it and must stay mounted.
    const extracted = extractWorktreeVirtualRowIndexes({
      range: { startIndex: 17, endIndex: 18, overscan: 1, count: rows.length },
      stickyHeaderIndexes: indexes,
      rows,
    });

    expect(extracted).toEqual([0, 1, 16, 17, 18, 19]);
  });
});
