// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/WorktreeContextMenuOverlays.tsx
//
// Dialogs owned by the context menu are mounted beside the menu, not inside a
// workspace row: the virtualized sidebar clips rows, and a dialog that is a
// descendant of a transformed row would be laid out against that row. Both members
// are null in the common case, so the overlay contributes an empty fragment.
import React, { Suspense } from 'react'

import { lazyWithRetry } from '../../lib/lazy-with-retry'
import {
  WorktreeParentPickerPopover,
  type WorktreeParentPickerPopoverProps
} from './WorktreeParentPickerPopover'

// Same lazy boundary the sidebar uses: the overlay is mounted on every render, so
// the dialog must stay out of the initial sidebar chunk.
const ProjectGroupNameDialog = lazyWithRetry(() =>
  import('./ProjectGroupNameDialog').then((module) => ({ default: module.ProjectGroupNameDialog }))
)

export type WorktreeContextMenuGroupDialogModel = {
  open: boolean
  title: string
  description: string
  initialName: string
  confirmLabel: string
  onOpenChange: (open: boolean) => void
  onSubmit: (name: string) => void
}

export type WorktreeContextMenuParentPickerModel = Pick<
  WorktreeParentPickerPopoverProps,
  | 'open'
  | 'child'
  | 'candidates'
  | 'getAnchorRect'
  | 'onOpenChange'
  | 'onSelect'
  | 'onRemoveParent'
  | 'focusRestoreElement'
>

export type WorktreeContextMenuOverlaysProps = {
  groupDialog?: WorktreeContextMenuGroupDialogModel | null
  parentPicker?: WorktreeContextMenuParentPickerModel | null
}

export function WorktreeContextMenuOverlays({
  groupDialog,
  parentPicker
}: WorktreeContextMenuOverlaysProps): React.JSX.Element {
  return (
    <>
      {groupDialog ? (
        <Suspense fallback={null}>
          <ProjectGroupNameDialog
            open={groupDialog.open}
            title={groupDialog.title}
            description={groupDialog.description}
            initialName={groupDialog.initialName}
            confirmLabel={groupDialog.confirmLabel}
            onOpenChange={groupDialog.onOpenChange}
            onSubmit={groupDialog.onSubmit}
          />
        </Suspense>
      ) : null}
      {parentPicker ? <WorktreeParentPickerPopover {...parentPicker} /> : null}
    </>
  )
}

export default WorktreeContextMenuOverlays
