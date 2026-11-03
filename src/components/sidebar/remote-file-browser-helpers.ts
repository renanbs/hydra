// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/remote-file-browser-helpers.ts
// Pure decisions for the remote folder picker: filter vs path mode, path joining and parent
// navigation, per-segment resolution, and the paste/size guards that keep a hostile or huge
// input from reaching the remote shell.
import { translate } from '@/i18n/i18n'
import { isClipboardTextByteLengthOverLimit } from '../../shared/clipboard-text'
import type { FilesystemPathFlavor } from '../../shared/filesystem-entry-types'
import {
  driveRootOf,
  isDrivePath,
  joinDrivePath,
  parentOfDrivePath
} from './remote-file-browser-drive-paths'

export type BrowseEntry = {
  name: string
  isDirectory: boolean
}

/** 2 KiB is enough for any real path; beyond it the input is treated as noise. */
export const REMOTE_FILE_BROWSER_FILTER_QUERY_MAX_BYTES = 2 * 1024

export function isRemoteFileBrowserFilterQueryTooLarge(
  query: string,
  maxBytes = REMOTE_FILE_BROWSER_FILTER_QUERY_MAX_BYTES
): boolean {
  return isClipboardTextByteLengthOverLimit(query, maxBytes)
}

export function filterEntries(entries: readonly BrowseEntry[], filter: string): BrowseEntry[] {
  if (isRemoteFileBrowserFilterQueryTooLarge(filter)) {
    return []
  }
  const trimmedFilter = filter.trim()
  if (!trimmedFilter) {
    return [...entries]
  }
  const query = trimmedFilter.toLowerCase()
  return entries.filter((entry) => entry.name.toLowerCase().includes(query))
}

// Enter-key behavior for the filter input:
//   (a) filtered set has exactly one folder → navigate into it (files alongside don't block)
//   (b) filtered set has files but no folders → fileHint
//   (c) otherwise → noop
export type EnterAction =
  | { type: 'navigate'; name: string }
  | { type: 'fileHint' }
  | { type: 'noop' }

export function decideEnterAction(filteredEntries: readonly BrowseEntry[]): EnterAction {
  const folders = filteredEntries.filter((entry) => entry.isDirectory)
  if (folders.length === 1) {
    return { type: 'navigate', name: folders[0]!.name }
  }
  if (folders.length === 0 && filteredEntries.length > 0) {
    return { type: 'fileHint' }
  }
  return { type: 'noop' }
}

export type EscAction = { type: 'clearFilter' } | { type: 'cancel' }

export function decideEscAction(filter: string): EscAction {
  return filter.length > 0 ? { type: 'clearFilter' } : { type: 'cancel' }
}

export function joinPath(
  resolvedPath: string,
  name: string,
  pathFlavor: FilesystemPathFlavor = 'posix'
): string {
  // Drive rows in a Windows host-root listing are already absolute (`M:\`).
  if (pathFlavor === 'win32' && resolvedPath === '/' && isDrivePath(name)) {
    return driveRootOf(name)
  }
  if (pathFlavor === 'win32' && isDrivePath(resolvedPath)) {
    return joinDrivePath(resolvedPath, name)
  }
  return resolvedPath === '/' ? `/${name}` : `${resolvedPath}/${name}`
}

export function parentPath(path: string, pathFlavor: FilesystemPathFlavor = 'posix'): string {
  if (pathFlavor === 'win32' && isDrivePath(path)) {
    return parentOfDrivePath(path)
  }
  if (path === '/' || path === '') {
    return '/'
  }
  const parent = path.replace(/\/[^/]+\/?$/, '')
  return parent || '/'
}

// ---------- Path-aware filter parsing ----------

export type ParsedInput =
  | { mode: 'filter'; filter: string }
  | {
      mode: 'path'
      // `root` = absolute `/`, `home` = resolved SSH user home, `cwd` = the currently
      // committed resolvedPath, `drive` = a Windows drive root.
      base: 'root' | 'home' | 'cwd' | 'drive'
      // Canonical `M:\` root; only set when `base` is 'drive'.
      driveRoot?: string
      // Segments to resolve one-by-one from the base. Repeated separators never appear here.
      committedSegments: string[]
      // The part after the final separator; drives the local filter on the resolved preview.
      trailingFilter: string
      // Only set for repeated-separator/control-character inputs.
      invalid?: string
    }

/** Slashes, drive anchors, and standalone base markers enter path mode. */
export function isPathMode(raw: string, pathFlavor: FilesystemPathFlavor = 'posix'): boolean {
  if (raw.includes('/')) {
    return true
  }
  if (pathFlavor === 'win32' && isDrivePath(raw)) {
    return true
  }
  return raw === '~' || raw === '.' || raw === '..'
}

export function isRemoteFileBrowserPathResolveTextTooLarge(text: string): boolean {
  return isClipboardTextByteLengthOverLimit(text, REMOTE_FILE_BROWSER_FILTER_QUERY_MAX_BYTES)
}

