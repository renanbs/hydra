import type { GitWorktreeInfo } from "../components/sidebar/types";
import type { VisibleWorktreeShortcutTarget } from "../components/sidebar/visible-worktrees";

/** Zero-based index for Ctrl/Cmd+1–9. Shift and Alt stay free for other chords. */
export function worktreeShortcutIndexFromKey(event: {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}): number | null {
  if (!(event.ctrlKey || event.metaKey) || event.shiftKey || event.altKey) return null;
  if (event.key.length !== 1 || event.key < "1" || event.key > "9") return null;
  return event.key.charCodeAt(0) - "1".charCodeAt(0);
}

/** Sidebar search and editors keep the chord. The xterm textarea does not — that is where the jump is used. */
export function isWorktreeIndexJumpBlockedByTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.closest(".xterm")) return false;
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
}

export function findWorktreeForShortcutIndex(
  index: number,
  targets: readonly VisibleWorktreeShortcutTarget[],
  worktrees: readonly GitWorktreeInfo[]
): GitWorktreeInfo | null {
  const target = targets[index];
  if (!target) return null;
  return worktrees.find((worktree) => worktree.id === target.id || worktree.path === target.id) ?? null;
}
