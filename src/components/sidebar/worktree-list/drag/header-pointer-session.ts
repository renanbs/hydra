// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: header-drag-click-swallow.ts + header-drag-pointer-release.ts
//
// Two small guards every pointer-driven header drag shares:
// - a promoted drag is followed by a click on the same handle, which would also toggle
//   the section the user just reordered, so that one click is swallowed;
// - a fast click's pointerup can land before the drag's window listener is armed, so a
//   move reporting no held button ends the armed session instead of promoting it.

/** Timer handle the fallback removal owns; the platform type stays private. */
export type HeaderDragTimeoutHandle = ReturnType<typeof setTimeout>;

/** Swallow the click that follows a completed header drag. Returns the fallback timeout. */
export function swallowNextClickOnDragHandle(handleEl: HTMLElement): HeaderDragTimeoutHandle {
  const swallow = (event: MouseEvent): void => {
    const target = event.target as Node | null;
    if (target && handleEl.contains(target)) {
      event.stopPropagation();
      event.preventDefault();
    }
    window.removeEventListener("click", swallow, true);
  };
  window.addEventListener("click", swallow, true);
  return setTimeout(() => window.removeEventListener("click", swallow, true), 0);
}

/**
 * True when a pointermove arrives with no button held: the pointerup that should have
 * ended the armed drag never reached the window listeners (a fast click, or a release
 * that raced the effect that subscribes them).
 */
export function hasPointerBeenReleased(event: Pick<PointerEvent, "buttons">): boolean {
  return event.buttons === 0;
}

/** Pixel distance a press must travel before it becomes a drag (Orca's 4px threshold). */
export const HEADER_DRAG_THRESHOLD_PX = 4;

export function isHeaderDragPromoted(args: {
  startX: number;
  startY: number;
  clientX: number;
  clientY: number;
}): boolean {
  const dx = args.clientX - args.startX;
  const dy = args.clientY - args.startY;
  return dx * dx + dy * dy >= HEADER_DRAG_THRESHOLD_PX * HEADER_DRAG_THRESHOLD_PX;
}
