// Adapter over `src/reference/components/onboarding/OnboardingInlineCommandTerminal.tsx`
// (verbatim Orca, pinned in `src/reference/REVISION`).
//
// Rosetta D02c-003 (terminal half): the reference mounts a `TerminalPane` tab
// from the tab store and pastes the command via a terminal event. Hydra has no
// tab store — `TerminalDrawer` owns a session directly (`start_agent_terminal`
// + `send_terminal_input`). This adapter owns a session id, spawns it, renders
// the drawer embedded at a fixed height, and auto-submits the command once the
// PTY produces output. Cleanup kills the session so installer shells never run
// invisibly.
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { Loader2 } from 'lucide-react'
import { TerminalDrawer } from '../TerminalDrawer'
import { translate } from '@/i18n/i18n'

export type InlineCommandTerminalProps = {
  command: string
  title: string
  description?: string
  ariaLabel: string
  terminalHeightPx?: number
  shellOverride?: string
  cwd?: string | null
  onCommandFinished?: (bestEffortExitCode: number | null) => void
  onInteracted?: (method: 'keyboard' | 'pointer') => void
}

const AUTO_INSERT_DELAY_MS = 250

function sessionIdFor(): string {
  return `setup-inline-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function InlineCommandTerminal({
  command,
  title,
  description,
  ariaLabel,
  terminalHeightPx = 240,
  shellOverride,
  cwd,
  onCommandFinished,
  onInteracted
}: InlineCommandTerminalProps): React.JSX.Element {
  void title
  const [sessionId] = useState(sessionIdFor)
  const [ready, setReady] = useState(false)
  const insertedRef = useRef(false)
  const finishedRef = useRef(onCommandFinished)
  finishedRef.current = onCommandFinished

  // Spawn the session on mount; best-effort kill on unmount.
  useEffect(() => {
    let cancelled = false
    void invoke('start_agent_terminal', {
      sessionId,
      executable: shellOverride || 'bash',
      cwd: cwd || null,
      args: []
    })
      .then(() => {
        if (!cancelled) setReady(true)
      })
      .catch(() => {
        if (!cancelled) setReady(true)
      })
    return () => {
      cancelled = true
      void invoke('close_split_terminal', { sessionId }).catch(() => {})
    }
  }, [sessionId, shellOverride, cwd])

  // Auto-submit once the PTY is alive: first output burst means the shell
  // rendered its prompt, mirroring the reference's readiness gate.
  useEffect(() => {
    if (!ready || insertedRef.current) return
    let timer: number | null = null
    const unlistenPromise = listen<{ session_id: string; output: string }>(
      'terminal:output',
      (event) => {
        if (event.payload.session_id !== sessionId || insertedRef.current) return
        insertedRef.current = true
        timer = window.setTimeout(() => {
          void invoke('send_terminal_input', {
            sessionId,
            input: command.trim() + '\n'
          }).catch(() => {})
        }, AUTO_INSERT_DELAY_MS)
      }
    )
    return () => {
      if (timer !== null) window.clearTimeout(timer)
      void unlistenPromise.then((unlisten) => unlisten())
    }
  }, [ready, sessionId, command])

  const handleKeyDown = useCallback(() => onInteracted?.('keyboard'), [onInteracted])
  const handlePointerDown = useCallback(() => onInteracted?.('pointer'), [onInteracted])

  return (
    <div
      className="min-h-0 overflow-hidden rounded-xl border border-border bg-card"
      onKeyDownCapture={handleKeyDown}
      onPointerDownCapture={handlePointerDown}
    >
      {description ? (
        <div className="border-b border-border px-4 py-3">
          <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
        </div>
      ) : null}
      <div className="relative min-h-0 bg-background" style={{ height: terminalHeightPx }}>
        {ready ? (
          <TerminalDrawer sessionId={sessionId} executable={shellOverride || 'bash'} cwd={cwd ?? undefined} />
        ) : (
          <div className="flex h-full items-center justify-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            {translate(
              'auto.components.onboarding.OnboardingInlineCommandTerminal.4123609efd',
              'Starting terminal...'
            )}
          </div>
        )}
      </div>
      <span className="sr-only" aria-label={ariaLabel} />
    </div>
  )
}
