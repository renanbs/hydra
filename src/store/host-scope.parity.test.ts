// Guard for the live-store host-scope port: the setters carry the exact Orca
// `ui-slice-preference-actions` semantics (single host narrows scope, multi keeps
// it, 'all' clears the filter) but persist nothing — persistence is the App's
// debounced `ui.sidebar` writer. Enforced 2026-10-08: the slice adapter no longer
// mirrors `workspaceHostScope`/`visibleWorkspaceHostIds` into its `ui.state` row.
// Also guards `ui.sidebar` boot hydration.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { hydrateWorkspaceHostScopePreference, useAppStore } from "./index";

function resetHostScope() {
  useAppStore.setState({ workspaceHostScope: "all", visibleWorkspaceHostIds: null });
}

describe("live store host scope setters", () => {
  beforeEach(resetHostScope);
  afterEach(resetHostScope);

  it("normalizes 'all' to no host filter", () => {
    useAppStore.getState().setWorkspaceHostScope("local");
    useAppStore.getState().setWorkspaceHostScope("all");

    expect(useAppStore.getState().workspaceHostScope).toBe("all");
    expect(useAppStore.getState().visibleWorkspaceHostIds).toBeNull();
  });

  it("narrows a concrete scope to that single host", () => {
    useAppStore.getState().setWorkspaceHostScope("ssh:srv");

    expect(useAppStore.getState().workspaceHostScope).toBe("ssh:srv");
    expect(useAppStore.getState().visibleWorkspaceHostIds).toEqual(["ssh:srv"]);
  });

  it("accepts a multi-host list while the scope stays 'all'", () => {
    useAppStore.getState().setVisibleWorkspaceHostIds(["local", "ssh:srv"]);

    expect(useAppStore.getState().visibleWorkspaceHostIds).toEqual(["local", "ssh:srv"]);
    expect(useAppStore.getState().workspaceHostScope).toBe("all");
  });

  it("derives the scope from a single-id list and clears it for null/empty", () => {
    useAppStore.getState().setVisibleWorkspaceHostIds(["ssh:srv"]);
    expect(useAppStore.getState().workspaceHostScope).toBe("ssh:srv");

    useAppStore.getState().setVisibleWorkspaceHostIds([]);
    expect(useAppStore.getState().visibleWorkspaceHostIds).toBeNull();
    expect(useAppStore.getState().workspaceHostScope).toBe("all");
  });

  it("drops unparseable ids and deduplicates", () => {
    useAppStore.getState().setVisibleWorkspaceHostIds(["bogus", "local", "local"]);

    expect(useAppStore.getState().visibleWorkspaceHostIds).toEqual(["local"]);
  });
});

describe("ui.sidebar host scope hydration", () => {
  beforeEach(resetHostScope);
  afterEach(resetHostScope);

  it("uses the defaults for a blob without the keys (legacy migration intact)", () => {
    hydrateWorkspaceHostScopePreference({});

    expect(useAppStore.getState().workspaceHostScope).toBe("all");
    expect(useAppStore.getState().visibleWorkspaceHostIds).toBeNull();
  });

  it("restores a single-host scope", () => {
    hydrateWorkspaceHostScopePreference({
      workspaceHostScope: "ssh:srv",
      visibleWorkspaceHostIds: ["ssh:srv"],
    });

    expect(useAppStore.getState().workspaceHostScope).toBe("ssh:srv");
    expect(useAppStore.getState().visibleWorkspaceHostIds).toEqual(["ssh:srv"]);
  });

  it("restores a multi-host list and preserves its scope signal", () => {
    hydrateWorkspaceHostScopePreference({
      workspaceHostScope: "local",
      visibleWorkspaceHostIds: ["local", "ssh:srv"],
    });

    expect(useAppStore.getState().workspaceHostScope).toBe("local");
    expect(useAppStore.getState().visibleWorkspaceHostIds).toEqual(["local", "ssh:srv"]);
  });

  it("degrades a malformed blob to the defaults instead of blanking the sidebar", () => {
    hydrateWorkspaceHostScopePreference({
      workspaceHostScope: 42,
      visibleWorkspaceHostIds: "ssh:srv",
    });

    expect(useAppStore.getState().workspaceHostScope).toBe("all");
    expect(useAppStore.getState().visibleWorkspaceHostIds).toBeNull();
  });
});
