// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/WorktreeCardSshHostControl.tsx
//
// D04a-012/D04a-013: SSH host control for the worktree card title row.
// Rosetta: Server/ServerOff glyphs, Retry/Reconnect pill with
// connecting/deploying-relay/reconnecting states, targetRemoved + auth-failed
// states with distinct tooltips, iconOnly for compact, Enter/Space stop, and
// the in-flight click guard. Connect flow: local path via window.api.ssh with
// UI timeout + setSshConnectionState mirror for deferred PTY reattach,
// failure toast + resync (listTargets before listRemovedTargetLabels).
import React, { useCallback } from 'react'
import { Loader2, Server, ServerOff } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '../../store'
import {
  canConnectSshStatus,
  isConnectingSshStatus
} from '@/ssh/ssh-connection-recoverability'
import { sshConnectVerb, sshConnectingLabel } from '@/ssh/ssh-connect-verb'
import {
  SSH_RECONNECT_UI_TIMEOUT_MS,
  withUiConnectTimeout
} from '@/ssh/ssh-connect-ui-timeout'
import {
  isSshConnectInFlight,
  trackSshConnect,
  useSshConnectInFlight
} from '@/ssh/ssh-connect-in-flight'
import {
  connectRuntimeEnvironmentSshTarget,
  resyncRuntimeEnvironmentSshTargets
} from '@/runtime/runtime-environment-ssh-target'
import { acceptSshHostKey, connectSshTarget, toSshConnectionState } from '@/lib/ssh-dial-client'
import type { SshConnectionStatus } from '../../shared/ssh-types'

export type WorktreeCardSshHostControlProps = {
  targetId: string
  /** Card passes `sshTargetLabel || repo.displayName` — the selector can return a bare target id. */
  targetLabel: string
  status: SshConnectionStatus | null
  targetRemoved: boolean
  /** Non-null when the SSH target belongs to a remote server; routes connect to that runtime. */
  sshOwnerEnvironmentId: string | null
  /** True when the row cannot afford a visible label: icon-only with an sr-only label. */
  iconOnly: boolean
  onPointerDown: React.PointerEventHandler<HTMLButtonElement>
}

// One shape for every state, from the sibling rename-failed control in the same title row
// (WorktreeCard.tsx). States differ only by color token, so the pill never changes height.
const PILL_BASE =
  'h-4 shrink-0 gap-0.5 rounded !px-0.5 text-[10px] font-medium leading-none has-[>svg]:!px-0.5'
const PILL_QUIET =
  'text-muted-foreground border border-worktree-sidebar-border bg-worktree-sidebar shadow-none hover:bg-worktree-sidebar-accent hover:text-foreground focus-visible:border-worktree-sidebar-border focus-visible:ring-1 focus-visible:ring-worktree-sidebar-ring'
const PILL_FAILED =
  'text-destructive border border-destructive/40 bg-destructive/10 hover:bg-destructive/15 hover:text-destructive focus-visible:border-destructive/40 focus-visible:ring-1 focus-visible:ring-worktree-sidebar-ring'

function PassiveGlyph({
  icon,
  tooltip,
  accessibleName,
  targetLabel
}: {
  icon: React.ReactNode
  tooltip: string
  accessibleName: string
  targetLabel: string
}): React.JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex shrink-0 items-center" data-ssh-target-label={targetLabel}>
          {icon}
          <span className="sr-only">{accessibleName}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  )
}

