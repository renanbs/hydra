// Parity guards for the repo/group header menus (D03a-082/084/087). Orca keeps
// project actions in the repo header menu (Change Project Icon, non-Orca worktree
// visibility, a "Move to group" submenu whose current group is disabled, and a
// separator before Remove Project) and routes group rename/delete to the host that
// owns the group row. D03a-084 also owns the glyph write path: the menu replaces
// Orca's settings pane with an inline emoji picker that persists through
// `catalog_set_repo_icon`.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { invoke } from "@tauri-apps/api/core";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAppStore } from "@/store";
import { toast } from "sonner";
import { WorktreeSidebar } from "./WorktreeSidebar";
import {
  PROJECT_ICON_OPTIMISTIC_EVENT,
  REPO_ICON_REMOTE_DISABLED_REASON,
} from "@/lib/repo-icon-write";
import type { HydraProject } from "./types";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn().mockResolvedValue(null) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;

const PROJECT_A: HydraProject = {
  id: "repo_a",
  name: "hydra",
  path: "/repo/a",
  is_git: true,
  current_branch: "main",
};

const PROJECT_B: HydraProject = {
  id: "repo_b",
  name: "orca",
  path: "/repo/b",
  is_git: true,
  current_branch: "main",
};

const GROUPS = [
  { id: "grp_dev", name: "Marketplace" },
  { id: "grp_platform", name: "Platform" },
];

function resetStore() {
  useAppStore.setState({
    repos: [
      {
        id: "repo_a",
        path: "/repo/a",
        connectionId: "srv",
        executionHostId: "ssh:srv",
      },
      {
        id: "repo_b",
        path: "/repo/b",
        connectionId: "srv",
        executionHostId: "ssh:srv",
      },
    ],
    sshConnectionStates: new Map([["srv", { targetId: "srv", status: "connected" }]]),
    sshTargetLabels: new Map([["srv", "Build server"]]),
  });
}

/** Projects the header menu may write: both rows live on this computer. */
function resetStoreToLocalRepos() {
  useAppStore.setState({
    repos: [
      { id: "repo_a", path: "/repo/a" },
      { id: "repo_b", path: "/repo/b" },
    ],
    sshConnectionStates: new Map(),
    sshTargetLabels: new Map(),
  });
}

function renderSidebar(onOpenSettings = vi.fn()) {
  return render(
    <TooltipProvider>
      <WorktreeSidebar
        sessions={[]}
        projects={[PROJECT_A, PROJECT_B]}
        activeProject={PROJECT_A}
        gitStatus={null}
        gitWorktrees={[]}
        onSelectProject={vi.fn()}
        onRemoveProject={vi.fn()}
        onSelectSession={vi.fn()}
        onSelectGitWorktree={vi.fn()}
        onDeleteGitWorktree={vi.fn()}
        onDeleteSession={vi.fn()}
        onOpenSettings={onOpenSettings}
        onOpenAddRepoDialog={vi.fn()}
        onOpenNewWorkspaceModal={vi.fn()}
        onAssignWorktreeStatus={vi.fn()}
        onPinWorktree={vi.fn()}
        onCreateWorktree={vi.fn()}
        projectGroups={GROUPS}
        projectGroupMap={{ repo_a: "grp_dev", repo_b: "grp_dev" }}
      />
    </TooltipProvider>
  );
}

function openProjectMenu() {
  fireEvent.click(screen.getAllByRole("button", { name: "Project options" })[0]);
}

function openGroupMenu() {
  fireEvent.click(screen.getAllByRole("button", { name: "Group options" })[0]);
}

function acknowledgeNext(eventName: string) {
  const acknowledge = () => {
    window.dispatchEvent(new CustomEvent("hydra:refresh-projects"));
  };
  window.addEventListener(eventName, acknowledge);
  return () => window.removeEventListener(eventName, acknowledge);
}

