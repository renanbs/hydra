// smart-attention.ts: Derives which worktrees hold attention-worthy agent activity.
// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Reference: src/renderer/src/components/sidebar/smart-attention.ts
//
// The exported surface keeps this module's pre-existing Hydra helpers
// (`getAgentStatusByPaneKey`, `detectPaneHasUnreadTurn`, `detectPaneHasUnreadBell`) on top of the
// Orca port consumed by `smart-sort.ts`.
import { classifyTitleActivity, isExplicitAgentStatusFresh } from '@/lib/pane-agent-evidence'
import { resolveDecayedAgentRowState } from '@/lib/agent-row-decay-state'
import { migrationUnsupportedToAgentStatusEntry } from '@/lib/migration-unsupported-agent-entry'
import { tabHasLivePty } from '@/lib/tab-has-live-pty'
import { agentEntryCompletionAt } from '../../shared/agent-completion-time'
import { FIRST_PANE_ID } from '../../shared/pane-key'
import { isTerminalLeafId, parsePaneKey } from '../../shared/stable-pane-id'
import { isSyntheticAgentPermissionTitle } from '../../shared/synthetic-agent-title'
import type { AgentStatus } from '../../shared/agent-detection'
import {
  AGENT_STATUS_STALE_AFTER_MS,
  agentStatusEvidenceObservedAt,
  type AgentStateHistoryEntry,
  type AgentStatusEntry,
  type MigrationUnsupportedPtyEntry
} from '../../shared/agent-status-types'
import type {
  TerminalLayoutSnapshot,
  TerminalPaneLayoutNode
} from '../../shared/terminal-tab-types'
import type { Worktree } from '../../shared/worktree/types'
import type { TabItem } from '../../components/workbench/WorkbenchTabBar'

/**
 * The tab fields attention resolution actually reads.
 *
 * Why structural instead of `TerminalTab`: Hydra's `sortWorktreesSmart` hands its
 * `Record<string, readonly { id: string }[]>` projection straight to the functions below, and a
 * store `TabItem[]` satisfies both shapes. `title` stays optional so that projection typechecks;
 * a tab without one classifies as `null` (nothing to assert) rather than fabricating a state.
 */
type AttentionTab = { id: string; title?: string }

export function getAgentStatusByPaneKey(
  _agentStatusByPaneKey: Record<string, AgentStatusEntry> | undefined
): Map<string, AgentStatusEntry> {
  return new Map(Object.entries(_agentStatusByPaneKey ?? {}))
}

// Why empty: these two predate the Orca port and have no Orca counterpart to port from; the tab
// shapes they accept (`TabItem`) carry no per-tab unread signal, so there is nothing to derive.
export function detectPaneHasUnreadTurn(_tabsByWorktree: Record<string, TabItem[]> | undefined): Set<string> {
  return new Set()
}

export function detectPaneHasUnreadBell(_unreadTerminalTabs?: Record<string, boolean>): Set<string> {
  return new Set()
}

/**
 * Ordinal class for the "Smart" sort. Lower number = more attention-demanding.
 *   1 — Needs you (`blocked` / `waiting`)
 *   2 — Done (`done`, not interrupted, completed within AGENT_STATUS_STALE_AFTER_MS)
 *   3 — Working (`working`)
 *   4 — Unverifiable (stale non-`done` entry on a pane Orca still holds a live PTY for:
 *       the reporting stream stopped, not necessarily the work)
 *   5 — Idle (no live entry, interrupted `done`, an aged-out completion, or a stale entry
 *       with no live PTY behind it)
 *
 * Primary sort key; ties fall back to the attention timestamp. See docs/smart-worktree-order-redesign.md.
 */
export type SmartClass = 1 | 2 | 3 | 4 | 5

/**
 * What surfaced a worktree into Class 1 (carried only for Class 1, the only class telemetry reports on).
 *   - `blocked` / `waiting`: hook entry in that state.
 *   - `title-heuristic`: no fresh hook entry; runtime pane title classified as `'permission'`.
 */
export type AttentionCause = 'blocked' | 'waiting' | 'title-heuristic'

/**
 * Per-worktree resolution computed once before sorting.
 *
 * `attentionTimestamp` by class:
 *   - Class 1: `stateStartedAt` of the current entry. Class 2: the entry's completion time.
 *   - Class 3: `stateStartedAt` of the most recent prior `done`/`blocked`/`waiting` entry,
 *     falling back to the current `working` `stateStartedAt`.
 *   - Class 4: when the evidence was last observed, so the least-silent pane ranks first.
 *   - Class 5: `0` — comparator drops to `effectiveRecentActivity` for idle ordering.
 *
 * `cause` is set only when `cls === 1`; feeds the `smart_sort_class_1_promotion` telemetry event.
 */
