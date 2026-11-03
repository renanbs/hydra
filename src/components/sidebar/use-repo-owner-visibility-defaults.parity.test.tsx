// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/use-repo-owner-visibility-defaults.ts
import { beforeEach, describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAppStore } from "@/store";
import type { HydraSettings } from "../../shared/settings-types";
import type { WorktreeVisibilityDefaults } from "../../shared/global-settings-types";
import { useRepoOwnerVisibilityDefaults } from "./use-repo-owner-visibility-defaults";

const GLOBAL_DEFAULTS: WorktreeVisibilityDefaults = { external: "show" };

// Why the cast: the live store's `settings` is typed as the legacy HydraSettings, and
// these tests only exercise the visibility-defaults owner path.
const STORE_SETTINGS = {
  worktree_visibility_defaults: GLOBAL_DEFAULTS,
} as unknown as HydraSettings;

beforeEach(() => {
  useAppStore.setState({
    settings: STORE_SETTINGS,
    worktreeVisibilityDefaultsByHost: {},
  });
});

describe("useRepoOwnerVisibilityDefaults (D11-005)", () => {
  it("returns undefined when no repo is selected", () => {
    const { result } = renderHook(() => useRepoOwnerVisibilityDefaults(null));
    expect(result.current).toBeUndefined();
  });

  it("resolves the local owner's defaults from the store", () => {
    const { result } = renderHook(() =>
      useRepoOwnerVisibilityDefaults({ connectionId: null })
    );
    expect(result.current).toEqual(GLOBAL_DEFAULTS);
  });

  it("follows the repo's runtime host entry as it changes", () => {
    const runtimeDefaults: WorktreeVisibilityDefaults = { external: "hide" };
    useAppStore.setState({
      worktreeVisibilityDefaultsByHost: { "runtime:env-1": runtimeDefaults },
    });
    const { result } = renderHook(() =>
      useRepoOwnerVisibilityDefaults({ executionHostId: "runtime:env-1" })
    );
    expect(result.current).toEqual(runtimeDefaults);
  });
});
