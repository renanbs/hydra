// Agent Dashboard pop-out window.
//
// This module is the whole renderer of the second Tauri window: it must not import the
// app store or the sidebar (those belong to the main window and would mount the entire
// shell). It asks the main window for a snapshot and renders that plain data.
import type { JSX } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { translate } from '@/i18n/i18n'
import { cn } from '@/lib/utils'
import { AgentStateDot } from '../AgentStateDot'
import {
  DASHBOARD_BUCKET_ORDER,
  type DashboardBucket,
} from '../../shared/dashboard-buckets'
import {
  isAgentDashboardPopoutSnapshot,
  type AgentDashboardPopoutRow,
  type AgentDashboardPopoutSnapshot,
} from '../../shared/agent-dashboard-snapshot'
import {
  AGENT_DASHBOARD_CLOSED_EVENT,
  AGENT_DASHBOARD_REVEAL_EVENT,
  AGENT_DASHBOARD_SNAPSHOT_EVENT,
  AGENT_DASHBOARD_SNAPSHOT_REQUEST_EVENT,
  closeAgentDashboardPopoutWindow,
  emitToAgentDashboardMain,
  focusAgentDashboardMainWindow,
  listenAgentDashboardEvent,
} from '../../lib/agent-dashboard-popout'
import { dashboardBucketLabel } from './dashboard-bucket-label'

function PopoutRow({ row }: { row: AgentDashboardPopoutRow }): JSX.Element {
  const reveal = useCallback(() => {
    if (!row.sessionId) {
      return
    }
    void emitToAgentDashboardMain(AGENT_DASHBOARD_REVEAL_EVENT, { sessionId: row.sessionId })
    void focusAgentDashboardMainWindow()
  }, [row.sessionId])

  return (
    <button
      type="button"
      disabled={!row.sessionId}
      onClick={reveal}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] transition-colors',
        row.sessionId ? 'hover:bg-muted' : 'cursor-default opacity-60'
      )}
      title={row.title}
      data-agent-dashboard-pane={row.paneKey}
    >
      <AgentStateDot state={row.state} size="md" />
      <span className={cn('min-w-0 flex-1 truncate', row.unread && 'font-medium')}>
        {row.title}
      </span>
      <span className="max-w-[38%] shrink-0 truncate text-[10px] text-muted-foreground">
        {[row.projectName, row.branch].filter(Boolean).join(' · ')}
      </span>
    </button>
  )
}

function Bucket({ bucket, rows }: { bucket: DashboardBucket; rows: AgentDashboardPopoutRow[] }): JSX.Element {
  return (
    <section className="flex flex-col gap-1" data-agent-dashboard-bucket={bucket}>
      <h2 className="flex items-baseline gap-2 px-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span>{dashboardBucketLabel(bucket)}</span>
        <span className="tabular-nums">{rows.length}</span>
      </h2>
      <div className="flex flex-col gap-0.5">
        {rows.map((row) => (
          <PopoutRow key={row.paneKey} row={row} />
        ))}
      </div>
    </section>
  )
}

export default function AgentDashboardPopoutWindow(): JSX.Element {
  const [snapshot, setSnapshot] = useState<AgentDashboardPopoutSnapshot | null>(null)

  const requestSnapshot = useCallback(() => {
    void emitToAgentDashboardMain(AGENT_DASHBOARD_SNAPSHOT_REQUEST_EVENT)
  }, [])

  useEffect(() => {
    let active = true
    const unlisteners: Array<() => void> = []
    const track = (pending: Promise<() => void>): void => {
      void pending.then((unlisten) => {
        if (active) {
          unlisteners.push(unlisten)
        } else {
          unlisten()
        }
      })
    }

    track(
      listenAgentDashboardEvent(AGENT_DASHBOARD_SNAPSHOT_EVENT, (payload) => {
        if (isAgentDashboardPopoutSnapshot(payload)) {
          setSnapshot(payload)
        }
      })
    )
    requestSnapshot()

    // Why visibility: the pop-out may be backgrounded while agents change. Re-asking
    // on focus turns that into one snapshot instead of a permanent event stream.
    const handleVisibility = (): void => {
      if (document.visibilityState === 'visible') {
        requestSnapshot()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      active = false
      document.removeEventListener('visibilitychange', handleVisibility)
      for (const unlisten of unlisteners) {
        unlisten()
      }
      void emitToAgentDashboardMain(AGENT_DASHBOARD_CLOSED_EVENT)
    }
  }, [requestSnapshot])

  const grouped = useMemo(() => {
    const groups: Record<DashboardBucket, AgentDashboardPopoutRow[]> = {
      attention: [],
      working: [],
      done: [],
      idle: [],
    }
    for (const row of snapshot?.rows ?? []) {
      groups[row.bucket].push(row)
    }
    const sorted = (rows: AgentDashboardPopoutRow[]): AgentDashboardPopoutRow[] =>
      rows.sort((a, b) => b.updatedAt - a.updatedAt)
    for (const bucket of DASHBOARD_BUCKET_ORDER) {
      sorted(groups[bucket])
    }
    return groups
  }, [snapshot])

  const visibleBuckets = DASHBOARD_BUCKET_ORDER.filter((bucket) => grouped[bucket].length > 0)

  return (
    <div
      className="flex h-screen w-screen flex-col bg-background text-foreground"
      data-agent-dashboard-popout=""
    >
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h1 className="text-sm font-medium">
          {translate('dashboard.sidebar.dashboardLabel', 'Agent Dashboard')}
        </h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={requestSnapshot}
            className="rounded px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {translate('dashboardPopout.refresh', 'Refresh')}
          </button>
          <button
            type="button"
            onClick={() => void closeAgentDashboardPopoutWindow()}
            aria-label={translate('dashboardPopout.close', 'Close agent dashboard')}
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-2">
        {snapshot === null ? (
          <p className="px-2 py-6 text-center text-[12px] text-muted-foreground">
            {translate('dashboardPopout.waiting', 'Waiting for the main window…')}
          </p>
        ) : visibleBuckets.length === 0 ? (
          <p className="px-2 py-6 text-center text-[12px] text-muted-foreground">
            {translate('dashboard.sidebar.empty', 'No agents yet.')}
          </p>
        ) : (
          visibleBuckets.map((bucket) => (
            <Bucket key={bucket} bucket={bucket} rows={grouped[bucket]} />
          ))
        )}
      </main>
    </div>
  )
}