export function shouldDeferRemoteFileBrowserPasteResolve(text: string): boolean {
  return isRemoteFileBrowserPathResolveTextTooLarge(text)
}

export function parsePathInput(
  raw: string,
  pathFlavor: FilesystemPathFlavor = 'posix'
): ParsedInput {
  if (!isPathMode(raw, pathFlavor)) {
    // Filter mode preserves the raw text; trimming happens inside `filterEntries` so
    // leading/trailing spaces don't alter the input shown back to the user.
    return { mode: 'filter', filter: raw }
  }

  if (raw === '~') {
    return { mode: 'path', base: 'home', committedSegments: [], trailingFilter: '' }
  }
  if (raw === '.') {
    return { mode: 'path', base: 'cwd', committedSegments: [], trailingFilter: '' }
  }
  if (raw === '..') {
    return { mode: 'path', base: 'cwd', committedSegments: ['..'], trailingFilter: '' }
  }

  let base: 'root' | 'home' | 'cwd' | 'drive'
  let driveRoot: string | undefined
  let remainder: string
  if (pathFlavor === 'win32' && isDrivePath(raw)) {
    base = 'drive'
    driveRoot = driveRootOf(raw)
    remainder = raw.slice(2).replace(/^[\\/]/, '')
  } else if (raw.startsWith('/')) {
    base = 'root'
    remainder = raw.slice(1)
  } else if (raw.startsWith('~/')) {
    base = 'home'
    remainder = raw.slice(2)
  } else {
    base = 'cwd'
    remainder = raw
  }

  // Don't collapse `//`: the visible input must agree with the path being resolved.
  const hasRepeatedSeparators =
    base === 'drive' ? /[\\/]{2,}/.test(remainder) : remainder.includes('//')
  if (hasRepeatedSeparators) {
    return {
      mode: 'path',
      base,
      driveRoot,
      committedSegments: [],
      trailingFilter: '',
      invalid: 'Invalid path: repeated separators'
    }
  }

  // Reject control characters (including NUL and newlines) in path input. These segments
  // are eventually shell-escaped and passed to `cd <path> && ls`; embedded newlines would
  // corrupt the line-based `ls -1` parser, and NUL bytes break C string boundaries. Single-
  // quote escaping protects against injection but not against these structural hazards.
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1F]/.test(remainder)) {
    return {
      mode: 'path',
      base,
      driveRoot,
      committedSegments: [],
      trailingFilter: '',
      invalid: 'Invalid path: control characters are not allowed'
    }
  }

  const parts =
    remainder === '' ? [''] : base === 'drive' ? remainder.split(/[\\/]/) : remainder.split('/')
  const trailingFilter = parts.at(-1) ?? ''
  const committedSegments = parts.slice(0, -1)

  return { mode: 'path', base, driveRoot, committedSegments, trailingFilter }
}

export type SegmentOutcome =
  | { type: 'stay' }
  | { type: 'descend'; name: string }
  | { type: 'error'; message: string }

// Pure decision step for one committed segment. The caller supplies the base path (for
// error messages) and that base's listing.
export function resolveSegmentStep(
  segment: string,
  basePath: string,
  baseEntries: readonly BrowseEntry[]
): SegmentOutcome {
  if (segment === '.' || segment === '..') {
    return { type: 'stay' }
  }
  const notDirectory = (): SegmentOutcome => ({
    type: 'error',
    message: translate(
      'auto.components.sidebar.remote.file.browser.helpers.4dbd72a7d7',
      "{{value0}} isn't a directory in {{value1}}",
      { value0: segment, value1: basePath }
    )
  })
  // Exact (case-sensitive) match wins. When both `Documents` and `documents` exist on a
  // case-sensitive filesystem, the user's literal spelling must be authoritative.
  const exact = baseEntries.find((entry) => entry.name === segment)
  if (exact) {
    return exact.isDirectory ? { type: 'descend', name: exact.name } : notDirectory()
  }
  // Fall back to case-insensitive matching so segment resolution agrees with the
  // case-insensitive filter input; the two modes must not disagree.
  const segmentLower = segment.toLowerCase()
  const caseInsensitive = baseEntries.find((entry) => entry.name.toLowerCase() === segmentLower)
  if (caseInsensitive) {
    return caseInsensitive.isDirectory
      ? { type: 'descend', name: caseInsensitive.name }
      : notDirectory()
  }
  const dirMatches = baseEntries.filter(
    (entry) => entry.isDirectory && entry.name.toLowerCase().startsWith(segmentLower)
  )
  if (dirMatches.length === 1) {
    return { type: 'descend', name: dirMatches[0]!.name }
  }
  if (dirMatches.length > 1) {
    return {
      type: 'error',
      message: translate(
        'auto.components.sidebar.remote.file.browser.helpers.be266af66c',
        '{{value0}} matches multiple directories in {{value1}}',
        { value0: segment, value1: basePath }
      )
    }
  }
  return notDirectory()
}
