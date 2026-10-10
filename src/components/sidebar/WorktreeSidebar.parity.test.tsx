import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WorktreeSidebar } from "./WorktreeSidebar";
import type { GitWorktreeInfo, HydraProject } from "./types";
import type { WorktreeSession } from "./WorktreeSidebar";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn().mockResolvedValue(null) }));

// The header's Agents intro popover is Radix-based, and Radix measures its content with
// a ResizeObserver that jsdom does not implement. Stub only the constructor surface used.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;

const PROJECT: HydraProject = {
  id: "repo_a",
  name: "repo",
  path: "/repo/a",
  is_git: true,
  current_branch: "main",
};

const SESSION: WorktreeSession = {
  id: "sess_1",
  project_path: "/repo/a",
  title: "Agent",
  branch: "main",
  state: "idle",
  active: false,
  agentName: "claude",
  executable: "claude",
  created_at: 1,
  updated_at: 1,
};

function renderSidebar(leftSidebarStyle?: React.CSSProperties) {
  const utils = render(
    <TooltipProvider>
      <WorktreeSidebar
        sessions={[SESSION]}
        projects={[PROJECT]}
        activeProject={PROJECT}
        gitStatus={null}
        gitWorktrees={[] as GitWorktreeInfo[]}
        onSelectProject={vi.fn()}
        onRemoveProject={vi.fn()}
        onSelectSession={vi.fn()}
        onSelectGitWorktree={vi.fn()}
        onDeleteGitWorktree={vi.fn()}
        onDeleteSession={vi.fn()}
        onOpenSettings={vi.fn()}
        onOpenAddRepoDialog={vi.fn()}
        onOpenNewWorkspaceModal={vi.fn()}
        onAssignWorktreeStatus={vi.fn()}
        onPinWorktree={vi.fn()}
        onCreateWorktree={vi.fn()}
        leftSidebarStyle={leftSidebarStyle}
      />
    </TooltipProvider>
  );
  return utils;
}

function agentScroller(container: HTMLElement): HTMLElement | undefined {
  return Array.from(container.querySelectorAll<HTMLElement>(".overflow-y-auto")).find((el) =>
    el.textContent?.includes("Agent")
  );
}

describe("WorktreeSidebar body switching (D01-005)", () => {
  it("lazy-loads the agents body and preserves its scroll offset across switches", async () => {
    const { container } = renderSidebar();

    // Workspaces body only: the agents list chunk is not rendered yet.
    expect(screen.queryByPlaceholderText("Filter agents...")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "View activity" }));

    const input = await screen.findByPlaceholderText("Filter agents...");
    expect(input).toBeInTheDocument();

    const scroller = agentScroller(container);
    expect(scroller).toBeDefined();
    scroller!.scrollTop = 150;
    fireEvent.scroll(scroller!);

    fireEvent.click(screen.getByRole("button", { name: "Turn off activity view" }));
    await waitFor(() => expect(screen.queryByPlaceholderText("Filter agents...")).toBeNull());

    fireEvent.click(screen.getByRole("button", { name: "View activity" }));
    await screen.findByPlaceholderText("Filter agents...");

    expect(agentScroller(container)?.scrollTop).toBe(150);
  });
});

describe("WorktreeSidebar appearance surface (D01-002)", () => {
  it("applies the resolved appearance variables to the sidebar surface", () => {
    const { container } = renderSidebar({
      "--worktree-sidebar": "#123456",
      backgroundColor: "#123456",
    });

    const surface = container.firstElementChild as HTMLElement;
    expect(surface.style.getPropertyValue("--worktree-sidebar")).toBe("#123456");
    expect(surface.style.backgroundColor).toBe("rgb(18, 52, 86)");
  });
});
