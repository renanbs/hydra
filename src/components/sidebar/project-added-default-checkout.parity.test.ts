import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  finishProjectAddWithDefaultCheckout,
  getProjectDefaultCheckout,
  getProjectWorktreesForHost,
  hasDetectedHiddenLinkedExternalWorktrees,
  openProjectDefaultCheckout,
  resetAddRepoExistingWorkspacesTrackedForTests,
  type ProjectAddedHandoffDeps,
} from "./project-added-default-checkout";

function deps(overrides: Partial<ProjectAddedHandoffDeps> = {}): ProjectAddedHandoffDeps {
  return {
    getWorktrees: () => null,
    refreshWorktrees: vi.fn(async () => null),
    setExternalWorktreeVisibility: vi.fn(async () => true),
    setHideDefaultBranchWorkspace: vi.fn(),
    openDefaultCheckout: vi.fn(),
    finalizeImportedRepoAfterSkip: vi.fn(),
    track: vi.fn(),
    ...overrides,
  };
}

describe("project added default checkout (D02a-028/029/030)", () => {
  it("opens a loaded default checkout and reveals default-branch workspaces", async () => {
    const open = vi.fn();
    const setHide = vi.fn();
    const handoff = deps({
      getWorktrees: () => ({
        visible: [{ id: "wt-main", path: "/repo", isMainWorktree: true }],
        hidden: [],
        authoritative: true,
      }),
      openDefaultCheckout: open,
      setHideDefaultBranchWorkspace: setHide,
    });

    const result = await finishProjectAddWithDefaultCheckout({
      repoId: "repo_a",
      source: "project_added_compat",
      closeModal: vi.fn(),
      deps: handoff,
    });

    expect(result).toEqual({ result: "opened_default_checkout", reason: "loaded_default_checkout" });
    expect(setHide).toHaveBeenCalledWith(false);
    expect(open).toHaveBeenCalledWith(
      expect.objectContaining({ worktree: expect.objectContaining({ path: "/repo" }) })
    );
  });

  it("reveals a hidden default checkout through the catalog before opening it", async () => {
    let visible = false;
    const setVisibility = vi.fn(async () => {
      visible = true;
      return true;
    });
    const handoff = deps({
      getWorktrees: () => ({
        visible: [],
        hidden: [{ id: "wt-main", path: "/repo", isMainWorktree: true }],
        authoritative: true,
      }),
      setExternalWorktreeVisibility: setVisibility,
      refreshWorktrees: async () => ({
        visible: visible ? [{ id: "wt-main", path: "/repo", isMainWorktree: true }] : [],
        hidden: [],
        authoritative: true,
      }),
    });

    const result = await openProjectDefaultCheckout({
      repoId: "repo_a",
      source: "clone_url",
      deps: handoff,
    });

    expect(setVisibility).toHaveBeenCalledWith("repo_a", "show", undefined);
    expect(result.reason).toBe("detected_default_checkout");
  });

  it("reveals linked external worktrees when the default checkout is already loaded", async () => {
    const setVisibility = vi.fn(async () => true);
    const handoff = deps({
      getWorktrees: () => ({
        visible: [{ id: "wt-main", path: "/repo", isMainWorktree: true }],
        hidden: [{ id: "wt-ext", path: "/repo-ext" }],
        authoritative: true,
      }),
      setExternalWorktreeVisibility: setVisibility,
      refreshWorktrees: async () => ({
        visible: [{ id: "wt-main", path: "/repo", isMainWorktree: true }],
        hidden: [],
        authoritative: true,
      }),
    });

    await openProjectDefaultCheckout({ repoId: "repo_a", source: "local_folder_picker", deps: handoff });

    expect(setVisibility).toHaveBeenCalledWith("repo_a", "show", undefined);
  });

  it("finalizes skip semantics when no authoritative checkout exists", async () => {
    const finalize = vi.fn();
    const handoff = deps({ finalizeImportedRepoAfterSkip: finalize });

    const result = await openProjectDefaultCheckout({
      repoId: "repo_a",
      source: "local_folder_picker",
      deps: handoff,
    });

    expect(result).toEqual({ result: "revealed_project", reason: "no_authoritative_detection" });
    expect(finalize).toHaveBeenCalledWith("repo_a", undefined);
    expect(handoff.track).toHaveBeenCalledWith(
      "add_repo_default_checkout_handoff",
      expect.objectContaining({ result: "revealed_project", reason: "no_authoritative_detection" })
    );
  });

  it("filters detected rows by the captured execution host", () => {
    const rows = [
      { path: "/local", isMainWorktree: true },
      { path: "/remote", isMainWorktree: true, hostId: "ssh:box" },
    ];
    expect(getProjectWorktreesForHost(rows, "ssh:box")).toEqual([
      { path: "/remote", isMainWorktree: true, hostId: "ssh:box" },
    ]);
    expect(getProjectDefaultCheckout(rows)?.path).toBe("/local");
    expect(
      hasDetectedHiddenLinkedExternalWorktrees(
        { visible: [], hidden: [{ path: "/ext" }], authoritative: true },
        "local"
      )
    ).toBe(true);
  });
});

