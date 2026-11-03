import { describe, expect, it } from 'vitest'
import {
  AGENT_DASHBOARD_WINDOW_LABEL,
  isAgentDashboardPopoutLocation,
  isAgentDashboardPopoutOpen,
  isTauriRuntime,
  openAgentDashboardPopout,
} from './agent-dashboard-popout'

describe('agent dashboard pop-out routing (D01-028)', () => {
  it('recognises only its own window query', () => {
    expect(isAgentDashboardPopoutLocation('?window=agent-dashboard')).toBe(true)
    expect(isAgentDashboardPopoutLocation('?window=other')).toBe(false)
    expect(isAgentDashboardPopoutLocation('')).toBe(false)
  })

  it('uses a valid Tauri window label', () => {
    expect(AGENT_DASHBOARD_WINDOW_LABEL).toMatch(/^[a-zA-Z0-9\-/:_]+$/)
  })

  it('reports unavailable outside Tauri instead of creating a window', async () => {
    expect(isTauriRuntime()).toBe(false)
    await expect(openAgentDashboardPopout()).resolves.toBe('unavailable')
    await expect(isAgentDashboardPopoutOpen()).resolves.toBe(false)
  })
})
