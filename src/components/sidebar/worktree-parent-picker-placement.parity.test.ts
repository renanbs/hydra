import { describe, expect, it } from 'vitest'
import {
  PICKER_LIST_MAX_HEIGHT,
  PICKER_ROW_HEIGHT,
  PICKER_VIEWPORT_PADDING,
  clampWorktreeParentPickerAnchorTop,
  estimateWorktreeParentPickerHeight,
  resolveWorktreeParentPickerAnchorRect
} from './worktree-parent-picker-placement'

describe('estimateWorktreeParentPickerHeight (D06-025)', () => {
  it('grows by one row per candidate until the list cap', () => {
    const oneRow = estimateWorktreeParentPickerHeight(1)
    expect(estimateWorktreeParentPickerHeight(2)).toBe(oneRow + PICKER_ROW_HEIGHT)
    expect(estimateWorktreeParentPickerHeight(100)).toBe(estimateWorktreeParentPickerHeight(8))
  })

  it('never estimates an empty list smaller than one row', () => {
    expect(estimateWorktreeParentPickerHeight(0)).toBe(estimateWorktreeParentPickerHeight(1))
  })

  it('caps the list at the picker max height', () => {
    const listHeight = estimateWorktreeParentPickerHeight(50) - estimateWorktreeParentPickerHeight(1)
    expect(listHeight).toBe(PICKER_LIST_MAX_HEIGHT - PICKER_ROW_HEIGHT)
  })
})

describe('clampWorktreeParentPickerAnchorTop (D06-025)', () => {
  it('lifts the anchor so the surface fits above the viewport bottom padding', () => {
    expect(clampWorktreeParentPickerAnchorTop(700, 300, 800)).toBe(800 - 12 - 300)
  })

  it('keeps an anchor that already fits', () => {
    expect(clampWorktreeParentPickerAnchorTop(120, 300, 800)).toBe(120)
  })

  it('pins to the viewport padding when the surface is taller than the window', () => {
    expect(clampWorktreeParentPickerAnchorTop(700, 1200, 800)).toBe(PICKER_VIEWPORT_PADDING)
  })

  it('never pulls an anchor above the padding', () => {
    expect(clampWorktreeParentPickerAnchorTop(-40, 300, 800)).toBe(PICKER_VIEWPORT_PADDING)
  })
})

describe('resolveWorktreeParentPickerAnchorRect (D06-025)', () => {
  it('keeps the anchor horizontal geometry and clamps only the top', () => {
    const rect = resolveWorktreeParentPickerAnchorRect({
      anchorRect: { left: 32, top: 640, width: 220, height: 34 },
      candidateCount: 4,
      viewportHeight: 700
    })

    expect(rect).toEqual({
      left: 32,
      width: 220,
      height: 34,
      top: 700 - PICKER_VIEWPORT_PADDING - estimateWorktreeParentPickerHeight(4)
    })
  })

  it('returns null without a measured anchor', () => {
    expect(
      resolveWorktreeParentPickerAnchorRect({
        anchorRect: null,
        candidateCount: 2,
        viewportHeight: 700
      })
    ).toBeNull()
  })
})
