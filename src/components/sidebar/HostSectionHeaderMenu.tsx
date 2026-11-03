// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/HostSectionHeaderMenu.tsx
// The host-header dropdown: block warning, rename, SSH reconnect (a real system-OpenSSH
// probe), the Settings deep link, and host removal. Disconnect and runtime "Check
// connection" have no backend in Hydra and are therefore absent rather than inert.
import { useCallback, useState } from 'react'
import {
  AlertTriangle,
  Ellipsis,
  Loader2,
  Pencil,
  Plug,
  PlugZap,
  Settings2,
  Trash2
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useMountedRef } from '@/hooks/useMountedRef'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import { disconnectSshTarget, reconnectSshTarget } from '@/store/ssh-bridge'
import { sshConnectVerb } from '@/ssh/ssh-connect-verb'
import {
  getSshTargetIdForExecutionHost,
  parseExecutionHostId
} from '../../shared/execution-host'
import { describeRuntimeCompatBlock } from '../../shared/protocol-compat'
import { buildHostHeaderMenuModel } from './host-header-menu-items'
import type { HostHeaderRow } from './host-section-rows'
import { HostRemoveDialog } from './HostRemoveDialog'
import { HostRenameDialog } from './HostRenameDialog'
import {
  buildSshConnectingState,
  buildSshReconnectConnectionState,
  sshReconnectFailureMessage
} from './ssh-reconnect-state'

function blockedTitle(reason: 'client-too-old' | 'server-too-old'): string {
  return reason === 'server-too-old'
    ? translate('auto.components.sidebar.HostSectionHeaderMenu.5b8b4b6a01', 'Update server required')
    : translate('auto.components.sidebar.HostSectionHeaderMenu.9b3c1d2e44', 'Update client required')
}

// Why: SSH and paired runtime hosts share the sidebar model, but Settings keeps their
// management pages separate. Hydra only renders the SSH pane, so a runtime host gets no
// deep link until the paired-servers pane exists.
function openManageHost(row: HostHeaderRow): void {
  if (row.kind === 'local') {
    window.dispatchEvent(new CustomEvent('hydra:open-settings', { detail: { section: 'general' } }))
    return
  }
  if (row.kind === 'ssh') {
    window.dispatchEvent(new CustomEvent('hydra:open-settings', { detail: { section: 'ssh' } }))
  }
}

