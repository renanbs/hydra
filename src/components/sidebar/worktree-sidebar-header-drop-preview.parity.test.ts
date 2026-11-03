// Orca parity: `worktree-sidebar-header-drop-preview.ts` — container/scroll
// translation, measured content bounds, boundary delegation and the interior
// snap that keeps section bodies from becoming drop dead zones.
import { describe, expect, it } from 'vitest'
import {
  computeWorktreeSidebarHeaderDropPreview,
  type WorktreeSidebarHeaderDragRect,
} from './worktree-sidebar-header-drop-preview'

const RECTS: WorktreeSidebarHeaderDragRect[] = [
  { headerIndex: 0, top: 0, bottom: 20, sectionBottom: 200 },
  { headerIndex: 1, top: 220, bottom: 240 },
]

function preview(args: {
  pointerY: number
  containerTop?: number
  scrollTop?: number
  rects?: WorktreeSidebarHeaderDragRect[]
  contentBottom?: number
}) {
  return computeWorktreeSidebarHeaderDropPreview({
    pointerY: args.pointerY,
    containerTop: args.containerTop ?? 0,
    scrollTop: args.scrollTop ?? 0,
    rects: args.rects ?? RECTS,
    headerCount: (args.rects ?? RECTS).length,
    getId: (rect) => String(rect.headerIndex),
    contentBottom: args.contentBottom,
  })
}

describe('worktree sidebar header drop preview (Orca parity)', () => {
  it('translates the pointer into local scroll coordinates', () => {
    const result = preview({ pointerY: 105, containerTop: 100, scrollTop: 10 })
    // localY = 105 - 100 + 10 = 15: below the first header's midpoint (10), so the
    // indicator parks above the next header (220 - 4).
    expect(result).toEqual({ dropIndex: 1, dropIndicatorY: 216 })
  })

  it('does not fabricate a slot below the measured content end', () => {
    expect(preview({ pointerY: 500, contentBottom: 200 })).toBeNull()
  })

  it('delegates far outside bounds to the boundary helper and returns null', () => {
    expect(preview({ pointerY: -500 })).toBeNull()
  })

  it('keeps an edge-zone release inside the list', () => {
    const result = preview({ pointerY: 2 })
    expect(result).toEqual({ dropIndex: 0, dropIndicatorY: 0 })
  })

  it('snaps section-body and empty-gap pointers to the nearest header boundary', () => {
    // localY 150 sits inside the first section body (20..200), not a header band.
    expect(preview({ pointerY: 150 })).toEqual({ dropIndex: 1, dropIndicatorY: 204 })
  })

  it('clamps the indicator to the scroll offset', () => {
    const rects: WorktreeSidebarHeaderDragRect[] = [
      { headerIndex: 0, top: 10, bottom: 30 },
    ]
    expect(preview({ pointerY: -15, scrollTop: 30, rects })).toEqual({
      dropIndex: 0,
      dropIndicatorY: 30,
    })
  })

  it('returns null with no measured headers', () => {
    expect(preview({ pointerY: 10, rects: [] })).toBeNull()
  })
})
