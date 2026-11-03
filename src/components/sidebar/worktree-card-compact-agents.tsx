// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/worktree-card-compact-agents.tsx
import React, { useCallback, useLayoutEffect, useMemo, useRef } from 'react'
import { ChevronDown } from 'lucide-react'

import { useAppStore } from '../../store'
import { useNow } from '../../hooks/use-now'
import { cn } from '../../lib/utils'
import { translate } from '@/i18n/i18n'
import { DashboardAgentRow } from '../dashboard/DashboardAgentRow'
import { CompactAgentRow } from './CompactAgentRow'
import { AgentBrandIcon } from '../AgentIcon'
import { AgentStateDot } from '../AgentStateDot'
import type { AgentRow } from './worktree-card-agent-summary'
import {
  buildSummaryAgentGroups,
  selectSummaryGroupIconAgents,
  summarizeAgentIdentities,
  summarizeAgents
} from './worktree-card-agent-summary'
import { useWorktreeAgentExpansionState } from './worktree-card-agents-expansion-state'
import { SUPPRESS_WORKTREE_LIST_SCROLL_ADJUSTMENT_EVENT } from './worktree-list/viewport/use-scroll-suppression'
import { revealElementInScrollContainer } from './worktree-sidebar-reveal'
import type { DashboardAgentRowData } from './agent-status-types'
import type { AgentStatusState } from '../../shared/agent-status-types'
import type { AgentActivityDisplayMode } from '../../shared/ui-chrome-types'

/** Orca agent-send picker state, read structurally: the store keeps it loosely typed. */
type SendTargetModeView = {
  status: 'open' | 'sending' | 'error'
  eligiblePaneKeys: string[]
  disabledPaneKeys?: Record<string, string>
  sendingPaneKey?: string
} | null

type CardDisplayState = {
  agentActivityDisplayMode?: AgentActivityDisplayMode
}

function stopActivationKeyPropagation(e: React.KeyboardEvent): void {
  // Why: the surrounding worktree list handles Enter/Space as row activation.
  // Focused nested buttons need those keys to stay local.
  if (e.key === 'Enter' || e.key === ' ') {
    e.stopPropagation()
  }
}

/** Collapsible wrapper used when a card renders agents inside itself.
 * Orca parity (`worktree-card-compact-agents.tsx:39-78`): the grid lives in CSS
 * (`compact-agent-expansion-grid[-expanded]`), the content keeps an inner
 * `min-h-0 overflow-hidden` box plus `pt-0.5`, and the children stay mounted after
 * the first expansion so the collapse animates. */
export function CompactAgentExpansion({
  expanded,
  contentClassName,
  children
}: {
  expanded: boolean
  contentClassName?: string
  children: React.ReactNode
}): React.JSX.Element {
  const hasRenderedChildrenRef = React.useRef(expanded)
  if (expanded) {
    hasRenderedChildrenRef.current = true
  }
  const shouldRenderChildren = expanded || hasRenderedChildrenRef.current

  return (
    <div
      className={`compact-agent-expansion-grid${expanded ? ' compact-agent-expansion-grid-expanded' : ''}`}
      aria-hidden={!expanded}
      inert={!expanded}
    >
      <div className="min-h-0 overflow-hidden">
        {shouldRenderChildren && (
          <div
            className={`compact-agent-expansion-content flex flex-col gap-0.5 pt-0.5 ${contentClassName ?? ''}`}
          >
            {children}
          </div>
        )}
      </div>
    </div>
  )
}

/** Tells the workspaces viewport a card is opening in place, so it must not correct scrollTop. */
function dispatchSuppressWorktreeListScrollAdjustment(): void {
  window.dispatchEvent(new CustomEvent(SUPPRESS_WORKTREE_LIST_SCROLL_ADJUSTMENT_EVENT))
}

/** Reveal the card that just opened in place, after the next frame's layout. */
function revealAgentCard(root: HTMLElement | null): void {
  const sidebar = root?.closest('[data-worktree-sidebar]')
  const card = root?.closest('[role="option"]')
  if (sidebar instanceof HTMLElement && card instanceof HTMLElement) {
    revealElementInScrollContainer(sidebar, card, 'auto')
  }
}

