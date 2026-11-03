// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/AddRepoHostSelector.tsx
//
// D02a-003: the Add Project host picker. It shows the selected host with its
// health badge, lets the user switch to another selectable host, and probes a
// disconnected SSH host in place (Loader2 while the probe runs).
import { useState } from 'react'
import { ChevronDown, Loader2, Monitor, PlugZap, Server, Laptop } from 'lucide-react'
import {
  canConnectAddRepoHost,
  canSelectAddRepoHost,
  getAddRepoHostCompatibilityHint
} from './add-repo-host-availability'
import {
  getSidebarHostHealthLabel,
  type SidebarHostOption
} from './sidebar-host-options'

function HostKindIcon({
  kind
}: {
  kind: SidebarHostOption['kind']
}): React.JSX.Element {
  if (kind === 'ssh') return <Server className="size-3.5" />
  if (kind === 'runtime') return <Monitor className="size-3.5" />
  return <Laptop className="size-3.5" />
}

function hostHealthTone(health: SidebarHostOption['health']): string {
  if (health === 'local' || health === 'available') return 'text-emerald-400 border-emerald-500/30'
  if (health === 'connecting') return 'text-amber-300 border-amber-500/30'
  return 'text-red-400 border-red-500/30'
}

export function AddRepoHostSelector({
  hostOptions,
  selectedHostId,
  connectingTargetIds,
  onSelect,
  onConnect
}: {
  hostOptions: readonly SidebarHostOption[]
  selectedHostId: string
  connectingTargetIds: ReadonlySet<string>
  onSelect: (hostId: string) => void
  onConnect: (targetId: string) => Promise<boolean>
}): React.JSX.Element | null {
  const [open, setOpen] = useState(false)
  const selected = hostOptions.find((host) => host.id === selectedHostId) ?? null

  if (hostOptions.length <= 1) {
    return null
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center gap-2 rounded-md border border-[#2a2b30] bg-[#0e0f11] px-2.5 py-1.5 text-left text-xs text-neutral-200 transition hover:border-[#3f3f46] cursor-pointer"
      >
        <span className="text-neutral-400">
          <HostKindIcon kind={selected?.kind ?? 'local'} />
        </span>
        <span className="min-w-0 flex-1 truncate font-medium">
          {selected?.label ?? 'This computer'}
        </span>
        {selected ? (
          <span
            className={`shrink-0 rounded border px-1 py-0.5 text-[10px] ${hostHealthTone(selected.health)}`}
          >
            {getSidebarHostHealthLabel(selected.health)}
          </span>
        ) : null}
        <ChevronDown
          className={`size-3.5 shrink-0 text-neutral-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-9 z-50 max-h-64 space-y-0.5 overflow-y-auto rounded-lg border border-[#2c2d33] bg-[#18191d] p-1 shadow-2xl"
        >
          {hostOptions.map((host) => {
            const selectable = canSelectAddRepoHost(host)
            const connectable = canConnectAddRepoHost(host)
            const compatibilityHint = getAddRepoHostCompatibilityHint(host)
            const targetId =
              host.kind === 'ssh' ? decodeURIComponent(host.id.slice('ssh:'.length)) : null
            const connecting = targetId ? connectingTargetIds.has(targetId) : false
            return (
              <div
                key={host.id}
                className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs ${
                  host.id === selectedHostId
                    ? 'bg-emerald-500/15 text-emerald-300'
                    : 'text-neutral-300'
                }`}
              >
                <button
                  type="button"
                  role="option"
                  aria-selected={host.id === selectedHostId}
                  disabled={!selectable}
                  onClick={() => {
                    onSelect(host.id)
                    setOpen(false)
                  }}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left transition hover:text-neutral-100 disabled:cursor-default disabled:opacity-50 cursor-pointer"
                >
                  <span className="shrink-0 text-neutral-400">
                    <HostKindIcon kind={host.kind} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{host.label}</span>
                    <span className="block truncate text-[10px] text-neutral-500">
                      {compatibilityHint ?? host.detail}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 rounded border px-1 py-0.5 text-[10px] ${hostHealthTone(host.health)}`}
                  >
                    {getSidebarHostHealthLabel(host.health)}
                  </span>
                </button>
                {connectable && targetId ? (
                  <button
                    type="button"
                    aria-label={`Connect ${host.label}`}
                    title="Connect SSH host"
                    disabled={connecting}
                    onClick={() => {
                      void onConnect(targetId)
                    }}
                    className="inline-flex size-6 shrink-0 items-center justify-center rounded text-neutral-400 transition hover:bg-neutral-800 hover:text-neutral-100 disabled:cursor-default cursor-pointer"
                  >
                    {connecting ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <PlugZap className="size-3.5" />
                    )}
                  </button>
                ) : null}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
