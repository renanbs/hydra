// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/RemoteFileBrowser.tsx
//
// The folder picker for a remote host: breadcrumbs, a filter/path input, typed entry rows,
// and confirmation. The listing transport is `src/store/remote-browse-bridge.ts`, which is
// BLOCKED on `ssh_browse_dir` / `runtime_browse_server_directory` in this build; a missing
// command renders as the picker's error state and Save stays disabled.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LoaderCircle, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'
import type { FilesystemPathFlavor } from '../../shared/filesystem-entry-types'
import { RemoteFileBrowserBreadcrumbs } from './RemoteFileBrowserBreadcrumbs'
import { RemoteFileBrowserEntryList } from './RemoteFileBrowserEntryList'
import { filterEntries, joinPath, parentPath, type BrowseEntry } from './remote-file-browser-helpers'
import { useRemoteFileBrowserFilterKeyCommands } from './use-remote-file-browser-filter-key-commands'
import {
  useRemoteFileBrowserListing,
  type RemoteFileBrowserSource
} from './use-remote-file-browser-listing'
import { useRemoteFileBrowserPathPreview } from './use-remote-file-browser-path-preview'

const FILE_HINT_MS = 2000
const FILE_HINT_TEXT = "Files can't be opened as a project"

type RemoteFileBrowserProps = {
  source: RemoteFileBrowserSource
  initialPath?: string
  onSelect: (path: string) => void
  onCancel: () => void
}

