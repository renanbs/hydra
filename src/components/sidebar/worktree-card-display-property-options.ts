// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/sidebar-workspace-option-items.ts
// The card display menu's stable option lists. `id` values match Orca's persisted
// preference names so a profile written by either app survives the trip.
import type { AgentActivityDisplayMode, WorktreeCardProperty } from '../../shared/ui-chrome-types'
import { TASK_WORKTREE_CARD_PROPERTIES } from '../../shared/worktree/card-properties'
import { translate } from '@/i18n/i18n'

/**
 * Orca `PROPERTY_OPTIONS` labels, one catalog so the display menu, the card and
 * any future surface cannot drift on a property's name. Keys live under the
 * shared `auto.components.sidebar` namespace and fall back to English.
 */
export function getWorktreeCardPropertyLabel(
  property: WorktreeCardProperty | 'status' | 'branch' | 'cli' | 'tasks'
): string {
  switch (property) {
    case 'status':
      return translate(
        'auto.components.sidebar.worktreeCardDisplayPropertyOptions.status',
        'Status'
      )
    case 'issue':
      return translate(
        'auto.components.sidebar.worktreeCardDisplayPropertyOptions.issue',
        'GitHub ticket'
      )
    case 'linear-issue':
      return translate(
        'auto.components.sidebar.worktreeCardDisplayPropertyOptions.linear',
        'Linear issue'
      )
    case 'jira-issue':
      return translate(
        'auto.components.sidebar.worktreeCardDisplayPropertyOptions.jira',
        'Jira issue'
      )
    case 'pr':
      return translate(
        'auto.components.sidebar.worktreeCardDisplayPropertyOptions.pr',
        'PR/MR link'
      )
    case 'automation':
      return translate(
        'auto.components.sidebar.worktreeCardDisplayPropertyOptions.automation',
        'Automation'
      )
    case 'cli':
      return translate('auto.components.sidebar.worktreeCardDisplayPropertyOptions.cli', 'CLI')
    case 'comment':
      return translate(
        'auto.components.sidebar.worktreeCardDisplayPropertyOptions.comment',
        'Notes'
      )
    case 'ports':
      return translate(
        'auto.components.sidebar.worktreeCardDisplayPropertyOptions.ports',
        'Ports'
      )
    case 'inline-agents':
      return translate(
        'auto.components.sidebar.worktreeCardDisplayPropertyOptions.agents',
        'Agent activity'
      )
    case 'branch':
      return translate(
        'auto.components.sidebar.worktreeCardDisplayPropertyOptions.branch',
        'Branch name'
      )
    case 'tasks':
      return translate(
        'auto.components.sidebar.worktreeCardDisplayPropertyOptions.tasks',
        'Tasks'
      )
    case 'ci':
    case 'unread':
      return translate(
        'auto.components.sidebar.worktreeCardDisplayPropertyOptions.other',
        'Status'
      )
  }
}

export const GROUP_BY_OPTIONS = [
  { id: 'none', label: 'None', dataId: 'c2c7a45cda' },
  { id: 'workspace-status', label: 'Status', dataId: 'e029a2d775' },
  { id: 'pr-status', label: 'PR', dataId: '0f9b959b31' },
  { id: 'repo', label: 'Project', dataId: '2170d553cf' },
] as const

export const CARD_LAYOUT_OPTIONS = [
  { id: 'detailed', label: 'Detailed' },
  { id: 'compact', label: 'Compact' },
] as const

export const AGENT_ACTIVITY_DISPLAY_OPTIONS: {
  id: AgentActivityDisplayMode
  label: string
}[] = [
  { id: 'compact', label: 'Compact' },
  { id: 'full', label: 'Full list' },
]