export type WorktreeAttention = {
  cls: SmartClass
  attentionTimestamp: number
  cause?: AttentionCause
}

export const IDLE: WorktreeAttention = { cls: 5, attentionTimestamp: 0 }

export function hasFreshAttributedAgentStatus(
  agentStatusByPaneKey: Record<string, AgentStatusEntry> | undefined,
  now: number,
  tabsByWorktree: Record<string, readonly AttentionTab[]>
): boolean {
  const freshUnstampedTabIds = new Set<string>()
  for (const entry of Object.values(agentStatusByPaneKey ?? {})) {
    const parsed = parsePaneKey(entry.paneKey)
    if (parsed === null || !isExplicitAgentStatusFresh(entry, now, AGENT_STATUS_STALE_AFTER_MS)) {
      continue
    }
    if (entry.worktreeId) {
      return true
    }
    // Why: hook rows can omit the worktree stamp but still map via paneKey to a mirrored tab — enough to end cold-start.
    freshUnstampedTabIds.add(parsed.tabId)
  }
  if (freshUnstampedTabIds.size === 0) {
    return false
  }
  return Object.values(tabsByWorktree).some((tabs) =>
    tabs.some((tab) => freshUnstampedTabIds.has(tab.id))
  )
}

/**
 * Return the timestamp of the most recent `done`/`blocked`/`waiting` history row, ignoring
 * interrupted `done` rows (Ctrl+C). Returns `null` when no qualifying row exists.
 */
export function mostRecentAttentionInHistory(history: AgentStateHistoryEntry[]): number | null {
  let max = 0
  for (const h of history) {
    // Why: setAgentStatus preserves `interrupted` on history rows, so filter them like the current entry.
    if (h.state === 'done' && h.interrupted) {
      continue
    }
    if (h.state === 'done' || h.state === 'blocked' || h.state === 'waiting') {
      // Why: Infinity from a corrupted row would pin the worktree atop Class 3 forever; treat non-finite as missing.
      if (!Number.isFinite(h.startedAt)) {
        continue
      }
      if (h.startedAt > max) {
        max = h.startedAt
      }
    }
  }
  return max > 0 ? max : null
}

/**
 * One pane's contribution to a worktree's attention class. Fresh hook entries win; hookless
 * panes fall back to the title heuristic (design doc Edge case 9). Authority is per-pane, not per-worktree.
 */
export type PaneInput =
  // Why hasLivePty: a stale entry's decay destination depends on whether Orca still holds the
  // pane's PTY — losing the reporting stream is not the same as nothing running there.
  | { kind: 'hook'; entry: AgentStatusEntry; hasLivePty: boolean }
  // Why: TerminalTab has no per-tab lastActivityAt; the worktree-level value suffices for cross-worktree ordering.
  | { kind: 'title'; status: AgentStatus | null; worktreeLastActivityAt: number }

/**
 * Resolve a worktree's class + attention timestamp from its panes' inputs.
 * A stale hook entry lands in Class 4 or 5 depending on live-PTY evidence; the worktree falls to
 * Class 5 with no fresh hook and no title heuristic.
 * Across panes: `cls` is the **min** (most demanding pane wins), `attentionTimestamp` the **max** within that class.
 */
