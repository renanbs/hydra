// STA-4343: the delete confirmation guards an IDENTITY, not a path. This suite
// proves the three states the sidebar can be in between opening and confirming:
// the confirmed instance was replaced, the confirmation still resolves on the
// right host, and the target vanished entirely.
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { GitWorktreeInfo } from "./sidebar/types";

const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke: invokeMock }));

import {
  DeleteWorktreeDialog,
  type DeleteWorktreeDialogProps,
  type WorktreeDeleteLiveTarget,
} from "./DeleteWorktreeDialog";
import type { WorktreeDeleteIdentity } from "./sidebar/worktree-delete-request";

const PROJECT_PATH = "/work";
const WORKTREE_PATH = "/work/orca";
const SHARED_ID = "repo-1::/work/orca";

function worktree(): GitWorktreeInfo {
  return {
    path: WORKTREE_PATH,
    branch: "feat/orca",
    head_commit: "abc123",
    is_bare: false,
    is_locked: false,
  };
}

function liveRow(
  hostId: WorktreeDeleteLiveTarget["hostId"],
  instanceId: string,
  repoPath: string
): WorktreeDeleteLiveTarget {
  return {
    id: SHARED_ID,
    instanceId,
    ...(hostId ? { hostId } : {}),
    isMainWorktree: false,
    path: WORKTREE_PATH,
    repoPath,
  };
}

const CONFIRMED_SSH: WorktreeDeleteIdentity = {
  id: SHARED_ID,
  instanceId: "instance-ssh",
  hostId: "ssh:build-box",
};

function renderDialog(overrides: Partial<DeleteWorktreeDialogProps> = {}) {
  const props: DeleteWorktreeDialogProps = {
    open: true,
    worktrees: [worktree()],
    isMainWorktree: false,
    deleteStateByWorktreeId: {},
    dirtyChangeCountsByWorktreeId: {},
    onPersistSkipConfirmPreference: vi.fn(),
    onClose: vi.fn(),
    onDeleted: vi.fn(),
    onForceDeleted: vi.fn(),
    repoPath: PROJECT_PATH,
    deleteTargets: [CONFIRMED_SSH],
    ...overrides,
  };
  return render(<DeleteWorktreeDialog {...props} />);
}

function confirmButton(): HTMLElement {
  return screen.getByRole("button", { name: /Delete Workspace/i });
}

beforeEach(() => {
  invokeMock.mockReset();
  invokeMock.mockResolvedValue(undefined);
});

