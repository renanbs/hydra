// Agent Dashboard in-window surface.
//
// Orca's Agent Dashboard drawer is a non-modal companion sheet anchored to the sidebar
// edge, exactly like the Workspace Board. Hydra keeps that geometry and interaction
// contract, and lists the agents by state bucket instead of rendering board lanes.
import React, { useCallback, useEffect, useMemo } from 'react'
import { X } from 'lucide-react'
import { translate } from '@/i18n/i18n'
import { cn } from '@/lib/utils'
import { useNow } from '@/hooks/use-now'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { AgentStateDot, type AgentDotState } from '../AgentStateDot'
import type { HydraProject, WorktreeSession } from '../sidebar/types'
import type { HydraSettings } from '../../shared/settings-types'
import type { AgentsThread } from '../sidebar/agents-thread-model'
import { formatCompactDuration } from '../../lib/agent-row-decay-state'
import { useWorkspaceBoardGeometry } from '../sidebar/workspace-board/use-workspace-board-geometry'
import {
  DASHBOARD_BUCKET_ORDER,
  type DashboardBucket,
} from '../../shared/dashboard-buckets'
import { useSidebarUiStore } from '../sidebar/sidebar-ui-store'
import { dashboardBucketLabel } from './dashboard-bucket-label'
import { useAgentDashboardData } from './use-agent-dashboard-data'

/**
 * Why: Escape must dismiss interactive nested overlays before this companion sheet,
 * and the sheet itself is excluded because Radix marks it `role="dialog"` too. Mirrors
 * the board's selector so both companion panels behave the same.
 */
const DASHBOARD_ESCAPE_BLOCKING_OVERLAY_SELECTOR = [
  '[data-slot="dropdown-menu-content"][data-state="open"]',
  '[data-slot="context-menu-content"][data-state="open"]',
  '[data-slot="popover-content"][data-state="open"]',
  '[role="dialog"][data-state="open"]:not([data-agent-dashboard-sheet])',
  '[role="alertdialog"][data-state="open"]',
  '[role="menu"][data-state="open"]',
  '[role="listbox"][data-state="open"]',
].join(', ')

function isTextEntryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }
  if (target.isContentEditable) {
    return true
  }
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

export function dashboardRowDotState(thread: AgentsThread): AgentDotState {
  if (thread.entry.interrupted) {
    return 'interrupted'
  }
  if (thread.state === 'working' && thread.entry.workingMode === 'monitoring') {
    return 'monitoring'
  }
  return thread.state
}

function relativeTime(timestamp: number, now: number): string {
  const delta = Math.max(0, now - timestamp)
  return delta < 60_000 ? 'just now' : `${formatCompactDuration(delta)} ago`
}

function AgentDashboardRow({
  thread,
  now,
  onActivate,
}: {
  thread: AgentsThread
  now: number
  onActivate: (thread: AgentsThread) => void
}): React.JSX.Element {
  const sessionId = thread.sessionId
  const meta = [thread.projectName, thread.branch].filter(Boolean).join(' · ')
  return (
    <button
      type="button"
      disabled={!sessionId}
      onClick={() => onActivate(thread)}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] transition-colors',
        sessionId
          ? 'hover:bg-worktree-sidebar-foreground/8'
          : 'cursor-default opacity-60'
      )}
      title={thread.title}
      data-agent-dashboard-pane={thread.paneKey}
    >
      <AgentStateDot state={dashboardRowDotState(thread)} size="md" />
      <span
        className={cn(
          'min-w-0 flex-1 truncate',
          thread.unread
            ? 'font-medium text-worktree-sidebar-foreground'
            : 'text-worktree-sidebar-foreground/75'
        )}
      >
        {thread.title}
      </span>
      {meta ? (
        <span className="max-w-[38%] shrink-0 truncate text-[10px] text-worktree-sidebar-foreground/45">
          {meta}
        </span>
      ) : null}
      <span className="shrink-0 text-[10px] tabular-nums text-worktree-sidebar-foreground/45">
        {relativeTime(thread.latestTimestamp, now)}
      </span>
    </button>
  )
}

function BucketSection({
  bucket,
  threads,
  now,
  onActivate,
}: {
  bucket: DashboardBucket
  threads: readonly AgentsThread[]
  now: number
  onActivate: (thread: AgentsThread) => void
}): React.JSX.Element {
  return (
    <section className="flex flex-col gap-1" data-agent-dashboard-bucket={bucket}>
      <h3 className="flex items-baseline gap-2 px-2 text-[10px] font-semibold uppercase tracking-wide text-worktree-sidebar-foreground/45">
        <span>{dashboardBucketLabel(bucket)}</span>
        <span className="tabular-nums">{threads.length}</span>
      </h3>
      <div className="flex flex-col gap-0.5">
        {threads.map((thread) => (
          <AgentDashboardRow key={thread.paneKey} thread={thread} now={now} onActivate={onActivate} />
        ))}
      </div>
    </section>
  )
}

