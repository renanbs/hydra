// Sticky section headers as painted by the viewport: the host card pins as the outer tier and
// the group header hands off beneath it, while the listbox, keyboard and pointer drag keep
// working over the same slots.
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import "@testing-library/jest-dom/vitest";
import React from "react";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { useAppStore } from "@/store";
import type { ExecutionHostId } from "../../../../shared/execution-host";
import type { Repo } from "../../../../shared/repo-types";
import { toWorktreeRow } from "../../../../shared/worktree/worktree-row";
import type { HostSectionRow } from "../../host-section-rows";
import type { WorktreeRow } from "../grouping/row-types";
import { WorktreeList } from "../../WorktreeList";
import type { GitWorktreeInfo, HydraProject } from "../../types";
import type { WorkspaceDisplayOptions } from "../../WorkspaceOptionsMenu";
import { VirtualizedWorktreeViewport } from "./VirtualizedWorktreeViewport";
import { getWorktreeOptionId } from "./option-id";
import { HOST_STICKY_PINNED_HEIGHT } from "./virtual-rows";

const ROW_HEIGHT = 40;
const VIEWPORT_HEIGHT = 480;

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

function groupRow(key: string): HostSectionRow {
  return { type: "header", key, label: key, count: 1, tone: "text-foreground" };
}

