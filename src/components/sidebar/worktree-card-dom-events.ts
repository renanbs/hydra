// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/worktree-card-dom-events.ts
export function isEventTargetInsideCurrentTarget(
  currentTarget: EventTarget | null,
  target: EventTarget | null
): boolean {
  if (!(currentTarget instanceof Node) || !(target instanceof Node)) {
    return false
  }
  // Why: `contains` already answers true for text nodes, so portaled content
  // (dropdowns, hover cards) is never mistaken for a local click.
  return currentTarget.contains(target)
}
