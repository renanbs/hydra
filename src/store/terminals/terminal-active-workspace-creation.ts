import { FLOATING_TERMINAL_WORKTREE_ID } from '../../shared/constants'
import { parseWorkspaceKey } from '../../shared/workspace-scope'
import { focusTerminalTabSurface } from '@/lib/focus-terminal-tab-surface'
import { getRuntimeEnvironmentIdForWorktree } from '@/lib/worktree-runtime-owner'
import { resolveWorktreeOperationRouteResult } from '@/lib/worktree-operation-route'
import { isWebClientLocation } from '@/lib/web-client-location'
import type { TerminalSlice, TerminalStoreGet, TerminalStoreSet } from './terminal-state'

export function createActiveWorkspaceTerminalActions(
  _set: TerminalStoreSet,
  get: TerminalStoreGet
): Pick<TerminalSlice, 'openNewTerminalTabInActiveWorkspace'> {
  return {
    openNewTerminalTabInActiveWorkspace: async (groupId: any) => {
      const state = get()
      const worktreeId = state.activeWorktreeId
      if (!worktreeId) {
        return
      }
      const workspaceScope = parseWorkspaceKey(worktreeId)
      const worktreeRoute =
        worktreeId === FLOATING_TERMINAL_WORKTREE_ID || workspaceScope?.type === 'folder'
          ? null
          : resolveWorktreeOperationRouteResult(state, worktreeId)
      if (worktreeRoute && worktreeRoute.kind !== 'resolved') {
        return
      }
      const runtimeEnvironmentId = worktreeRoute
        ? worktreeRoute.route.runtimeEnvironmentId
        : getRuntimeEnvironmentIdForWorktree(state, worktreeId)
      if (runtimeEnvironmentId) {
        const { createWebRuntimeSessionTerminal } = await import('@/runtime/web-runtime-session')
        await createWebRuntimeSessionTerminal({
          worktreeId,
          environmentId: runtimeEnvironmentId,
          targetGroupId: groupId,
          activate: true
        })
        return
      }
      if (isWebClientLocation() && worktreeId !== FLOATING_TERMINAL_WORKTREE_ID) {
        return
      }
      const terminal = get().createTab(worktreeId, groupId)
      get().setActiveTab(terminal.id)
      get().setActiveTabType('terminal')
      const latest = get()
      const currentTerminals = latest.tabsByWorktree[worktreeId] ?? []
      const currentEditors = latest.openFiles.filter((file: any) => file.worktreeId === worktreeId)
      const currentBrowsers = latest.browserTabsByWorktree[worktreeId] ?? []
      const stored = latest.tabBarOrderByWorktree[worktreeId]
      const validIds = new Set([
        ...currentTerminals.map((tab: any) => tab.id),
        ...currentEditors.map((file: any) => file.id),
        ...currentBrowsers.map((tab: any) => tab.id)
      ])
      const base = (stored ?? []).filter((id: any) => validIds.has(id))
      const inBase = new Set(base)
      for (const id of validIds) {
        if (!inBase.has(id)) {
          base.push(id)
        }
      }
      // Why: Cmd+J shares the titlebar-button creation path, so append the new terminal after mixed editor/browser tabs, not first.
      get().setTabBarOrder(worktreeId, [...base.filter((id: any) => id !== terminal.id), terminal.id])
      focusTerminalTabSurface(terminal.id)
    }
  }
}
