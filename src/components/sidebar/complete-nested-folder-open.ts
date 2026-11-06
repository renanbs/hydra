// Adapter over `src/reference/components/sidebar/complete-nested-folder-open.ts`
// (verbatim Orca, pinned in `src/reference/REVISION`) and
// `src/reference/components/sidebar/track-nested-folder-open.ts`.
//
// Rosetta D02c-010: the reference routes SSH (`connectionId`) through the
// `confirm-non-git-folder` modal and local/runtime through `addNonGitFolder`,
// with generation guards and error toasts. Hydra's dialog already splits SSH
// vs runtime hosts before this point, so the adapter takes the resolved host
// branch instead of the raw connection id; the telemetry call, modal payload,
// generation guards, and busy-label handling match the reference 1:1.
import { useAppStore } from '../../store'
import { track } from '../../lib/telemetry'
import { buildNestedRepoImportActionTelemetry } from '../../shared/nested-repo-telemetry'
import type { NestedRepoScanResult } from '../../shared/project-group-types'
import { extractIpcErrorMessage } from '../../lib/ipc-error'

export type NestedFolderHostBranch =
  | { kind: 'ssh'; sshTargetId: string }
  | { kind: 'runtime'; runtimeEnvironmentId: string }
  | { kind: 'local' }

export async function completeNestedFolderOpen(args: {
  scan: NestedRepoScanResult
  generation: number
  currentGeneration: () => number
  attemptId: string | null
  hostBranch: NestedFolderHostBranch
  selectedCount: number
  displayName?: string
  /** Host handoff after the folder lands (`notifyProjectAdded(path, 'folder')`). */
  onFolderAdded: (path: string) => void
  closeModal: () => void
  setIsAdding: (value: boolean) => void
  setBusyLabel: (value: string | null) => void
  setError: (value: string | null) => void
}): Promise<void> {
  if (args.attemptId) {
    track(
      'add_repo_nested_import_action',
      buildNestedRepoImportActionTelemetry({
        attemptId: args.attemptId,
        surface: 'sidebar',
        runtimeKind:
          args.hostBranch.kind === 'ssh'
            ? 'ssh'
            : args.hostBranch.kind === 'runtime'
              ? 'runtime'
              : 'local',
        action: 'open_as_folder',
        foundCount: args.scan.repos.length,
        selectedCount: args.selectedCount
      })
    )
  }
  args.setIsAdding(true)
  args.setBusyLabel('Opening project...')
  args.setError(null)
  try {
    if (args.hostBranch.kind === 'ssh') {
      useAppStore.getState().openModal('confirm-non-git-folder', {
        folderPath: args.scan.selectedPath,
        connectionId: args.hostBranch.sshTargetId,
        ...(args.displayName ? { displayName: args.displayName } : {})
      })
      if (args.generation === args.currentGeneration()) {
        args.setIsAdding(false)
        args.setBusyLabel(null)
      }
      return
    }
    if (args.hostBranch.kind === 'runtime') {
      useAppStore.getState().openModal('confirm-non-git-folder', {
        folderPath: args.scan.selectedPath,
        runtimeEnvironmentId: args.hostBranch.runtimeEnvironmentId,
        ...(args.displayName ? { displayName: args.displayName } : {})
      })
      if (args.generation === args.currentGeneration()) {
        args.setIsAdding(false)
        args.setBusyLabel(null)
      }
      return
    }
    const { addCatalogFolderWorkspace } = await import('../../lib/catalog-client')
    await addCatalogFolderWorkspace({
      parentPath: args.scan.selectedPath,
      name: args.displayName ?? null
    })
    if (args.generation !== args.currentGeneration()) return
    args.onFolderAdded(args.scan.selectedPath)
    args.closeModal()
  } catch (err) {
    if (args.generation === args.currentGeneration()) {
      args.setError(extractIpcErrorMessage(err, String(err)))
    }
  } finally {
    if (args.generation === args.currentGeneration()) {
      args.setIsAdding(false)
      args.setBusyLabel(null)
    }
  }
}
