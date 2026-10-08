// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Parity with Orca `components/settings/SshTargetCard.tsx`, with the connection half made
// optional: Hydra has no SSH connection subsystem yet, so `state` and the
// connect/disconnect/test/terminate/reset callbacks may be absent. When they are, the
// card paints none of those controls — and no status pill, since "Disconnected" would
// claim a lifecycle the build cannot have — instead of a control with nothing behind it.
// The registry metadata Hydra does have (config alias, source, generation) rides its own
// line; the endpoint/identity/relay line and the action buttons keep Orca's layout.
import { useCallback, useRef, useState } from 'react'
import {
  CircleStop,
  Loader2,
  MonitorSmartphone,
  Pencil,
  RotateCcw,
  Server,
  ServerOff,
  Trash2
} from 'lucide-react'
import {
  DEFAULT_SSH_RELAY_GRACE_PERIOD_SECONDS,
  type SshConnectionState,
  type SshConnectionStatus,
  type SshTarget
} from '../../shared/ssh-types'
import { Button } from '../ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'
import { isSshTargetConnecting, type SshTargetBusyAction } from './ssh-target-action-state'
import { translate } from '@/i18n/i18n'

// ── Shared status helpers ────────────────────────────────────────────

export const STATUS_LABELS: Record<SshConnectionStatus, string> = {
  disconnected: 'Disconnected',
  connecting: 'Connecting\u2026',
  'auth-failed': 'Auth failed',
  'deploying-relay': 'Deploying relay\u2026',
  connected: 'Connected',
  reconnecting: 'Reconnecting\u2026',
  'reconnection-failed': 'Reconnection failed',
  get error() {
    return translate('auto.components.settings.SshTargetCard.18968ede9e', 'Error')
  }
}

export function statusColor(status: SshConnectionStatus): string {
  switch (status) {
    case 'connected':
      return 'bg-emerald-500'
    case 'connecting':
    case 'deploying-relay':
    case 'reconnecting':
      return 'bg-yellow-500'
    case 'auth-failed':
    case 'reconnection-failed':
    case 'error':
      return 'bg-red-500'
    case 'disconnected':
      return 'bg-muted-foreground/40'
  }
}

function formatGraceDuration(seconds: number): string {
  if (seconds % 86_400 === 0) {
    return `${seconds / 86_400}d`
  }
  if (seconds % 3_600 === 0) {
    return `${seconds / 3_600}h`
  }
  if (seconds % 60 === 0) {
    return `${seconds / 60}m`
  }
  return `${seconds}s`
}

function formatTerminalPersistence(target: SshTarget): string {
  const graceSeconds = target.relayGracePeriodSeconds ?? DEFAULT_SSH_RELAY_GRACE_PERIOD_SECONDS
  if (graceSeconds === 0) {
    return translate('auto.components.settings.SshTargetCard.8ce71262f4', 'terminals until reset')
  }
  return translate(
    'auto.components.settings.SshTargetCard.a883f5a00f',
    'terminal timeout: {{value0}}',
    { value0: formatGraceDuration(graceSeconds) }
  )
}

// ── SshTargetCard ────────────────────────────────────────────────────

type SshTargetCardProps = {
  target: SshTarget
  /**
   * Live connection state. Absent when this build has no SSH connection
   * subsystem: the card then paints no status pill and no connect/disconnect/
   * test/relay controls, because none of them could do anything.
   */
  state?: SshConnectionState | undefined
  testing?: boolean
  busyAction?: SshTargetBusyAction
  onConnect?: (targetId: string) => void | Promise<void>
  onDisconnect?: (targetId: string) => void | Promise<void>
  onTerminateSessions?: (targetId: string) => void | Promise<void>
  onResetRelay?: (targetId: string) => void | Promise<void>
  onTest?: (targetId: string) => void | Promise<void>
  onEdit: (target: SshTarget) => void
  onRemove: (targetId: string) => void
}

