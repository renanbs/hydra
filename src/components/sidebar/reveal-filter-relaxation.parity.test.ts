import { describe, expect, it } from 'vitest'
import { relaxFiltersForReveal } from './reveal-filter-relaxation'
import type { WorkspaceDisplayOptions } from './WorkspaceOptionsMenu'

const BASE: WorkspaceDisplayOptions = {
  groupBy: 'repo',
  sortBy: 'agent-activity',
  hideSleeping: false,
  hideDefaultBranch: true,
  hideAutomationCreated: true,
  hideCliCreated: true,
  hideDetachedHead: true,
}

const target = (overrides: Partial<Parameters<typeof relaxFiltersForReveal>[1]> = {}) => ({
  path: '/repo/feature',
  projectId: 'repo_1',
  isMainWorktree: false,
  automationCreated: false,
  cliCreated: false,
  detachedHead: false,
  ...overrides,
})

describe('relaxFiltersForReveal (D03b-018)', () => {
  it('relaxes only the filters blocking an automation workspace', () => {
    const { displayOptions, changed } = relaxFiltersForReveal(BASE, target({ automationCreated: true }))
    expect(changed).toBe(true)
    expect(displayOptions.hideAutomationCreated).toBe(false)
    expect(displayOptions.hideCliCreated).toBe(true)
    expect(displayOptions.hideDetachedHead).toBe(true)
    expect(displayOptions.hideDefaultBranch).toBe(true)
  })

  it('re-enables a hidden project filter without dropping the others', () => {
    const options = { ...BASE, filterProjectIds: ['repo_2'] }
    const { displayOptions } = relaxFiltersForReveal(options, target())
    expect(displayOptions.filterProjectIds).toEqual(['repo_2', 'repo_1'])
  })

  it('relaxes the primary checkout when the default branch is hidden', () => {
    const { displayOptions } = relaxFiltersForReveal(BASE, target({ isMainWorktree: true }))
    expect(displayOptions.hideDefaultBranch).toBe(false)
  })

  it('is a no-op when no filter blocks the target', () => {
    const open = { ...BASE, hideDefaultBranch: false, filterProjectIds: [] }
    const { displayOptions, changed } = relaxFiltersForReveal(open, target())
    expect(changed).toBe(false)
    expect(displayOptions).toBe(open)
  })
})
