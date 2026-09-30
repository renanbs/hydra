// @ts-nocheck — Orca port buffer; typecheck when this subsystem is wired.
// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// CaffeinateStatusSegment: Shows awake mode and toggles keep-awake behavior via Tauri IPC.

import React, { useEffect, useState } from 'react'
import { listen } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'
import { Coffee, Moon } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { STATUS_BAR_CONTEXT_MENU_EXEMPT_PROPS } from './status-bar-context-menu-policy'
import { useAppStore } from '../../store'

interface KeepAwakePayload {
  active: boolean
  working_count: number
}

export function CaffeinateStatusSegment({
  iconOnly
}: {
  iconOnly?: boolean
}): React.JSX.Element | null {
  const settings = useAppStore((state) => state.settings)
  const isConfiguredOn = Boolean(settings?.keep_computer_awake_while_agents_run)
  const [active, setActive] = useState(false)

  useEffect(() => {
    let unlisten: (() => void) | null = null
    listen<KeepAwakePayload>('keep_awake:status', (event) => {
      if (event.payload) {
        setActive(Boolean(event.payload.active))
      }
    }).then((fn) => {
      unlisten = fn
    }).catch(console.error)

    return () => {
      if (unlisten) unlisten()
    }
  }, [])

  const handleToggle = (enabled: boolean) => {
    invoke('sync_keep_awake', { enabled, workingCount: 0 }).catch(console.error)
  }

  const title = 'Computer Awake'
  const statusText = active ? 'Active' : isConfiguredOn ? 'On working' : 'Off'

  return (
    <DropdownMenu modal={false}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              {...STATUS_BAR_CONTEXT_MENU_EXEMPT_PROPS}
              className={`inline-flex items-center gap-1.5 px-1 py-0.5 rounded text-xs hover:bg-accent/70 transition-colors ${
                active ? 'text-amber-500 dark:text-amber-400 font-medium' : 'text-muted-foreground'
              }`}
              aria-label={`${title}, ${statusText}`}
            >
              <Coffee className="size-3.5" />
              {!iconOnly && <span className="tabular-nums">{statusText}</span>}
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={6}>
          {title} ({statusText})
        </TooltipContent>
      </Tooltip>

      <DropdownMenuContent side="top" align="end" sideOffset={8} className="w-[180px]">
        <DropdownMenuRadioGroup
          value={isConfiguredOn ? 'auto' : 'off'}
          onValueChange={(val) => handleToggle(val === 'auto')}
        >
          <DropdownMenuRadioItem value="auto">
            <span>While agents run</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="off">
            <span>System default (off)</span>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
