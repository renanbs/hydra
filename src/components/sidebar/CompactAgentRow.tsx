// src/components/sidebar/CompactAgentRow.tsx
// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// src/renderer/src/components/sidebar/worktree-card-compact-agent-row.tsx
import React, { useCallback } from 'react'
import { ChevronRight } from 'lucide-react'

import { AgentBrandIcon } from '../AgentIcon'
import { AgentStateDot } from '../AgentStateDot'
import { cn } from '../../lib/utils'
import { formatAgentTypeLabel } from '../../shared/agent-type-label'
import {
  getAgentDotState,
  getCompactAgentPrimary,
  getCompactAgentSecondary,
  getCompactAgentTime
} from './compact-agent-row-labels'
import type { AgentRow } from './worktree-card-agent-summary'

export interface CompactAgentRowProps {
  agent: AgentRow
  /** Shared per-list clock (see WorktreeCompactAgentsList); threads one timer across every row. */
  now: number
  onActivate?: (id: string) => void
  isFocusedPane?: boolean
  childAgentCount?: number
  childAgentsExpanded?: boolean
  onToggleChildAgents?: () => void
  /** Reserve the disclosure gutter so leaf rows stay aligned with parent rows that have a chevron. */
  reserveDisclosureGutter?: boolean
}

function stopActivationKeyPropagation(e: React.KeyboardEvent): void {
  // Why: the surrounding worktree list handles Enter/Space as row activation.
  // Focused nested buttons need those keys to stay local.
  if (e.key === 'Enter' || e.key === ' ') {
    e.stopPropagation()
  }
}

export const CompactAgentRow = React.memo(function CompactAgentRow({
  agent,
  now,
  onActivate,
  isFocusedPane = false,
  childAgentCount = 0,
  childAgentsExpanded = false,
  onToggleChildAgents,
  reserveDisclosureGutter = false
}: CompactAgentRowProps): React.JSX.Element {
  const agentType = agent.agentType ?? agent.displayAgent ?? 'unknown'
  const activationId = agent.entry.sessionId ?? agent.paneKey
  const dotState = getAgentDotState(agent)
  // Why: Hydra has no dashboard conversation-name store; the tab title / prompt is the row's name.
  const conversationName = agent.terminalTitle?.trim() || agent.prompt?.trim() || null
  const primary = getCompactAgentPrimary(agent, conversationName)
  const secondary = getCompactAgentSecondary(agent, now)
  // Why: sidebar truncation must preserve the passive-vs-active distinction.
  const leadingText = dotState === 'monitoring' ? secondary : primary
  const trailingText =
    dotState === 'monitoring' ? (primary === secondary ? '' : primary) : secondary
  const rowTitle = `${leadingText}${trailingText ? ` - ${trailingText}` : ''}`
  const model = agent.entry.model?.trim() ?? ''
  const shortTime = getCompactAgentTime(agent, now)
  const hasChildDisclosure = childAgentCount > 0
  // Why: subagent child rows carry the child's NAME (e.g. "pr-reviewer") in
  // agentType, which is not an iconable agent and would render the unknown
  // "?" glyph. Nesting under the parent already conveys identity.
  const hideIcon = agent.rowSource === 'subagent'

  const handleActivate = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onActivate?.(activationId)
    },
    [onActivate, activationId]
  )

  const handleToggleChildren = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()
      e.stopPropagation()
      onToggleChildAgents?.()
    },
    [onToggleChildAgents]
  )

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <div
      role="listitem"
      tabIndex={0}
      onClick={handleActivate}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleActivate(e as unknown as React.MouseEvent)
        }
      }}
      className={cn(
        'compact-agent-row group/compact-agent-row flex h-6 min-w-0 cursor-pointer items-center gap-1 overflow-hidden rounded-sm px-1 text-[11px] leading-none select-none',
        isFocusedPane
          ? 'bg-worktree-sidebar-accent text-worktree-sidebar-foreground'
          : 'text-worktree-sidebar-foreground/80 hover:bg-worktree-sidebar-accent/40 hover:text-worktree-sidebar-foreground'
      )}
    >
      {hasChildDisclosure ? (
        <button
          type="button"
          className="compact-agent-child-disclosure-button flex size-4 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-worktree-sidebar-accent hover:text-foreground focus-visible:ring-1 focus-visible:ring-worktree-sidebar-ring focus-visible:outline-none"
          aria-label={`${childAgentsExpanded ? 'Hide' : 'Show'} ${childAgentCount} ${childAgentCount === 1 ? 'agent' : 'agents'}`}
          aria-expanded={childAgentsExpanded}
          onClick={handleToggleChildren}
          onKeyDown={stopActivationKeyPropagation}
        >
          <ChevronRight
            className={cn('size-3 transition-transform', childAgentsExpanded && 'rotate-90')}
            aria-hidden
          />
        </button>
      ) : reserveDisclosureGutter ? (
        <span className="size-4 shrink-0" aria-hidden />
      ) : null}

      <AgentStateDot state={dotState} size="sm" />

      {!hideIcon && (
        <span className="inline-flex shrink-0" title={formatAgentTypeLabel(agentType)}>
          <AgentBrandIcon agentId={agentType} size={13} />
        </span>
      )}

      <span className="min-w-0 flex-1 truncate" title={rowTitle}>
        {/* Why: the selected-row fill is strong enough to wash out the dimmed
            prompt/secondary text, so lift both toward full foreground when focused. */}
        <span className={isFocusedPane ? 'text-foreground' : 'text-muted-foreground/90'}>
          {leadingText}
        </span>
        {trailingText && (
          <span className={isFocusedPane ? 'text-foreground/70' : 'text-muted-foreground/65'}>
            {' '}
            - {trailingText}
          </span>
        )}
      </span>

      {model && (
        <span
          className={cn(
            'min-w-0 max-w-24 truncate font-mono text-[10px]',
            isFocusedPane ? 'text-foreground/70' : 'text-muted-foreground/70'
          )}
          title={model}
        >
          {model}
        </span>
      )}

      {hasChildDisclosure && !childAgentsExpanded && (
        <span
          className={cn(
            'shrink-0 text-[10px] tabular-nums',
            isFocusedPane ? 'text-foreground/70' : 'text-muted-foreground/70'
          )}
        >
          +{childAgentCount}
        </span>
      )}

      {shortTime && (
        <span
          className={cn(
            'shrink-0 text-[10px] tabular-nums',
            // Why: the muted timestamp drops out against the selected-row fill.
            isFocusedPane ? 'text-foreground/70' : 'text-muted-foreground/60'
          )}
        >
          {shortTime}
        </span>
      )}
    </div>
  )
})
