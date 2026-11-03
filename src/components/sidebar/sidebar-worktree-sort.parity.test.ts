import { describe, expect, it } from "vitest";
import { AGENT_STATUS_STALE_AFTER_MS } from "../../shared/agent-status-freshness";
import type { Repo } from "../../shared/repo-types";
import type { Worktree } from "../../shared/worktree/types";
import {
  SESSION_IDLE_ATTENTION,
  resolveSessionAttentionClass,
  resolveWorktreeAttentionFromSessions,
} from "./sidebar-session-attention";
import {
  applyPersistedWorktreeOrder,
  isSidebarSortColdStart,
  resolveComparatorSortBy,
  sortSidebarWorktrees,
} from "./sidebar-worktree-sort";
import { mostRecentAttentionInHistory } from "./smart-attention";

const NOW = 1_000_000_000;

function session(
  state: "working" | "blocked" | "waiting" | "idle" | "done" | "unknown",
  startedAt: number
) {
  return { state, state_started_at: startedAt, updated_at: startedAt };
}

describe("session attention classes (Orca order)", () => {
  it("puts a fresh done above a working session", () => {
    const done = resolveSessionAttentionClass(session("done", NOW - 1000), NOW);
    const working = resolveSessionAttentionClass(session("working", NOW - 2000), NOW);
    expect(done.cls).toBe(2);
    expect(working.cls).toBe(3);
    expect(done.cls).toBeLessThan(working.cls);
  });

  it("drops a done older than the freshness window to idle", () => {
    const stale = resolveSessionAttentionClass(
      session("done", NOW - AGENT_STATUS_STALE_AFTER_MS - 1),
      NOW
    );
    expect(stale).toEqual(SESSION_IDLE_ATTENTION);
  });

  it("keeps done at the freshness boundary", () => {
    const boundary = resolveSessionAttentionClass(
      session("done", NOW - AGENT_STATUS_STALE_AFTER_MS),
      NOW
    );
    expect(boundary.cls).toBe(2);
  });

  it("ranks blocked and waiting above everything, with their cause", () => {
    expect(resolveSessionAttentionClass(session("blocked", NOW - 5000), NOW)).toMatchObject({
      cls: 1,
      cause: "blocked",
    });
    expect(resolveSessionAttentionClass(session("waiting", NOW - 5000), NOW)).toMatchObject({
      cls: 1,
      cause: "waiting",
    });
  });

  it("only lifts an unknown session above idle when a PTY is live", () => {
    expect(resolveSessionAttentionClass(session("unknown", NOW), NOW).cls).toBe(5);
    expect(resolveSessionAttentionClass(session("unknown", NOW), NOW, true).cls).toBe(4);
  });

  it("takes the most demanding session and, on ties, the freshest event", () => {
    expect(
      resolveWorktreeAttentionFromSessions(
        [session("working", NOW - 1000), session("done", NOW - 2000)],
        NOW
      ).cls
    ).toBe(2);

    const tied = resolveWorktreeAttentionFromSessions(
      [session("done", NOW - 5000), session("done", NOW - 1000)],
      NOW
    );
    expect(tied).toEqual({ cls: 2, attentionTimestamp: NOW - 1000 });
  });

  it("is idle with no sessions", () => {
    expect(resolveWorktreeAttentionFromSessions([], NOW)).toEqual(SESSION_IDLE_ATTENTION);
  });
});

function worktree(id: string, extra: Partial<Worktree> = {}): Worktree {
  return {
    id,
    repoId: "repo_a",
    projectId: "repo_a",
    displayName: id,
    comment: "",
    linkedIssue: null,
    linkedPR: null,
    linkedLinearIssue: null,
    isArchived: false,
    isUnread: false,
    isPinned: false,
    sortOrder: 0,
    lastActivityAt: 0,
    path: `/w/${id}`,
    head: "abc",
    branch: id,
    isBare: false,
    isMainWorktree: false,
    ...extra,
  } as Worktree;
}

const REPO_MAP = new Map<string, Repo>([
  ["repo_a", { id: "repo_a", displayName: "Alpha" } as Repo],
  ["repo_b", { id: "repo_b", displayName: "Beta" } as Repo],
]);

