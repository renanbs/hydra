// Orca parity: the workspace status dot shown on folder rows AND worktree cards —
// `done`/`active` green, `inactive` grey, `working` spinner (`StatusIndicator.tsx`).
// Path health is a separate cue (the FolderX badge), never the dot.
import type { WorktreeSession } from "../components/sidebar/types";
import type { WorktreeAgentActivitySummary } from "../components/sidebar/worktree-agent-activity-summary";
import type { WorktreeStatus } from "./worktree-status";

export type AgentActivityStatusFlags = Pick<
  WorktreeAgentActivitySummary,
  | "hasPermission"
  | "hasInterrupted"
  | "hasLiveWorking"
  | "hasLiveMonitoring"
  | "hasLiveDone"
  | "hasRetainedDone"
>;

/**
 * Orca derives the dot from live PTYs and agent rows (`getWorktreeStatus`).
 * Hydra has no per-pane PTY index, so the equivalent signals are the workspace's
 * sessions (agent state) and whether a terminal tab is still mounted for the path;
 * closing the last terminal drops the workspace to `inactive` (grey), exactly the
 * transition Orca shows.
 */
export function workspaceStatusFrom(args: {
  sessions: readonly WorktreeSession[];
  hasLiveTerminal: boolean;
  /** Orca `selectWorktreeAgentActivitySummary`: cached per worktree/epoch. */
  agentSummary?: AgentActivityStatusFlags;
}): WorktreeStatus {
  // Why summary first: it separates interrupted from clean done and keeps stale rows
  // from pinning the card to a permission nobody asked for.
  if (args.agentSummary) {
    if (args.agentSummary.hasPermission) return "permission";
    if (args.agentSummary.hasInterrupted) return "interrupted";
    if (args.agentSummary.hasLiveWorking) return "working";
    if (args.agentSummary.hasLiveMonitoring) return "monitoring";
    if (args.agentSummary.hasLiveDone || args.agentSummary.hasRetainedDone) return "done";
  }
  const state = args.sessions[0]?.state;
  if (state === "working") return "working";
  if (state === "blocked" || state === "waiting") return "permission";
  if (state === "done") return "done";
  if (args.hasLiveTerminal) return "active";
  return "inactive";
}
