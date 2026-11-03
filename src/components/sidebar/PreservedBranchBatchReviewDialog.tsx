// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/PreservedBranchBatchReviewDialog.tsx
import { useMemo, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { getRepoIdFromWorktreeId } from '../../shared/worktree/id'
import { useAppStore } from '@/store'
import { Button } from '../ui/button'
import { Checkbox } from '../ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '../ui/dialog'
import { Label } from '../ui/label'
import type { PreservedBranchInfo } from './worktree-delete-parallel'

export type ActionablePreservedBranch = PreservedBranchInfo & { expectedHead: string }

function selectionKey(branch: PreservedBranchInfo): string {
  return [branch.worktreeId, branch.branchName, branch.expectedHead ?? '', branch.hostId ?? ''].join(
    '\u0000'
  )
}

/**
 * Review kept branches before force deleting them. Branches without a head the
 * removal could verify stay listed but disabled: deleting them blind could drop
 * commits created after the worktree disappeared.
 */
export function PreservedBranchBatchReviewDialog({
  branches,
  open,
  onOpenChange,
  onForceDelete
}: {
  branches: readonly PreservedBranchInfo[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onForceDelete: (branches: readonly ActionablePreservedBranch[]) => void
}): React.JSX.Element {
  const repos = useAppStore((state) => state.repos)
  const actionableBranches = useMemo(
    () =>
      branches.filter((branch): branch is ActionablePreservedBranch =>
        Boolean(branch.expectedHead)
      ),
    [branches]
  )
  const actionableKeys = useMemo(
    () => actionableBranches.map((branch) => selectionKey(branch)),
    [actionableBranches]
  )
  const [selectedKeys, setSelectedKeys] = useState<ReadonlySet<string>>(
    () => new Set(actionableKeys)
  )
  const selectedBranches = actionableBranches.filter((branch) =>
    selectedKeys.has(selectionKey(branch))
  )
  const allSelected =
    actionableBranches.length > 0 && selectedBranches.length === actionableBranches.length
  const someSelected = selectedBranches.length > 0 && !allSelected

  const getRepositoryLabel = (branch: PreservedBranchInfo): string => {
    const repoId = getRepoIdFromWorktreeId(branch.worktreeId)
    return repos.find((repo) => repo.id === repoId)?.displayName || repoId
  }

  const setBranchSelected = (branch: ActionablePreservedBranch, selected: boolean): void => {
    setSelectedKeys((current) => {
      const next = new Set(current)
      if (selected) next.add(selectionKey(branch))
      else next.delete(selectionKey(branch))
      return next
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-sm">Review kept branches</DialogTitle>
          <DialogDescription>
            Select the local branches you want to force delete. Unselected branches stay in their
            repositories.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-72 overflow-y-auto scrollbar-sleek rounded-md border border-border/70 bg-muted/35 text-xs">
          <div className="sticky top-0 z-10 flex min-h-9 items-center justify-between gap-3 border-b border-border/70 bg-background/95 px-3 backdrop-blur-sm">
            <Label htmlFor="preserved-branch-select-all" className="gap-2 text-xs">
              <Checkbox
                id="preserved-branch-select-all"
                checked={someSelected ? 'indeterminate' : allSelected}
                onCheckedChange={(checked) =>
                  setSelectedKeys(checked === true ? new Set(actionableKeys) : new Set())
                }
              />
              Select all
            </Label>
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {selectedBranches.length} of {actionableBranches.length} selected
            </span>
          </div>

          <ul className="px-3">
            {branches.map((branch, index) => {
              const actionableBranch = branch.expectedHead
                ? (branch as ActionablePreservedBranch)
                : null
              const branchKey = selectionKey(branch)
              const checkboxId = `preserved-branch-${index}`
              return (
                <li
                  key={branchKey}
                  className="grid min-h-11 grid-cols-[1rem_minmax(0,1fr)_auto] items-center gap-2.5 border-b border-border/50 py-1.5 last:border-0"
                >
                  <Checkbox
                    id={checkboxId}
                    checked={actionableBranch ? selectedKeys.has(branchKey) : false}
                    disabled={!actionableBranch}
                    onCheckedChange={(checked) => {
                      if (actionableBranch) setBranchSelected(actionableBranch, checked === true)
                    }}
                  />
                  <Label htmlFor={checkboxId} className="block min-w-0 cursor-pointer leading-snug">
                    <span className="block break-all font-mono font-medium text-foreground">
                      {branch.branchName}
                    </span>
                    <span className="mt-0.5 block break-all text-[11px] text-muted-foreground">
                      {getRepositoryLabel(branch)}
                      {branch.expectedHead ? ` · ${branch.expectedHead.slice(0, 7)}` : ''}
                    </span>
                  </Label>
                  <span className="text-[11px] whitespace-nowrap text-muted-foreground">
                    {actionableBranch ? 'May be unmerged' : 'Head unavailable'}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={selectedBranches.length === 0}
            onClick={() => onForceDelete(selectedBranches)}
          >
            <Trash2 />
            Force Delete {selectedBranches.length} Branches
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
