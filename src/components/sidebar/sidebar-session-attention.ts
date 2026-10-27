// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/smart-attention.ts (class assignment only)
//
// The painted sidebar orders worktrees from Herdr session state, not from Orca's
// tab/pane inputs, so it needs the class contract on its own shape. The classes are
// Orca's exactly:
//   1 — Blocked / Waiting (the agent needs the user now)
//   2 — Done, fresh: completed within AGENT_STATUS_STALE_AFTER_MS
//   3 — Working
//   4 — Idle/unknown with a live PTY (silent, but the user knows why)
//   5 — Idle: nothing running
// Why 2 outranks 3: a finished turn is waiting to be read; a running turn will still be
// there later. `src/lib/smart-attention.ts` had these two swapped, which is what made
// the painted "Agent Activity" sort disagree with Orca.
import { AGENT_STATUS_STALE_AFTER_MS } from "../../shared/agent-status-freshness";
import type { WorktreeSession } from "./types";
import type { WorktreeAttention } from "./smart-attention";

/** The slice of a session the class contract needs. */
export type SessionAttentionSource = Pick<
  WorktreeSession,
  "state" | "state_started_at" | "updated_at"
>;

export const SESSION_IDLE_ATTENTION: WorktreeAttention = { cls: 5, attentionTimestamp: 0 };

function attentionTimestamp(session: SessionAttentionSource): number {
  if (typeof session.state_started_at === "number" && Number.isFinite(session.state_started_at)) {
    return session.state_started_at;
  }
  if (typeof session.updated_at === "number" && Number.isFinite(session.updated_at)) {
    return session.updated_at;
  }
  return 0;
}

/** Completion time for a `done` session: the state change stamp, else the record's update. */
function completionTimestamp(session: SessionAttentionSource): number | null {
  if (typeof session.state_started_at === "number" && Number.isFinite(session.state_started_at)) {
    return session.state_started_at;
  }
  if (typeof session.updated_at === "number" && Number.isFinite(session.updated_at)) {
    return session.updated_at;
  }
  return null;
}

/**
 * Class for one session. A `done` session older than the freshness window (or with no
 * completion stamp) is finished business, not attention: it falls to idle so it cannot
 * outrank a running agent forever.
 */
export function resolveSessionAttentionClass(
  session: SessionAttentionSource,
  now: number,
  hasLivePty = false
): WorktreeAttention {
  switch (session.state) {
    case "blocked":
    case "waiting":
      return { cls: 1, attentionTimestamp: attentionTimestamp(session), cause: session.state };
    case "done": {
      const completedAt = completionTimestamp(session);
      if (completedAt === null || now - completedAt > AGENT_STATUS_STALE_AFTER_MS) {
        return SESSION_IDLE_ATTENTION;
      }
      return { cls: 2, attentionTimestamp: completedAt };
    }
    case "working":
      return { cls: 3, attentionTimestamp: attentionTimestamp(session) };
    case "unknown":
      return hasLivePty
        ? { cls: 4, attentionTimestamp: attentionTimestamp(session) }
        : SESSION_IDLE_ATTENTION;
    default:
      return SESSION_IDLE_ATTENTION;
  }
}

/**
 * A worktree's attention is the minimum class across its sessions (the most demanding
 * session wins); ties break on the freshest attention event, like `resolveAttention`.
 */
export function resolveWorktreeAttentionFromSessions(
  sessions: readonly SessionAttentionSource[],
  now: number,
  hasLivePty = false
): WorktreeAttention {
  let best: WorktreeAttention = SESSION_IDLE_ATTENTION;
  for (const session of sessions) {
    const attention = resolveSessionAttentionClass(session, now, hasLivePty);
    if (
      attention.cls < best.cls ||
      (attention.cls === best.cls && attention.attentionTimestamp > best.attentionTimestamp)
    ) {
      best = attention;
    }
  }
  return best;
}