describe("sidebar sort modes", () => {
  it("maps the legacy menu modes onto the comparator", () => {
    expect(resolveComparatorSortBy("agent-activity")).toBe("smart");
    expect(resolveComparatorSortBy("project")).toBe("repo");
    expect(resolveComparatorSortBy("manual")).toBe("manual");
    expect(resolveComparatorSortBy("recent")).toBe("recent");
    expect(resolveComparatorSortBy("name")).toBe("name");
  });

  it("orders smart mode by the attention classes", () => {
    const rows = [worktree("working"), worktree("done"), worktree("idle")];
    const attention = new Map([
      ["working", { cls: 3 as const, attentionTimestamp: NOW }],
      ["done", { cls: 2 as const, attentionTimestamp: NOW }],
      ["idle", { cls: 5 as const, attentionTimestamp: 0 }],
    ]);
    const sorted = sortSidebarWorktrees({
      worktrees: rows,
      mode: "agent-activity",
      repoMap: REPO_MAP,
      now: NOW,
      attentionByWorktree: attention,
    });
    expect(sorted.map((row) => row.id)).toEqual(["done", "working", "idle"]);
  });

  it("orders manual mode by manualOrder, newest first", () => {
    const rows = [
      worktree("a", { manualOrder: 10 }),
      worktree("b", { manualOrder: 30 }),
      worktree("c", { manualOrder: 20 }),
    ];
    const sorted = sortSidebarWorktrees({
      worktrees: rows,
      mode: "manual",
      repoMap: REPO_MAP,
      now: NOW,
    });
    expect(sorted.map((row) => row.id)).toEqual(["b", "c", "a"]);
  });

  it("uses effectiveRecentActivity in recent mode (create grace)", () => {
    const rows = [
      worktree("old", { lastActivityAt: NOW - 60_000, createdAt: NOW - 60_000 }),
      // Just created: its floor is createdAt + 5min, so it outranks older activity.
      worktree("fresh", { lastActivityAt: NOW - 10_000, createdAt: NOW - 10_000 }),
    ];
    const sorted = sortSidebarWorktrees({
      worktrees: rows,
      mode: "recent",
      repoMap: REPO_MAP,
      now: NOW,
    });
    expect(sorted.map((row) => row.id)).toEqual(["fresh", "old"]);
  });

  it("sorts by trimmed display name, falling back to the path basename", () => {
    const rows = [
      worktree("z", { displayName: "  Zebra " }),
      worktree("a", { displayName: "  " , path: "/w/apple" }),
    ];
    const sorted = sortSidebarWorktrees({
      worktrees: rows,
      mode: "name",
      repoMap: REPO_MAP,
      now: NOW,
    });
    expect(sorted.map((row) => row.id)).toEqual(["a", "z"]);
  });

  it("sorts Project mode by repo display name", () => {
    const rows = [
      worktree("b", { repoId: "repo_b" }),
      worktree("a", { repoId: "repo_a" }),
    ];
    const sorted = sortSidebarWorktrees({
      worktrees: rows,
      mode: "project",
      repoMap: REPO_MAP,
      now: NOW,
    });
    expect(sorted.map((row) => row.id)).toEqual(["a", "b"]);
  });
});

describe("applyPersistedWorktreeOrder", () => {
  it("restores manualOrder/sortOrder and real activity by id", () => {
    const projected = worktree("repo_a::/w/a");
    const [restored] = applyPersistedWorktreeOrder([projected], [
      worktree("repo_a::/w/a", {
        manualOrder: 42,
        sortOrder: 7,
        lastActivityAt: 123,
        createdAt: 100,
      }),
    ]);
    expect(restored).toMatchObject({
      manualOrder: 42,
      sortOrder: 7,
      lastActivityAt: 123,
      createdAt: 100,
    });
  });

  it("falls back to the path for legacy ids and leaves unknown rows alone", () => {
    const projected = worktree("legacy-id", { path: "/w/a" });
    const untouched = worktree("other", { path: "/w/other" });
    const [byPath, plain] = applyPersistedWorktreeOrder([projected, untouched], [
      worktree("repo_a::/w/a", { manualOrder: 5, path: "/w/a" }),
    ]);
    expect(byPath.manualOrder).toBe(5);
    expect(plain.manualOrder).toBeUndefined();
  });
});

