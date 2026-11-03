import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "@/store";
import { DEFAULT_HYDRA_SETTINGS, type HydraSettings } from "@/shared/settings-types";
import type { Repo } from "@/shared/repo-types";
import { SidebarTaskNavButton } from "./SidebarTaskNavButton";

const GIT_REPO = {
  id: "repo_a",
  path: "/repo/a",
  displayName: "hydra",
  badgeColor: "#fff",
  addedAt: 1,
  kind: "git",
} as Repo;

const FOLDER_REPO = {
  id: "repo_b",
  path: "/folder/b",
  displayName: "notes",
  badgeColor: "#fff",
  addedAt: 1,
  kind: "folder",
} as Repo;

function settings(overrides: Partial<HydraSettings> = {}): HydraSettings {
  return { ...DEFAULT_HYDRA_SETTINGS, ...overrides };
}

function renderButton(overrides: Partial<HydraSettings> = {}) {
  const onUpdateSettings = vi.fn();
  const utils = render(
    <SidebarTaskNavButton settings={settings(overrides)} onUpdateSettings={onUpdateSettings} />
  );
  return { onUpdateSettings, ...utils };
}

describe("SidebarTaskNavButton (D01-018/D01-019)", () => {
  beforeEach(() => {
    useAppStore.setState({
      activeView: "terminal",
      repos: [FOLDER_REPO, GIT_REPO],
      activeRepoId: null,
      openTaskPage: vi.fn(),
      prefetchWorkItems: vi.fn(),
    });
  });

  afterEach(() => {
    useAppStore.setState({ activeView: "terminal", repos: [], activeRepoId: null });
  });

  it("opens the task page and is available with zero repositories", () => {
    useAppStore.setState({ repos: [] });
    renderButton();

    fireEvent.click(screen.getByRole("button", { name: "Tasks" }));

    expect(useAppStore.getState().openTaskPage).toHaveBeenCalledWith();
  });

  it("prefetches the first git repo on pointer enter and focus, skipping folder repos", () => {
    renderButton();

    const tasks = screen.getByRole("button", { name: "Tasks" });
    fireEvent.pointerEnter(tasks);
    fireEvent.focus(tasks);

    const prefetch = vi.mocked(useAppStore.getState().prefetchWorkItems);
    expect(prefetch).toHaveBeenCalledTimes(2);
    expect(prefetch).toHaveBeenCalledWith(GIT_REPO.id, GIT_REPO.path, 36, "");
  });

  it("exposes provider shortcuts and opens the task page filtered by source", async () => {
    renderButton();

    expect(screen.getByRole("button", { name: "Open GitHub tasks" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open Jira tasks" })).toBeInTheDocument();
    // GitLab/Linear stay hidden: no preflight surface proves them available.
    expect(screen.queryByRole("button", { name: "Open GitLab tasks" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Open Linear tasks" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Open Jira tasks" }));
    expect(useAppStore.getState().openTaskPage).toHaveBeenCalledWith({ taskSource: "jira" });
  });

  it("hides the entry through the context menu settings writer", async () => {
    const { onUpdateSettings } = renderButton();

    fireEvent.contextMenu(screen.getByRole("button", { name: "Tasks" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Hide from sidebar" }));

    expect(onUpdateSettings).toHaveBeenCalledWith({ showTasksButton: false });
  });

  it("renders nothing when the setting is off", () => {
    renderButton({ showTasksButton: false });
    expect(screen.queryByRole("button", { name: "Tasks" })).toBeNull();
  });
});
