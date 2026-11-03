// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/repo/NestedRepoChecklist.tsx
//
// D02a-022: the review list for repositories discovered under a parent folder.
// Select-all is tri-state, and every row is a real checkbox so keyboard users can
// drive the import without a mouse.
import { useCallback } from 'react'
import { GitBranch } from 'lucide-react'
import type { NestedRepoScanResult } from '../../shared/project-group-types'

function NestedRepoSelectAllRow({
  total,
  selectedCount,
  disabled,
  onToggle
}: {
  total: number
  selectedCount: number
  disabled: boolean
  onToggle: () => void
}) {
  const allSelected = total > 0 && selectedCount === total
  const noneSelected = selectedCount === 0
  const isMixed = !allSelected && !noneSelected
  const handleCheckboxRef = useCallback(
    (checkbox: HTMLInputElement | null) => {
      if (checkbox) checkbox.indeterminate = isMixed
    },
    [isMixed]
  )
  return (
    <label className="flex min-w-0 cursor-pointer items-center gap-2.5 bg-[#18191d] px-3 py-2 text-xs hover:bg-neutral-800/60">
      <input
        ref={handleCheckboxRef}
        type="checkbox"
        className="size-3.5"
        checked={allSelected}
        disabled={disabled}
        onChange={onToggle}
        aria-label={allSelected ? 'Deselect all' : 'Select all'}
      />
      <span className="min-w-0 truncate font-semibold text-neutral-100">
        {allSelected ? 'Deselect all' : 'Select all'}
      </span>
      <span className="ml-auto shrink-0 text-[11px] text-neutral-500">
        {selectedCount} of {total} selected
      </span>
    </label>
  )
}

export function NestedRepoChecklist({
  scan,
  selectedPaths,
  onSelectedPathsChange,
  disabled = false,
  className = ''
}: {
  scan: NestedRepoScanResult
  selectedPaths: ReadonlySet<string>
  onSelectedPathsChange: (next: ReadonlySet<string>) => void
  disabled?: boolean
  className?: string
}): React.JSX.Element {
  return (
    <div
      className={`flex max-h-64 min-h-0 min-w-0 max-w-full flex-col overflow-hidden rounded-md border border-[#2a2b30] bg-[#0e0f11] ${className}`}
    >
      <NestedRepoSelectAllRow
        total={scan.repos.length}
        selectedCount={selectedPaths.size}
        disabled={disabled}
        onToggle={() => {
          if (selectedPaths.size === scan.repos.length) {
            onSelectedPathsChange(new Set())
            return
          }
          onSelectedPathsChange(new Set(scan.repos.map((repo) => repo.path)))
        }}
      />
      <ul className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        {scan.repos.map((repo) => (
          <li key={repo.path}>
            <label className="flex min-w-0 max-w-full cursor-pointer items-center gap-2.5 overflow-hidden border-t border-[#222327] px-3 py-2 text-xs hover:bg-neutral-800/60">
              <input
                type="checkbox"
                className="size-3.5"
                checked={selectedPaths.has(repo.path)}
                disabled={disabled}
                onChange={(event) => {
                  const next = new Set(selectedPaths)
                  if (event.target.checked) next.add(repo.path)
                  else next.delete(repo.path)
                  onSelectedPathsChange(next)
                }}
              />
              <GitBranch className="size-3.5 shrink-0 text-neutral-500" />
              <span className="min-w-0 flex-1">
                <span
                  className={`block truncate font-medium ${
                    selectedPaths.has(repo.path) ? 'text-neutral-100' : 'text-neutral-400'
                  }`}
                >
                  {repo.displayName}
                </span>
                <span className="block truncate font-mono text-[10px] text-neutral-500">
                  {repo.path}
                </span>
              </span>
              <span className="shrink-0 text-[10px] text-neutral-500">depth {repo.depth}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  )
}