export function resolveAttention(panes: PaneInput[], now: number): WorktreeAttention {
  let bestCls: SmartClass = 5
  let bestTs = 0
  let bestCause: AttentionCause | undefined

  for (const pane of panes) {
    let cls: SmartClass
    let ts: number
    let cause: AttentionCause | undefined

    if (pane.kind === 'hook') {
      const entry = pane.entry
      if (!isExplicitAgentStatusFresh(entry, now, AGENT_STATUS_STALE_AFTER_MS)) {
        // Why: a pane Orca still holds a PTY for outranks a genuinely empty one — the user may
        // know why it went quiet (a long build), which Orca never can. It never outranks a
        // reporting pane, and it never claims the agent finished.
        if (resolveDecayedAgentRowState(entry, pane.hasLivePty) === 'unverifiable') {
          const observedAt = agentStatusEvidenceObservedAt(entry)
          if (
            Number.isFinite(observedAt) &&
            (4 < bestCls || (bestCls === 4 && observedAt > bestTs))
          ) {
            bestCls = 4
            bestTs = observedAt
            bestCause = undefined
          }
        }
        continue
      }
      // Why: non-finite stateStartedAt (NaN/Infinity) would poison comparisons; treat as a missing entry.
      if (!Number.isFinite(entry.stateStartedAt)) {
        continue
      }

      if (entry.state === 'blocked' || entry.state === 'waiting') {
        cls = 1
        ts = entry.stateStartedAt
        cause = entry.state
      } else if (entry.state === 'done') {
        // Why: null covers interrupted `done` (Ctrl+C — user is finished with it) and idle session
        // boundaries; neither is attention.
        const completedAt = agentEntryCompletionAt(entry)
        if (completedAt === null) {
          continue
        }
        // Why: same-state `done` writes advance updatedAt without moving the completion, so the hook
        // freshness gate alone can keep a row in Class 2 long after the UI shows it aged out.
        if (now - completedAt > AGENT_STATUS_STALE_AFTER_MS) {
          continue
        }
        cls = 2
        ts = completedAt
      } else {
        // working
        cls = 3
        // Why: sort Class 3 by most recent prior attention so a just-started turn outranks one working for an hour.
        const prior = mostRecentAttentionInHistory(entry.stateHistory)
        if (prior === null) {
          ts = entry.stateStartedAt
        } else if (entry.agentType === 'command-code') {
          // Why: Command Code has no UserPromptSubmit hook; a new prompt only bumps stateStartedAt, so max beats stale prior-attention.
          ts = Math.max(prior, entry.stateStartedAt)
        } else {
          ts = prior
        }
      }
    } else {
      // Title-heuristic fallback: only fires for panes with no fresh hook entry.
      if (pane.status === 'permission') {
        cls = 1
        // Why now: title detector exposes no stateStartedAt; `now` pins it to the top of Class 1 until a hook event.
        ts = now
        cause = 'title-heuristic'
      } else if (pane.status === 'working') {
        cls = 3
        ts = pane.worktreeLastActivityAt
      } else {
        // 'idle' or null: nothing to assert; pane stays in Class 4.
        continue
      }
    }

    // Min class wins (higher priority); tie-break on max timestamp so the freshest attention event wins.
    if (cls < bestCls || (cls === bestCls && ts > bestTs)) {
      bestCls = cls
      bestTs = ts
      bestCause = cause
    }
  }

  return bestCls === 1 && bestCause
    ? { cls: bestCls, attentionTimestamp: bestTs, cause: bestCause }
    : { cls: bestCls, attentionTimestamp: bestTs }
}

/**
 * Build a `tabId → entries[]` index over `agentStatusByPaneKey`, keyed by the paneKey's
 * `tabId` prefix. Built once per sort so each worktree's resolution is O(T), not a full-map scan.
 */
export function buildExplicitEntriesByTabId(
  agentStatusByPaneKey: Record<string, AgentStatusEntry> | undefined,
  migrationUnsupportedByPtyId?: Record<string, MigrationUnsupportedPtyEntry>
): Map<string, AgentStatusEntry[]> {
  const byTab = new Map<string, AgentStatusEntry[]>()
  const pushEntry = (entry: AgentStatusEntry): void => {
    const parsed = parsePaneKey(entry.paneKey)
    // Why: skip malformed/legacy-numeric paneKeys rather than bucketing unroutable rows under a tab.
    if (!parsed) {
      return
    }
    const bucket = byTab.get(parsed.tabId)
    if (bucket) {
      bucket.push(entry)
    } else {
      byTab.set(parsed.tabId, [entry])
    }
  }
  for (const entry of Object.values(agentStatusByPaneKey ?? {})) {
    pushEntry(entry)
  }
  for (const entry of Object.values(migrationUnsupportedByPtyId ?? {})) {
    const agentEntry = migrationUnsupportedToAgentStatusEntry(entry)
    if (agentEntry) {
      pushEntry(agentEntry)
    }
  }
  return byTab
}

function buildExplicitEntriesByWorktreeId(
  agentStatusByPaneKey: Record<string, AgentStatusEntry> | undefined
): Map<string, AgentStatusEntry[]> {
  const byWorktree = new Map<string, AgentStatusEntry[]>()
  for (const entry of Object.values(agentStatusByPaneKey ?? {})) {
    if (!entry.worktreeId || !parsePaneKey(entry.paneKey)) {
      continue
    }
    const bucket = byWorktree.get(entry.worktreeId)
    if (bucket) {
      bucket.push(entry)
    } else {
      byWorktree.set(entry.worktreeId, [entry])
    }
  }
  return byWorktree
}

