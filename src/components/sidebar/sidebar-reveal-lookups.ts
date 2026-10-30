// Orca `use-reveal-requests` helpers: resolve a reveal target by host-qualified
// identity or folder-workspace key, and derive the collapsed sections a reveal must
// expand before the row can scroll into view.
import type { FolderWorkspace } from "../../shared/folder-workspace-types";
import { getWorktreeHostIdentity } from "../../shared/worktree/host-qualified-identity";
import type { Worktree } from "../../shared/worktree/types";
import { folderWorkspaceKey } from "../../shared/workspace-scope";
import { PINNED_GROUP_KEY } from "./worktree-list/grouping/group-keys";
import { getWorktreeOptionId } from "./worktree-list/viewport/option-id";

/**
 * What a reveal needs from a folder workspace: its id, its owning group and the folder
 * path it paints. The sidebar prop carries exactly these beyond `name`.
 */
export type SidebarRevealFolderWorkspace = Pick<
  FolderWorkspace,
  "id" | "projectGroupId" | "folderPath"
>;

export type SidebarRevealTarget =
  | { kind: "worktree"; worktree: Worktree }
  | { kind: "folder-workspace"; folderWorkspace: SidebarRevealFolderWorkspace };

/** `getKnownSidebarWorktreeById`: identity first, then the folder-workspace key. */
export function getKnownSidebarWorktreeById(
  id: string,
  worktreeMap: ReadonlyMap<string, Worktree>,
  folderWorkspaces: readonly SidebarRevealFolderWorkspace[],
  worktrees: readonly Worktree[]
): SidebarRevealTarget | null {
  const byId = worktreeMap.get(id);
  if (byId) return { kind: "worktree", worktree: byId };
  const byIdentity = worktrees.find(
    (candidate) => getWorktreeHostIdentity(candidate) === id
  );
  if (byIdentity) return { kind: "worktree", worktree: byIdentity };
  const folderWorkspace = folderWorkspaces.find(
    (candidate) => folderWorkspaceKey(candidate.id) === id
  );
  return folderWorkspace ? { kind: "folder-workspace", folderWorkspace } : null;
}

/** `sidebarWorkspaceStillExists`: the row a pending reveal names is still in the tree. */
export function sidebarWorkspaceStillExists(
  target: SidebarRevealTarget,
  worktrees: readonly Worktree[],
  folderWorkspaces: readonly SidebarRevealFolderWorkspace[]
): boolean {
  if (target.kind === "worktree") {
    const identity = getWorktreeHostIdentity(target.worktree);
    return worktrees.some((candidate) => getWorktreeHostIdentity(candidate) === identity);
  }
  return folderWorkspaces.some(
    (candidate) => candidate.id === target.folderWorkspace.id
  );
}

/**
 * `getFolderWorkspaceRevealGroupKeys`: the folder workspace's own row plus every
 * project-group ancestor, so a reveal expands the whole nesting chain.
 */
export function getFolderWorkspaceRevealGroupKeys(
  folderWorkspace: Pick<FolderWorkspace, "id" | "projectGroupId">,
  projectGroups: readonly { id: string; parentGroupId?: string | null }[]
): string[] {
  const keys: string[] = [];
  const byId = new Map(projectGroups.map((group) => [group.id, group]));
  let current = byId.get(folderWorkspace.projectGroupId);
  const seen = new Set<string>();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    keys.unshift(`project-group:${current.id}`);
    current = current.parentGroupId ? byId.get(current.parentGroupId) : undefined;
  }
  return keys;
}

/** `getPinnedWorktreeRevealCollapsedGroupKeys`: expand the Pinned section. */
export function getPinnedWorktreeRevealCollapsedGroupKeys(): string[] {
  return [PINNED_GROUP_KEY];
}

/**
 * Workspaces a pending reveal may resolve against: non-archived rows, narrowed to the
 * requested execution host when the request names one. A row without its own host stamp
 * can still belong to that host (the scan row's repo carries it), so it stays a candidate.
 */
export function getRevealCandidateWorktrees(
  worktrees: readonly Worktree[],
  executionHostId?: string
): Worktree[] {
  return worktrees.filter(
    (worktree) =>
      !worktree.isArchived &&
      (!executionHostId || !worktree.hostId || worktree.hostId === executionHostId)
  );
}

/**
 * Option ids the mounted viewport publishes for a reveal target (Orca
 * `mounted-row-reveal.ts` reveal-by-id leg).
 *
 * A worktree row is keyed `${sectionKey}:${hostIdentity}` by the row pipeline, so the
 * reveal has to try every section the row can paint under (natural group, project-group
 * ancestry, Pinned duplicate). A folder-workspace row keeps its own key. The caller
 * prefers these ids only when the card's `data-worktree-path` is not mounted.
 */
export function getRevealMountedOptionIds(args: {
  sectionKeys: readonly string[];
  worktree?: Pick<Worktree, "id" | "hostId"> | null;
  folderWorkspace?: Pick<FolderWorkspace, "id"> | null;
}): string[] {
  const ids = new Set<string>();
  if (args.worktree) {
    const identity = getWorktreeHostIdentity(args.worktree);
    for (const sectionKey of args.sectionKeys) {
      ids.add(getWorktreeOptionId(`${sectionKey}:${identity}`));
    }
  }
  if (args.folderWorkspace) {
    ids.add(getWorktreeOptionId(`folder-workspace:${args.folderWorkspace.id}`));
  }
  return [...ids];
}
