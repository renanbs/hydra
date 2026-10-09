import React from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { translate } from '@/i18n/i18n'
import WorkspaceBoardSearchField from './WorkspaceBoardSearchField'
import WorkspaceBoardSettingsMenu from './WorkspaceBoardSettingsMenu'
import type { WorkspaceBoardStatusActions } from './use-workspace-board-status-actions'

type WorkspaceBoardHeaderProps = {
  query: string
  isFiltering: boolean
  isTooLarge: boolean
  matchCount: number
  totalCount: number
  /**
   * How many of the cards the board shows are selected. The badge appears past one, exactly as
   * in Orca: a single selected card is what a plain click always leaves behind, so a badge for
   * it would be noise.
   */
  selectedCount: number
  onQueryChange: (query: string) => void
  onClearQuery: () => void
  onClose: () => void
  /** The board's status CRUD, wired to the store by the drawer. */
  statusActions: WorkspaceBoardStatusActions
}

/**
 * Ported from Orca `WorkspaceKanbanDrawerHeader`, minus the sidebar filter menu —
 * that surface belongs to a later increment, so the header carries the title, the
 * board's search field, the status settings menu and the close button.
 */
export default function WorkspaceBoardHeader({
  query,
  isFiltering,
  isTooLarge,
  matchCount,
  totalCount,
  selectedCount,
  onQueryChange,
  onClearQuery,
  onClose,
  statusActions,
}: WorkspaceBoardHeaderProps): React.JSX.Element {
  return (
    <>
      <SheetHeader className="border-b border-worktree-sidebar-border px-4 py-3 pr-16">
        {/* Why: SheetTitle is the sheet's aria-labelledby target and renders an
            <h2>, so the board's own controls must be its sibling, not a descendant. */}
        <div className="flex items-center gap-2">
          <SheetTitle className="flex shrink-0 items-center gap-2 text-sm">
            <span>
              {translate(
                'auto.components.sidebar.WorkspaceKanbanDrawerHeader.c6a77ab0f4',
                'Workspace board'
              )}
            </span>
            {selectedCount > 1 ? (
              <span
                data-workspace-board-selection-count=""
                className="rounded-full bg-worktree-sidebar-accent px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
              >
                {selectedCount}{' '}
                {translate(
                  'auto.components.sidebar.WorkspaceKanbanDrawerHeader.81870af08f',
                  'selected'
                )}
              </span>
            ) : null}
          </SheetTitle>
          <WorkspaceBoardSearchField
            query={query}
            isFiltering={isFiltering}
            isTooLarge={isTooLarge}
            matchCount={matchCount}
            totalCount={totalCount}
            onQueryChange={onQueryChange}
            onClear={onClearQuery}
            onClose={onClose}
          />
        </div>
        <SheetDescription className="sr-only">
          {translate(
            'auto.components.sidebar.WorkspaceKanbanDrawerHeader.e1a34450fc',
            'Organize workspaces by status and open workspace cards.'
          )}
        </SheetDescription>
      </SheetHeader>

      <div className="absolute right-3 top-2.5 flex items-center gap-1">
        <WorkspaceBoardSettingsMenu
          workspaceStatuses={statusActions.workspaceStatuses}
          onRenameStatus={statusActions.onRenameStatus}
          onChangeStatusColor={statusActions.onChangeStatusColor}
          onChangeStatusIcon={statusActions.onChangeStatusIcon}
          onMoveStatus={statusActions.onMoveStatus}
          onRemoveStatus={statusActions.onRemoveStatus}
          onAddStatus={statusActions.onAddStatus}
        />
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={translate('auto.components.sidebar.WorkspaceKanbanDrawerHeader.f369f5c5a3', 'Close')}
          onClick={onClose}
        >
          <X className="size-3.5" />
        </Button>
      </div>
    </>
  )
}
