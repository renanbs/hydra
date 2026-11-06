// Rosetta D02c-023: `openSetupScriptSettings` keeps the exact Orca call
// sequence (clear search → publish `{pane:'repo'}` target → open page) and the
// repo navigation consumes it by opening `RepoSettingsDialog` on the
// local-commands anchor. Reference:
// `src/reference/components/sidebar/open-setup-script-settings.ts`.
import { describe, expect, it, vi } from 'vitest'
import { openSetupScriptSettings } from './open-setup-script-settings'
import { getRepositoryLocalCommandsSectionId } from './repo-section-ids'

describe('openSetupScriptSettings (D02c-023)', () => {
  it('clears search, publishes the repo target, then opens the page — in order', () => {
    const order: string[] = []
    const setSettingsSearchQuery = vi.fn(() => {
      order.push('search')
    })
    const openSettingsTarget = vi.fn(() => {
      order.push('target')
    })
    const openSettingsPage = vi.fn(() => {
      order.push('page')
    })

    openSetupScriptSettings({
      repoId: 'repo-1',
      hostId: 'local',
      setSettingsSearchQuery,
      openSettingsTarget,
      openSettingsPage
    })

    expect(order).toEqual(['search', 'target', 'page'])
    expect(setSettingsSearchQuery).toHaveBeenCalledWith('')
    expect(openSettingsTarget).toHaveBeenCalledWith({
      pane: 'repo',
      repoId: 'repo-1',
      hostId: 'local',
      sectionId: getRepositoryLocalCommandsSectionId('repo-1')
    })
    expect(openSettingsPage).toHaveBeenCalledTimes(1)
  })

  it('anchors the section id on the Hydra local-commands contract', () => {
    expect(getRepositoryLocalCommandsSectionId('repo-1')).toBe('repo-local-commands:repo-1')
  })
})
