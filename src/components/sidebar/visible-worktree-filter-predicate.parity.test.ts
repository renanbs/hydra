// D09-021: filter-only visibility for ONE worktree (Orca
// `worktreePassesSidebarFilters`). It exists so collapse/group elision can never be
// reported as a filter hide, and it resolves the target's host because worktree ids
// are not host-qualified: the same id may name a visible local row and a filtered
// remote one.
import { describe, expect, it } from "vitest";
import {
  ALL_EXECUTION_HOSTS_SCOPE,
  LOCAL_EXECUTION_HOST_ID,
} from "../../shared/execution-host";
import { toWorktreeRow } from "../../shared/worktree/worktree-row";
import { EMPTY_PAIRED_DEVICE_IDS_BY_ENVIRONMENT } from "./workspace-creator-visibility";
import { worktreePassesSidebarFilters, type VisibleWorktreeOptions } from "./visible-worktrees";
import { toPipelineRepo } from "./worktree-list/grouping/to-pipeline-repo";
import type { HydraProject } from "./types";

const LOCAL_PROJECT: HydraProject = {
  id: "repo_local",
  name: "local",
  path: "/repo/local",
  is_git: true,
  current_branch: "main",
};
const REMOTE_PROJECT: HydraProject = {
  id: "repo_remote",
  name: "remote",
  path: "/repo/remote",
  is_git: true,
  current_branch: "main",
  connectionId: "srv",
  executionHostId: "ssh:srv",
};

const REPO_MAP = new Map([
  [
    LOCAL_PROJECT.id,
    toPipelineRepo({ project: LOCAL_PROJECT, projectGroupId: null, hostId: undefined }),
  ],
  [
    REMOTE_PROJECT.id,
    toPipelineRepo({
      project: REMOTE_PROJECT,
      projectGroupId: null,
      hostId: "ssh:srv",
    }),
  ],
]);

function row(
  id: string,
  repoId: string,
  overrides: Record<string, unknown> = {}
) {
  return toWorktreeRow(
    {
      id,
      path: `/repo/${repoId}/${id}`,
      head_commit: "abc1234",
      branch: `branch-${id}`,
      is_bare: false,
      is_locked: false,
      ...overrides,
    },
    { repoId }
  );
}

function options(overrides: Partial<VisibleWorktreeOptions> = {}): VisibleWorktreeOptions {
  return {
    filterRepoIds: [],
    showSleepingWorkspaces: true,
    tabsByWorktree: null,
    ptyIdsByTabId: null,
    worktreeIdsWithLiveAgent: new Set<string>(),
    hideDefaultBranchWorkspace: false,
    hideAutomationGeneratedWorkspaces: false,
    hideCliCreatedWorkspaces: false,
    hideDetachedHeadWorkspaces: false,
    hideWorkspacesFromOtherDevices: false,
    pairedDeviceIdsByEnvironment: EMPTY_PAIRED_DEVICE_IDS_BY_ENVIRONMENT,
    alwaysShowDefaultBranchWorkspace: true,
    repoMap: REPO_MAP,
    workspaceHostScope: ALL_EXECUTION_HOSTS_SCOPE,
    visibleWorkspaceHostIds: null,
    defaultHostId: LOCAL_EXECUTION_HOST_ID,
    worktreeLineageById: {},
    ...overrides,
  };
}

