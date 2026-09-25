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
- **PTY children are interactive color terminals**:
  - Every PTY spawn (`start_session_inner` in `src-tauri/src/terminal.rs`, app and daemon) MUST advertise `TERM=xterm-256color` and `COLORTERM=truecolor`.
  - The spawn MUST remove inherited non-interactive color suppression: `NO_COLOR`, `NODE_DISABLE_COLORS`, and `CI`.
  - `CI` is not a Hydra setting. Agent shells and CI runners set it so CLIs skip prompts. Claude Code returns color depth 1 as soon as `CI` is present, before it reads `COLORTERM`, so an inherited `CI=true` paints the logo in the default foreground.
  - Do not paper over this by launching Hydra from a clean shell. The child environment is owned at spawn.
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

### 5. Wayland, WebKitGTK & Tauri Event Loop Discipline
- **Mandatory Async Commands**:
  - All `#[tauri::command]` handlers that perform I/O, IPC socket communication, or database operations MUST be declared as `async fn`.
  - In WebKitGTK (Linux), synchronous commands run directly on the GTK main thread; any blocking read freezes the Wayland event loop, causing compositor socket overflow (`wayland-0`) and ping-pong timeouts ("Window not responding").
- **Push Over Poll for High-Frequency Output**:
  - High-frequency data (terminal output, agent logs) MUST NEVER be polled via frontend `setInterval` + `invoke`.
  - The Rust daemon/core MUST push stream deltas to the frontend via `app.emit("terminal:output", ...)` listened to via `@tauri-apps/api/event`.
- **Strict Socket Timeouts on Local IPC**:
  - Any Unix domain socket stream (`LocalStream`) interacting with the background daemon MUST configure strict read/write timeouts (`set_recv_timeout(300ms)` / `set_send_timeout(300ms)`).
  - Socket availability checks MUST use atomic TTL caching (≥500ms) to prevent listen queue saturation.
- **Zero-Allocation / Zero-DB Discipline in PTY Reader Loops**:
  - The PTY reader thread runs at raw OS stream speed. Opening SQLite connections or executing queries (`DatabaseManager::new()`) inside the chunk loop is strictly prohibited. Session settings must be read once at spawn.
