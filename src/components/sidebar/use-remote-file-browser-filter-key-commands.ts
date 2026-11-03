// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/use-remote-file-browser-filter-key-commands.ts
import { useCallback, type Dispatch, type KeyboardEvent, type SetStateAction } from 'react'
import type { FilesystemPathFlavor } from '../../shared/filesystem-entry-types'
import {
  decideEnterAction,
  decideEscAction,
  filterEntries,
  joinPath,
  parsePathInput,
  type BrowseEntry
} from './remote-file-browser-helpers'
import type { PreviewState } from './remote-file-browser-path-preview-resolver'

export type RemoteFileBrowserFilterKeyCommandsArgs = {
  filter: string
  setFilter: Dispatch<SetStateAction<string>>
  filteredEntries: readonly BrowseEntry[]
  preview: PreviewState | null
  discardPreview: () => void
  resolvedPath: string
  pathFlavor: FilesystemPathFlavor
  navigate: (dirPath: string) => void
  navigateInto: (name: string) => void
  navigateUp: () => void
  triggerFileHint: () => void
  clearFileHint: () => void
  onCancel: () => void
}

export function useRemoteFileBrowserFilterKeyCommands({
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
}: RemoteFileBrowserFilterKeyCommandsArgs): (event: KeyboardEvent<HTMLInputElement>) => void {
  return useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        if (preview) {
          if (preview.error || preview.loading) {
            event.preventDefault()
            return
          }
          const parsed = parsePathInput(filter, pathFlavor)
          // Fully-resolved directory (trailing separator or bare base marker): navigate
          // to the preview path itself.
          if (parsed.mode === 'path' && parsed.trailingFilter === '') {
            event.preventDefault()
            navigate(preview.resolvedPath)
            return
          }
          // Trailing filter: resolve to a single folder match, mirroring filter-mode Enter.
          const action = decideEnterAction(filterEntries(preview.entries, preview.filter))
          if (action.type === 'navigate') {
            event.preventDefault()
            navigate(joinPath(preview.resolvedPath, action.name, pathFlavor))
          } else if (action.type === 'fileHint') {
            event.preventDefault()
            triggerFileHint()
          } else {
            event.preventDefault()
          }
          return
        }
        const action = decideEnterAction(filteredEntries)
        if (action.type === 'navigate') {
          event.preventDefault()
          navigateInto(action.name)
        } else if (action.type === 'fileHint') {
          event.preventDefault()
          triggerFileHint()
        }
        return
      }
      if (event.key === 'Escape') {
        const action = decideEscAction(filter)
        if (action.type === 'clearFilter') {
          event.stopPropagation()
          event.preventDefault()
          setFilter('')
          discardPreview()
          clearFileHint()
        } else {
          onCancel()
        }
      }
      if (event.key === 'Backspace' && filter === '' && !preview) {
        // Backspace in an empty input climbs to the parent; in-word backspaces are untouched.
        if (resolvedPath !== '/') {
          event.preventDefault()
          navigateUp()
        }
      }
    },
    [
      filter,
      filteredEntries,
      preview,
      navigate,
      navigateInto,
      navigateUp,
      resolvedPath,
      triggerFileHint,
      clearFileHint,
      onCancel,
      pathFlavor,
      setFilter,
      discardPreview
    ]
  )
}
