// src/components/sidebar/worktree-card-compact-agents.tsx
// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/worktree-card-compact-agents.tsx

import React, { useCallback, useMemo } from 'react'
import { ChevronDown } from 'lucide-react'

import { useAppStore } from '../../store'
import { useNow } from '../../hooks/use-now'
import { CompactAgentRow } from './CompactAgentRow'
import { AgentBrandIcon } from '../AgentIcon'
import { AgentStateDot } from '../AgentStateDot'
import type { AgentRow } from './worktree-card-agent-summary'
import { buildSummaryAgentGroups, selectSummaryGroupIconAgents, summarizeAgents } from './worktree-card-agent-summary'
import { SUPPRESS_WORKTREE_LIST_SCROLL_ADJUSTMENT_EVENT } from './worktree-list/viewport/use-scroll-suppression'

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

/** Root control row that toggles the agents tree and shows a compact dot + agent-chip summary when collapsed. */
export function CompactAgentSummaryButton({
  agents,
  subjectLabel,
  worktreePath,
  onToggle
}: {
  agents: AgentRow[]
  subjectLabel: string
  worktreePath: string
  onToggle?: () => void
}): React.JSX.Element {
  const expanded = useAppStore((s) => s.compactRootListExpandedByWorktree[worktreePath] ?? false)
  const toggleExpansion = useAppStore((s) => s.toggleCompactRootList)

  const groups = buildSummaryAgentGroups(agents)
  const visibleGroups = groups.slice(0, 3)
  const hiddenGroupAgentCount = groups
    .slice(visibleGroups.length)
    .reduce((count, group) => count + group.agents.length, 0)
  
  summarizeAgents(agents); // kept for parity with nova summary identity

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

  return (
    <button
      type="button"
      draggable={false}
      className={`
        compact-agent-summary-button group/agent-summary flex h-6 w-full min-w-0 items-center gap-1 rounded-sm
        px-1 text-left text-[11px] leading-none text-muted-foreground
        focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-worktree-sidebar-ring
        hover:bg-worktree-sidebar-accent/55 dark:hover:bg-worktree-sidebar-foreground/[0.035]
        ${expanded
          ? 'compact-agent-summary-button-expanded'
          : 'border border-worktree-sidebar-border/70 bg-worktree-sidebar-accent/35'
        }
      `}
      aria-label={expanded ? `Collapse ${subjectLabel}` : `Expand ${subjectLabel}`}
      aria-expanded={expanded}
      onClick={handleToggle}
      onKeyDown={stopActivationKeyPropagation}
      onMouseDown={stopPointerPropagation}
      onPointerDown={stopPointerPropagation}
      onDragStart={stopPointerPropagation}
    >
      {expanded ? (
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
                  key={group.status}
                  className="inline-flex min-w-0 shrink-0 items-center gap-0.5 rounded-sm bg-worktree-sidebar/70 px-1 py-0.5"
                >
                  <AgentStateDot state={group.status === 'unknown' ? 'unverifiable' : group.status} size="sm" />
                  {/* Why: same-state agent identities read as one status cluster; overlapping them saves width */}
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
                    <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground/70">
                      +{hiddenIconCount}
                    </span>
                  )}
                </span>
              )
            })}
          </span>
          {hiddenGroupAgentCount > 0 && (
            <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground/70">
              +{hiddenGroupAgentCount}
            </span>
          )}
        </>
      )}
      <ChevronDown
        className={`size-3 shrink-0 transition-transform duration-150 ${!expanded ? '-rotate-90' : ''}`}
        aria-hidden
      />
    </button>
  )
}

