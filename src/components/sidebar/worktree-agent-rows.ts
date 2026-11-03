// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/worktree-agent-rows.ts
import type { RetainedAgentEntry } from '../../store/slices/agent-status-contract'
import { isExplicitAgentStatusFresh } from '../../lib/agent-status'
import { resolveDecayedAgentRowState } from '../../lib/agent-row-decay-state'
import { resolveRuntimePaneTitleLeafId } from '../../lib/runtime-pane-title-leaf-id'
import { tabHasLivePty } from '../../lib/tab-has-live-pty'
import {
  AGENT_STATUS_STALE_AFTER_MS,
  type AgentStatusEntry,
  type AgentStatusOrchestrationContext
} from '../../shared/agent-status-types'
import {
  makePaneKey,
  parseLegacyNumericPaneKey,
  parsePaneKey
} from '../../shared/stable-pane-id'
import type {
  TerminalLayoutSnapshot,
  TerminalPaneLayoutNode,
  TerminalTab
} from '../../shared/terminal-tab-types'
import { buildSubagentChildRows } from './worktree-subagent-child-rows'
import { buildTitleDerivedAgentRows } from './worktree-title-derived-agent-rows'
import { compareWorktreeAgentRows } from './worktree-agent-row-order'
import {
  effectiveWorktreeAgentRowStartedAt,
  tabFromWorktreeAttributedStatusEntry
} from './worktree-agent-row-fallback-tab'
import { resolveRowAgentType } from './worktree-agent-row-type'
import { entryWithRuntimeOrchestration } from './worktree-agent-row-orchestration'
import type { WorktreeAgentRow } from './worktree-agent-row-types'
import {
  toWorktreeAgentTab,
  worktreeAgentTabSessionId,
  type WorktreeAgentTabInput
} from './worktree-agent-row-types'

function countTerminalLayoutLeaves(node: TerminalPaneLayoutNode | null | undefined): number {
  if (!node) {
    return 0
  }
  if (node.type === 'leaf') {
    return 1
  }
  return countTerminalLayoutLeaves(node.first) + countTerminalLayoutLeaves(node.second)
}

function seenStablePaneKeysForTab(seenPaneKeys: Set<string>, tabId: string): string[] {
  const keys: string[] = []
  for (const paneKey of seenPaneKeys) {
    const parsed = parsePaneKey(paneKey)
    if (parsed?.tabId === tabId) {
      keys.push(paneKey)
    }
  }
  return keys
}

function isRetainedLegacyAliasOfSeenStablePane(args: {
  paneKey: string
  terminalLayoutsByTabId?: Record<string, TerminalLayoutSnapshot | undefined>
  seenPaneKeys: Set<string>
}): boolean {
  const legacy = parseLegacyNumericPaneKey(args.paneKey)
  if (!legacy) {
    return false
  }
  const stablePaneKeys = seenStablePaneKeysForTab(args.seenPaneKeys, legacy.tabId)
  if (stablePaneKeys.length === 0) {
    return false
  }

  const layout = args.terminalLayoutsByTabId?.[legacy.tabId]
  const leafId = resolveRuntimePaneTitleLeafId(layout, legacy.numericPaneId)
  if (leafId) {
    return args.seenPaneKeys.has(makePaneKey(legacy.tabId, leafId))
  }

  // Why: old PaneManager ids can advance across remounts/updates even for a
  // single physical pane. Once the tab has exactly one current stable pane,
  // retained numeric rows under that tab are stale aliases of it.
  return countTerminalLayoutLeaves(layout?.root) === 1 && stablePaneKeys.length === 1
}