export function WorktreeCardSshHostControl({
  targetId,
  targetLabel,
  status,
  targetRemoved,
  sshOwnerEnvironmentId,
  iconOnly,
  onPointerDown
}: WorktreeCardSshHostControlProps): React.JSX.Element | null {
  const setSshConnectionState = useAppStore((s) => s.setSshConnectionState)
  // Why: shared registry, not local state — the terminal overlay and every other card on
  // this host dial the same connection, and the store status lags a click by one IPC hop.
  const inFlight = useSshConnectInFlight(targetId)

  const handleConnect = useCallback(async () => {
    if (isSshConnectInFlight(targetId) || isConnectingSshStatus(status)) {
      return
    }
    try {
      if (sshOwnerEnvironmentId) {
        // D04a-013 Rosetta (Orca `connectRuntimeEnvironmentSshTarget`): the
        // environment's own RPC dials and writes bucket state itself.
        await trackSshConnect(
          targetId,
          connectRuntimeEnvironmentSshTarget(sshOwnerEnvironmentId, targetId)
        )
      } else {
        // Rail (a): the local dial is real — `ssh_connect_target` opens a
        // persistent master via the Tauri command, no preload bridge involved.
        const rawState = await withUiConnectTimeout(
          trackSshConnect(targetId, connectSshTarget(targetId).then((result) => toSshConnectionState(result, undefined))),
          SSH_RECONNECT_UI_TIMEOUT_MS
        )
        if (rawState) {
          // Why: ssh.connect can resolve before the global state-change IPC lands;
          // the waiting deferred PTY reattach path keys off this renderer store.
          const prev = useAppStore.getState().sshConnectionStates.get(targetId)
          setSshConnectionState(targetId, {
            targetId,
            status: rawState.status,
            error: prev?.error ?? null,
            reconnectAttempt: prev?.reconnectAttempt ?? 0
          })
        }
      }
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : translate(
              'auto.components.sidebar.WorktreeCardSshHostControl.connectFailed',
              'SSH connection failed'
            )
      )
      // Why: a failed connect usually means the renderer's target metadata is stale
      // (target removed, or re-added under a new id). Resync so the control converges to
      // the removed state instead of offering the same failing Connect forever.
      // Apply the target list first — a removed-labels failure must not discard it.
      if (sshOwnerEnvironmentId) {
        // D04a-013 Rosetta (Orca `resyncRuntimeEnvironmentSshTargets`): stale
        // overlay converges to the ghost/re-adopted state after a failed dial.
        void resyncRuntimeEnvironmentSshTargets(sshOwnerEnvironmentId).catch(() => {})
      } else {
        void (async () => {
          const api = (window as unknown as { api?: { ssh?: { listTargets?: () => Promise<unknown[]>; listRemovedTargetLabels?: () => Promise<Record<string, string>> } } }).api?.ssh
          const targets = (await api?.listTargets?.()) ?? []
          useAppStore.getState().setSshTargetsMetadata(targets as never)
          const removedLabels = (await api?.listRemovedTargetLabels?.()) ?? {}
          useAppStore.getState().setRemovedSshTargetLabels(removedLabels)
        })().catch(() => {})
      }
    }
  }, [setSshConnectionState, sshOwnerEnvironmentId, status, targetId])

  // A live connection outranks a stale removal tombstone. A null status is a runtime-owned
  // target: no renderer-reachable connect, and the card has always shown the plain host glyph
  // there rather than a false disconnected state.
  if (status === null || status === 'connected') {
    return (
      <PassiveGlyph
        targetLabel={targetLabel}
        icon={<Server className="size-3 text-muted-foreground" />}
        tooltip={translate(
          'auto.components.sidebar.WorktreeCardSshHostControl.connectedTooltip',
          'Project on SSH host'
        )}
        accessibleName={translate(
          'auto.components.sidebar.WorktreeCardSshHostControl.connectedName',
          'Project on SSH host {{value0}}',
          { value0: targetLabel }
        )}
      />
    )
  }

  // Why: a removed host can never connect, so it is checked before any failure status —
  // offering Connect there is the exact bug targetRemoved exists to prevent. It also drops the
  // destructive tint: a removed host is a settled fact, not an error to act on.
  if (targetRemoved) {
    return (
      <PassiveGlyph
        targetLabel={targetLabel}
        icon={<ServerOff className="size-3 text-muted-foreground" />}
        tooltip={translate(
          'auto.components.sidebar.WorktreeCardSshHostControl.removedTooltip',
          'SSH host removed — reconnect unavailable'
        )}
        accessibleName={translate(
          'auto.components.sidebar.WorktreeCardSshHostControl.removedName',
          'SSH host {{value0}} was removed',
          { value0: targetLabel }
        )}
      />
    )
  }

  const connecting = inFlight || isConnectingSshStatus(status)
  const canConnect = canConnectSshStatus(status)
  if (!connecting && !canConnect && status !== 'host-key-verification') {
    // Defensive: every remaining member is either connecting or recoverable, but never
    // render a dead button if the union grows.
    return null
  }
  // Rail (e): host-key verification is not a retry — ssh refuses until the
  // key is trusted. Offer accept (ssh-keyscan → known_hosts), then dial.
  const needsHostKeyAccept = status === 'host-key-verification'
  if (needsHostKeyAccept && !connecting) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className={cn(PILL_BASE, PILL_FAILED, iconOnly && 'w-4 justify-center !px-0 has-[>svg]:!px-0')}
            aria-label={translate(
              'auto.components.sidebar.WorktreeCardSshHostControl.acceptHostKeyName',
              'Accept host key for {{value0}}',
              { value0: targetLabel }
            )}
            data-ssh-target-label={targetLabel}
            onPointerDown={onPointerDown}
            onClick={(event) => {
              event.stopPropagation()
              event.preventDefault()
              void (async () => {
                try {
                  await trackSshConnect(targetId, acceptSshHostKey(targetId))
                  await handleConnect()
                } catch (err) {
                  toast.error(
                    err instanceof Error ? err.message : String(err)
                  )
                }
              })()
            }}
          >
            {!iconOnly && (
              <span className="text-left">
                {translate(
                  'auto.components.sidebar.WorktreeCardSshHostControl.acceptHostKey',
                  'Accept host key'
                )}
              </span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {translate(
            'auto.components.sidebar.WorktreeCardSshHostControl.acceptHostKeyTooltip',
            '{{value0}} · host key not trusted — accept to connect',
            { value0: targetLabel }
          )}
        </TooltipContent>
      </Tooltip>
    )
  }
  const failed = status === 'error' || status === 'reconnection-failed' || status === 'auth-failed'
  const label = connecting ? sshConnectingLabel() : sshConnectVerb(status)
  const accessibleName = connecting
    ? translate(
        'auto.components.sidebar.WorktreeCardSshHostControl.connectingName',
        'Connecting to SSH host {{value0}}',
        { value0: targetLabel }
      )
    : status === 'auth-failed'
      ? translate(
          'auto.components.sidebar.WorktreeCardSshHostControl.authFailedName',
          'Reconnect SSH host {{value0}} — authentication failed',
          { value0: targetLabel }
        )
      : failed
        ? translate(
            'auto.components.sidebar.WorktreeCardSshHostControl.retryName',
            'Retry SSH connection to {{value0}}',
            { value0: targetLabel }
          )
        : translate(
            'auto.components.sidebar.WorktreeCardSshHostControl.connectName',
            'Connect to SSH host {{value0}}',
            { value0: targetLabel }
          )
  const tooltip = connecting
    ? accessibleName
    : status === 'auth-failed'
      ? translate(
          'auto.components.sidebar.WorktreeCardSshHostControl.authFailedTooltip',
          '{{value0}} · authentication failed',
          { value0: targetLabel }
        )
      : failed
        ? translate(
            'auto.components.sidebar.WorktreeCardSshHostControl.failedTooltip',
            '{{value0}} · connection failed',
            { value0: targetLabel }
          )
        : accessibleName

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          // Why: icon-xs defaults to size-6 (24px); the pill is 16px, and the densest
          // card mode must not become the tallest.
          className={cn(
            PILL_BASE,
            failed ? PILL_FAILED : PILL_QUIET,
            iconOnly && 'w-4 justify-center !px-0 has-[>svg]:!px-0'
          )}
          aria-label={accessibleName}
          data-ssh-target-label={targetLabel}
          aria-busy={connecting || undefined}
          // Why: aria-disabled, not disabled — `disabled` adds pointer-events-none, so an
          // impatient second click would fall through to the card (activating the workspace,
          // or opening Edit metadata on a double-click), drop focus to <body>, and kill the
          // tooltip for the entire in-flight window.
          aria-disabled={connecting || undefined}
          onPointerDown={onPointerDown}
          onKeyDown={(event) => {
            // Why: the sidebar scroll root treats a bubbled Enter as "focus the terminal"
            // (WorktreeList handleContainerKeyDown), which would cancel this button's own
            // activation and move focus off the card.
            if (event.key === 'Enter' || event.key === ' ') {
              event.stopPropagation()
            }
          }}
          onClick={(event) => {
            // Reconnecting a host and navigating to a workspace are separate intents.
            event.stopPropagation()
            event.preventDefault()
            if (connecting) {
              return
            }
            void handleConnect()
          }}
        >
          {connecting ? (
            <Loader2 className="size-2.5 animate-spin motion-reduce:animate-none" />
          ) : (
            iconOnly && <ServerOff className="size-2.5" />
          )}
          {/* Why: aria-label already names the control, so a second sr-only copy would be
              dead markup; the label span exists only for sighted users. */}
          {!iconOnly && <span className="text-left">{label}</span>}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  )
}
