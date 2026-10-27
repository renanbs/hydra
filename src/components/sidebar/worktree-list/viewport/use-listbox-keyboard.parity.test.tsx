// Listbox semantics and keyboard navigation of the virtualized list (D03a-089): the scroll
// container is the listbox, every focusable row is an option, `aria-activedescendant` names
// the mounted active row, arrows cycle the painted rows, and the native scroll keys stay the
// browser's own — exactly Orca's contract.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import React from "react";
import { cleanup, fireEvent, render } from "@testing-library/react";
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
];

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
    keybindings: {},
  });
}

function renderList(
  props: {
    initialActiveWorktreePath?: string | null;
    displayOptions?: WorkspaceDisplayOptions;
  } = {}
) {
  const onSelectGitWorktree = vi.fn();
  const onToggleGroupCollapse = vi.fn();

  // Why stateful: the panel owns the active workspace, so navigation only becomes visible once
  // the selection it publishes comes back as the active path — exactly the roving loop.
  function Harness(): React.JSX.Element {
    const [activeWorktreePath, setActiveWorktreePath] = React.useState<string | null>(
      props.initialActiveWorktreePath ?? null
    );
    const handleSelect = (worktree: GitWorktreeInfo): void => {
      onSelectGitWorktree(worktree);
      setActiveWorktreePath(worktree.path);
    };
    return (
      <WorktreeList
        projects={[PROJECT]}
        displayProjects={[PROJECT]}
        activeProject={PROJECT}
        activeWorktreePath={activeWorktreePath}
        sessions={[]}
        collapsedProjects={new Set()}
        collapsedGroups={new Set()}
        displayOptions={props.displayOptions ?? DISPLAY_OPTIONS}
        getFilteredAndSortedWorktrees={() => WORKTREES}
        onSelectProject={vi.fn()}
        onSelectGitWorktree={handleSelect}
        onDeleteGitWorktree={vi.fn()}
        onSelectSession={vi.fn()}
        onOpenNewWorkspaceModal={vi.fn()}
        onOpenAddRepoDialog={vi.fn()}
        onToggleProjectCollapse={vi.fn()}
        onToggleGroupCollapse={onToggleGroupCollapse}
      />
    );
  }

  const view = render(<Harness />);
  const listbox = view.container.querySelector<HTMLElement>('[role="listbox"]')!;
  const optionIdFor = (path: string): string | null =>
    view.container
      .querySelector<HTMLElement>(`[role="option"][data-worktree-path="${path}"]`)
      ?.getAttribute("id") ?? null;
  return { ...view, listbox, onSelectGitWorktree, onToggleGroupCollapse, optionIdFor };
}

describe("workspaces listbox semantics", () => {
  beforeEach(() => resetStore());
  afterEach(() => {
    cleanup();
    resetStore();
  });

  it("exposes the scroll container as a focused vertical listbox", () => {
    const { listbox } = renderList();

    expect(listbox).toHaveAttribute("data-worktree-sidebar");
    expect(listbox).toHaveAttribute("tabindex", "0");
    expect(listbox).toHaveAttribute("aria-label", "Worktrees");
    expect(listbox).toHaveAttribute("aria-orientation", "vertical");
  });

  it("publishes one option per painted workspace", () => {
    const { container } = renderList();

    const options = Array.from(container.querySelectorAll<HTMLElement>('[role="option"]'));
    expect(options).toHaveLength(WORKTREES.length);
    const ids = options.map((option) => option.getAttribute("id") ?? "");
    expect(ids.every((id) => id.startsWith("worktree-list-option-"))).toBe(true);
    expect(new Set(ids).size).toBe(WORKTREES.length);
    expect(options.every((option) => option.getAttribute("aria-selected") === "false")).toBe(true);
  });

  it("points aria-activedescendant at the active row's option", () => {
    const { listbox, optionIdFor, container } = renderList({
      initialActiveWorktreePath: WORKTREES[1]!.path,
    });

    const activeOptionId = optionIdFor(WORKTREES[1]!.path);
    expect(activeOptionId).not.toBeNull();
    expect(listbox).toHaveAttribute("aria-activedescendant", activeOptionId!);
    expect(
      container.querySelector<HTMLElement>(`#${CSS.escape(activeOptionId!)}`)
    ).toHaveAttribute("aria-selected", "true");
    expect(
      container.querySelector<HTMLElement>(`#${CSS.escape(activeOptionId!)}`)
    ).toHaveAttribute("aria-current", "page");
  });

  it("leaves aria-activedescendant unset while no workspace is active", () => {
    const { listbox } = renderList();
    expect(listbox).not.toHaveAttribute("aria-activedescendant");
  });
});

