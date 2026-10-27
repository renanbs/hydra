// D04a G5/G9 + D04b-010/012/022 — the card's delete overlay and its rename path.
// These lock the three regressions the audit found:
//   1. `isDeleting` was a local flag latched when the confirmation dialog opened
//      and never reset, so cancelling or failing left the card inert forever.
//      The overlay now derives from the row's published delete state.
//   2. The inline rename commit had no handler on the mount (`App` never passed
//      `onRenameWorktreeTitle`), so renaming from the card was a no-op.
//   3. `workspace.rename` / `workspace.delete` had no call-site outside the
//      keybinding module — labels with no keyboard path.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react";
import { useAppStore } from "@/store";

const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke: invokeMock }));

import { WorktreeList, type WorktreeListProps } from "./WorktreeList";
import type { WorkspaceDisplayOptions } from "./WorkspaceOptionsMenu";
import type { HydraProject, GitWorktreeInfo } from "./types";

const PROJECT: HydraProject = {
  id: "repo_a",
  name: "hydra",
  path: "/repo/hydra",
  is_git: true,
  current_branch: "main",
};

const ACTIVE_PATH = "/repo/hydra-active";
const OTHER_PATH = "/repo/hydra-other";

// Two repos on different execution hosts. Their workspaces carry the SAME id
// (`repoId::path` has no host component), which is the STA-4343 collision.
const PROJECT_LOCAL: HydraProject = {
  id: "repo_local",
  name: "hydra-local",
  path: "/repo/local",
  is_git: true,
  current_branch: "main",
};

const PROJECT_SSH: HydraProject = {
  id: "repo_ssh",
  name: "hydra-ssh",
  path: "/repo/ssh",
  is_git: true,
  current_branch: "main",
};

function worktree(path: string, branch: string): GitWorktreeInfo {
  return {
    id: path,
    path,
    head_commit: "abc1234",
    branch,
    is_bare: false,
    is_locked: false,
  };
}

const WORKTREES_BY_PROJECT: Record<string, GitWorktreeInfo[]> = {
  [PROJECT.path]: [worktree(ACTIVE_PATH, "feat/active"), worktree(OTHER_PATH, "feat/other")],
};

const BASE_DISPLAY_OPTIONS: WorkspaceDisplayOptions = {
  groupBy: "repo",
  sortBy: "name",
  hideSleeping: false,
  hideDefaultBranch: false,
  hideAutomationCreated: false,
  hideCliCreated: false,
  hideDetachedHead: false,
};

const BASE_STORE_STATE = {
  repos: [],
  sshTargetLabels: new Map(),
  sshConnectionStates: new Map(),
  runtimeEnvironments: [],
  runtimeStatusByEnvironmentId: {},
  settings: null,
  visibleWorkspaceHostIds: [],
  workspaceHostScope: null,
  worktreeLineageById: {},
  keybindings: {},
};

function resetStore(overrides: Record<string, unknown> = {}) {
  useAppStore.setState({ ...BASE_STORE_STATE, ...overrides });
}

function listProps(overrides: Partial<WorktreeListProps> = {}): WorktreeListProps {
  return {
    projects: [PROJECT],
    displayProjects: [PROJECT],
    activeProject: PROJECT,
    activeWorktreePath: ACTIVE_PATH,
    sessions: [],
    worktreesByProject: WORKTREES_BY_PROJECT,
    collapsedProjects: new Set(),
    collapsedGroups: new Set(),
    displayOptions: BASE_DISPLAY_OPTIONS,
    getFilteredAndSortedWorktrees: (proj) => WORKTREES_BY_PROJECT[proj.path] ?? [],
    onSelectProject: vi.fn(),
    onSelectGitWorktree: vi.fn(),
    onDeleteGitWorktree: vi.fn(),
    onSelectSession: vi.fn(),
    onOpenNewWorkspaceModal: vi.fn(),
    onOpenAddRepoDialog: vi.fn(),
    onToggleProjectCollapse: vi.fn(),
    onToggleGroupCollapse: vi.fn(),
    ...overrides,
  };
}

// The store has no host catalog in these tests, so the row resolves to the
// unqualified identity — the bare worktree id (STA-4343 fallback).
function deleteState(key: string, state: Record<string, unknown>) {
  return { deleteStateByWorktreeId: { [key]: state } };
}

function cardFor(container: HTMLElement, path: string): HTMLElement {
  const surface = container.querySelector<HTMLElement>(
    `[data-worktree-path="${path}"] [data-worktree-card-surface]`
  );
  if (!surface) throw new Error(`no card surface for ${path}`);
  return surface;
}

function titleFor(container: HTMLElement, path: string, branch: string): HTMLElement {
  // The status lane also paints a titled span; the card title carries the branch.
  const title = cardFor(container, path).querySelector<HTMLElement>(`span[title="${branch}"]`);
  if (!title) throw new Error(`no title for ${path}`);
  return title;
}

