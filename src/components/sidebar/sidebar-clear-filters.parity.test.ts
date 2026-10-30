// Orca `computeClearFilterActions` decides which sidebar filters Clear Filters must
// undo. Hydra had the pure plan ported but no caller, so the button always reset every
// option (and the host scope) even when only one filter narrowed the list.
import { describe, expect, it } from "vitest";
import { planSidebarClearFilters } from "./sidebar-filter-actions";
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
