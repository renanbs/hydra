// src/components/sidebar/worktree-card-compact-agents.tsx
// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)

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
  const expanded = useAppStore((s) => s.compactRootListExpandedByWorktree[worktreePath] ?? false)
  // Why: one 30s tick per non-empty list (Orca's WorktreeCardAgentsBody owns the same cadence);
  // a zero-agent list pays no timer cost because `enabled` is false.
  const now = useNow(30_000, rows.length > 0)

  if (rows.length === 0) return null

  const subjectLabel = summariezCountLabel(rows.length)
  // Why: keep leaf rows aligned with parents that own a chevron.
  const anyRootHasChildren = rows.some((r) => (r.childAgentCount ?? 0) > 0)

  return (
    // Orca parity (`WorktreeCardAgents.tsx:370-379`): the root is
    // `cn('flex flex-col mt-1 gap-0.5', className)` — the caller's margin
    // (mt-0 with a meta row, -mt-1 without) is what merges over mt-1, so a
    // hardcoded mt-0.5 here offsets the whole block from the upstream spacing.
    <div
      data-compact-agent-list="true"
      onClick={(e) => e.stopPropagation()}
      className={`flex flex-col mt-1 gap-0.5 ${className ?? ""}`}
    >
      <div className="compact-agent-summary-panel">
        <CompactAgentSummaryButton agents={rows} worktreePath={worktreePath} subjectLabel={subjectLabel} />

        <CompactAgentExpansion expanded={expanded}>
          {rows.map((r) => (
              <CompactAgentRow
                key={r.paneKey}
                agent={r}
                now={now}
                onActivate={onSelectSession}
                isFocusedPane={r.entry.sessionId === activeSessionId}
                childAgentCount={r.childAgentCount}
                childAgentsExpanded={r.childAgentsExpanded}
                onToggleChildAgents={r.onToggleChildAgents}
                reserveDisclosureGutter={anyRootHasChildren && (r.childAgentCount ?? 0) === 0}
            />
          ))}
        </CompactAgentExpansion>
      </div>
    </div>
  )
}

/** Formats agents compact subject helper label e.g. "5 agents" or "2 agents" */
function summariezCountLabel(count: number): string {
  return `${count} ${count === 1 ? 'agent' : 'agents'}`
}