/**
 * Root control row that toggles the agents tree and shows a compact dot + agent-chip
 * summary when collapsed. The collapsed label is the Orca sentence
 * (`All 3 agents working`), and the accessible name adds the per-agent identities.
 */
export function CompactAgentSummaryButton({
  agents,
  subjectLabel,
  worktreePath,
  expanded,
  onToggle
}: {
  agents: AgentRow[]
  subjectLabel: string
  worktreePath: string
  expanded: boolean
  onToggle?: () => void
}): React.JSX.Element {
  const toggleExpansion = useAppStore((s) => s.toggleCompactRootList)
  const summary = summarizeAgents(agents, subjectLabel)
  const groups = buildSummaryAgentGroups(agents)
  const visibleGroups = groups.slice(0, 3)
  const hiddenGroupAgentCount = groups
    .slice(visibleGroups.length)
    .reduce((count, group) => count + group.agents.length, 0)
  const agentIdentitySummary = summarizeAgentIdentities(agents)

  const stopPointerPropagation = useCallback((e: React.SyntheticEvent) => {
    e.stopPropagation()
  }, [])

  const handleToggle = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()
      e.stopPropagation()
      // Why: the panel grows in place; without this the virtualizer compensates scrollTop
      // mid-animation and the card the user just opened slides away from the pointer.
      dispatchSuppressWorktreeListScrollAdjustment()
      if (onToggle) {
        onToggle()
      } else {
        toggleExpansion(worktreePath)
      }
    },
    [onToggle, toggleExpansion, worktreePath]
  )
  // Why: an already-expanded panel seeded from cache has no toggle call, so the
  // parent's `expanded` wins for the aria/label state.
  const setIsExpanded = expanded

  return (
    <button
      type="button"
      draggable={false}
      className={cn(
        'compact-agent-summary-button group/agent-summary flex h-6 w-full min-w-0 items-center gap-1 rounded-sm px-1 text-left text-[11px] leading-none text-muted-foreground',
        'focus-visible:ring-1 focus-visible:ring-worktree-sidebar-ring focus-visible:outline-none',
        'hover:bg-worktree-sidebar-accent/55 dark:hover:bg-worktree-sidebar-foreground/[0.035]',
        setIsExpanded
          ? 'compact-agent-summary-button-expanded'
          : 'border border-worktree-sidebar-border/70 bg-worktree-sidebar-accent/35'
      )}
      aria-label={
        setIsExpanded
          ? translate(
              'auto.components.sidebar.worktree.card.compact.agents.0c1debfe84',
              'Collapse {{value0}}',
              { value0: subjectLabel }
            )
          : translate(
              'auto.components.sidebar.worktree.card.compact.agents.289a1d2ca7',
              'Expand {{value0}}. {{value1}}',
              { value0: summary, value1: agentIdentitySummary }
            )
      }
      aria-expanded={setIsExpanded}
      onClick={handleToggle}
      onKeyDown={stopActivationKeyPropagation}
      onMouseDown={stopPointerPropagation}
      onPointerDown={stopPointerPropagation}
      onDragStart={stopPointerPropagation}
    >
      {setIsExpanded ? (
        <span className="min-w-0 flex-1 truncate px-1 font-medium text-muted-foreground">
          {subjectLabel}
        </span>
      ) : (
        <>
          <span className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden" aria-hidden>
            {visibleGroups.map((group) => {
              const iconAgents = selectSummaryGroupIconAgents(group.agents, 3)
              const hiddenIconCount = Math.max(0, group.agents.length - iconAgents.length)
              return (
                <span
                  key={group.state}
                  className="inline-flex min-w-0 shrink-0 items-center gap-0.5 rounded-sm bg-worktree-sidebar/70 px-1 py-0.5"
                >
                  <AgentStateDot state={group.state} size="sm" />
                  {/* Why: same-state agent identities read as one status cluster;
                      overlapping them saves width without merging different states. */}
                  <span className="inline-flex shrink-0 items-center -space-x-0.5 pl-0.5">
                    {iconAgents.map((a) => (
                      <span
                        key={a.paneKey}
                        className="inline-flex size-4 items-center justify-center rounded-full border border-worktree-sidebar-border/70 bg-worktree-sidebar"
                      >
                        <AgentBrandIcon agentId={a.agentType ?? a.displayAgent ?? 'unknown'} size={13} />
                      </span>
                    ))}
                  </span>
                  {hiddenIconCount > 0 && (
                    <span className="shrink-0 text-[10px] text-muted-foreground/70 tabular-nums">
                      +{hiddenIconCount}
                    </span>
                  )}
                </span>
              )
            })}
          </span>
          {hiddenGroupAgentCount > 0 && (
            <span className="shrink-0 text-[10px] text-muted-foreground/70 tabular-nums">
              +{hiddenGroupAgentCount}
            </span>
          )}
        </>
      )}
      <ChevronDown
        className={cn(
          'size-3 shrink-0 transition-transform duration-150',
          !setIsExpanded && '-rotate-90'
        )}
        aria-hidden
      />
    </button>
  )
}

