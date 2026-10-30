// Diff notes are persisted per workspace key in SQLite. These cases pin the three
// contracts the port depends on: hydration on first read, ordered saves, and a
// rollback that restores the list that actually landed on disk.
import { beforeEach, describe, expect, it, vi } from "vitest";

const invokeMock = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (command: string, args?: unknown) => invokeMock(command, args),
}));

import { useAppStore } from "@/store";

const KEY = "worktree:wt-1";

function resetStore() {
  useAppStore.setState({
    diffCommentsByWorktree: {},
    diffCommentsLoadedKeys: {},
  } as never);
}

describe("diff comment persistence", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    resetStore();
  });

  it("hydrates a workspace's notes on first read", async () => {
    invokeMock.mockResolvedValueOnce([
      { id: "c1", worktreeId: KEY, body: "note", filePath: "a.ts", lineNumber: 3, createdAt: 1 },
    ]);
    await useAppStore.getState().getDiffComments(KEY);
    await Promise.resolve();
    await Promise.resolve();
    expect(invokeMock).toHaveBeenCalledWith("load_diff_comments", { worktreeKey: KEY });
    expect(useAppStore.getState().getDiffComments(KEY)).toHaveLength(1);
  });

  it("persists an added note for the workspace key", async () => {
    useAppStore.setState({ diffCommentsLoadedKeys: { [KEY]: true } } as never);
    invokeMock.mockResolvedValue(undefined);
    const comment = await useAppStore.getState().addDiffComment({
      worktreeId: KEY,
      body: "review me",
      filePath: "a.ts",
      lineNumber: 5,
    } as never);
    expect(comment).not.toBeNull();
    expect(invokeMock).toHaveBeenCalledWith("save_diff_comments", {
      worktreeKey: KEY,
      comments: [expect.objectContaining({ body: "review me", lineNumber: 5 })],
    });
    expect(useAppStore.getState().getDiffComments(KEY)).toHaveLength(1);
  });

  it("rolls the list back when the save fails", async () => {
    useAppStore.setState({ diffCommentsLoadedKeys: { [KEY]: true } } as never);
    invokeMock.mockRejectedValueOnce(new Error("disk full"));
    const comment = await useAppStore.getState().addDiffComment({
      worktreeId: KEY,
      body: "lost",
      filePath: "a.ts",
      lineNumber: 1,
    } as never);
    expect(comment).toBeNull();
    expect(useAppStore.getState().getDiffComments(KEY)).toHaveLength(0);
  });
});
