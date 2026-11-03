// Parity guard for D03b-025…037: the three header tiers reorder by pointer session.
// These tests pin the pure decisions (qualification, midpoints, commit vocabulary) that
// the hooks call; the drag loops themselves need a live pointer and are covered by the
// mounted sidebar test suite.
import { describe, expect, it } from "vitest";
import type { Repo } from "../../../../shared/repo-types";
import type { ProjectGroup } from "../../../../shared/project-group-types";
import type { Row } from "../grouping/row-types";
import {
  HEADER_DRAG_THRESHOLD_PX,
  hasPointerBeenReleased,
  isHeaderDragPromoted,
} from "./header-pointer-session";
import {
  commitProjectHeaderDragDrop,
  isProjectHeaderDragHandleTarget,
  isRepoHeaderActionTarget,
  type RepoHeaderDragSession,
} from "./repo-header-pointer-drag";
import {
  getProjectGroupHeaderDragBucketKey,
  getProjectGroupTabOrderUpdatesForSidebarDrop,
  getSidebarOrderedProjectGroupHeaderIdsByBucket,
  mapSidebarProjectGroupDropIndexToSiblingInsertIndex,
} from "./project-group-header-pointer-drag";
import {
  computeHostHeaderDropPreview,
  isHostHeaderActionTarget,
  moveHostIdForDrop,
} from "./host-header-pointer-drag";

function repo(id: string, projectGroupId: string | null = null): Repo {
  return {
    id,
    path: `/repo/${id}`,
    displayName: id,
    badgeColor: "#64748b",
    addedAt: 0,
    projectGroupId,
  } as Repo;
}

function headerRow(rowKey: string, opts: { repo?: Repo; group?: ProjectGroup }): Row {
  return {
    type: "header",
    key: rowKey,
    label: rowKey,
    count: 1,
    tone: "",
    ...(opts.repo ? { repo: opts.repo } : {}),
    ...(opts.group ? { projectGroup: opts.group } : {}),
  } as Row;
}

function group(id: string, parentGroupId: string | null, tabOrder = 0): ProjectGroup {
  return {
    id,
    name: id,
    parentPath: null,
    parentGroupId,
    createdFrom: "manual",
    tabOrder,
    isCollapsed: false,
    color: null,
    createdAt: 0,
    updatedAt: 0,
  };
}

function element(markup: string): HTMLElement {
  const host = document.createElement("div");
  host.innerHTML = markup;
  return host.firstElementChild as HTMLElement;
}

function repoSession(repoId: string, ids: readonly string[]): RepoHeaderDragSession {
  return {
    repoId,
    bucketKey: "group:g1",
    sidebarRepoHeaderIds: ids,
    pointerId: 1,
    headerRects: [],
    handleEl: document.createElement("div"),
    startX: 0,
    startY: 0,
    latestPointerY: 0,
    promoted: true,
  };
}

describe("header pointer session guards", () => {
  it("promotes only past the 4px threshold", () => {
    expect(HEADER_DRAG_THRESHOLD_PX).toBe(4);
    expect(isHeaderDragPromoted({ startX: 0, startY: 0, clientX: 3, clientY: 0 })).toBe(false);
    expect(isHeaderDragPromoted({ startX: 0, startY: 0, clientX: 4, clientY: 0 })).toBe(true);
  });

  it("treats a release with no held button as ended", () => {
    expect(hasPointerBeenReleased({ buttons: 0 })).toBe(true);
    expect(hasPointerBeenReleased({ buttons: 1 })).toBe(false);
  });
});

describe("repo header qualification (D03b-025/026)", () => {
  it("arms only from the drag handle", () => {
    const header = element(
      '<div data-repo-header-drag-handle=""><span id="title">repo</span></div>'
    );
    expect(isProjectHeaderDragHandleTarget(header.querySelector("#title"), header)).toBe(true);
    const plain = element("<div><span id='title'>repo</span></div>");
    expect(isProjectHeaderDragHandleTarget(plain.querySelector("#title"), plain)).toBe(false);
  });

  it("never arms from an action inside the header", () => {
    const header = element(
      '<div data-repo-header-drag-handle=""><button id="menu"><svg id="icon"></svg></button></div>'
    );
    expect(isRepoHeaderActionTarget(header.querySelector("#icon"), header)).toBe(true);
    expect(isRepoHeaderActionTarget(header.querySelector("#menu"), header)).toBe(true);
    expect(isRepoHeaderActionTarget(header, header)).toBe(false);
  });
});

