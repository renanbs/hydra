// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/WorktreeParentPickerPopover.tsx
//
// Hydra opens the picker from a row/menu click, so the anchor is a measured viewport rect (a
// virtual anchor) rather than a mounted trigger element: a `position: fixed` node inside the
// sidebar's transformed virtual-row container would be laid out against that container, not the
// viewport, and land a row-offset too low.
import React, {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Search, Unlink } from 'lucide-react'
import { Popover, PopoverAnchor, PopoverContent } from '../ui/popover'
import { translate } from '../../i18n/i18n'
import {
  WorktreeParentPickerRow,
  type WorktreeParentPickerRowData
} from './WorktreeParentPickerRow'
import {
  DISARMED_WORKTREE_PARENT_PICKER_OUTSIDE_CLOSE,
  WORKTREE_PARENT_PICKER_OUTSIDE_CLOSE_SUPPRESS_MS,
  armWorktreeParentPickerOutsideClose,
  getWorktreeParentPickerFocusRestoreTarget,
  handleWorktreeParentPickerKeyDown,
  shouldSuppressWorktreeParentPickerOutsideClose,
  type WorktreeParentPickerOutsideCloseGuard
} from './worktree-parent-picker-actions'
import {
  clampWorktreeParentPickerIndex,
  filterWorktreeParentCandidates
} from './worktree-parent-picker-filtering'
import {
  PICKER_LIST_MAX_HEIGHT,
  PICKER_ROW_HEIGHT,
  PICKER_ROW_OVERSCAN,
  PICKER_VIEWPORT_PADDING,
  resolveWorktreeParentPickerAnchorRect,
  resolveWorktreeParentPickerVirtualRows,
  type WorktreeParentPickerAnchorRect
} from './worktree-parent-picker-placement'
import type { WorktreeParentPickerCandidate } from './worktree-parent-eligibility'

export type WorktreeParentPickerPopoverProps = {
  open: boolean
  /** The workspace whose parent is being chosen; null while nothing is resolved. */
  child: WorktreeParentPickerCandidate | null
  /** Already-eligible candidates (see `getEligibleWorktreeParents`). */
  candidates: readonly WorktreeParentPickerCandidate[]
  /** Re-measured on open, resize and scroll: the rect the picker hangs off. */
  getAnchorRect: () => WorktreeParentPickerAnchorRect | null
  onOpenChange: (open: boolean) => void
  onSelect: (candidate: WorktreeParentPickerCandidate) => void
  /** Clears the current parent link; rendered only when `child` has a parent. */
  onRemoveParent?: () => void
  /** Where focus returns on close (the row/menu the picker opened from). */
  focusRestoreElement?: HTMLElement | null
}

function rowData(candidate: WorktreeParentPickerCandidate): WorktreeParentPickerRowData {
  return {
    displayName: candidate.displayName,
    branch: candidate.branch,
    repoLabel: candidate.repoLabel,
    repoBadgeColor: candidate.repoBadgeColor,
    connectionId: candidate.connectionId,
    status: candidate.status,
    isActive: candidate.isActive
  }
}