// ─── D09-023 / D09-024: painted attention tie-break and history ─────────────
describe("painted attention (Orca smart-attention parity)", () => {
  const LEAF = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

  it("falls back to a permission title when the pane has no hook entry", () => {
    const source = {
      state: "unknown" as const,
      updated_at: NOW - 2000,
      title: "Claude Code needs permission",
      hasLivePty: true,
    };
    expect(resolveSessionAttentionClass(source, NOW)).toMatchObject({
      cls: 1,
      cause: "title-heuristic",
      attentionTimestamp: NOW,
    });
  });

  it("ranks a working title below a hook-backed done turn", () => {
    const workingTitle = resolveSessionAttentionClass(
      { state: "unknown", updated_at: NOW - 1000, title: "⠋ Running tests", hasLivePty: true },
      NOW
    );
    const done = resolveSessionAttentionClass(session("done", NOW - 5000), NOW);
    expect(workingTitle.cls).toBe(3);
    expect(done.cls).toBeLessThan(workingTitle.cls);
  });

  it("ignores a title without a live PTY (slept tab)", () => {
    const slept = resolveSessionAttentionClass(
      { state: "unknown", updated_at: NOW, title: "Claude Code needs permission", hasLivePty: false },
      NOW
    );
    expect(slept).toEqual(SESSION_IDLE_ATTENTION);
  });

  it("stamps a working session with the newest done/blocked/waiting history row", () => {
    const [attention] = [
      resolveSessionAttentionClass(
        {
          ...session("working", NOW - 3_600_000),
          // The freshest qualifying row wins, ignoring an interrupted done.
          stateHistory: [
            { state: "done", startedAt: NOW - 100_000 },
            { state: "blocked", startedAt: NOW - 400_000 },
            { state: "done", startedAt: NOW - 1_000, interrupted: true },
          ],
        } as never,
        NOW
      ),
    ];
    expect(attention.cls).toBe(3);
    expect(attention.attentionTimestamp).toBe(NOW - 100_000);
  });

  it("falls back to stateStartedAt when the history has no qualifying row", () => {
    const attention = resolveSessionAttentionClass(
      { ...session("working", NOW - 1000), stateHistory: [{ state: "idle", startedAt: NOW }] } as never,
      NOW
    );
    expect(attention.attentionTimestamp).toBe(NOW - 1000);
  });

  // The scan itself (done/blocked/waiting, interrupted done skipped, non-finite ignored).
  it("scans done, blocked and waiting and skips interrupted or non-finite rows", () => {
    expect(
      mostRecentAttentionInHistory([
        { state: "waiting", startedAt: NOW - 10 },
        { state: "done", startedAt: NOW - 20 },
        { state: "working", startedAt: NOW },
        { state: "done", startedAt: NOW, interrupted: true },
        { state: "blocked", startedAt: Number.POSITIVE_INFINITY },
      ])
    ).toBe(NOW - 10);
    expect(mostRecentAttentionInHistory([])).toBeNull();
    expect(mostRecentAttentionInHistory([{ state: "idle", startedAt: NOW }])).toBeNull();
  });
});

// ─── D09-027 / D09-031: cold start from the persisted snapshot ──────────────
describe("painted smart-sort cold start (Orca sortWorktreesSmart parity)", () => {
  const LEAF = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

  it("stays cold with no PTY and no fresh hook-attributed status", () => {
    expect(
      isSidebarSortColdStart({
        tabsByWorktree: {},
        ptyIdsByTabId: {},
        agentStatusByPaneKey: undefined,
        now: NOW,
      })
    ).toBe(true);
  });

  it("ends cold start on the first live PTY", () => {
    expect(
      isSidebarSortColdStart({
        tabsByWorktree: { "/w/a": [{ id: "tab-a" }] },
        ptyIdsByTabId: { "tab-a": ["pty-1"] },
        agentStatusByPaneKey: undefined,
        now: NOW,
      })
    ).toBe(false);
  });

  it("ends cold start on a fresh hook row even with no PTY (SSH mirror)", () => {
    const entry = {
      paneKey: `tab-a:${LEAF}`,
      sessionId: "tab-a",
      worktreeId: "wt-a",
      state: "working" as const,
      prompt: "",
      updatedAt: NOW - 60_000,
      stateStartedAt: NOW - 60_000,
    };
    expect(
      isSidebarSortColdStart({
        tabsByWorktree: {},
        ptyIdsByTabId: {},
        agentStatusByPaneKey: { [entry.paneKey]: entry },
        now: NOW,
      })
    ).toBe(false);
  });

  it("keeps the persisted order instead of an all-idle attention map", () => {
    const rows = [
      worktree("a", { sortOrder: 1 }),
      worktree("b", { sortOrder: 9 }),
      worktree("c", { sortOrder: 4 }),
    ];
    const attention = new Map([
      ["a", { cls: 1 as const, attentionTimestamp: NOW }],
      ["b", { cls: 5 as const, attentionTimestamp: 0 }],
      ["c", { cls: 5 as const, attentionTimestamp: 0 }],
    ]);
    const sorted = sortSidebarWorktrees({
      worktrees: rows,
      mode: "agent-activity",
      repoMap: REPO_MAP,
      now: NOW,
      attentionByWorktree: attention,
      coldStart: true,
    });
    // Persisted sortOrder desc, NOT the class-1 row.
    expect(sorted.map((row) => row.id)).toEqual(["b", "c", "a"]);
  });

  it("leaves non-smart modes untouched during cold start", () => {
    const rows = [worktree("z"), worktree("a")];
    const sorted = sortSidebarWorktrees({
      worktrees: rows,
      mode: "name",
      repoMap: REPO_MAP,
      now: NOW,
      coldStart: true,
    });
    expect(sorted.map((row) => row.id)).toEqual(["a", "z"]);
  });
});
