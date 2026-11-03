// Parity guard for the D05-001..004 wiring: the search bar follows agentsShowSearch,
// Escape clears the shell query and persists the collapsed pref, the list never steals
// focus on mount, closed threads render inert, the selected pane clears when it dies,
// and the options menu portals into the header target.
import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, fireEvent, render } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { SidebarAgentsList } from "./SidebarAgentsList";
import { useAppStore } from "../../store";
import type { WorktreeSession } from "./types";
import type { AgentStatusEntry } from "../../shared/agent-status-types";

const NOW = 1_700_000_000_000;
const TAB = "tab-live";
const LEAF = "11111111-1111-4111-8111-111111111111";
const PANE = `${TAB}:${LEAF}`;
const CLOSED_TAB = "tab-closed";
const CLOSED_LEAF = "22222222-2222-4222-8222-222222222222";
const CLOSED_PANE = `${CLOSED_TAB}:${CLOSED_LEAF}`;

type StoreView = {
  agentsShowSearch?: boolean;
  setAgentsShowSearch?: (value: boolean) => void;
  agentsCompactMode?: boolean;
  agentsShowChildAgents?: boolean;
  agentStatusByPaneKey: Record<string, AgentStatusEntry>;
  retainedAgentsByPaneKey: Record<string, unknown>;
  tabsByWorktree: Record<string, { id: string; title: string; sessionId?: string }[]>;
  ptyIdsByTabId: Record<string, string[]>;
  terminalLayoutsByTabId: Record<string, unknown>;
  runtimeAgentOrchestrationByPaneKey: Record<string, unknown>;
  acknowledgedAgentsByPaneKey: Record<string, number>;
  unreadTerminalPanes: Record<string, unknown>;
  unreadAgentCompletionPanes: Record<string, unknown>;
  manuallyUnreadTurnsByPaneKey: Record<string, unknown>;
  activityClearedAtByPaneKey: Record<string, number>;
};

function store(): StoreView {
  return useAppStore.getState() as unknown as StoreView;
}

function setStore(patch: Partial<StoreView>): void {
  useAppStore.setState(patch as unknown as Parameters<typeof useAppStore.setState>[0]);
}

function entry(overrides: Partial<AgentStatusEntry> = {}): AgentStatusEntry {
  return {
    state: "working",
    prompt: "Fix the parser",
    updatedAt: NOW,
    stateStartedAt: NOW - 1_000,
    paneKey: PANE,
    stateHistory: [],
    ...overrides,
  };
}

function session(): WorktreeSession {
  return {
    id: "sess-live",
    project_path: "/repo/wt",
    title: "Live agent",
    branch: "feat/x",
    state: "working",
    active: true,
    agentName: "claude",
    executable: "claude",
    created_at: NOW - 5_000,
    updated_at: NOW,
  };
}

beforeEach(() => {
  setStore({
    agentsShowSearch: true,
    agentsCompactMode: true,
    agentsShowChildAgents: false,
    agentStatusByPaneKey: { [PANE]: entry() },
    retainedAgentsByPaneKey: {},
    tabsByWorktree: {
      "/repo/wt": [{ id: TAB, title: "Fix the parser", sessionId: "sess-live" }],
    },
    ptyIdsByTabId: { [TAB]: ["pty"] },
    terminalLayoutsByTabId: {
      [TAB]: { root: { type: "leaf", leafId: LEAF }, activeLeafId: LEAF, expandedLeafId: null },
    },
    runtimeAgentOrchestrationByPaneKey: {},
    acknowledgedAgentsByPaneKey: {},
    unreadTerminalPanes: {},
    unreadAgentCompletionPanes: {},
    manuallyUnreadTurnsByPaneKey: {},
    activityClearedAtByPaneKey: {},
  });
});

function renderList(overrides: Partial<Parameters<typeof SidebarAgentsList>[0]> = {}) {
  const onQueryChange = vi.fn();
  const onSelectSession = vi.fn();
  const optionsTarget = document.createElement("div");
  document.body.append(optionsTarget);
  const view = render(
    <SidebarAgentsList
      sessions={[session()]}
      projects={[{ id: "repo", name: "wt", path: "/repo/wt", is_git: true, current_branch: "feat/x" }]}
      onSelectSession={onSelectSession}
      onDeleteSession={vi.fn()}
      groupBy="state"
      onGroupByChange={vi.fn()}
      readFilter="all"
      onReadFilterChange={vi.fn()}
      query=""
      onQueryChange={onQueryChange}
      optionsTarget={optionsTarget}
      {...overrides}
    />
  );
  return { ...view, onQueryChange, onSelectSession, optionsTarget };
}

describe("SidebarAgentsList thread host (D05-001/002)", () => {
  it("shows the search field without stealing focus on mount", () => {
    const { getByPlaceholderText } = renderList();
    const input = getByPlaceholderText("Filter agents...");
    expect(input).toBeInTheDocument();
    expect(document.activeElement).not.toBe(input);
  });

  it("hides the search field when agentsShowSearch is false", () => {
    setStore({ agentsShowSearch: false });
    const { queryByPlaceholderText } = renderList();
    expect(queryByPlaceholderText("Filter agents...")).toBeNull();
  });

  it("Escape clears the shell query and persists agentsShowSearch=false", () => {
    const { getByPlaceholderText, onQueryChange } = renderList({ query: "claude" });
    const input = getByPlaceholderText("Filter agents...");
    fireEvent.keyDown(input, { key: "Escape" });
    expect(onQueryChange).toHaveBeenCalledWith("");
    expect(store().agentsShowSearch).toBe(false);
  });

  it("portals the options menu into the header target", () => {
    const { optionsTarget } = renderList();
    expect(
      optionsTarget.querySelector('button[aria-label="Thread list options"]')
    ).not.toBeNull();
  });
});

describe("SidebarAgentsList selection liveness (D05-003)", () => {
  it("selects a live row, then clears the selection when its pane dies", () => {
    const { container, onSelectSession } = renderList();
    const row = container.querySelector('[role="listitem"]');
    expect(row).not.toBeNull();
    fireEvent.click(row as Element);
    expect(onSelectSession).toHaveBeenCalledWith("sess-live");
    expect(container.querySelector('[aria-current="true"]')).not.toBeNull();

    act(() => {
      setStore({ agentStatusByPaneKey: {}, tabsByWorktree: {} });
    });
    expect(container.querySelector('[aria-current="true"]')).toBeNull();
  });
});

describe("SidebarAgentsList inert closed threads (D05-001)", () => {
  it("lists a retained thread but does not activate it", () => {
    setStore({
      agentStatusByPaneKey: {},
      tabsByWorktree: {},
      retainedAgentsByPaneKey: {
        [CLOSED_PANE]: {
          entry: entry({ paneKey: CLOSED_PANE, state: "done", prompt: "Closed task" }),
          worktreeId: "/repo/wt",
          tab: {
            id: CLOSED_TAB,
            ptyId: null,
            worktreeId: "/repo/wt",
            title: "Closed task",
            customTitle: null,
            color: null,
            sortOrder: 0,
            createdAt: NOW,
          },
          agentType: "claude",
          startedAt: NOW,
        },
      },
    });
    const { container, onSelectSession } = renderList({ sessions: [] });
    const inert = container.querySelector('[data-inert="true"]');
    expect(inert).not.toBeNull();
    fireEvent.click(inert as Element);
    expect(onSelectSession).not.toHaveBeenCalled();
  });
});