function markSeenPaneKeyForCurrentTab(args: {
  paneKey: string | undefined
  currentTabsById: ReadonlyMap<string, TerminalTab>
  terminalLayoutsByTabId?: Record<string, TerminalLayoutSnapshot | undefined>
  seenPaneKeys: Set<string>
}): void {
  if (!args.paneKey) {
    return
  }
  const parsed = parsePaneKey(args.paneKey)
  if (parsed) {
    if (args.currentTabsById.has(parsed.tabId)) {
      args.seenPaneKeys.add(args.paneKey)
    }
    return
  }

  const legacy = parseLegacyNumericPaneKey(args.paneKey)
  if (!legacy || !args.currentTabsById.has(legacy.tabId)) {
    return
  }
  args.seenPaneKeys.add(args.paneKey)
  const leafId = resolveRuntimePaneTitleLeafId(
    args.terminalLayoutsByTabId?.[legacy.tabId],
    legacy.numericPaneId
  )
  if (leafId) {
    args.seenPaneKeys.add(makePaneKey(legacy.tabId, leafId))
  }
}

function markCompletedWorkerParentPaneKeysSeen(args: {
  entries: AgentStatusEntry[]
  retained: RetainedAgentEntry[]
  runtimeAgentOrchestrationByPaneKey?: Record<string, AgentStatusOrchestrationContext>
  terminalLayoutsByTabId?: Record<string, TerminalLayoutSnapshot | undefined>
  currentTabsById: ReadonlyMap<string, TerminalTab>
  seenPaneKeys: Set<string>
}): void {
  const markEntry = (entry: AgentStatusEntry): void => {
    const rowEntry = entryWithRuntimeOrchestration(entry, args.runtimeAgentOrchestrationByPaneKey)
    if (rowEntry.state !== 'done') {
      return
    }
    // Why: completed worker rows can be attributed to a child pane while the
    // visible parent pane still has a stale spinner title.
    markSeenPaneKeyForCurrentTab({
      paneKey: rowEntry.orchestration?.parentPaneKey,
      currentTabsById: args.currentTabsById,
      terminalLayoutsByTabId: args.terminalLayoutsByTabId,
      seenPaneKeys: args.seenPaneKeys
    })
  }

  for (const entry of args.entries) {
    markEntry(entry)
  }
  for (const retained of args.retained) {
    markEntry(retained.entry)
  }
}

