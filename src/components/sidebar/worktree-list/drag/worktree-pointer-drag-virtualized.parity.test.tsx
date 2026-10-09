// Pointer drag on the VIRTUALIZED list. jsdom has no layout, so every rect is synthetic — and
// here deliberately jsdom-accurate: a row reports its own box at its slot's origin (a 40px tall
// box at 0), the slot itself reports nothing, and the scroll container is not laid out either.
// The drag's absolute position therefore has exactly one possible source: the virtual slot the
// viewport stamped on the row (`data-worktree-virtual-row-start`). What the assertions check is
// the order a release commits.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { useAppStore } from "@/store";
import { WorktreeList } from "../../WorktreeList";
import type { GitWorktreeInfo, HydraProject } from "../../types";
import type { WorkspaceDisplayOptions } from "../../WorkspaceOptionsMenu";

const PROJECT: HydraProject = {
  id: "repo_a",
  name: "hydra",
  path: "/repo/hydra",
  is_git: true,
  current_branch: "main",
};

const ROW_HEIGHT = 40;
const VIEWPORT_HEIGHT = 480;
const WORKTREE_COUNT = 40;

function worktree(index: number): GitWorktreeInfo {
  return {
    path: `/repo/hydra/w${index}`,
    head_commit: "abc1234",
    branch: `w${String(index).padStart(2, "0")}`,
    is_bare: false,
    is_locked: false,
  };
}

const WORKTREES: GitWorktreeInfo[] = Array.from({ length: WORKTREE_COUNT }, (_, index) =>
  worktree(index)
);

const DISPLAY_OPTIONS: WorkspaceDisplayOptions = {
  groupBy: "repo",
  sortBy: "name",
  hideSleeping: false,
  hideDefaultBranch: false,
  hideAutomationCreated: false,
  hideCliCreated: false,
  hideDetachedHead: false,
};

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
 * Row heights come from the synthetic layout in `src/test-setup.ts`; rects come from here. A
 * painted row has its own box (height only — its position lives in the slot's transform), and
 * neither the slot wrapper nor the scroll container is laid out, exactly as in a real jsdom
 * render: the drag can only place a row correctly by reading its slot.
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

/** The painted rows of the drag group, in group order, with the slot each one sits in. */
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

async function renderList(): Promise<{
  container: HTMLElement;
  scroller: HTMLElement;
  rows: DragRow[];
  onReorderWorktreesInGroup: ReturnType<typeof vi.fn>;
}> {
  const onReorderWorktreesInGroup = vi.fn();
  const { container } = render(
    <WorktreeList
      projects={[PROJECT]}
      displayProjects={[PROJECT]}
      activeProject={PROJECT}
      sessions={[]}
      collapsedProjects={new Set()}
      collapsedGroups={new Set()}
      displayOptions={DISPLAY_OPTIONS}
      getFilteredAndSortedWorktrees={() => WORKTREES}
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

  const scroller = container.querySelector<HTMLElement>("[data-worktree-sidebar]")!;
  const rows = readDragRows(scroller);

  return { container, scroller, rows, onReorderWorktreesInGroup };
}

function pressRow(row: DragRow): void {
  fireEvent.pointerDown(row.element, {
    button: 0,
    pointerId: 1,
    pointerType: "mouse",
    clientX: 40,
    clientY: row.slotTop + ROW_HEIGHT / 2,
  });
  fireEvent.pointerMove(document, {
    pointerId: 1,
    pointerType: "mouse",
    clientX: 40,
    clientY: row.slotTop + ROW_HEIGHT / 2 + 10,
  });
}

function movePointerTo(row: DragRow): void {
  fireEvent.pointerMove(document, {
    pointerId: 1,
    pointerType: "mouse",
    clientX: 40,
    clientY: row.slotTop + ROW_HEIGHT / 2,
  });
}

function releasePointer(row: DragRow): void {
  fireEvent.pointerUp(document, {
    pointerId: 1,
    pointerType: "mouse",
    clientX: 40,
    clientY: row.slotTop + ROW_HEIGHT / 2,
  });
}

describe("worktree list pointer drag on the virtualized viewport", () => {
  beforeEach(() => {
    resetStore();
    installSyntheticRowRects();
  });
  afterEach(() => {
    cleanup();
    resetStore();
    vi.restoreAllMocks();
  });

  it("paints only a window of rows, and gives each of them a virtual slot", async () => {
    const { rows, scroller } = await renderList();

    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThan(WORKTREE_COUNT);
    expect(rows[0]?.slotTop).toBeGreaterThan(0);
    expect(scroller.querySelectorAll("[data-worktree-virtual-row-start]").length).toBe(
      rows.length + 1
    );
  });

  it("reorders within the painted window through the slot geometry", async () => {
    const { rows, onReorderWorktreesInGroup } = await renderList();
    const [first, , third] = rows;

    pressRow(first!);
    await settle();
    expect(first?.element).toHaveClass("opacity-0");

    movePointerTo(third!);
    await settle();
    releasePointer(third!);

    expect(onReorderWorktreesInGroup).toHaveBeenCalledTimes(1);
    const [ordered, projectPath] = onReorderWorktreesInGroup.mock.calls[0] as [
      GitWorktreeInfo[],
      string,
    ];
    expect(projectPath).toBe(PROJECT.path);
    expect(ordered.slice(0, 4).map((entry) => entry.path)).toEqual([
      "/repo/hydra/w1",
      "/repo/hydra/w2",
      "/repo/hydra/w0",
      "/repo/hydra/w3",
    ]);
    expect(ordered).toHaveLength(WORKTREE_COUNT);
  });

  it("drops onto a row that is painted past the visible edge of the viewport", async () => {
    const { rows, onReorderWorktreesInGroup } = await renderList();
    const [dragged] = rows;
    const target = rows.at(-1)!;

    // The overscan paints rows below the fold; nothing on screen can place them.
    expect(target.slotTop).toBeGreaterThan(VIEWPORT_HEIGHT);

    pressRow(dragged!);
    await settle();
    movePointerTo(target);
    await settle();
    releasePointer(target);

    expect(onReorderWorktreesInGroup).toHaveBeenCalledTimes(1);
    const [ordered] = onReorderWorktreesInGroup.mock.calls[0] as [GitWorktreeInfo[], string];
    // The dragged card lands where the target row was, so every row in between (including the
    // ones the user never scrolled to) moved up by one.
    expect(ordered.findIndex((entry) => entry.path === dragged!.path)).toBe(target.groupIndex);
    expect(ordered[target.groupIndex - 1]?.path).toBe(target.path);
  });
});
