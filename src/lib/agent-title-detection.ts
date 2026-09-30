// src/lib/agent-title-detection.ts
// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)

import type { AgentStatusEntry, AgentStatusState } from '../store/agent-status-types'

const CLAUDE_IDLE = '. '
const CURSOR_NATIVE_TITLE_LOWER = 'cursor agent'
const AGY_AGENT_NAME_RE = /(?<![\w./\\-])agy(?![\w./\\-])|(?<![\w./\\-])antigravity(?![\w./\\-])/i
const BRAILLE_SPINNER_RE = /[\u2800-\u28ff]/
const STRONG_IDLE_KEYWORDS_RE = /(^|[\s|<>])idle(?=\s|$)|(^|[\s|<>])done(?=\s|$)|(^|[\s|<>])waiting(?=\s|$)/i
const STRONG_WORKING_KEYWORDS_RE = /(^|[\s|<>])working(?=\s|$)|(^|[\s|<>])building(?=\s|$)|(^|[\s|<>])compiling(?=\s|$)/i

/** Matches the Pi/OMP static leading brand marker, e.g. "π >", "OMP :", "OMP !". */
function matchPiStateTitle(title: string): string | null {
  const match = /(?:^|[\s|])(π|Pi|OMP)[ \t]+([:!>])(?=\s|$)/i.exec(title)
  return match ? match[2] : null
}

function matchPiStateBrand(title: string): string | null {
  const match = /(?:^|[\s|])(π|Pi|OMP)[ \t]+([:!>])(?=\s|$)/i.exec(title)
  return match ? match[1] : null
}

function isOpenCodeNativeTitle(title: string): boolean {
  return /opencod(e)?/i.test(title) && title.startsWith('. ')
}

/** Port of computeAgentLabel to classify identity (what agent is it?). */
export function getAgentLabelFromTitle(title: string): string | null {
  const brand = matchPiStateBrand(title)
  if (brand) {
    return brand
  }
  if (isOpenCodeNativeTitle(title)) return 'OpenCode'
  if (title.toLowerCase().startsWith('claude') || title.startsWith(CLAUDE_IDLE)) return 'Claude Code'
  if (/gemini/i.test(title)) return 'Gemini CLI'
  if (/codex/i.test(title)) return 'Codex'
  if (/openclaude/i.test(title)) return 'OpenClaude'
  if (/copilot/i.test(title)) return 'GitHub Copilot'
  if (/grok/i.test(title)) return 'Grok'
  if (/devin/i.test(title)) return 'Devin'
  if (AGY_AGENT_NAME_RE.test(title)) return 'Antigravity'
  if (/aider/i.test(title)) return 'Aider'
  if (/cursor/i.test(title) && !title.toLowerCase().startsWith('claude')) {
    if (title.toLowerCase().trim() === CURSOR_NATIVE_TITLE_LOWER) return 'Cursor'
    return 'Cursor'
  }
  return null
}

/** Computes AgentStatusState from a pane title. */
export function detectAgentStatusFromTitle(title: string): AgentStatusState | null {
  if (!title) return null

  // 1. Pi state markers: "π : cwd" or "OMP > cwd"
  const piMarker = matchPiStateTitle(title)
  if (piMarker === ':') return 'working'
  if (piMarker === '!') return 'waiting'
  if (piMarker === '>') return 'idle'

  // 2. OpenCode native title signals
  if (isOpenCodeNativeTitle(title)) {
    return BRAILLE_SPINNER_RE.test(title) ? 'working' : 'idle'
  }

  // 3. Agent name presence
  const agentName = getAgentLabelFromTitle(title)
  if (!agentName) {
    if (title.startsWith(CLAUDE_IDLE)) return 'idle'
    if (BRAILLE_SPINNER_RE.test(title)) return 'working'
    return null
  }

  // 4. Name + state keywords
  if (/waiting|permission|action required/i.test(title)) return 'waiting'
  if (STRONG_IDLE_KEYWORDS_RE.test(title)) return 'idle'
  if (STRONG_WORKING_KEYWORDS_RE.test(title)) return 'working'
  if (BRAILLE_SPINNER_RE.test(title)) return 'working'
  if (title.startsWith(CLAUDE_IDLE)) return 'idle'
  if (title.startsWith('* ')) return 'idle'
  return 'idle'
}

/**
 * Strips status glyphs so a stale working title looks like a plain name-only pane.
 * Used when a pane has gone quiet past the stale window.
 */
export function clearWorkingIndicators(title: string): string {
  const clearedPiStateMarker = title.replace(/(?:^|[\s|])π[ \t]+:^(?=\s|$)/i, '')
  if (clearedPiStateMarker !== title) return clearedPiStateMarker.trim()

  return title
    .replace(/[\u2800-\u28ff]/g, '')
    .replace(STRONG_WORKING_KEYWORDS_RE, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export function buildTitleDerivedAgentRow(args: {
  tabId: string
  paneId: string
  title: string
  now?: number
}): AgentStatusEntry | null {
  const { tabId, paneId, title, now = Date.now() } = args
  const status = detectAgentStatusFromTitle(title)
  const agentType = getAgentLabelFromTitle(title)
  if (!status || !agentType) {
    return null
  }

  const isWaiting = status === 'waiting'
  // Why origin 'title': a pure title projection knows nothing about the live
  // turn state, so it cannot pretend to be working when the name is merely spotted.
  const rowState: AgentStatusState = status === 'waiting' ? 'waiting' : status === 'working' ? 'working' : 'idle'

  return {
    paneKey: `${tabId}::${paneId}`,
    sessionId: tabId,
    worktreePath: '', // resolved by caller from the TabItem
    agentType: agentType,
    state: rowState,
    prompt: agentType,
    updatedAt: now,
    stateStartedAt: now,
    toolName: undefined,
    toolInput: undefined,
    lastAssistantMessage: `${isWaiting ? 'Needs input' : rowState === 'working' ? 'Running' : 'Idle'}`,
    orchestration: {},
  }
}
