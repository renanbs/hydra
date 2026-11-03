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
    runtimeEnvironmentCatalogHydrated: false,
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

  it("resets filters through the shell writer and opens Add project from the footer", () => {
    const onClearFilters = vi.fn();
    const onAddProject = vi.fn();
    renderMenu({
      onClearFilters,
      onAddProject,
      options: {
        ...OPTIONS,
        hideSleeping: true,
        hideCliCreated: true,
        alwaysShowDefaultBranch: true,
        filterProjectIds: ["repo_a"],
      },
    });

    // D09-020: the footer runs the SAME `computeClearFilterActions` plan the shell
    // owns, so the menu never forks the reset logic into a second writer.
    fireEvent.click(screen.getByText("Reset filters"));
    expect(onClearFilters).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText("+ Add project"));
    expect(onAddProject).toHaveBeenCalledTimes(1);
  });

  it("falls back to the shared clear plan when no shell writer is supplied", () => {
    const onOptionsChange = vi.fn();
    renderMenu({
      onOptionsChange,
      options: {
        ...OPTIONS,
        hideSleeping: true,
        alwaysShowDefaultBranch: true,
        filterProjectIds: ["repo_a"],
      },
    });

    fireEvent.click(screen.getByText("Reset filters"));
    expect(onOptionsChange).toHaveBeenCalledWith({
      ...OPTIONS,
      hideSleeping: false,
      alwaysShowDefaultBranch: true,
      filterProjectIds: [],
    });
  });

  it("moves the project highlight with the arrows and toggles it on Enter", () => {
    const onOptionsChange = vi.fn();
    const { container } = renderMenu({ onOptionsChange });

    fireEvent.click(screen.getByText("Projects"));
    const input = screen.getByPlaceholderText("Filter projects...");
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

describe("WorkspaceOptionsMenu grouping and filters (D09-011/017)", () => {
  beforeEach(() => seedStore());
  afterEach(() => {
    useAppStore.setState({ visibleWorkspaceHostIds: null, workspaceHostScope: "all" });
  });

  it("offers exactly Orca's grouping modes with a pressed state", () => {
    const { container } = renderMenu();
    const values = [...container.querySelectorAll("[data-group-by-option]")].map((node) =>
      node.getAttribute("data-group-by-option")
    );
    expect(values).toEqual(["none", "workspace-status", "pr-status", "repo"]);
    expect(
      container
        .querySelector('[data-group-by-option="repo"]')
        ?.getAttribute("aria-pressed")
    ).toBe("true");
  });

  it("commits the pointer-down intent before focus can swallow the click", () => {
    const onOptionsChange = vi.fn();
    const { container } = renderMenu({ onOptionsChange });
    const prOption = container.querySelector(
      '[data-group-by-option="pr-status"]'
    ) as HTMLElement;

    // Pointerdown alone commits (Orca SidebarGroupByToggle); the click is a no-op.
    fireEvent.pointerDown(prOption);
    expect(onOptionsChange).toHaveBeenCalledWith({ ...OPTIONS, groupBy: "pr-status" });
    onOptionsChange.mockClear();
    // A real pointer click carries a click count; only that form is swallowed.
    fireEvent.click(prOption, { detail: 1 });
    expect(onOptionsChange).not.toHaveBeenCalled();
  });

  it("commits a keyboard activation through the click", () => {
    const onOptionsChange = vi.fn();
    const { container } = renderMenu({ onOptionsChange });
    const prOption = container.querySelector(
      '[data-group-by-option="pr-status"]'
    ) as HTMLElement;
    // detail 0 is the DOM's marker for a keyboard-triggered click.
    fireEvent.click(prOption, { detail: 0 });
    expect(onOptionsChange).toHaveBeenCalledWith({ ...OPTIONS, groupBy: "pr-status" });
  });

  it("hides the other-client toggle only after hydration proves no other client", () => {
    seedStore({ runtimeEnvironmentCatalogHydrated: true, runtimeEnvironments: [] });
    renderMenu();
    expect(screen.queryByRole("switch", { name: /other Hydra clients/i })).toBeNull();
  });

  it("keeps the other-client toggle while its sweep is applied", () => {
    seedStore({ runtimeEnvironmentCatalogHydrated: true, runtimeEnvironments: [] });
    renderMenu({ options: { ...OPTIONS, hideWorkspacesFromOtherDevices: true } });
    expect(
      screen.getByRole("switch", { name: /other Hydra clients/i })
    ).toHaveAttribute("aria-checked", "true");
  });

  it("shows the other-client toggle before the catalog hydrates", () => {
    renderMenu();
    expect(
      screen.getByRole("switch", { name: /other Hydra clients/i })
    ).toHaveAttribute("aria-checked", "false");
  });

  it("persists the other-client toggle through the options writer", () => {
    const onOptionsChange = vi.fn();
    renderMenu({ onOptionsChange });
    fireEvent.click(screen.getByRole("switch", { name: /other Hydra clients/i }));
    expect(onOptionsChange).toHaveBeenCalledWith({
      ...OPTIONS,
      hideWorkspacesFromOtherDevices: true,
    });
  });
});

describe("WorkspaceOptionsMenu display controls (Orca parity)", () => {
  beforeEach(() => {
    seedStore({
      worktreeCardProperties: ["status", "pr"],
      setWorktreeCardProperties: vi.fn(),
      agentActivityDisplayMode: "compact",
      setAgentActivityDisplayMode: vi.fn(),
      projectGroups: [],
      settings: { compact_worktree_cards: false },
    });
  });
  afterEach(() => {
    useAppStore.setState({ visibleWorkspaceHostIds: null, workspaceHostScope: "all" });
  });

  it("keeps the workspace board open from the menu and its submenus", () => {
    renderMenu({ options: { ...OPTIONS, groupBy: "repo" } });
    expect(document.querySelector("[data-workspace-board-preserve-open]")).not.toBeNull();

    fireEvent.click(screen.getByText("Sort by"));
    expect(document.querySelector('[data-sort-by-option="manual"]')).not.toBeNull();
    fireEvent.click(screen.getByText("Project order"));
    expect(document.querySelector('[data-project-order-option="recent"]')).not.toBeNull();
  });

  it("exposes the four group-by modes with Orca identifiers", () => {
    renderMenu();
    expect(document.querySelector('[data-group-by-option="none"]')).toHaveAttribute(
      "data-option-id",
      "c2c7a45cda"
    );
    expect(document.querySelector('[data-group-by-option="pr-status"]')).toHaveTextContent("PR");
    expect(document.querySelector('[data-group-by-option="repo"]')).toHaveAttribute(
      "data-option-id",
      "2170d553cf"
    );
  });

  it("keeps the Sort submenu open while choosing a mode", () => {
    const onOptionsChange = vi.fn();
    renderMenu({ onOptionsChange });
    fireEvent.click(screen.getByText("Sort by"));
    fireEvent.click(document.querySelector('[data-sort-by-option="repo"]') as HTMLElement);
    expect(onOptionsChange).toHaveBeenCalledWith({ ...OPTIONS, sortBy: "repo" });
    // The panel is still mounted, so the remaining modes stay clickable.
    expect(document.querySelector('[data-sort-by-option="manual"]')).not.toBeNull();
  });

  it("writes the card layout preset and agent activity mode", () => {
    const onUpdateSettings = vi.fn();
    renderMenu({ onUpdateSettings });
    fireEvent.click(screen.getByText("Card display"));
    fireEvent.click(
      document.querySelector('[data-card-layout-option="compact"]') as HTMLElement
    );
    expect(onUpdateSettings).toHaveBeenCalledWith({ compact_worktree_cards: true });
    expect(screen.getByText("Agent activity layout")).toBeInTheDocument();
    fireEvent.click(
      document.querySelector('[data-agent-activity-option="full"]') as HTMLElement
    );
    expect(useAppStore.getState().setAgentActivityDisplayMode).toHaveBeenCalledWith("full");
  });
});
