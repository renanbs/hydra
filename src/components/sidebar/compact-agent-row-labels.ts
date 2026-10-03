// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// src/renderer/src/components/sidebar/worktree-card-compact-agent-row.tsx (helpers)
import { agentStateLabel, type AgentDotState } from '../AgentStateDot'
import { formatAgentTypeLabel } from '../../shared/agent-type-label'
import {
  ORCA_DISPATCH_STATUS_TASK_MARKER,
  findOrcaDispatchTaskMarkerIndex,
  isOrcaDispatchStatusPrompt
} from '../../shared/orca-dispatch-status-prompt'
import { agentNoUpdateLabel, type AgentRowState } from '../../lib/agent-row-decay-state'
import { agentRowDotState } from '../../lib/agent-row-dot-state'
import { formatAgentToolPreview } from '../../lib/agent-row-tool-preview'
import { formatShortTimeAgo } from '../../lib/short-time-ago'
import { lastEnteredDoneAt } from './agent-finished-timestamp'
import type { AgentRow } from './worktree-card-agent-summary'

const ORCA_DISPATCH_TASK_ID_MARKER = 'Your task ID is:'
// Why: match deriveGeneratedTabTitle's scan budget — previews only need the
// first non-empty task line, not the rest of a paste-sized worker prompt.
const ORCA_DISPATCH_TASK_PREVIEW_SCAN_LIMIT = 512
// Why: task id lives near the top of the preamble; keep that scan tight.
const ORCA_DISPATCH_TASK_ID_SCAN_LIMIT = 1024
// Why: === TASK === sits after CLI instructions (a few KB). Cap the search so a
// malformed multi-MB prompt without a marker never full-scans the task body.
const ORCA_DISPATCH_TASK_MARKER_SCAN_LIMIT = 32_768

/** The dot state Orca derives for the row: an interrupt wins, otherwise the state (+ monitoring). */
export function getAgentDotState(agent: AgentRow): AgentDotState {
  if (agent.entry.interrupted === true) {
    return 'interrupted'
  }
  const state = (agent.state ?? agent.entry.state) as AgentRowState
  return agentRowDotState(state, agent.entry.workingMode)
}

function getOrcaDispatchTaskId(prompt: string): string | null {
  if (!isOrcaDispatchStatusPrompt(prompt)) {
    return null
  }
  const scan = prompt.trimStart().slice(0, ORCA_DISPATCH_TASK_ID_SCAN_LIMIT)
  const markerIndex = scan.indexOf(ORCA_DISPATCH_TASK_ID_MARKER)
  if (markerIndex === -1) {
    return null
  }
  // Why: delimit on the first whitespace, not just a newline. The task id is a
  // whitespace-free token, and by the time this parses a live status prompt the
  // trailing newline has been folded to a space by normalizeSingleLinePreview —
  // splitting on \n alone would return the id plus the rest of the preamble.
  const afterMarker = scan.slice(markerIndex + ORCA_DISPATCH_TASK_ID_MARKER.length).trimStart()
  const idEnd = afterMarker.search(/\s/)
  const idLine = idEnd === -1 ? afterMarker : afterMarker.slice(0, idEnd)
  return idLine || null
}

function getOrcaDispatchTaskPreview(prompt: string): string {
  // Why: sidebar rows call this during render; never full-trim/split paste-sized
  // dispatch prompts — only scan bounded windows for the marker and first line.
  if (!isOrcaDispatchStatusPrompt(prompt)) {
    return ''
  }
  const scan = prompt
    .trimStart()
    .slice(0, ORCA_DISPATCH_TASK_MARKER_SCAN_LIMIT + ORCA_DISPATCH_TASK_PREVIEW_SCAN_LIMIT)
  // Why: share the normalizer's standalone-line marker rule. A naive indexOf
  // would treat base-drift commit subjects that mention `=== TASK ===` as the
  // real separator when helpers are called with raw multi-line preambles.
  const taskMarkerIndex = findOrcaDispatchTaskMarkerIndex(scan)
  if (taskMarkerIndex === -1) {
    return ''
  }
  const taskBodyStart = taskMarkerIndex + ORCA_DISPATCH_STATUS_TASK_MARKER.length
  const taskBody = scan.slice(taskBodyStart, taskBodyStart + ORCA_DISPATCH_TASK_PREVIEW_SCAN_LIMIT)
  for (const line of taskBody.split(/\r?\n/)) {
    const preview = line.trim().replace(/\s+/g, ' ')
    if (preview) {
      return preview
    }
  }
  return ''
}

