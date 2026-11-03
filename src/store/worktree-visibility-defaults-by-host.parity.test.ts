// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: store/worktree-visibility-defaults-by-host.ts
import { describe, expect, it } from "vitest";
import type { WorktreeVisibilityDefaults } from "../shared/global-settings-types";
import {
  getRepoOwnerWorktreeVisibilityDefaults,
  type VisibilityDefaultsSettings,
} from "./worktree-visibility-defaults-by-host";

const globalDefaults: WorktreeVisibilityDefaults = { external: "show" };
const localDefaults: WorktreeVisibilityDefaults = { external: "hide" };
const runtimeDefaults: WorktreeVisibilityDefaults = { external: "show" };

function settings(defaults: WorktreeVisibilityDefaults): VisibilityDefaultsSettings {
  return { worktreeVisibilityDefaults: defaults };
}

describe("getRepoOwnerWorktreeVisibilityDefaults (D11-005)", () => {
  it("reads the by-host local entry before the focused settings", () => {
    expect(
      getRepoOwnerWorktreeVisibilityDefaults(
        { connectionId: null },
        settings(globalDefaults),
        { local: localDefaults }
      )
    ).toEqual(localDefaults);
  });

  it("falls back to the focused settings for local and SSH hosts without an entry", () => {
    expect(
      getRepoOwnerWorktreeVisibilityDefaults(
        { connectionId: "ssh:prod" },
        settings(globalDefaults),
        {}
      )
    ).toEqual(globalDefaults);
  });

  it("reads Hydra's snake_case settings field when the Orca spelling is absent", () => {
    expect(
      getRepoOwnerWorktreeVisibilityDefaults(
        { connectionId: null },
        { worktree_visibility_defaults: globalDefaults },
        {}
      )
    ).toEqual(globalDefaults);
  });

  it("reads a runtime host's own entry instead of the focused settings", () => {
    expect(
      getRepoOwnerWorktreeVisibilityDefaults(
        { executionHostId: "runtime:env-1" },
        settings(globalDefaults),
        { local: localDefaults, "runtime:env-1": runtimeDefaults }
      )
    ).toEqual(runtimeDefaults);
  });

  it("does not fall back to focused settings when a runtime host has no entry", () => {
    expect(
      getRepoOwnerWorktreeVisibilityDefaults(
        { executionHostId: "runtime:env-2" },
        settings(globalDefaults),
        { "runtime:env-1": runtimeDefaults }
      )
    ).toBeUndefined();
  });
});
