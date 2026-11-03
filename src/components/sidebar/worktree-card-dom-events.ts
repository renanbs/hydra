/** True when the event happened on the card surface itself rather than on a
 *  descendant control that owns its own interaction (buttons, inputs, links).
 *  Cards attach click/drag handlers to a container that wraps those controls, so
 *  without this guard a click on "delete" also selects the workspace and a
 *  drag started on a button tears the card out of the list. */
export function isEventTargetInsideCurrentTarget(
  currentTarget: EventTarget | null,
  target: EventTarget | null
): boolean {
  return currentTarget instanceof Node && target instanceof Node
    ? currentTarget === target || currentTarget.contains(target)
    : false
}
