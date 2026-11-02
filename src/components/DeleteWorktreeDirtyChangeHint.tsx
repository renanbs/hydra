// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/DeleteWorktreeDirtyChangeHint.tsx
// Severe "changes will be lost" hint for the delete confirmation. It disappears
// while the count is unknown (`undefined`) instead of claiming zero changes.
import { AlertTriangle } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'
import { formatDirtyChangeHintText } from './sidebar/delete-worktree-dirty-change-counts'

export interface DeleteWorktreeDirtyChangeHintProps {
  count: number | null | undefined
}

export function DeleteWorktreeDirtyChangeHint({
  count,
}: DeleteWorktreeDirtyChangeHintProps): React.JSX.Element | null {
  const label = formatDirtyChangeHintText(count)
  if (!label) return null
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          role="note"
          data-delete-dirty-change-hint=""
          className="inline-flex items-center gap-1 rounded border border-amber-500/30 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-mono text-amber-400"
        >
          <AlertTriangle className="size-3" />
          {count != null && count > 0 ? `${count} uncommitted` : 'uncommitted'}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6} className="max-w-64 text-pretty">
        <span className="font-medium text-amber-300">{label}</span>
        <span className="block text-muted-foreground">
          Deleting this workspace permanently removes these changes from disk.
        </span>
      </TooltipContent>
    </Tooltip>
  )
}

export default DeleteWorktreeDirtyChangeHint
