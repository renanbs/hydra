// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/worktree-card-status-inputs.ts
import { createWorktreeRecordSelector } from '../../store/worktree-record-selector-cache'
import type { TerminalPaneLayoutNode } from '../../shared/terminal-tab-types'

// Why: these selectors return fresh maps whose top-level values preserve
// underlying per-tab references, so callers must compare them shallowly.

// Why frozen: one instance is shared by every card, so a stray write would leak
// across worktrees instead of failing locally.
export const EMPTY_RUNTIME_PANE_TITLES: Record<string, Record<number, string>> = Object.freeze({})
export const EMPTY_LIVE_PTY_IDS: Record<string, string[]> = Object.freeze({})
export const EMPTY_TERMINAL_LAYOUT_ROOTS: Record<
  string,
  TerminalPaneLayoutNode | null | undefined
> = Object.freeze({})

type WorktreeCardStatusInputState = {
  runtimePaneTitlesByTabId?: Record<string, Record<number, string>>
  ptyIdsByTabId?: Record<string, string[]>
  tabsByWorktree?: Record<string, readonly { id: string }[]>
}

type WorktreeCardLayoutRootInputState = {
  terminalLayoutsByTabId?: Record<string, { root: TerminalPaneLayoutNode | null }>
  tabsByWorktree?: Record<string, readonly { id: string }[]>
}

const EMPTY_TABS_BY_WORKTREE: Record<string, readonly { id: string }[]> = Object.freeze({})

export const selectRuntimePaneTitlesForWorktree = createWorktreeRecordSelector<
  WorktreeCardStatusInputState,
  Record<string, Record<number, string>>
>({
  readSources: (state) => [
    state.tabsByWorktree ?? EMPTY_TABS_BY_WORKTREE,
    state.runtimePaneTitlesByTabId ?? EMPTY_RUNTIME_PANE_TITLES
  ],
  empty: EMPTY_RUNTIME_PANE_TITLES,
  build: (state, worktreeId) => {
    const out: Record<string, Record<number, string>> = {}
    for (const tab of (state.tabsByWorktree ?? EMPTY_TABS_BY_WORKTREE)[worktreeId] ?? []) {
      const paneTitles = (state.runtimePaneTitlesByTabId ?? EMPTY_RUNTIME_PANE_TITLES)[tab.id]
      if (paneTitles) {
        out[tab.id] = paneTitles
      }
    }
    return out
  }
})

export const selectLivePtyIdsForWorktree = createWorktreeRecordSelector<
  WorktreeCardStatusInputState,
  Record<string, string[]>
>({
  readSources: (state) => [
    state.tabsByWorktree ?? EMPTY_TABS_BY_WORKTREE,
    state.ptyIdsByTabId ?? EMPTY_LIVE_PTY_IDS
  ],
  empty: EMPTY_LIVE_PTY_IDS,
  build: (state, worktreeId) => {
    const out: Record<string, string[]> = {}
    for (const tab of (state.tabsByWorktree ?? EMPTY_TABS_BY_WORKTREE)[worktreeId] ?? []) {
      const ids = (state.ptyIdsByTabId ?? EMPTY_LIVE_PTY_IDS)[tab.id]
      if (ids && ids.length > 0) {
        out[tab.id] = ids
      }
    }
    return out
  }
})

export const selectTerminalLayoutRootsForWorktree = createWorktreeRecordSelector<
  WorktreeCardLayoutRootInputState,
  Record<string, TerminalPaneLayoutNode | null | undefined>
>({
  readSources: (state) => [
    state.tabsByWorktree ?? EMPTY_TABS_BY_WORKTREE,
    state.terminalLayoutsByTabId ?? EMPTY_TERMINAL_LAYOUT_ROOTS
  ],
  empty: EMPTY_TERMINAL_LAYOUT_ROOTS,
  build: (state, worktreeId) => {
    const out: Record<string, TerminalPaneLayoutNode | null | undefined> = {}
    for (const tab of (state.tabsByWorktree ?? EMPTY_TABS_BY_WORKTREE)[worktreeId] ?? []) {
      out[tab.id] = (state.terminalLayoutsByTabId ?? {})[tab.id]?.root
    }
    return out
  }
})

export function selectTerminalLayoutRootsForWorktrees(
  state: WorktreeCardLayoutRootInputState,
  worktreeIds: readonly string[]
): Record<string, TerminalPaneLayoutNode | null | undefined> {
  const out: Record<string, TerminalPaneLayoutNode | null | undefined> = {}
  for (const worktreeId of worktreeIds) {
    for (const tab of (state.tabsByWorktree ?? EMPTY_TABS_BY_WORKTREE)[worktreeId] ?? []) {
      out[tab.id] = (state.terminalLayoutsByTabId ?? {})[tab.id]?.root
    }
  }
  return out
}
