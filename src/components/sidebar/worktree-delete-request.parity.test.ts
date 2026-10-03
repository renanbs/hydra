// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
/**
 * STA-4343: the confirmed row's host decides which workspace a delete resolves to.
 *
 * The delete-confirmation dialog funnels through `resolveWorktreeBatchDeleteTargets`.
 * Resolving by id alone is not enough: the id is `repoId::path`, so a repo registered
 * on two execution hosts publishes the same id twice and a confirmed remote row would
 * silently resolve to the local checkout at the same path.
 */
import { describe, expect, it } from "vitest";
import type { ExecutionHostId } from "../../shared/execution-host";
import type { WorktreeDeleteResolvableTarget } from "./worktree-delete-request";
import {
  readWorktreeDeleteIdentities,
  resolveWorktreeBatchDeleteTargets,
  toWorktreeDeleteIdentities,
} from "./worktree-delete-request";

const SHARED_ID = "repo-1::/work/orca";
const LOCAL: ExecutionHostId = "local";
const SSH: ExecutionHostId = "ssh:build-box";

type LiveRow = WorktreeDeleteResolvableTarget & { path: string };

function row(hostId: ExecutionHostId | undefined, overrides: Partial<LiveRow> = {}): LiveRow {
  return {
    id: SHARED_ID,
    instanceId: `instance-${hostId ?? "none"}`,
    repoId: "repo-1",
    isMainWorktree: false,
    path: "/work/orca",
    ...(hostId ? { hostId } : {}),
    ...overrides,
  } as LiveRow;
}

/** Stands in for the live workspace list: every host's row for an id, resolved on the named host. */
function lookupFrom(rows: readonly LiveRow[]) {
  return (worktreeId: string, hostId: ExecutionHostId | undefined): LiveRow | undefined => {
    const matches = rows.filter((entry) => entry.id === worktreeId);
    return hostId ? matches.find((entry) => entry.hostId === hostId) : matches[0];
  };
}

describe("resolveWorktreeBatchDeleteTargets", () => {
  const localRow = row(LOCAL);
  const sshRow = row(SSH);

  it("reaches the second host row even though the local row is listed first", () => {
    const identities = toWorktreeDeleteIdentities([sshRow]);

    const targets = resolveWorktreeBatchDeleteTargets(identities, lookupFrom([localRow, sshRow]));

    expect(targets).toEqual([sshRow]);
    expect(targets?.[0]?.hostId).toBe(SSH);
  });

  it("resolves the local row when that is the one confirmed", () => {
    const targets = resolveWorktreeBatchDeleteTargets(
      toWorktreeDeleteIdentities([localRow]),
      lookupFrom([localRow, sshRow])
    );

    expect(targets?.[0]?.hostId).toBe(LOCAL);
  });

  it("keeps both hosts when both rows are confirmed in one batch", () => {
    const targets = resolveWorktreeBatchDeleteTargets(
      toWorktreeDeleteIdentities([localRow, sshRow]),
      lookupFrom([localRow, sshRow])
    );

    // Deduping on the bare id here would drop one confirmed workspace.
    expect(targets?.map((entry) => entry.hostId)).toEqual([LOCAL, SSH]);
  });

  it("refuses when the confirmed host no longer has a row", () => {
    const targets = resolveWorktreeBatchDeleteTargets(
      toWorktreeDeleteIdentities([sshRow]),
      lookupFrom([localRow])
    );

    expect(targets).toBeNull();
  });

  it("refuses when the row on the confirmed host was replaced", () => {
    const replaced = row(SSH, { instanceId: "instance-recreated" });

    const targets = resolveWorktreeBatchDeleteTargets(
      toWorktreeDeleteIdentities([sshRow]),
      lookupFrom([localRow, replaced])
    );

    expect(targets).toBeNull();
  });

  it("keeps first-wins for a bare id request that names no host", () => {
    const targets = resolveWorktreeBatchDeleteTargets([SHARED_ID], lookupFrom([localRow, sshRow]));

    expect(targets?.[0]?.hostId).toBe(LOCAL);
  });

  it("skips a main worktree without failing the batch", () => {
    const main = row(LOCAL, { isMainWorktree: true });

    const targets = resolveWorktreeBatchDeleteTargets(
      toWorktreeDeleteIdentities([main]),
      lookupFrom([main])
    );

    expect(targets).toEqual([]);
  });
});

describe("readWorktreeDeleteIdentities", () => {
  it("carries the host through the modal data round trip", () => {
    // Modal data crosses an unknown boundary, so the host has to survive parsing
    // or the dialog resolves the confirmed row on the wrong host.
    const parsed = readWorktreeDeleteIdentities([
      { id: SHARED_ID, instanceId: "instance-ssh", hostId: SSH },
    ]);

    expect(parsed).toEqual([{ id: SHARED_ID, instanceId: "instance-ssh", hostId: SSH }]);
  });

  it("drops a host that is not a valid execution host id", () => {
    const parsed = readWorktreeDeleteIdentities([{ id: SHARED_ID, hostId: "   " }]);

    expect(parsed).toEqual([{ id: SHARED_ID, instanceId: undefined }]);
  });
});
