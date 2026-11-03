// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/AddRepoCreateStep.tsx
//
// D02a-015/016/017: Create Project shows the name plus a collapsible summary of
// where it will land, a live `parent/name` preview, the Git probe state and — for
// remote hosts — the manual host-path field that replaces the native picker.
import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, Folder, FolderOpen, GitBranch, Loader2, Pencil } from 'lucide-react'
import {
  formatCreateProjectParentSummary,
  joinCreateProjectPath,
  type GitAvailability
} from './create-project-defaults'

const CREATE_PROJECT_NAME_PLACEHOLDER = 'project-name'

export function AddRepoCreateStep({
  createName,
  createParent,
  createError,
  isCreating,
  defaultParent,
  gitAvailability,
  manualParentEntry,
  isRemoteHost,
  hostLabel,
  onNameChange,
  onParentChange,
  onPickParent,
  onBrowseServer,
  onCreate
}: {
  createName: string
  createParent: string
  createError: string | null
  isCreating: boolean
  defaultParent: string
  gitAvailability: GitAvailability
  manualParentEntry: boolean
  isRemoteHost: boolean
  hostLabel: string | null
  onNameChange: (value: string) => void
  onParentChange: (value: string) => void
  onPickParent: () => void
  onBrowseServer: () => void
  onCreate: () => void
}): React.JSX.Element {
  // Why: SSH hosts need a typed remote path; hiding that field behind the
  // collapsed defaults makes the create flow look impossible.
  const [advancedOpen, setAdvancedOpen] = useState(manualParentEntry)

  useEffect(() => {
    if (manualParentEntry) setAdvancedOpen(true)
  }, [manualParentEntry])

  const canSubmit =
    createName.trim().length > 0 &&
    createParent.trim().length > 0 &&
    gitAvailability !== 'checking' &&
    gitAvailability !== 'unavailable' &&
    !isCreating

  const summaryParent = useMemo(
    () =>
      formatCreateProjectParentSummary({
        parent: createParent,
        defaultParent,
        isRemoteHost
      }),
    [createParent, defaultParent, isRemoteHost]
  )
  const targetPathPreview = useMemo(() => {
    const name = createName.trim() || CREATE_PROJECT_NAME_PLACEHOLDER
    return createParent.trim() ? joinCreateProjectPath(createParent, name) : ''
  }, [createName, createParent])

  const showGitChecking = gitAvailability === 'checking'
  const showGitFallback = gitAvailability === 'unavailable'
  const showMissingRemoteParent = isRemoteHost && !createParent.trim()

  return (
    <div className="p-5 space-y-3.5">
      <div>
        <h2 className="text-sm font-semibold tracking-tight text-neutral-100">
          Create a new project
        </h2>
        <p className="mt-1 text-xs text-neutral-400">
          Name it and Hydra will create a real project with sensible defaults.
        </p>
      </div>

      <div className="space-y-1">
        <label
          htmlFor="add-repo-create-name"
          className="block text-[11px] font-medium text-neutral-400"
        >
          Name
        </label>
        <input
          id="add-repo-create-name"
          type="text"
          required
          autoFocus
          autoComplete="off"
          spellCheck={false}
          value={createName}
          disabled={isCreating}
          placeholder="my-project"
          onChange={(event) => onNameChange(event.target.value)}
          className="w-full bg-[#0c0d0e] border border-[#2a2b30] rounded px-3 py-1.5 font-mono text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-emerald-500/80"
        />
      </div>

      <div className="min-w-0 rounded-md border border-[#2a2b30] bg-[#16171a]">
        <button
          type="button"
          onClick={() => setAdvancedOpen((open) => !open)}
          aria-expanded={advancedOpen}
          className="flex w-full min-w-0 items-start gap-2.5 rounded-md px-3 py-2.5 text-left transition hover:bg-neutral-800/50 cursor-pointer"
        >
          <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-md border border-[#2a2b30] bg-[#0e0f11] text-neutral-400">
            <GitBranch className="size-3.5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-medium text-neutral-100">
              {`Git repository in ${summaryParent}`}
            </span>
            {showGitChecking ? (
              <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-neutral-400">
                <Loader2 className="size-3 animate-spin" />
                Checking Git on this host...
              </span>
            ) : showGitFallback ? (
              <span className="mt-0.5 block text-[11px] text-red-400">
                Git is required to create a project.
              </span>
            ) : showMissingRemoteParent ? (
              <span className="mt-0.5 block text-[11px] text-neutral-400">
                Choose or enter a host parent folder before creating.
              </span>
            ) : targetPathPreview ? (
              <span
                className="mt-0.5 block truncate font-mono text-[11px] text-neutral-500"
                title={targetPathPreview}
              >
                {targetPathPreview}
              </span>
            ) : null}
          </span>
          <ChevronDown
            className={`size-4 shrink-0 self-center text-neutral-500 transition-transform ${
              advancedOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {advancedOpen ? (
          <div className="space-y-3 border-t border-[#222327] px-3 py-3">
            <div className="space-y-1">
              <span className="block text-[11px] font-medium text-neutral-400">Location</span>
              {manualParentEntry ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={createParent}
                    disabled={isCreating}
                    spellCheck={false}
                    placeholder="/home/user/projects"
                    aria-label="Host parent folder"
                    onChange={(event) => onParentChange(event.target.value)}
                    className="min-w-0 flex-1 bg-[#0c0d0e] border border-[#2a2b30] rounded px-3 py-1.5 font-mono text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-emerald-500/80"
                  />
                  <button
                    type="button"
                    onClick={onBrowseServer}
                    disabled={!isRemoteHost || isCreating}
                    title="Browse host filesystem"
                    aria-label="Browse host filesystem"
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded border border-[#2a2b30] text-neutral-400 transition hover:bg-neutral-800 hover:text-neutral-100 disabled:cursor-default disabled:opacity-40 cursor-pointer"
                  >
                    <FolderOpen className="size-3.5" />
                  </button>
                </div>
              ) : createParent.trim() ? (
                <div className="flex h-8 min-w-0 items-center gap-2.5 rounded border border-[#2a2b30] bg-[#0e0f11] px-3">
                  <span
                    className="min-w-0 flex-1 truncate font-mono text-[11px] text-neutral-300"
                    title={createParent}
                  >
                    {createParent}
                  </span>
                  <button
                    type="button"
                    onClick={onPickParent}
                    disabled={isCreating}
                    aria-label="Change parent folder"
                    className="inline-flex shrink-0 items-center gap-1 text-[11px] text-neutral-400 transition hover:text-neutral-100 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Pencil className="size-3" />
                    Change
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onPickParent}
                  disabled={isCreating}
                  className="flex h-8 w-full items-center gap-2 rounded border border-[#2a2b30] bg-[#0e0f11] px-2.5 text-left text-[11px] text-neutral-400 transition hover:bg-neutral-800/60 cursor-pointer"
                >
                  <span className="inline-flex size-6 items-center justify-center rounded border border-[#2a2b30] bg-[#16171a]">
                    <Folder className="size-3.5" />
                  </span>
                  Choose parent folder...
                </button>
              )}
            </div>

            {targetPathPreview ? (
              <p className="min-w-0 break-all rounded border border-[#2a2b30] bg-[#0e0f11] px-2.5 py-2 font-mono text-[11px] text-neutral-400">
                {targetPathPreview}
              </p>
            ) : null}

            {hostLabel ? (
              <p className="text-[11px] text-neutral-500">Created on {hostLabel}.</p>
            ) : null}
          </div>
        ) : null}
      </div>

      {createError ? (
        <p className="text-[11px] text-red-400" role="alert">
          {createError}
        </p>
      ) : null}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onCreate}
          disabled={!canSubmit}
          className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5"
        >
          {isCreating ? <Loader2 className="size-3.5 animate-spin" /> : null}
          {isCreating ? 'Creating…' : 'Create Project'}
        </button>
      </div>
    </div>
  )
}
