import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import WorkspaceBoardSheet from './WorkspaceBoardSheet'
import {
  STATUS_BAR_RESERVE_HEIGHT,
  WORKSPACE_TOP_CHROME_HEIGHT,
} from './workspace-board-chrome-metrics'

function renderSheet(overrides: {
  dragPreview?: boolean
  preserveOpenForMenu?: boolean
} = {}): HTMLElement | null {
  render(
    <WorkspaceBoardSheet
      geometry={{ left: 280, top: 36, bottom: 24 }}
      open
      dragPreview={overrides.dragPreview}
      preserveOpenForMenu={overrides.preserveOpenForMenu}
      onOpenChange={vi.fn()}
    >
      <div>board body</div>
    </WorkspaceBoardSheet>
  )
  return document.body.querySelector<HTMLElement>('[data-workspace-board-sheet]')
}

describe('WorkspaceBoardSheet layout (D08-007)', () => {
  it('anchors the non-modal sheet to the measured box and marks the tour surface', () => {
    const sheet = renderSheet()
    expect(sheet).not.toBeNull()
    expect(sheet).toHaveAttribute('data-slot', 'sheet-content')
    expect(sheet).toHaveAttribute('data-contextual-tour-target', 'workspace-board-surface')
    expect(sheet).not.toHaveAttribute('data-workspace-board-drag-preview')
    expect(sheet?.style.left).toBe('280px')
    expect(sheet?.style.top).toBe('36px')
    expect(sheet?.style.bottom).toBe('24px')
    expect(sheet?.style.height).toBe('auto')
    // Why not the whole `min()`: jsdom keeps the declaration, but the measured left
    // is what the layout depends on and what this asserts.
    expect(sheet?.style.width).toContain('1294px')
  })

  it('marks a drag-preview sheet without changing the box', () => {
    const sheet = renderSheet({ dragPreview: true })
    expect(sheet).toHaveAttribute('data-workspace-board-drag-preview', 'true')
    expect(sheet?.style.left).toBe('280px')
  })

  it('keeps DOM order and produces a sheet with no native close button', () => {
    const sheet = renderSheet()
    expect(sheet?.querySelector('[data-slot="sheet-content"] button[aria-label="Close"]')).toBeNull()
    expect(sheet?.textContent).toContain('board body')
  })

  it('ships chrome fallbacks that match the real titlebar and status bar', () => {
    expect(WORKSPACE_TOP_CHROME_HEIGHT).toBe(36)
    expect(STATUS_BAR_RESERVE_HEIGHT).toBe(24)
  })
})
