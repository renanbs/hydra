// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/project-group-header-drag-contract.ts
import { REPO_HEADER_ACTION_SELECTOR } from './project-header-drag-contract'

export const PROJECT_GROUP_HEADER_DRAG_HANDLE_SELECTOR =
  '[data-project-group-header-drag-handle]'

export function isProjectGroupHeaderDragHandleTarget(
  target: EventTarget | null,
  currentTarget: HTMLElement
): boolean {
  // Why Element: the group icon renders as an <svg>, so pressing it makes the
  // event target an SVGElement (not an HTMLElement). Match Element so dragging
  // by the icon still arms the drag; closest/contains work on any Element.
  if (!(target instanceof Element)) {
    return false
  }
  const dragHandle = target.closest(PROJECT_GROUP_HEADER_DRAG_HANDLE_SELECTOR)
  return dragHandle !== null && currentTarget.contains(dragHandle)
}

export function isProjectGroupHeaderActionTarget(
  target: EventTarget | null,
  currentTarget: HTMLElement
): boolean {
  // Why shared selector: both header kinds reuse ProjectHeaderActions markup, so
  // an overlay gap must never arm drag/toggle on either.
  if (!(target instanceof Element) || target === currentTarget) {
    return false
  }
  return currentTarget.contains(target) && target.closest(REPO_HEADER_ACTION_SELECTOR) !== null
}
