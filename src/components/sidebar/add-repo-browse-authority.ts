// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/add-repo-browse-authority.ts
//
// D02a-007: a folder pick is answered by the selected host. Local uses the
// native picker, a runtime host uses the server-path step and an SSH host uses
// remote browsing against the target id. Keeping the routing pure makes the
// "which authority owns the browse" contract testable without a dialog.
import type { ParsedExecutionHost } from '../../shared/execution-host'

export type AddRepoBrowseAuthorityActions = {
  browseLocal: () => void
  browseRuntime: () => void
  browseSsh: (targetId: string) => void
}

export function routeAddRepoBrowse(
  host: ParsedExecutionHost | null,
  actions: AddRepoBrowseAuthorityActions
): void {
  if (host?.kind === 'runtime') {
    actions.browseRuntime()
    return
  }
  if (host?.kind === 'ssh') {
    actions.browseSsh(host.targetId)
    return
  }
  if (host?.kind === 'local') {
    actions.browseLocal()
  }
}
