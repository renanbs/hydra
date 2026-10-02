// Hydra sidecar entry: routes core→sidecar `{paneKey,source,body}` lines
// through Orca's `normalizeHookPayload` (claude + codex v1 scope) and prints
// the result sidecar→core. Version handshake on the first line is handled in
// main.ts: mismatch = stderr + exit 2, never blind parsing.

import { normalizeHookPayload } from './normalize/agent-hook-listener'
import type { HookListenerState } from './normalize/agent-hook-listener/listener-state'
import { isAgentHookSource } from './normalize/agent-hook-relay'
import type { ParsedAgentStatusPayload } from './normalize/agent-status-types'

export const SIDECAR_PROTOCOL_VERSION = '1';

export const SIDECAR_HANDSHAKE_PROTOCOL = 'hydra-hook-sidecar';

export type SidecarInput = {
  paneKey: string;
  source: string;
  body: unknown;
};

export type SidecarOutput =
  | { paneKey: string; payload: ParsedAgentStatusPayload | null }
  | { paneKey: string; payload: null; dropped: true };

/**
 * Normalize one core→sidecar line into the sidecar→core object to print.
 * Returns `{paneKey, payload: null, dropped: true}` for non-v1 sources;
 * throws on malformed hook lines so the caller can log-and-continue per line.
 */
export function normalizeSidecarLine(
  state: HookListenerState,
  line: unknown,
  expectedEnv: string
): SidecarOutput {
  if (typeof line !== 'object' || line === null) {
    throw new Error('sidecar input line must be a JSON object');
  }
  const { paneKey, source, body } = line as Partial<SidecarInput>;
  if (typeof paneKey !== 'string' || paneKey.length === 0) {
    throw new Error('sidecar input line is missing paneKey');
  }
  if (!isAgentHookSource(source)) {
    throw new Error(`unsupported hook source: ${String(source)}`);
  }
  if (source !== 'claude' && source !== 'codex') {
    return { paneKey, payload: null, dropped: true };
  }
  const event = normalizeHookPayload(state, source, body, expectedEnv);
  if (!event) {
    return { paneKey, payload: null };
  }
  return { paneKey, payload: event.payload };
}