describe("add repo existing workspaces telemetry (D02a-031)", () => {
  beforeEach(() => {
    resetAddRepoExistingWorkspacesTrackedForTests();
  });

  it("emits the count-only signal before opening the checkout", async () => {
    const trackFn = vi.fn();
    const handoff = deps({
      getWorktrees: () => ({
        visible: [
          { id: "wt-main", path: "/repo", branch: "main", isMainWorktree: true },
          { id: "wt-linked", path: "/repo-feature", branch: "feature/x", isMainWorktree: false },
        ],
        hidden: [],
        authoritative: true,
      }),
      track: trackFn,
    });

    await openProjectDefaultCheckout({
      repoId: "repo_sig",
      source: "local_folder_picker",
      deps: handoff,
    });

    const detected = trackFn.mock.calls.find(
      ([name]) => name === "add_repo_existing_workspaces_detected"
    );
    expect(detected?.[1]).toMatchObject({
      source: "local_folder_picker",
      existing_workspace_count: 2,
      existing_linked_workspace_count: 1,
    });
    expect(JSON.stringify(detected?.[1])).not.toContain("feature/x");
  });

  it("does not double-track the same repo id", async () => {
    const trackFn = vi.fn();
    const snapshot = {
      visible: [
        { id: "wt-main", path: "/repo", branch: "main", isMainWorktree: true },
        { id: "wt-linked", path: "/repo-feature", branch: "feature", isMainWorktree: false },
      ],
      hidden: [],
      authoritative: true as const,
    };
    const handoff = deps({ getWorktrees: () => snapshot, track: trackFn });

    await openProjectDefaultCheckout({ repoId: "repo_once", source: "local_folder_picker", deps: handoff });
    await openProjectDefaultCheckout({ repoId: "repo_once", source: "local_folder_picker", deps: handoff });

    expect(
      trackFn.mock.calls.filter(([name]) => name === "add_repo_existing_workspaces_detected")
    ).toHaveLength(1);
  });

  it("skips the signal for clone/create sources", async () => {
    const trackFn = vi.fn();
    const handoff = deps({
      getWorktrees: () => ({
        visible: [
          { id: "wt-main", path: "/repo", branch: "main", isMainWorktree: true },
          { id: "wt-linked", path: "/repo-feature", branch: "feature", isMainWorktree: false },
        ],
        hidden: [],
        authoritative: true,
      }),
      track: trackFn,
    });

    await openProjectDefaultCheckout({ repoId: "repo_clone", source: "clone_url", deps: handoff });

    expect(
      trackFn.mock.calls.filter(([name]) => name === "add_repo_existing_workspaces_detected")
    ).toHaveLength(0);
  });
});
