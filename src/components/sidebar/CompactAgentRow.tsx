// src/components/sidebar/CompactAgentRow.tsx
import React, { useCallback } from 'react'
import { ChevronRight } from 'lucide-react'
import { AgentBrandIcon } from '../AgentIcon'
import { AgentStateDot } from '../AgentStateDot'

import type { AgentRow } from './worktree-card-agent-summary'

export interface CompactAgentRowProps {
  agent: AgentRow
  onActivate?: (id: string) => void
  isFocusedPane?: boolean
  childAgentCount?: number
  childAgentsExpanded?: boolean
  onToggleChildAgents?: () => void
}

export const CompactAgentRow = React.memo(function CompactAgentRow({
  agent,
  onActivate,
  isFocusedPane = false,
  childAgentCount = 0,
  childAgentsExpanded = false,
  onToggleChildAgents,
}: CompactAgentRowProps): React.JSX.Element {
  const status = agent.status ?? agent.state ?? 'unknown'
  const agentType = agent.agentType ?? agent.displayAgent ?? 'unknown'
  const displayLabel = agent.prompt ?? agent.entry.prompt ?? agentType
  const activationId = agent.entry.sessionId ?? agent.paneKey

  const handleActivate = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onActivate?.(activationId)
    },
    [onActivate, activationId]
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
      className={`
        group/agent-row relative flex items-center gap-1.5 min-w-0 rounded-sm px-1.5 py-[3px] cursor-pointer select-none
        ${isFocusedPane 
          ? 'bg-worktree-sidebar-accent/80 text-worktree-sidebar-foreground' 
          : 'hover:bg-worktree-sidebar-accent/40 text-worktree-sidebar-foreground/80 hover:text-worktree-sidebar-foreground'
        }
      `}
    >
      {/* Child disclosure chevron */}
      {childAgentCount > 0 && (
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
        <span
          role="button"
          tabIndex={-1}
          onClick={(e) => {
            e.stopPropagation()
            onToggleChildAgents?.()
          }}
          className="inline-flex shrink-0 size-3 items-center justify-center pr-0.5 text-muted-foreground hover:text-foreground"
        >
          <ChevronRight className={`size-2.5 transition-transform ${childAgentsExpanded ? 'rotate-90' : ''}`} />
        </span>
      )}
      {childAgentCount === 0 && (
        <span className="inline-block shrink-0 size-3" />
      )}

      {/* AgentStateDot */}
      <AgentStateDot state={status as 'working' | 'monitoring' | 'blocked' | 'waiting' | 'interrupted' | 'failed' | 'done' | 'idle' | 'unverifiable' | 'permission'} size="sm" />

      {/* Agent Brand Icon */}
      {agent.rowSource !== 'subagent' && (
        <AgentBrandIcon agentId={agentType} size={13} />
      )}

      {/* Prompt/Text Label */}
      <span className="block min-w-0 flex-1 truncate text-[11px] leading-none" title={displayLabel}>
        {displayLabel}
      </span>

      {/* Collapsed child badge */}
      {childAgentCount > 0 && !childAgentsExpanded && (
        <span className="shrink-0 text-[10px] font-mono text-muted-foreground">
          +{childAgentCount}
        </span>
      )}
    </div>
  )
})
