// STA-4343: the delete confirmation guards an IDENTITY, not a path. This suite
// proves the three states the sidebar can be in between opening and confirming:
// the confirmed instance was replaced, the confirmation still resolves on the
// right host, and the target vanished entirely.
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
