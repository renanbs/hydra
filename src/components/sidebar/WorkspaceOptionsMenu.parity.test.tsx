import type React from "react";
// Parity guard for the multi-host scope submenu. Orca renders it from
// `buildSidebarHostScopeOptions` inside the Workspace options "Show" section
// (`SidebarHostScopeMenuSection.tsx`), with one hard rule: the LAST visible host
// cannot be unchecked — a sidebar scoped to zero hosts paints nothing and offers
// no way back. Hydra had the ported builders (`sidebar-host-options.ts`) with zero
// consumers, so this submenu did not exist at all.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useAppStore } from "@/store";
import {
  WorkspaceOptionsMenu,
  countActiveWorkspaceFilters,
  toggleWorkspaceHostVisibility,
  type WorkspaceDisplayOptions,
} from "./WorkspaceOptionsMenu";
import type { HydraProject } from "./types";

const OPTIONS: WorkspaceDisplayOptions = {
  groupBy: "repo",
  sortBy: "agent-activity",
  hideSleeping: false,
  hideDefaultBranch: false,
  hideAutomationCreated: false,
  hideCliCreated: false,
  hideDetachedHead: false,
  alwaysShowDefaultBranch: false,
};

const PROJECTS: HydraProject[] = [
  { id: "repo_a", name: "hydra", path: "/repo/hydra", is_git: true, current_branch: "main" },
  { id: "repo_b", name: "orca", path: "/repo/orca", is_git: true, current_branch: "main" },
];

const TWO_HOST_REPOS = [
  { id: "repo_a", connectionId: null, executionHostId: "local" },
  { id: "repo_b", connectionId: "srv", executionHostId: "ssh:srv" },
];

function seedStore(overrides: Record<string, unknown> = {}) {
  // The live store now owns the real setters (no `window.api` bridge), so the
  // submenu renders without an action guard and mutates the store directly.
  useAppStore.setState({
    repos: TWO_HOST_REPOS,
    sshTargetLabels: new Map([["srv", "Build server"]]),
    sshConnectionStates: new Map(),
    runtimeEnvironments: [],
    settings: null,
    visibleWorkspaceHostIds: null,
    workspaceHostScope: "all",
    ...overrides,
  });
}

function renderMenu(overrides: Partial<React.ComponentProps<typeof WorkspaceOptionsMenu>> = {}) {
  return render(
    <WorkspaceOptionsMenu
      isOpen
      triggerRef={{ current: document.createElement("button") }}
      options={OPTIONS}
      projects={PROJECTS}
      onClose={vi.fn()}
      onOptionsChange={vi.fn()}
      {...overrides}
    />
  );
}

