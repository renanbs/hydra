// Pointer drag on the painted list: one gesture must go from a press, through a
// qualified threshold, to exactly one order commit — with Escape/pointercancel and an
// outside release leaving the order alone, and the click that follows a drop dead.
//
// jsdom has no layout, so every rect is synthetic. The geometry under test is the
// real one; only the order transport is a spy.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { useAppStore } from "@/store";
import { WorktreeList } from "../../WorktreeList";
import {
  hasWorkspaceDragData,
  readWorkspaceDragDataIds,
} from "../../workspace-status-drag-data";
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
const ROW_PITCH = 44;
const CONTAINER_HEIGHT = 400;
const CONTAINER_WIDTH = 300;

function worktree(path: string): GitWorktreeInfo {
  return {
    path,
    head_commit: "abc1234",
    branch: path.split("/").pop() as string,
    is_bare: false,
    is_locked: false,
  };
}

const WORKTREES: GitWorktreeInfo[] = [
  worktree("/repo/hydra/w0"),
  worktree("/repo/hydra/w1"),
  worktree("/repo/hydra/w2"),
  worktree("/repo/hydra/w3"),
];

const WORKTREES_BY_PROJECT: Record<string, GitWorktreeInfo[]> = { [PROJECT.path]: WORKTREES };

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
    right: CONTAINER_WIDTH,
    width: CONTAINER_WIDTH,
    height: bottom - top,
    x: 0,
    y: top,
    toJSON: () => ({}),
  } as DOMRect;
}

function renderList() {
  const onSelectGitWorktree = vi.fn();
  const onReorderWorktreesInGroup = vi.fn();

  function Harness(): React.JSX.Element {
    const scrollRef = useRef<HTMLDivElement | null>(null);
    return (
      <div ref={scrollRef} data-testid="sidebar-scroll">
        <WorktreeList
          projects={[PROJECT]}
          displayProjects={[PROJECT]}
          activeProject={PROJECT}
          sessions={[]}
          collapsedProjects={new Set()}
          collapsedGroups={new Set()}
          displayOptions={DISPLAY_OPTIONS}
          getFilteredAndSortedWorktrees={(proj) => WORKTREES_BY_PROJECT[proj.path] ?? []}
          onSelectProject={vi.fn()}
          onSelectGitWorktree={onSelectGitWorktree}
          onDeleteGitWorktree={vi.fn()}
          onSelectSession={vi.fn()}
          onOpenNewWorkspaceModal={vi.fn()}
          onOpenAddRepoDialog={vi.fn()}
          onToggleProjectCollapse={vi.fn()}
          onToggleGroupCollapse={vi.fn()}
          scrollRef={scrollRef}
          onReorderWorktreesInGroup={onReorderWorktreesInGroup}
          onAssignWorktreeStatus={vi.fn()}
        />
      </div>
    );
  }

  render(<Harness />);

  const container = screen.getByTestId("sidebar-scroll");
  Object.defineProperty(container, "getBoundingClientRect", {
    configurable: true,
    value: () => fakeRect(0, CONTAINER_HEIGHT),
  });

  const rows = Array.from(
    container.querySelectorAll<HTMLElement>("[data-worktree-drag-id]")
  );
  // The painted rows are virtual slots now: the drag geometry reads the slot's own start plus
  // the row's offset inside it. Mock both, so the synthetic geometry lands in the same
  // coordinate space these tests have always asserted (first card at 0, ROW_PITCH apart).
  Array.from(container.querySelectorAll<HTMLElement>("[data-worktree-virtual-row]")).forEach(
    (virtualRow, index) => {
      Object.defineProperty(virtualRow, "getBoundingClientRect", {
        configurable: true,
        value: () => fakeRect(index * ROW_PITCH, index * ROW_PITCH + ROW_HEIGHT),
      });
    }
  );
  rows.forEach((row, index) => {
    Object.defineProperty(row, "getBoundingClientRect", {
      configurable: true,
      value: () => fakeRect(index * ROW_PITCH, index * ROW_PITCH + ROW_HEIGHT),
    });
  });

  return { container, rows, onSelectGitWorktree, onReorderWorktreesInGroup };
}

/** Drains the RAF the drag scheduled, so preview/line updates land inside `act`. */
async function settleDragFrame(): Promise<void> {
  await act(async () => {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
  });
}

function pressRow(row: HTMLElement, clientY: number): void {
  fireEvent.pointerDown(row, {
    button: 0,
    pointerId: 1,
    pointerType: "mouse",
    clientX: 40,
    clientY,
  });
}