/** Renderer state a single tab's panes are resolved from. */
export type TabPaneInputSources = {
  entriesByTabId: ReadonlyMap<string, AgentStatusEntry[]>
  ptyIdsByTabId: Record<string, string[]>
  runtimePaneTitlesByTabId: Record<string, Record<number, string>>
  terminalLayoutsByTabId?: Record<string, TerminalLayoutSnapshot>
}

// Ported from Orca `src/renderer/src/lib/runtime-pane-title-leaf-id.ts` (MIT).
// Why local: Hydra's `@/lib/runtime-pane-title-leaf-id` is still an auto-stub exporting `null`
// (docs/audits/orca-sidebar-parity/domains/D05-agents-rows.gaps.md) and is outside this module's
// file scope — importing it would re-introduce the null-call TypeError this module exists to fix.
// Swap to the import once that module is wired.
type RuntimePaneTitleLayout = { root?: TerminalLayoutSnapshot['root'] } | undefined

function leftmostLeafId(node: TerminalPaneLayoutNode): string {
  return node.type === 'leaf' ? node.leafId : leftmostLeafId(node.first)
}

function collectReplayCreatedPaneLeafIds(
  node: TerminalPaneLayoutNode,
  leafIdsInReplayCreationOrder: string[]
): void {
  if (node.type === 'leaf') {
    return
  }

  leafIdsInReplayCreationOrder.push(leftmostLeafId(node.second))

  if (node.first.type === 'split') {
    collectReplayCreatedPaneLeafIds(node.first, leafIdsInReplayCreationOrder)
  }
  if (node.second.type === 'split') {
    collectReplayCreatedPaneLeafIds(node.second, leafIdsInReplayCreationOrder)
  }
}

function collectLeafIdsInReplayCreationOrder(
  node: TerminalPaneLayoutNode | null | undefined
): string[] {
  if (!node) {
    return []
  }
  const leafIdsInReplayCreationOrder = [leftmostLeafId(node)]
  if (node.type === 'split') {
    collectReplayCreatedPaneLeafIds(node, leafIdsInReplayCreationOrder)
  }
  return leafIdsInReplayCreationOrder
}

function resolveRuntimePaneTitleLeafId(
  tabLayout: RuntimePaneTitleLayout,
  runtimePaneId: string
): string | null {
  if (isTerminalLeafId(runtimePaneId)) {
    return runtimePaneId
  }
  const numericPaneId = Number(runtimePaneId)
  if (!Number.isInteger(numericPaneId) || numericPaneId < FIRST_PANE_ID) {
    return null
  }
  const leafIds = collectLeafIdsInReplayCreationOrder(tabLayout?.root)
  return leafIds[numericPaneId - FIRST_PANE_ID] ?? null
}

/**
 * One terminal tab's contribution to an attention resolution: its hook entries, plus the
 * title heuristic for panes no fresh hook covers. Gated on `tabHasLivePty` so a slept tab's
 * stale working-pattern title can't leak through.
 */
