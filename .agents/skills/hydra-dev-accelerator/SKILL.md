---
name: hydra-dev-accelerator
description: Operational guidelines for autonomous coding agents using TypeSafe Jev System 1 models during Hydra ADE development. Offloads test triage, Wayland/WebKitGTK freeze checks, and parity divergence auditing to reduce token consumption and latency.
version: 1.0.0
---

# hydra-dev-accelerator — Jev System 1 Engineering Workflow

## 1. Constitutional Boundary (Inviolable)
- **NEVER** add `@typesafe-ai/*`, `typesafe-rs`, or any AI SDKs to Hydra's production dependencies (`package.json`, `src-tauri/Cargo.toml`).
- The Hydra binary is 100% native Rust (`portable-pty`, `vt100`, SQLite WAL) and standard React 19 + TypeScript.
- TypeSafe Jev is used **EXCLUSIVELY** by autonomous agents in the development harness (`eval`, `judge`, background subagents) during dev sessions.

---

## 2. Decision Offloading (System 1 vs System 2)

Never burn hundreds or thousands of generative tokens when a typed decision suffices:

| Dev Loop Task | Anti-Pattern (Token Waste) | Jev System 1 Offload (<20ms) |
| :--- | :--- | :--- |
| **Cargo / Test Triage** | Feeding 300 lines of rustc errors or stacktrace to an LLM | Fast typed classification of failure class (`CompileError`, `Deadlock`, `Assertion`, `Env`) and culprit file |
| **Wayland Safety Audit** | Prompting an LLM to review a diff for UI freezes | Strict typed schema: `has_blocking_gtk_call: bool`, `has_sync_tauri_command: bool` |
| **Orca Parity Check** | Conversational prose explaining code diffs | Enum classification: `ParityVerdict { Identical, RequiredTauriAdapter, FunctionalGap }` |
| **Dead Code Pruning** | Repeated multi-round grepping across the repository | Single-shot schema check on whether an unreferenced export has dynamic IPC callers |

---

## 3. Confidence Gating Discipline

All automated agent decisions using Jev System 1 decisions must check the mathematical confidence score:

- **$\ge 0.85$ (High Confidence)**:
  - Proceed immediately with the operational fix or pruning step without human or generative LLM intervention.
- **$0.60 \le \text{score} < 0.85$ (Ambiguous)**:
  - Fall back to secondary deterministic rule or surgical file inspection using specialized tools (`read`, `grep`, `xd://lsp`).
- **$< 0.60$ (Low Confidence)**:
  - Escalate to full System 2 analysis or request clarification from the human engineer.

---

## 4. Keyring Credential Discipline (Linux / Fish)

Under Linux, never hardcode or read raw API keys from files:
```bash
export TYPESAFE_API_KEY=$(secret-tool lookup service typesafe account default 2>/dev/null || pass show typesafe/api-key 2>/dev/null)
```
Ensure the environment contains `TYPESAFE_API_KEY` before executing harness evaluations.
