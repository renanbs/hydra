import { beforeEach, describe, expect, it, vi } from "vitest";

const invokeMock = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (command: string, args?: unknown) => invokeMock(command, args),
}));

import { useAppStore } from "@/store";
import { sendNotesToActiveAgentSession } from "./active-agent-note-send";

const WORKTREE = "wt-1";

function seed() {
  useAppStore.setState({
    tabsByWorktree: {
      [WORKTREE]: [{ id: "tab_1", title: "agent", type: "terminal", sessionId: "sess_1" }],
    },
    terminalLayoutsByTabId: { tab_1: { ptyIdsByLeafId: { leaf_1: "pty_1" } } },
    diffCommentsByWorktree: {
      [WORKTREE]: [
        {
          id: "c1",
          worktreeId: WORKTREE,
          body: "rename this",
          filePath: "src/a.ts",
          lineNumber: 7,
          createdAt: 1,
        },
      ],
    },
    diffCommentsLoadedKeys: { [WORKTREE]: true },
  } as never);
}

describe("sendNotesToActiveAgentSession", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    invokeMock.mockResolvedValue(undefined);
    seed();
  });

  it("writes the formatted notes to the tab session and marks them sent", async () => {
    const result = await sendNotesToActiveAgentSession({
      worktreeId: WORKTREE,
      noteTarget: { tabId: "tab_1", leafId: "leaf_1" },
      getState: () => useAppStore.getState(),
    });

    expect(result).toEqual({ status: "sent" });
    expect(invokeMock).toHaveBeenCalledWith("send_terminal_input", {
      sessionId: "sess_1",
      input: expect.stringContaining("src/a.ts:7 — rename this"),
    });
    const notes = useAppStore.getState().getDiffComments(WORKTREE);
    expect(notes[0].sentAt).toBeGreaterThan(0);
  });

  it("refuses a split leaf that has no addressable session", async () => {
    useAppStore.setState({
      terminalLayoutsByTabId: {
        tab_1: { ptyIdsByLeafId: { leaf_1: "pty_1", leaf_2: "pty_2" } },
      },
    } as never);
    const result = await sendNotesToActiveAgentSession({
      worktreeId: WORKTREE,
      noteTarget: { tabId: "tab_1", leafId: "leaf_2" },
      getState: () => useAppStore.getState(),
    });
    expect(result).toEqual({ status: "status-unavailable", code: "pane-not-addressable" });
    expect(invokeMock).not.toHaveBeenCalled();
  });
});
