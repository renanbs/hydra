// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/worktree-card-dom-events.ts
//
// True when the event happened on the card surface itself rather than on a
// descendant control that owns its own interaction (buttons, inputs, links).
// Cards attach click/drag handlers to a container that wraps those controls, so
// without this guard a click on "delete" also selects the workspace and a
// drag started on a button tears the card out of the list.
export function isEventTargetInsideCurrentTarget(
  currentTarget: EventTarget | null,
  target: EventTarget | null
): boolean {
  if (!(currentTarget instanceof Node) || !(target instanceof Node)) {
    return false
  }
  // Why: `contains` already answers true for text nodes and the node itself, so
  // portaled content (dropdowns, hover cards) is never mistaken for a local click.
  return currentTarget.contains(target)
}
