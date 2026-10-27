import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CompactAgentRow } from "./CompactAgentRow";
import type { AgentRow } from "./worktree-card-agent-summary";

const NOW = 1_700_000_000_000;

const AGENT: AgentRow = {
  paneKey: "pane-1",
  agentType: "claude",
  prompt: "Review the diff",
  state: "done",
  entry: {
    paneKey: "pane-1",
    sessionId: "session-1",
    state: "done",
    prompt: "Review the diff",
    updatedAt: NOW,
    stateStartedAt: NOW - 60_000,
  },
};

function openMenu() {
  render(<CompactAgentRow agent={AGENT} now={NOW} />);
}

describe("compact agent row thread actions (D05-021/022/023)", () => {
  it("marks the thread read from the row menu", () => {
    const onMarkRead = vi.fn();
    render(<CompactAgentRow agent={AGENT} now={NOW} onMarkRead={onMarkRead} />);

    fireEvent.contextMenu(screen.getByRole("listitem"));
    fireEvent.click(screen.getByText("Mark thread as read"));

    expect(onMarkRead).toHaveBeenCalledTimes(1);
  });

  it("marks the thread unread and clears the notification from the row menu", () => {
    const onMarkUnread = vi.fn();
    const onClearNotification = vi.fn();
    render(
      <CompactAgentRow
        agent={AGENT}
        now={NOW}
        onMarkRead={vi.fn()}
        onMarkUnread={onMarkUnread}
        onClearNotification={onClearNotification}
      />
    );

    fireEvent.contextMenu(screen.getByRole("listitem"));
    fireEvent.click(screen.getByText("Mark thread as unread"));
    expect(onMarkUnread).toHaveBeenCalledTimes(1);

    fireEvent.contextMenu(screen.getByRole("listitem"));
    fireEvent.click(screen.getByText("Clear notification"));
    expect(onClearNotification).toHaveBeenCalledTimes(1);
  });

  it("offers no menu when the list wires no thread actions", () => {
    openMenu();
    fireEvent.contextMenu(screen.getByRole("listitem"));
    expect(screen.queryByText("Mark thread as read")).toBeNull();
  });
});
