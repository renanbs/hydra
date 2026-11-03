import { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import type { PreflightToolsStatus } from '@/shared/preflight-tools-status'

/**
 * Host CLI preflight shared by the Tasks nav (D01-020).
 *
 * The probe spawns `git`/`gh`/`glab`, so one module-level cache keeps a
 * remount from re-running it while the answer is still fresh for this window.
 * A failed probe is not cached: the next mount retries instead of pinning
 * every provider to "unavailable" for the rest of the session.
 */
let cachedStatus: PreflightToolsStatus | null = null
let inFlight: Promise<PreflightToolsStatus | null> | null = null

function probePreflightTools(): Promise<PreflightToolsStatus | null> {
  return invoke<PreflightToolsStatus>('check_preflight_tools_cmd')
    .then((status) => {
      cachedStatus = status
      return status
    })
    .catch(() => null)
}

export function loadPreflightToolsStatus(force = false): Promise<PreflightToolsStatus | null> {
  if (!force && cachedStatus) {
    return Promise.resolve(cachedStatus)
  }
  if (!inFlight) {
    inFlight = probePreflightTools().finally(() => {
      inFlight = null
    })
  }
  return inFlight
}

export function usePreflightToolsStatus(): {
  status: PreflightToolsStatus | null
  loading: boolean
} {
  const [status, setStatus] = useState<PreflightToolsStatus | null>(() => cachedStatus)
  const [loading, setLoading] = useState(() => cachedStatus === null)

  useEffect(() => {
    if (cachedStatus) {
      setStatus(cachedStatus)
      setLoading(false)
      return
    }
    let cancelled = false
    void loadPreflightToolsStatus().then((next) => {
      if (cancelled) {
        return
      }
      setStatus(next)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return { status, loading }
}
