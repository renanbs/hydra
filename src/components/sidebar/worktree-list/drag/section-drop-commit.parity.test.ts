// D03b-045: a sidebar release may arrive before the frame that would hit-test its final
// position, so a lane/pin header the pointer hovered a few pixels ago still commits.
import { describe, expect, it } from "vitest";
import {
  SIDEBAR_SECTION_DROP_FALLBACK_TOLERANCE_PX,
  resolveSidebarSectionDropCommitTarget,
} from "./section-drop";

const tracked = {
  target: { kind: "status" as const, status: "in-review" },
  x: 100,
  y: 200,
};

describe("sidebar section drop commit tolerance (Orca parity)", () => {
  it("commits to the live target when one is hit", () => {
    expect(
      resolveSidebarSectionDropCommitTarget({
        currentTarget: { kind: "pin" },
        latestTrackedTarget: tracked,
        x: 101,
        y: 201,
      })
    ).toEqual({ kind: "pin" });
  });

  it("falls back to the tracked header within 6px", () => {
    expect(SIDEBAR_SECTION_DROP_FALLBACK_TOLERANCE_PX).toBe(6);
    expect(
      resolveSidebarSectionDropCommitTarget({
        currentTarget: null,
        latestTrackedTarget: tracked,
        x: 103,
        y: 204,
      })
    ).toEqual(tracked.target);
  });

  it("ignores a tracked header beyond the tolerance", () => {
    expect(
      resolveSidebarSectionDropCommitTarget({
        currentTarget: null,
        latestTrackedTarget: tracked,
        x: 110,
        y: 200,
      })
    ).toBeNull();
  });

  it("returns null when nothing was ever tracked", () => {
    expect(
      resolveSidebarSectionDropCommitTarget({
        currentTarget: null,
        latestTrackedTarget: null,
        x: 0,
        y: 0,
      })
    ).toBeNull();
  });
});
