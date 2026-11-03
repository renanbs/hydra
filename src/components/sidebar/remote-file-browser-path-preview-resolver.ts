// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/remote-file-browser-path-preview-resolver.ts
import type { Dispatch, RefObject, SetStateAction } from 'react'
import type { FilesystemPathFlavor } from '../../shared/filesystem-entry-types'
import {
  joinPath,
  parentPath,
  parsePathInput,
  resolveSegmentStep,
  type BrowseEntry
} from './remote-file-browser-helpers'
import type { FetchListing } from './use-remote-file-browser-listing'

export type PreviewState = {
  resolvedPath: string
  entries: BrowseEntry[]
  filter: string
  error: string | null
  loading: boolean
}

export type ResolvePathInputArgs = {
  raw: string
  resolvedPath: string
  pathFlavor: FilesystemPathFlavor
  fetchListing: FetchListing
  homePathRef: RefObject<string | null>
  previewGenRef: RefObject<number>
  lastCommittedPrefixRef: RefObject<string>
  setPreview: Dispatch<SetStateAction<PreviewState | null>>
}

/** Resolves a path-mode input into preview state, publishing loading/error as it walks. */
export async function resolvePathInput({
  raw,
  resolvedPath,
  pathFlavor,
  fetchListing,
  homePathRef,
  previewGenRef,
  lastCommittedPrefixRef,
  setPreview
}: ResolvePathInputArgs): Promise<void> {
  const parsed = parsePathInput(raw, pathFlavor)
  if (parsed.mode !== 'path') {
    return
  }
  const generation = ++previewGenRef.current
  const isStale = () => generation !== previewGenRef.current

  if (parsed.invalid) {
    setPreview({
      resolvedPath,
      entries: [],
      filter: '',
      error: parsed.invalid,
      loading: false
    })
    return
  }

  // Pick the base path; `~` needs the resolved home, so fetch and cache it once first.
  let basePath: string
  if (parsed.base === 'root') {
    basePath = '/'
  } else if (parsed.base === 'drive') {
    basePath = parsed.driveRoot ?? '/'
  } else if (parsed.base === 'home') {
    if (!homePathRef.current) {
      setPreview({ resolvedPath, entries: [], filter: '', error: null, loading: true })
      try {
        const home = await fetchListing('~')
        if (isStale()) {
          return
        }
        homePathRef.current = home.resolvedPath
      } catch (err) {
        if (isStale()) {
          return
        }
        setPreview({
          resolvedPath,
          entries: [],
          filter: '',
          error: err instanceof Error ? err.message : String(err),
          loading: false
        })
        return
      }
    }
    basePath = homePathRef.current ?? '/'
  } else {
    basePath = resolvedPath
  }

  setPreview((previous) => ({
    resolvedPath: previous?.resolvedPath ?? basePath,
    entries: previous?.entries ?? [],
    filter: previous?.filter ?? '',
    error: null,
    loading: true
  }))

  let currentPath = basePath
  try {
    for (const segment of parsed.committedSegments) {
      const listing = await fetchListing(currentPath)
      if (isStale()) {
        return
      }
      const outcome = resolveSegmentStep(segment, currentPath, listing.entries)
      if (outcome.type === 'error') {
        setPreview({
          resolvedPath: currentPath,
          entries: listing.entries,
          filter: '',
          error: outcome.message,
          loading: false
        })
        return
      }
      if (outcome.type === 'stay') {
        if (segment === '..') {
          currentPath = parentPath(currentPath, listing.pathFlavor)
        }
        continue
      }
      currentPath = joinPath(currentPath, outcome.name, listing.pathFlavor)
    }

    const finalListing = await fetchListing(currentPath)
    if (isStale()) {
      return
    }
    lastCommittedPrefixRef.current = committedPrefix(raw)
    setPreview({
      resolvedPath: finalListing.resolvedPath,
      entries: finalListing.entries,
      filter: parsed.trailingFilter,
      error: null,
      loading: false
    })
  } catch (err) {
    if (isStale()) {
      return
    }
    setPreview({
      resolvedPath: currentPath,
      entries: [],
      filter: '',
      error: err instanceof Error ? err.message : String(err),
      loading: false
    })
  }
}

/** Portion before the final separator; distinguishes filter-only edits from path changes. */
export function committedPrefix(raw: string): string {
  const index = Math.max(raw.lastIndexOf('/'), raw.lastIndexOf('\\'))
  return index === -1 ? '' : raw.slice(0, index + 1)
}