function itemRow(rowKey: string, path: string): HostSectionRow {
  return {
    type: "item",
    rowKey,
    sectionKey: "all",
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

function itemRows(prefix: string, count: number): HostSectionRow[] {
  return Array.from({ length: count }, (_, index) =>
    itemRow(`all|${prefix}-${index}`, `/repo/${prefix}/w${index}`)
  );
}

/** Two host sections, each with its own group header and enough cards to scroll. */
const TWO_TIER_ROWS: HostSectionRow[] = [
  hostRow("local"),
  groupRow("repo:repo_a"),
  ...itemRows("a", 11),
  hostRow("ssh:srv"),
  groupRow("repo:repo_b"),
  ...itemRows("b", 11),
];

type ActivateRow = (row: WorktreeRow) => void;

function renderViewport(rows: HostSectionRow[]): {
  container: HTMLElement;
  listbox: HTMLElement;
  scroller: HTMLElement;
  onActivateRow: Mock<ActivateRow>;
} {
  const onActivateRow = vi.fn<ActivateRow>();
  const scrollRef: React.RefObject<HTMLDivElement | null> = { current: null };

  function Harness(): React.JSX.Element {
    const [activeRowKey, setActiveRowKey] = React.useState<string | null>(null);
    return (
      <VirtualizedWorktreeViewport
        rows={rows}
        activeRowKey={activeRowKey}
        groupBy="repo"
        pinnedDisplayPolicy="single-location"
        revealPath={null}
        renderRow={(row, slot) => (
          <div
            id={slot.optionId}
            role="option"
            aria-selected={slot.isActive}
            data-row-key={row.key}
          />
        )}
        onActivateRow={(row) => {
          onActivateRow(row);
          setActiveRowKey(row.rowKey);
        }}
        onToggleRowCollapse={vi.fn()}
        scrollRef={scrollRef}
      />
    );
  }

  const { container } = render(<Harness />);
  const scroller = container.querySelector<HTMLElement>("[data-worktree-sidebar]")!;
  return {
    container,
    scroller,
    listbox: container.querySelector<HTMLElement>('[role="listbox"]')!,
    onActivateRow,
  };
}

/** jsdom keeps no scroll position; give the scroller a real, writable offset. */
async function scrollTo(scroller: HTMLElement, scrollTop: number): Promise<void> {
  Object.defineProperty(scroller, "scrollTop", { configurable: true, writable: true, value: 0 });
  await act(async () => {
    scroller.scrollTop = scrollTop;
    fireEvent.scroll(scroller);
  });
}

function slotWrapper(container: HTMLElement, rowKey: string): HTMLElement | null {
  return container.querySelector<HTMLElement>(`[data-worktree-virtual-row-key="${rowKey}"]`);
}

describe("sticky section headers in the viewport", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("pins the host card, then hands the group header off beneath it", async () => {
    const { container, scroller } = renderViewport(TWO_TIER_ROWS);

    const hostWrapper = slotWrapper(container, "host:local");
    expect(hostWrapper).toHaveAttribute("data-worktree-sticky-header-active");
    expect(hostWrapper).toHaveClass("sticky", "z-30", "bg-worktree-sidebar", "pt-1");
    expect(hostWrapper?.style.top).toBe("-1px");

    // The group's slot is still in flow below the pin, so it is not pinned yet.
    const groupWrapper = slotWrapper(container, "hdr:repo:repo_a");
    expect(groupWrapper).not.toHaveAttribute("data-worktree-sticky-header-active");

    await scrollTo(scroller, 300);

    expect(slotWrapper(container, "host:local")).toHaveAttribute(
      "data-worktree-sticky-header-active"
    );
    const pinnedGroup = slotWrapper(container, "hdr:repo:repo_a");
    expect(pinnedGroup).toHaveAttribute("data-worktree-sticky-header-active");
    expect(pinnedGroup).toHaveClass("sticky", "z-20", "bg-worktree-sidebar");
    // The group tier pins flush beneath the pinned host card, not at the viewport top.
    expect(pinnedGroup?.style.top).toBe(`${HOST_STICKY_PINNED_HEIGHT - 1}px`);

    // A card keeps its own slot transform; only headers paint a sticky frame.
    const cardWrapper = slotWrapper(container, "wt:all|a-4");
    expect(cardWrapper).toHaveClass("absolute");
    expect(cardWrapper).not.toHaveAttribute("data-worktree-sticky-header-active");
    expect(cardWrapper?.style.transform).not.toBe("");
  });

  it("keeps the listbox pointing at the mounted active row, and still navigates it", () => {
    const { listbox, container, onActivateRow } = renderViewport(TWO_TIER_ROWS);

    expect(listbox).toHaveAttribute("aria-orientation", "vertical");
    expect(listbox).not.toHaveAttribute("aria-activedescendant");

    fireEvent.keyDown(listbox, { key: "ArrowDown" });

    // The first focusable row is a card: the pinned host header is not a focus target.
    expect(onActivateRow).toHaveBeenCalledTimes(1);
    expect(onActivateRow.mock.calls[0]?.[0]).toMatchObject({ rowKey: "all|a-0" });
    const activeOptionId = getWorktreeOptionId("all|a-0");
    expect(listbox).toHaveAttribute("aria-activedescendant", activeOptionId);
    expect(container.querySelector(`#${CSS.escape(activeOptionId)}`)).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });
});

const PROJECTS: HydraProject[] = [
  { id: "repo_a", name: "hydra", path: "/repo/hydra", is_git: true, current_branch: "main" },
  { id: "repo_b", name: "orca", path: "/repo/orca", is_git: true, current_branch: "main" },
];

// Kept small on purpose: with every row mounted the virtualizer measures all of them, so the
// slot starts below are the real 40px rhythm instead of the 116px pre-measure card estimate.
const WORKTREE_COUNT = 8;

const WORKTREES_BY_PROJECT: Record<string, GitWorktreeInfo[]> = {
  repo_a: Array.from({ length: WORKTREE_COUNT }, (_, index) => ({
    path: `/repo/hydra/w${index}`,
    head_commit: "abc1234",
    branch: `w${index}`,
    is_bare: false,
    is_locked: false,
  })),
  repo_b: Array.from({ length: WORKTREE_COUNT }, (_, index) => ({
    path: `/repo/orca/w${index}`,
    head_commit: "abc1234",
    branch: `w${index}`,
    is_bare: false,
    is_locked: false,
  })),
};

const DISPLAY_OPTIONS: WorkspaceDisplayOptions = {
  groupBy: "repo",
  sortBy: "name",
  hideSleeping: false,
  hideDefaultBranch: false,
  hideAutomationCreated: false,
  hideCliCreated: false,
  hideDetachedHead: false,
};

function resetStore(): void {
  useAppStore.setState({
    repos: [],
    sshTargetLabels: new Map(),
    sshConnectionStates: new Map(),
    runtimeEnvironments: [],
    settings: null,
    visibleWorkspaceHostIds: [],
    workspaceHostScope: null,
    worktreeLineageById: {},
  });
}

function fakeRect(top: number, bottom: number): DOMRect {
  return {
    top,
    bottom,
    left: 0,
    right: 300,
    width: 300,
    height: bottom - top,
    x: 0,
    y: top,
    toJSON: () => ({}),
  } as DOMRect;
}

/**
 * A painted card reports its own box at its slot's origin and the scroll container reports the
 * viewport, exactly as jsdom-accurate rects look: the drag can only place a card by reading the
 * virtual slot it sits in.
 */
function installSyntheticRowRects(): void {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (
    this: Element
  ): DOMRect {
    if (this.hasAttribute("data-worktree-drag-id")) {
      return fakeRect(0, ROW_HEIGHT);
    }
    if (this.hasAttribute("data-worktree-sidebar")) {
      return fakeRect(0, VIEWPORT_HEIGHT);
    }
    return fakeRect(0, 0);
  });
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(300);
}

interface DragRow {
  element: HTMLElement;
  groupIndex: number;
  path: string;
  slotTop: number;
}

async function settle(): Promise<void> {
  await act(async () => {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
  });
}

