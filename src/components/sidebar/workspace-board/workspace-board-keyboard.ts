/**
 * The board's own keyboard scoping: which key events belong to the board rather than to a text
 * field, and which keydown is the board's select-all. The selection model itself is shared with
 * the sidebar list (`../worktree-selection`); only these two board-scoped rules live here.
 */

/**
 * True while a key event belongs to a text field rather than to the board: the search field, an
 * inline rename, a `contenteditable` — or xterm's hidden input textarea, which is *not* a real
 * text field, so treating it as one would block the board's shortcuts while a terminal has focus.
 */
export function isWorkspaceBoardTextEntryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }
  if (target.classList.contains('xterm-helper-textarea')) {
    return false
  }
  if (target.isContentEditable) {
    return true
  }
  return target.closest('input, textarea, select, [contenteditable=""]') !== null
}

/**
 * True when a keydown is the board's select-all (`Mod+A`, the web-first convention for
 * "select every item the surface is showing"). The board's cards are not a listbox, so the
 * shortcut is scoped to the board element and guarded against text fields by the caller.
 */
export function isWorkspaceBoardSelectAllShortcut(
  event: Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'>
): boolean {
  return (
    event.key.toLowerCase() === 'a' &&
    (event.metaKey || event.ctrlKey) &&
    !event.altKey &&
    !event.shiftKey
  )
}
