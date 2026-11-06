// Adapter over `src/reference/components/sidebar/open-setup-script-settings.ts`
// (verbatim Orca, pinned in `src/reference/REVISION`).
//
// Rosetta D02c-023: the reference routes `{pane:'repo'}` through the global
// Settings surface (`openSettingsTarget` + `openSettingsPage`). Hydra has no
// `repo` pane in `SettingsModal` — the repo-scoped surface is
// `RepoSettingsDialog` (owned by `WorktreeSidebar`). This adapter keeps the
// exact Orca call sequence (clear search → publish target → open page) so the
// reference stays byte-identical; `WorktreeSidebar` consumes a `pane:'repo'`
// `settingsNavigationTarget` by opening that dialog on `sectionId`.
import type { ExecutionHostId } from '../../shared/execution-host'
import { getRepositoryLocalCommandsSectionId } from './repo-section-ids'

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