export function WorktreeParentPickerPopover({
  open,
  child,
  candidates,
  getAnchorRect,
  onOpenChange,
  onSelect,
  onRemoveParent,
  focusRestoreElement
}: WorktreeParentPickerPopoverProps): React.JSX.Element | null {
  const [search, setSearch] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [anchorRect, setAnchorRect] = useState<WorktreeParentPickerAnchorRect | null>(null)
  const [viewportHeight, setViewportHeight] = useState(
    () => (typeof window === 'undefined' ? 0 : window.innerHeight)
  )
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const outsideCloseGuardRef = useRef<WorktreeParentPickerOutsideCloseGuard>(
    DISARMED_WORKTREE_PARENT_PICKER_OUTSIDE_CLOSE
  )
  const optionIdPrefix = `${useId()}option`
  const listboxId = `${useId()}listbox`
  // The anchor provider changes identity per render (it closes over the row); keep it in a ref
  // so the resize/scroll listeners below do not re-subscribe on every keystroke.
  const getAnchorRectRef = useRef(getAnchorRect)
  getAnchorRectRef.current = getAnchorRect

  useLayoutEffect(() => {
    if (!open) {
      return
    }
    const updateAnchor = (): void => {
      setAnchorRect(getAnchorRectRef.current())
      setViewportHeight(window.innerHeight)
    }
    updateAnchor()
    // Why window + capture: the sidebar scrolls inside its own container, and the row the
    // picker hangs off moves with it — a non-capturing listener would miss both.
    window.addEventListener('resize', updateAnchor)
    window.addEventListener('scroll', updateAnchor, true)
    return () => {
      window.removeEventListener('resize', updateAnchor)
      window.removeEventListener('scroll', updateAnchor, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      setSearch('')
      setHighlightedIndex(0)
      outsideCloseGuardRef.current = DISARMED_WORKTREE_PARENT_PICKER_OUTSIDE_CLOSE
      return
    }
    outsideCloseGuardRef.current = armWorktreeParentPickerOutsideClose(
      window.performance.now()
    )
    const timerId = window.setTimeout(() => {
      outsideCloseGuardRef.current = DISARMED_WORKTREE_PARENT_PICKER_OUTSIDE_CLOSE
    }, WORKTREE_PARENT_PICKER_OUTSIDE_CLOSE_SUPPRESS_MS)
    return () => window.clearTimeout(timerId)
  }, [open])

  const filtered = useMemo(
    () => filterWorktreeParentCandidates(candidates, search),
    [candidates, search]
  )
  const activeIndex = clampWorktreeParentPickerIndex(highlightedIndex, filtered.length)

  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => PICKER_ROW_HEIGHT,
    overscan: PICKER_ROW_OVERSCAN,
    getItemKey: (index) => filtered[index]?.id ?? index,
    // Why: the list mounts inside a popover that measures on the next frame; seed the virtual
    // window with the list cap so the first paint is not blank.
    initialRect: { width: 0, height: PICKER_LIST_MAX_HEIGHT }
  })
  const virtualRows = resolveWorktreeParentPickerVirtualRows({
    virtualRows: virtualizer.getVirtualItems(),
    candidateCount: filtered.length
  })

  // Why the full candidate count, not the filtered one: the estimate only decides where the
  // surface hangs, and a search must not make the popover jump between keystrokes.
  const virtualAnchorRef = useMemo(() => {
    const rect = resolveWorktreeParentPickerAnchorRect({
      anchorRect,
      candidateCount: candidates.length,
      viewportHeight
    })
    if (!rect) {
      return undefined
    }
    const domRect = new DOMRect(rect.left, rect.top, rect.width, rect.height)
    return { current: { getBoundingClientRect: () => domRect } }
  }, [anchorRect, candidates.length, viewportHeight])

  const handleSearchChange = useCallback(
    (nextSearch: string) => {
      // Why: re-ranking invalidates the previous highlight, and the list must restart at the
      // new best match instead of staying scrolled to wherever the old row was.
      setSearch(nextSearch)
      setHighlightedIndex(0)
      virtualizer.scrollToOffset(0)
    },
    [virtualizer]
  )

  const moveHighlight = useCallback(
    (nextIndex: number) => {
      setHighlightedIndex(nextIndex)
      virtualizer.scrollToIndex(nextIndex, { align: 'auto' })
    },
    [virtualizer]
  )

  const handleSelect = useCallback(
    (candidate: WorktreeParentPickerCandidate) => {
      onSelect(candidate)
      onOpenChange(false)
    },
    [onOpenChange, onSelect]
  )

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      handleWorktreeParentPickerKeyDown({
        event,
        candidates: filtered,
        activeIndex,
        moveHighlight,
        selectParent: (candidateId) => {
          const candidate = filtered.find((entry) => entry.id === candidateId)
          if (candidate) {
            handleSelect(candidate)
          }
        }
      })
    },
    [activeIndex, filtered, handleSelect, moveHighlight]
  )

  // Why declarative: the picker owns the listbox ids, so the input can name the highlighted row
  // in the same commit it renders — no post-commit attribute write to race the portal mount.
  const activeOptionId = filtered.length > 0 ? `${optionIdPrefix}-${activeIndex}` : undefined

  if (!child || !virtualAnchorRef) {
    return null
  }

  return (
    // Modal so focus is trapped (the sidebar's terminal must not steal it), non-modal surfaces
    // lose the search input to the terminal behind them.
    <Popover modal open={open} onOpenChange={onOpenChange}>
      <PopoverAnchor virtualRef={virtualAnchorRef} />
      <PopoverContent
        align="start"
        side="right"
        sideOffset={8}
        collisionPadding={PICKER_VIEWPORT_PADDING}
        className="flex max-h-(--radix-popover-content-available-height) w-80 flex-col overflow-hidden border-[#2a2b30] bg-[#141518] p-0 text-xs text-neutral-200"
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          inputRef.current?.focus()
        }}
        // Why: a virtual anchor has no trigger for Radix to restore focus to, so drive it back
        // to the surface the picker opened from instead of dropping it on `document.body`.
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          const target =
            getWorktreeParentPickerFocusRestoreTarget(focusRestoreElement ?? null) ??
            focusRestoreElement
          target?.focus()
        }}
        onInteractOutside={(event) => {
          if (
            shouldSuppressWorktreeParentPickerOutsideClose(
              outsideCloseGuardRef.current,
              window.performance.now()
            )
          ) {
            event.preventDefault()
          }
        }}
      >
        <div className="flex h-[28px] min-w-0 shrink-0 items-center gap-1.5 border-b border-[#222328] bg-[#17181c] px-3 text-[11px] leading-none text-neutral-500">
          <span className="shrink-0">
            {translate(
              'auto.components.sidebar.WorktreeParentPickerPopover.setParentFor',
              'Set parent for'
            )}
          </span>
          <span className="truncate font-medium text-neutral-200">{child.displayName}</span>
          {onRemoveParent ? (
            <button
              type="button"
              onClick={() => {
                onRemoveParent()
                onOpenChange(false)
              }}
              aria-label={translate(
                'auto.components.sidebar.WorktreeParentPickerPopover.removeParent',
                'Remove parent link'
              )}
              className="ml-auto shrink-0 rounded p-0.5 text-neutral-500 transition hover:bg-[#26272c] hover:text-red-400"
            >
              <Unlink aria-hidden="true" className="size-3" />
            </button>
          ) : null}
        </div>

        <div className="relative shrink-0 border-b border-[#222328] px-2 py-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-[13px] size-3.5 text-neutral-500"
          />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={activeOptionId}
            aria-label={translate(
              'auto.components.sidebar.WorktreeParentPickerPopover.searchLabel',
              'Search workspaces'
            )}
            value={search}
            placeholder={translate(
              'auto.components.sidebar.WorktreeParentPickerPopover.searchPlaceholder',
              'Search workspaces...'
            )}
            onChange={(event) => handleSearchChange(event.target.value)}
            onKeyDown={handleKeyDown}
            className="h-10 w-full rounded-md border border-[#2a2b30] bg-[#0e0f11] pl-8 pr-2.5 text-xs text-neutral-100 placeholder:text-neutral-500 transition focus:border-neutral-500 focus:outline-none"
          />
        </div>

        <div
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label={translate(
            'auto.components.sidebar.WorktreeParentPickerPopover.listLabel',
            'Eligible parent workspaces'
          )}
          className="min-h-0 flex-1 overflow-y-auto max-h-72"
        >
          {filtered.length === 0 ? (
            <div className="py-6 text-center text-xs text-neutral-500">
              {translate(
                'auto.components.sidebar.WorktreeParentPickerPopover.empty',
                'No matching eligible worktrees.'
              )}
            </div>
          ) : (
            <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
              {virtualRows.map((virtualRow) => {
                const candidate = filtered[virtualRow.index]
                if (!candidate) {
                  return null
                }
                const isHighlighted = virtualRow.index === activeIndex
                return (
                  <div
                    key={candidate.id}
                    id={`${optionIdPrefix}-${virtualRow.index}`}
                    role="option"
                    aria-selected={isHighlighted}
                    data-highlighted={isHighlighted || undefined}
                    className={`absolute left-0 top-0 flex h-14 w-full cursor-default select-none items-start gap-2 overflow-hidden px-2 py-2 outline-none ${
                      isHighlighted ? 'bg-[#26272c] text-neutral-100' : 'text-neutral-300'
                    }`}
                    style={{ transform: `translateY(${virtualRow.start}px)` }}
                    onPointerMove={() => setHighlightedIndex(virtualRow.index)}
                    onClick={() => handleSelect(candidate)}
                  >
                    <WorktreeParentPickerRow candidate={rowData(candidate)} />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default WorktreeParentPickerPopover
