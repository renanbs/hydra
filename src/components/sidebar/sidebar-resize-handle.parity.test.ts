// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/sidebar-resize-handle.test.ts
//
// D15a-010: the seam hit target must be 12px wide and straddle the border, not a
// 2px line inside the sidebar, and the painted line must be 1px so the hover
// target never looks like a scrollbar of its own. Card content must stay clear of
// the target or the last row's actions become unreachable.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  WORKTREE_SIDEBAR_RESIZE_HANDLE_CLASS_NAME,
  WORKTREE_SIDEBAR_RESIZE_HANDLE_LINE_CLASS_NAME
} from './SidebarChrome'

function getWorktreeSidebarScrollbarPaddingRight(): number {
  const css = readFileSync(resolve(process.cwd(), 'src/App.css'), 'utf8')
  const block = css.match(/\.worktree-sidebar-scrollbar\s*\{(?<body>[^}]*)\}/)?.groups?.body ?? ''
  const value = block.match(/padding-right:\s*(?<px>\d+)px/)?.groups?.px
  return value ? Number(value) : Number.NaN
}

describe('worktree sidebar resize handle (D15a-010)', () => {
  it('keeps a wide hit target that straddles the sidebar seam', () => {
    const classes = new Set(WORKTREE_SIDEBAR_RESIZE_HANDLE_CLASS_NAME.split(/\s+/))
    expect(classes.has('w-3')).toBe(true)
    expect(classes.has('-right-1.5')).toBe(true)
    expect(classes.has('top-0')).toBe(true)
    expect(classes.has('z-10')).toBe(true)
    expect(classes.has('w-px')).toBe(false)
  })

  it('paints a one-pixel line that reacts to hover and drag', () => {
    const classes = new Set(WORKTREE_SIDEBAR_RESIZE_HANDLE_LINE_CLASS_NAME.split(/\s+/))
    expect(classes.has('w-px')).toBe(true)
    expect(classes.has('group-hover:bg-ring/50')).toBe(true)
    expect(classes.has('group-active:bg-ring')).toBe(true)
  })

  it('keeps card content clear of the resize target', () => {
    expect(getWorktreeSidebarScrollbarPaddingRight()).toBeGreaterThanOrEqual(4)
  })
})
