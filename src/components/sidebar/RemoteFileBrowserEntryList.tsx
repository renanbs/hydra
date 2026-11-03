// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/RemoteFileBrowserEntryList.tsx
import { useMemo, type RefObject } from 'react'
import { ChevronRight, Folder, LoaderCircle } from 'lucide-react'
import { getFileTypeIcon } from '@/lib/file-type-icons'
import { translate } from '@/i18n/i18n'
import {
  filterEntries,
  isRemoteFileBrowserPathResolveTextTooLarge,
  type BrowseEntry
} from './remote-file-browser-helpers'
import type { PreviewState } from './remote-file-browser-path-preview-resolver'

type RemoteFileBrowserEntryListProps = {
  loading: boolean
  error: string | null
  entries: readonly BrowseEntry[]
  filteredEntries: readonly BrowseEntry[]
  filter: string
  preview: PreviewState | null
  isPreviewActive: boolean
  inputRef: RefObject<HTMLInputElement | null>
  handleRowClick: (entry: BrowseEntry) => void
  handleRowDoubleClick: (entry: BrowseEntry) => void
}

/** Loading, error, empty and no-match states plus the entry rows themselves. */
export function RemoteFileBrowserEntryList({
  loading,
  error,
  entries,
  filteredEntries,
  filter,
  preview,
  isPreviewActive,
  inputRef,
  handleRowClick,
  handleRowDoubleClick
}: RemoteFileBrowserEntryListProps): React.JSX.Element {
  const previewFilteredEntries = useMemo(
    () => (preview ? filterEntries(preview.entries, preview.filter) : []),
    [preview]
  )

  // Render the preview listing (own filter/error) during path mode, the committed listing
  // otherwise.
  const displayEntries = isPreviewActive ? previewFilteredEntries : filteredEntries
  const displayEmptyDirCopy = isPreviewActive
    ? `${preview?.resolvedPath ?? ''} is empty`
    : translate('auto.components.sidebar.RemoteFileBrowser.51001182e3', 'Empty directory')
  const noMatchesFilter = isPreviewActive ? (preview?.filter ?? '') : filter
  const displayNoMatchesCopy = isRemoteFileBrowserPathResolveTextTooLarge(noMatchesFilter)
    ? translate(
        'auto.components.sidebar.RemoteFileBrowser.largeInputNoMatches',
        'No matches for this long input'
      )
    : translate(
        'auto.components.sidebar.RemoteFileBrowser.00c4235c10',
        "No matches for '{{value0}}'",
        { value0: noMatchesFilter }
      )

  return (
    <div className="overflow-hidden rounded-md border border-border bg-background">
      <div className="h-[240px] overflow-y-auto scrollbar-sleek">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center px-4">
            <p className="text-center text-xs text-destructive">{error}</p>
          </div>
        ) : isPreviewActive &&
          (preview?.entries.length ?? 0) === 0 &&
          !preview?.error &&
          !preview?.loading ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-xs text-muted-foreground">{displayEmptyDirCopy}</p>
          </div>
        ) : !isPreviewActive && entries.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-xs text-muted-foreground">
              {translate('auto.components.sidebar.RemoteFileBrowser.51001182e3', 'Empty directory')}
            </p>
          </div>
        ) : displayEntries.length === 0 && !preview?.error ? (
          // Directory has contents but the filter hides them all — distinct from an empty
          // directory so the copy stays accurate.
          <div className="flex h-full items-center justify-center">
            <p className="text-xs text-muted-foreground">{displayNoMatchesCopy}</p>
          </div>
        ) : (
          displayEntries.map((entry) => {
            const FileIcon = getFileTypeIcon(entry.name)
            return (
              <button
                key={entry.name}
                type="button"
                onClick={() => handleRowClick(entry)}
                onDoubleClick={() => handleRowDoubleClick(entry)}
                onMouseDown={(event) => {
                  // Why: keep typing focus in the filter input while the pointer is on a row.
                  event.preventDefault()
                  inputRef.current?.focus()
                }}
                className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-accent/60"
              >
                {entry.isDirectory ? (
                  <Folder className="size-3.5 shrink-0 text-muted-foreground" />
                ) : (
                  <FileIcon className="size-3.5 shrink-0 text-muted-foreground/60" />
                )}
                <span className="min-w-0 flex-1 truncate">{entry.name}</span>
                {entry.isDirectory ? (
                  <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/60" />
                ) : null}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
