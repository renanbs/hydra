// Real bridge for SSH credential + port-forward events.
// Replaces the auto-stub. Listens on Tauri emits from `ssh_credential.rs` and
// `ssh_portforward.rs`, and drives the store slices the ported UI reads.
// The full direct-SSH state machine (authority, reconnect coordinator, wake
// routing — Orca `direct-ssh-state-ipc-bridge.ts` 273L) stays a separate fatia:
// this bridge wires exactly the events the F07 UI needs today.
import { listen } from '@tauri-apps/api/event'
import { useAppStore } from '@/store'
import type { EnrichedDetectedPort, PortForwardEntry } from '@/shared/ssh-types'
import type { SshCredentialRequest } from '@/store/slices/ssh'

type SshCredentialRequestEvent = {
  requestId: string
  targetId: string
  kind: 'passphrase' | 'password' | 'keyboard-interactive'
  detail: string
}

export function registerDirectSshStateIpcBridge(unsubs: (() => void)[]): void {
  let stopped = false

  void (async () => {
    const unlistenCredentialRequest = await listen<SshCredentialRequestEvent>(
      'ssh:credential-request',
      (event) => {
        if (stopped) {
          return
        }
        const payload: SshCredentialRequest = {
          requestId: event.payload.requestId,
          targetId: event.payload.targetId,
          kind: event.payload.kind,
          detail: event.payload.detail
        }
        useAppStore.getState().enqueueSshCredentialRequest(payload)
      }
    )
    if (stopped) {
      unlistenCredentialRequest()
    } else {
      unsubs.push(unlistenCredentialRequest)
    }

    const unlistenCredentialResolved = await listen<{ requestId: string }>(
      'ssh:credential-resolved',
      (event) => {
        if (!stopped) {
          useAppStore.getState().removeSshCredentialRequest(event.payload.requestId)
        }
      }
    )
    if (stopped) {
      unlistenCredentialResolved()
    } else {
      unsubs.push(unlistenCredentialResolved)
    }

    const unlistenForwards = await listen<{ targetId: string; forwards: PortForwardEntry[] }>(
      'ssh:port-forwards-changed',
      (event) => {
        if (!stopped) {
          useAppStore.getState().setPortForwards(event.payload.targetId, event.payload.forwards)
        }
      }
    )
    if (stopped) {
      unlistenForwards()
    } else {
      unsubs.push(unlistenForwards)
    }

    const unlistenDetected = await listen<{ targetId: string; ports: EnrichedDetectedPort[] }>(
      'ssh:detected-ports-changed',
      (event) => {
        if (!stopped) {
          useAppStore.getState().setDetectedPorts(event.payload.targetId, event.payload.ports)
        }
      }
    )
    if (stopped) {
      unlistenDetected()
    } else {
      unsubs.push(unlistenDetected)
    }
  })().catch((error: unknown) => {
    console.error('Failed to attach SSH event bridge:', error)
  })

  unsubs.push(() => {
    stopped = true
  })
}
