// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/WorktreeParentPickerPopover.tsx (keyboard, focus and select halves)
import type React from 'react'
import { toast } from 'sonner'
import { translate } from '../../i18n/i18n'
import { isImeCompositionKeyDown } from '../../lib/ime-composition-keyboard-event'
import { clampWorktreeParentPickerIndex } from './worktree-parent-picker-filtering'

const FOCUSABLE_ANCHOR_SELECTOR =
  'a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])'

/**
 * The element focus returns to when the picker closes.
 *
 * Why walk up: the picker is opened from a row/menu item that is not itself focusable once the
 * menu unmounts, so closing focus lands on the nearest focusable container instead of
 * `document.body`.
 */
export function getWorktreeParentPickerFocusRestoreTarget(
  anchorElement: HTMLElement | null
): HTMLElement | null {
  if (!anchorElement?.isConnected) {
    return null
  }
  return anchorElement.closest<HTMLElement>(FOCUSABLE_ANCHOR_SELECTOR)
}

export function selectWorktreeParent(args: {
  /** Null while the picker has no resolved child (nothing to write). */
  childPath: string | null
  parentPath: string
  assignWorktreeParent: (childPath: string, parentPath: string) => Promise<void>
  close: () => void
  showError?: (message: string) => void
}): void {
  const { childPath, parentPath } = args
  if (!childPath) {
    return
  }
  // Why close first: the picker is direct manipulation — the write is optimistic in the app's
  // state, and a rejection is reported as a toast rather than leaving the surface open on a
  // selection it has already applied.
  args.close()
  const fail = args.showError ?? toast.error
  void args.assignWorktreeParent(childPath, parentPath).catch((error: unknown) => {
    console.error('Failed to set parent worktree:', error)
    fail(
      translate(
        'auto.components.sidebar.WorktreeParentPickerPopover.failedSetParent',
        'Failed to set parent worktree'
      )
    )
  })
}

export function handleWorktreeParentPickerKeyDown(args: {
  event: React.KeyboardEvent<HTMLInputElement>
  candidates: readonly { id: string }[]
  activeIndex: number
  moveHighlight: (index: number) => void
  selectParent: (candidateId: string) => void
}): void {
  const { event, candidates, activeIndex, moveHighlight, selectParent } = args
  // The IME owns the Enter that confirms a composition; navigating on it would move the
  // highlight out from under the conversion the user is still reading.
  if (isImeCompositionKeyDown(event) || candidates.length === 0) {
    return
  }
  const navigate = (nextIndex: number): void => {
    event.preventDefault()
    event.stopPropagation()
    moveHighlight(clampWorktreeParentPickerIndex(nextIndex, candidates.length))
  }
  if (event.key === 'ArrowDown') {
    navigate(activeIndex + 1)
  } else if (event.key === 'ArrowUp') {
    navigate(activeIndex - 1)
  } else if (event.key === 'Home') {
    navigate(0)
  } else if (event.key === 'End') {
    navigate(candidates.length - 1)
  } else if (event.key === 'Enter') {
    const candidate = candidates[activeIndex]
    if (candidate) {
      event.preventDefault()
      event.stopPropagation()
      selectParent(candidate.id)
    }
  }
}

/** How long the popover ignores outside interactions after it opens. */
export const WORKTREE_PARENT_PICKER_OUTSIDE_CLOSE_SUPPRESS_MS = 150

export type WorktreeParentPickerOutsideCloseGuard = {
  /** Timestamp until which outside interactions are ignored; null when disarmed. */
  suppressedUntil: number | null
}

export function armWorktreeParentPickerOutsideClose(
  now: number
): WorktreeParentPickerOutsideCloseGuard {
  return { suppressedUntil: now + WORKTREE_PARENT_PICKER_OUTSIDE_CLOSE_SUPPRESS_MS }
}

export const DISARMED_WORKTREE_PARENT_PICKER_OUTSIDE_CLOSE: WorktreeParentPickerOutsideCloseGuard =
  { suppressedUntil: null }

/**
 * Why: the click that opened the picker can reach the newly mounted surface as an outside
 * interaction before the picker settles, closing it on the same gesture that opened it.
 */
export function shouldSuppressWorktreeParentPickerOutsideClose(
  guard: WorktreeParentPickerOutsideCloseGuard,
  now: number
): boolean {
  return guard.suppressedUntil !== null && now < guard.suppressedUntil
}
