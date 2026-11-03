// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/worktree-card-secondary-rows.tsx
//
// Rows that sit between the meta row and the inline agent list. The lineage child
// chip and the agent list itself are owned by the parent-content column, so this
// module contributes the remote-branch conflict banner only.
import React from 'react'
import { AlertTriangle } from 'lucide-react'

import { translate } from '@/i18n/i18n'
import type { WorktreeCardWithExtras } from './worktree-card-controller-extras'

export function WorktreeCardSecondaryRows({
  card
}: {
  card: WorktreeCardWithExtras
}): React.JSX.Element | null {
  const { remoteBranchConflict } = card

  // Why: a checkout whose branch already exists on the remote cannot be pushed
  // without a decision, so the card states the collision instead of failing later.
  if (!remoteBranchConflict) {
    return null
  }

  // Why: a boolean-only producer cannot name the remote/branch, so say what is known.
  const conflict =
    typeof remoteBranchConflict === 'object'
      ? translate(
          'auto.components.sidebar.WorktreeCard.a88c92d0e3',
          '{{value0}}/{{value1}} already exists.',
          {
            value0: remoteBranchConflict.remote,
            value1: remoteBranchConflict.branchName
          }
        )
      : translate(
          'auto.components.sidebar.WorktreeCard.remoteBranchConflict',
          'This branch already exists on the remote.'
        )

  return (
    <div className="mt-0.5 flex items-start gap-1.5 rounded border border-amber-500/25 bg-amber-500/5 px-1.5 py-1 text-[10.5px] leading-snug text-amber-700 dark:text-amber-300">
      <AlertTriangle className="mt-[1px] size-3 shrink-0" />
      <span className="min-w-0 flex-1">{conflict}</span>
    </div>
  )
}

export default WorktreeCardSecondaryRows