describe("repo header commit (D03b-027/028/029)", () => {
  it("commits a sibling rank in project-group mode", () => {
    const groups = [group("g1"), group("g2")];
    let committed: { groupId: string | null; order: number } | null = null;
    commitProjectHeaderDragDrop({
      session: repoSession("r1", ["r1", "r2", "r3"]),
      sidebarDropIndex: 3,
      orderedRepoIds: ["r1", "r2", "r3"],
      repoById: new Map([
        ["r1", repo("r1", "g1")],
        ["r2", repo("r2", "g1")],
        ["r3", repo("r3", "g1")],
      ]),
      usesProjectGrouping: true,
      usesProjectGroupOrdering: true,
      onCommitRepoOrder: () => {
        throw new Error("global order must not be written in group mode");
      },
      onCommitProjectGroupOrder: (_repoId, groupId, order) => {
        committed = { groupId, order };
      },
    } as unknown as Parameters<typeof commitProjectHeaderDragDrop>[0]);
    expect(groups).toHaveLength(2);
    expect(committed).not.toBeNull();
    expect(committed!.groupId).toBe("g1");
  });

  it("moves every host-qualified occurrence as one block in global mode", () => {
    let ordered: string[] | null = null;
    commitProjectHeaderDragDrop({
      session: repoSession("r2", ["r1", "r2", "r3"]),
      sidebarDropIndex: 0,
      // r2 appears twice: one merged header controls both occurrences.
      orderedRepoIds: ["r1", "r2", "r2", "r3"],
      repoById: new Map([
        ["r1", repo("r1")],
        ["r2", repo("r2")],
        ["r3", repo("r3")],
      ]),
      usesProjectGroupOrdering: false,
      onCommitRepoOrder: (ids) => {
        ordered = ids;
      },
      onCommitProjectGroupOrder: () => {
        throw new Error("group rank must not be written in global mode");
      },
    });
    expect(ordered).toEqual(["r2", "r2", "r1", "r3"]);
  });

  it("does not write when the drop lands on the dragged header's own slots", () => {
    let writes = 0;
    const common = {
      session: repoSession("r1", ["r1", "r2"]),
      orderedRepoIds: ["r1", "r2"],
      repoById: new Map([
        ["r1", repo("r1")],
        ["r2", repo("r2")],
      ]),
      usesProjectGroupOrdering: false,
      onCommitRepoOrder: () => {
        writes += 1;
      },
      onCommitProjectGroupOrder: () => {
        writes += 1;
      },
    };
    commitProjectHeaderDragDrop({ ...common, sidebarDropIndex: 0 });
    commitProjectHeaderDragDrop({ ...common, sidebarDropIndex: 1 });
    expect(writes).toBe(0);
  });
});

describe("project-group headers (D03b-030…033)", () => {
  it("buckets groups by parent and falls back to root for orphans", () => {
    const byId = new Map([
      ["outer", group("outer", null)],
      ["inner", group("inner", "outer")],
      ["orphan", group("orphan", "missing-parent")],
    ]);
    expect(getProjectGroupHeaderDragBucketKey(byId.get("outer")!, byId)).toBe("root");
    expect(getProjectGroupHeaderDragBucketKey(byId.get("inner")!, byId)).toBe("parent:outer");
    expect(getProjectGroupHeaderDragBucketKey(byId.get("orphan")!, byId)).toBe("root");
  });

  it("orders only the dragged group's sibling bucket", () => {
    const buckets = getSidebarOrderedProjectGroupHeaderIdsByBucket(
      [
        headerRow("g:outer", { group: group("outer", null) }),
        headerRow("g:inner", { group: group("inner", "outer") }),
      ],
      new Map([
        ["outer", group("outer", null)],
        ["inner", group("inner", "outer")],
      ])
    );
    expect(buckets.get("root")).toEqual(["outer"]);
    expect(buckets.get("parent:outer")).toEqual(["inner"]);
  });

  it("updates discrete tabOrder values for every sibling", () => {
    const byId = new Map([
      ["a", group("a", null, 0)],
      ["b", group("b", null, 0)],
      ["c", group("c", null, 0)],
    ]);
    const updates = getProjectGroupTabOrderUpdatesForSidebarDrop({
      sidebarProjectGroupHeaderIds: ["a", "b", "c"],
      draggedGroupId: "c",
      sidebarDropIndex: 0,
      projectGroupById: byId,
    });
    // `c` already has tabOrder 0, so only the shifted siblings are written.
    expect(updates).toEqual([
      { groupId: "a", tabOrder: 1 },
      { groupId: "b", tabOrder: 2 },
    ]);
  });

  it("maps a drop index including the dragged header to its sibling slot", () => {
    expect(
      mapSidebarProjectGroupDropIndexToSiblingInsertIndex({
        sidebarDropIndex: 2,
        sourceIndex: 0,
        siblingCount: 2,
      })
    ).toBe(1);
  });
});

describe("host headers (D03b-034…037)", () => {
  const rects = [
    { hostId: "local" as never, top: 0, bottom: 32 },
    { hostId: "ssh:a" as never, top: 40, bottom: 72 },
  ];

  it("resolves the insertion slot by section midpoint", () => {
    expect(
      computeHostHeaderDropPreview({
        pointerY: 10,
        containerRect: { top: 0 },
        scrollTop: 0,
        rects,
      })
    ).toEqual({ dropIndex: 0, dropIndicatorY: 0 });
    expect(
      computeHostHeaderDropPreview({
        pointerY: 60,
        containerRect: { top: 0 },
        scrollTop: 0,
        rects,
      })
    ).toEqual({ dropIndex: 2, dropIndicatorY: 76 });
  });

  it("splices the dragged host id into its new slot", () => {
    expect(moveHostIdForDrop(["local", "ssh:a", "ssh:b"] as never, "ssh:b" as never, 0)).toEqual([
      "ssh:b",
      "local",
      "ssh:a",
    ]);
    expect(
      moveHostIdForDrop(["local", "ssh:a", "ssh:b"] as never, "local" as never, 0)
    ).toBeNull();
    expect(moveHostIdForDrop(["local"] as never, "local" as never, 1)).toBeNull();
  });

  it("never arms a drag from a host action", () => {
    const header = element('<div data-host-header-drag-handle=""><button id="menu"></button></div>');
    expect(isHostHeaderActionTarget(header.querySelector("#menu"), header)).toBe(true);
    expect(isHostHeaderActionTarget(header, header)).toBe(false);
  });
});
