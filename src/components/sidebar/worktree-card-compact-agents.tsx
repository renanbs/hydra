// src/components/sidebar/worktree-card-compact-agents.tsx
// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)

import React, { useCallback, useMemo } from 'react'
import { ChevronDown } from 'lucide-react'

import { useAppStore } from '../../store'
import { CompactAgentRow } from './CompactAgentRow'
import { AgentBrandIcon } from '../AgentIcon'
import { AgentStateDot } from '../AgentStateDot'
import type { AgentRow } from './worktree-card-agent-summary'
import { buildSummaryAgentGroups, selectSummaryGroupIconAgents, summarizeAgents } from './worktree-card-agent-summary'

function stopActivationKeyPropagation(e: React.KeyboardEvent): void {
  // Why: the surrounding worktree list handles Enter/Space as row activation.
  // Focused nested buttons need those keys to stay local.
  if (e.key === 'Enter' || e.key === ' ') {
    e.stopPropagation()
  }
}

/** Collapsible wrapper used when a card renders agents inside itself. Exposes its own container plus chevron toggle. */
export function CompactAgentExpansion({
  expanded,
  contentClassName,
  children
}: {
  expanded: boolean
  contentClassName?: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div
      className={`worktree-compact-agent-expansion grid transition-[grid-template-rows] duration-150 ease-in-out ${contentClassName ?? ''}`}
      style={{ gridTemplateRows: expanded ? '1fr' : '0fr' }}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  )
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
}: {
  worktreePath: string
  agents: AgentRow[]
  onSelectSession: (id: string) => void
  activeSessionId?: string | null
}): React.JSX.Element | null {
  const rows = useMemo(() => agents, [agents])
  const expanded = useAppStore((s) => s.compactRootListExpandedByWorktree[worktreePath] ?? false)

  if (rows.length === 0) return null

  const subjectLabel = summariezCountLabel(rows.length)

  return (
    <div data-worktree-card-agents="" onClick={(e) => e.stopPropagation()} className="mt-0.5 flex flex-col gap-0.5">
      <div className="compact-agent-summary-panel">
        <CompactAgentSummaryButton agents={rows} worktreePath={worktreePath} subjectLabel={subjectLabel} />

        <CompactAgentExpansion expanded={expanded}>
          <div className="flex flex-col gap-0.5 mt-0.5">
            {rows.map((r) => (
              <CompactAgentRow
                key={r.paneKey}
                agent={r}
                onActivate={onSelectSession}
                isFocusedPane={r.entry.sessionId === activeSessionId}
                childAgentCount={r.childAgentCount}
                childAgentsExpanded={r.childAgentsExpanded}
                onToggleChildAgents={r.onToggleChildAgents}
              />
            ))}
          </div>
        </CompactAgentExpansion>
      </div>
    </div>
  )
}

/** Formats agents compact subject helper label e.g. "5 agents" or "2 agents" */
function summariezCountLabel(count: number): string {
  return `${count} ${count === 1 ? 'agent' : 'agents'}`
}
