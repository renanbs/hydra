// Orca `rows/repo-header-event-guards.ts`: a section header is a role=button with
// nested controls (menu trigger, create button, drag handle). Keyboard/click events
// that originate inside those controls must never toggle collapse or start a drag.
const HEADER_ACTION_SELECTOR =
  'button, [role="menu"], [data-repo-header-action], [data-host-header-action], [data-workspace-pin-drop-target]';

function targetInsideAction(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(HEADER_ACTION_SELECTOR) !== null;
}

/** True when a header keydown came from a nested control, not the header itself. */
export function shouldIgnoreRepoHeaderToggle(event: {
  target: EventTarget | null;
  key: string;
}): boolean {
  if (event.key !== "Enter" && event.key !== " ") return false;
  return targetInsideAction(event.target);
}
