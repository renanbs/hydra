// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
import React from 'react'

import { WorktreeCardSurface } from './worktree-card-surface'
import type { WorktreeCardProps } from './worktree-card-model'
import { useWorktreeCardController } from './use-worktree-card-controller'

export { shouldBeginWorktreeRename } from './worktree-card-model'
export type { ActiveSurfaceVariant, WorktreeCardProps } from './worktree-card-model'

export const WorktreeCard = React.memo(function WorktreeCard(props: WorktreeCardProps): React.JSX.Element {
  const card = useWorktreeCardController(props)
  return <WorktreeCardSurface card={card} />
})

export default WorktreeCard
