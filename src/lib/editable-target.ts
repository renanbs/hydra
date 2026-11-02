// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: lib/editable-target.ts
/**
 * A typed field owns Delete/Backspace; the sidebar's immediate-delete shortcut
 * must never fire while one of them has focus.
 */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }
  // Why: xterm's hidden input textarea is not a real text field; treating it as
  // one would block sidebar shortcuts while a terminal has focus.
  if (target.classList.contains('xterm-helper-textarea')) {
    return false
  }
  if (target.isContentEditable) {
    return true
  }
  return (
    target.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]') !==
    null
  )
}