export const SORT_OPTIONS = [
  { id: 'name', label: 'Name', description: null },
  {
    id: 'smart',
    label: 'Agent Activity',
    description: 'Agents that need attention, then most recent activity.',
  },
  { id: 'recent', label: 'Recent', description: null },
  { id: 'repo', label: 'Project', description: null },
  {
    id: 'manual',
    label: 'Manual',
    description: 'Drag workspaces to arrange them within each group.',
  },
] as const

export const PROJECT_ORDER_OPTIONS = [
  { id: 'manual', label: 'Manual', description: 'Drag projects to arrange them' },
  { id: 'recent', label: 'Recent', description: 'Most recent workspace activity' },
] as const

export const PROPERTY_OPTIONS: { id: WorktreeCardProperty; label: string }[] = [
  { id: 'issue', label: getWorktreeCardPropertyLabel('issue') },
  { id: 'linear-issue', label: getWorktreeCardPropertyLabel('linear-issue') },
  { id: 'jira-issue', label: getWorktreeCardPropertyLabel('jira-issue') },
  { id: 'pr', label: getWorktreeCardPropertyLabel('pr') },
  { id: 'automation', label: getWorktreeCardPropertyLabel('automation') },
  { id: 'comment', label: getWorktreeCardPropertyLabel('comment') },
  { id: 'ports', label: getWorktreeCardPropertyLabel('ports') },
  { id: 'inline-agents', label: getWorktreeCardPropertyLabel('inline-agents') },
]

export type WorktreeCardPropertyOption = {
  id: string
  properties: readonly WorktreeCardProperty[]
  label: string
}

const BASE_WORKTREE_CARD_PROPERTY_OPTIONS: WorktreeCardPropertyOption[] = [
  { id: 'status', properties: ['status'], label: 'Status' },
  { id: 'comment', properties: ['comment'], label: 'Notes' },
  { id: 'automation', properties: ['automation'], label: 'Automation' },
  { id: 'cli', properties: ['cli'], label: 'Orca CLI' },
  { id: 'ports', properties: ['ports'], label: 'Ports' },
  { id: 'inline-agents', properties: ['inline-agents'], label: 'Agent statuses' },
  { id: 'branch', properties: ['branch'], label: 'Branch name' },
]

const TASK_WORKTREE_CARD_PROPERTY_OPTION: WorktreeCardPropertyOption = {
  id: 'tasks',
  properties: TASK_WORKTREE_CARD_PROPERTIES,
  label: 'Tasks',
}

const ISSUE_WORKTREE_CARD_PROPERTY_OPTIONS: WorktreeCardPropertyOption[] = [
  { id: 'issue', properties: ['issue'], label: 'GitHub issues' },
  { id: 'linear-issue', properties: ['linear-issue'], label: 'Linear issues' },
  { id: 'jira-issue', properties: ['jira-issue'], label: 'Jira issues' },
]

/**
 * Orca `getWorktreeCardPropertyOptions`: the new card style splits the task
 * providers and can label the identity row for folder-bearing project groups.
 */
export function getWorktreeCardPropertyOptions({
  newCardStyle = false,
  hasProjectGroups = false,
}: {
  newCardStyle?: boolean
  hasProjectGroups?: boolean
} = {}): WorktreeCardPropertyOption[] {
  const issueOptions = newCardStyle
    ? ISSUE_WORKTREE_CARD_PROPERTY_OPTIONS
    : [TASK_WORKTREE_CARD_PROPERTY_OPTION]
  const branchOption: WorktreeCardPropertyOption = {
    id: 'branch',
    properties: ['branch'],
    label:
      newCardStyle && hasProjectGroups ? 'Branch / folder path' : 'Branch name',
  }
  if (newCardStyle) {
    return [...issueOptions, ...BASE_WORKTREE_CARD_PROPERTY_OPTIONS.slice(1, -1), branchOption]
  }
  return [
    BASE_WORKTREE_CARD_PROPERTY_OPTIONS[0],
    ...issueOptions,
    ...BASE_WORKTREE_CARD_PROPERTY_OPTIONS.slice(1, -1),
    branchOption,
  ]
}
