# hydra-hook-sidecar

Agent-hook normalization sidecar (G5/T5). A supervised child process that
runs Orca's hook normalization in TypeScript and reports
`ParsedAgentStatusPayload` rows to the Rust core over stdio JSON lines.

- `ORCA_REV=e49b3aa0bdb7496336905ca338a4c10b933b7327`
  (HEAD of `~/src/orca` at copy time; re-diff `src/normalize/` against
  `$ORCA/src/shared/` to pick up upstream fixes).
- `src/normalize/`: 1-1 copy of Orca `src/shared/` normalize closure
  (`agent-hook-listener.ts` entry, `agent-hook-spool.ts`,
  `agent-hook-endpoint-file.ts`, providers `claude-events.ts`,
  `codex-events.ts`, `codex-state.ts` + their pure deps) with Hydra
  decisions applied:
  - transport coords `ORCA_*` → `HYDRA_*` (header names, endpoint file
    keys, `HYDRA_HOOK_PROTOCOL_VERSION`); dispatch-status preamble
    matching is provider content, not transport, and stays as-is.
  - envelope accepts the opaque D3 `paneKey` (= `session_id`, no
    `tab:leaf` split); the `tabId` cross-check still applies to
    `tab:leaf`-shaped keys.
  - v1 scope is claude + codex; other sources get
    `{paneKey, payload: null, dropped: true}`.
  - no relay/SSH/server code was copied.
- `src/normalize-entry.ts`: `normalizeSidecarLine(state, line, env)` —
  `{paneKey,source,body}` → `{paneKey, payload}`.
- `src/main.ts`: stdio loop. First line must be the version handshake
  `{protocol:"hydra-hook-sidecar", version:"1", env}`; mismatch = stderr +
  exit 2, never blind parsing.

## Protocol

```
core→sidecar line 1:  {"protocol":"hydra-hook-sidecar","version":"1","env":"production"}
core→sidecar hooks:   {"paneKey":"<session_id>","source":"claude|codex","body":{...envelope...}}
sidecar→core results: {"paneKey":"<session_id>","payload":{...}|null}
```

## Build & test (node ≥ 22, no registry access needed)

```sh
./node_modules/typescript/bin/tsc -p tsconfig.json
node --test test/*.test.js
```

`node_modules/` holds symlinks to the Orca workspace's `typescript` +
`@types/node` (same setup Orca itself resolves); `dist/` is gitignored
build output.
