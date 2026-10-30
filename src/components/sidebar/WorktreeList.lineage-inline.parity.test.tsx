// D03a-080: a lineage parent and its visible descendants fold into ONE virtual row, and the
// parent card paints the children inline. This locks the paint contract: collapsed parents
// hide their subtree, keyboard/listbox identity still reaches a child, and reveal highlights
// the child card inside the parent.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import React from "react";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { useAppStore } from "@/store";
import { WorktreeList } from "./WorktreeList";
import type { GitWorktreeInfo, HydraProject } from "./types";
import type { WorkspaceDisplayOptions } from "./WorkspaceOptionsMenu";

const PROJECT: HydraProject = {
  id: "repo_a",
  name: "hydra",
  path: "/repo/hydra",
  is_git: true,
  current_branch: "main",
};

const PARENT = "/repo/hydra/parent";
const CHILD = "/repo/hydra/child";

function worktree(path: string): GitWorktreeInfo {
  return {
    path,
    head_commit: "abc1234",
    branch: path.split("/").pop() as string,
    is_bare: false,
    is_locked: false,
  };
}

const WORKTREES: GitWorktreeInfo[] = [worktree(PARENT), worktree(CHILD)];

const DISPLAY_OPTIONS: WorkspaceDisplayOptions = {
  groupBy: "none",
  sortBy: "name",
  hideSleeping: false,
  hideDefaultBranch: false,
  hideAutomationCreated: false,
  hideCliCreated: false,
  hideDetachedHead: false,
};

/** The collapse key the row pipeline writes for a lineage parent (hostless projection). */
function lineageCollapseKey(path: string): string {
  return `lineage:${PROJECT.id}::${path}`;
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
    keybindings: {},
  });
}

function renderList(
  props: {
    initialActiveWorktreePath?: string | null;
    collapsedGroups?: Set<string>;
    highlightedRevealPath?: string | null;
  } = {}
) {
  const onSelectGitWorktree = vi.fn();
  const onToggleGroupCollapse = vi.fn();

  function Harness(): React.JSX.Element {
    const [activeWorktreePath, setActiveWorktreePath] = React.useState<string | null>(
      props.initialActiveWorktreePath ?? null
    );
    const handleSelect = (selected: GitWorktreeInfo): void => {
      onSelectGitWorktree(selected);
      setActiveWorktreePath(selected.path);
    };
    return (
      <WorktreeList
        projects={[PROJECT]}
        displayProjects={[PROJECT]}
        activeProject={PROJECT}
        activeWorktreePath={activeWorktreePath}
        highlightedRevealPath={props.highlightedRevealPath ?? null}
        sessions={[]}
        collapsedProjects={new Set()}
        collapsedGroups={props.collapsedGroups ?? new Set()}
        displayOptions={DISPLAY_OPTIONS}
        getFilteredAndSortedWorktrees={() => WORKTREES}
        lineageByPath={{ [CHILD]: PARENT }}
        onSelectProject={vi.fn()}
        onSelectGitWorktree={handleSelect}
        onDeleteGitWorktree={vi.fn()}
        onSelectSession={vi.fn()}
        onOpenNewWorkspaceModal={vi.fn()}
        onOpenAddRepoDialog={vi.fn()}
        onToggleProjectCollapse={vi.fn()}
        onToggleGroupCollapse={onToggleGroupCollapse}
        onAssignWorktreeStatus={vi.fn()}
      />
    );
  }

  const view = render(<Harness />);
  const listbox = view.container.querySelector<HTMLElement>('[role="listbox"]')!;
  const optionFor = (path: string): HTMLElement | null =>
    view.container.querySelector<HTMLElement>(`[role="option"][data-worktree-path="${path}"]`);
  const virtualRowKeys = (): string[] =>
    Array.from(view.container.querySelectorAll<HTMLElement>("[data-worktree-virtual-row-key]"))
      .map((element) => element.getAttribute("data-worktree-virtual-row-key") ?? "")
      .filter(Boolean);
  return { ...view, listbox, onSelectGitWorktree, optionFor, virtualRowKeys };
}