export function buildWorktreeAgentRows(args: {
  tabs: readonly WorktreeAgentTabInput[]
  entries: AgentStatusEntry[]
  retained: RetainedAgentEntry[]
  runtimePaneTitlesByTabId?: Record<string, Record<number, string>>
  ptyIdsByTabId?: Record<string, string[]>
  terminalLayoutsByTabId?: Record<string, TerminalLayoutSnapshot | undefined>
  runtimeAgentOrchestrationByPaneKey?: Record<string, AgentStatusOrchestrationContext>
  now: number
}): WorktreeAgentRow[] {
  const rows: WorktreeAgentRow[] = []
  const seenPaneKeys = new Set<string>()
  const tabs = args.tabs.map(toWorktreeAgentTab)
  const currentTabsById = new Map(tabs.map((tab) => [tab.id, tab] as const))

  const entriesByTabId = new Map<string, AgentStatusEntry[]>()
  for (const entry of args.entries) {
    const parsed = parsePaneKey(entry.paneKey)
    if (!parsed) {
      continue
    }
    const bucket = entriesByTabId.get(parsed.tabId)
    if (bucket) {
      bucket.push(entry)
    } else {
      entriesByTabId.set(parsed.tabId, [entry])
    }
  }

  const ptyIdsByTabId = args.ptyIdsByTabId ?? {}

  for (const tab of tabs) {
    const explicitEntries = entriesByTabId.get(tab.id) ?? []
    const hasLivePty = tabHasLivePty(ptyIdsByTabId, tab.id)
    for (const entry of explicitEntries) {
      const rowEntry = entryWithRuntimeOrchestration(entry, args.runtimeAgentOrchestrationByPaneKey)
      const isFresh = isExplicitAgentStatusFresh(rowEntry, args.now, AGENT_STATUS_STALE_AFTER_MS)
      const shouldDecay =
        !isFresh &&
        (rowEntry.state === 'working' ||
          rowEntry.state === 'blocked' ||
          rowEntry.state === 'waiting')
      const startedAt = effectiveWorktreeAgentRowStartedAt(rowEntry)
      rows.push({
        paneKey: rowEntry.paneKey,
        entry: rowEntry,
        tab,
        agentType: resolveRowAgentType(rowEntry, tab),
        rowSource: 'live',
        // Why done never decays here: a completed turn is terminal evidence. Only
        // non-terminal states lose their authority when the hook stream goes quiet.
        state: shouldDecay ? resolveDecayedAgentRowState(rowEntry, hasLivePty) : rowEntry.state,
        sessionId: worktreeAgentTabSessionId(tab),
        startedAt
      })
      rows.push(...buildSubagentChildRows({ parentEntry: rowEntry, tab, parentIsFresh: isFresh }))
      seenPaneKeys.add(rowEntry.paneKey)
    }
  }

  markCompletedWorkerParentPaneKeysSeen({
    entries: args.entries,
    retained: args.retained,
    runtimeAgentOrchestrationByPaneKey: args.runtimeAgentOrchestrationByPaneKey,
    terminalLayoutsByTabId: args.terminalLayoutsByTabId,
    currentTabsById,
    seenPaneKeys
  })

  rows.push(...buildTitleDerivedAgentRows({ ...args, tabs, seenPaneKeys }))

  // Why: orchestration workers can be attributed to a worktree by main before
  // their tab is present in this renderer. Keep those live rows visible in the
  // worktree card instead of waiting for tab membership that may never arrive.
  for (const entry of args.entries) {
    if (seenPaneKeys.has(entry.paneKey)) {
      continue
    }
    const rowEntry = entryWithRuntimeOrchestration(entry, args.runtimeAgentOrchestrationByPaneKey)
    const startedAt = effectiveWorktreeAgentRowStartedAt(rowEntry)
    const tab = tabFromWorktreeAttributedStatusEntry(rowEntry, startedAt)
    if (!tab) {
      continue
    }
    const isFresh = isExplicitAgentStatusFresh(rowEntry, args.now, AGENT_STATUS_STALE_AFTER_MS)
    const shouldDecay =
      !isFresh &&
      (rowEntry.state === 'working' ||
        rowEntry.state === 'blocked' ||
        rowEntry.state === 'waiting')
    rows.push({
      paneKey: rowEntry.paneKey,
      entry: rowEntry,
      tab,
      agentType: resolveRowAgentType(rowEntry, tab),
      rowSource: 'live',
      // Why: this row's tab is synthesized because no tab for it exists in this renderer,
      // so there is no live-PTY evidence to hold — the decay destination is always `idle`.
      state: shouldDecay
        ? resolveDecayedAgentRowState(rowEntry, tabHasLivePty(ptyIdsByTabId, tab.id))
        : rowEntry.state,
      sessionId: worktreeAgentTabSessionId(tab),
      startedAt
    })
    rows.push(...buildSubagentChildRows({ parentEntry: rowEntry, tab, parentIsFresh: isFresh }))
    seenPaneKeys.add(rowEntry.paneKey)
  }

  for (const ra of args.retained) {
    if (seenPaneKeys.has(ra.entry.paneKey)) {
      continue
    }
    if (
      isRetainedLegacyAliasOfSeenStablePane({
        paneKey: ra.entry.paneKey,
        terminalLayoutsByTabId: args.terminalLayoutsByTabId,
        seenPaneKeys
      })
    ) {
      continue
    }
    const rowEntry = entryWithRuntimeOrchestration(
      ra.entry,
      args.runtimeAgentOrchestrationByPaneKey
    )
    const tab = currentTabsById.get(ra.tab.id) ?? ra.tab
    rows.push({
      paneKey: rowEntry.paneKey,
      entry: rowEntry,
      tab,
      agentType: resolveRowAgentType(rowEntry, tab),
      rowSource: 'retained',
      // Why: retention only ever holds a completed snapshot; its state is fixed so a
      // later clock read cannot rewrite what the row already recorded.
      state: 'done',
      sessionId: worktreeAgentTabSessionId(tab),
      startedAt: ra.startedAt
    })
  }

  // Why: hook pings can rebuild the live entry list in a different iteration
  // order. Equal-start agents still need a deterministic sidebar order.
  rows.sort(compareWorktreeAgentRows)
  return rows
}
