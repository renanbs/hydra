// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// SshStatusSegment: Shows connectivity indicator for remote SSH hosts in the status bar.
import React from 'react'
import { Server } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export function SshStatusSegment({
  compact = false,
  iconOnly = false
}: {
  compact?: boolean
  iconOnly?: boolean
}): React.JSX.Element | null {
  void compact

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 px-1 py-0.5 rounded text-xs text-muted-foreground hover:bg-accent/70 transition-colors"
          aria-label="Remote Hosts"
        >
          <Server className="size-3.5" />
          {!iconOnly && <span>Remote</span>}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6}>
        Remote Hosts
      </TooltipContent>
    </Tooltip>
  )
}