export type AgentDashboardDrawerProps = {
  sessions: readonly WorktreeSession[]
  projects: readonly HydraProject[]
  sidebarRef: React.RefObject<HTMLElement | null>
  onSelectSession: (id: string) => void
  /** Live shell settings; the idle bucket is opt-in through this object. */
  settings?: HydraSettings | null
}

export function AgentDashboardDrawer({
  sessions,
  projects,
  sidebarRef,
  onSelectSession,
  settings,
}: AgentDashboardDrawerProps): React.JSX.Element {
  const open = useSidebarUiStore((state) => state.agentDashboardDrawerOpen)
  const setOpen = useSidebarUiStore((state) => state.setAgentDashboardDrawerOpen)
  const showIdle = settings?.experimentalAgentDashboardShowIdle === true
  const now = useNow(30_000, open)
  const geometry = useWorkspaceBoardGeometry(sidebarRef, open)
  // Only while open: the whole thread pipeline stays out of the sidebar's hot path.
  const { groups, counts } = useAgentDashboardData({ sessions, projects, enabled: open })

  const close = useCallback(() => setOpen(false), [setOpen])

  useEffect(() => {
    if (!open) {
      return
    }
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') {
        return
      }
      if (isTextEntryTarget(event.target)) {
        return
      }
      if (document.querySelector(DASHBOARD_ESCAPE_BLOCKING_OVERLAY_SELECTOR)) {
        return
      }
      event.preventDefault()
      close()
    }
    // Non-modal companion panel: focus may sit anywhere, so listen document-wide.
    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [close, open])

  const visibleBuckets = useMemo(
    () =>
      DASHBOARD_BUCKET_ORDER.filter(
        (bucket) => (bucket !== 'idle' || showIdle) && groups[bucket].length > 0
      ),
    [groups, showIdle]
  )
  const total = DASHBOARD_BUCKET_ORDER.reduce(
    (sum, bucket) => sum + (bucket === 'idle' && !showIdle ? 0 : counts[bucket]),
    0
  )

  const handleActivate = useCallback(
    (thread: AgentsThread) => {
      if (!thread.sessionId) {
        return
      }
      onSelectSession(thread.sessionId)
      close()
    },
    [close, onSelectSession]
  )

  const keepOpenForOutsideEvent = (event: {
    preventDefault: () => void
    detail: { originalEvent: Event }
  }): void => {
    const originalEvent = event.detail.originalEvent
    // Why: a dashboard-owned portal (menu, dialog) is not an exit, and neither is
    // the sidebar itself — the entry's own click closes the drawer.
    if (document.querySelector(DASHBOARD_ESCAPE_BLOCKING_OVERLAY_SELECTOR)) {
      event.preventDefault()
      return
    }
    const pointerX =
      'clientX' in originalEvent && typeof originalEvent.clientX === 'number'
        ? originalEvent.clientX
        : null
    if (pointerX !== null && pointerX < geometry.left) {
      event.preventDefault()
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          setOpen(true)
        } else {
          close()
        }
      }}
      modal={false}
    >
      <SheetContent
        side="left"
        className="flex flex-col bg-worktree-sidebar p-0 sm:max-w-none"
        overlayStyle={{
          top: `${geometry.top}px`,
          bottom: `${geometry.bottom}px`,
          left: `${geometry.left}px`,
          pointerEvents: 'none',
        }}
        style={{
          left: `${geometry.left}px`,
          top: `${geometry.top}px`,
          bottom: `${geometry.bottom}px`,
          height: 'auto',
          width: `min(calc(100vw - ${geometry.left}px), 760px)`,
        }}
        data-agent-dashboard-sheet=""
        onOpenAutoFocus={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={keepOpenForOutsideEvent}
        onInteractOutside={keepOpenForOutsideEvent}
      >
        <SheetHeader className="flex-row items-center justify-between border-b border-worktree-sidebar-border px-4 py-3 pr-3">
          <SheetTitle className="flex items-baseline gap-2 text-sm">
            <span>{translate('dashboard.sidebar.dashboardLabel', 'Agent Dashboard')}</span>
            <span className="text-[10px] font-normal tabular-nums text-muted-foreground">
              {total}
            </span>
          </SheetTitle>
          <button
            type="button"
            onClick={close}
            aria-label={translate('dashboard.sidebar.closeDashboard', 'Close agent dashboard')}
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-worktree-sidebar-foreground/8 hover:text-worktree-sidebar-foreground"
          >
            <X className="size-4" />
          </button>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-2">
          {visibleBuckets.length === 0 ? (
            <p className="px-2 py-6 text-center text-[12px] text-muted-foreground">
              {translate('dashboard.sidebar.empty', 'No agents yet.')}
            </p>
          ) : (
            visibleBuckets.map((bucket) => (
              <BucketSection
                key={bucket}
                bucket={bucket}
                threads={groups[bucket]}
                now={now}
                onActivate={handleActivate}
              />
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
