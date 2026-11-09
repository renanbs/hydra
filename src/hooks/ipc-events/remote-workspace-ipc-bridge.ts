// Real bridge for remote-workspace changed notifications.
// Replaces the auto-stub. Listens on the Tauri `remote-workspace:changed`
// emit, filters own-echo via the stable `remote_workspace_client_id`, and
// applies the snapshot through the runtime's `remoteWorkspaceTargetSync`
// when the full direct-SSH state machine provides one (that runtime is a
// later fatia; until then the bridge hydrates identity and filters echo,
// and surfaces apply failures in the sync-status slice).
// Mirrors Orca `renderer/src/hooks/ipc-events/remote-workspace-ipc-bridge.ts`.
import { listen } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'
import { useAppStore } from '@/store'

/** Minimal runtime surface this bridge needs (subset of Orca's `DirectSshBridgeRuntime`). */
export type RemoteWorkspaceBridgeRuntime = {
  remoteWorkspaceTargetSync?: {
    applyUnsolicitedSnapshot?: (targetId: string, snapshot: unknown) => Promise<void>
  } | null
}

type RemoteWorkspaceChangedPayload = {
  targetId: string
  snapshot: {
    revision: number
    namespace: string
    updatedAt: number
    schemaVersion: number
    session: unknown
    hostObservationToken: string
  }
  sourceClientId?: string
}

export function registerRemoteWorkspaceIpcBridge(
  unsubs: (() => void)[],
  runtime: RemoteWorkspaceBridgeRuntime
): void {
  let clientId: string | null = null
  let clientIdPromise: Promise<string | null> | null = null
  let stopped = false

  const getClientId = (): Promise<string | null> => {
    if (clientId) {
      return Promise.resolve(clientId)
    }
    clientIdPromise ??= invoke<string>('remote_workspace_client_id')
      .then((id) => {
        clientId = id
        return id
      })
      .catch(() => null)
    return clientIdPromise
  }
  void getClientId()

  void (async () => {
    const unlisten = await listen<RemoteWorkspaceChangedPayload>(
      'remote-workspace:changed',
      (event) => {
        if (stopped) {
          return
        }
        void (async () => {
          const currentClientId = await getClientId()
          if (
            event.payload.sourceClientId &&
            currentClientId &&
            event.payload.sourceClientId === currentClientId
          ) {
            return
          }
          const apply = runtime.remoteWorkspaceTargetSync?.applyUnsolicitedSnapshot
          if (!apply) {
            return
          }
          try {
            await apply(event.payload.targetId, event.payload.snapshot)
          } catch (error) {
            useAppStore.getState().setRemoteWorkspaceSyncStatus(event.payload.targetId, {
              phase: 'error',
              revision: event.payload.snapshot.revision,
              message: error instanceof Error ? error.message : 'Failed to apply remote workspace'
            })
          }
        })()
      }
    )
    if (stopped) {
      unlisten()
    } else {
      unsubs.push(unlisten)
    }
  })().catch((error: unknown) => {
    console.error('Failed to attach remote-workspace bridge:', error)
  })

  unsubs.push(() => {
    stopped = true
  })
}