function movePointer(clientY: number): void {
  fireEvent.pointerMove(document, { pointerId: 1, pointerType: "mouse", clientX: 40, clientY });
}

function releasePointer(clientY: number, clientX = 40): void {
  fireEvent.pointerUp(document, { pointerId: 1, pointerType: "mouse", clientX, clientY });
}

function dragPreview(): HTMLElement | null {
  return document.querySelector<HTMLElement>("[data-worktree-sidebar-drag-preview]");
}

/** jsdom has no DataTransfer; the row's payload write only needs the members it reads. */
class FakeDataTransfer {
  effectAllowed = "none";
  private readonly data = new Map<string, string>();

  get types(): string[] {
    return [...this.data.keys()];
  }

  getData(type: string): string {
    return this.data.get(type) ?? "";
  }

  setData(type: string, value: string): void {
    this.data.set(type, value);
  }
}

/** jsdom has no DragEvent; React reads `dataTransfer` off the event the browser would fire. */
function dragStartEvent(dataTransfer: DataTransfer): Event {
  const event = new Event("dragstart", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "dataTransfer", { value: dataTransfer });
  return event;
}

function dropIndicator(): HTMLElement | null {
  return document.querySelector<HTMLElement>("[data-worktree-sidebar-drop-indicator]");
}

/** Press the first row, cross the threshold, and settle: a live drag session. */
async function startDragOnFirstRow(row: HTMLElement): Promise<void> {
  // The virtualizer measures the freshly mounted rows a frame after the commit; drain it so the
  // drag geometry is the same one the user would get.
  await settleDragFrame();
  pressRow(row, ROW_HEIGHT / 2);
  movePointer(ROW_HEIGHT / 2 + 10);
  await settleDragFrame();
}

