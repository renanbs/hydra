import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SidebarAgentsList } from "./SidebarAgentsList";
import type { WorktreeSession } from "./WorktreeSidebar";

function session(id: string): WorktreeSession {
  return {
    id,
    project_path: "/repo/a",
    title: `Agent ${id}`,
    branch: "main",
    state: "idle",
    active: false,
    agentName: "claude",
    executable: "claude",
    created_at: 1,
    updated_at: 1,
  };
}

function renderList(scrollTopRef: { current: number }) {
  return render(
    <SidebarAgentsList
      sessions={[session("a"), session("b"), session("c")]}
      projects={[{ id: "repo_a", name: "repo", path: "/repo/a", is_git: true, current_branch: "main" }]}
      onSelectSession={vi.fn()}
      onDeleteSession={vi.fn()}
      groupBy="state"
      onGroupByChange={vi.fn()}
      statusFilter="all"
      onStatusFilterChange={vi.fn()}
      scrollTopRef={scrollTopRef}
    />
  );
}

describe("SidebarAgentsList scroll persistence (D01-005)", () => {
  it("restores the persisted offset when the body mounts", () => {
    const { container } = renderList({ current: 120 });

    const scroller = container.querySelector<HTMLElement>(".overflow-y-auto");
    expect(scroller).not.toBeNull();
    expect(scroller!.scrollTop).toBe(120);
  });

  it("records the offset as the list scrolls", () => {
    const scrollTopRef = { current: 0 };
    const { container } = renderList(scrollTopRef);

    const scroller = container.querySelector<HTMLElement>(".overflow-y-auto")!;
    scroller.scrollTop = 200;
    fireEvent.scroll(scroller);

    expect(scrollTopRef.current).toBe(200);
  });
});
