import React, { useCallback, useRef, useState } from 'react'
import { ListFilter } from 'lucide-react'
import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'
import type { HydraProject } from '../WorktreeSidebar'
import {
  WorkspaceOptionsMenu,
  countActiveWorkspaceFilters,
  type WorkspaceDisplayOptions,
} from '../WorkspaceOptionsMenu'

type WorkspaceBoardFilterMenuProps = {
  options: WorkspaceDisplayOptions
  /** Every project, not the board's filtered set: the repo filter list must stay complete. */
  projects: readonly HydraProject[]
  onOptionsChange: (options: WorkspaceDisplayOptions) => void
  onAddProject?: () => void
  onClearFilters?: () => void
  onUpdateSettings?: (patch: { compact_worktree_cards: boolean }) => void
  /** Tells the panel a board-owned menu is open, so outside presses do not dismiss it. */
  onMenuOpenChange?: (open: boolean) => void
}

/**
 * Ported from Orca `SidebarFilter` as the board header's own trigger (Orca reuses the
 * sidebar's `SidebarFilter` there). The menu itself is Hydra's single filter surface,
 * `WorkspaceOptionsMenu`, wired to the sidebar's own display-options writers — the
 * board never forks a second copy of the filters.
 *
 * Why the trigger carries `data-workspace-board-preserve-open`: the menu portals to
 * body, so the outside-dismiss hook must recognize both the trigger and the panel as
 * board-owned interactions.
 */
export default function WorkspaceBoardFilterMenu({
  options,
  projects,
  onOptionsChange,
  onAddProject,
  onClearFilters,
  onUpdateSettings,
  onMenuOpenChange,
}: WorkspaceBoardFilterMenuProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const activeFilterCount = countActiveWorkspaceFilters(options)

  const setOpenState = useCallback(
    (next: boolean) => {
      setOpen(next)
      onMenuOpenChange?.(next)
    },
    [onMenuOpenChange]
  )

  const label =
    activeFilterCount > 0
      ? translate(
          'auto.components.sidebar.WorkspaceBoardFilterMenu.6c2d1f0a4b',
          'Workspace display options ({{value0}} active)',
          { value0: activeFilterCount }
        )
      : translate(
          'auto.components.sidebar.WorkspaceBoardFilterMenu.1e9a4b7c2d',
          'Workspace display options'
        )

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          setOpenState(!open)
        }}
        title={label}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        data-workspace-board-trigger=""
        data-workspace-board-preserve-open=""
        className={cn(
          'relative inline-flex size-6 items-center justify-center rounded-md outline-none cursor-pointer transition-all',
          'focus-visible:ring-[3px] focus-visible:ring-worktree-sidebar-ring/50',
          open
            ? 'bg-worktree-sidebar-accent text-worktree-sidebar-accent-foreground'
            : 'text-worktree-sidebar-foreground/60 hover:text-worktree-sidebar-foreground hover:bg-worktree-sidebar-accent/60'
        )}
      >
        <ListFilter className="size-3.5" strokeWidth={2.25} />
        {activeFilterCount > 0 ? (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 flex h-3 min-w-3 items-center justify-center rounded-full bg-primary px-0.5 text-[9px] font-medium leading-none text-primary-foreground"
          >
            {activeFilterCount > 9 ? '9+' : activeFilterCount}
          </span>
        ) : null}
      </button>
      <WorkspaceOptionsMenu
        isOpen={open}
        triggerRef={triggerRef}
        options={options}
        projects={[...projects]}
        onClose={() => setOpenState(false)}
        onOptionsChange={onOptionsChange}
        onAddProject={onAddProject}
        onClearFilters={onClearFilters}
        onUpdateSettings={onUpdateSettings}
      />
    </>
  )
}
