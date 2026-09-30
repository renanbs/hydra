// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
import React, { useEffect, useState } from 'react'
import { Timer } from 'lucide-react'

export interface CacheTimerProps {
  startedAt: number
  ttlMs?: number
  className?: string
}

export function CacheTimer({ startedAt, ttlMs = 300_000, className }: CacheTimerProps): React.JSX.Element | null {
  const [remainingSec, setRemainingSec] = useState(() => {
    const elapsed = Date.now() - startedAt
    return Math.max(0, Math.floor((ttlMs - elapsed) / 1000))
  })

  useEffect(() => {
    const interval = window.setInterval(() => {
      const elapsed = Date.now() - startedAt
      const rem = Math.max(0, Math.floor((ttlMs - elapsed) / 1000))
      setRemainingSec(rem)
    }, 1000)
    return () => window.clearInterval(interval)
  }, [startedAt, ttlMs])

  if (remainingSec <= 0) {
    return null
  }

  const mins = Math.floor(remainingSec / 60)
  const secs = remainingSec % 60
  const formatted = `${mins}:${secs.toString().padStart(2, '0')}`

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono text-[9px] px-1 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 shrink-0 leading-tight ${className ?? ''}`}
      title={`Prompt cache active (~${formatted} remaining)`}
    >
      <Timer className="w-2.5 h-2.5 shrink-0" />
      <span>{formatted}</span>
    </span>
  )
}

export default CacheTimer
