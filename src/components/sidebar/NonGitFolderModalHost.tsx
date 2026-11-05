import { useAppStore } from '@/store'
import type { AppState } from '@/store/types'
import { NonGitFolderDialog } from './NonGitFolderDialog'

type NonGitFolderModalState = {
  activeModal: string
  modalData: Record<string, unknown>
  closeModal: () => void
  addNonGitFolder: (
    path: string,
    options?: { displayName?: string; runtimeEnvironmentId?: string; connectionId?: string }
  ) => Promise<unknown>
}

function getString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

/**
 * Mounts the non-Git confirmation when a catalog add rejects the folder. The
 * local picker and the runtime/SSH routes both open this modal through
 * `openModal('confirm-non-git-folder', …)`, so the dialog is reachable from
 * every folder-add entry point instead of only the Add Project wizard.
 */
export function NonGitFolderModalHost(): React.JSX.Element | null {
  // Reason: the composed UI slice is typed as `any` on this branch; the fields
  // below are the runtime contract used by the add-repo actions.
  const state = useAppStore((value) => value as AppState & NonGitFolderModalState)
  if (state.activeModal !== 'confirm-non-git-folder') return null

  const folderPath = getString(state.modalData.folderPath) ?? ''
  const displayName = getString(state.modalData.displayName) ?? undefined
  const runtimeEnvironmentId =
    getString(state.modalData.runtimeEnvironmentId) ?? undefined
  const connectionId = getString(state.modalData.connectionId) ?? undefined
  if (!folderPath) return null

  const hostLabel = connectionId
    ? `SSH ${connectionId}`
    : runtimeEnvironmentId
      ? `runtime ${runtimeEnvironmentId}`
      : null

  return (
    <NonGitFolderDialog
      open
      folderPath={folderPath}
      hostLabel={hostLabel}
      onOpenChange={(open) => {
        if (!open) state.closeModal()
      }}
      onConfirm={() => {
        state.closeModal()
        void state.addNonGitFolder(folderPath, {
          ...(displayName ? { displayName } : {}),
          ...(runtimeEnvironmentId ? { runtimeEnvironmentId } : {}),
          ...(connectionId ? { connectionId } : {})
        })
      }}
    />
  )
}
