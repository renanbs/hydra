// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/worktree-context-menu-policy.ts
// Sidebar context-menu policy: stable empty sentinels for menu-scoped reads,
// native-menu opt-out, nested-scope isolation, parent-picker gating/anchor and
// the delete-position restoration loop.
import type { WorktreeDeleteState } from '../../store/slices/worktree-delete-state-types'

export const CLOSE_ALL_CONTEXT_MENUS_EVENT = 'hydra:close-all-context-menus'
export const WORKTREE_CONTEXT_MENU_SCOPE_ATTR = 'data-worktree-context-menu-scope'
export const WORKTREE_NATIVE_CONTEXT_MENU_ATTR = 'data-worktree-native-context-menu'
const DELETE_POSITION_RESTORE_MAX_FRAMES = 180
const DELETE_POSITION_RESTORE_STABLE_FRAMES = 6
// Why: the picker is unmounted on close; hold the subtree for its exit animation.
export const PARENT_PICKER_EXIT_ANIMATION_MS = 200

// Why: stable empty sentinels let a closed menu wrapper subscribe to a
// referentially stable value instead of the high-churn maps delete teardown
// replaces. Module-level (one allocation, never recreated per render) so the
// reference is constant and Zustand's Object.is equality short-circuits.
export const EMPTY_TABS_BY_WORKTREE: Readonly<Record<string, readonly { id: string }[]>> = {}
export const EMPTY_PTY_IDS_BY_TAB_ID: Readonly<Record<string, readonly string[]>> = {}
export const EMPTY_BROWSER_TABS_BY_WORKTREE: Readonly<Record<string, readonly { id: string }[]>> = {}
export const EMPTY_DELETE_STATE_BY_WORKTREE_ID: Readonly<
  Record<string, WorktreeDeleteState | undefined>
> = {}
export const EMPTY_WORKTREE_LINEAGE_BY_ID: Readonly<Record<string, unknown>> = {}
export const EMPTY_WORKSPACE_LINEAGE_BY_CHILD_KEY: Readonly<Record<string, unknown>> = {}
export const EMPTY_CYCLIC_LINEAGE_IDS: ReadonlySet<string> = new Set()

/**
 * Orca `selectMenuScopedMap`: while the menu is closed the selector MUST return
 * the same `empty` reference every render so the subscription stays inert to
 * teardown churn; while open it returns the live map.
 */
export function selectMenuScopedMap<T>(menuOpen: boolean, live: T, empty: T): T {
  return menuOpen ? live : empty
}

/**
 * The Developer submenu is hidden by default and revealed only by holding
 * Option/Alt at right-click. `altKey` is the same physical key on every platform,
 * so no platform branch is needed; a multi-context menu never reveals it.
 */
export function shouldRevealWorktreeDeveloperMenu(args: {
  developerMenuRevealed: boolean
  isMultiContext: boolean
}): boolean {
  return args.developerMenuRevealed && !args.isMultiContext
}

function closestFromTarget(
  target: EventTarget | null,
  selector: string
): Element | null {
  const maybeElement = target as {
    closest?: (query: string) => Element | null
    parentElement?: { closest?: (query: string) => Element | null }
  } | null
  return (
    maybeElement?.closest?.(selector) ??
    maybeElement?.parentElement?.closest?.(selector) ??
    null
  )
}

/** Terminal/editor surfaces opt out of the sidebar menu with a data attribute. */
export function shouldUseNativeContextMenu(target: EventTarget | null): boolean {
  return closestFromTarget(target, `[${WORKTREE_NATIVE_CONTEXT_MENU_ATTR}]`) != null
}

/**
 * Why: lineage child previews live inside the parent card DOM but own their
 * context menu target. The parent must ignore only those nested scopes.
 */
export function shouldIgnoreNestedWorktreeContextMenuScope(
  currentTarget: EventTarget,
  target: EventTarget | null
): boolean {
  const closestScope = closestFromTarget(target, `[${WORKTREE_CONTEXT_MENU_SCOPE_ATTR}]`)
  return closestScope != null && closestScope !== currentTarget
}

export function getWorktreeParentPickerLabel(validParentWorktreeId: string | null): string {
  return validParentWorktreeId ? 'Change Parent Worktree...' : 'Set Parent Worktree...'
}

export function isWorktreeParentPickerDisabled(args: {
  isDeleting: boolean
  eligibleParentCount: number
}): boolean {
  return args.isDeleting || args.eligibleParentCount === 0
}

/** The popover anchors to the row being dragged, else the card scope element. */
export function getWorktreeParentPickerAnchor(
  scope: HTMLElement | null,
  worktreeId: string
): HTMLElement | null {
  const dragRow = scope?.closest<HTMLElement>('[data-worktree-drag-id]')
  if (dragRow?.dataset.worktreeDragId === worktreeId) {
    return dragRow
  }
  return scope
}

