// Parity guard for D03a-047 (Orca `use-visible-worktrees.ts`): the painted list is
// derived from the ordered id stream by the SAME pipeline Cmd+1–9 numbers, the
// live-agent sample is taken once per pass and shared with the status filters, and
// the agent-send target is forced visible like Orca's `agentSendTargetWorktreeId`.
import { describe, expect, it } from "vitest";
import { ALL_EXECUTION_HOSTS_SCOPE, LOCAL_EXECUTION_HOST_ID } from "../../../../shared/execution-host";
import { toWorktreeRow } from "../../../../shared/worktree/worktree-row";
import type { Worktree } from "../../../../shared/worktree/types";
import {
  EMPTY_PAIRED_DEVICE_IDS_BY_ENVIRONMENT,
} from "../../workspace-creator-visibility";
import {
  buildSidebarLiveActivityIndex,
  isVisibleUnderSidebarMenuFilters,
} from "../../visible-worktree-filters";
import {
  computeVisibleWorktreeIds,
  type VisibleWorktreeOptions,
} from "../../visible-worktrees";
import type { GitWorktreeInfo, HydraProject, WorktreeSession } from "../../types";
import { toPipelineRepo } from "../grouping/to-pipeline-repo";
import { selectVisibleSidebarWorktrees } from "./visible-worktree-selection";

const PROJECT: HydraProject = {
  id: "repo_a",
  name: "hydra",
  path: "/repo/hydra",
  is_git: true,
  current_branch: "main",
};

const REPO_MAP = new Map([
  [
    PROJECT.id,
    toPipelineRepo({ project: PROJECT, projectGroupId: null, hostId: undefined }),
  ],
]);

const EMPTY_WORKTREE_ID_SET: ReadonlySet<string> = new Set();

function worktree(path: string, branch: string, isMain = false): GitWorktreeInfo {
  return {
    id: path,
    path,
    head_commit: "abc1234",
    branch,
    is_bare: false,
    is_locked: false,
    is_main: isMain,
  };
}

function projected(rows: GitWorktreeInfo[], hostId?: Worktree["hostId"]): Worktree[] {
  return rows.map((row) => toWorktreeRow(row, { repoId: PROJECT.id, hostId }));
}

