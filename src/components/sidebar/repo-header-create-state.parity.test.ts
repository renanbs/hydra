// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/repo-header-create-state.ts
import { describe, expect, it } from "vitest";
import { getRepoHeaderCreateState } from "./repo-header-create-state";

describe("getRepoHeaderCreateState (D11-004)", () => {
  it("offers a workspace (not a worktree) for a folder project", () => {
    const state = getRepoHeaderCreateState({
      repo: { kind: "folder", connectionId: "ssh:prod" },
      label: "notes",
      sshStatus: "disconnected",
    });
    expect(state).toEqual({
      disabled: false,
      tooltip: "Create workspace for notes",
      ariaLabel: "Create workspace for notes",
      requiresSshReconnect: false,
    });
  });

  it("offers a worktree for a connected git project", () => {
    const state = getRepoHeaderCreateState({
      repo: { kind: "git", connectionId: "ssh:prod" },
      label: "hydra",
      sshStatus: "connected",
    });
    expect(state).toEqual({
      disabled: false,
      tooltip: "Create new worktree for hydra",
      ariaLabel: "Create new worktree for hydra",
      requiresSshReconnect: false,
    });
  });

  it("offers a worktree for a local git project with no SSH target", () => {
    const state = getRepoHeaderCreateState({
      repo: { kind: "git", connectionId: null },
      label: "hydra",
      sshStatus: null,
    });
    expect(state.disabled).toBe(false);
    expect(state.requiresSshReconnect).toBe(false);
    expect(state.tooltip).toBe("Create new worktree for hydra");
  });

  it.each([
    "disconnected",
    "connecting",
    "reconnecting",
    "reconnection-failed",
    "error",
    null,
  ] as const)("gates creation while the SSH target is %s", (sshStatus) => {
    const state = getRepoHeaderCreateState({
      repo: { kind: "git", connectionId: "ssh:prod" },
      label: "hydra",
      sshStatus,
    });
    expect(state).toEqual({
      disabled: true,
      tooltip: "Reconnect SSH target before creating workspaces",
      ariaLabel: "Reconnect SSH target before creating workspaces for hydra",
      requiresSshReconnect: true,
    });
  });

  it("never gates a runtime-owned SSH target (hidden plumbing)", () => {
    const state = getRepoHeaderCreateState({
      repo: { kind: "git", connectionId: "runtime-ssh-env-1" },
      label: "hydra",
      sshStatus: "disconnected",
    });
    expect(state.disabled).toBe(false);
    expect(state.requiresSshReconnect).toBe(false);
  });
});
