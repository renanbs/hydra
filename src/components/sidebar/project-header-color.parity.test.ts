import { describe, expect, it } from "vitest";
import { DEFAULT_REPO_BADGE_COLOR, REPO_COLORS } from "../../shared/constants";
import {
  resolveProjectGroupHeaderColor,
  resolveRepoHeaderColor,
} from "./project-header-color";

describe("project header color (Orca parity)", () => {
  it("normalizes palette, custom hex, case and whitespace", () => {
    expect(resolveRepoHeaderColor(REPO_COLORS[3])).toBe(REPO_COLORS[3]);
    expect(resolveRepoHeaderColor(`  ${REPO_COLORS[4].toUpperCase()}  `)).toBe(
      REPO_COLORS[4]
    );
    expect(resolveRepoHeaderColor(" #123ABC ")).toBe("#123abc");
  });

  it("falls back to the default for absent or invalid colors", () => {
    expect(resolveRepoHeaderColor(null)).toBe(DEFAULT_REPO_BADGE_COLOR);
    expect(resolveRepoHeaderColor("blue")).toBe(DEFAULT_REPO_BADGE_COLOR);
  });

  it("only inherits project colors for project/repo headers in repo grouping", () => {
    expect(
      resolveProjectGroupHeaderColor({
        groupBy: "repo",
        headerKey: "repo:grp_1",
        color: REPO_COLORS[2],
      })
    ).toBe(REPO_COLORS[2]);
    expect(
      resolveProjectGroupHeaderColor({
        groupBy: "repo",
        headerKey: "project:proj_1",
        color: REPO_COLORS[2],
      })
    ).toBe(REPO_COLORS[2]);
    expect(
      resolveProjectGroupHeaderColor({
        groupBy: "workspace-status",
        headerKey: "repo:grp_1",
        color: REPO_COLORS[2],
      })
    ).toBeUndefined();
    expect(
      resolveProjectGroupHeaderColor({
        groupBy: "repo",
        headerKey: "pinned",
        color: REPO_COLORS[2],
      })
    ).toBeUndefined();
  });
});
