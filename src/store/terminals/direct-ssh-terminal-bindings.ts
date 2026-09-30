import {
  clearDirectSshTerminalBindings,
  invalidateStaleDirectSshTerminalBindings
} from '../slices/direct-ssh-terminal-recovery'
import {
  retryDirectSshTerminalPanes,
  retrySettledDirectSshTerminalPane
} from '../slices/direct-ssh-pane-retry-ledger'
import {
  directSshAuthoritiesEqual,
  settleDirectSshPaneRetryState
} from '../slices/direct-ssh-terminal-authority-ledger'
import type { TerminalSlice, TerminalStoreGet, TerminalStoreSet } from './terminal-state'
import {
  isCurrentDirectSshAuthority,
  resolveDirectSshTerminalKeys
} from './terminal-pty-identities'

export function createDirectSshTerminalBindingActions(
  set: TerminalStoreSet,
  _get: TerminalStoreGet
): Pick<
  TerminalSlice,
  | 'clearDirectSshTargetPtyBindings'
  | 'invalidateStaleDirectSshTargetPtyBindings'
  | 'retryDirectSshTargetPanes'
  | 'settleDirectSshPaneRetry'
> {
  return {
    clearDirectSshTargetPtyBindings: (targetId: any) => {
      let clearedCount = 0
      set((s: any) => {
        const result = clearDirectSshTerminalBindings(s, resolveDirectSshTerminalKeys(s, targetId))
        clearedCount = result.clearedCount
        return result.patch ?? s
      })
      return clearedCount
    },
    invalidateStaleDirectSshTargetPtyBindings: (authority: any) => {
      let clearedCount = 0
      set((s: any) => {
        if (!isCurrentDirectSshAuthority(s, authority)) {
          return s
        }
        const result = invalidateStaleDirectSshTerminalBindings(
          s,
          resolveDirectSshTerminalKeys(s, authority.targetId),
          authority
        )
        clearedCount = result.clearedCount
        return result.patch ?? s
      })
      return clearedCount
    },
    retryDirectSshTargetPanes: (authority: any, now = Date.now()) => {
      let retriedCount = 0
      set((s: any) => {
        if (!isCurrentDirectSshAuthority(s, authority)) {
          return s
        }
        const result = retryDirectSshTerminalPanes(
          s,
          resolveDirectSshTerminalKeys(s, authority.targetId),
          authority,
          now
        )
        retriedCount = result.retriedCount
        return result.patch ?? s
      })
      return retriedCount
    },
    settleDirectSshPaneRetry: (result: any, now = Date.now()) => {
      set((s: any) => {
        if (!isCurrentDirectSshAuthority(s, result.authority)) {
          return s
        }
        const history = s.directSshPaneRetryHistoryByTabId[result.tabId]
        const preservesExhaustedSplitAttempt =
          (result.status === 'failed' || result.status === 'timed-out') &&
          history != null &&
          directSshAuthoritiesEqual(history.authority, result.authority) &&
          history.attemptedAt.length >= 2
        if (preservesExhaustedSplitAttempt) {
          return s
        }
        const settlement = settleDirectSshPaneRetryState(s, result)
        if (!settlement) {
          return s
        }
        const settledState = { ...s, ...settlement }
        if (result.status !== 'failed' && result.status !== 'timed-out') {
          return settledState
        }
        const retry = retrySettledDirectSshTerminalPane(
          settledState,
          resolveDirectSshTerminalKeys(settledState, result.authority.targetId),
          result.authority,
          result.tabId,
          now
        )
        return retry.patch ? { ...settledState, ...retry.patch } : settledState
      })
    }
  }
}
