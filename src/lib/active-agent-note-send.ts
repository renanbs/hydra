// Hydra port of Orca's "send review notes to a running agent" path.
//
// Orca writes into the pane through its runtime transport. Hydra addresses a PTY
// by the tab's stable session id (split leaves have no per-leaf session id yet), so
// a leaf-scoped send is reported as unverifiable instead of writing to the wrong
// terminal.
import { invoke } from "@tauri-apps/api/core";
import type { AppState } from "@/store/types";

export type ActiveAgentNoteSendFailureCode =
  | "runtime-unverifiable"
  | "pane-not-addressable"
  | "no-notes";

export type ActiveAgentNoteSendResult =
  | { status: "sent" }
  | { status: "status-unavailable"; code: ActiveAgentNoteSendFailureCode };

export function activeAgentNotesSendFailureMessage(
  status: string,
  options: { explicitTarget?: boolean; code?: ActiveAgentNoteSendFailureCode }
): string {
  switch (options.code) {
    case "pane-not-addressable":
      return "This pane cannot be addressed (only single-pane tabs are supported).";
    case "no-notes":
      return "There are no unsent review notes for this workspace.";
    case "runtime-unverifiable":
    default:
      return status === "status-unavailable"
        ? "The agent's status could not be verified; notes were not sent."
        : "Could not send the notes to the agent.";
  }
}

function formatNotesForAgent(
  notes: readonly { filePath: string; lineNumber: number; startLine?: number; body: string }[]
): string {
  return notes
    .map((note) => {
      const line =
        note.startLine && note.startLine !== note.lineNumber
          ? `${note.startLine}-${note.lineNumber}`
          : `${note.lineNumber}`;
      return `- ${note.filePath}:${line} — ${note.body}`;
    })
    .join("\n");
}

function sessionIdForTab(tab: { id: string; sessionId?: string }): string | null {
  if (tab.sessionId) return tab.sessionId;
  if (tab.id.startsWith("tab_")) return tab.id.slice("tab_".length);
  return null;
}

export async function sendNotesToActiveAgentSession(args: {
  worktreeId: string;
  prompt?: string;
  noteTarget: { tabId: string; leafId: string };
  getState?: () => AppState;
}): Promise<ActiveAgentNoteSendResult> {
  const { getState } = args;
  if (!getState) {
    return { status: "status-unavailable", code: "runtime-unverifiable" };
  }
  const state = getState();
  const tabs = state.tabsByWorktree[args.worktreeId] ?? [];
  const tab = tabs.find(
    (candidate: { id: string }) => candidate.id === args.noteTarget.tabId
  );
  if (!tab) {
    return { status: "status-unavailable", code: "runtime-unverifiable" };
  }
  // Only the root leaf is addressable through the tab's session; a split layout
  // has no per-leaf PTY id in this build.
  const layoutLeaves = Object.keys(
    state.terminalLayoutsByTabId?.[tab.id]?.ptyIdsByLeafId ?? {}
  );
  if (layoutLeaves.length > 1 && args.noteTarget.leafId !== layoutLeaves[0]) {
    return { status: "status-unavailable", code: "pane-not-addressable" };
  }
  const unsent = state.getDiffComments(args.worktreeId).filter(
    (note: { sentAt?: number }) => !note.sentAt
  );
  const notesBlock = unsent.length > 0 ? formatNotesForAgent(unsent) : "";
  const prompt = args.prompt?.trim() ?? "";
  const payload = [prompt, notesBlock].filter(Boolean).join("\n\n");
  if (!payload) {
    return { status: "status-unavailable", code: "no-notes" };
  }
  const sessionId = sessionIdForTab(tab);
  if (!sessionId) {
    return { status: "status-unavailable", code: "runtime-unverifiable" };
  }
  try {
    await invoke("send_terminal_input", { sessionId, input: `${payload}\r` });
  } catch (error) {
    console.error("Failed to send review notes to the agent:", error);
    return { status: "status-unavailable", code: "runtime-unverifiable" };
  }
  if (unsent.length > 0) {
    await state.markDiffCommentsSent(
      args.worktreeId,
      unsent.map((note: { id: string }) => note.id)
    );
  }
  return { status: "sent" };
}