describe("WorkspaceOptionsMenu host scope (Orca parity)", () => {
  beforeEach(() => seedStore());
  afterEach(() => {
    useAppStore.setState({ visibleWorkspaceHostIds: null, workspaceHostScope: "all" });
  });

  it("refuses to uncheck the last visible host", () => {
    const result = toggleWorkspaceHostVisibility({
      visibleWorkspaceHostIds: ["local"],
      hostIds: ["local", "ssh:srv"],
      hostId: "local",
    });
    expect(result.changed).toBe(false);
    expect(result.visibleWorkspaceHostIds).toEqual(["local"]);
  });

  it("narrows 'all hosts' to the clicked host and back to all", () => {
    const narrowed = toggleWorkspaceHostVisibility({
      visibleWorkspaceHostIds: null,
      hostIds: ["local", "ssh:srv"],
      hostId: "ssh:srv",
    });
    expect(narrowed.visibleWorkspaceHostIds).toEqual(["ssh:srv"]);

    const backToAll = toggleWorkspaceHostVisibility({
      visibleWorkspaceHostIds: ["local"],
      hostIds: ["local", "ssh:srv"],
      hostId: "ssh:srv",
    });
    expect(backToAll.visibleWorkspaceHostIds).toBeNull();
  });

  it("renders the Hosts submenu with every host when more than one is known", () => {
    const { container } = renderMenu();

    const hostsRow = screen.getByText("Hosts");
    fireEvent.click(hostsRow);

    expect(container.querySelector('[data-host-scope-option="all"]')).not.toBeNull();
    expect(container.querySelector('[data-host-scope-option="local"]')).not.toBeNull();
    expect(container.querySelector('[data-host-scope-option="ssh:srv"]')).not.toBeNull();
  });

  it("hides the Hosts submenu when only the local host exists", () => {
    seedStore({ repos: [{ id: "repo_a", connectionId: null, executionHostId: "local" }], sshTargetLabels: new Map() });
    renderMenu();
    expect(screen.queryByText("Hosts")).toBeNull();
  });

  it("disables the last visible host's checkbox", () => {
    seedStore({ visibleWorkspaceHostIds: ["local"] });
    const { container } = renderMenu();

    fireEvent.click(screen.getByText("Hosts"));

    const localOption = container.querySelector('[data-host-scope-option="local"]');
    expect(localOption).toHaveAttribute("aria-disabled", "true");
    expect(localOption).toBeDisabled();

    fireEvent.click(localOption!);
    expect(useAppStore.getState().visibleWorkspaceHostIds).toEqual(["local"]);
  });

  it("narrows to a single host through the real store setter", () => {
    const { container } = renderMenu();

    fireEvent.click(screen.getByText("Hosts"));
    fireEvent.click(container.querySelector('[data-host-scope-option="ssh:srv"]')!);

    expect(useAppStore.getState().visibleWorkspaceHostIds).toEqual(["ssh:srv"]);
    expect(useAppStore.getState().workspaceHostScope).toBe("ssh:srv");
  });

  it("expands a single host back to all hosts", () => {
    seedStore({ visibleWorkspaceHostIds: ["local"] });
    const { container } = renderMenu();

    fireEvent.click(screen.getByText("Hosts"));
    fireEvent.click(container.querySelector('[data-host-scope-option="ssh:srv"]')!);

    expect(useAppStore.getState().visibleWorkspaceHostIds).toBeNull();
    expect(useAppStore.getState().workspaceHostScope).toBe("all");
  });
});


describe("WorkspaceOptionsMenu filter rows (Orca parity)", () => {
  beforeEach(() => seedStore());

  it("renders the shared switch row with the registry shortcut badge", () => {
    renderMenu();
    const row = screen.getByRole("switch", { name: /Hide sleeping/i });
    expect(row).toHaveAttribute("aria-checked", "false");
  });

  it("only offers the default-branch exception while Hide sleeping is on", () => {
    const onOptionsChange = vi.fn();
    renderMenu({ onOptionsChange });

    expect(screen.queryByRole("switch", { name: /Except default branch/i })).toBeNull();
    fireEvent.click(screen.getByRole("switch", { name: /Hide sleeping/i }));
    expect(onOptionsChange).toHaveBeenCalledWith({ ...OPTIONS, hideSleeping: true });
  });

  it("clears every filter and opens Add project from the footer", () => {
    const onOptionsChange = vi.fn();
    const onAddProject = vi.fn();
    renderMenu({
      onOptionsChange,
      onAddProject,
      options: {
        ...OPTIONS,
        hideSleeping: true,
        hideCliCreated: true,
        alwaysShowDefaultBranch: true,
        filterProjectIds: ["repo_a"],
      },
    });

    fireEvent.click(screen.getByText("Clear filters"));
    expect(onOptionsChange).toHaveBeenCalledWith({
      ...OPTIONS,
      hideSleeping: false,
      hideDefaultBranch: false,
      hideAutomationCreated: false,
      hideCliCreated: false,
      hideDetachedHead: false,
      alwaysShowDefaultBranch: false,
      filterProjectIds: [],
    });

    fireEvent.click(screen.getByText("+ Add project"));
    expect(onAddProject).toHaveBeenCalledTimes(1);
  });

  it("moves the project highlight with the arrows and toggles it on Enter", () => {
    const onOptionsChange = vi.fn();
    const { container } = renderMenu({ onOptionsChange });

    fireEvent.click(screen.getByText("Projects"));
    const input = screen.getByPlaceholderText("Add project...");
    fireEvent.keyDown(input, { key: "ArrowDown" });

    expect(container.querySelector('[data-active-project="true"]')?.textContent).toContain("orca");

    fireEvent.keyDown(input, { key: "Enter" });
    expect(onOptionsChange).toHaveBeenCalledWith(
      expect.objectContaining({ filterProjectIds: ["repo_b"] })
    );
  });

  it("counts active filters for the trigger badge", () => {
    expect(countActiveWorkspaceFilters(OPTIONS)).toBe(0);
    expect(
      countActiveWorkspaceFilters({
        ...OPTIONS,
        hideSleeping: true,
        hideDetachedHead: true,
        filterProjectIds: ["repo_a"],
      })
    ).toBe(4);
  });
});