describe("WorktreeList card delete overlay (D04a G5)", () => {
  beforeEach(() => resetStore());
  afterEach(() => {
    cleanup();
    resetStore();
  });

  it("derives the in-place overlay from the published delete state", () => {
    const { container } = render(
      <WorktreeList
        {...listProps(
          deleteState(ACTIVE_PATH, {
            isDeleting: true,
            error: null,
            canForceDelete: false,
            forceDeleteReason: null,
          })
        )}
      />
    );

    const surface = cardFor(container, ACTIVE_PATH);
    expect(surface).toHaveAttribute("aria-busy", "true");
    expect(within(surface).getByText("Deleting workspace...")).toBeInTheDocument();
    expect(surface).toHaveAttribute("draggable", "false");
    // The sibling row is untouched: the state is per row, not global.
    expect(cardFor(container, OTHER_PATH)).toHaveAttribute("aria-busy", "false");
  });

  it("labels a queued removal instead of spinning", () => {
    const { container } = render(
      <WorktreeList
        {...listProps(
          deleteState(ACTIVE_PATH, {
            isDeleting: true,
            phase: "queued",
            error: null,
            canForceDelete: false,
            forceDeleteReason: null,
          })
        )}
      />
    );

    expect(within(cardFor(container, ACTIVE_PATH)).getByText("Queued for deletion")).toBeInTheDocument();
  });

  it("releases the card once a cancelled or failed removal clears the state", () => {
    const onSelectGitWorktree = vi.fn();
    const { container, rerender } = render(
      <WorktreeList
        {...listProps({
          onSelectGitWorktree,
          ...deleteState(ACTIVE_PATH, {
            isDeleting: true,
            error: null,
            canForceDelete: false,
            forceDeleteReason: null,
          }),
        })}
      />
    );

    expect(cardFor(container, ACTIVE_PATH)).toHaveAttribute("aria-busy", "true");

    // Cancel / failure / dialog dismissal clears the published state.
    rerender(<WorktreeList {...listProps({ onSelectGitWorktree })} />);

    const surface = cardFor(container, ACTIVE_PATH);
    expect(surface).toHaveAttribute("aria-busy", "false");
    expect(within(surface).queryByText("Deleting workspace...")).toBeNull();
    expect(surface).toHaveAttribute("draggable", "true");

    // The card answers clicks again — this is the regression the audit found.
    fireEvent.click(surface);
    expect(onSelectGitWorktree).toHaveBeenCalledWith(expect.objectContaining({ path: ACTIVE_PATH }));
  });

  it("does not latch a delete state when the confirmation dialog opens", () => {
    const onDeleteGitWorktree = vi.fn();
    const { container } = render(
      <WorktreeList {...listProps({ onDeleteGitWorktree })} />
    );

    const surface = cardFor(container, ACTIVE_PATH);
    fireEvent.contextMenu(surface);
    // Opening the flow must not paint the overlay by itself.
    expect(surface).toHaveAttribute("aria-busy", "false");
  });

  it("refuses click and drag while the removal is published", () => {
    const onSelectGitWorktree = vi.fn();
    const onWorktreeDragStart = vi.fn();
    const { container } = render(
      <WorktreeList
        {...listProps({
          onSelectGitWorktree,
          onWorktreeDragStart,
          ...deleteState(ACTIVE_PATH, {
            isDeleting: true,
            error: null,
            canForceDelete: false,
            forceDeleteReason: null,
          }),
        })}
      />
    );

    const surface = cardFor(container, ACTIVE_PATH);
    expect(surface).toHaveAttribute("aria-busy", "true");
    expect(surface).toHaveAttribute("draggable", "false");

    fireEvent.click(surface);
    fireEvent.dragStart(surface);

    expect(onSelectGitWorktree).not.toHaveBeenCalled();
    expect(onWorktreeDragStart).not.toHaveBeenCalled();
  });

  it("keeps a host-qualified entry off the sibling host that shares the workspace id", () => {
    // STA-4343: a repo registered on two hosts publishes the SAME workspace id
    // twice. The published entry names its host, so only that host's card may
    // paint the overlay — the sibling at the same path stays interactive.
    const shared = "/repo/shared";
    resetStore({
      repos: [
        { id: PROJECT_LOCAL.id, path: PROJECT_LOCAL.path, executionHostId: "local" },
        { id: PROJECT_SSH.id, path: PROJECT_SSH.path, executionHostId: "ssh:build-box" },
      ],
    });
    const publishedForLocal = deleteState(`local|${shared}`, {
      isDeleting: true,
      error: null,
      canForceDelete: false,
      forceDeleteReason: null,
    });
    const localProps = listProps({
      projects: [PROJECT_LOCAL],
      displayProjects: [PROJECT_LOCAL],
      activeProject: PROJECT_LOCAL,
      worktreesByProject: { [PROJECT_LOCAL.path]: [worktree(shared, "feat/shared")] },
      getFilteredAndSortedWorktrees: () => [worktree(shared, "feat/shared")],
      ...publishedForLocal,
    });
    const sshProps = listProps({
      projects: [PROJECT_SSH],
      displayProjects: [PROJECT_SSH],
      activeProject: PROJECT_SSH,
      worktreesByProject: { [PROJECT_SSH.path]: [worktree(shared, "feat/shared")] },
      getFilteredAndSortedWorktrees: () => [worktree(shared, "feat/shared")],
      ...publishedForLocal,
    });

    const { container, unmount } = render(<WorktreeList {...localProps} />);
    expect(cardFor(container, shared)).toHaveAttribute("aria-busy", "true");
    unmount();

    const { container: sshContainer } = render(<WorktreeList {...sshProps} />);
    expect(cardFor(sshContainer, shared)).toHaveAttribute("aria-busy", "false");
  });
});

