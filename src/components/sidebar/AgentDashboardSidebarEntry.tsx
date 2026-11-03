// Ported from Orca `components/sidebar/AgentDashboardSidebarEntry.tsx`.
// The entry is the Agent Dashboard's only sidebar control: it opens the pop-out or the
// in-window drawer and reports the four bucket totals while the experiment is on.
import type { JSX } from 'react'
import { LayoutDashboard } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'
import { AgentQuestionIcon } from '../AgentQuestionIcon'
import { useAgentBucketCounts } from '../dashboard/use-agent-dashboard-data'
import {
  DASHBOARD_BUCKET_ORDER,
  type DashboardBucketCounts,
} from '../../shared/dashboard-buckets'
import { dashboardBucketLabel } from '../dashboard/dashboard-bucket-label'
import type { HydraProject, WorktreeSession } from './types'
import type { HydraSettings } from '../../shared/settings-types'
import { useSidebarUiStore } from './sidebar-ui-store'
import { runAgentDashboardEntryCommand } from './agent-dashboard-entry-command'
import { openAgentDashboardPopout } from '../../lib/agent-dashboard-popout'

const BUCKET_DOT_CLASS: Record<'working' | 'done' | 'idle', string> = {
  working: 'bg-yellow-500',
  done: 'bg-emerald-500',
  idle: 'bg-neutral-500/50',
}

export function DashboardBucketCountsView({
  counts,
  showIdle,
}: {
  counts: DashboardBucketCounts
  showIdle: boolean
}): JSX.Element | null {
  const active = DASHBOARD_BUCKET_ORDER.filter(
    (bucket) => counts[bucket] > 0 && (bucket !== 'idle' || showIdle)
  )
  if (active.length === 0) {
    return null
  }
  return (
    <span className="flex items-center gap-1.5">
      {active.map((bucket) => (
        <span
          key={bucket}
          aria-label={`${dashboardBucketLabel(bucket)}: ${counts[bucket]}`}
          className="inline-flex items-center gap-1 text-[10px] tabular-nums text-worktree-sidebar-foreground/55"
        >
          {bucket === 'attention' ? (
            <AgentQuestionIcon className="size-2.5" />
          ) : (
            <span className={cn('size-1.5 rounded-full', BUCKET_DOT_CLASS[bucket])} />
          )}
          {counts[bucket]}
        </span>
      ))}
    </span>
  )
}

export type AgentDashboardSidebarEntryProps = {
  sessions: readonly WorktreeSession[]
  projects: readonly HydraProject[]
  /**
   * The shell's live settings object. Hydra keeps settings in App state (not the UI
   * store), so the entry reads the experiment flags from the same prop the gating uses.
   */
  settings?: HydraSettings | null
}

export function AgentDashboardSidebarEntry({
  sessions,
  projects,
  settings,
}: AgentDashboardSidebarEntryProps): JSX.Element {
  // Subscribe this row to locale changes before using translate().
  useTranslation()
  const counts = useAgentBucketCounts({ sessions, projects })
  const showIdle = settings?.experimentalAgentDashboardShowIdle === true
  const openAsPopout = settings?.experimentalAgentDashboardMode === 'popout'
  const drawerOpen = useSidebarUiStore((state) => state.agentDashboardDrawerOpen)
  const setDrawerOpen = useSidebarUiStore((state) => state.setAgentDashboardDrawerOpen)

  return (
    <button
      type="button"
      data-contextual-tour-target="agents-sidebar"
      onClick={() =>
        runAgentDashboardEntryCommand({
          mode: openAsPopout ? 'popout' : 'in-window',
          drawerOpen,
          openPopout: openAgentDashboardPopout,
          setDrawerOpen,
        })
      }
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] font-medium tracking-tight transition-colors',
        'text-worktree-sidebar-foreground/60 hover:bg-worktree-sidebar-foreground/8'
      )}
    >
      <LayoutDashboard
        className="size-4 shrink-0 text-worktree-sidebar-foreground/30"
        strokeWidth={1.75}
      />
      <span className="flex-1">
        {translate('dashboard.sidebar.dashboardLabel', 'Agent Dashboard')}
      </span>
      <DashboardBucketCountsView counts={counts} showIdle={showIdle} />
    </button>
  )
}