export function RemoteFileBrowser({
  source,
  initialPath = '~',
  onSelect,
  onCancel
}: RemoteFileBrowserProps): React.JSX.Element {
  const [resolvedPath, setResolvedPath] = useState('')
  const [entries, setEntries] = useState<BrowseEntry[]>([])
  const [pathFlavor, setPathFlavor] = useState<FilesystemPathFlavor>('posix')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('')
  const [fileHint, setFileHint] = useState(false)
  const genRef = useRef(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { fetchListing, homePathRef } = useRemoteFileBrowserListing(source)

  const clearFileHint = useCallback(() => {
    if (fileHintTimerRef.current) {
      clearTimeout(fileHintTimerRef.current)
      fileHintTimerRef.current = null
    }
    setFileHint(false)
  }, [])

  const {
    preview,
    handleInputChange,
    handleInputPaste,
    discardPreview,
    resetPreviewForNavigation,
    cancelPreviewWork
  } = useRemoteFileBrowserPathPreview({
    resolvedPath,
    pathFlavor,
    fetchListing,
    homePathRef,
    inputRef,
    clearFileHint,
    setFilter
  })

  const invalidateBrowseRequests = useCallback(() => {
    genRef.current++
  }, [])

  const setBrowserRootRef = useCallback(
    (node: HTMLDivElement | null): void => {
      if (node !== null) {
        return
      }
      // Why: browse generations and timers are scoped to this picker owner; clear them when
      // it detaches.
      invalidateBrowseRequests()
      cancelPreviewWork()
      for (const timerRef of [fileHintTimerRef, clickTimerRef]) {
        if (timerRef.current) {
          clearTimeout(timerRef.current)
          timerRef.current = null
        }
      }
    },
    [invalidateBrowseRequests, cancelPreviewWork]
  )

  const loadDir = useCallback(
    async (dirPath: string) => {
      const generation = ++genRef.current
      setLoading(true)
      setError(null)
      try {
        const result = await fetchListing(dirPath)
        if (generation !== genRef.current) {
          return
        }
        setResolvedPath(result.resolvedPath)
        setEntries(result.entries)
        setPathFlavor(result.pathFlavor)
        // Only bare `~` yields the home dir itself; `~/sub` resolves elsewhere and must not
        // overwrite the home anchor.
        if (dirPath === '~') {
          homePathRef.current = result.resolvedPath
        }
      } catch (err) {
        if (generation !== genRef.current) {
          return
        }
        setError(err instanceof Error ? err.message : String(err))
        setEntries([])
      } finally {
        if (generation === genRef.current) {
          setLoading(false)
        }
      }
    },
    [fetchListing, homePathRef]
  )

  // Central nav clears filter/preview/hint so a stale in-flight preview can't clobber
  // committed state.
  const navigate = useCallback(
    (dirPath: string) => {
      setFilter('')
      resetPreviewForNavigation()
      clearFileHint()
      void loadDir(dirPath)
    },
    [loadDir, clearFileHint, resetPreviewForNavigation]
  )

  useEffect(() => {
    void loadDir(initialPath)
  }, [loadDir, initialPath])

  const navigateInto = useCallback(
    (name: string) => {
      navigate(joinPath(resolvedPath, name, pathFlavor))
    },
    [resolvedPath, navigate, pathFlavor]
  )

  const navigateUp = useCallback(() => {
    if (resolvedPath === '/') {
      return
    }
    navigate(parentPath(resolvedPath, pathFlavor))
  }, [resolvedPath, navigate, pathFlavor])

  const filteredEntries = useMemo(() => filterEntries(entries, filter), [entries, filter])

  const triggerFileHint = useCallback(() => {
    if (fileHintTimerRef.current) {
      clearTimeout(fileHintTimerRef.current)
    }
    setFileHint(true)
    fileHintTimerRef.current = setTimeout(() => {
      setFileHint(false)
      fileHintTimerRef.current = null
    }, FILE_HINT_MS)
  }, [])

  // Select always returns the committed directory, and stays disabled during a path preview
  // so a mismatched selection cannot happen.
  const handleSelect = useCallback(() => {
    onSelect(resolvedPath)
  }, [resolvedPath, onSelect])

  // When a preview is active, row clicks resolve relative to the preview path.
  const listParentPath = preview?.resolvedPath ?? resolvedPath

  const handleRowClick = useCallback(
    (entry: BrowseEntry) => {
      // Stale rows from the prior listing may still show while a preview resolves.
      if (preview?.loading) {
        return
      }
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current)
      }
      clickTimerRef.current = setTimeout(() => {
        clickTimerRef.current = null
        if (entry.isDirectory) {
          navigate(joinPath(listParentPath, entry.name, pathFlavor))
        } else {
          triggerFileHint()
        }
      }, 220)
    },
    [navigate, triggerFileHint, listParentPath, preview?.loading, pathFlavor]
  )

  const handleRowDoubleClick = useCallback(
    (entry: BrowseEntry) => {
      // Same as handleRowClick: don't act on stale rows while the preview re-resolves.
      if (!entry.isDirectory || preview?.loading) {
        return
      }
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current)
        clickTimerRef.current = null
      }
      onSelect(joinPath(listParentPath, entry.name, pathFlavor))
    },
    [listParentPath, onSelect, preview?.loading, pathFlavor]
  )

  const handleFilterKeyDown = useRemoteFileBrowserFilterKeyCommands({
    filter,
    setFilter,
    filteredEntries,
    preview,
    discardPreview,
    resolvedPath,
    pathFlavor,
    navigate,
    navigateInto,
    navigateUp,
    triggerFileHint,
    clearFileHint,
    onCancel
  })

  const isPreviewActive = preview !== null
  const showPreviewLoading = isPreviewActive && preview.loading
  // Why: a failed or never-resolved listing must not let Save select '' or a stale path.
  const selectDisabled =
    loading || error !== null || resolvedPath === '' || (isPreviewActive && filter !== '')

  return (
    <div ref={setBrowserRootRef} className="flex w-full min-w-0 flex-col gap-2">
      <RemoteFileBrowserBreadcrumbs
        resolvedPath={resolvedPath}
        pathFlavor={pathFlavor}
        loading={loading}
        navigate={navigate}
        navigateUp={navigateUp}
      />

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          autoFocus
          value={filter}
          onChange={(event) => handleInputChange(event.target.value)}
          onPaste={handleInputPaste}
          onKeyDown={handleFilterKeyDown}
          placeholder={translate(
            'auto.components.sidebar.RemoteFileBrowser.2300612806',
            'Type to filter or enter a path…'
          )}
          aria-invalid={Boolean(preview?.error)}
          aria-describedby={preview?.error ? 'remote-file-browser-path-error' : undefined}
          aria-label={translate(
            'auto.components.sidebar.RemoteFileBrowser.2300612806',
            'Type to filter or enter a path…'
          )}
          className={cn(
            'h-7 w-full rounded-md border border-border bg-background pr-7 pl-7 text-xs',
            'focus:ring-1 focus:ring-ring focus:outline-none',
            preview?.error && 'border-destructive/60 focus:ring-destructive/60'
          )}
        />
        {showPreviewLoading ? (
          <LoaderCircle className="absolute top-1/2 right-2 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : null}
      </div>

      {preview?.error ? (
        <p
          id="remote-file-browser-path-error"
          role="alert"
          className="-mt-1 px-0.5 text-[11px] text-destructive"
        >
          {preview.error}
        </p>
      ) : null}

      <RemoteFileBrowserEntryList
        loading={loading}
        error={error}
        entries={entries}
        filteredEntries={filteredEntries}
        filter={filter}
        preview={preview}
        isPreviewActive={isPreviewActive}
        inputRef={inputRef}
        handleRowClick={handleRowClick}
        handleRowDoubleClick={handleRowDoubleClick}
      />

      <p
        className="block w-full truncate text-[10px] text-muted-foreground"
        title={fileHint ? undefined : resolvedPath}
      >
        {fileHint
          ? FILE_HINT_TEXT
          : translate(
              'auto.components.sidebar.RemoteFileBrowser.971d85cc84',
              'Opens as a project on this host · {{value0}}',
              { value0: resolvedPath }
            )}
      </p>
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onCancel}>
          {translate('auto.components.sidebar.RemoteFileBrowser.f8b1deb1a4', 'Cancel')}
        </Button>
        <Button
          size="sm"
          className="h-7 text-xs"
          onClick={handleSelect}
          disabled={selectDisabled}
          title={resolvedPath}
        >
          {translate('auto.components.sidebar.RemoteFileBrowser.9e060f5815', 'Select folder')}
        </Button>
      </div>
    </div>
  )
}