describe("WorktreeList card rename (D04b-010/022)", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    invokeMock.mockResolvedValue(undefined);
    resetStore({ keybindings: {} });
  });
  afterEach(() => {
    cleanup();
    resetStore({ keybindings: {} });
  });

  it("commits a double-click rename through set_worktree_display_name", async () => {
    const { container } = render(<WorktreeList {...listProps()} />);

    fireEvent.doubleClick(titleFor(container, ACTIVE_PATH, "feat/active"));
    const input = cardFor(container, ACTIVE_PATH).querySelector<HTMLInputElement>('input[type="text"]');
    expect(input).not.toBeNull();

    fireEvent.change(input!, { target: { value: "  Novo Nome  " } });
    fireEvent.keyDown(input!, { key: "Enter" });

    await waitFor(() =>
      expect(invokeMock).toHaveBeenCalledWith("set_worktree_display_name", {
        worktreePath: ACTIVE_PATH,
        displayName: "Novo Nome",
      })
    );
  });

  it("prefers the host-provided rename handler over the persistence fallback", async () => {
    const onRenameWorktreeTitle = vi.fn().mockResolvedValue(undefined);
    const { container } = render(<WorktreeList {...listProps({ onRenameWorktreeTitle })} />);

    fireEvent.doubleClick(titleFor(container, OTHER_PATH, "feat/other"));
    const input = cardFor(container, OTHER_PATH).querySelector<HTMLInputElement>('input[type="text"]')!;
    fireEvent.change(input, { target: { value: "Renomeado" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() =>
      expect(onRenameWorktreeTitle).toHaveBeenCalledWith(OTHER_PATH, "Renomeado")
    );
    expect(invokeMock).not.toHaveBeenCalled();
  });

  // `workspace.rename` ships no Linux/Windows default (Ctrl+R and Ctrl+Shift+R
  // are taken) and — like Orca — does not opt into bare keybindings, so a bare
  // `F2` is not bindable for it; the path is exercised with a bound chord.
  const RENAME_BINDING = { "workspace.rename": ["Mod+Alt+R"] };

  it("opens the inline editor on the active row from the workspace.rename shortcut", () => {
    resetStore({ keybindings: RENAME_BINDING });
    const { container } = render(<WorktreeList {...listProps()} />);

    fireEvent.keyDown(window, { key: "r", code: "KeyR", ctrlKey: true, altKey: true });

    expect(
      cardFor(container, ACTIVE_PATH).querySelector('input[type="text"]')
    ).not.toBeNull();
    expect(
      cardFor(container, OTHER_PATH).querySelector('input[type="text"]')
    ).toBeNull();
  });

  it("ignores the shortcut while an editable field has focus", () => {
    resetStore({ keybindings: RENAME_BINDING });
    const { container } = render(<WorktreeList {...listProps()} />);

    const field = document.createElement("input");
    document.body.append(field);
    fireEvent.keyDown(field, { key: "r", code: "KeyR", ctrlKey: true, altKey: true });
    field.remove();

    expect(container.querySelector('input[type="text"]')).toBeNull();
  });
});

describe("WorktreeList workspace.delete shortcut (D04a G9)", () => {
  beforeEach(() => resetStore({ keybindings: {} }));
  afterEach(() => {
    cleanup();
    resetStore({ keybindings: {} });
  });

  it("funnels the default binding into the delete confirmation flow", () => {
    const onDeleteGitWorktree = vi.fn();
    render(<WorktreeList {...listProps({ onDeleteGitWorktree })} />);

    // `workspace.delete` ships `Mod+Shift+Backspace` on every platform.
    fireEvent.keyDown(window, { key: "Backspace", code: "Backspace", ctrlKey: true, shiftKey: true });

    expect(onDeleteGitWorktree).toHaveBeenCalledTimes(1);
    expect(onDeleteGitWorktree).toHaveBeenCalledWith(
      expect.objectContaining({ path: ACTIVE_PATH }),
      PROJECT
    );
  });

  it("does nothing when no workspace is active", () => {
    const onDeleteGitWorktree = vi.fn();
    render(<WorktreeList {...listProps({ activeWorktreePath: null, onDeleteGitWorktree })} />);

    fireEvent.keyDown(window, { key: "Backspace", code: "Backspace", ctrlKey: true, shiftKey: true });

    expect(onDeleteGitWorktree).not.toHaveBeenCalled();
  });
});
