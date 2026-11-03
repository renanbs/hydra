// Main-window side of the Agent Dashboard pop-out.
//
// The pop-out is a separate webview with its own store, so it cannot read agent status
// directly. It announces itself with a snapshot request; this publisher then keeps it
// current while it stays open. Nothing is computed or emitted until a pop-out asks —
// users who never open the window pay no threading cost (Orca's performance isolation
// test has the same intent).
import { useEffect, useMemo, useRef, useState } from 'react'
import type { HydraProject, WorktreeSession } from '../sidebar/types'
import { useAgentDashboardData } from './use-agent-dashboard-data'
import { toAgentDashboardPopoutRows } from './agent-dashboard-groups'
import type { AgentDashboardPopoutSnapshot } from '../../shared/agent-dashboard-snapshot'
import {
  AGENT_DASHBOARD_CLOSED_EVENT,
  AGENT_DASHBOARD_REVEAL_EVENT,
  AGENT_DASHBOARD_SNAPSHOT_EVENT,
  AGENT_DASHBOARD_SNAPSHOT_REQUEST_EVENT,
  emitToAgentDashboardPopout,
  isAgentDashboardPopoutOpen,
  listenAgentDashboardEvent,
} from '../../lib/agent-dashboard-popout'

export type AgentDashboardSnapshotPublisherProps = {
  sessions: readonly WorktreeSession[]
  projects: readonly HydraProject[]
  /** Reveal the agent's terminal in the main window (row click in the pop-out). */
  onRevealSession: (sessionId: string) => void
}

export function AgentDashboardSnapshotPublisher({
  sessions,
  projects,
  onRevealSession,
}: AgentDashboardSnapshotPublisherProps): null {
  const [subscribed, setSubscribed] = useState(false)
  // Bumped on every request so a pop-out that is already subscribed still gets an answer
  // through the publish effect, after the first snapshot has been computed.
  const [requestEpoch, setRequestEpoch] = useState(0)
  const { threads } = useAgentDashboardData({ sessions, projects, enabled: subscribed })

  const snapshot = useMemo<AgentDashboardPopoutSnapshot>(
    () => ({ rows: toAgentDashboardPopoutRows(threads), generatedAt: Date.now() }),
    [threads]
  )
  // Why a ref: App recreates the reveal handler every render; resubscribing the Tauri
  // listener on each of those would churn window events for no behavior change.
  const onRevealRef = useRef(onRevealSession)
  onRevealRef.current = onRevealSession

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
      listenAgentDashboardEvent(AGENT_DASHBOARD_SNAPSHOT_REQUEST_EVENT, () => {
        setSubscribed(true)
        setRequestEpoch((epoch) => epoch + 1)
      })
    )
    track(
      listenAgentDashboardEvent(AGENT_DASHBOARD_CLOSED_EVENT, () => {
        setSubscribed(false)
      })
    )
    track(
      listenAgentDashboardEvent<{ sessionId?: unknown }>(
        AGENT_DASHBOARD_REVEAL_EVENT,
        (payload) => {
          if (typeof payload?.sessionId === 'string' && payload.sessionId) {
            onRevealRef.current(payload.sessionId)
          }
        }
      )
    )

    return () => {
      active = false
      for (const unlisten of unlisteners) {
        unlisten()
      }
    }
  }, [])

  useEffect(() => {
    if (!subscribed) {
      return
    }
    void emitToAgentDashboardPopout(AGENT_DASHBOARD_SNAPSHOT_EVENT, snapshot)
  }, [requestEpoch, snapshot, subscribed])

  // Why the presence poll: a native window close destroys the pop-out renderer without
  // running React cleanup, so its `closed` event never arrives. Only while subscribed,
  // a 2s label check turns that into "stop maintaining the dashboard pipeline".
  useEffect(() => {
    if (!subscribed) {
      return
    }
    const interval = window.setInterval(() => {
      void isAgentDashboardPopoutOpen().then((open) => {
        if (!open) {
          setSubscribed(false)
        }
      })
    }, 2000)
    return () => window.clearInterval(interval)
  }, [subscribed])

  return null
}
