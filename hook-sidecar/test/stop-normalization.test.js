// T5 TDD failing test: recorded Claude Stop → state done + toolName kept.
// Fixture shape mirrors Orca's `buildBody` + lead PreToolUse→Stop sequence
// (server-claude-normalization.test.ts): Stop carries no tool fields, so the
// merged snapshot must keep the earlier PreToolUse values.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHookListenerState } from '../dist/normalize/agent-hook-listener/listener-state.js';
import { normalizeSidecarLine } from '../dist/normalize-entry.js';

const PANE = 'sess-abc-123';

function body(payload) {
  return {
    paneKey: PANE,
    tabId: undefined,
    worktreeId: 'wt-1',
    env: 'production',
    payload
  };
}

describe('claude Stop normalization (recorded)', () => {
  it('keeps PreToolUse toolName/toolInput on the Stop done payload', () => {
    const state = createHookListenerState();
    const pre = normalizeSidecarLine(
      state,
      {
        paneKey: PANE,
        source: 'claude',
        body: body({
          hook_event_name: 'PreToolUse',
          tool_name: 'Bash',
          tool_input: { command: 'ls -la' }
        })
      },
      'production'
    );
    assert.equal(pre.payload?.state, 'working');
    assert.equal(pre.payload?.toolName, 'Bash');

    const stop = normalizeSidecarLine(
      state,
      { paneKey: PANE, source: 'claude', body: body({ hook_event_name: 'Stop' }) },
      'production'
    );
    assert.equal(stop.payload?.state, 'done');
    assert.equal(stop.payload?.toolName, 'Bash');
    assert.equal(stop.payload?.toolInput, 'ls -la');
  });

  it('Stop with direct last_assistant_message surfaces done + message', () => {
    const state = createHookListenerState();
    const stop = normalizeSidecarLine(
      state,
      {
        paneKey: PANE,
        source: 'claude',
        body: body({ hook_event_name: 'Stop', last_assistant_message: 'what is up my dude' })
      },
      'production'
    );
    assert.equal(stop.payload?.state, 'done');
    assert.equal(stop.payload?.lastAssistantMessage, 'what is up my dude');
  });
});
