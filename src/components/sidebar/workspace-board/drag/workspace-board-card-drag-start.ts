/**
 * Why the modifier guard: on the board the plain primary press is the only gesture this
 * increment owns. Shift/Cmd/Ctrl presses are reserved for the selection gestures the board
 * has not shipped yet, and a touch press belongs to scrolling — taking either here would
 * make a later increment fight this one for the same press.
 */
export function shouldStartWorkspaceBoardCardPointerDrag(
  event: Pick<PointerEvent, 'button' | 'pointerType' | 'shiftKey' | 'metaKey' | 'ctrlKey'>
): boolean {
  if (event.button !== 0 || event.pointerType === 'touch') {
    return false
  }
  return !event.shiftKey && !event.metaKey && !event.ctrlKey
}
