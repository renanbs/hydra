// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/project-header-drag-contract.ts
//
// Shared qualification for the header tiers: a pointer may only arm a reorder
// from the title surface, and every action control (menu, create, collapse)
// must stay clickable instead of starting a drag.

export const REPO_HEADER_DRAG_HANDLE_SELECTOR = '[data-repo-header-drag-handle]'

/**
 * Actions inside a header (collapse chevron, menu, create) must not arm a drag.
 * Shared with project-group headers because both reuse `ProjectHeaderActions`.
 */
export const REPO_HEADER_ACTION_SELECTOR =
  '[data-repo-header-actions], [data-repo-header-action], [data-repo-header-collapse-affordance], button, a, input, textarea, select, [contenteditable=""], [contenteditable="true"]'

export function isProjectHeaderDragHandleTarget(
  target: EventTarget | null,
  currentTarget: HTMLElement
): boolean {
  // Why Element: the project icon is an <svg>, whose events are SVGElement, not HTMLElement.
  if (!(target instanceof Element)) {
    return false
  }
  const dragHandle = target.closest(REPO_HEADER_DRAG_HANDLE_SELECTOR)
  return dragHandle !== null && currentTarget.contains(dragHandle)
}

export function isRepoHeaderActionTarget(
  target: EventTarget | null,
  currentTarget: HTMLElement
): boolean {
  if (!(target instanceof Element) || target === currentTarget) {
    return false
  }
  return currentTarget.contains(target) && target.closest(REPO_HEADER_ACTION_SELECTOR) !== null
}
