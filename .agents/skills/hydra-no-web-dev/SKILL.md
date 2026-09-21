# Skill: Hydra Native Development Only

## Rule: Never Run Web Dev Server

**Always run Hydra as a Tauri native app. Never use `npm run dev` or Vite dev server for testing.**

### Why
- Hydra is a **native desktop ADE** (Autonomous Development Environment)
- WebView/WebKitGTK behavior differs from browser (CSS, fonts, PTY, IPC)
- Native window controls, drag regions, titlebar only work in Tauri
- PTY/terminal integration (`@xterm/xterm` + `portable-pty`) requires native backend
- SQLite WAL, `vt100` parser, agent state engine run in Rust — not in browser
- Wayland compositor integration (window dragging, decorations) is Tauri-only
- Performance characteristics (frame rate, memory) only valid in native

### Correct Workflow
```bash
# Build and run native app (from repo root)
pnpm tauri dev        # Hot-reload Rust + frontend
# OR
pnpm tauri build      # Production build
./src-tauri/target/release/hydra  # Run built binary
```

### Forbidden
```bash
# NEVER DO THIS
npm run dev            # ❌ Vite dev server in browser
pnpm dev               # ❌ Same
npm run build && npx serve dist  # ❌ Static serve
```

### Frontend Development
- Use `pnpm tauri dev` — it runs Vite + Tauri together with hot reload
- Frontend changes reload in the native WebView instantly
- Rust changes recompile and reload the app

### CI/Testing
- Unit tests: `cargo test` (Rust) / `pnpm vitest` (frontend logic)
- E2E tests: Run against built Tauri binary, not dev server
- Visual regression: Screenshot native app window

---

## Enforcement
This rule is **inviolable**. Any agent/contributor running `npm run dev` / `pnpm dev` for manual testing violates Hydra architecture.