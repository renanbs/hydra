import { describe, expect, it } from "vitest";
import { isRevealTargetHiddenByFilters } from "./reveal-hidden-filters";
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

const TRAITS = {
  projectId: "repo_a",
  isMainWorktree: false,
  automationCreated: false,
  cliCreated: false,
  detachedHead: false,
  hostVisible: true,
  sleepingHidden: false,
};

describe("isRevealTargetHiddenByFilters", () => {
  it("is false with no narrowing filter", () => {
    expect(isRevealTargetHiddenByFilters(OPTIONS, TRAITS)).toBe(false);
  });

  it("detects the project filter excluding the target", () => {
    expect(
      isRevealTargetHiddenByFilters({ ...OPTIONS, filterProjectIds: ["repo_b"] }, TRAITS)
    ).toBe(true);
    expect(
      isRevealTargetHiddenByFilters({ ...OPTIONS, filterProjectIds: ["repo_a"] }, TRAITS)
    ).toBe(false);
  });

  it("detects kind filters and the host scope", () => {
    expect(isRevealTargetHiddenByFilters({ ...OPTIONS, hideCliCreated: true }, { ...TRAITS, cliCreated: true })).toBe(true);
    expect(isRevealTargetHiddenByFilters({ ...OPTIONS, hideDetachedHead: true }, { ...TRAITS, detachedHead: true })).toBe(true);
    expect(isRevealTargetHiddenByFilters(OPTIONS, { ...TRAITS, hostVisible: false })).toBe(true);
  });

  it("detects the sleeping sweep only when the target is inactive", () => {
    expect(
      isRevealTargetHiddenByFilters({ ...OPTIONS, hideSleeping: true }, { ...TRAITS, sleepingHidden: true })
    ).toBe(true);
    expect(
      isRevealTargetHiddenByFilters({ ...OPTIONS, hideSleeping: true }, TRAITS)
    ).toBe(false);
  });
});
