// Row geometry of the virtualized viewport: heights, the pre-measure estimate, the stable
// identity the virtualizer keys slots with, and the stale-node guard. These are the numbers
// the painted list and the drag geometry both read, so they are asserted directly.
import { afterEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import type { ExecutionHostId } from "../../../../shared/execution-host";
import type { Repo } from "../../../../shared/repo-types";
import type { HostSectionRow } from "../../host-section-rows";
import { getRenderRowKey } from "../listing/render-row";
import { toWorktreeRow } from "../../../../shared/worktree/worktree-row";
import {
  GROUP_HEADER_ROW_HEIGHT,
  HOST_HEADER_ROW_HEIGHT,
  WORKTREE_SIDEBAR_VIRTUAL_ROW_GAP,
  estimateRenderRowSize,
  getVirtualRowIndex,
  getVirtualRowKey,
  getVirtualRowTransform,
  pruneStaleVirtualRowElementCache,
  shouldUseHeaderTopSpacing,
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

function groupRow(key: string, hostId?: ExecutionHostId): HostSectionRow {
  return {
    type: "header",
    key,
    label: key,
    count: 1,
    tone: "text-foreground",
    ...(hostId ? { hostId } : {}),
  };
}

function itemRow(rowKey: string, path: string): HostSectionRow {
  return {
    type: "item",
    rowKey,
    sectionKey: rowKey.split(":")[0] ?? "all",
    worktree: toWorktreeRow(
      { path, head_commit: "abc1234", branch: path, is_bare: false },
      { repoId: REPO.id }
    ),
    repo: REPO,
    depth: 0,
    groupDepth: 0,
    lineageTrail: [],
    isLastLineageChild: true,
    lineageChildCount: 0,
  };
}

function folderRow(id: string): HostSectionRow {
  return {
    type: "folder-workspace",
    key: `folder:${id}`,
    folderWorkspace: {
      id,
      projectGroupId: "grp_1",
      name: id,
      folderPath: `/clients/${id}`,
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
    projectGroup: {
      id: "grp_1",
      name: "Clients",
      parentPath: null,
      parentGroupId: null,
      createdFrom: "manual",
      tabOrder: 0,
      isCollapsed: false,
      color: null,
      createdAt: 0,
      updatedAt: 0,
    },
    depth: 0,
    groupDepth: 0,
  };
}

describe("render row identity (D03a-053)", () => {
  it("scopes repeated group headers to their host section", () => {
    expect(getRenderRowKey(groupRow("workspace-status:in-progress", "local"))).toBe(
      "hdr:local:workspace-status:in-progress"
    );
    expect(getRenderRowKey(groupRow("workspace-status:in-progress", "ssh:builder"))).toBe(
      "hdr:ssh:builder:workspace-status:in-progress"
    );
  });

  it("preserves unsectioned group header keys", () => {
    expect(getRenderRowKey(groupRow("workspace-status:in-progress"))).toBe(
      "hdr:workspace-status:in-progress"
    );
  });

  it("keeps the pipeline's own row key for item rows", () => {
    // `${sectionKey}:${hostIdentity}`, so one workspace under two sections stays two rows.
    expect(getRenderRowKey(itemRow("all:srv|wt-1", "/repo/wt-1"))).toBe("wt:all:srv|wt-1");
  });

  it("keys host, folder and notice rows by the identity they belong to", () => {
    expect(getRenderRowKey(hostRow("ssh:build-box"))).toBe("host:ssh:build-box");
    expect(getRenderRowKey(folderRow("fw_1"))).toBe("folder-workspace:fw_1");
    expect(
      getRenderRowKey({
        type: "imported-worktrees-card",
        key: "repo_a",
        repo: REPO,
        hiddenWorktrees: [],
        placement: "repo-group",
      })
    ).toBe("imported:repo_a");
    expect(
      getRenderRowKey({
        type: "new-external-worktrees-inbox",
        key: "repo_a",
        repo: REPO,
        inboxWorktrees: [],
      })
    ).toBe("inbox:repo_a");
  });
});

describe("row geometry", () => {
  const rows: HostSectionRow[] = [
    hostRow("ssh:a"),
    groupRow("a1"),
    itemRow("all:a1|wt-1", "/repo/wt-1"),
    itemRow("all:a1|wt-2", "/repo/wt-2"),
    folderRow("fw_1"),
  ];

  it("gives the first header no top margin and every later one the 4px rhythm", () => {
    expect(shouldUseHeaderTopSpacing({ rows, index: 0, firstHeaderIndex: 0 })).toBe(false);
    expect(shouldUseHeaderTopSpacing({ rows, index: 1, firstHeaderIndex: 0 })).toBe(true);
  });

  it("drops the top margin right after the collapsed Pinned header", () => {
    const pinnedRows: HostSectionRow[] = [
      groupRow("pinned"),
      groupRow("repo:repo_a"),
      itemRow("all:repo_a|wt-1", "/repo/wt-1"),
    ];
    expect(shouldUseHeaderTopSpacing({ rows: pinnedRows, index: 1, firstHeaderIndex: 0 })).toBe(
      false
    );
  });

  it("estimates each row kind before it has been measured", () => {
    expect(estimateRenderRowSize(rows, 0, 0)).toBe(HOST_HEADER_ROW_HEIGHT);
    expect(estimateRenderRowSize(rows, 1, 0)).toBe(GROUP_HEADER_ROW_HEIGHT + 4);
    expect(estimateRenderRowSize(rows, 2, 0)).toBe(116);
    expect(estimateRenderRowSize(rows, 4, 0)).toBe(64);
  });

  it("keeps the drag subsystem's 4px row rhythm", () => {
    // `drag/use-session.ts` replays `space-y-1` as the drag layout gap; a different gap here
    // would make the drop preview drift from the rows it animates.
    expect(WORKTREE_SIDEBAR_VIRTUAL_ROW_GAP).toBe(4);
  });

  it("places a slot with a Y transform", () => {
    expect(getVirtualRowTransform(132)).toBe("translateY(132px)");
  });

  it("reads a slot's index and key off the element", () => {
    const element = document.createElement("div");
    element.setAttribute("data-index", "7");
    element.setAttribute("data-worktree-virtual-row-key", "wt:all:repo_a|wt-1");
    expect(getVirtualRowIndex(element)).toBe(7);
    expect(getVirtualRowKey(element)).toBe("wt:all:repo_a|wt-1");

    element.removeAttribute("data-index");
    expect(getVirtualRowIndex(element)).toBeNull();
    element.setAttribute("data-index", "not-a-number");
    expect(getVirtualRowIndex(element)).toBeNull();
  });
});

describe("stale measured-node guard (D03a-099)", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("drops only the disconnected keys that no active row claims", () => {
    const live = document.createElement("div");
    const staleActive = document.createElement("div");
    const staleGone = document.createElement("div");
    document.body.append(live, staleActive);
    const elementsCache = new Map<unknown, Element>([
      ["wt:live", live],
      ["wt:stale-active", staleActive],
      ["wt:stale-gone", staleGone],
    ]);
    const measureElement = vi.fn();

    pruneStaleVirtualRowElementCache({
      activeRowKeys: new Set(["wt:live", "wt:stale-active"]),
      virtualizer: { elementsCache, measureElement },
    });

    expect(measureElement).toHaveBeenCalledWith(null);
    expect([...elementsCache.keys()]).toEqual(["wt:live", "wt:stale-active"]);
  });
});
