// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/use-remote-file-browser-listing.ts
import { useCallback, useRef, type RefObject } from 'react'
import {
  browseRuntimeServerDirectory,
  browseSshDirectory,
  type RemoteBrowseResult
} from '@/store/remote-browse-bridge'

export type FetchListing = (dirPath: string) => Promise<RemoteBrowseResult>

export type RemoteFileBrowserListing = {
  fetchListing: FetchListing
  homePathRef: RefObject<string | null>
}

export type RemoteFileBrowserSource =
  | { kind: 'ssh'; targetId: string }
  | { kind: 'runtime'; runtimeEnvironmentId: string }

export function useRemoteFileBrowserListing(
  source: RemoteFileBrowserSource
): RemoteFileBrowserListing {
  // Per-picker listing cache keyed by resolved path, so typing issues at most one remote
  // call per committed segment.
  const listingCacheRef = useRef<Map<string, RemoteBrowseResult>>(new Map())
  // Resolved remote home, cached after the first browse of '~'; anchors `~`/`~/...`
  // without hardcoding a home dir.
  const homePathRef = useRef<string | null>(null)
  const targetId = source.kind === 'ssh' ? source.targetId : null
  const runtimeEnvironmentId = source.kind === 'runtime' ? source.runtimeEnvironmentId : null

  const fetchListing = useCallback(
    async (dirPath: string): Promise<RemoteBrowseResult> => {
      const cached = listingCacheRef.current.get(dirPath)
      if (cached) {
        return cached
      }
      const result = targetId
        ? await browseSshDirectory(targetId, dirPath)
        : await browseRuntimeServerDirectory(runtimeEnvironmentId ?? '', dirPath)
      listingCacheRef.current.set(result.resolvedPath, result)
      // Also key by the requested dirPath (e.g. `~`, relative) so an identical request
      // doesn't re-hit the backend.
      if (dirPath !== result.resolvedPath) {
        listingCacheRef.current.set(dirPath, result)
      }
      return result
    },
    [runtimeEnvironmentId, targetId]
  )

  return { fetchListing, homePathRef }
}
