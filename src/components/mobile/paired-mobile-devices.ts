// Adapter over `src/reference/components/mobile/paired-mobile-devices.ts`
// (verbatim Orca, pinned in `src/reference/REVISION`).
//
// Rosetta D01-024: one shared device-list request across surfaces (sidebar,
// Mobile page, Settings). The reference calls `window.api.mobile.listDevices()`;
// Hydra routes through the Tauri `mobile_list_devices` command (empty until a
// mobile pairing server exists — an empty list is the correct "no devices"
// state, distinct from a load error).
import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { invoke } from '@tauri-apps/api/core'

export type PairedMobileDevice = {
  deviceId: string
  name: string
  pairedAt: number
  lastSeenAt: number
}

type PairedMobileDevicesSnapshot = {
  devices: readonly PairedMobileDevice[]
  loaded: boolean
  loading: boolean
  // Why: distinguishes "load failed" from "zero devices paired" — both leave
  // devices empty, but only the former should be retried/recovered.
  error: boolean
}

type RefreshPairedMobileDevicesOptions = {
  force?: boolean
}

const EMPTY_SNAPSHOT: PairedMobileDevicesSnapshot = {
  devices: [],
  loaded: false,
  loading: false,
  error: false
}

let snapshot = EMPTY_SNAPSHOT
// Why: Sidebar, Mobile page, and Settings can mount together; share one
// device-list request so slow IPC does not fan out across surfaces.
let activeRequest: {
  id: number
  promise: Promise<readonly PairedMobileDevice[]>
} | null = null
let latestRequestId = 0

const listeners = new Set<() => void>()

function publish(nextSnapshot: PairedMobileDevicesSnapshot): void {
  snapshot = nextSnapshot
  for (const listener of listeners) {
    listener()
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot(): PairedMobileDevicesSnapshot {
  return snapshot
}

// Why: a superseded request must hand back whatever now owns the shared cache —
// the newer in-flight request's promise, or the current published devices —
// never the stale data the store already ignored.
function supersededResult():
  | Promise<readonly PairedMobileDevice[]>
  | readonly PairedMobileDevice[] {
  return activeRequest?.promise ?? snapshot.devices
}

// Why: lets callers read the up-to-the-moment device list synchronously inside
// callbacks/closures without hand-mirroring the store into a local ref.
export function getPairedMobileDevicesSnapshot(): readonly PairedMobileDevice[] {
  return snapshot.devices
}

export function replacePairedMobileDevices(devices: readonly PairedMobileDevice[]): void {
  latestRequestId += 1
  activeRequest = null
  publish({ devices: [...devices], loaded: true, loading: false, error: false })
}

export function refreshPairedMobileDevices({
  force = false
}: RefreshPairedMobileDevicesOptions = {}): Promise<readonly PairedMobileDevice[]> {
  if (activeRequest && !force) {
    return activeRequest.promise
  }

  const requestId = latestRequestId + 1
  latestRequestId = requestId
  publish({ ...snapshot, loading: true })

  const promise = invoke<{ devices: PairedMobileDevice[] }>('mobile_list_devices')
    .then((result) => {
      const devices = [...(result.devices ?? [])]
      if (requestId !== latestRequestId) {
        return supersededResult()
      }
      publish({
        devices,
        loaded: true,
        loading: false,
        error: false
      })
      return devices
    })
    .catch((error: unknown) => {
      if (requestId !== latestRequestId) {
        return supersededResult()
      }
      // Why: keep loaded:true so the loaded-gated mount effect can't refire into a
      // retry loop; flag error so consumers can distinguish a failed load from "no
      // devices" and recover.
      publish({
        ...snapshot,
        loaded: true,
        loading: false,
        error: true
      })
      throw error
    })
  const tracked = promise.finally(() => {
    if (activeRequest?.id === requestId) {
      activeRequest = null
    }
  })
  activeRequest = { id: requestId, promise: tracked }
  return tracked
}

export function usePairedMobileDevices({ enabled = true }: { enabled?: boolean } = {}): {
  devices: readonly PairedMobileDevice[]
  loaded: boolean
  loading: boolean
  error: boolean
  hasPairedDevice: boolean
  refresh: (options?: RefreshPairedMobileDevicesOptions) => Promise<readonly PairedMobileDevice[]>
} {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  const refresh = useCallback((options?: RefreshPairedMobileDevicesOptions) => {
    return refreshPairedMobileDevices(options ?? {})
  }, [])

  useEffect(() => {
    if (!enabled) {
      return
    }
    if (state.loaded || state.loading) {
      return
    }
    void refreshPairedMobileDevices({}).catch(() => {})
  }, [enabled, refresh, state.loaded, state.loading])

  return {
    devices: state.devices,
    loaded: state.loaded,
    loading: state.loading,
    error: state.error,
    hasPairedDevice: state.devices.length > 0,
    refresh
  }
}

/** Test-only: resets the module cache between cases. */
export function _resetPairedMobileDevicesCacheForTests(): void {
  snapshot = EMPTY_SNAPSHOT
  activeRequest = null
  latestRequestId = 0
}
