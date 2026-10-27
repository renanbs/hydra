import React from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { translate } from '@/i18n/i18n'
import WorkspaceBoardSearchField from './WorkspaceBoardSearchField'

type WorkspaceBoardHeaderProps = {
  query: string
  isFiltering: boolean
  isTooLarge: boolean
  matchCount: number
  totalCount: number
  onQueryChange: (query: string) => void
  onClearQuery: () => void
  onClose: () => void
}

/**
 * Ported from Orca `WorkspaceKanbanDrawerHeader`, minus the filter menu and the
 * settings menu — neither exists in this increment, so the header carries the
 * title, the board's search field and the close button only.
 */
export default function WorkspaceBoardHeader({
  query,
  isFiltering,
  isTooLarge,
  matchCount,
  totalCount,
  onQueryChange,
  onClearQuery,
  onClose,
}: WorkspaceBoardHeaderProps): React.JSX.Element {
  return (
    <>
      <SheetHeader className="border-b border-worktree-sidebar-border px-4 py-3 pr-12">
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