/** Settles `requestProjectsRefresh` as App's listener would after `catalog_get`. */
function acknowledgeProjectsRefresh() {
  const handler = (event: Event) => {
    const resolve = (event as CustomEvent<{ resolve?: (ok: boolean) => void }>).detail
      ?.resolve;
    resolve?.(true);
  };
  window.addEventListener("hydra:refresh-projects", handler);
  return () => window.removeEventListener("hydra:refresh-projects", handler);
}

function captureOptimisticIcons(): { events: CustomEvent[]; stop: () => void } {
  const events: CustomEvent[] = [];
  const capture = (event: Event) => events.push(event as CustomEvent);
  window.addEventListener(PROJECT_ICON_OPTIMISTIC_EVENT, capture);
  return {
    events,
    stop: () => window.removeEventListener(PROJECT_ICON_OPTIMISTIC_EVENT, capture),
  };
}

describe("Repo header project menu (D03a-084)", () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
    // The failure test installs a rejecting implementation; every test starts
    // from the module mock's resolved default.
    vi.mocked(invoke).mockResolvedValue(null);
  });
  afterEach(() => resetStore());

  it("offers icon, non-Hydra visibility, move-to-group submenu and a separator before Remove Project", () => {
    const onOpenSettings = vi.fn();
    renderSidebar(onOpenSettings);

    openProjectMenu();

    // These projects sit on an SSH host, so the catalog write path is closed and
    // the entry keeps its reason instead of routing somewhere else.
    const changeIcon = screen.getByRole("button", { name: "Change Project Icon" });
    expect(changeIcon).toBeDisabled();
    expect(changeIcon).toHaveAttribute("title", REPO_ICON_REMOTE_DISABLED_REASON);
    expect(screen.getByRole("button", { name: "Hide non-Hydra worktrees" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New group from project" })).toBeInTheDocument();

    const moveTrigger = screen.getByRole("button", { name: "Move to group" });
    expect(moveTrigger).toHaveAttribute("aria-haspopup", "menu");
    fireEvent.click(moveTrigger);

    const currentGroup = screen.getByRole("menuitem", { name: "Marketplace" });
    expect(currentGroup).toBeDisabled();
    expect(screen.getByRole("menuitem", { name: "Platform" })).not.toBeDisabled();

    expect(screen.getByRole("separator")).toBeInTheDocument();
    const removeProject = screen.getByRole("button", { name: "Remove Project" });
    expect(removeProject.parentElement?.lastElementChild).toBe(removeProject);

    // No settings detour and no picker: an SSH project has no local row to write.
    fireEvent.click(changeIcon);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(onOpenSettings).not.toHaveBeenCalled();
  });

  it("writes a picked glyph through the catalog and echoes it optimistically", async () => {
    resetStoreToLocalRepos();
    const optimistic = captureOptimisticIcons();
    const settleRefresh = acknowledgeProjectsRefresh();
    renderSidebar();

    openProjectMenu();
    fireEvent.click(screen.getByRole("button", { name: "Change Project Icon" }));

    const picker = screen.getByRole("dialog", { name: "Project icon for hydra" });
    expect(picker).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Rocket" }));

    await waitFor(() =>
      expect(invoke).toHaveBeenCalledWith("catalog_set_repo_icon", {
        repoId: "a",
        repoIcon: { type: "emoji", emoji: "🚀" },
      })
    );
    // The optimistic echo reaches App before the authoritative refresh.
    expect(optimistic.events.map((event) => event.detail)).toEqual([
      { projectId: "repo_a", repoIcon: { type: "emoji", emoji: "🚀" } },
    ]);
    // The picker closes on confirm.
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => expect(toast.error).not.toHaveBeenCalled());

    optimistic.stop();
    settleRefresh();
  });

  it("clears the glyph through the same command", async () => {
    resetStoreToLocalRepos();
    const settleRefresh = acknowledgeProjectsRefresh();
    renderSidebar();

    openProjectMenu();
    fireEvent.click(screen.getByRole("button", { name: "Change Project Icon" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));

    await waitFor(() =>
      expect(invoke).toHaveBeenCalledWith("catalog_set_repo_icon", {
        repoId: "a",
        repoIcon: null,
      })
    );

    settleRefresh();
  });

  it("echoes the previous glyph back and toasts when the catalog write fails", async () => {
    resetStoreToLocalRepos();
    // The sidebar mounts other commands, so fail only the icon write.
    vi.mocked(invoke).mockImplementation((command: string) =>
      command === "catalog_set_repo_icon"
        ? Promise.reject(new Error("disk full"))
        : Promise.resolve(null)
    );
    const optimistic = captureOptimisticIcons();
    renderSidebar();

    openProjectMenu();
    fireEvent.click(screen.getByRole("button", { name: "Change Project Icon" }));
    fireEvent.click(screen.getByRole("button", { name: "Package" }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Could not change the project icon")
    );
    // Optimistic pick, then the rollback to the stored (absent) glyph.
    expect(optimistic.events.map((event) => event.detail)).toEqual([
      { projectId: "repo_a", repoIcon: { type: "emoji", emoji: "📦" } },
      { projectId: "repo_a", repoIcon: null },
    ]);

    optimistic.stop();
  });
});

describe("Project group menu (D03a-082 / D03a-087)", () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
  });
  afterEach(() => resetStore());

  it("routes rename to the group owner host and stops menu events at the menu surface", async () => {
    const onRowClick = vi.fn();
    renderSidebar();
    document.addEventListener("click", onRowClick);

    const events: CustomEvent[] = [];
    const capture = (event: Event) => events.push(event as CustomEvent);
    window.addEventListener("hydra:rename-project-group", capture);
    const acknowledge = acknowledgeNext("hydra:rename-project-group");

    openGroupMenu();
    fireEvent.click(screen.getByRole("button", { name: "Rename Group..." }));

    const input = screen.getByLabelText("Group Name");
    fireEvent.change(input, { target: { value: "Marketplace Dev" } });
    fireEvent.click(screen.getByRole("button", { name: "Rename" }));

    await waitFor(() => expect(events).toHaveLength(1));
    expect(events[0].detail).toEqual({
      id: "grp_dev",
      name: "Marketplace Dev",
      hostId: "ssh:srv",
    });
    expect(toast.error).not.toHaveBeenCalled();
    // The menu trigger never reaches the group header's collapse handler.
    expect(onRowClick).not.toHaveBeenCalled();

    acknowledge();
    window.removeEventListener("hydra:rename-project-group", capture);
    document.removeEventListener("click", onRowClick);
  });

  it("deletes the group with its contained projects and reports a missing acknowledgement", async () => {
    renderSidebar();

    const events: CustomEvent[] = [];
    const capture = (event: Event) => events.push(event as CustomEvent);
    window.addEventListener("hydra:delete-project-group", capture);

    openGroupMenu();
    fireEvent.click(screen.getByRole("button", { name: "Delete Group..." }));

    const checkbox = screen.getByRole("checkbox", {
      name: "Remove 2 contained projects",
    });
    fireEvent.click(checkbox);
    fireEvent.click(screen.getByRole("button", { name: "Delete Group" }));

    await waitFor(() => expect(events).toHaveLength(1));
    expect(events[0].detail).toEqual({
      id: "grp_dev",
      removeProjectPaths: ["/repo/a", "/repo/b"],
      hostId: "ssh:srv",
    });

    // No App listener acknowledged the delete in this test, so the UI reports it.
    expect(toast.error).toHaveBeenCalledWith(
      "Failed to delete group",
      expect.objectContaining({ description: expect.any(String) })
    );

    window.removeEventListener("hydra:delete-project-group", capture);
  });

  it("toasts when nothing acknowledges a rename", async () => {
    renderSidebar();

    openGroupMenu();
    fireEvent.click(screen.getByRole("button", { name: "Rename Group..." }));
    fireEvent.change(screen.getByLabelText("Group Name"), {
      target: { value: "Renamed" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Rename" }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to rename group",
        expect.objectContaining({ description: expect.any(String) })
      )
    );
  });
});
