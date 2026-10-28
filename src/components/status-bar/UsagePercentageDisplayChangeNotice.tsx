// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/status-bar/UsagePercentageDisplayChangeNotice.tsx
import React from 'react'

export function UsagePercentageDisplayChangeNotice({
  children,
  hasVisibleUsageMeters
}: {
  children: React.ReactNode
  hasVisibleUsageMeters: boolean
}): React.JSX.Element {
  void hasVisibleUsageMeters
  return <>{children}</>
}
