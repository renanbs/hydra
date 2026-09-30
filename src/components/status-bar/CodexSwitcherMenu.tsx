// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// CodexSwitcherMenu: Provider usage detail and switcher popup for OpenAI / Codex in the status bar.

import React from 'react'
import { ChevronRight } from 'lucide-react'
import type { ProviderRateLimits } from '../../shared/rate-limit-types'
import { DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger } from '@/components/ui/dropdown-menu'
import { ProviderIcon } from './tooltip'
import { getProviderDisplayName } from './usage-error-copy'
import { useAppStore } from '../../store'

export function CodexSwitcherMenu({
  codex,
  asSubmenu = false,
  triggerContent,
}: {
  codex: ProviderRateLimits
  compact?: boolean
  iconOnly?: boolean
  asSubmenu?: boolean
  triggerContent?: React.ReactNode
}): React.JSX.Element {
  const openSettingsPage = useAppStore((s) => s.openSettingsPage)
  const openSettingsTarget = useAppStore((s) => s.openSettingsTarget)

  const handleOpenSettings = () => {
    openSettingsTarget('accounts')
    openSettingsPage('accounts')
  }

  const sessionWindow = codex.session
  const weeklyWindow = codex.weekly

  const content = (
    <div className="flex flex-col gap-1 p-2 text-xs w-[240px]">
      <div className="flex items-center justify-between font-semibold border-b border-border/50 pb-1.5">
        <span className="flex items-center gap-1.5">
          <ProviderIcon provider="codex" />
          {getProviderDisplayName('codex')}
        </span>
        <button
          type="button"
          onClick={handleOpenSettings}
          className="text-[10px] text-muted-foreground hover:text-foreground underline cursor-pointer"
        >
          Manage
        </button>
      </div>

      {sessionWindow && (
        <div className="flex items-center justify-between text-[11px] pt-1">
          <span className="text-muted-foreground">Session</span>
          <span className="font-mono font-medium">{sessionWindow.usedPercent}% used</span>
        </div>
      )}

      {weeklyWindow && (
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">Weekly</span>
          <span className="font-mono font-medium">{weeklyWindow.usedPercent}% used</span>
        </div>
      )}
    </div>
  )

  if (asSubmenu) {
    return (
      <DropdownMenuSub>
        <DropdownMenuSubTrigger className="w-full">
          {triggerContent || (
            <span className="flex items-center justify-between w-full">
              <span className="flex items-center gap-1.5">
                <ProviderIcon provider="codex" />
                {getProviderDisplayName('codex')}
              </span>
              <ChevronRight className="size-3.5 text-muted-foreground" />
            </span>
          )}
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent sideOffset={4} className="p-0">
          {content}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    )
  }

  return content
}
