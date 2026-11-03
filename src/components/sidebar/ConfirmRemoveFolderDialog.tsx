// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/RemoveFolderDialog.tsx (confirm-remove-folder branch)
// Git refuses to remove the primary checkout. Hydra's contract: offer removing the
// project from the catalog while keeping the folder on disk, instead of a dead
// destructive button.
export interface ConfirmRemoveFolderDialogProps {
  open: boolean
  displayName: string
  folderPath: string
  onOpenChange: (open: boolean) => void
  /** Removes the project entry only; the directory stays on disk. */
  onRemoveProject: () => void
}

export function ConfirmRemoveFolderDialog({
  open,
  displayName,
  folderPath,
  onOpenChange,
  onRemoveProject,
}: ConfirmRemoveFolderDialogProps): React.JSX.Element | null {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-[99998] flex items-center justify-center bg-black/65 backdrop-blur-xs select-none"
      onClick={() => onOpenChange(false)}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-xl border border-[#2a2b30] bg-[#141518] p-5 text-xs text-neutral-200 shadow-2xl"
      >
        <h2 className="text-sm font-semibold tracking-tight text-neutral-100">
          Remove the folder project instead
        </h2>
        <p className="mt-1.5 text-[12px] leading-relaxed text-neutral-400">
          <span className="break-all font-medium text-foreground">{displayName}</span> is this
          project&apos;s primary checkout. Git does not allow removing the main worktree; removing
          the project from Hydra keeps the folder on disk.
        </p>
        <p className="mt-2 break-all font-mono text-[11px] text-neutral-500">{folderPath}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-1.5 text-xs font-medium text-neutral-300 transition hover:bg-neutral-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onRemoveProject()
              onOpenChange(false)
            }}
            className="rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-medium text-white transition hover:bg-red-500"
          >
            Remove Project from Hydra
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmRemoveFolderDialog
