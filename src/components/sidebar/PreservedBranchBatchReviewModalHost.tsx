import { useMemo } from 'react'
import { useAppStore } from '@/store'
import type { AppState } from '@/store/types'
import { PreservedBranchBatchReviewDialog } from './PreservedBranchBatchReviewDialog'
import {
  forceDeletePreservedBranchBatch,
  type ActionablePreservedBranch
} from './worktree-delete-toasts'
import type { PreservedBranchInfo } from './worktree-delete-parallel'

type PreservedBranchModalState = {
  activeModal: string
  modalData: Record<string, unknown>
  closeModal: () => void
}

function isPreservedBranchInfo(value: unknown): value is PreservedBranchInfo {
  if (!value || typeof value !== 'object') return false
  const branch = value as Partial<PreservedBranchInfo>
  return (
    typeof branch.worktreeId === 'string' &&
    typeof branch.branchName === 'string' &&
    (branch.expectedHead === undefined || typeof branch.expectedHead === 'string')
  )
}

function getModalBranches(value: unknown): PreservedBranchInfo[] {
  return Array.isArray(value) ? value.filter(isPreservedBranchInfo) : []
}

/** Mounts the review dialog for `openModal('preserved-branch-review', { branches })`. */
export function PreservedBranchBatchReviewModalHost(): React.JSX.Element | null {
  // Reason: the composed UI slice is typed as `any` on this branch; these are the
  // modal fields the delete flow opens with.
  const state = useAppStore((value) => value as AppState & PreservedBranchModalState)
  const branches = useMemo(() => getModalBranches(state.modalData.branches), [
    state.modalData.branches
  ])
  const open = state.activeModal === 'preserved-branch-review' && branches.length > 0
  if (!open) return null

  const handleForceDelete = (selectedBranches: readonly ActionablePreservedBranch[]): void => {
    state.closeModal()
    void forceDeletePreservedBranchBatch(selectedBranches)
  }

  return (
    <PreservedBranchBatchReviewDialog
      branches={branches}
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) state.closeModal()
      }}
      onForceDelete={handleForceDelete}
    />
  )
}
