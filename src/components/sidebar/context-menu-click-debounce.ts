// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/use-worktree-context-menu.ts
/** A card/menu opened under the pointer must not also receive the click that opened it. */
export const CONTEXT_MENU_CLICK_SUPPRESSION_MS = 500;

export function shouldSuppressContextMenuFollowUpClick(
  openedAt: number,
  now: number
): boolean {
  return now - openedAt < CONTEXT_MENU_CLICK_SUPPRESSION_MS;
}
