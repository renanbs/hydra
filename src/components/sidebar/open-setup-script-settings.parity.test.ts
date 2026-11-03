import { describe, expect, it, vi } from 'vitest'
import {
  getRepositoryLocalCommandsSectionId,
  openSetupScriptSettings
} from './open-setup-script-settings'

describe('openSetupScriptSettings (D02c-023)', () => {
  it('clears the settings search before targeting the repo local-commands section', () => {
    const calls: string[] = []
    const setSettingsSearchQuery = vi.fn(() => calls.push('search'))
    const openSettingsTarget = vi.fn(() => calls.push('target'))
    const openSettingsPage = vi.fn(() => calls.push('page'))

    openSetupScriptSettings({
      repoId: 'repo-1',
      hostId: 'local' as never,
      setSettingsSearchQuery,
      openSettingsTarget,
      openSettingsPage
    })

    expect(setSettingsSearchQuery).toHaveBeenCalledWith('')
    expect(openSettingsTarget).toHaveBeenCalledWith({
      pane: 'repo',
      repoId: 'repo-1',
      hostId: 'local',
      sectionId: getRepositoryLocalCommandsSectionId('repo-1')
    })
    expect(openSettingsPage).toHaveBeenCalledTimes(1)
    expect(calls).toEqual(['search', 'target', 'page'])
  })
})
