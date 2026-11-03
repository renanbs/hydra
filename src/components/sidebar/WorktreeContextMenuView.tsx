// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/WorktreeContextMenuView.tsx
//
// The card model lives in `worktree-context-menu-model.ts`; this view is the
// dedicated paint surface so App never has to know how a sidebar menu is drawn.
// `RadixContextMenu` owns the portal, scope attribute and ghost-click suppression.
import React from 'react'

import { RadixContextMenu } from '../RadixContextMenu'
import type { ContextMenuItem } from '../CustomContextMenu'

export interface WorktreeContextMenuViewProps {
  x: number
  y: number
  items: readonly ContextMenuItem[]
  onClose: () => void
  onLifecycleComplete?: () => void
}

export function WorktreeContextMenuView({
  x,
  y,
  items,
  onClose,
  onLifecycleComplete
}: WorktreeContextMenuViewProps): React.JSX.Element {
  return (
    <div data-worktree-context-menu-view="">
      <RadixContextMenu
        x={x}
        y={y}
        items={items as ContextMenuItem[]}
        onClose={onClose}
        onLifecycleComplete={onLifecycleComplete}
      />
    </div>
  )
}

export default WorktreeContextMenuView