export function shouldRemoveProjectFromContextMenu(
  repo: { id: string } | null | undefined,
  worktree: { isMainWorktree: boolean }
): boolean {
  return repo != null && worktree.isMainWorktree
}

/**
 * Orca `isContextWorktreeDeletable`: a secondary workspace is only deletable while
 * its owning repo resolves. Without the repo there is no `repoPath` to hand the
 * backend, so the item must be disabled instead of silently no-op'ing.
 */
export function isContextWorktreeDeletable(
  worktree: { isMainWorktree: boolean },
  repo: { id: string } | null | undefined
): boolean {
  return repo != null && !worktree.isMainWorktree
}

function findSidebarVirtualRowByKey(sidebar: Element, rowKey: string): HTMLElement | null {
  return (
    Array.from(sidebar.querySelectorAll<HTMLElement>('[data-worktree-virtual-row]')).find(
      (element) => element.getAttribute('data-worktree-virtual-row-key') === rowKey
    ) ?? null
  )
}

export function shouldContinueDeleteSiblingPositionRestore(args: {
  attempts: number
  stableFrames: number
}): boolean {
  // Why: slow deletes leave the target row mounted; after initial focus/remount
  // settling, the restore loop must stop so user scrolling wins.
  return (
    args.attempts < DELETE_POSITION_RESTORE_MAX_FRAMES &&
    args.stableFrames < DELETE_POSITION_RESTORE_STABLE_FRAMES
  )
}

/**
 * Keeps the row that was under the pointer at the same viewport position after
 * the deleted sibling disappears, retrying across the virtualizer's remounts.
 */
export function preserveDeleteSiblingPosition(scope: HTMLElement | null): () => void {
  const sidebar = scope?.closest('[data-worktree-sidebar]')
  const row = scope?.closest('[data-worktree-virtual-row]')
  if (!(sidebar instanceof HTMLElement) || !(row instanceof HTMLElement)) {
    return () => {}
  }
  const rows = Array.from(sidebar.querySelectorAll<HTMLElement>('[data-worktree-virtual-row]'))
    .map((element) => ({ element, top: element.getBoundingClientRect().top }))
    .sort((a, b) => a.top - b.top)
    .map(({ element }) => element)
  const rowIndex = rows.indexOf(row)
  const anchorRow = rows[rowIndex + 1] ?? rows[rowIndex - 1] ?? null
  const anchorKey = anchorRow?.getAttribute('data-worktree-virtual-row-key')
  const rowKey = row.getAttribute('data-worktree-virtual-row-key')
  if (!anchorKey || !rowKey) {
    return () => {}
  }
  const previousScrollTop = sidebar.scrollTop
  const previousScrollHeight = sidebar.scrollHeight
  const desiredTop = row.getBoundingClientRect().top

  return () => {
    let attempts = 0
    let stableFrames = 0
    const restore = (): void => {
      const currentSidebar = document.querySelector('[data-worktree-sidebar]')
      if (!(currentSidebar instanceof HTMLElement)) {
        return
      }
      const currentTarget = findSidebarVirtualRowByKey(currentSidebar, rowKey)
      const currentAnchor = currentTarget ?? findSidebarVirtualRowByKey(currentSidebar, anchorKey)
      if (currentAnchor) {
        const delta = currentAnchor.getBoundingClientRect().top - desiredTop
        if (Math.abs(delta) > 1) {
          currentSidebar.scrollTop += delta
          stableFrames = 0
        } else {
          stableFrames += 1
        }
      } else {
        currentSidebar.scrollTop = Math.max(
          0,
          previousScrollTop + currentSidebar.scrollHeight - previousScrollHeight
        )
        stableFrames = 0
      }
      attempts += 1
      if (shouldContinueDeleteSiblingPositionRestore({ attempts, stableFrames })) {
        window.requestAnimationFrame(restore)
      }
    }
    restore()
  }
}

/**
 * Orca `handleCloseAutoFocus`: Radix would focus the trigger (scrolling it back
 * into view); the sidebar itself is the correct landing spot after a menu closes.
 * Returns the focusable sidebar element when the DOM provides one.
 */
export function getWorktreeSidebarFocusTarget(
  root: Document | null = typeof document === 'undefined' ? null : document
): HTMLElement | null {
  const element = root?.querySelector<HTMLElement>('[data-worktree-sidebar]') ?? null
  return element ?? null
}

export function restoreWorktreeSidebarFocus(
  root: Document | null = typeof document === 'undefined' ? null : document
): boolean {
  const target = getWorktreeSidebarFocusTarget(root)
  if (!target) return false
  target.focus({ preventScroll: true })
  return true
}
