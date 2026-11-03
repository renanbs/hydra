// Orca parity: the board sheet portals to document.body and cannot inherit the
// window chrome from layout, so the shared metrics module reserves it explicitly.
import { describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import {
  STATUS_BAR_RESERVE_HEIGHT,
  WORKSPACE_TOP_CHROME_HEIGHT,
} from './workspace-board-chrome-metrics'
import { useWorkspaceBoardGeometry } from './use-workspace-board-geometry'

describe('workspace board chrome metrics (Orca parity)', () => {
  it('exports the titlebar and status-bar reserves', () => {
    expect(WORKSPACE_TOP_CHROME_HEIGHT).toBe(36)
    expect(STATUS_BAR_RESERVE_HEIGHT).toBe(24)
  })

  it('uses both constants as the pre-measurement sheet geometry', () => {
    const { result } = renderHook(() =>
      useWorkspaceBoardGeometry({ current: null }, false)
    )
    expect(result.current.top).toBe(WORKSPACE_TOP_CHROME_HEIGHT)
    expect(result.current.bottom).toBe(STATUS_BAR_RESERVE_HEIGHT)
  })
})
