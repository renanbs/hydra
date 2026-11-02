// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/worktree-parent-picker-placement.ts
//
// Geometry for the parent picker's anchored surface. The picker is virtualized, so it has a
// fixed row height and a bounded list; both are mirrored here because the anchor top has to be
// clamped against the height the surface WILL have, before React has painted it.
export const PICKER_ROW_HEIGHT = 56
export const PICKER_ROW_OVERSCAN = 6
export const PICKER_LIST_MAX_HEIGHT = 288
export const PICKER_VIEWPORT_PADDING = 12
/** Input is `h-10` inside a `py-1` wrapper over the surface's own border. */
const PICKER_INPUT_HEIGHT = 49
/** 11px `leading-none` text in a `py-2` row over a 1px divider. */
const PICKER_HEADER_HEIGHT = 28
/** The popover surface adds a 1px border top and bottom. */
const PICKER_SURFACE_BORDER_HEIGHT = 2

/** Height the picker surface will occupy for `candidateCount` rows, before it paints. */
export function estimateWorktreeParentPickerHeight(candidateCount: number): number {
  const listHeight = Math.min(
    Math.max(candidateCount, 1) * PICKER_ROW_HEIGHT,
    PICKER_LIST_MAX_HEIGHT
  )
  return PICKER_SURFACE_BORDER_HEIGHT + PICKER_HEADER_HEIGHT + PICKER_INPUT_HEIGHT + listHeight
}

/**
 * Clamp the anchor top so the whole surface stays inside the viewport.
 *
 * Why own it: a side-anchored popover is only shifted along its main axis — nothing corrects
 * vertical overflow — so a row low in the sidebar would otherwise push the list below the
 * window and out of reach. The anchor is virtual here, so the rect itself is lifted instead.
 */
export function clampWorktreeParentPickerAnchorTop(
  anchorTop: number,
  contentHeight: number,
  viewportHeight: number
): number {
  const maxTop = viewportHeight - PICKER_VIEWPORT_PADDING - contentHeight
  if (maxTop <= PICKER_VIEWPORT_PADDING) {
    return PICKER_VIEWPORT_PADDING
  }
  return Math.min(Math.max(anchorTop, PICKER_VIEWPORT_PADDING), maxTop)
}

export type WorktreeParentPickerAnchorRect = Pick<DOMRect, 'height' | 'left' | 'top' | 'width'>

/** Rows that fit the capped list; also the fallback window before the list is measured. */
export const PICKER_MAX_VISIBLE_ROWS = Math.floor(PICKER_LIST_MAX_HEIGHT / PICKER_ROW_HEIGHT)

export type WorktreeParentPickerVirtualRow = {
  index: number
  start: number
  size: number
}

/**
 * The window the list paints.
 *
 * Why a fallback: the virtualizer measures its scroll element on mount, and a portal/nested
 * container that has not been laid out yet reports a zero-height viewport — which yields an
 * empty window and a blank first paint. Painting the first capped rows covers that frame; the
 * virtualizer takes over as soon as a real height lands.
 */
export function resolveWorktreeParentPickerVirtualRows(args: {
  virtualRows: readonly WorktreeParentPickerVirtualRow[]
  candidateCount: number
}): readonly WorktreeParentPickerVirtualRow[] {
  if (args.virtualRows.length > 0 || args.candidateCount === 0) {
    return args.virtualRows
  }
  const count = Math.min(args.candidateCount, PICKER_MAX_VISIBLE_ROWS)
  return Array.from({ length: count }, (_, index) => ({
    index,
    start: index * PICKER_ROW_HEIGHT,
    size: PICKER_ROW_HEIGHT
  }))
}

/** The measured rect a virtual anchor hands to the popover, already clamped to the viewport. */
export function resolveWorktreeParentPickerAnchorRect(args: {
  anchorRect: WorktreeParentPickerAnchorRect | null
  candidateCount: number
  viewportHeight: number
}): WorktreeParentPickerAnchorRect | null {
  const { anchorRect } = args
  if (!anchorRect) {
    return null
  }
  const top = clampWorktreeParentPickerAnchorTop(
    anchorRect.top,
    // Why the full candidate count, not the filtered one: estimating from the filtered list
    // would make the surface jump every keystroke as the clamp target moves.
    estimateWorktreeParentPickerHeight(args.candidateCount),
    args.viewportHeight
  )
  return { left: anchorRect.left, top, width: anchorRect.width, height: anchorRect.height }
}