describe("inline lineage descendants (D03a-080)", () => {
  beforeEach(() => resetStore());
  afterEach(() => {
    cleanup();
    resetStore();
  });

  it("folds the subtree into one virtual row and paints the child inside the parent card", () => {
    const { container, virtualRowKeys, optionFor } = renderList();

    expect(virtualRowKeys().filter((key) => key.startsWith("lineage-group:"))).toHaveLength(1);
    // The child no longer owns a virtual slot of its own.
    expect(virtualRowKeys().some((key) => key.startsWith("wt:") && key.includes("child"))).toBe(
      false
    );

    const children = container.querySelector<HTMLElement>("[data-worktree-lineage-children]");
    expect(children).not.toBeNull();
    const childOption = optionFor(CHILD);
    expect(childOption).not.toBeNull();
    expect(children!.contains(childOption!)).toBe(true);
    expect(children!.querySelector("[data-worktree-lineage-child]")).toHaveAttribute(
      "data-worktree-lineage-depth",
      "1"
    );
    expect(children!.querySelector("[data-worktree-lineage-child]")).toHaveAttribute(
      "data-worktree-lineage-last-child"
    );
    // Mounting the card through the drag provider keeps the child's drag/group identity.
    expect(childOption).toHaveAttribute("data-worktree-drag-id");
    expect(childOption).toHaveAttribute("data-worktree-drag-group-key", "all");
    expect(childOption).toHaveAttribute("data-worktree-drag-group-index", "1");
  });

  it("hides the subtree when the lineage group is collapsed", () => {
    const { container, virtualRowKeys, optionFor } = renderList({
      collapsedGroups: new Set([lineageCollapseKey(PARENT)]),
    });

    expect(virtualRowKeys().some((key) => key.startsWith("lineage-group:"))).toBe(false);
    expect(virtualRowKeys().some((key) => key.startsWith("wt:") && key.includes("parent"))).toBe(
      true
    );
    expect(container.querySelector("[data-worktree-lineage-children]")).toBeNull();
    expect(optionFor(CHILD)).toBeNull();
    expect(optionFor(PARENT)).not.toBeNull();
  });

  it("keeps arrow-key navigation on the inline child and points aria-activedescendant at it", () => {
    const { listbox, onSelectGitWorktree, optionFor } = renderList();

    fireEvent.keyDown(listbox, { key: "ArrowDown" });
    expect(onSelectGitWorktree).toHaveBeenLastCalledWith(
      expect.objectContaining({ path: PARENT })
    );

    fireEvent.keyDown(listbox, { key: "ArrowDown" });
    expect(onSelectGitWorktree).toHaveBeenLastCalledWith(
      expect.objectContaining({ path: CHILD })
    );

    const childOption = optionFor(CHILD);
    expect(childOption).not.toBeNull();
    expect(listbox).toHaveAttribute("aria-activedescendant", childOption!.id);
    expect(childOption).toHaveAttribute("aria-selected", "true");
    expect(childOption).toHaveAttribute("aria-current", "page");
  });

  it("reveals a folded child by highlighting the card inside the parent", () => {
    const { optionFor } = renderList({
      initialActiveWorktreePath: CHILD,
      highlightedRevealPath: CHILD,
    });

    const childOption = optionFor(CHILD);
    const parentOption = optionFor(PARENT);
    expect(childOption).not.toBeNull();
    expect(parentOption).not.toBeNull();
    expect(childOption).toHaveAttribute("data-scroll-reveal-highlight");
    expect(parentOption).not.toHaveAttribute("data-scroll-reveal-highlight");
    // The parent stays visually active while its subtree owns the active workspace. Its own
    // surface is the first one painted inside the group's option; the child's follows.
    const parentSurface = parentOption!.querySelector("[data-worktree-card-surface]");
    expect(parentSurface).toHaveAttribute("data-worktree-card-active", "primary");
  });
});
