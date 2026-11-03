import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "@/store";
import { DEFAULT_HYDRA_SETTINGS, type HydraSettings } from "@/shared/settings-types";
import type { Repo } from "@/shared/repo-types";
import type { PreflightToolsStatus } from "@/shared/preflight-tools-status";
import {
  resolveSidebarTaskProviderAvailability,
  resolveVisibleSidebarTaskProviders,
  SidebarTaskNavButton,
} from "./SidebarTaskNavButton";
import { getProviderRuntimeContextKey } from "@/lib/provider-runtime-context";

const preflightStatusRef = vi.hoisted(() => ({
  current: null as PreflightToolsStatus | null,
}));

vi.mock("@/hooks/usePreflightToolsStatus", () => ({
  usePreflightToolsStatus: () => ({ status: preflightStatusRef.current, loading: false }),
}));

function preflightStatus(overrides: Partial<PreflightToolsStatus> = {}): PreflightToolsStatus {
  return {
    git_installed: true,
    gh_installed: true,
    gh_authenticated: true,
    glab_installed: false,
    glab_authenticated: false,
    ...overrides,
  };
}

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

describe("SidebarTaskNavButton (D01-018/D01-019/D01-020)", () => {
  beforeEach(() => {
    preflightStatusRef.current = null;
    useAppStore.setState({
      activeView: "terminal",
      repos: [FOLDER_REPO, GIT_REPO],
      activeRepoId: null,
      openTaskPage: vi.fn(),
      prefetchWorkItems: vi.fn(),
    });
  });

  afterEach(() => {
    useAppStore.setState({
      activeView: "terminal",
      repos: [],
      activeRepoId: null,
      settings: null,
      linearStatus: null,
      linearStatusContextKey: null,
    });
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
    // GitLab/Linear stay hidden while no probe/connection proves them available.
    expect(screen.queryByRole("button", { name: "Open GitLab tasks" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Open Linear tasks" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Open Jira tasks" }));
    expect(useAppStore.getState().openTaskPage).toHaveBeenCalledWith({ taskSource: "jira" });
  });

  it("shows the GitLab shortcut only when the glab preflight probe reports it installed", () => {
    renderButton();
    expect(screen.queryByRole("button", { name: "Open GitLab tasks" })).toBeNull();

    preflightStatusRef.current = preflightStatus({ glab_installed: true });
    render(<SidebarTaskNavButton settings={settings()} />);

    fireEvent.click(screen.getAllByRole("button", { name: "Open GitLab tasks" })[0]);
    expect(useAppStore.getState().openTaskPage).toHaveBeenCalledWith({ taskSource: "gitlab" });
  });

  it("restores a GitLab default only after the glab probe confirms availability", () => {
    const value = settings({ defaultTaskSource: "gitlab" });

    expect(
      resolveVisibleSidebarTaskProviders(
        value,
        resolveSidebarTaskProviderAvailability({ gitlabInstalled: false })
      ).resolvedDefaultTaskSource
    ).toBe("github");

    const available = resolveVisibleSidebarTaskProviders(
      value,
      resolveSidebarTaskProviderAvailability({ gitlabInstalled: true })
    );
    expect(available.visibleTaskProviders).toContain("gitlab");
    expect(available.resolvedDefaultTaskSource).toBe("gitlab");
  });

  it("shows the Linear shortcut only for the connected runtime context", () => {
    const value = settings();
    useAppStore.setState({
      settings: value,
      linearStatus: { connected: true, viewer: null },
      linearStatusContextKey: getProviderRuntimeContextKey(value)
    });

    render(<SidebarTaskNavButton settings={value} />);

    expect(screen.getByRole("button", { name: "Open Linear tasks" })).toBeInTheDocument();
    // GitLab still has no probe (`glab`), so it stays hidden.
    expect(screen.queryByRole("button", { name: "Open GitLab tasks" })).toBeNull();
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
