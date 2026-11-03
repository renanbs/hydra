// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/AddProjectFromFolderDialog.tsx
//
// D02a-026: a folder dropped on the sidebar is confirmed before the catalog write.
// Hydra renders it as the Add Project `folder` step; the component is split out so
// the confirmation surface can be tested without mounting the whole wizard.
import { AlertCircle, FolderOpen } from 'lucide-react'

export function AddProjectFromFolderDialog({
  folderPath,
  hostLabel = null,
  isSubmitting,
  error,
  onCancel,
  onConfirm
}: {
  folderPath: string
  hostLabel?: string | null
  isSubmitting: boolean
  error: string | null
  onCancel: () => void
  onConfirm: () => void
}): React.JSX.Element {
  return (
    <div className="p-4 space-y-3">
      <div className="rounded-xl border border-[#222327] bg-[#0e0f11] p-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-100">
          <FolderOpen className="w-4 h-4 text-emerald-400" />
          Folder dropped on the sidebar
        </div>
        <div className="mt-1.5 break-all font-mono text-[11px] text-neutral-400">
          {folderPath}
        </div>
        {hostLabel ? (
          <div className="mt-1 text-[11px] text-neutral-500">on {hostLabel}</div>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="flex items-start gap-2 text-[11px] text-red-400">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
          <span className="min-w-0 break-words">{error}</span>
        </p>
      ) : null}

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="h-8 rounded-md border border-[#2a2b30] px-3 text-xs text-neutral-300 transition hover:bg-neutral-800 cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={onConfirm}
          className="h-8 rounded-md bg-emerald-600 px-3 text-xs font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50 cursor-pointer"
        >
          Add Project
        </button>
      </div>
    </div>
  )
}
