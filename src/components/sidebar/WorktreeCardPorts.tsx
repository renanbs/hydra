// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/WorktreeCardPorts.tsx
//
// The card's live-port trigger and the hover's port list. Every action runs on
// the worktree that owns the port, and a stop always asks the scanner to refresh
// so the killed listener disappears instead of lingering until the next poll.
import React, { useCallback, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Copy, ExternalLink, Plug, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import type { WorkspacePort } from './types'
import {
  WorktreeCardDetailSection,
  WorktreeCardDetailSectionContent
} from './WorktreeCardDetailSection'

export interface WorktreeCardPortsProps {
  ports: WorkspacePort[]
}

/**
 * A port can only be stopped when the scanner attributed a real PID to it.
 * The sidebar's scan reports `process_name`, so the Electron guard mirrors
 * Orca's refusal to kill the app's own renderer process.
 */
export function canStopSidebarWorkspacePort(port: WorkspacePort): boolean {
  return port.pid != null && port.process_name !== 'Electron'
}

function portAddress(port: WorkspacePort): string {
  const host = port.host && port.host !== '0.0.0.0' && port.host !== '::' ? port.host : 'localhost'
  return `${host}:${port.port}`
}

function portUrl(port: WorkspacePort): string {
  return `http://${portAddress(port)}`
}

export function WorktreeCardPortsTrigger({
  ports
}: WorktreeCardPortsProps): React.JSX.Element | null {
  const recordFeatureInteraction = useAppStore((s) => s.recordFeatureInteraction)

  if (ports.length === 0) {
    return null
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex size-3.5 shrink-0 items-center justify-center rounded text-muted-foreground/70 outline-none transition-colors hover:text-foreground focus-visible:ring-1 focus-visible:ring-worktree-sidebar-ring"
          aria-label={translate(
            'auto.components.sidebar.WorktreeCardPorts.fed49903c9',
            '{{value0}} live {{value1}}',
            { value0: ports.length, value1: ports.length === 1 ? 'port' : 'ports' }
          )}
          onClick={(event) => {
            event.stopPropagation()
            void recordFeatureInteraction('ports')
          }}
        >
          <Plug className="size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={4}>
        {ports.map((port) => `:${port.port}`).join(', ')}
      </TooltipContent>
    </Tooltip>
  )
}

function PortAction({
  label,
  disabled = false,
  onClick,
  children
}: {
  label: string
  disabled?: boolean
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          disabled={disabled}
          className="size-5 text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:text-muted-foreground/35"
          aria-label={label}
          onClick={onClick}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={4}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

function WorktreePortRow({ port }: { port: WorkspacePort }): React.JSX.Element {
  const recordFeatureInteraction = useAppStore((s) => s.recordFeatureInteraction)
  const [stopping, setStopping] = useState(false)
  const address = portAddress(port)
  const canStop = canStopSidebarWorkspacePort(port)
  const processLabel =
    port.process_name ?? (port.pid ? `PID ${port.pid}` : 'Unknown process')

  const handleOpen = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation()
      void recordFeatureInteraction('ports')
      // Why: the renderer cannot mint an Orca browser tab from the card, so the
      // system browser is the only path that exists today.
      window.open(portUrl(port), '_blank', 'noopener,noreferrer')
    },
    [port, recordFeatureInteraction]
  )

  const handleCopy = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation()
      void recordFeatureInteraction('ports')
      void navigator.clipboard
        .writeText(address)
        .then(() =>
          toast.success(
            translate(
              'auto.components.sidebar.WorktreeCardPorts.c89f290e25',
              'Copied {{value0}}',
              { value0: address }
            )
          )
        )
        .catch(() =>
          toast.error(
            translate(
              'auto.components.sidebar.WorktreeCardMeta.copyLinkFailure',
              'Failed to copy link'
            )
          )
        )
    },
    [address, recordFeatureInteraction]
  )

  const handleStop = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation()
      if (!canStop || port.pid == null) {
        return
      }
      void recordFeatureInteraction('ports')
      setStopping(true)
      const pid = port.pid
      void invoke('kill_port_process', { pid, worktreePath: port.worktree_path })
        .then(() => {
          toast.success(
            translate(
              'auto.components.sidebar.WorktreeCardPorts.5d1a5d51bb',
              'Stopped process on {{value0}}',
              { value0: port.port }
            )
          )
          window.dispatchEvent(new CustomEvent('hydra:refresh-ports'))
        })
        .catch((error: unknown) => {
          toast.error(
            translate(
              'auto.components.sidebar.WorktreeCardPorts.killFailed',
              'Failed to stop process'
            ),
            { description: error instanceof Error ? error.message : String(error) }
          )
        })
        .finally(() => setStopping(false))
    },
    [canStop, port, recordFeatureInteraction]
  )

  return (
    <div className="group/port grid min-w-0 grid-cols-[3.25rem_minmax(0,1fr)] items-center gap-1.5 rounded-md px-1.5 py-1 hover:bg-accent/50">
      <span className="font-mono text-[12px] font-semibold tabular-nums text-foreground">
        {port.port}
      </span>
      <div className="relative flex h-5 min-w-0 items-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="flex min-w-0 select-text items-baseline gap-1 overflow-hidden pr-[3.75rem] text-[11px] text-muted-foreground">
              <span className="min-w-0 flex-1 truncate">{processLabel}</span>
              <span className="shrink-0 text-muted-foreground/45">-</span>
              <span className="min-w-0 flex-[1.1] truncate text-muted-foreground/70">
                {address}
              </span>
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={4}>
            {processLabel} - {address}
          </TooltipContent>
        </Tooltip>
        <div className="absolute inset-y-0 right-0 flex items-center gap-0.5 rounded-md border border-border/40 bg-popover/95 px-0.5 opacity-0 shadow-xs transition-opacity group-hover/port:opacity-100 group-focus-within/port:opacity-100">
          <PortAction
            label={translate(
              'auto.components.sidebar.WorktreeCardPorts.33bc7d7495',
              'Open in Browser'
            )}
            onClick={handleOpen}
          >
            <ExternalLink className="size-3" />
          </PortAction>
          <PortAction
            label={translate(
              'auto.components.sidebar.WorktreeCardPorts.c8067a829a',
              'Copy {{value0}}',
              { value0: address }
            )}
            onClick={handleCopy}
          >
            <Copy className="size-3" />
          </PortAction>
          <PortAction
            label={translate(
              'auto.components.sidebar.WorktreeCardPorts.2f854442ff',
              'Stop Process'
            )}
            disabled={!canStop || stopping}
            onClick={handleStop}
          >
            <Trash2 className="size-3" />
          </PortAction>
        </div>
      </div>
    </div>
  )
}

export function WorktreeCardPortsDetails({
  ports
}: WorktreeCardPortsProps): React.JSX.Element | null {
  if (ports.length === 0) {
    return null
  }

  return (
    <WorktreeCardDetailSection>
      {/* Count lives inline after the label: the right side is the action zone,
          and the card is already scoped to this worktree so "go to worktree"
          has nothing to target. */}
      <div className="flex items-center gap-1.5 px-1 text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase">
        <Plug className="size-3" />
        <span>
          {translate('auto.components.sidebar.WorktreeCardPorts.3240f320d7', 'Live Ports')}{' '}
          <span className="font-normal text-muted-foreground/70 tabular-nums">
            ({ports.length})
          </span>
        </span>
      </div>
      <WorktreeCardDetailSectionContent className="space-y-0.5">
        {ports.map((port) => (
          <WorktreePortRow key={`${port.host}:${port.port}`} port={port} />
        ))}
      </WorktreeCardDetailSectionContent>
    </WorktreeCardDetailSection>
  )
}
