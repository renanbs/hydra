// Orca `use-reveal-requests` helpers: resolve a reveal target by host-qualified
// identity or folder-workspace key, and derive the collapsed sections a reveal must
// expand before the row can scroll into view.
import type { FolderWorkspace } from "../../shared/folder-workspace-types";
import { getWorktreeHostIdentity } from "../../shared/worktree/host-qualified-identity";
import type { Worktree } from "../../shared/worktree/types";
import { folderWorkspaceKey } from "../../shared/workspace-scope";
import { PINNED_GROUP_KEY } from "./worktree-list/grouping/group-keys";

export type SidebarRevealTarget =
  | { kind: "worktree"; worktree: Worktree }
  | { kind: "folder-workspace"; folderWorkspace: FolderWorkspace };

/** `getKnownSidebarWorktreeById`: identity first, then the folder-workspace key. */
export function getKnownSidebarWorktreeById(
  id: string,
  worktreeMap: ReadonlyMap<string, Worktree>,
  folderWorkspaces: readonly FolderWorkspace[],
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
  folderWorkspaces: readonly FolderWorkspace[]
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