describe("worktree list pointer drag", () => {
  beforeEach(() => resetStore());
  afterEach(() => resetStore());

  it("exposes a drag slot per row and keeps the native drag path wired", () => {
    const { rows } = renderList();

    expect(rows).toHaveLength(4);
    expect(rows[0]?.getAttribute("data-worktree-drag-group-key")).toContain("repo_a");
    expect(rows.map((row) => row.getAttribute("data-worktree-drag-group-index"))).toEqual([
      "0",
      "1",
      "2",
      "3",
    ]);
    expect(rows[0]?.querySelector("[data-worktree-card-surface]")?.getAttribute("draggable")).toBe(
      "true"
    );
  });

  it("starts nothing below the movement threshold and a floating preview above it", async () => {
    const { rows } = renderList();

    pressRow(rows[0]!, ROW_HEIGHT / 2);
    movePointer(ROW_HEIGHT / 2 + 2);
    await settleDragFrame();
    expect(dragPreview()).toBeNull();

    movePointer(ROW_HEIGHT / 2 + 10);
    await settleDragFrame();

    expect(dragPreview()).not.toBeNull();
    expect(document.documentElement).toHaveAttribute("data-worktree-sidebar-pointer-dragging");
    expect(document.body.style.userSelect).toBe("none");
  });

  it("paints the insertion line and opens the gap while the pointer is over another row", async () => {
    const { rows } = renderList();

    await startDragOnFirstRow(rows[0]!);
    movePointer(ROW_PITCH + ROW_HEIGHT / 2);
    await settleDragFrame();

    expect(dropIndicator()).toHaveAttribute("style", "top: 41px;");
    expect(rows[0]).toHaveClass("opacity-0");
    expect((rows[1]?.firstElementChild as HTMLElement).style.transform).toBe("translateY(-44px)");
  });

  it("refuses to start from an interactive control inside the row", async () => {
    const { rows } = renderList();
    const control = document.createElement("button");
    rows[0]!.appendChild(control);

    pressRow(control, ROW_HEIGHT / 2);
    movePointer(ROW_HEIGHT / 2 + 10);
    await settleDragFrame();

    expect(dragPreview()).toBeNull();
    expect(document.documentElement).not.toHaveAttribute("data-worktree-sidebar-pointer-dragging");
  });

  it("aborts on Escape without committing, and the release after it is inert", async () => {
    const { rows, onReorderWorktreesInGroup } = renderList();

    await startDragOnFirstRow(rows[0]!);
    expect(dragPreview()).not.toBeNull();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(dragPreview()).toBeNull();
    expect(dropIndicator()).toBeNull();
    expect(document.documentElement).not.toHaveAttribute("data-worktree-sidebar-pointer-dragging");
    expect(document.body.style.userSelect).toBe("");

    releasePointer(ROW_PITCH + ROW_HEIGHT / 2);
    expect(onReorderWorktreesInGroup).not.toHaveBeenCalled();
  });

  it("aborts on pointercancel without committing", async () => {
    const { rows, onReorderWorktreesInGroup } = renderList();

    await startDragOnFirstRow(rows[0]!);
    expect(dragPreview()).not.toBeNull();

    fireEvent.pointerCancel(document, { pointerId: 1, pointerType: "mouse" });

    expect(dragPreview()).toBeNull();
    expect(onReorderWorktreesInGroup).not.toHaveBeenCalled();
  });

  it("reorders the group once, through the panel's order writer", async () => {
    const { rows, onReorderWorktreesInGroup } = renderList();

    await startDragOnFirstRow(rows[0]!);
    movePointer(ROW_PITCH + ROW_HEIGHT / 2);
    await settleDragFrame();

    releasePointer(ROW_PITCH + ROW_HEIGHT / 2);

    expect(onReorderWorktreesInGroup).toHaveBeenCalledTimes(1);
    const [ordered, projectPath] = onReorderWorktreesInGroup.mock.calls[0] as [
      GitWorktreeInfo[],
      string,
    ];
    expect(projectPath).toBe(PROJECT.path);
    expect(ordered.map((entry) => entry.path)).toEqual([
      "/repo/hydra/w1",
      "/repo/hydra/w0",
      "/repo/hydra/w2",
      "/repo/hydra/w3",
    ]);
    expect(dragPreview()).toBeNull();
  });

  it("treats a release outside the sidebar as a throw-away, not a reorder", async () => {
    const { rows, onReorderWorktreesInGroup } = renderList();

    await startDragOnFirstRow(rows[0]!);
    movePointer(ROW_PITCH + ROW_HEIGHT / 2);
    await settleDragFrame();
    releasePointer(ROW_PITCH + ROW_HEIGHT / 2, CONTAINER_WIDTH + 200);

    expect(onReorderWorktreesInGroup).not.toHaveBeenCalled();
    expect(dragPreview()).toBeNull();

    await startDragOnFirstRow(rows[0]!);
    movePointer(ROW_PITCH + ROW_HEIGHT / 2);
    await settleDragFrame();
    releasePointer(CONTAINER_HEIGHT + 120);

    expect(onReorderWorktreesInGroup).not.toHaveBeenCalled();
  });

  it("cancels the card's native drag while a row press owns the gesture", () => {
    const { rows } = renderList();
    const surface = rows[0]!.querySelector<HTMLElement>("[data-worktree-card-surface]")!;

    pressRow(rows[0]!, ROW_HEIGHT / 2);

    expect(fireEvent(surface, dragStartEvent(new FakeDataTransfer()))).toBe(false);
  });

  it("keeps the native drag available when no pointer press owns the row", () => {
    const { rows } = renderList();
    const surface = rows[0]!.querySelector<HTMLElement>("[data-worktree-card-surface]")!;

    const dataTransfer = new FakeDataTransfer();
    expect(fireEvent(surface, dragStartEvent(dataTransfer))).toBe(true);
    // The row published the shared workspace payload the board's drop targets read
    // (`hasWorkspaceDragData`), keyed on the row's workspace id — not its path.
    expect(hasWorkspaceDragData(dataTransfer)).toBe(true);
    expect(readWorkspaceDragDataIds(dataTransfer)).toEqual(["repo_a::/repo/hydra/w0"]);

    // A press that never crossed the threshold hands the row back to the native path.
    pressRow(rows[0]!, ROW_HEIGHT / 2);
    releasePointer(ROW_HEIGHT / 2);

    expect(fireEvent(surface, dragStartEvent(new FakeDataTransfer()))).toBe(true);
  });

  it("swallows the click that follows a drop", async () => {
    const { rows, onSelectGitWorktree, onReorderWorktreesInGroup } = renderList();
    const surface = rows[0]!.querySelector<HTMLElement>("[data-worktree-card-surface]")!;

    // Baseline: outside a drag, that same click selects the card.
    expect(fireEvent.click(surface)).toBe(true);
    expect(onSelectGitWorktree).toHaveBeenCalledTimes(1);
    onSelectGitWorktree.mockClear();

    await startDragOnFirstRow(rows[0]!);
    movePointer(ROW_PITCH + ROW_HEIGHT / 2);
    await settleDragFrame();
    releasePointer(ROW_PITCH + ROW_HEIGHT / 2);
    expect(onReorderWorktreesInGroup).toHaveBeenCalledTimes(1);

    expect(fireEvent.click(surface)).toBe(false);
    expect(onSelectGitWorktree).not.toHaveBeenCalled();
  });
});