/** Orca's `DashboardAgentRowData` is the full-row shape; the card carries the card row. */
function toDashboardAgentRow(agent: AgentRow): DashboardAgentRowData {
  const state = (agent.state ?? agent.entry.state) as AgentStatusState
  // Why the casts: the card row's `entry` is the wire model and its `rowSource` is
  // the pipeline's provenance; the full row reuses the sidebar's row projections.
  return {
    paneKey: agent.paneKey,
    tabId: agent.tab?.id ?? agent.paneKey,
    activationPaneKey: agent.activationPaneKey,
    startedAt: agent.startedAt ?? agent.entry.stateStartedAt ?? 0,
    state,
    agentType: agent.agentType as DashboardAgentRowData['agentType'],
    entry: agent.entry as unknown as DashboardAgentRowData['entry'],
    rowSource: agent.rowSource === 'subagent' ? 'subagent' : undefined,
    lineage: agent.lineage as DashboardAgentRowData['lineage']
  }
}

/** Parent wrapper component rendering all agent rows of a WorktreeCard using disclosed lineage sub-rows. */
export function WorktreeCompactAgentsList({
  worktreePath,
  worktreeId,
  agents,
  onSelectSession,
  activeSessionId,
  focusedAgentPaneKey = null,
  unvisitedByPaneKey,
  className,
}: {
  worktreePath: string
  worktreeId?: string
  agents: AgentRow[]
  onSelectSession: (id: string) => void
  activeSessionId?: string | null
  /** Pane key of the terminal pane focused inside this worktree (Orca `useFocusedAgentPaneKey`). */
  focusedAgentPaneKey?: string | null
  /** Per-row unvisited flags (Orca `unvisitedByPaneKey`), projected from ack timestamps. */
  unvisitedByPaneKey?: Readonly<Record<string, boolean>>
  className?: string
}): React.JSX.Element | null {
  const rows = useMemo(() => agents, [agents])
  const expansionKey = worktreeId ?? worktreePath
  const {
    collapsedLineageParents,
    compactRootListExpanded,
    toggleLineageParent,
    toggleCompactRootList
  } = useWorktreeAgentExpansionState(expansionKey)
  const displayMode = useAppStore(
    (s) => (s as unknown as CardDisplayState).agentActivityDisplayMode ?? 'default'
  )
  const acknowledgedByPaneKey = useAppStore(
    (s) => s.acknowledgedAgentsByPaneKey as Record<string, number> | undefined
  )
  const sendTargetMode = useAppStore(
    (s) => s.agentSendPopoverTargetMode as unknown as SendTargetModeView
  )
  const sendPromptToTarget = useAppStore((s) => s.sendPromptToSidebarAgentTarget)
  const rootRef = useRef<HTMLDivElement | null>(null)
  // Why: one 30s tick per non-empty list (Orca's WorktreeCardAgentsBody owns the same cadence);
  // a zero-agent list pays no timer cost.
  const now = useNow(30_000, rows.length > 0)
  // Orca's row actions: a thread can be marked read/unread, and a finished turn's
  // notification cleared, without opening the pane.
  const clearPaneUnread = useAppStore((s) => s.clearTerminalPaneUnread)
  const markCompletionUnread = useAppStore((s) => s.markAgentCompletionPaneUnread)

  const { rootRows, childrenByParentPaneKey } = useMemo(() => {
    const children = new Map<string, AgentRow[]>()
    const roots: AgentRow[] = []
    for (const row of rows) {
      const parent = row.lineage?.parentPaneKey
      if (!parent) {
        roots.push(row)
        continue
      }
      const bucket = children.get(parent)
      if (bucket) {
        bucket.push(row)
      } else {
        children.set(parent, [row])
      }
    }
    return { rootRows: roots, childrenByParentPaneKey: children }
  }, [rows])

  // Why: a card that opens in place must not have the list correct its scrollTop;
  // the reveal runs on the NEXT frame, after the expansion animation started.
  const previousExpandedRef = useRef(compactRootListExpanded)
  useLayoutEffect(() => {
    const wasExpanded = previousExpandedRef.current
    previousExpandedRef.current = compactRootListExpanded
    if (!wasExpanded && compactRootListExpanded) {
      dispatchSuppressWorktreeListScrollAdjustment()
      const handle = requestAnimationFrame(() => revealAgentCard(rootRef.current))
      return () => cancelAnimationFrame(handle)
    }
    return undefined
  }, [compactRootListExpanded])

  const handleToggleLineageParent = useCallback(
    (paneKey: string) => {
      dispatchSuppressWorktreeListScrollAdjustment()
      toggleLineageParent(paneKey)
    },
    [toggleLineageParent]
  )

  const sendTargetStatusFor = useCallback(
    (paneKey: string): { status: 'eligible' | 'disabled' | 'sending'; reason?: string } | undefined => {
      if (!sendTargetMode) {
        return undefined
      }
      if (sendTargetMode.status === 'sending' && sendTargetMode.sendingPaneKey === paneKey) {
        return { status: 'sending' }
      }
      if (sendTargetMode.eligiblePaneKeys.includes(paneKey)) {
        return { status: 'eligible' }
      }
      return {
        status: 'disabled',
        reason: sendTargetMode.disabledPaneKeys?.[paneKey] ?? 'Agent is not available'
      }
    },
    [sendTargetMode]
  )

  const handleSendTargetClick = useCallback(
    (paneKey: string) => {
      void sendPromptToTarget(paneKey)
    },
    [sendPromptToTarget]
  )

  if (rows.length === 0) return null

  const subjectRows = rootRows.length > 0 ? rootRows : rows
  const subjectLabel = `${subjectRows.length} ${subjectRows.length === 1 ? 'agent' : 'agents'}`
  // Why: keep leaf rows aligned with parents that own a chevron.
  const anyRootHasChildren = rootRows.some(
    (r) => (childrenByParentPaneKey.get(r.paneKey)?.length ?? 0) > 0
  )
  // Why: a parent whose own status is at least as old as its last acknowledgement
  // is "unvisited" — the row stays emphasized until the user opens its tab.
  const isUnvisited = (agent: AgentRow): boolean =>
    (acknowledgedByPaneKey?.[agent.paneKey] ?? 0) < (agent.entry.stateStartedAt ?? 0)

  const renderBranch = (agent: AgentRow, ancestorPaneKeys: ReadonlySet<string>): React.ReactNode => {
    if (ancestorPaneKeys.has(agent.paneKey)) {
      // Why: orchestration metadata is external and can be malformed; bail on repeated
      // ancestors instead of recursing forever.
      return null
    }
    const childAgents = childrenByParentPaneKey.get(agent.paneKey) ?? []
    const hasChildAgents = childAgents.length > 0
    const isRootAgent = ancestorPaneKeys.size === 0
    const isExpanded = !collapsedLineageParents.has(agent.paneKey)
    const descendantAncestorPaneKeys = new Set(ancestorPaneKeys)
    descendantAncestorPaneKeys.add(agent.paneKey)
    const activate = (): void => {
      // Why inert rows: a closed thread stays listed but its pane is gone, so revealing
      // it must be a no-op instead of selecting an unrelated session.
      if (agent.sessionId) {
        onSelectSession(agent.sessionId)
      }
    }
    const sendTarget = sendTargetStatusFor(agent.paneKey)
    return (
      <React.Fragment key={agent.paneKey}>
        {displayMode === 'full' ? (
          <DashboardAgentRow
            agent={toDashboardAgentRow(agent)}
            now={now}
            onActivate={activate}
            isFocusedPane={
              agent.paneKey === focusedAgentPaneKey ||
              (Boolean(agent.sessionId) && agent.sessionId === activeSessionId)
            }
            childAgentCount={hasChildAgents ? childAgents.length : undefined}
            childAgentsExpanded={isExpanded}
            onToggleChildAgents={
              hasChildAgents ? () => handleToggleLineageParent(agent.paneKey) : undefined
            }
            reserveDisclosureGutter={isRootAgent && anyRootHasChildren && !hasChildAgents}
            hideLineageConnectors
          />
        ) : (
          <CompactAgentRow
            agent={agent}
            now={now}
            onActivate={activate}
            isFocusedPane={
              agent.paneKey === focusedAgentPaneKey ||
              (Boolean(agent.sessionId) && agent.sessionId === activeSessionId)
            }
            isUnvisited={unvisitedByPaneKey?.[agent.paneKey] ?? isUnvisited(agent)}
            childAgentCount={hasChildAgents ? childAgents.length : undefined}
            childAgentsExpanded={isExpanded}
            onToggleChildAgents={
              hasChildAgents ? () => handleToggleLineageParent(agent.paneKey) : undefined
            }
            reserveDisclosureGutter={isRootAgent && anyRootHasChildren && !hasChildAgents}
            sendTargetStatus={sendTarget?.status}
            sendTargetDisabledReason={sendTarget?.reason}
            onSendTargetClick={sendTargetMode ? handleSendTargetClick : undefined}
            onMarkRead={() => clearPaneUnread(agent.paneKey)}
            onMarkUnread={() => markCompletionUnread(agent.paneKey, 'agent-completion')}
            onClearNotification={() => clearPaneUnread(agent.paneKey)}
          />
        )}
        {hasChildAgents ? (
          <CompactAgentExpansion expanded={isExpanded}>
            <div className="worktree-agent-lineage-children flex flex-col gap-0.5">
              {childAgents.map((childAgent) => renderBranch(childAgent, descendantAncestorPaneKeys))}
            </div>
          </CompactAgentExpansion>
        ) : null}
      </React.Fragment>
    )
  }

  // Why: one root agent with no children is not a list — the summary pill would
  // hide the only row behind a click that reveals nothing else.
  const singleRootWithoutChildren =
    rootRows.length === 1 && (childrenByParentPaneKey.get(rootRows[0].paneKey)?.length ?? 0) === 0

  return (
    // Orca parity (`WorktreeCardAgents.tsx:370-379`): the root is
    // `cn('flex flex-col mt-1 gap-0.5', className)` — the caller's margin
    // (mt-0 with a meta row, -mt-1 without) is what merges over mt-1, so a
    // hardcoded mt-0.5 here offsets the whole block from the upstream spacing.
    <div
      ref={rootRef}
      data-compact-agent-list="true"
      onClick={(e) => e.stopPropagation()}
      className={cn('mt-1 flex flex-col gap-0.5', className)}
      role={childrenByParentPaneKey.size > 0 ? 'tree' : 'group'}
      aria-label="Agents"
    >
      {singleRootWithoutChildren ? (
        subjectRows.map((row) => renderBranch(row, new Set()))
      ) : (
        <div className="compact-agent-summary-panel">
          <CompactAgentSummaryButton
            agents={subjectRows}
            worktreePath={worktreePath}
            subjectLabel={subjectLabel}
            expanded={compactRootListExpanded}
            onToggle={toggleCompactRootList}
          />

          <CompactAgentExpansion expanded={compactRootListExpanded}>
            {subjectRows.map((r) => renderBranch(r, new Set()))}
          </CompactAgentExpansion>
        </div>
      )}
    </div>
  )
}

export type { AgentRow }
