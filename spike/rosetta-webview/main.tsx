// Rosetta spike page: the real Orca SidebarRoot, in the real Tauri webview, with
// `window.api` generated from Orca's preload types and three groups bound to
// Hydra commands. Everything that falls through is logged as an orphan.
import type React from 'react'
import { createRoot } from 'react-dom/client'
import { invoke } from '@tauri-apps/api/core'
import { useRef } from 'react'
import SidebarRoot from '@/components/sidebar'
import { useAppStore } from '@/store'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ConfirmationDialogProvider } from '@/components/confirmation-dialog'
import { LinkRoutingPreferenceDialogProvider } from '@/components/link-routing-preference-dialog'
import { createRosettaApi, type RosettaCall } from '../rosetta/generated/window-api.generated'
// Orca's preload exposes a few synchronous values; RPC is async, so those stay local.
const localSyncBindings = {
  'platform.get': () => ({
    platform: 'linux' as NodeJS.Platform,
    osRelease: '',
    arch: 'x64',
    shell: '',
    displayServer: 'wayland' as const
  })
}

type RpcReply = { kind: 'rpc-result'; id: number; payload?: unknown; error?: string }
let nextRpcId = 1
const pendingRpcs = new Map<number, (reply: RpcReply) => void>()

window.addEventListener('message', (event: MessageEvent<RpcReply>) => {
  const data = event.data
  if (!data || data.kind !== 'rpc-result') return
  pendingRpcs.get(data.id)?.(data)
  pendingRpcs.delete(data.id)
})

function rpc(path: string, args: unknown[]): Promise<unknown> {
  const id = nextRpcId++
  return new Promise((resolve, reject) => {
    pendingRpcs.set(id, (reply) => {
      if (reply.error) reject(new Error(reply.error))
      else resolve(reply.payload)
    })
    window.parent.postMessage({ kind: 'rpc', id, path, args }, '*')
  })
}

;(window as unknown as { api: unknown }).api = createRosettaApi(localSyncBindings, rpc)

type Logged = RosettaCall & { count: number }
const reported = new Map<string, Logged>()
let flushTimer: number | null = null

function flush(): void {
  const entries = [...reported.values()].map(
    (call) => `${call.bound ? 'bound ' : 'ORPHAN'} ${call.path} x${call.count}`
  )
  if (entries.length === 0) return
  reported.clear()
  // Bound/orphan accounting belongs to the host frame; the child only reports
  // page-level facts (the ledger here cannot see the host's bindings).
  const pageEntries = entries.map((entry) => `PAGE ${entry.replace('ORPHAN ', '')}`)
  void fetch('/__rosetta-report', {
    method: 'POST',
    headers: { 'content-type': 'text/plain' },
    body: pageEntries.join('\n')
  }).catch(() => {})
}

function reportCall(call: RosettaCall): void {
  const existing = reported.get(call.path)
  if (existing) existing.count += 1
  else reported.set(call.path, { ...call, count: 1 })
  if (flushTimer === null) {
    flushTimer = window.setTimeout(() => {
      flushTimer = null
      flush()
    }, 400)
  }
}

// Wrap the ledger so every call also reaches the Rust logger.
const log = ((window as unknown as { __rosettaLog: RosettaCall[] }).__rosettaLog ??= [])
const rawPush = log.push.bind(log)
log.push = (...items: RosettaCall[]) => {
  for (const item of items) reportCall(item)
  return rawPush(...items)
}

function SpikeShell(): React.ReactElement {
  const scrollOffsetRef = useRef(0)
  const scrollAnchorRef = useRef({ worktreeId: null, offset: 0 })
  return (
    <TooltipProvider delayDuration={400}>
      <ConfirmationDialogProvider>
        <LinkRoutingPreferenceDialogProvider>
          <div style={{ display: 'flex', height: '100%', width: '100%' }}>
            <SidebarRoot
              worktreeScrollOffsetRef={scrollOffsetRef}
              worktreeScrollAnchorRef={scrollAnchorRef as never}
            />
          </div>
        </LinkRoutingPreferenceDialogProvider>
      </ConfirmationDialogProvider>
    </TooltipProvider>
  )
}

createRoot(document.getElementById('root')!).render(<SpikeShell />)

// The real app shell hydrates the catalog from AppBackgroundServices; the spike
// page only mounts the sidebar, so trigger the same local-first load here.
window.setTimeout(() => {
  const state = useAppStore.getState() as unknown as {
    fetchReposForAllHosts?: (options?: unknown) => Promise<void>
  }
  void state.fetchReposForAllHosts?.({}).catch((error) => console.error('[rosetta] catalog load failed', error))
}, 300)

// Hard evidence for the report: what the shipped Orca store actually holds.
window.setTimeout(() => {
  const state = useAppStore.getState() as unknown as {
    repos?: unknown[]
    worktreesByRepo?: Record<string, unknown[]>
    sidebarOpen?: boolean
    projects?: unknown[]
  }
  const summary = [
    `STATE repos=${state.repos?.length ?? 0}`,
    `projects=${state.projects?.length ?? 0}`,
    `worktrees=${Object.values(state.worktreesByRepo ?? {}).flat().length}`,
    `sidebarOpen=${String(state.sidebarOpen)}`
  ].join(' ')
  void fetch('/__rosetta-report', { method: 'POST', body: summary }).catch(() => {})
}, 2500)

// Probe: does IPC actually reach Rust from this remote origin?
window.setTimeout(() => {
  void invoke<string>('get_app_version')
    .then((version) => fetch('/__rosetta-report', { method: 'POST', body: `IPC ok version=${version}` }))
    .catch((error) => fetch('/__rosetta-report', { method: 'POST', body: `IPC FAIL ${String(error)}` }))
}, 1200)

// First frames: report whatever the boot path asked for, then keep flushing.
window.setTimeout(flush, 1500)
window.addEventListener('beforeunload', flush)