describe("workspaces listbox keyboard", () => {
  beforeEach(() => resetStore());
  afterEach(() => {
    cleanup();
    resetStore();
  });

  it("enters the cycle from the first row on ArrowDown", () => {
    const { listbox, onSelectGitWorktree, optionIdFor } = renderList();

    fireEvent.keyDown(listbox, { key: "ArrowDown" });

    expect(onSelectGitWorktree).toHaveBeenCalledTimes(1);
    expect(onSelectGitWorktree.mock.calls[0]?.[0]).toMatchObject({ path: WORKTREES[0]!.path });
    // The panel handed the activated workspace back as the active one, so the listbox points at it.
    expect(listbox).toHaveAttribute("aria-activedescendant", optionIdFor(WORKTREES[0]!.path)!);
  });

  it("moves to the next and previous row as the active workspace changes", () => {
    const { listbox, onSelectGitWorktree, optionIdFor } = renderList({
      initialActiveWorktreePath: WORKTREES[0]!.path,
    });

    fireEvent.keyDown(listbox, { key: "ArrowDown" });
    expect(onSelectGitWorktree).toHaveBeenLastCalledWith(
      expect.objectContaining({ path: WORKTREES[1]!.path })
    );
    expect(listbox).toHaveAttribute("aria-activedescendant", optionIdFor(WORKTREES[1]!.path)!);

    fireEvent.keyDown(listbox, { key: "ArrowUp" });
    expect(onSelectGitWorktree).toHaveBeenLastCalledWith(
      expect.objectContaining({ path: WORKTREES[0]!.path })
    );
    expect(listbox).toHaveAttribute("aria-activedescendant", optionIdFor(WORKTREES[0]!.path)!);
  });

  it("wraps around the ends of the painted list", () => {
    const { listbox, onSelectGitWorktree, optionIdFor } = renderList({
      initialActiveWorktreePath: WORKTREES[WORKTREES.length - 1]!.path,
    });

    fireEvent.keyDown(listbox, { key: "ArrowDown" });

    expect(onSelectGitWorktree).toHaveBeenLastCalledWith(
      expect.objectContaining({ path: WORKTREES[0]!.path })
    );
    expect(listbox).toHaveAttribute("aria-activedescendant", optionIdFor(WORKTREES[0]!.path)!);
  });

  it("leaves Home and End to the native scroll, as Orca does", () => {
    const { listbox } = renderList({ initialActiveWorktreePath: WORKTREES[1]!.path });
    const before = listbox.getAttribute("aria-activedescendant");

    // Not prevented: the focused listbox scrolls itself, and only the virtualizer's scroll
    // guards are told the movement was intentional.
    expect(fireEvent.keyDown(listbox, { key: "Home" })).toBe(true);
    expect(fireEvent.keyDown(listbox, { key: "End" })).toBe(true);
    expect(fireEvent.keyDown(listbox, { key: "PageDown" })).toBe(true);

    expect(listbox.getAttribute("aria-activedescendant")).toBe(before);
  });

  it("toggles a section from the keyboard on the header button", () => {
    const { container, onToggleGroupCollapse } = renderList({
      displayOptions: { ...DISPLAY_OPTIONS, groupBy: "none" },
    });
    const header = container.querySelector<HTMLElement>('[role="button"][data-section-header-id]')!;

    fireEvent.keyDown(header, { key: "Enter" });
    expect(onToggleGroupCollapse).toHaveBeenLastCalledWith("all");

    fireEvent.keyDown(header, { key: " " });
    expect(onToggleGroupCollapse).toHaveBeenCalledTimes(2);
  });

  it("focuses the list from the focus-list shortcut", () => {
    const { listbox } = renderList();

    fireEvent.keyDown(window, { key: "0", code: "Digit0", ctrlKey: true, shiftKey: true });

    expect(document.activeElement).toBe(listbox);
  });
});
