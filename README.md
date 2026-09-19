# Hydra ADE

> **Hydra**: Autonomous Development Environment para orquestração de frotas de agentes.

## Arquitetura
- **Host / Core**: Rust puro (Tauri v2, `tokio`, `rusqlite` WAL).
- **Virtual Terminal**: `portable-pty` + `vt100` (Headless Shadow Buffer com log folding).
- **Desktop UI**: React + TypeScript + Tailwind CSS + shadcn/ui.
- **Companion Mobile**: Acesso remoto via Tailscale P2P / Relay E2EE.

## Documentação e Planejamento
As especificações completas de arquitetura e o roadmap de tarefas estão documentados no Obsidian Vault:
- `70-Specs/hydra/Spec - Hydra ADE.md`
- `70-Specs/hydra/Tasks - Hydra ADE.md`
