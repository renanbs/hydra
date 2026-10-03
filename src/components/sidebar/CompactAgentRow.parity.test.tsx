// Parity guard for the compact agent row. Orca's row (worktree-card-compact-agent-row.tsx)
// renders, in order: [disclosure | reserved size-4 gutter] [state dot] [identity icon]
// [flex-1 truncated label] [model] [+N] [relative time]. The label is `primary - secondary`,
// and the trailing relative time comes from getCompactAgentTime: the last `done` entry, else
// the turn start, formatted as now / 1m / 2h / 3d.
import { describe, expect, it } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render } from "@testing-library/react";
import { CompactAgentRow } from "./CompactAgentRow";
import type { AgentRow } from "./worktree-card-agent-summary";
import type { AgentStatusEntry } from "./agent-status-types";

const NOW = 1_700_000_000_000;

function makeAgent(overrides: Partial<AgentRow> = {}, entry: Partial<AgentStatusEntry> = {}): AgentRow {
  return {
    paneKey: "pane-1",
    agentType: "claude",
    prompt: "Review the diff",
    state: "idle",
    entry: {
      paneKey: "pane-1",
      sessionId: "session-1",
      state: "idle",
      prompt: "Review the diff",
      updatedAt: NOW,
      stateStartedAt: NOW - 60_000,
      ...entry,
    },
    ...overrides,
  };
}

function timeSlot(container: HTMLElement): Element | null {
  return container.querySelector('[role="listitem"] > span.tabular-nums');
}

describe("CompactAgentRow (Orca parity)", () => {
  it("shows a relative time on the trailing edge from the turn start", () => {
    const { container } = render(
      <CompactAgentRow agent={makeAgent({}, { stateStartedAt: NOW - 5 * 60_000 })} now={NOW} />
    );
    expect(timeSlot(container)?.textContent).toBe("5m");
    expect(timeSlot(container)?.className).toContain("shrink-0");
    expect(timeSlot(container)?.className).toContain("text-[10px]");
    expect(timeSlot(container)?.className).toContain("tabular-nums");
  });

  it("formats hours and days with Orca's compact coarse labels", () => {
    const hours = render(
      <CompactAgentRow agent={makeAgent({}, { stateStartedAt: NOW - 2 * 3_600_000 })} now={NOW} />
    );
    expect(timeSlot(hours.container)?.textContent).toBe("2h");

    const days = render(
      <CompactAgentRow agent={makeAgent({}, { stateStartedAt: NOW - 3 * 86_400_000 })} now={NOW} />
    );
    expect(timeSlot(days.container)?.textContent).toBe("3d");
  });

  it("times a finished row from when it entered done", () => {
    const done = render(
      <CompactAgentRow
        agent={makeAgent(
          { state: "done" },
          { state: "done", stateStartedAt: NOW - 2 * 60_000 }
        )}
        now={NOW}
      />
    );
    expect(timeSlot(done.container)?.textContent).toBe("2m");

    // A session-boundary `done` resolves to the real completion it displaced.
    const boundary = render(
      <CompactAgentRow
        agent={makeAgent(
          { state: "done" },
          {
            state: "done",
            sessionBoundary: true,
            stateStartedAt: NOW - 10 * 60_000,
            stateHistory: [
              { state: "working", prompt: "", startedAt: NOW - 20 * 60_000 },
              { state: "done", prompt: "", startedAt: NOW - 90_000 },
            ],
          }
        )}
        now={NOW}
      />
    );
    expect(timeSlot(boundary.container)?.textContent).toBe("1m");
  });

  it("renders no timestamp when nothing is timed", () => {
    const { container } = render(
      <CompactAgentRow agent={makeAgent({}, { stateStartedAt: 0 })} now={NOW} />
    );
    expect(timeSlot(container)).toBeNull();
  });

  it("falls back to the row's startedAt when the entry state has none", () => {
    const { container } = render(
      <CompactAgentRow
        agent={makeAgent({ startedAt: NOW - 60_000 }, { stateStartedAt: 0 })}
        now={NOW}
      />
    );
    expect(timeSlot(container)?.textContent).toBe("1m");
  });

  it("keeps the Orca slot order: gutter, dot, identity, label, model, time", () => {
    const { container } = render(
      <CompactAgentRow
        agent={makeAgent({}, { model: "claude-sonnet", stateStartedAt: NOW - 60_000 })}
        now={NOW}
        reserveDisclosureGutter
      />
    );
    const row = container.querySelector('[role="listitem"]');
    expect(row).not.toBeNull();
    const slots = Array.from(row!.children);
    // 1. reserved disclosure gutter (same width as a chevron) keeps leaves aligned with parents.
    expect(slots[0].getAttribute("aria-hidden")).toBe("true");
    expect(slots[0].className).toContain("size-4");
    // 2. state dot, 3. identity icon.
    expect(slots[1].getAttribute("title")).toBe("Idle");
    expect(slots[2].getAttribute("title")).toBe("Claude");
    // 4. truncated label, 5. model, 6. trailing relative time.
    expect(slots[3].className).toContain("flex-1");
    expect(slots[4].className).toContain("max-w-24");
    expect(slots[4].textContent).toBe("claude-sonnet");
    expect(slots[5]).toBe(timeSlot(container));
  });

  it("renders the label as `primary - secondary` like Orca", () => {
    const { container } = render(
      <CompactAgentRow agent={makeAgent({}, { stateStartedAt: NOW })} now={NOW} />
    );
    const label = container.querySelector('[role="listitem"] > span.flex-1');
    expect(label?.textContent).toBe("Review the diff - Claude");
  });
});
