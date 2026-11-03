// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/SshTargetRow.tsx
//
// D02b-021: the row used in the Add Project wizard to pick an SSH target. It carries the
// connection indicator, the `username@host` fallback label, and the inline Connect action
// so a configured-but-offline host does not send the user to Settings first.
//
// Selection is only meaningful for a connected target: an offline row has no project it
// could own yet, so the row stays inert and Connect is the only affordance. The connect
// click stops propagation so it cannot double as a selection.
import { Loader2 } from 'lucide-react'
import { translate } from '@/i18n/i18n'
import { isConnectingSshStatus } from '@/ssh/ssh-connection-recoverability'
import {
  beginSshConnect,
  endSshConnect,
  isSshConnectInFlight,
  useSshConnectInFlight
} from '@/ssh/ssh-connect-in-flight'
import type { SshConnectionStatus } from '../../shared/ssh-types'

export type SshTargetRowTarget = {
  /** Registry id (not the `ssh:` execution-host id). */
  id: string
  label: string
  username?: string
  host?: string
}

export type SshTargetRowProps = {
  target: SshTargetRowTarget
  status?: SshConnectionStatus | null
  /** The target already chosen by the wizard. */
  isSelected: boolean
  onSelect: (targetId: string) => void
  onConnect: (targetId: string) => Promise<unknown> | unknown
}

function statusDotClass(isConnected: boolean, isBusy: boolean): string {
  if (isConnected) {
    return 'bg-green-500'
  }
  return isBusy ? 'bg-yellow-500' : 'bg-muted-foreground/30'
}

export function SshTargetRow({
  target,
  status,
  isSelected,
  onSelect,
  onConnect
}: SshTargetRowProps): React.JSX.Element {
  // Why the shared registry instead of local state: every SSH surface dials one connection
  // per target, and the lock survives this row unmounting mid-connect.
  const connecting = useSshConnectInFlight(target.id)
  const isConnected = status === 'connected'
  const isBusy = connecting || isConnectingSshStatus(status)
  const label = target.label.trim() || `${target.username ?? ''}@${target.host ?? ''}`

  const select = (): void => {
    if (isConnected) {
      onSelect(target.id)
    }
  }

  const connect = (event: React.MouseEvent): void => {
    // Why: prevent the row's onClick from also firing and treating the click as a
    // selection when the target is disconnected.
    event.stopPropagation()
    if (isBusy || isSshConnectInFlight(target.id)) {
      return
    }
    beginSshConnect(target.id)
    void Promise.resolve(onConnect(target.id)).finally(() => {
      endSshConnect(target.id)
    })
  }

  return (
    <div
      role={isConnected ? 'button' : undefined}
      tabIndex={isConnected ? 0 : undefined}
      aria-pressed={isConnected ? isSelected : undefined}
      data-ssh-target-id={target.id}
      className={`w-full flex items-center gap-2 rounded-md border px-3 py-2 text-xs transition-colors ${
        isSelected ? 'border-foreground/30 bg-accent' : 'border-border hover:bg-accent/50'
      } ${isConnected ? 'cursor-pointer' : ''}`}
      onClick={select}
      onKeyDown={(event) => {
        if (isConnected && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault()
          select()
        }
      }}
    >
      <span
        aria-hidden="true"
        className={`size-2 shrink-0 rounded-full ${statusDotClass(isConnected, isBusy)}`}
      />
      <span
        className={`min-w-0 flex-1 truncate font-medium ${isConnected ? '' : 'text-muted-foreground'}`}
      >
        {label}
      </span>
      {!isConnected ? (
        // Why inline Connect: avoids forcing the user out to Settings just to bring up a
        // configured target.
        <button
          type="button"
          disabled={isBusy}
          onClick={connect}
          className="ml-auto flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-foreground hover:bg-accent/70 disabled:cursor-default disabled:opacity-50 cursor-pointer"
        >
          {isBusy ? (
            <>
              <Loader2 className="size-3 animate-spin" />
              {translate('auto.components.sidebar.SshTargetRow.4677394048', 'Connecting…')}
            </>
          ) : (
            translate('auto.components.sidebar.SshTargetRow.75ad429b5d', 'Connect')
          )}
        </button>
      ) : null}
    </div>
  )
}
