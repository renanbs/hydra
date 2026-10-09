import { isInactiveWorkspace } from "@/lib/worktree-activity-state";
import type { Worktree } from "../../shared/worktree/types";
import type { WorktreeSession } from "./types";
import type { WorkspaceDisplayOptions } from "./WorkspaceOptionsMenu";
import {
  isAutomationGeneratedWorkspace,
  isCliCreatedWorkspace,
  isSleepingSweepExemptWorkspace,
} from "./visible-worktree-kinds";

/**
 * Live-activity index the ported sleep sweep reads, built from Hydra's sessions.
 *
 * Extracted from `WorktreeList`'s row pipeline so the workspace board evaluates
 * "Hide sleeping" against the same sample the sidebar painted with.
 */
export interface SidebarLiveActivityIndex {
  tabsByWorktree: Record<string, { id: string }[]>;
  ptyIdsByTabId: Record<string, string[]>;
  worktreeIdsWithLiveAgent: Set<string>;
}

export function buildSidebarLiveActivityIndex(
  sessions: readonly WorktreeSession[],
  liveWorkspacePaths: ReadonlySet<string>
): SidebarLiveActivityIndex {
  const tabsByWorktree: Record<string, { id: string }[]> = {};
  const ptyIdsByTabId: Record<string, string[]> = {};
  const worktreeIdsWithLiveAgent = new Set<string>();
  for (const session of sessions) {
    const path = session.project_path;
    if (!path) continue;
    // Why: a closed terminal drops the tab (Orca's tabHasLivePty), so only paths
    // with a mounted terminal get a tab entry — otherwise nothing ever sleeps.
    if (liveWorkspacePaths.has(path)) {
      tabsByWorktree[path] = [...(tabsByWorktree[path] ?? []), { id: session.id }];
      ptyIdsByTabId[session.id] = ["live"];
    }
    if (session.state === "working" || session.state === "blocked" || session.state === "waiting") {
      worktreeIdsWithLiveAgent.add(path);
    }
  }
  return { tabsByWorktree, ptyIdsByTabId, worktreeIdsWithLiveAgent };
}

/**
 * The sidebar's "Show" menu filters. Orca's ported predicates, never a re-derived
 * rule: the workspace board reads this so a hidden workspace cannot reappear on the
 * board while the sidebar has it filtered away.
 */
export function isVisibleUnderSidebarMenuFilters(args: {
  worktree: Worktree;
  displayOptions: Pick<
    WorkspaceDisplayOptions,
    "hideAutomationCreated" | "hideCliCreated" | "hideSleeping"
  >;
  liveActivity: SidebarLiveActivityIndex;
}): boolean {
  const { worktree, displayOptions, liveActivity } = args;
  if (displayOptions.hideAutomationCreated && isAutomationGeneratedWorkspace(worktree)) return false;
  if (displayOptions.hideCliCreated && isCliCreatedWorkspace(worktree)) return false;
  if (
    displayOptions.hideSleeping &&
    !isSleepingSweepExemptWorkspace(worktree, true) &&
    isInactiveWorkspace(
      worktree.id,
      liveActivity.tabsByWorktree,
      liveActivity.ptyIdsByTabId,
      {},
      liveActivity.worktreeIdsWithLiveAgent
    )
  ) {
    return false;
  }
  return true;
}
