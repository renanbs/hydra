// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/AddRepoNestedImportStep.tsx
//
// D02a-022/024/025/041: review the repositories found under a folder, choose
// which ones to import, name the group, or fall back to opening the parent as a
// plain folder. Stop remains available while the scan is still streaming.
import { useEffect, useId, useState } from 'react'
import { CircleStop, Loader2 } from 'lucide-react'
import type { NestedRepoScanResult } from '../../shared/project-group-types'
import { NestedRepoChecklist } from './NestedRepoChecklist'
import { NestedRepoScanLimitNotice } from './NestedRepoScanLimitNotice'
import { defaultProjectGroupNameForPath } from './add-repo-dialog-types'

export type NestedImportMode = 'group' | 'separate' | 'folder'

export function AddRepoNestedImportStep({
  scan,
  groupName,
  selectedPaths,
  isAdding,
  scanInProgress,
  onGroupNameChange,
  onSelectedPathsChange,
  onImport,
  onOpenAsFolder,
  onStopScan
}: {
  scan: NestedRepoScanResult
  groupName: string
  selectedPaths: ReadonlySet<string>
  isAdding: boolean
  scanInProgress: boolean
  onGroupNameChange: (value: string) => void
  onSelectedPathsChange: (next: ReadonlySet<string>) => void
  onImport: (mode: Exclude<NestedImportMode, 'folder'>) => void
  onOpenAsFolder: () => void
  onStopScan: () => void
}): React.JSX.Element {
  const folderName = defaultProjectGroupNameForPath(scan.selectedPath) || scan.selectedPath
  const groupNameInputId = useId()
  const [pendingMode, setPendingMode] = useState<NestedImportMode | null>(null)
  const noRepositoriesSelected = selectedPaths.size === 0
  const busy = isAdding || scanInProgress

  useEffect(() => {
    if (!isAdding) setPendingMode(null)
  }, [isAdding])

  const repoCountLabel =
    scan.repos.length === 1 ? '1 repository' : `${scan.repos.length} repositories`
  const foundSentence = `Found ${repoCountLabel} in ${scan.selectedPath}.`

  return (
    <div className="p-4 space-y-3">
      <div>
        <h2 className="text-sm font-semibold tracking-tight text-neutral-100">
          Import repositories from folder
        </h2>
        <div className="mt-1 flex min-w-0 items-center gap-1.5">
          {scanInProgress ? (
            <button
              type="button"
              aria-label="Stop scan"
              title="Scanning repositories. Click to stop."
              onClick={onStopScan}
              className="group inline-flex size-5 shrink-0 items-center justify-center rounded text-neutral-400 transition hover:bg-red-500/10 hover:text-red-400 cursor-pointer"
            >
              <Loader2 className="size-3.5 animate-spin group-hover:hidden" />
              <CircleStop className="hidden size-3.5 group-hover:block" />
            </button>
          ) : null}
          <p className="min-w-0 truncate text-xs text-neutral-400">
            {scanInProgress ? `Scanning... ${foundSentence}` : foundSentence}
          </p>
        </div>
      </div>

      <NestedRepoChecklist
        scan={scan}
        selectedPaths={selectedPaths}
        onSelectedPathsChange={onSelectedPathsChange}
        disabled={busy}
      />
      {scanInProgress || scan.truncated || scan.timedOut || scan.stopped ? (
        <NestedRepoScanLimitNotice scan={scan} />
      ) : null}

      <div className="space-y-1">
        <p className="text-xs font-medium text-neutral-100">Group these repositories?</p>
        <p className="text-[11px] text-neutral-500">
          Choose this if these projects belong together — a monorepo, or just a set of related
          repos. Hydra will group them and let you work from the parent folder.
        </p>
      </div>

      <div className="space-y-1">
        <label htmlFor={groupNameInputId} className="block text-[11px] text-neutral-400">
          Group name
        </label>
        <input
          id={groupNameInputId}
          aria-label="Group name"
          value={groupName}
          placeholder={folderName}
          disabled={busy}
          onChange={(event) => onGroupNameChange(event.target.value)}
          className="w-full bg-[#0c0d0e] border border-[#2a2b30] rounded px-3 py-1.5 text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-emerald-500/80"
        />
      </div>

      {noRepositoriesSelected ? (
        <p className="text-[11px] text-neutral-500">
          No repositories are selected. Open the parent folder instead to use editor, terminal and
          search without Git features.
        </p>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2">
        {noRepositoriesSelected ? (
          <button
            type="button"
            onClick={() => {
              setPendingMode('folder')
              onOpenAsFolder()
            }}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded border border-[#2a2b30] px-3 py-1.5 text-xs text-neutral-200 transition hover:bg-neutral-800 disabled:opacity-50 cursor-pointer"
          >
            {isAdding && pendingMode === 'folder' ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : null}
            Open as Folder
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            setPendingMode('separate')
            onImport('separate')
          }}
          disabled={busy || noRepositoriesSelected}
          className="inline-flex items-center gap-1.5 rounded border border-[#2a2b30] px-3 py-1.5 text-xs text-neutral-200 transition hover:bg-neutral-800 disabled:opacity-50 cursor-pointer"
        >
          {isAdding && pendingMode === 'separate' ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : null}
          No, import separately
        </button>
        <button
          type="button"
          onClick={() => {
            setPendingMode('group')
            onImport('group')
          }}
          disabled={busy || noRepositoriesSelected}
          className="inline-flex items-center gap-1.5 rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50 cursor-pointer"
        >
          {isAdding && pendingMode === 'group' ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : null}
          Yes, import as group
        </button>
      </div>
    </div>
  )
}
