// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
import React from 'react'

export function WorktreeHostContextBadge({
  label,
  className
}: {
  label: string
  className?: string
}): React.JSX.Element {
  return (
    <span
      className={`inline-flex items-center max-w-[7rem] px-1.5 py-0.2 rounded text-[10px] font-medium bg-neutral-800/80 text-neutral-300 border border-neutral-700/60 leading-tight shrink-0 ${className ?? ''}`}
      title={label}
    >
      <span className="truncate">{label}</span>
    </span>
  )
}
