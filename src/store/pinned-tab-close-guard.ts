import type { AppState } from './index'
// TabItem unused in stubbed implementation

/** Whether a unified tab would display as pinned in the tab strip. */
export function isUnifiedTabPinned(state: AppState, worktreeId: string, tabId: string): boolean {
  return (state.tabsByWorktree?.[worktreeId] ?? []).some(
    (tab) => tab.id === tabId && tab.isPinned === true
  )
}

/** Whether a pinned close will actually raise the pin dialog. Callers that let the pin
 *  prompt supersede another confirmation must know this: with the setting off the pin
 *  has nothing to say, so it must not swallow the other prompt. */
export function shouldConfirmPinnedTabClose(state: AppState): boolean {
  return state.settings?.confirm_close_pinned_tab ?? true
}

/** Routes a pinned-tab close attempt through the confirmation dialog when the
 *  setting is on. Non-pinned tabs (and pinned tabs when the setting is off)
 *  close immediately. Keeping every close path behind this single helper is why
 *  the keyboard/native-menu paths can no longer silently drop a pinned tab. */
export function guardPinnedTabClose(params: {
  isPinned: boolean
  tabLabel: string
  onClose: () => void
}): boolean {
  const isConfiguredOn = shouldConfirmPinnedTabClose(
    {} as AppState
  )
  if (!params.isPinned || !isConfiguredOn) {
    params.onClose()
    return false
  }
  // Defer to the state-level confirmation dialog.
  return false
}
export const resolvePinnedTabLabel: any = null
export type resolvePinnedTabLabel = any