export function collectTabPaneInputs(
  tab: AttentionTab,
  worktreeLastActivityAt: number,
  sources: TabPaneInputSources,
  now: number
): PaneInput[] {
  const panes: PaneInput[] = []
  const hasLivePty = tabHasLivePty(sources.ptyIdsByTabId, tab.id)
  const tabTitle = tab.title ?? ''
  // Why: leaves covered by a hook entry skip the title fallback so we don't double-count them.
  const hookLeafIds = new Set<string>()
  // Stale hooks still suppress one-shot permission titles, matching worktree and tab status dots.
  const permissionHookLeafIds = new Set<string>()
  for (const entry of sources.entriesByTabId.get(tab.id) ?? []) {
    panes.push({ kind: 'hook', entry, hasLivePty })
    const leafId = parsePaneKey(entry.paneKey)?.leafId ?? null
    if (leafId !== null) {
      permissionHookLeafIds.add(leafId)
    }
    // Why: restored rows own their co-restored title without asserting live state.
    if (
      !entry.restoredUnconfirmed &&
      !isExplicitAgentStatusFresh(entry, now, AGENT_STATUS_STALE_AFTER_MS)
    ) {
      continue
    }
    if (leafId !== null) {
      hookLeafIds.add(leafId)
    }
  }

  // Why: runtimePaneTitlesByTabId survives sleep, so a slept tab's stale working-pattern title would leak in without this gate.
  if (!hasLivePty) {
    return panes
  }

  const paneTitles = sources.runtimePaneTitlesByTabId[tab.id]
  if (!paneTitles || Object.keys(paneTitles).length === 0) {
    const coveredLeafIds = isSyntheticAgentPermissionTitle(tabTitle)
      ? permissionHookLeafIds
      : hookLeafIds
    if (coveredLeafIds.size === 0) {
      // Why: unmounted tabs (restored-but-unvisited) expose only the legacy tab title.
      panes.push({
        kind: 'title',
        status: classifyTitleActivity(tabTitle),
        worktreeLastActivityAt
      })
    }
    return panes
  }

  // Why: split-pane tabs host multiple agents, one title each; mirrors getWorkingAgentsPerWorktree precedence.
  const tabLayout = sources.terminalLayoutsByTabId?.[tab.id]
  const paneTitleEntries = Object.entries(paneTitles)
  for (const [runtimePaneId, title] of paneTitleEntries) {
    const coveredLeafIds = isSyntheticAgentPermissionTitle(title)
      ? permissionHookLeafIds
      : hookLeafIds
    const leafId = resolveRuntimePaneTitleLeafId(tabLayout, runtimePaneId)
    const hasSingleUnmappedHook =
      leafId === null && coveredLeafIds.size === 1 && paneTitleEntries.length === 1
    if ((leafId !== null && coveredLeafIds.has(leafId)) || hasSingleUnmappedHook) {
      continue
    }
    panes.push({ kind: 'title', status: classifyTitleActivity(title), worktreeLastActivityAt })
  }
  return panes
}

/**
 * Build the per-worktree attention map consumed by the smart comparator.
 * Hook authority is per-pane; panes without a fresh hook fall back to the title heuristic,
 * gated on `tabHasLivePty` so slept tabs' stale working-pattern titles don't leak through.
 */
export function buildAttentionByWorktree(
  worktrees: Worktree[],
  tabsByWorktree: Record<string, readonly AttentionTab[]> | null,
  agentStatusByPaneKey: Record<string, AgentStatusEntry> | undefined,
  runtimePaneTitlesByTabId: Record<string, Record<number, string>>,
  ptyIdsByTabId: Record<string, string[]>,
  now: number,
  migrationUnsupportedByPtyId?: Record<string, MigrationUnsupportedPtyEntry>,
  terminalLayoutsByTabId?: Record<string, TerminalLayoutSnapshot>
): Map<string, WorktreeAttention> {
  const byTab = buildExplicitEntriesByTabId(agentStatusByPaneKey, migrationUnsupportedByPtyId)
  const byAttributedWorktree = buildExplicitEntriesByWorktreeId(agentStatusByPaneKey)
  const mirroredTabIds = new Set<string>()
  for (const tabs of Object.values(tabsByWorktree ?? {})) {
    for (const tab of tabs) {
      mirroredTabIds.add(tab.id)
    }
  }
  const paneSources: TabPaneInputSources = {
    entriesByTabId: byTab,
    ptyIdsByTabId,
    runtimePaneTitlesByTabId,
    terminalLayoutsByTabId
  }
  const result = new Map<string, WorktreeAttention>()

  for (const worktree of worktrees) {
    const tabs = tabsByWorktree?.[worktree.id] ?? []
    // Why: hook stamps can precede tab mirroring; once mirrored, live tab ownership wins so both worktrees aren't promoted.
    const panes: PaneInput[] = (byAttributedWorktree.get(worktree.id) ?? [])
      .filter((entry) => {
        const parsed = parsePaneKey(entry.paneKey)
        return parsed !== null && !mirroredTabIds.has(parsed.tabId)
      })
      // Why hasLivePty false: these entries were filtered to panes with no tab in this renderer,
      // so there is no live-PTY evidence here to hold them above idle.
      .map((entry) => ({ kind: 'hook' as const, entry, hasLivePty: false }))
    if (tabs.length === 0) {
      result.set(worktree.id, resolveAttention(panes, now))
      continue
    }
    for (const tab of tabs) {
      panes.push(...collectTabPaneInputs(tab, worktree.lastActivityAt, paneSources, now))
    }
    result.set(worktree.id, resolveAttention(panes, now))
  }

  return result
}
