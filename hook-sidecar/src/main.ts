// Hydra hook-sidecar stdio loop.
//
// Line protocol (JSON per line, UTF-8):
//   core→sidecar first line:  {protocol:"hydra-hook-sidecar", version:"1", env:"production"}
//   core→sidecar hook lines:  {paneKey, source, body}
//   sidecar→core result:     {paneKey, payload: ParsedAgentStatusPayload|null}
// Version mismatch = stderr + exit 2, never blind parsing.

import { createInterface } from 'node:readline';
import { createHookListenerState } from './normalize/agent-hook-listener/listener-state';
import {
  SIDECAR_HANDSHAKE_PROTOCOL,
  SIDECAR_PROTOCOL_VERSION,
  normalizeSidecarLine
} from './normalize-entry';

async function main(): Promise<void> {
  const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
  let handshake: { version?: unknown; env?: unknown } | null = null;
  let expectedEnv = '';
  const state = createHookListenerState();

  for await (const raw of rl) {
    const line = raw.trim();
    if (line.length === 0) {
      continue;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch (error) {
      console.error(`[hook-sidecar] dropping unparseable line: ${(error as Error).message}`);
      continue;
    }
    if (handshake === null) {
      const record = (typeof parsed === 'object' && parsed !== null ? parsed : {}) as Record<
        string,
        unknown
      >;
      if (record.protocol !== SIDECAR_HANDSHAKE_PROTOCOL) {
        console.error('[hook-sidecar] first line must be the version handshake');
        process.exit(2);
      }
      if (record.version !== SIDECAR_PROTOCOL_VERSION) {
        console.error(
          `[hook-sidecar] protocol version mismatch: got ${JSON.stringify(record.version)}, want ${JSON.stringify(SIDECAR_PROTOCOL_VERSION)}`
        );
        process.exit(2);
      }
      handshake = record;
      expectedEnv = typeof record.env === 'string' ? record.env : '';
      continue;
    }
    try {
      const output = normalizeSidecarLine(state, parsed, expectedEnv);
      process.stdout.write(`${JSON.stringify(output)}\n`);
    } catch (error) {
      console.error(`[hook-sidecar] dropping malformed line: ${(error as Error).message}`);
    }
  }
}

void main();
