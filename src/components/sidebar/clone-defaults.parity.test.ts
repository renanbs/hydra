import { describe, expect, it } from "vitest";
import { getCloneDestinationAutoFill, getDefaultCloneParent } from "./clone-defaults";

describe("getDefaultCloneParent (Orca parity)", () => {
  it("strips a trailing workspaces segment so clones sit beside the tree", () => {
    expect(getDefaultCloneParent("/Users/me/orca/workspaces")).toBe("/Users/me/orca");
    expect(getDefaultCloneParent("/Users/me/orca/workspaces/")).toBe("/Users/me/orca");
  });

  it("returns the workspace dir unchanged when it is not a workspaces tree", () => {
    expect(getDefaultCloneParent("/Users/me/src")).toBe("/Users/me/src");
    expect(getDefaultCloneParent("")).toBe("");
  });

  it("handles Windows drives and roots", () => {
    expect(getDefaultCloneParent("C:\\Users\\me\\orca\\workspaces")).toBe("C:\\Users\\me\\orca");
    expect(getDefaultCloneParent("C:\\workspaces")).toBe("C:\\");
    expect(getDefaultCloneParent("/workspaces")).toBe("/");
  });
});

describe("getCloneDestinationAutoFill", () => {
  it("seeds only on the clone step, once, and only for local hosts", () => {
    const base = {
      step: "clone",
      cloneDestination: "",
      activeRuntimeEnvironmentId: null,
      sshTargetId: null,
      workspaceDir: "/w/workspaces",
      cloneStepAutoFilled: false,
    };
    expect(getCloneDestinationAutoFill(base)).toEqual({ destination: "/w" });
    expect(getCloneDestinationAutoFill({ ...base, cloneStepAutoFilled: true })).toBeNull();
    expect(getCloneDestinationAutoFill({ ...base, cloneDestination: "/typed" })).toBeNull();
    expect(
      getCloneDestinationAutoFill({ ...base, activeRuntimeEnvironmentId: "rt-1" })
    ).toBeNull();
    expect(getCloneDestinationAutoFill({ ...base, sshTargetId: "ssh:box" })).toBeNull();
    expect(getCloneDestinationAutoFill({ ...base, step: "start" })).toBeNull();
  });
});
