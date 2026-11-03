// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/folder-workspace-composer-path-status.ts
//
// D02a-036: creating a folder workspace must not succeed against a path that is
// gone or unreadable. The probe uses Hydra's existing `folder_path_status`
// command, caches confirmed answers for the shared TTL, and stays unknown for a
// remote host this client cannot probe (no false block from a local answer).
import { useEffect, useMemo, useRef, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import {
  FOLDER_WORKSPACE_PATH_STATUS_TTL_MS,
  blocksFolderWorkspaceActivation,
  type FolderWorkspacePathStatus
} from '../../shared/folder-workspace-path-status'
import {
  getFreshFolderPathStatus,
  isLocalFolderPathStatusEnvironment,
  resolveFolderPathStatusHost,
  type FolderPathStatusEntry
} from '../../lib/folder-path-status-cache'
import {
  getFolderWorkspacePathStatusDescription,
  getFolderWorkspacePathStatusTitle
} from '../../lib/folder-workspace-path-status'

export function useFolderWorkspaceComposerPathStatus(args: {
  folderPath: string
  open: boolean
  executionHostId?: string | null
  connectionId?: string | null
}): {
  pathStatus: FolderWorkspacePathStatus | null
  pathStatusBlocksCreate: boolean
  pathStatusProjectError: string | null
} {
  const folderPath = args.folderPath.trim()
  const host = resolveFolderPathStatusHost(args)
  const isLocalHost = isLocalFolderPathStatusEnvironment({
    executionHostId: host,
    epoch: 'composer'
  })
  const entriesRef = useRef<Map<string, FolderPathStatusEntry>>(new Map())
  const [status, setStatus] = useState<FolderWorkspacePathStatus | null>(null)
  const [pending, setPending] = useState(false)
  // Bump once per TTL so an expired cached answer re-probes while the composer
  // stays open instead of blocking (or allowing) on a stale result.
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!args.open || !isLocalHost) return
    const interval = window.setInterval(
      () => setTick((current) => current + 1),
      FOLDER_WORKSPACE_PATH_STATUS_TTL_MS
    )
    return () => window.clearInterval(interval)
  }, [args.open, isLocalHost])

  useEffect(() => {
    if (!args.open || !folderPath || !isLocalHost) {
      setPending(false)
      setStatus(null)
      return
    }
    const key = `${host}\0${folderPath}`
    const cached = entriesRef.current.get(key)
    const fresh = getFreshFolderPathStatus(cached, Date.now())
    if (fresh) {
      setStatus(fresh)
      setPending(false)
      return
    }
    let cancelled = false
    setPending(true)
    invoke<FolderWorkspacePathStatus>('folder_path_status', { path: folderPath })
      .then((next) => {
        if (cancelled) return
        entriesRef.current.set(key, { status: next, probedAt: Date.now() })
        setStatus(next)
      })
      .catch(() => {
        // Why: a probe failure is not evidence the folder is gone; leave the
        // status unknown so the composer does not block on host downtime.
        if (!cancelled) setStatus(null)
      })
      .finally(() => {
        if (!cancelled) setPending(false)
      })
    return () => {
      cancelled = true
    }
  }, [args.open, folderPath, host, isLocalHost, tick])

  const blocksCreate = useMemo(() => {
    if (!args.open || !isLocalHost) return false
    return pending || blocksFolderWorkspaceActivation(status)
  }, [args.open, isLocalHost, pending, status])

  const projectError = useMemo(() => {
    if (!status || !blocksFolderWorkspaceActivation(status)) return null
    const title = getFolderWorkspacePathStatusTitle(status)
    const description = getFolderWorkspacePathStatusDescription(status)
    if (!title) return null
    return description ? `${title}. ${description}` : title
  }, [status])

  return {
    pathStatus: status,
    pathStatusBlocksCreate: blocksCreate,
    pathStatusProjectError: projectError
  }
}
