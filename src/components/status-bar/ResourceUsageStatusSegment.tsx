// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// ResourceUsageStatusSegment: CPU and RAM usage indicator in the status bar.
import React from 'react'
import { Activity } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export function ResourceUsageStatusSegment({
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
          aria-label="Resource Manager"
        >
          <Activity className="size-3.5" />
          {!iconOnly && <span>Resources</span>}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6}>
        Resource Manager
      </TooltipContent>
    </Tooltip>
  )
}
