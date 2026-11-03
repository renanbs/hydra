import { describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { PreservedBranchBatchReviewDialog } from './PreservedBranchBatchReviewDialog'
import type { PreservedBranchInfo } from './worktree-delete-parallel'

const branches: PreservedBranchInfo[] = [
  { worktreeId: 'repo-1::/wt/a', branchName: 'feat/unmerged', expectedHead: 'abcdef123456' },
  { worktreeId: 'repo-2::/wt/b', branchName: 'fix/kept' }
]

describe('PreservedBranchBatchReviewDialog (D02c-012)', () => {
  it('selects actionable branches by default and disables branches without a head', () => {
    render(
      <PreservedBranchBatchReviewDialog
        branches={branches}
        open
        onOpenChange={vi.fn()}
        onForceDelete={vi.fn()}
      />
    )
    expect(screen.getByText('1 of 1 selected')).toBeInTheDocument()
    expect(screen.getByText('May be unmerged')).toBeInTheDocument()
    expect(screen.getByText('Head unavailable')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Select all' })).toBeChecked()
    const unavailable = screen
      .getAllByRole('checkbox')
      .find((checkbox) => checkbox.id === 'preserved-branch-1')
    expect(unavailable).toBeDisabled()
  })

  it('force deletes exactly the selected branches', () => {
    const onForceDelete = vi.fn()
    render(
      <PreservedBranchBatchReviewDialog
        branches={branches}
        open
        onOpenChange={vi.fn()}
        onForceDelete={onForceDelete}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /Force Delete 1 Branches/ }))
    expect(onForceDelete).toHaveBeenCalledWith([branches[0]])
  })

  it('disables the delete action when nothing is selected', () => {
    render(
      <PreservedBranchBatchReviewDialog
        branches={branches}
        open
        onOpenChange={vi.fn()}
        onForceDelete={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all' }))
    expect(screen.getByText('0 of 1 selected')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Force Delete 0 Branches/ })).toBeDisabled()
  })
})
