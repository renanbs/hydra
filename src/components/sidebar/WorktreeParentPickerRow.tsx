// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/WorktreeParentPickerRow.tsx
import React from 'react'
import { GitBranch, Server } from 'lucide-react'
import { WorktreeStatusIndicator } from './WorktreeStatusIndicator'
import { resolveRepoHeaderColor } from './project-header-color'
import { getWorktreeStatusLabel, type WorktreeStatus } from '../../lib/worktree-status'
import { translate } from '../../i18n/i18n'
import { branchName } from '../../lib/git-utils'

export type WorktreeParentPickerRowData = {
  displayName: string
  branch: string
  repoLabel: string
  repoBadgeColor?: string
  connectionId?: string | null
  status: WorktreeStatus
  isActive: boolean
}

/**
 * One picker row: presentational and memoized.
 *
 * Why memo: the picker resolves every visible row's activity from one batched pass, and a
 * workspace list in a busy repo holds hundreds of candidates — a re-render of the list (search
 * keystroke, highlight move) must not rebuild the rows that did not change.
 */
export const WorktreeParentPickerRow = React.memo(function WorktreeParentPickerRow({
  candidate
}: {
  candidate: WorktreeParentPickerRowData
}): React.JSX.Element {
  const branch = branchName(candidate.branch)

  return (
    <div className="flex min-w-0 flex-1 items-start gap-2">
      <WorktreeStatusIndicator
        status={candidate.status}
        showLabel={false}
        className="mt-0.5"
      />
      <span className="sr-only">{getWorktreeStatusLabel(candidate.status)}</span>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-[13px] font-medium">{candidate.displayName}</span>
          {candidate.isActive ? (
            <span className="shrink-0 rounded border border-[#2a2b30] bg-[#1f2024] px-1.5 py-px text-[9px] font-medium leading-none text-neutral-400">
              {translate(
                'auto.components.sidebar.WorktreeParentPickerPopover.current',
                'Current'
              )}
            </span>
          ) : null}
        </div>
        <div className="mt-1 flex min-w-0 items-center gap-1.5 text-[11px] leading-none text-neutral-500">
          <span className="inline-flex min-w-0 max-w-[8rem] shrink-0 items-center gap-1 rounded border border-[#2a2b30] bg-[#1a1b1f] px-1.5 py-0.5 text-[10px] font-semibold text-neutral-300">
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-[2px]"
              style={{ backgroundColor: resolveRepoHeaderColor(candidate.repoBadgeColor) }}
            />
            <span className="truncate lowercase">{candidate.repoLabel}</span>
          </span>
          {candidate.connectionId ? (
            <Server aria-hidden="true" className="size-3 shrink-0" />
          ) : null}
          <GitBranch aria-hidden="true" className="size-3 shrink-0" />
          <span className="truncate">{branch}</span>
        </div>
      </div>
    </div>
  )
})
