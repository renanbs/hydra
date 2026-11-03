// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/activity/activity-thread-options-menu.tsx
//
// Hydra renders this through createPortal into the SidebarHeader slot, exactly like
// Orca's `optionsTarget`, so the list body keeps no local controls.
import { ListFilter } from 'lucide-react'
import { buttonVariants } from '../ui/button'
import { cn } from '../../lib/utils'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '../ui/dropdown-menu'
import type { AgentsGroupBy } from './types'

export type AgentsThreadOptionsMenuProps = {
  groupBy: AgentsGroupBy
  onGroupByChange: (groupBy: AgentsGroupBy) => void
  compactMode: boolean
  onCompactModeChange: (compactMode: boolean) => void
  showChildAgents: boolean
  onShowChildAgentsChange: (showChildAgents: boolean) => void
  showSearch: boolean
  onShowSearchChange: (showSearch: boolean) => void
  unreadOnly: boolean
  onUnreadOnlyChange: (unreadOnly: boolean) => void
  hasUnreadThreads: boolean
  hasCompletedThreads: boolean
  onMarkAllThreadsRead: () => void
  onClearCompleted: () => void
}

export function AgentsThreadOptionsMenu({
  groupBy,
  onGroupByChange,
  compactMode,
  onCompactModeChange,
  showChildAgents,
  onShowChildAgentsChange,
  showSearch,
  onShowSearchChange,
  unreadOnly,
  onUnreadOnlyChange,
  hasUnreadThreads,
  hasCompletedThreads,
  onMarkAllThreadsRead,
  onClearCompleted
}: AgentsThreadOptionsMenuProps): React.JSX.Element {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        type="button"
        aria-label="Thread list options"
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
          'text-muted-foreground'
        )}
      >
        <ListFilter className="size-3.5" strokeWidth={2.25} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="w-52">
        <DropdownMenuLabel>Group by</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={groupBy}
          onValueChange={(value) => onGroupByChange(value as AgentsGroupBy)}
        >
          <DropdownMenuRadioItem value="state">State</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="project">Project</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={compactMode}
          onCheckedChange={(checked) => onCompactModeChange(checked === true)}
        >
          Compact rows
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={showChildAgents}
          onCheckedChange={(checked) => onShowChildAgentsChange(checked === true)}
        >
          Show child agents
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={showSearch}
          onCheckedChange={(checked) => onShowSearchChange(checked === true)}
        >
          Show search
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={unreadOnly}
          onCheckedChange={(checked) => onUnreadOnlyChange(checked === true)}
        >
          Unread only
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={!hasUnreadThreads}
          onSelect={() => onMarkAllThreadsRead()}
        >
          Mark all as read
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!hasCompletedThreads}
          onSelect={() => onClearCompleted()}
        >
          Clear completed
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