function readDragRows(root: ParentNode): DragRow[] {
  return Array.from(root.querySelectorAll<HTMLElement>("[data-worktree-drag-id]"))
    .map((element) => ({
      element,
      groupIndex: Number(element.getAttribute("data-worktree-drag-group-index")),
      path: element.getAttribute("data-worktree-path") ?? "",
      slotTop: Number(
        element
          .closest("[data-worktree-virtual-row]")
          ?.getAttribute("data-worktree-virtual-row-start") ?? "NaN"
      ),
    }))
    .sort((a, b) => a.groupIndex - b.groupIndex);
}

describe("the painted list with sticky headers", () => {
  beforeEach(() => {
    resetStore();
    installSyntheticRowRects();
  });
  afterEach(() => {
    cleanup();
    resetStore();
    vi.restoreAllMocks();
  });

  async function renderList(): Promise<{
    container: HTMLElement;
    scroller: HTMLElement;
    onReorderWorktreesInGroup: Mock<(ordered: GitWorktreeInfo[], projectPath: string) => void>;
  }> {
    const onReorderWorktreesInGroup = vi.fn<
      (ordered: GitWorktreeInfo[], projectPath: string) => void
    >();
    const { container } = render(
      <WorktreeList
        projects={PROJECTS}
        displayProjects={PROJECTS}
        activeProject={PROJECTS[0]!}
        sessions={[]}
        collapsedProjects={new Set()}
        collapsedGroups={new Set()}
        displayOptions={DISPLAY_OPTIONS}
        getFilteredAndSortedWorktrees={(project) => WORKTREES_BY_PROJECT[project.id] ?? []}
        onSelectProject={vi.fn()}
        onSelectGitWorktree={vi.fn()}
        onDeleteGitWorktree={vi.fn()}
        onSelectSession={vi.fn()}
        onOpenNewWorkspaceModal={vi.fn()}
        onOpenAddRepoDialog={vi.fn()}
        onToggleProjectCollapse={vi.fn()}
        onToggleGroupCollapse={vi.fn()}
        onReorderWorktreesInGroup={onReorderWorktreesInGroup}
        onAssignWorktreeStatus={vi.fn()}
      />
    );
    // Measurement and the first windowed render settle inside these frames.
    await settle();
    return {
      container,
      scroller: container.querySelector<HTMLElement>("[data-worktree-sidebar]")!,
      onReorderWorktreesInGroup,
    };
  }

  it("hands the pinned header off to the next project while scrolling", async () => {
    const { container, scroller } = await renderList();

    expect(slotWrapper(container, "hdr:repo:repo_a")).toHaveAttribute(
      "data-worktree-sticky-header-active"
    );

    // The second project's header sits below the first project's 8 cards.
    await scrollTo(scroller, 500);

    const incomingHeader = slotWrapper(container, "hdr:repo:repo_b");
    expect(incomingHeader).toHaveAttribute("data-worktree-sticky-header-active");
    expect(incomingHeader).toHaveClass("sticky");
    // The header it handed off from stays mounted (its slot is the previous sticky), unpinned.
    expect(slotWrapper(container, "hdr:repo:repo_a")).not.toHaveAttribute(
      "data-worktree-sticky-header-active"
    );
  });

  it("still reorders by pointer drag while a header is pinned", async () => {
    const { scroller, onReorderWorktreesInGroup } = await renderList();
    const rows = readDragRows(scroller);
    const [dragged, , target] = rows;

    expect(rows.length).toBeGreaterThan(3);
    fireEvent.pointerDown(dragged!.element, {
      button: 0,
      pointerId: 1,
      pointerType: "mouse",
      clientX: 40,
      clientY: dragged!.slotTop + ROW_HEIGHT / 2,
    });
    fireEvent.pointerMove(document, {
      pointerId: 1,
      pointerType: "mouse",
      clientX: 40,
      clientY: dragged!.slotTop + ROW_HEIGHT / 2 + 10,
    });
    await settle();
    fireEvent.pointerMove(document, {
      pointerId: 1,
      pointerType: "mouse",
      clientX: 40,
      clientY: target!.slotTop + ROW_HEIGHT / 2,
    });
    await settle();
    fireEvent.pointerUp(document, {
      pointerId: 1,
      pointerType: "mouse",
      clientX: 40,
      clientY: target!.slotTop + ROW_HEIGHT / 2,
    });

    // The drag commits one reorder per painted group, so the reordered project is asserted by
    // its own commit.
    const reorderedCall = onReorderWorktreesInGroup.mock.calls.find(
      ([, projectPath]) => projectPath === PROJECTS[0]!.path
    );
    expect(reorderedCall).toBeDefined();
    const [ordered] = reorderedCall!;
    expect(ordered.findIndex((entry) => entry.path === dragged!.path)).toBe(target!.groupIndex);
  });
});
