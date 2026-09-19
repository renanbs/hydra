---
name: hydra-architecture
description: Architectural constitution, UX principles, and engineering discipline for Hydra ADE. Combines the visual layout and ergonomics of Orca IDE (shadcn/ui, New York style, worktree fleet sidebar, workbench tab bar) with the high-performance Rust daemon and virtual terminal engine of Herdr (portable-pty, vt100 shadow buffer, state detection, SQLite WAL).
---

# hydra-architecture — Architectural Constitution for Hydra ADE

## Overview
Hydra ADE (Autonomous Development Environment) is a high-performance agent orchestration platform.
Its core engineering principle is: **Orca's UX and visual fidelity merged with Herdr's lightweight Rust performance.**

## Core Architectural Pillars

### 1. Visual & Interaction Fidelity (Orca Philosophy)
- **Frameless Windowing & Custom Chrome**: Custom window titlebar with native dragging (`start_dragging()`) and discrete window controls (minimize, maximize, close) with exact 46x36px hit targets and `#c42b1c` close hover.
- **Left Sidebar = Fleet & Worktree Manager**:
  - The left sidebar MUST NOT be an ordinary file explorer.
  - It manages parallel agent worktrees, git branches, and session state badges (`working`, `blocked`, `idle`).
  - Contains project header with `+` for spawning new agent fleets and filter input.
- **Center Area = Multi-tab Workbench Surface**:
  - The center area MUST be a full workbench with a tab bar (`WorkbenchTabBar`).
  - Houses interactive terminals (`@xterm/xterm`) and code diffs (`Monaco Diff Editor`) filling 100% of the active container without marketing placeholders.
- **Right Panel = Agent Fleet Hub**:
  - Houses the conversational agent feed, tool execution cards with discrete `Approve` / `Reject` buttons, and input prompts.
- **Native DOM Panel Resizing**:
  - Use direct DOM mouse listeners (`usePanelResize`) with protected boundaries (`minWidth`, `maxWidth`, `deltaSign`) instead of heavy external layout libraries.

### 2. High-Performance Rust Engine (Herdr Philosophy)
- **Decoupled Background Daemon**:
  - Agent processes and PTY sessions live inside the Rust daemon. Closing or reloading the frontend window does not kill running compilations or agent tasks.
- **Virtual Terminal Headless Shadow Buffer**:
  - Uses `portable-pty` for async OS process spawning.
  - Uses `vt100::Parser` in memory (< 200 KB RAM) as the authority of terminal screen state.
  - Zero UI leakage: heavy outputs (build logs, test dumps) are processed in memory without locking the visual canvas.
- **Log Folding for LLM Token Economy**:
  - Terminal output sent to models is folded via `fold_terminal_output`: truncates long logs to keep relevant headers and error tails, cutting token costs by up to 90%.
- **Herdr State Engine**:
  - Live inspection of the `vt100` buffer tail to classify agent states:
    - `WORKING`: Active building, compiling, or downloading.
    - `BLOCKED`: Awaiting human authorization (`[y/n]`, tool approval, interactive prompt).
    - `IDLE`: Shell ready, prompt available, task completed.

### 3. Crash-Proof Session Persistence
- **SQLite WAL Mode**:
  - Session state, messages, and tool approval logs are committed atomically to `~/.config/hydra/hydra_sessions.sqlite3` using `rusqlite` with `PRAGMA journal_mode = WAL`.
- **Window Geometry**:
  - Native restore via `tauri-plugin-window-state` to guarantee position, size, and monitor restoration on Wayland prior to initial paint.

### 4. Remote Companion Protocol
- Local WebSocket server on Unix domain sockets or Tailscale IP (`100.x.y.z`).
- E2EE pairing via `x25519-dalek` and QR Code for secure mobile supervision without exposed public ports.