/** Parent wrapper component rendering all agent rows of a WorktreeCard using disclosed lineage sub-rows. */
export function WorktreeCompactAgentsList({
  worktreePath,
  agents,
  onSelectSession,
  activeSessionId,
  className,
}: {
  worktreePath: string
  agents: AgentRow[]
  onSelectSession: (id: string) => void
  activeSessionId?: string | null
  className?: string
}): React.JSX.Element | null {
  const rows = useMemo(() => agents, [agents])
  const expanded = useAppStore((s: { compactRootListExpandedByWorktree: Record<string, boolean> }) => s.compactRootListExpandedByWorktree[worktreePath] ?? false)
  // Why: one 30s tick per non-empty list (Orca's WorktreeCardAgentsBody owns the same cadence);
  // a zero-agent list pays no timer cost because `enabled` is false.
  const now = useNow(30_000, rows.length > 0)
  // Orca's row actions: a thread can be marked read/unread, and a finished turn's
  // notification cleared, without opening the pane.
  const clearPaneUnread = useAppStore((s: { clearTerminalPaneUnread: (paneKey: string) => void }) => s.clearTerminalPaneUnread)
  const markCompletionUnread = useAppStore((s: { markAgentCompletionPaneUnread: (paneKey: string, reason: string) => void }) => s.markAgentCompletionPaneUnread)
  // Why: spawned child agents are actionable work, so they show as soon as the parent
  // appears; the disclosure folds noise, not existence. Default = expanded (Orca).
  const [collapsedParents, setCollapsedParents] = React.useState<ReadonlySet<string>>(
    () => new Set()
  )

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

  const toggleLineageParent = useCallback((paneKey: string) => {
    setCollapsedParents((previous: ReadonlySet<string>) => {
      const next = new Set(previous)
      if (next.has(paneKey)) {
        next.delete(paneKey)
      } else {
        next.add(paneKey)
      }
      return next
    })
  }, [])

  if (rows.length === 0) return null

  const subjectLabel = summariezCountLabel(rootRows.length > 0 ? rootRows.length : rows.length)
  // Why: keep leaf rows aligned with parents that own a chevron.
  const anyRootHasChildren = rootRows.some(
    (r) => (childrenByParentPaneKey.get(r.paneKey)?.length ?? 0) > 0
  )

  const renderBranch = (
    agent: AgentRow,
    ancestorPaneKeys: ReadonlySet<string>
  ): React.ReactNode => {
    if (ancestorPaneKeys.has(agent.paneKey)) {
      // Why: orchestration metadata is external and can be malformed; bail on repeated
      // ancestors instead of recursing forever.
      return null
    }
    const childAgents = childrenByParentPaneKey.get(agent.paneKey) ?? []
    const hasChildAgents = childAgents.length > 0
    const isRootAgent = ancestorPaneKeys.size === 0
    const isExpanded = !collapsedParents.has(agent.paneKey)
    const descendantAncestorPaneKeys = new Set(ancestorPaneKeys)
    descendantAncestorPaneKeys.add(agent.paneKey)
    const activate = (): void => {
      // Why inert rows: a closed thread stays listed but its pane is gone, so revealing
      // it must be a no-op instead of selecting an unrelated session.
      if (agent.sessionId) {
        onSelectSession(agent.sessionId)
      }
    }
    return (
      <React.Fragment key={agent.paneKey}>
        <CompactAgentRow
          agent={agent}
          now={now}
          onActivate={activate}
          isFocusedPane={Boolean(agent.sessionId) && agent.sessionId === activeSessionId}
          childAgentCount={hasChildAgents ? childAgents.length : undefined}
          childAgentsExpanded={isExpanded}
          onToggleChildAgents={hasChildAgents ? () => toggleLineageParent(agent.paneKey) : undefined}
          reserveDisclosureGutter={isRootAgent && anyRootHasChildren && !hasChildAgents}
          onMarkRead={() => clearPaneUnread(agent.paneKey)}
          onMarkUnread={() => markCompletionUnread(agent.paneKey, 'agent-completion')}
          onClearNotification={() => clearPaneUnread(agent.paneKey)}
        />
        {hasChildAgents ? (
          <CompactAgentExpansion expanded={isExpanded}>
            <div className="worktree-agent-lineage-children flex flex-col gap-0.5">
              {childAgents.map((childAgent) =>
                renderBranch(childAgent, descendantAncestorPaneKeys)
              )}
            </div>
          </CompactAgentExpansion>
        ) : null}
      </React.Fragment>
    )
  }

  return (
    // Orca parity (`WorktreeCardAgents.tsx:370-379`): the root is
    // `cn('flex flex-col mt-1 gap-0.5', className)` — the caller's margin
    // (mt-0 with a meta row, -mt-1 without) is what merges over mt-1, so a
    // hardcoded mt-0.5 here offsets the whole block from the upstream spacing.
    <div
      data-compact-agent-list="true"
      onClick={(e) => e.stopPropagation()}
      className={`flex flex-col mt-1 gap-0.5 ${className ?? ""}`}
      role={childrenByParentPaneKey.size > 0 ? "tree" : "group"}
      aria-label="Agents"
    >
      <div className="compact-agent-summary-panel">
        <CompactAgentSummaryButton
          agents={rootRows.length > 0 ? rootRows : rows}
          worktreePath={worktreePath}
          subjectLabel={subjectLabel}
        />

        <CompactAgentExpansion expanded={expanded}>
          {(rootRows.length > 0 ? rootRows : rows).map((r) =>
            renderBranch(r, new Set())
          )}
        </CompactAgentExpansion>
      </div>
    </div>
  )
}

/** Formats agents compact subject helper label e.g. "5 agents" or "2 agents" */
function summariezCountLabel(count: number): string {
  return `${count} ${count === 1 ? 'agent' : 'agents'}`
}
