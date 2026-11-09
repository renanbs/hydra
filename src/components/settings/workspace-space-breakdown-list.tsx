// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: renderer/src/components/status-bar/workspace-space-breakdown-list.tsx
// (WorkspaceSpaceSizeBar + WorkspaceSpaceBreakdownList).
// Adapted to the Hydra space types (no status field — errors surface via `error`).
import { Loader2 } from 'lucide-react'
import type { WorkspaceSpaceWorktree } from '@/store/slices/workspace-space-types'
import { formatBytes, formatCompactCount } from './workspace-space-format'
import { translate } from '@/i18n/i18n'

export function WorkspaceSpaceSizeBar({
  value,
  max
}: {
  value: number
  max: number
}): React.JSX.Element {
  const pct = max > 0 ? Math.max(2, Math.min(100, (value / max) * 100)) : 0
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
      <div className="h-full rounded-full bg-foreground/65" style={{ width: `${pct}%` }} />
    </div>
  )
}

export function WorkspaceSpaceBreakdownList({
  worktree,
  isScanning
}: {
  worktree: WorkspaceSpaceWorktree | null
  isScanning: boolean
}): React.JSX.Element {
  if (!worktree) {
    return (
      <div className="flex h-full min-h-72 items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/15 text-sm text-muted-foreground">
        <span className="flex items-center gap-2">
          {isScanning ? <Loader2 className="size-4 animate-spin" /> : null}
          {isScanning
            ? translate(
                'auto.components.status.bar.WorkspaceSpaceManagerPanel.c5135e7e4a',
                'Scanning workspace sizes. You can leave this page.'
              )
            : translate(
                'auto.components.status.bar.WorkspaceSpaceManagerPanel.5c6d25720c',
                'Select a workspace to inspect.'
              )}
        </span>
      </div>
    )
  }

  const childSizes = worktree.topLevelItems.map((i) => i.sizeBytes)
  const maxChildSize = Math.max(0, ...childSizes, worktree.omittedTopLevelSizeBytes)
  const topLevelItemCount = worktree.topLevelItems.length + worktree.omittedTopLevelItemCount
  return (
    <div className="min-h-72 rounded-lg border border-border/70 bg-background/35">
      <div className="border-b border-border/60 px-4 py-3">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{worktree.displayName}</div>
            <div className="mt-0.5 truncate text-xs text-muted-foreground">
              {worktree.repoDisplayName}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-sm font-semibold tabular-nums">
              {formatBytes(worktree.sizeBytes)}
            </div>
            <div className="text-[11px] text-muted-foreground tabular-nums">
              {translate(
                'auto.components.status.bar.WorkspaceSpaceManagerPanel.topItems',
                '{{value0}} top-level items',
                { value0: formatCompactCount(topLevelItemCount) }
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="divide-y divide-border/40">
        {worktree.topLevelItems.map((item) => (
          <div key={item.path} className="px-4 py-2">
            <div className="flex items-baseline justify-between gap-3 text-xs">
              <span className="min-w-0 truncate font-mono" title={item.path}>
                {item.name}/
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {formatBytes(item.sizeBytes)}
              </span>
            </div>
            <div className="mt-1">
              <WorkspaceSpaceSizeBar value={item.sizeBytes} max={maxChildSize} />
            </div>
          </div>
        ))}
        {worktree.omittedTopLevelItemCount > 0 && (
          <div className="px-4 py-2">
            <div className="flex items-baseline justify-between gap-3 text-xs">
              <span className="min-w-0 truncate text-muted-foreground">
                {translate(
                  'components.status.bar.workspaceSpace.otherTopLevelItems',
                  'Other top-level items ({{value0}})',
                  { value0: worktree.omittedTopLevelItemCount }
                )}
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {formatBytes(worktree.omittedTopLevelSizeBytes)}
              </span>
            </div>
            <div className="mt-1">
              <WorkspaceSpaceSizeBar
                value={worktree.omittedTopLevelSizeBytes}
                max={maxChildSize}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
