// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// PortsStatusSegment: Shows detected open network ports for the active worktree in the status bar.
import React from 'react'
import { Plug } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export function PortsStatusSegment({
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
          aria-label="Ports"
        >
          <Plug className="size-3.5" />
          {!iconOnly && <span>Ports</span>}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6}>
        Active Ports
      </TooltipContent>
    </Tooltip>
  )
}
