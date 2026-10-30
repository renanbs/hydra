// D03a-040/062/068/070: the sidebar's reveal pipeline. A queued reveal must open the
// collapsed sections that hide its row (repo/project-group/Pinned/lineage), enter the
// inline rename only once the row is mounted, resolve folder rows through the viewport's
// published option id (they carry no card path), and clear itself when the workspace is
// gone instead of staying queued forever.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAppStore } from "@/store";
import { toWorktreeRow } from "../../shared/worktree/worktree-row";
import { cloneDefaultWorkspaceStatuses } from "../../shared/workspace-statuses";
import { WorktreeSidebar } from "./WorktreeSidebar";
import { getWorktreeOptionId } from "./worktree-list/viewport/option-id";
import type { GitWorktreeInfo, HydraProject } from "./types";
import type { WorkspaceDisplayOptions } from "./WorkspaceOptionsMenu";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn().mockResolvedValue(null) }));

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;

const PROJECT: HydraProject = {
  id: "repo_a",
  name: "repo",
  path: "/repo/a",
  is_git: true,
  current_branch: "main",
};

function worktree(path: string): GitWorktreeInfo {
  return {
    id: path,
    path,
    head_commit: "abc1234",
    branch: path.split("/").pop() as string,
    is_bare: false,
    is_locked: false,
  };
}

const WT1 = worktree("/repo/a/wt-1");
const WT2 = worktree("/repo/a/wt-2");

const DISPLAY_OPTIONS: WorkspaceDisplayOptions = {
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
  settings: null,
  visibleWorkspaceHostIds: [] as string[],
  workspaceHostScope: null,
  worktreeLineageById: {},
  workspaceStatuses: cloneDefaultWorkspaceStatuses(),
  worktreesByRepo: {},
  pendingRevealWorktree: null,
  pendingRevealSidebarRow: null,
  keybindings: {},
};

function resetStore(overrides: Record<string, unknown> = {}): void {
  useAppStore.setState({ ...BASE_STORE_STATE, ...overrides });
}

function renderSidebar(
  props: Partial<React.ComponentProps<typeof WorktreeSidebar>> = {}
) {
  return render(
    <TooltipProvider>
      <WorktreeSidebar
        sessions={[]}
        projects={[PROJECT]}
        activeProject={PROJECT}
        activeWorktreePath={null}
        gitStatus={null}
        gitWorktrees={[WT1, WT2]}
        onSelectProject={vi.fn()}
        onRemoveProject={vi.fn()}
        onSelectSession={vi.fn()}
        onSelectGitWorktree={vi.fn()}
        onDeleteGitWorktree={vi.fn()}
        onDeleteSession={vi.fn()}
        onOpenSettings={vi.fn()}
        onOpenAddRepoDialog={vi.fn()}
        onOpenNewWorkspaceModal={vi.fn()}
        onAssignWorktreeStatus={vi.fn()}
        onPinWorktree={vi.fn()}
        onCreateWorktree={vi.fn()}
        initialDisplayOptions={DISPLAY_OPTIONS}
        {...props}
      />
    </TooltipProvider>
  );
}

function offerReveal(worktreeId: string, options: { beginRename?: boolean } = {}): void {
  act(() => {
    useAppStore.getState().revealWorktreeInSidebar(worktreeId, {
      highlight: false,
      ...options,
    });
  });
}

describe("WorktreeSidebar reveal (D03a-040/062/070)", () => {
  beforeEach(() => resetStore());
  afterEach(() => {
    cleanup();
    resetStore();
  });

  it("expands the collapsed group that hides the revealed workspace", async () => {
    // `repo:repo_a` is the natural lane key the row pipeline paints this project under.
    const view = renderSidebar({ initialCollapsedGroups: ["repo:repo_a"] });
    expect(view.container.querySelector(`[data-worktree-path="${WT1.path}"]`)).toBeNull();

    offerReveal(WT1.id!);

    await waitFor(() =>
      expect(view.container.querySelector(`[data-worktree-path="${WT1.path}"]`)).not.toBeNull()
    );
    // The request settles once the mounted row's scroll is issued (or it was already visible).
    expect(useAppStore.getState().pendingRevealWorktree).toBeNull();
  });

  it("starts the inline rename only after the revealed row mounted", async () => {
    const beginRename = vi.fn();
    window.addEventListener("hydra:begin-rename-worktree", beginRename);
    try {
      renderSidebar({ initialCollapsedGroups: ["repo:repo_a"] });

      offerReveal(WT1.id!, { beginRename: true });

      await waitFor(() => expect(beginRename).toHaveBeenCalled());
      expect(
        (beginRename.mock.calls[0]?.[0] as CustomEvent<{ path: string }>).detail.path
      ).toBe(WT1.path);
    } finally {
      window.removeEventListener("hydra:begin-rename-worktree", beginRename);
    }
  });

  it("drops a pending reveal whose workspace vanished from the tree", async () => {
    renderSidebar();

    offerReveal("repo_a::/repo/a/deleted");

    await waitFor(() => expect(useAppStore.getState().pendingRevealWorktree).toBeNull());
  });

  it("reveals a folder row through the viewport's option id", async () => {
    const folderPath = "/repo/a/folder";
    renderSidebar({
      projectGroups: [{ id: "grp-1", name: "Group" }],
      folderWorkspaces: [
        {
          id: "fw-1",
          projectGroupId: "grp-1",
          name: "Folder",
          folderPath,
        },
      ],
    });

    offerReveal("folder:fw-1");

    // The folder row publishes a listbox option id but no card `data-worktree-path`, so the
    // reveal can only settle through the option-id leg.
    await waitFor(() =>
      expect(
        document.getElementById(getWorktreeOptionId("folder-workspace:fw-1"))
      ).not.toBeNull()
    );
    await waitFor(() => expect(useAppStore.getState().pendingRevealWorktree).toBeNull());
  });
});