describe("WorkspaceOptionsMenu project filter quick wins (D09)", () => {
  beforeEach(() => seedStore());

  it("selects every project and clears the selection", () => {
    const onOptionsChange = vi.fn();
    renderMenu({ onOptionsChange });
    fireEvent.click(screen.getByText("Projects"));

    fireEvent.click(screen.getByRole("button", { name: "Select all" }));
    expect(onOptionsChange).toHaveBeenCalledWith(
      expect.objectContaining({ filterProjectIds: ["repo_a", "repo_b"] })
    );
  });

  it("clears an existing project selection", () => {
    const onOptionsChange = vi.fn();
    renderMenu({
      onOptionsChange,
      options: { ...OPTIONS, filterProjectIds: ["repo_a"] },
    });
    fireEvent.click(screen.getByText("Projects"));
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(onOptionsChange).toHaveBeenCalledWith(
      expect.objectContaining({ filterProjectIds: [] })
    );
  });

  it("removes the last selected project with Backspace on an empty query", () => {
    const onOptionsChange = vi.fn();
    renderMenu({
      onOptionsChange,
      options: { ...OPTIONS, filterProjectIds: ["repo_a", "repo_b"] },
    });
    fireEvent.click(screen.getByText("Projects"));

    const input = screen.getByPlaceholderText("Add project...");
    fireEvent.keyDown(input, { key: "Backspace" });
    expect(onOptionsChange).toHaveBeenCalledWith(
      expect.objectContaining({ filterProjectIds: ["repo_a"] })
    );
  });

  it("hides the Projects filter row when there is nothing to filter", () => {
    renderMenu({ projects: [PROJECTS[0]!] });
    expect(screen.queryByText("Projects")).toBeNull();
  });
});

describe("WorkspaceOptionsMenu project order (Orca parity)", () => {
  beforeEach(() => seedStore());
  afterEach(() => {
    useAppStore.setState({ visibleWorkspaceHostIds: null, workspaceHostScope: "all" });
  });

  it("offers Manual and Recent and persists the clicked choice", () => {
    const onOptionsChange = vi.fn();
    renderMenu({ options: { ...OPTIONS, groupBy: "repo" }, onOptionsChange });

    fireEvent.click(screen.getByText("Project order"));
    fireEvent.click(screen.getByText("Recent"));

    expect(onOptionsChange).toHaveBeenCalledWith({ ...OPTIONS, groupBy: "repo", projectsOrder: "recent" });
  });

  it("marks the current project order in the submenu label and hint", () => {
    renderMenu({ options: { ...OPTIONS, groupBy: "repo", projectsOrder: "recent" } });

    expect(screen.getByText("Recent")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Project order"));
    expect(screen.getAllByText("Most recent workspace activity").length).toBeGreaterThan(0);
  });
});
