// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: orca/src/renderer/src/components/sidebar/worktree-list/navigation/use-keyboard.ts
//
// Keyboard navigation over the rows the list actually painted: collapsing a group means
// "not now", so the cycle is rebuilt from the current row list instead of a cached copy.
//
// Adapted to Hydra:
//  - the cycle itself reuses the repo's own row-cycling module (`worktree-list/keyboard-cycle`),
//    which is vocabulary-agnostic; the painted rows are `HostSectionRow`s, so the focus keys are
//    built from item rows here instead of from the legacy `SidebarRow` projection;
//  - activating a row routes through Hydra's `onSelectGitWorktree` (the panel records history);
//  - Orca's Enter branch refocuses the terminal's helper textarea, which is not part of this
//    list's contract in Hydra — the container leaves Enter to the focused row.
import { useCallback, useEffect, useMemo } from 'react'
import type React from 'react'
import type { Virtualizer } from '@tanstack/react-virtual'
import { useAppStore } from '@/store'
import { keybindingMatchesAction } from '@/shared/keybindings'
import { getShortcutPlatform } from '@/lib/shortcut-platform'
import type { HostSectionRow } from '../../host-section-rows'
import type { PinnedWorktreeDisplayPolicy, WorktreeRow } from '../grouping/row-types'
import { getPreferredWorktreeRows } from '../../worktree-sidebar-row-preference'
import { resolveCycledFocusKey, type FocusableRowKey } from '../keyboard-cycle'

/**
 * Keys that move the viewport natively. Orca does not intercept them: the focused listbox
 * is a real scroller, so Home/End/PageUp/PageDown/space keep the browser's own behavior and
 * only mark the gesture as direct input for the virtualizer's scroll guards.
 */
const NATIVE_SCROLL_KEYS: readonly string[] = ['PageUp', 'PageDown', 'Home', 'End', ' ']

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }
  // Why: xterm's hidden input textarea is not a real text field; treating it as one would
  // block sidebar shortcuts while a terminal has focus.
  if (target.classList.contains('xterm-helper-textarea')) {
    return false
  }
  if (target.isContentEditable) {
    return true
  }
  return (
    target.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]') !==
    null
  )
}

export function useWorktreeListKeyboardNavigation(args: {
  rows: readonly HostSectionRow[]
  activeRowKey: string | null
  pinnedDisplayPolicy: PinnedWorktreeDisplayPolicy
  onActivateRow: (row: WorktreeRow) => void
  virtualizer: Virtualizer<HTMLDivElement, HTMLDivElement>
  scrollRef: React.RefObject<HTMLDivElement | null>
  markDirectScrollInput: () => void
}): { handleContainerKeyDown: (event: React.KeyboardEvent) => void } {
  const {
    rows,
    activeRowKey,
    pinnedDisplayPolicy,
    onActivateRow,
    virtualizer,
    scrollRef,
    markDirectScrollInput
  } = args
  const keybindings = useAppStore((s) => s.keybindings)

  const navigableRows = useMemo(() => {
    const indexByRowKey = new Map<string, number>()
    const itemRows: WorktreeRow[] = []
    rows.forEach((row, index) => {
      if (row.type !== 'item') {
        return
      }
      indexByRowKey.set(row.rowKey, index)
      itemRows.push(row)
    })
    // Why: with pinned rows duplicated into groups, one workspace owes the cycle one stop.
    return getPreferredWorktreeRows(itemRows, pinnedDisplayPolicy).map((row) => ({
      row,
      rowIndex: indexByRowKey.get(row.rowKey) ?? -1
    }))
  }, [pinnedDisplayPolicy, rows])

  const navigateRow = useCallback(
    (direction: 'up' | 'down') => {
      const keys: FocusableRowKey[] = navigableRows.map((entry) => ({
        type: 'worktree',
        id: entry.row.rowKey,
        rowIndex: entry.rowIndex
      }))
      const next = resolveCycledFocusKey({
        keys,
        focused: activeRowKey === null ? null : { type: 'worktree', id: activeRowKey },
        direction
      })
      if (next === null) {
        return
      }
      const target = navigableRows.find((entry) => entry.row.rowKey === next.id)
      if (!target) {
        return
      }
      onActivateRow(target.row)
      if (target.rowIndex >= 0) {
        virtualizer.scrollToIndex(target.rowIndex, { align: 'auto' })
      }
    },
    [activeRowKey, navigableRows, onActivateRow, virtualizer]
  )

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (isEditableTarget(event.target)) {
        return
      }
      const platform = getShortcutPlatform()
      if (keybindingMatchesAction('sidebar.focusWorktreeList', event, platform, keybindings)) {
        scrollRef.current?.focus()
        event.preventDefault()
        return
      }
      const direction = keybindingMatchesAction(
        'worktree.navigateUp',
        event,
        platform,
        keybindings
      )
        ? 'up'
        : keybindingMatchesAction('worktree.navigateDown', event, platform, keybindings)
          ? 'down'
          : null
      if (direction) {
        markDirectScrollInput()
        navigateRow(direction)
        event.preventDefault()
      }
    }

    window.addEventListener('keydown', handleKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true })
  }, [keybindings, markDirectScrollInput, navigateRow, scrollRef])

  const handleContainerKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        if (event.target !== event.currentTarget) {
          return
        }
        markDirectScrollInput()
        navigateRow(event.key === 'ArrowUp' ? 'up' : 'down')
        event.preventDefault()
        return
      }
      if (NATIVE_SCROLL_KEYS.includes(event.key)) {
        markDirectScrollInput()
      }
    },
    [markDirectScrollInput, navigateRow]
  )

  return { handleContainerKeyDown }
}