export function HostSectionHeaderMenu({ row }: { row: HostHeaderRow }): React.JSX.Element | null {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [removeOpen, setRemoveOpen] = useState(false)
  const mountedRef = useMountedRef()
  const sshStatus = useAppStore((s) => {
    const parsed = parseExecutionHostId(row.hostId)
    return parsed?.kind === 'ssh'
      ? (s.sshConnectionStates.get(parsed.targetId)?.status ?? null)
      : null
  })

  const model = buildHostHeaderMenuModel({
    kind: row.kind,
    health: row.health,
    sshConnected: sshStatus === 'connected',
    compatibility: row.compatibility
  })
  const targetId = getSshTargetIdForExecutionHost(row.hostId)

  const handleReconnect = useCallback(async () => {
    const parsed = parseExecutionHostId(row.hostId)
    if (parsed?.kind !== 'ssh') {
      return
    }
    const store = useAppStore.getState()
    setBusy(true)
    store.setSshConnectionState(
      parsed.targetId,
      buildSshConnectingState(parsed.targetId, store.sshConnectionStates.get(parsed.targetId))
    )
    try {
      const result = await reconnectSshTarget(parsed.targetId)
      const latest = useAppStore.getState()
      latest.setSshConnectionState(
        parsed.targetId,
        buildSshReconnectConnectionState(
          result,
          latest.sshConnectionStates.get(parsed.targetId)
        )
      )
      if (result.status === 'connected') {
        toast.success(
          translate(
            'auto.components.sidebar.HostSectionHeaderMenu.7f1a2b3c4d',
            '{{value0}} is reachable',
            { value0: row.label }
          )
        )
      } else {
        toast.error(
          translate('auto.components.sidebar.HostSectionHeaderMenu.2c29e2de68', 'Connection failed'),
          { description: sshReconnectFailureMessage(result) }
        )
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : translate(
              'auto.components.sidebar.HostSectionHeaderMenu.2c29e2de68',
              'Connection failed'
            )
      )
    } finally {
      if (mountedRef.current) {
        setBusy(false)
      }
    }
  }, [mountedRef, row.hostId, row.label])

  const handleDisconnect = useCallback(async () => {
    const parsed = parseExecutionHostId(row.hostId)
    if (parsed?.kind !== 'ssh') {
      return
    }
    setBusy(true)
    try {
      await disconnectSshTarget(parsed.targetId)
      // Why: the renderer owns live connection state; dropping it to disconnected
      // is the visible half of the action (main persists the durable record).
      const latest = useAppStore.getState()
      latest.setSshConnectionState(parsed.targetId, {
        ...(latest.sshConnectionStates.get(parsed.targetId) ?? {
          targetId: parsed.targetId,
          reconnectAttempt: 0,
          error: null
        }),
        targetId: parsed.targetId,
        status: 'disconnected',
        error: null
      })
      toast.success(
        translate(
          'auto.components.sidebar.HostSectionHeaderMenu.4a1b2c3d5e',
          'Disconnected from {{value0}}',
          { value0: row.label }
        )
      )
    } catch (error) {
      toast.error(
        translate('auto.components.sidebar.HostSectionHeaderMenu.bf07aee59e', 'Disconnect failed'),
        { description: error instanceof Error ? error.message : undefined }
      )
    } finally {
      if (mountedRef.current) {
        setBusy(false)
      }
    }
  }, [mountedRef, row.hostId, row.label])

  // A blocked host with no lifecycle action still needs the warning and its deep link.
  if (model.actions.length === 0 && model.blocked === null) {
    return null
  }

  return (
    <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
            <button
              type="button"
              title={translate(
                'auto.components.sidebar.HostSectionHeaderMenu.6b7c8d9e10',
                'Host actions'
              )}
              aria-label={translate(
                'auto.components.sidebar.HostSectionHeaderMenu.4f2c8a9b10',
                'Host actions for {{value0}}',
                { value0: row.label }
              )}
              className={cn(
                'size-5 shrink-0 cursor-pointer rounded-md text-muted-foreground transition-opacity',
                'hover:bg-accent/70 hover:text-foreground',
                'can-hover:opacity-0 focus-visible:opacity-100',
                'group-hover/host-header:opacity-100 data-[state=open]:opacity-100'
              )}
              // Why: the header row itself toggles collapse on click/Enter; opening the
              // menu must not also fold the section.
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            >
              {busy ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Ellipsis className="size-3.5" />
              )}
            </button>
          </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="start" sideOffset={8} className="w-56">
        {model.blocked ? (
          <>
            <DropdownMenuItem
              variant="destructive"
              data-host-header-menu-blocked=""
              title={row.compatibility ? describeRuntimeCompatBlock(row.compatibility) : undefined}
              onSelect={() => openManageHost(row)}
            >
              <AlertTriangle className="size-3.5" />
              {blockedTitle(model.blocked.reason)}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        ) : null}
        <DropdownMenuLabel className="truncate">{row.label}</DropdownMenuLabel>
        {model.actions.includes('rename') ? (
          <DropdownMenuItem onSelect={() => setRenameOpen(true)}>
            <Pencil className="size-3.5" />
            {translate('auto.components.sidebar.HostSectionHeaderMenu.8d1e2f3a4b', 'Rename…')}
          </DropdownMenuItem>
        ) : null}
        {model.actions.includes('ssh-reconnect') ? (
          <DropdownMenuItem onSelect={() => void handleReconnect()}>
            <Plug className="size-3.5" />
            {sshConnectVerb(sshStatus)}
          </DropdownMenuItem>
        ) : null}
        {model.actions.includes('ssh-disconnect') ? (
          <DropdownMenuItem onSelect={() => void handleDisconnect()}>
            <PlugZap className="size-3.5" />
            {translate('auto.components.sidebar.HostSectionHeaderMenu.59b553e2aa', 'Disconnect')}
          </DropdownMenuItem>
        ) : null}
        {model.actions.includes('manage') ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => openManageHost(row)}>
              <Settings2 className="size-3.5" />
              {translate('auto.components.sidebar.HostSectionHeaderMenu.3c4d5e6f7a', 'Manage host…')}
            </DropdownMenuItem>
          </>
        ) : null}
        {model.actions.includes('remove') && targetId !== null ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => setRemoveOpen(true)}>
              <Trash2 className="size-3.5" />
              {translate('auto.components.sidebar.HostSectionHeaderMenu.6e7f8a9b0c', 'Remove host…')}
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
      <HostRenameDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        hostId={row.hostId}
        derivedLabel={row.label}
      />
      {targetId !== null ? (
        <HostRemoveDialog
          open={removeOpen}
          onOpenChange={setRemoveOpen}
          hostId={row.hostId}
          label={row.label}
          targetId={targetId}
        />
      ) : null}
    </DropdownMenu>
  )
}
