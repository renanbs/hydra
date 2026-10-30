// D03a-054/D03a-072: the notice rows' per-repo action state and the Keep-hidden
// placement gate.
import { describe, expect, it, vi } from "vitest";
import type { Repo } from "../../../../shared/repo-types";
import type { ImportedWorktreesCardRow } from "../grouping/row-types";
import {
  canKeepImportedWorktreesHidden,
  EXTERNAL_WORKTREES_SUPPRESS_ERROR,
  runExternalWorktreeCardAction,
  type ExternalWorktreeCardActionState,
} from "./external-worktree-card-actions";

const repo = {
  id: "repo_a",
  path: "/repo/a",
  displayName: "a",
  badgeColor: "#64748b",
  addedAt: 0,
  projectGroupId: null,
} as Repo;

function importedRow(placement: ImportedWorktreesCardRow["placement"]): ImportedWorktreesCardRow {
  return {
    type: "imported-worktrees-card",
    key: `imported-worktrees-card:${placement}:repo_a`,
    repo,
    hiddenWorktrees: [],
    placement,
  };
}

function recorder() {
  const states: Array<ExternalWorktreeCardActionState | null> = [];
  return {
    states,
    setState: (state: ExternalWorktreeCardActionState | null) => states.push(state),
  };
}

describe("canKeepImportedWorktreesHidden (D03a-072)", () => {
  it("offers Keep hidden only for a repo-group row", () => {
    expect(canKeepImportedWorktreesHidden(importedRow("repo-group"), undefined)).toBe(true);
    expect(canKeepImportedWorktreesHidden(importedRow("pinned-fallback"), undefined)).toBe(false);
  });

  it("withholds Keep hidden after a succeeded Show", () => {
    expect(
      canKeepImportedWorktreesHidden(importedRow("repo-group"), {
        pending: false,
        error: null,
        forceVisible: true,
      })
    ).toBe(false);
  });
});

describe("runExternalWorktreeCardAction (D03a-054)", () => {
  it("stays pending until the action resolves, then clears", async () => {
    const state = recorder();
    const gate = Promise.withResolvers<void>();

    const run = runExternalWorktreeCardAction({
      setState: state.setState,
      action: () => gate.promise,
      errorMessage: "failed",
    });
    expect(state.states).toEqual([{ pending: true, error: null }]);
    gate.resolve();
    await expect(run).resolves.toBe(true);
    expect(state.states.at(-1)).toBeNull();
  });

  it("keeps the row pinned open when the show awaits authoritative confirmation", async () => {
    const state = recorder();
    await runExternalWorktreeCardAction({
      setState: state.setState,
      action: async () => {},
      errorMessage: "failed",
      keepForceVisible: true,
    });
    expect(state.states.at(-1)).toEqual({ pending: false, error: null, forceVisible: true });
  });

  it("paints the row error when the authoritative confirmation rejects", async () => {
    const state = recorder();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(
      runExternalWorktreeCardAction({
        setState: state.setState,
        action: async () => {
          throw new Error("authoritative worktree refresh failed");
        },
        errorMessage: EXTERNAL_WORKTREES_SUPPRESS_ERROR,
      })
    ).resolves.toBe(false);
    expect(state.states.at(-1)).toEqual({
      pending: false,
      error: EXTERNAL_WORKTREES_SUPPRESS_ERROR,
    });
    consoleError.mockRestore();
  });
});