function options(overrides: Partial<VisibleWorktreeOptions> = {}): VisibleWorktreeOptions {
  return {
    filterRepoIds: [],
    showSleepingWorkspaces: true,
    tabsByWorktree: null,
    ptyIdsByTabId: null,
    worktreeIdsWithLiveAgent: EMPTY_WORKTREE_ID_SET,
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

const DISPLAY_OPTIONS = {
  hideAutomationCreated: false,
  hideCliCreated: false,
  hideSleeping: true,
};

function session(path: string, id: string, state: WorktreeSession["state"]): WorktreeSession {
  return {
    id,
    project_path: path,
    title: id,
    branch: "feat/live",
    state,
    active: state !== "idle",
    agentName: "claude",
    executable: "claude",
  };
}

describe("selectVisibleSidebarWorktrees", () => {
  it("returns exactly the computed visible id order the shortcuts number", () => {
    // A deliberately scrambled sort: the pipeline must keep the rank order it is
    // handed, not re-sort by name.
    const rows = projected([
      worktree("/repo/hydra-c", "feat/c"),
      worktree("/repo/hydra-a", "feat/a"),
      worktree("/repo/hydra-b", "feat/b"),
    ]);
    const worktreesByRepo = { [PROJECT.id]: rows };
    const sortedIds = rows.map((row) => row.id);
    const opts = options();

    const selection = selectVisibleSidebarWorktrees({ worktreesByRepo, sortedIds, options: opts });

    expect(selection.visibleIds).toEqual(
      computeVisibleWorktreeIds(worktreesByRepo, sortedIds, opts)
    );
    expect(selection.visibleIds).toEqual([
      "/repo/hydra-c",
      "/repo/hydra-a",
      "/repo/hydra-b",
    ]);
    expect(selection.visibleWorktreesByRepo[PROJECT.id].map((row) => row.id)).toEqual(
      selection.visibleIds
    );
  });

  it("force-includes the agent-send target a menu filter would hide", () => {
    const automation: GitWorktreeInfo = {
      ...worktree("/repo/hydra-auto", "feat/auto"),
      automationProvenanceKind: "created-by-automation",
    };
    const plain = worktree("/repo/hydra-plain", "feat/plain");
    const rows = projected([automation, plain]);
    const worktreesByRepo = { [PROJECT.id]: rows };
    const sortedIds = rows.map((row) => row.id);
    const filtered = options({ hideAutomationGeneratedWorkspaces: true });

    expect(
      selectVisibleSidebarWorktrees({ worktreesByRepo, sortedIds, options: filtered })
        .visibleIds
    ).toEqual(["/repo/hydra-plain"]);

    const forced = selectVisibleSidebarWorktrees({
      worktreesByRepo,
      sortedIds,
      options: options({
        hideAutomationGeneratedWorkspaces: true,
        forcedVisibleWorktreeIds: ["/repo/hydra-auto"],
      }),
    });
    expect(forced.visibleIds).toEqual(["/repo/hydra-auto", "/repo/hydra-plain"]);
  });

  it("force-includes the agent-send target a host-scope filter would hide", () => {
    const localRow = toWorktreeRow(worktree("/repo/hydra-local", "feat/local"), {
      repoId: PROJECT.id,
      hostId: LOCAL_EXECUTION_HOST_ID,
    });
    const remoteRow = toWorktreeRow(worktree("/repo/hydra-remote", "feat/remote"), {
      repoId: PROJECT.id,
      hostId: "ssh:box",
    });
    const worktreesByRepo = { [PROJECT.id]: [localRow, remoteRow] };
    const sortedIds = [localRow.id, remoteRow.id];

    const scoped = selectVisibleSidebarWorktrees({
      worktreesByRepo,
      sortedIds,
      options: options({ visibleWorkspaceHostIds: ["ssh:box"] }),
    });
    expect(scoped.visibleWorktrees.map((row) => row.hostId)).toEqual(["ssh:box"]);

    const forced = selectVisibleSidebarWorktrees({
      worktreesByRepo,
      sortedIds,
      options: options({
        visibleWorkspaceHostIds: ["ssh:box"],
        forcedVisibleWorktreeIds: [localRow.id],
      }),
    });
    expect(forced.visibleWorktrees.map((row) => row.hostId)).toEqual(["local", "ssh:box"]);
  });

  it("shares one live-agent sample with the status filters and keeps it stable for the pass", () => {
    const livePath = "/repo/hydra-live";
    const idlePath = "/repo/hydra-idle";
    const rows = projected([
      worktree(livePath, "feat/live"),
      worktree(idlePath, "feat/idle"),
    ]);
    const worktreesByRepo = { [PROJECT.id]: rows };
    const sortedIds = rows.map((row) => row.id);
    const sessions = [session(livePath, "tab-live", "working"), session(idlePath, "tab-idle", "idle")];
    const livePaths = new Set([livePath]);

    // One sample for the pass (WorktreeList hoists exactly this call).
    const liveActivity = buildSidebarLiveActivityIndex(sessions, livePaths);
    const snapshot = liveActivity.worktreeIdsWithLiveAgent;
    expect(snapshot.has(livePath)).toBe(true);

    const selection = selectVisibleSidebarWorktrees({
      worktreesByRepo,
      sortedIds,
      options: options({
        showSleepingWorkspaces: false,
        tabsByWorktree: liveActivity.tabsByWorktree,
        ptyIdsByTabId: liveActivity.ptyIdsByTabId,
        worktreeIdsWithLiveAgent: snapshot,
      }),
    });
    const statusFiltered = rows
      .filter((row) =>
        isVisibleUnderSidebarMenuFilters({
          worktree: row,
          displayOptions: DISPLAY_OPTIONS,
          liveActivity,
        })
      )
      .map((row) => row.id);

    // Both derivations read the same sample, so they cannot disagree mid-pass.
    expect(selection.visibleIds).toEqual([livePath]);
    expect(statusFiltered).toEqual(selection.visibleIds);

    // A late status write builds a NEW sample without moving the one this pass holds.
    const laterIndex = buildSidebarLiveActivityIndex(
      sessions.map((entry) => ({ ...entry, state: "idle" as const })),
      livePaths
    );
    expect(laterIndex.worktreeIdsWithLiveAgent.has(livePath)).toBe(false);
    expect(liveActivity.worktreeIdsWithLiveAgent).toBe(snapshot);
    expect(snapshot.has(livePath)).toBe(true);
  });

  it("honors the panel's default-branch exemption in the shared status filter", () => {
    const main = worktree("/repo/hydra-main", "main", true);
    const [projectedMain] = projected([main]);
    const liveActivity = buildSidebarLiveActivityIndex([], new Set<string>());

    // The exemption is a real panel control: "Except default branch" off lets the
    // sleeping sweep take the main checkout; on keeps it.
    expect(
      isVisibleUnderSidebarMenuFilters({
        worktree: projectedMain,
        displayOptions: { ...DISPLAY_OPTIONS, alwaysShowDefaultBranch: true },
        liveActivity,
      })
    ).toBe(true);
    expect(
      isVisibleUnderSidebarMenuFilters({
        worktree: projectedMain,
        displayOptions: { ...DISPLAY_OPTIONS, alwaysShowDefaultBranch: false },
        liveActivity,
      })
    ).toBe(false);
  });
});
