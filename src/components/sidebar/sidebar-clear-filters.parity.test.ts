// Orca `computeClearFilterActions` decides which sidebar filters Clear Filters must
// undo. Hydra had the pure plan ported but no caller, so the button always reset every
// option (and the host scope) even when only one filter narrowed the list.
import { describe, expect, it } from "vitest";
import {
  planSidebarClearFilters,
  shouldShowOtherClientFilter,
  sidebarHasActiveFilters,
  toSidebarFilterState,
} from "./sidebar-filter-actions";
import type { WorkspaceDisplayOptions } from "./WorkspaceOptionsMenu";

const OPTIONS: WorkspaceDisplayOptions = {
  groupBy: "repo",
  sortBy: "agent-activity",
  hideSleeping: false,
  hideDefaultBranch: false,
  hideAutomationCreated: false,
  hideCliCreated: false,
  hideDetachedHead: false,
  alwaysShowDefaultBranch: true,
};

const ALL_HOSTS = { visibleWorkspaceHostIds: null, workspaceHostScope: "all" } as const;

describe("planSidebarClearFilters", () => {
  it("changes nothing when no filter is narrowing the list", () => {
    const plan = planSidebarClearFilters(OPTIONS, ALL_HOSTS);
    expect(plan.changed).toBe(false);
    expect(plan.displayOptions).toBe(OPTIONS);
    expect(plan.resetHostScope).toBe(false);
  });

  it("resets only the option that is set", () => {
    const plan = planSidebarClearFilters(
      { ...OPTIONS, hideDetachedHead: true, hideSleeping: true },
      ALL_HOSTS
    );
    expect(plan.changed).toBe(true);
    expect(plan.displayOptions).toEqual({
      ...OPTIONS,
      hideDetachedHead: false,
      hideSleeping: false,
    });
  });

  it("restores the default-branch exemption when it was turned off", () => {
    const plan = planSidebarClearFilters({ ...OPTIONS, alwaysShowDefaultBranch: false }, ALL_HOSTS);
    expect(plan.displayOptions.alwaysShowDefaultBranch).toBe(true);
  });

  it("clears the host scope only when a host filter is active", () => {
    expect(planSidebarClearFilters(OPTIONS, ALL_HOSTS).resetHostScope).toBe(false);
    expect(
      planSidebarClearFilters(OPTIONS, {
        visibleWorkspaceHostIds: ["ssh:srv"],
        workspaceHostScope: "ssh:srv",
      }).resetHostScope
    ).toBe(true);
  });
});

// D09-017 / D09-019: the other-client gate and the ONE filter-state projection.
describe("shouldShowOtherClientFilter (Orca SidebarWorkspaceFilterSection)", () => {
  it("stays visible until the runtime-environment catalog hydrates", () => {
    expect(
      shouldShowOtherClientFilter({
        runtimeEnvironmentCatalogHydrated: false,
        runtimeEnvironmentCount: 0,
        hideWorkspacesFromOtherDevices: false,
      })
    ).toBe(true);
  });

  it("hides itself once hydration proves no other client exists", () => {
    expect(
      shouldShowOtherClientFilter({
        runtimeEnvironmentCatalogHydrated: true,
        runtimeEnvironmentCount: 0,
        hideWorkspacesFromOtherDevices: false,
      })
    ).toBe(false);
  });

  it("stays visible with paired environments or while its sweep is applied", () => {
    expect(
      shouldShowOtherClientFilter({
        runtimeEnvironmentCatalogHydrated: true,
        runtimeEnvironmentCount: 2,
        hideWorkspacesFromOtherDevices: false,
      })
    ).toBe(true);
    expect(
      shouldShowOtherClientFilter({
        runtimeEnvironmentCatalogHydrated: true,
        runtimeEnvironmentCount: 0,
        hideWorkspacesFromOtherDevices: true,
      })
    ).toBe(true);
  });
});

describe("toSidebarFilterState", () => {
  it("projects every narrowing option, including the ones the old readers dropped", () => {
    const state = toSidebarFilterState(
      {
        ...OPTIONS,
        hideSleeping: true,
        hideWorkspacesFromOtherDevices: true,
        alwaysShowDefaultBranch: false,
        filterProjectIds: ["repo_a"],
      },
      { visibleWorkspaceHostIds: ["ssh:srv"], workspaceHostScope: "ssh:srv" }
    );
    expect(state).toEqual({
      showSleepingWorkspaces: false,
      filterRepoIds: ["repo_a"],
      hideDefaultBranchWorkspace: false,
      hideAutomationGeneratedWorkspaces: false,
      hideCliCreatedWorkspaces: false,
      hideDetachedHeadWorkspaces: false,
      hideWorkspacesFromOtherDevices: true,
      alwaysShowDefaultBranchWorkspace: false,
      visibleWorkspaceHostIds: ["ssh:srv"],
      workspaceHostScope: "ssh:srv",
    });
    expect(sidebarHasActiveFilters(state)).toBe(true);
  });

  it("counts a host-scope-only narrowing as active and none of the defaults", () => {
    const idle = toSidebarFilterState(OPTIONS, ALL_HOSTS);
    expect(sidebarHasActiveFilters(idle)).toBe(false);
    expect(
      sidebarHasActiveFilters({
        ...idle,
        visibleWorkspaceHostIds: ["local"],
      })
    ).toBe(true);
    expect(
      sidebarHasActiveFilters({ ...idle, workspaceHostScope: "ssh:srv" })
    ).toBe(true);
  });

  it("treats the default-branch exemption being off as a filter", () => {
    const idle = toSidebarFilterState(OPTIONS, ALL_HOSTS);
    expect(sidebarHasActiveFilters({ ...idle, alwaysShowDefaultBranchWorkspace: false })).toBe(
      true
    );
  });

  it("makes Clear Filters reset the other-client sweep too", () => {
    const plan = planSidebarClearFilters(
      { ...OPTIONS, hideWorkspacesFromOtherDevices: true },
      ALL_HOSTS
    );
    expect(plan.displayOptions.hideWorkspacesFromOtherDevices).toBe(false);
  });
});
