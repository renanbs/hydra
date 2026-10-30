// Orca `useSidebarRevealRequests`: revealing the active workspace must ask before it
// changes the user's filters — only the filters hiding the target are adjusted, and
// only after confirmation.
import type { WorkspaceDisplayOptions } from "./WorkspaceOptionsMenu";

export type RevealTargetFilterTraits = {
  projectId: string;
  isMainWorktree: boolean;
  automationCreated: boolean;
  cliCreated: boolean;
  detachedHead: boolean;
  /** Filters that do not depend on the workspace kind. */
  hostVisible: boolean;
  sleepingHidden: boolean;
};

/** True when at least one active filter would hide the target row. */
export function isRevealTargetHiddenByFilters(
  displayOptions: WorkspaceDisplayOptions,
  target: RevealTargetFilterTraits
): boolean {
  if (
    displayOptions.filterProjectIds?.length &&
    !displayOptions.filterProjectIds.includes(target.projectId)
  ) {
    return true;
  }
  if (!target.hostVisible) return true;
  if (displayOptions.hideDefaultBranch && target.isMainWorktree) return true;
  if (displayOptions.hideAutomationCreated && target.automationCreated) return true;
  if (displayOptions.hideCliCreated && target.cliCreated) return true;
  if (displayOptions.hideDetachedHead && target.detachedHead) return true;
  if (displayOptions.hideSleeping && target.sleepingHidden) return true;
  return false;
}
