// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Reference: src/renderer/src/components/sidebar/smart-attention.ts (resolveAttention).
//
// Orca resolves attention per *pane*, merging fresh hook entries with a title heuristic.
// Hydra's split is different: the Herdr engine (PR-5/PR-6) owns detection AND decay — it
// pushes the final six-state string per session (`agent:state`), already aged out by
// detect_with_decay. So the frontend resolves attention per session from the state record
// alone, and no freshness TTL is re-applied here: the daemon is the authority, and
// re-deriving staleness client-side would let the two clocks disagree about what is stale.

/**
 * Ordinal class for the "agent-activity" (Orca "smart") sort. Lower = more attention-demanding.
 *   1 — Needs you (`blocked` / `waiting`)
 *   2 — Done (finished turn awaiting review; Herdr's Done→Idle TTL lives in the daemon)
 *   3 — Working
 *   4 — Unverifiable (`unknown` on a session with a live PTY: the reporting stream went
 *       silent, not necessarily the work — maps the Rust PR-6 decay destination)
 *   5 — Idle (nothing to assert)
 *
 * Primary sort key; ties fall back to the attention timestamp.
 */
export type SmartClass = 1 | 2 | 3 | 4 | 5

/** One session's contribution to an attention resolution. Pure data. */
export type SessionAttentionInput = {
  /** Herdr's six-state wire string (`agent:state` contract from PR-5/PR-6). */
  state: string;
  /** Epoch ms the current state began (Rust `state_started_at`). Absent on records created before the field existed. */
  stateStartedAt?: number;
  /** Best available proxy for when the session was last heard from (updated_at). */
  lastActivityAt?: number;
  /** Whether the daemon still holds the session's PTY. Decides `unknown` → Class 4 vs Class 5. */
  hasLivePty: boolean;
};

/** A session's (or worktree's) resolved attention. */
export type SessionAttention = {
  cls: SmartClass;
  attentionTimestamp: number;
};

export const IDLE: SessionAttention = { cls: 5, attentionTimestamp: 0 };

/**
 * Class for one session state. Wire safety: a state string outside the six-state contract
 * falls to Class 5 — an unrecognized state never claims attention.
 */
function classFor(state: string, hasLivePty: boolean): SmartClass {
  switch (state) {
    case "blocked":
    case "waiting":
      return 1;
    case "done":
      return 2;
    case "working":
      return 3;
    case "unknown":
      // Why hasLivePty: losing the reporting stream is not the same as nothing running
      // there — a live PTY outranks a genuinely empty session, but never a reporting one.
      return hasLivePty ? 4 : 5;
    default:
      return 5;
  }
}

/**
 * Resolve one session's attention class + timestamp. Pure function of (input, now).
 *
 * `attentionTimestamp` by class: 1–4 → `stateStartedAt`, falling back to `lastActivityAt`
 * (records created before the PR-6 wire field carry no stateStartedAt), then 0 — so idle
 * ordering falls through to recency in the comparator. Class 5 → always 0.
 */
export function resolveSessionAttention(input: SessionAttentionInput, now: number): SessionAttention {
  const cls = classFor(input.state, input.hasLivePty);
  if (cls === 5) return IDLE;

  if (typeof input.stateStartedAt === "number" && Number.isFinite(input.stateStartedAt)) {
    // Why the clamp: a daemon/renderer clock step can stamp stateStartedAt slightly ahead
    // of the renderer's wall clock; without it a future stamp would pin the session to
    // the top of its class's recency tiebreak until the clocks resync.
    return { cls, attentionTimestamp: Number.isFinite(now) ? Math.min(input.stateStartedAt, now) : input.stateStartedAt };
  }
  return { cls, attentionTimestamp: typeof input.lastActivityAt === "number" && Number.isFinite(input.lastActivityAt) ? input.lastActivityAt : 0 };
}

/**
 * Resolve a worktree's attention from its sessions. Same semantics as Orca's
 * resolveAttention across panes: the **min** class wins (the most demanding session
 * defines the worktree), and within that class the **max** timestamp wins (the freshest
 * attention event orders first). No sessions → idle.
 */
export function resolveWorktreeAttention(sessions: SessionAttentionInput[], now: number): SessionAttention {
  let best = IDLE;
  for (const session of sessions) {
    const attention = resolveSessionAttention(session, now);
    // Min class wins (higher priority); tie-break on max timestamp so the freshest
    // attention event wins.
    if (attention.cls < best.cls || (attention.cls === best.cls && attention.attentionTimestamp > best.attentionTimestamp)) {
      best = attention;
    }
  }
  return best;
}
