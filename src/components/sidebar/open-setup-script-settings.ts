import type { ExecutionHostId } from '../../shared/execution-host'

/**
 * Section anchor for the repository's local hook commands. Hydra has no
 * dedicated repo settings pane yet, so the id is the navigation contract the
 * settings surface must eventually honor; opening the page still clears any
 * stale search that would hide the section.
 */
export function getRepositoryLocalCommandsSectionId(repoId: string): string {
  return `repo-local-commands:${repoId}`
}

export function openSetupScriptSettings(input: {
  repoId: string
  hostId: ExecutionHostId
  setSettingsSearchQuery: (query: string) => void
  openSettingsTarget: (target: {
    pane: 'repo'
    repoId: string
    hostId: ExecutionHostId
    sectionId: string
  }) => void
  openSettingsPage: () => void
}): void {
  const { hostId, openSettingsPage, openSettingsTarget, repoId, setSettingsSearchQuery } = input
  // Imported setup commands are local repo settings; a stale Settings search
  // must not hide the exact editor this action opens.
  setSettingsSearchQuery('')
  openSettingsTarget({
    pane: 'repo',
    repoId,
    hostId,
    sectionId: getRepositoryLocalCommandsSectionId(repoId)
  })
  openSettingsPage()
}