export function SshTargetCard({
  target,
  state,
  testing,
  busyAction,
  onConnect,
  onDisconnect,
  onTerminateSessions,
  onResetRelay,
  onTest,
  onEdit,
  onRemove
}: SshTargetCardProps): React.JSX.Element {
  const status: SshConnectionStatus = state?.status ?? 'disconnected'
  const [actionInFlight, setActionInFlight] = useState<
    'connect' | 'disconnect' | 'terminate' | 'reset' | null
  >(null)
  const hasActionInFlight = actionInFlight !== null || busyAction !== undefined
  const terminateInFlight = actionInFlight === 'terminate' || busyAction === 'terminate'
  const resetInFlight = actionInFlight === 'reset' || busyAction === 'reset'
  const removeInFlight = busyAction === 'remove'
  const mountedRef = useRef(true)
  const endpoint = target.username
    ? `${target.username}@${target.host}:${target.port}`
    : `${target.host}:${target.port}`
  const terminalPersistence = formatTerminalPersistence(target)

  const handleCardRef = useCallback((node: HTMLDivElement | null): void => {
    // Why: SSH target actions can resolve after the card is removed; the root
    // ref gives async completions the same stale-write guard without an Effect.
    mountedRef.current = node !== null
  }, [])

  const clearActionInFlight = (): void => {
    if (mountedRef.current) {
      setActionInFlight(null)
    }
  }

  const handleConnect = (): void => {
    if (actionInFlight) {
      return
    }
    setActionInFlight('connect')
    void Promise.resolve(onConnect?.(target.id)).finally(clearActionInFlight)
  }

  const handleDisconnect = (): void => {
    if (actionInFlight) {
      return
    }
    setActionInFlight('disconnect')
    void Promise.resolve(onDisconnect?.(target.id)).finally(clearActionInFlight)
  }

  const handleTerminateSessions = (): void => {
    if (actionInFlight) {
      return
    }
    setActionInFlight('terminate')
    void Promise.resolve(onTerminateSessions?.(target.id)).finally(clearActionInFlight)
  }

  const handleResetRelay = (): void => {
    if (actionInFlight) {
      return
    }
    setActionInFlight('reset')
    void Promise.resolve(onResetRelay?.(target.id)).finally(clearActionInFlight)
  }

  const renderEndRemoteTerminalsButton = (): React.JSX.Element => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleTerminateSessions}
          className="size-7 text-muted-foreground hover:text-red-400"
          disabled={hasActionInFlight}
          aria-label={
            terminateInFlight
              ? translate(
                  'auto.components.settings.SshTargetCard.c77f1abfe3',
                  'Ending remote terminals'
                )
              : translate(
                  'auto.components.settings.SshTargetCard.da16e108e6',
                  'End remote terminals'
                )
          }
        >
          {terminateInFlight ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <CircleStop className="size-3" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={4}>
        {translate('auto.components.settings.SshTargetCard.da16e108e6', 'End remote terminals')}
      </TooltipContent>
    </Tooltip>
  )

  const renderResetRelayButton = (): React.JSX.Element => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleResetRelay}
          className="size-7 text-muted-foreground hover:text-red-400"
          disabled={hasActionInFlight}
          aria-label={
            resetInFlight
              ? translate(
                  'auto.components.settings.SshTargetCard.97dea4e8cf',
                  'Resetting remote relay'
                )
              : translate('auto.components.settings.SshTargetCard.762a48c662', 'Reset remote relay')
          }
        >
          {resetInFlight ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <RotateCcw className="size-3" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={4}>
        {translate('auto.components.settings.SshTargetCard.762a48c662', 'Reset remote relay')}
      </TooltipContent>
    </Tooltip>
  )

  const renderSecondaryIconActions = (includeEndRemoteTerminals: boolean): React.JSX.Element => (
    <div className="flex items-center gap-1">
      {includeEndRemoteTerminals && onTerminateSessions ? renderEndRemoteTerminalsButton() : null}
      {onResetRelay && !isSshTargetConnecting(status) ? renderResetRelayButton() : null}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(target)}
            className="size-7"
            disabled={hasActionInFlight}
            aria-label={translate(
              'auto.components.settings.SshTargetCard.3d8af2949f',
              'Edit target'
            )}
          >
            <Pencil className="size-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={4}>
          {translate('auto.components.settings.SshTargetCard.3d8af2949f', 'Edit target')}
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemove(target.id)}
            className="size-7 text-muted-foreground hover:text-red-400"
            disabled={hasActionInFlight}
            aria-label={
              removeInFlight
                ? translate('auto.components.settings.SshTargetCard.3d21a22d0e', 'Removing target')
                : translate('auto.components.settings.SshTargetCard.7f7b3d7ab4', 'Remove target')
            }
          >
            {removeInFlight ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Trash2 className="size-3" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={4}>
          {translate('auto.components.settings.SshTargetCard.7f7b3d7ab4', 'Remove target')}
        </TooltipContent>
      </Tooltip>
    </div>
  )

  return (
    <div
      ref={handleCardRef}
      data-ssh-target-card=""
      data-ssh-target-label={target.label}
      className="flex items-center gap-3 rounded-lg border border-border/50 bg-card/40 px-4 py-3"
    >
      <Server className="size-4 shrink-0 text-muted-foreground" />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{target.label}</span>
          {/* Why: the status pill is connection state. Without one there is nothing to
              report — "Disconnected" would claim a connection subsystem Hydra lacks. */}
          {state ? (
            <>
              <span className={`size-2 shrink-0 rounded-full ${statusColor(status)}`} />
              <span className="text-[11px] text-muted-foreground">{STATUS_LABELS[status]}</span>
            </>
          ) : null}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {endpoint}
          {target.identityFile ? ` \u2022 ${target.identityFile}` : ''}
          {` \u2022 ${terminalPersistence}`}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
          {target.configHost ? (
            <span>
              {translate('auto.components.settings.SshTargetCard.configAlias', 'alias {{value0}}', {
                value0: target.configHost
              })}
            </span>
          ) : null}
          <span>
            {target.source === 'ssh-config'
              ? translate(
                  'auto.components.settings.SshTargetCard.presenceFromSshConfig',
                  'From ~/.ssh/config'
                )
              : translate(
                  'auto.components.settings.SshTargetCard.presenceLocal',
                  'Added on this computer'
                )}
          </span>
          {target.generation !== undefined ? (
            <span className="font-mono">
              {translate(
                'auto.components.settings.SshTargetCard.generation',
                'generation {{value0}}',
                { value0: target.generation }
              )}
            </span>
          ) : null}
        </p>
        {/* Why not truncate: host key failures put the remedy (`ssh-keygen -R <host>`) at the end,
            and a one-line clamp with no tooltip made it unreachable even on hover. */}
        {state?.error ? (
          <p className="mt-0.5 text-xs text-red-400 [overflow-wrap:anywhere]">{state.error}</p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {status === 'connected' ? (
          <>
            {renderSecondaryIconActions(true)}
            {onDisconnect ? (
              <Button
                variant="ghost"
                size="xs"
                onClick={handleDisconnect}
                className="gap-1.5"
                disabled={hasActionInFlight}
              >
                <ServerOff className="size-3" />
                {translate('auto.components.settings.SshTargetCard.4c86f30877', 'Disconnect')}
              </Button>
            ) : null}
          </>
        ) : isSshTargetConnecting(status) ? (
          <>
            {renderSecondaryIconActions(false)}
            <Button variant="ghost" size="xs" disabled className="gap-1.5">
              <Loader2 className="size-3 animate-spin" />
              {translate('auto.components.settings.SshTargetCard.1810b51482', 'Connecting')}
            </Button>
          </>
        ) : (
          <>
            {renderSecondaryIconActions(true)}
            {onTest ? (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => onTest(target.id)}
                disabled={testing || hasActionInFlight}
                className="gap-1.5"
              >
                {testing ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <MonitorSmartphone className="size-3" />
                )}
                {translate('auto.components.settings.SshTargetCard.0e53e9f8e8', 'Test')}
              </Button>
            ) : null}
            {onConnect ? (
              <Button
                variant="ghost"
                size="xs"
                onClick={handleConnect}
                className="gap-1.5"
                disabled={hasActionInFlight}
              >
                {actionInFlight === 'connect' ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Server className="size-3" />
                )}
                {translate('auto.components.settings.SshTargetCard.ec6543cee9', 'Connect')}
              </Button>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