/**
 * True when orchestration labels may label the live dispatch turn.
 * Reject only when both sides expose a taskId and they differ — sticky completed
 * metadata must not rename a later dispatch. When the live prompt is truncated
 * (agent-status fields are short) and has no parseable taskId, trust labels.
 */
export function orchestrationLabelsMatchLiveDispatch(
  entry: Pick<AgentRow['entry'], 'orchestration' | 'prompt'>
): boolean {
  if (!isOrcaDispatchStatusPrompt(entry.prompt)) {
    return false
  }
  const orchestrationTaskId = entry.orchestration?.taskId?.trim()
  if (!orchestrationTaskId) {
    return false
  }
  const liveTaskId = getOrcaDispatchTaskId(entry.prompt)
  if (!liveTaskId) {
    return true
  }
  return liveTaskId === orchestrationTaskId
}

export function getAgentRowPrimaryText(
  entry: Pick<AgentRow['entry'], 'orchestration' | 'prompt'>
): string {
  // Why: prefer richer orchestration labels when they match the live dispatch,
  // then fall back to the TASK-body preview. Never surface the lifecycle
  // preamble itself — status prompts are single-line ~200-char folds, and the
  // first characters are boilerplate ("You are working inside Orca…").
  if (orchestrationLabelsMatchLiveDispatch(entry)) {
    return (
      entry.orchestration?.displayName?.trim() ||
      entry.orchestration?.taskTitle?.trim() ||
      getOrcaDispatchTaskPreview(entry.prompt)
    )
  }
  if (isOrcaDispatchStatusPrompt(entry.prompt)) {
    return getOrcaDispatchTaskPreview(entry.prompt)
  }
  return entry.prompt.trim()
}

export function getCompactAgentPrimary(agent: AgentRow, conversationName: string | null): string {
  const prompt = conversationName ?? getAgentRowPrimaryText(agent.entry)
  return prompt || agentStateLabel(getAgentDotState(agent))
}

export function getCompactAgentSecondary(
  agent: AgentRow,
  now: number,
  lastAssistantMessageOverride?: string
): string {
  const state = (agent.state ?? agent.entry.state) as AgentRowState
  if (agent.entry.interrupted === true) {
    return 'Interrupted by user'
  }
  // Why: the only honest thing to say about a pane Orca still holds but no longer hears
  // from is how long the silence has run; the user supplies the meaning.
  if (state === 'unverifiable') {
    return agentNoUpdateLabel(agent.entry, now)
  }
  // Why: the lead turn is over in monitoring, so its last tool line is stale; name the state instead.
  if (state === 'working' && agent.entry.workingMode === 'monitoring') {
    return agentStateLabel('monitoring')
  }
  const toolPreview = formatAgentToolPreview(agent.entry, state)
  if (toolPreview) {
    return toolPreview
  }
  const lastAssistantMessage =
    lastAssistantMessageOverride ?? agent.entry.lastAssistantMessage?.trim()
  if (lastAssistantMessage) {
    return lastAssistantMessage
  }
  // Why: child rows without descriptions use their role as primary text; repeating its formatted label adds no information.
  if (agent.rowSource === 'subagent' && agent.entry.prompt?.trim() === agent.agentType?.trim()) {
    return ''
  }
  return formatAgentTypeLabel(agent.agentType)
}

export function getCompactAgentTime(agent: AgentRow, now: number): string | null {
  const doneAt = lastEnteredDoneAt(agent)
  if (doneAt !== null) {
    return formatShortTimeAgo(doneAt, now)
  }
  const startedAt = (agent.startedAt ?? 0) > 0 ? (agent.startedAt as number) : agent.entry.stateStartedAt
  return startedAt > 0 ? formatShortTimeAgo(startedAt, now) : null
}
