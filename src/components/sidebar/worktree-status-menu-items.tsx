import { Kanban } from 'lucide-react'
import type { ContextMenuItem } from '../CustomContextMenu'
import { getWorkspaceStatusVisualMeta } from './workspace-status'
import { translate } from '../../i18n/i18n'
import type { WorkspaceStatusDefinition } from '../../shared/worktree/types'

/**
 * Orca parity for `WorktreeStatusMenuItems.tsx`: the worktree context menu offers the **user's**
 * workspace-status definitions, and the chosen item writes that status id — the same value the
 * sidebar grouping and the workspace board lanes read back. Agent activity is *not* something the
 * user assigns, so it must not appear here.
 *
 * The custom context menu in this repo has no radio semantics, so the active status is not marked
 * (declared fidelity gap against Orca's `DropdownMenuRadioItem`).
 */
export function buildWorktreeStatusMenuItems(args: {
  workspaceStatuses: readonly WorkspaceStatusDefinition[]
  onAssignStatus: (statusId: string) => void
}): ContextMenuItem {
  return {
    label: translate('auto.components.sidebar.WorktreeContextMenu.84cdbb7e30', 'Move to Status'),
    icon: <Kanban className="w-3.5 h-3.5" />,
    children: args.workspaceStatuses.map((status) => {
      const meta = getWorkspaceStatusVisualMeta(status)
      const StatusIcon = meta.icon
      return {
        label: status.label,
        icon: <StatusIcon className={`w-3.5 h-3.5 ${meta.tone}`} />,
        onClick: () => args.onAssignStatus(status.id),
      }
    }),
    onClick: () => {},
  }
}
