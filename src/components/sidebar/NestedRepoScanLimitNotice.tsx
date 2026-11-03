// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/repo/NestedRepoScanLimitNotice.tsx
//
// D02a-022/041: tell the user when the scan list is partial (truncated, timed
// out or stopped early) and what the automatic limits were.
import { CircleHelp } from 'lucide-react'
import type { NestedRepoScanResult } from '../../shared/project-group-types'

function formatTimeout(timeoutMs: number): string {
  return timeoutMs >= 1000 && timeoutMs % 1000 === 0
    ? `${timeoutMs / 1000} seconds`
    : `${timeoutMs} ms`
}

export function nestedRepoScanLimitText(scan: NestedRepoScanResult): string {
  const automaticStops = [`${scan.maxDepth} folder levels`, `${scan.maxRepos} repositories`]
  if (scan.timeoutMs !== null) {
    automaticStops.push(formatTimeout(scan.timeoutMs))
  }
  return `Scan stops after ${automaticStops.join(' or ')}. You can stop scanning early and import repositories found so far.`
}

export function NestedRepoScanLimitNotice({
  scan
}: {
  scan: NestedRepoScanResult
}): React.JSX.Element {
  const detailsText = nestedRepoScanLimitText(scan)
  return (
    <div className="inline-flex min-w-0 items-center gap-1.5 text-[11px] text-neutral-500">
      <span>
        {scan.stopped ? 'Scan stopped early.' : 'Showing partial scan results.'}
      </span>
      <span
        className="inline-flex size-4 shrink-0 items-center justify-center rounded-sm text-neutral-500 transition hover:text-neutral-200"
        title={detailsText}
        aria-label="Nested repository scan limits"
      >
        <CircleHelp className="size-3.5" />
      </span>
    </div>
  )
}
