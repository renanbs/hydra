// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/worktree-card-secondary-rows.tsx (lineage child chip)
//
// D11-014: a lineage parent card owns an inline child region, so it must say how many
// children that region holds and let the user fold it — otherwise the nested rows
// below a collapsed parent vanish with no affordance to bring them back.
import React from 'react'
import { ChevronDown, Workflow } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'

export interface WorktreeLineageChildChipProps {
  childCount: number
  collapsed: boolean
  onToggle?: (event: React.MouseEvent<HTMLButtonElement>) => void
  /** The card's flush/new-style surface changes the chip's gutter. */
  newCardStyle?: boolean
  className?: string
}

export function WorktreeLineageChildChip({
  childCount,
  collapsed,
  onToggle,
  newCardStyle = false,
  className
}: WorktreeLineageChildChipProps): React.JSX.Element | null {
  if (childCount <= 0 || !onToggle) return null

  const shortLabel = `${childCount} ${
    childCount === 1
      ? translate('components.sidebar.worktree-lineage-child-chip.child', 'child')
      : translate('components.sidebar.worktree-lineage-child-chip.children', 'children')
  }`
  const ariaLabel =
    childCount === 1
      ? collapsed
        ? translate(
            'components.sidebar.worktree-lineage-child-chip.show-one',
            'Show {{count}} child workspace',
            { count: childCount }
          )
        : translate(
            'components.sidebar.worktree-lineage-child-chip.hide-one',
            'Hide {{count}} child workspace',
            { count: childCount }
          )
      : collapsed
        ? translate(
            'components.sidebar.worktree-lineage-child-chip.show-many',
            'Show {{count}} child workspaces',
            { count: childCount }
          )
        : translate(
            'components.sidebar.worktree-lineage-child-chip.hide-many',
            'Hide {{count}} child workspaces',
            { count: childCount }
          )

  const tooltip = collapsed
    ? translate(
        'components.sidebar.worktree-lineage-child-chip.show-tooltip',
        'Show child workspaces'
      )
    : translate(
        'components.sidebar.worktree-lineage-child-chip.hide-tooltip',
        'Hide child workspaces'
      )

  return (
    <div
      className={cn(
        'relative mt-1 flex min-w-0 justify-start',
        !newCardStyle && '-ml-1',
        className
      )}
      style={{
        color: 'color-mix(in srgb, var(--muted-foreground) 42%, var(--worktree-sidebar))'
      }}
      data-worktree-lineage-child-chip=""
    >
      <Button
        type="button"
        variant="ghost"
        size="xs"
        className="relative z-10 h-[18px] max-w-[8rem] gap-1 rounded-md border border-worktree-sidebar-border bg-worktree-sidebar px-1.5 text-[10px] font-medium leading-none text-muted-foreground shadow-none hover:bg-worktree-sidebar-accent hover:text-foreground focus-visible:ring-1 focus-visible:ring-worktree-sidebar-ring"
        aria-label={ariaLabel}
        aria-expanded={!collapsed}
        title={tooltip}
        onClick={onToggle}
      >
        <Workflow className="size-2.5" />
        <span className="truncate">{shortLabel}</span>
        <ChevronDown
          className={cn('size-2.5 transition-transform', collapsed && '-rotate-90')}
        />
      </Button>
    </div>
  )
}
