# Project Profile: Hydra ADE

Hydra is an Autonomous Development Environment (ADE) designed for orchestrating fleets of parallel AI coding agents. It merges the ergonomics, density, and design system of **Orca IDE** with the lightweight, crash-proof Rust performance and virtual terminal architecture of **Herdr**.

---

## Architecture Blueprint

```
Hydra Host
├── Rust Core (Tauri v2 + Tokio)
│   ├── PTY Manager (`portable-pty`)
│   ├── Virtual Terminal Buffer (`vt100` in-memory parser)
│   ├── Herdr State Engine (`working` / `blocked` / `idle` detection)
│   ├── Session Store (`rusqlite` WAL mode in `~/.config/hydra/`)
│   └── Window Actions (`tauri-plugin-window-state` + custom chrome)
└── Frontend (React 19 + TypeScript + Tailwind CSS)
    ├── Titlebar: Frameless custom chrome with window controls
    ├── Left Sidebar: Worktree & fleet session manager (Orca style)
    ├── Center Area: Workbench surface with multi-tabs (`xterm.js` / Monaco Diff)
    └── Right Panel: Agent feed, tool execution cards (Approve/Reject), prompt bar
```

---

## Architectural Principles & Discipline

All agents contributing to this repository MUST load and adhere to the project skill:
- **`skill://hydra-architecture`** (`.agents/skills/hydra-architecture/SKILL.md`)

### Inviolable Rules:
1. **Never Reinvent or Guess UI Layouts**:
   - The UI follows the exact conventions of Orca (`~/src/orca`).
   - The left sidebar is strictly a **Fleet & Worktree Manager**, not a plain file explorer.
   - The center area is strictly a **Full Workbench** containing interactive tabs and terminal/diff surfaces.
   - Window controls use Orca's 46x36px hit targets and vector SVG glyphs.
2. **Never Pipe Raw PTY Directly to Frontend Without Shadow Buffering**:
   - PTY output must always pass through the `vt100` parser in memory.
   - Clean text is extracted via `parser.screen().contents()` for AI prompts (with `fold_terminal_output` to conserve tokens).
   - Formatted ANSI is extracted via `parser.screen().contents_formatted()` for the visual canvas.
3. **Locking Discipline**:
   - Use `parking_lot::Mutex` for non-async Rust mutexes (never `std::sync::Mutex` with unwrap).
   - Use `tokio::sync::Mutex` only across `.await` points.
4. **Wayland & Linux Native Compliance**:
   - Window decorations remain `decorations: false`. Window dragging is handled via `window.start_dragging()`.
   - Desktop entry must declare `StartupWMClass=hydra`.
5. **Event Loop & IPC Discipline (Wayland / WebKitGTK Freeze Prevention)**:
   - All `#[tauri::command]` handlers that perform I/O, IPC socket communication, or DB queries MUST be `async fn` (never blocking `fn`). Synchronous commands run on the GTK main thread and block compositor ping/pong.
   - High-frequency output MUST use Push (`app.emit("terminal:output")`), never frontend `setInterval` polling.
   - All local IPC streams MUST have read/write timeouts (`set_recv_timeout(300ms)`).
   - The PTY reader loop runs at OS stream speed: zero allocations, zero SQLite queries per chunk.

---

## Repository Layout

- `src/` — React frontend application.
  - `src/components/sidebar/WorktreeSidebar.tsx` — Left worktree/fleet panel.
  - `src/components/workbench/WorkbenchTabBar.tsx` — Center tab bar.
  - `src/components/TerminalDrawer.tsx` — Interactive `@xterm/xterm` canvas.
  - `src/components/CodeDiffViewer.tsx` — Side-by-side Monaco Diff Viewer.
  - `src/components/WindowTitlebar.tsx` — Custom frameless window header.
  - `src/hooks/usePanelResize.ts` — Native DOM panel resize hook.
- `src-tauri/` — Rust native core.
  - `src-tauri/src/terminal.rs` — PTY and `vt100` virtual terminal manager.
  - `src-tauri/src/agent_state.rs` — Herdr state detection and log folding.
  - `src-tauri/src/db.rs` — SQLite WAL persistence.
  - `src-tauri/src/window_actions.rs` — Native window controls.
- `.agents/skills/` — Canonical project skills.
