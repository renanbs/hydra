// Orca parity (`renderer/src/components/sidebar/worktree-list/rows/folder-row.tsx`):
// the folder row's left lane carries the WORKSPACE STATUS dot — `done`/`active`
// green, `inactive` grey, `working` spinner — not the folder's path health, which
// Orca renders separately as a FolderX badge on a missing path.
import type { WorktreeSession } from "../components/sidebar/types";
import type { WorktreeStatus } from "./worktree-status";

/**
 * Orca derives the dot from live PTYs and agent rows (`getWorktreeStatus`).
 * Hydra has no per-pane PTY index, so the equivalent signals are the workspace's
 * sessions (agent state) and whether a terminal tab is still mounted for the path;
 * closing the last terminal drops the workspace to `inactive` (grey), exactly the
 * transition Orca shows.
 */
export function folderWorkspaceStatus(args: {
  sessions: readonly WorktreeSession[];
  hasLiveTerminal: boolean;
}): WorktreeStatus {
  const state = args.sessions[0]?.state;
  if (state === "working") return "working";
  if (state === "blocked" || state === "waiting") return "permission";
  if (state === "done") return "done";
  if (args.hasLiveTerminal) return "active";
  return "inactive";
}