describe("worktreePassesSidebarFilters (Orca parity)", () => {
  it("passes an unfiltered row and ignores archived rows", () => {
    const worktree = row("wt-1", LOCAL_PROJECT.id);
    expect(worktreePassesSidebarFilters({ worktree, options: options() })).toBe(true);
    expect(
      worktreePassesSidebarFilters({ worktree, options: options(), executionHostId: "local" })
    ).toBe(true);
    expect(
      worktreePassesSidebarFilters({
        worktree: { ...worktree, isArchived: true },
        options: options(),
      })
    ).toBe(false);
  });

  it("applies the project allow-list", () => {
    const worktree = row("wt-1", LOCAL_PROJECT.id);
    expect(
      worktreePassesSidebarFilters({
        worktree,
        options: options({ filterRepoIds: [REMOTE_PROJECT.id] }),
      })
    ).toBe(false);
    expect(
      worktreePassesSidebarFilters({
        worktree,
        options: options({ filterRepoIds: [LOCAL_PROJECT.id] }),
      })
    ).toBe(true);
  });

  it("keeps a provisioned root visible under the default-branch filter", () => {
    const provisioned = {
      ...row("root", LOCAL_PROJECT.id, { is_main: true, branch: "main" }),
      ephemeralVmCheckoutMode: "provisioned-root" as const,
    };
    const mainCheckout = row("main", LOCAL_PROJECT.id, { is_main: true, branch: "main" });
    const hideDefault = options({ hideDefaultBranchWorkspace: true });
    expect(worktreePassesSidebarFilters({ worktree: mainCheckout, options: hideDefault })).toBe(
      false
    );
    expect(worktreePassesSidebarFilters({ worktree: provisioned, options: hideDefault })).toBe(
      true
    );
  });

  it("applies the provenance and detached-HEAD filters", () => {
    const automation = row("auto", LOCAL_PROJECT.id, {
      automationProvenanceKind: "created-by-automation",
    });
    const cli = row("cli", LOCAL_PROJECT.id, { cliProvenanceKind: "created-by-cli" });
    // A detached checkout carries an EMPTY branch and a real head (the git identity
    // reader, not a "HEAD" branch string, is what qualifies it).
    const detached = row("detached", LOCAL_PROJECT.id, {
      branch: "",
      head_commit: "deadbee",
    });
    expect(
      worktreePassesSidebarFilters({
        worktree: automation,
        options: options({ hideAutomationGeneratedWorkspaces: true }),
      })
    ).toBe(false);
    expect(
      worktreePassesSidebarFilters({
        worktree: cli,
        options: options({ hideCliCreatedWorkspaces: true }),
      })
    ).toBe(false);
    expect(
      worktreePassesSidebarFilters({
        worktree: detached,
        options: options({ hideDetachedHeadWorkspaces: true }),
      })
    ).toBe(false);
  });

  it("qualifies the host so a visible local twin cannot vouch for a remote row", () => {
    // Same id, two hosts: the id-only answer says "visible" because of the local twin.
    const remote = row("wt-shared", REMOTE_PROJECT.id);
    expect(worktreePassesSidebarFilters({ worktree: remote, options: options() })).toBe(true);
    expect(
      worktreePassesSidebarFilters({
        worktree: remote,
        options: options({ visibleWorkspaceHostIds: [LOCAL_EXECUTION_HOST_ID] }),
        executionHostId: "local",
      })
    ).toBe(false);
    expect(
      worktreePassesSidebarFilters({
        worktree: remote,
        options: options({ visibleWorkspaceHostIds: [LOCAL_EXECUTION_HOST_ID, "ssh:srv"] }),
        executionHostId: "ssh:srv",
      })
    ).toBe(true);
  });

  it("excludes the sleeping sweep but honours the main-workspace exemption", () => {
    const sleeping = row("sleepy", LOCAL_PROJECT.id);
    const mainRow = row("main", LOCAL_PROJECT.id, { is_main: true, branch: "main" });
    const sleepingOptions = options({ showSleepingWorkspaces: false });
    expect(worktreePassesSidebarFilters({ worktree: sleeping, options: sleepingOptions })).toBe(
      false
    );
    expect(worktreePassesSidebarFilters({ worktree: mainRow, options: sleepingOptions })).toBe(
      true
    );
    expect(
      worktreePassesSidebarFilters({
        worktree: mainRow,
        options: { ...sleepingOptions, alwaysShowDefaultBranchWorkspace: false },
      })
    ).toBe(false);
  });
});
