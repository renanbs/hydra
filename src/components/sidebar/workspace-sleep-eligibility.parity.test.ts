import { describe, expect, it } from "vitest";
import {
  buildHydraSleepActivityMaps,
  getSleepableWorktrees,
  getWorkspaceSleepLineage,
  getWorkspaceSleepMenuState,
  hasSleepableWorkspaceActivity,
} from "./workspace-sleep-eligibility";

const activity = buildHydraSleepActivityMaps({
  sessions: [
    { id: "s1", project_path: "/w/a", state: "working" },
    { id: "s2", project_path: "/w/b", state: "idle" },
  ],
  tabs: [{ id: "t1", cwd: "/w/a", sessionId: "s1" }],
  browserTabsByWorktree: { "/w/c": [{ id: "b1" }] },
});

describe("workspace sleep eligibility (Orca parity)", () => {
  it("requires a live PTY or a browser tab", () => {
    expect(hasSleepableWorkspaceActivity("/w/a", activity)).toBe(true);
    expect(hasSleepableWorkspaceActivity("/w/c", activity)).toBe(true);
    // An idle session record is the residue of a previous sleep, not activity.
    expect(hasSleepableWorkspaceActivity("/w/b", activity)).toBe(false);
    expect(hasSleepableWorkspaceActivity("/w/missing", activity)).toBe(false);
  });

  it("filters a multi-selection down to sleepable rows", () => {
    expect(
      getSleepableWorktrees([{ id: "/w/a" }, { id: "/w/b" }], activity).map((row) => row.id)
    ).toEqual(["/w/a"]);
  });

  it("walks the whole descendant subtree, not one level", () => {
    const rows = [
      { id: "/w/a", path: "/w/a" },
      { id: "/w/b", path: "/w/b" },
      { id: "/w/c", path: "/w/c" },
    ];
    const lineage = getWorkspaceSleepLineage(
      rows[0],
      rows,
      { "/w/b": "/w/a", "/w/c": "/w/b" },
      activity
    );
    expect(lineage.descendants.map((row) => row.id)).toEqual(["/w/b", "/w/c"]);
  });

  it("disables Sleep when nothing is sleepable and hides the subtree row for multi", () => {
    const state = getWorkspaceSleepMenuState({
      isMultiContext: false,
      activeContextWorktrees: [{ id: "/w/b" }],
      lineageDescendantCount: 0,
      sleepableTargets: [{ id: "/w/b" }],
      activity,
    });
    expect(state.sleepDisabled).toBe(true);
    expect(state.subtreeSleepDisabled).toBe(true);

    const multi = getWorkspaceSleepMenuState({
      isMultiContext: true,
      activeContextWorktrees: [{ id: "/w/a" }, { id: "/w/c" }],
      lineageDescendantCount: 4,
      sleepableTargets: [],
      activity,
    });
    expect(multi.sleepLabel).toBe("Sleep 2 Workspaces");
    expect(multi.descendantCount).toBe(0);
  });
});