describe("DeleteWorktreeDialog target validation", () => {
  it("aborts without deleting when the confirmed instance was replaced", () => {
    const onStaleTargets = vi.fn();
    const onClose = vi.fn();
    const onDeleted = vi.fn();
    renderDialog({
      liveWorktrees: [
        liveRow("local", "instance-local", PROJECT_PATH),
        liveRow("ssh:build-box", "instance-recreated", "/work-ssh"),
      ],
      onStaleTargets,
      onClose,
      onDeleted,
    });

    fireEvent.click(confirmButton());

    // The row is still THERE on the confirmed host, but it is not the instance the
    // user opened the dialog on — so nothing may be removed.
    expect(invokeMock).not.toHaveBeenCalled();
    expect(onDeleted).not.toHaveBeenCalled();
    expect(onStaleTargets).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("deletes the confirmed host's row when two hosts share one path", async () => {
    const onDeleted = vi.fn();
    renderDialog({
      liveWorktrees: [
        liveRow("local", "instance-local", PROJECT_PATH),
        liveRow("ssh:build-box", "instance-ssh", "/work-ssh"),
      ],
      onDeleted,
    });

    fireEvent.click(confirmButton());

    await waitFor(() => expect(invokeMock).toHaveBeenCalledTimes(1));
    // The local row is listed first; resolving by id alone would have deleted it.
    expect(invokeMock).toHaveBeenCalledWith("delete_worktree", {
      repoPath: "/work-ssh",
      worktreePath: WORKTREE_PATH,
      force: false,
      hostId: "ssh:build-box",
    });
    await waitFor(() => expect(onDeleted).toHaveBeenCalledWith([WORKTREE_PATH]));
  });

  it("disables the destructive button once the target is gone", () => {
    const onStaleTargets = vi.fn();
    renderDialog({
      liveWorktrees: [liveRow("local", "instance-local", PROJECT_PATH)],
      onStaleTargets,
    });

    expect(confirmButton()).toBeDisabled();
    expect(invokeMock).not.toHaveBeenCalled();
    // The dialog also closes itself with the stale-list notice instead of leaving
    // a dead-end confirmation on screen.
    expect(onStaleTargets).toHaveBeenCalled();
  });
});

// Orca `markWorktreesDeleting` / `clearWorktreeDeleteState`: the confirmation is
// the trigger that publishes the sidebar card's overlay, and the settle that
// releases it. A refused removal must release it too, or the card stays inert.
describe("DeleteWorktreeDialog delete-state publication", () => {
  it("publishes the confirmed identities before dispatching the removal", async () => {
    const onDeleteStart = vi.fn();
    const onDeleteSettled = vi.fn();
    renderDialog({ onDeleteStart, onDeleteSettled });

    fireEvent.click(confirmButton());

    expect(onDeleteStart).toHaveBeenCalledWith([CONFIRMED_SSH]);
    // The card is already busy when the first command leaves the renderer.
    expect(onDeleteStart.mock.invocationCallOrder[0]).toBeLessThan(
      invokeMock.mock.invocationCallOrder[0]
    );
    await waitFor(() => expect(onDeleteSettled).toHaveBeenCalledWith([CONFIRMED_SSH]));
  });

  it("releases the identities when the backend refuses the removal", async () => {
    invokeMock.mockRejectedValueOnce("worktree has uncommitted changes");
    const onDeleteStart = vi.fn();
    const onDeleteSettled = vi.fn();
    const onClose = vi.fn();
    renderDialog({ onDeleteStart, onDeleteSettled, onClose });

    fireEvent.click(confirmButton());

    expect(onDeleteStart).toHaveBeenCalledWith([CONFIRMED_SSH]);
    await waitFor(() => expect(onDeleteSettled).toHaveBeenCalledWith([CONFIRMED_SSH]));
    // The refusal keeps the confirmation on screen with its error, and the card
    // answers again — the stuck-overlay regression.
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText(/uncommitted changes/)).toBeInTheDocument();
  });

  it("never publishes a state when the confirmation aborts on a stale target", () => {
    const onDeleteStart = vi.fn();
    renderDialog({
      liveWorktrees: [liveRow("ssh:build-box", "instance-recreated", "/work-ssh")],
      onDeleteStart,
      onStaleTargets: vi.fn(),
    });

    fireEvent.click(confirmButton());

    expect(invokeMock).not.toHaveBeenCalled();
    expect(onDeleteStart).not.toHaveBeenCalled();
  });
});

// Orca `getWorkspaceDeleteLineage` / `runLineageDeleteAll`: the confirmation must
// name every descendant it destroys and dispatch them child-first, because a child
// can live inside the parent directory that Git force-deletes.
describe("DeleteWorktreeDialog lineage delete", () => {
  const CHILD_PATH = "/work/orca/child";
  const GRANDCHILD_PATH = "/work/orca/child/grandchild";
  const CHILD_ID = "repo-1::/work/orca/child";
  const GRANDCHILD_ID = "repo-1::/work/orca/child/grandchild";
  const PARENT_IDENTITY: WorktreeDeleteIdentity = {
    id: SHARED_ID,
    instanceId: "instance-parent",
    hostId: "local",
  };

  function lineageRows(): WorktreeDeleteLiveTarget[] {
    return [
      {
        id: SHARED_ID,
        instanceId: "instance-parent",
        hostId: "local",
        isMainWorktree: false,
        path: WORKTREE_PATH,
        repoPath: PROJECT_PATH,
        displayName: "Parent",
      },
      {
        id: CHILD_ID,
        instanceId: "instance-child",
        hostId: "local",
        isMainWorktree: false,
        path: CHILD_PATH,
        repoPath: PROJECT_PATH,
        displayName: "Child",
      },
      {
        id: GRANDCHILD_ID,
        instanceId: "instance-grandchild",
        hostId: "local",
        isMainWorktree: false,
        path: GRANDCHILD_PATH,
        repoPath: PROJECT_PATH,
        displayName: "Grandchild",
      },
    ];
  }

  function lineageMap(): Record<string, string> {
    return { [CHILD_PATH]: WORKTREE_PATH, [GRANDCHILD_PATH]: CHILD_PATH };
  }

  it("names the descendants and deletes them child-first", async () => {
    const onDeleted = vi.fn();
    renderDialog({
      deleteTargets: [PARENT_IDENTITY],
      liveWorktrees: lineageRows(),
      lineageByPath: lineageMap(),
      onDeleted,
    });

    expect(screen.getByText("Child workspaces will be deleted")).toBeInTheDocument();
    expect(
      screen.getByText("Deleting this workspace also deletes 2 child workspaces.")
    ).toBeInTheDocument();
    expect(screen.getByText("Child")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete 3 Workspaces" }));

    await waitFor(() =>
      expect(onDeleted).toHaveBeenCalledWith([GRANDCHILD_PATH, CHILD_PATH, WORKTREE_PATH])
    );
    expect(invokeMock.mock.calls.map((call) => call[1].worktreePath)).toEqual([
      GRANDCHILD_PATH,
      CHILD_PATH,
      WORKTREE_PATH,
    ]);
    expect(invokeMock.mock.calls.map((call) => call[1].hostId)).toEqual([
      "local",
      "local",
      "local",
    ]);
  });

  it("keeps the skip-confirmation choice away while children are at risk", () => {
    renderDialog({
      deleteTargets: [PARENT_IDENTITY],
      liveWorktrees: lineageRows(),
      lineageByPath: lineageMap(),
    });

    expect(screen.queryByRole("checkbox", { name: /Don't ask again/i })).not.toBeInTheDocument();
  });

  it("recomputes the tree when a descendant is already gone", () => {
    const onStaleTargets = vi.fn();
    const onClose = vi.fn();
    renderDialog({
      deleteTargets: [PARENT_IDENTITY],
      liveWorktrees: lineageRows().filter((row) => row.path !== GRANDCHILD_PATH),
      lineageByPath: lineageMap(),
      onStaleTargets,
      onClose,
    });

    // The resolver only names live rows, so the vanished grandchild drops out
    // instead of leaving a destructive button armed for a tree it cannot resolve.
    expect(screen.queryByRole("button", { name: "Delete 3 Workspaces" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete 2 Workspaces" })).toBeInTheDocument();
  });
});


describe("DeleteWorktreeDialog batch preview accessibility (D10-020/022)", () => {
  it("exposes the batch as a labelled list with one item per target", () => {
    renderDialog({
      worktrees: [worktree(), { ...worktree(), path: "/work/orca-two", branch: "feat/two" }],
      liveWorktrees: [
        liveRow("local", "instance-local", PROJECT_PATH),
        {
          id: "repo-1::/work/orca-two",
          instanceId: "instance-two",
          hostId: "local",
          isMainWorktree: false,
          path: "/work/orca-two",
          repoPath: PROJECT_PATH,
        },
      ],
    });

    const list = screen.getByRole("list", { name: "Workspaces to delete" });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    // Each row names its branch and checkout path, not just one of them.
    const labelledBy = items[0]!.getAttribute("aria-labelledby")!;
    expect(labelledBy.split(" ").length).toBeGreaterThanOrEqual(2);
    expect(items[0]).toHaveTextContent("feat/orca");
  });
});
