// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/AddRepoCloneStep.tsx
//
// D02a-012: clone parameters (URL + destination), a destination picker, an error
// surface and a real progress bar whenever the host streams progress. Hydra's
// `clone_project` streams nothing yet, so an indeterminate bar is shown while the
// clone runs instead of inventing a percentage.
import { FolderOpen, Loader2, AlertCircle } from 'lucide-react'

export type CloneProgress = { phase: string; percent: number }

export function AddRepoCloneStep({
  cloneUrl,
  cloneDestination,
  cloneError,
  cloneProgress,
  isCloning,
  gitUnavailable,
  destinationIsRemote,
  hostLabel,
  onUrlChange,
  onDestinationChange,
  onPickDestination,
  onClone
}: {
  cloneUrl: string
  cloneDestination: string
  cloneError: string | null
  cloneProgress: CloneProgress | null
  isCloning: boolean
  gitUnavailable: boolean
  destinationIsRemote: boolean
  hostLabel: string | null
  onUrlChange: (value: string) => void
  onDestinationChange: (value: string) => void
  onPickDestination: () => void
  onClone: () => void
}): React.JSX.Element {
  const canSubmit =
    !isCloning && cloneUrl.trim().length > 0 && cloneDestination.trim().length > 0 && !gitUnavailable

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (canSubmit) onClone()
      }}
      className="p-5 space-y-4"
    >
      <div>
        <h2 className="text-sm font-semibold tracking-tight text-neutral-100">
          Clone from URL
        </h2>
        <p className="mt-1 text-xs text-neutral-400">
          Clone a remote Git repository
          {hostLabel ? ` onto ${hostLabel}` : ' into your workspaces folder'}.
        </p>
      </div>

      <div>
        <label htmlFor="add-repo-clone-url" className="block text-neutral-400 mb-1 font-medium">
          Git Repository URL
        </label>
        <input
          id="add-repo-clone-url"
          type="text"
          required
          autoFocus
          placeholder="https://github.com/user/repo.git or git@github.com:..."
          value={cloneUrl}
          disabled={isCloning}
          onChange={(event) => onUrlChange(event.target.value)}
          className="w-full bg-[#0c0d0e] border border-[#2a2b30] rounded px-3 py-1.5 font-mono text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-emerald-500/80"
        />
      </div>

      <div>
        <label
          htmlFor="add-repo-clone-destination"
          className="block text-neutral-400 mb-1 font-medium"
        >
          Destination Directory
        </label>
        <div className="flex gap-2">
          <input
            id="add-repo-clone-destination"
            type="text"
            required
            value={cloneDestination}
            disabled={isCloning}
            onChange={(event) => onDestinationChange(event.target.value)}
            className="min-w-0 flex-1 bg-[#0c0d0e] border border-[#2a2b30] rounded px-3 py-1.5 font-mono text-xs text-neutral-200 focus:outline-none focus:border-emerald-500/80"
          />
          <button
            type="button"
            onClick={onPickDestination}
            disabled={isCloning || destinationIsRemote}
            title={
              destinationIsRemote
                ? 'Enter a host path for the clone destination.'
                : 'Choose destination folder'
            }
            aria-label={
              destinationIsRemote
                ? 'Host destination must be typed'
                : 'Choose destination folder'
            }
            className="inline-flex size-8 shrink-0 items-center justify-center rounded border border-[#2a2b30] text-neutral-400 transition hover:bg-neutral-800 hover:text-neutral-100 disabled:cursor-default disabled:opacity-40 cursor-pointer"
          >
            <FolderOpen className="size-3.5" />
          </button>
        </div>
        {destinationIsRemote ? (
          <p className="mt-1 text-[11px] text-neutral-500">
            Enter a path on the selected host; the native picker only sees this computer.
          </p>
        ) : null}
      </div>

      {cloneProgress ? (
        <div className="space-y-1" role="status" aria-live="polite">
          <div className="flex items-center justify-between text-[11px] text-neutral-400">
            <span className="truncate">{cloneProgress.phase}</span>
            <span>{Math.round(cloneProgress.percent)}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[#222327]">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${Math.min(100, Math.max(0, cloneProgress.percent))}%` }}
            />
          </div>
        </div>
      ) : isCloning ? (
        <div className="h-1.5 overflow-hidden rounded-full bg-[#222327]" role="status">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-emerald-500" />
        </div>
      ) : null}

      {cloneError ? (
        <p role="alert" className="flex items-start gap-2 text-[11px] text-red-400">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
          <span className="min-w-0 break-words">{cloneError}</span>
        </p>
      ) : null}

      <div className="pt-2 flex justify-end gap-2">
        <button
          type="submit"
          disabled={!canSubmit}
          className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5"
        >
          {isCloning ? <Loader2 className="size-3.5 animate-spin" /> : null}
          {isCloning ? 'Cloning...' : 'Clone Project'}
        </button>
      </div>
    </form>
  )
}
