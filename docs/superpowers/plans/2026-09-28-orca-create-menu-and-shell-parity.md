# Orca Tab Bar Create Menu and Shell Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish 100% Orca parity for the tab bar `+` menu and default shell behavior: dynamically resolve the system `$SHELL` when unconfigured, add faithful vector icons for Zsh, Bash, and Fish, implement dynamic tab title updates from shell/process OSC titles, and replace the custom omnibox popup with Orca's clean dropdown menu structure with working actions.

**Architecture:** 
1. Expose `get_system_default_shell` from Rust via Tauri IPC reading `$SHELL`, defaulting to user's login shell instead of hardcoded `"bash"`.
2. Implement vector glyphs for Zsh, Bash, and Fish in `shell-icons.tsx`.
3. Wire xterm `term.onTitleChange` to update the active tab's title dynamically in `App.tsx`.
4. Refactor `TabBarCreateEntry.tsx` to reproduce Orca's `TabBarStaticCreateMenu` + `QuickLaunchAgentMenuItems` dropdown: search bar, core actions with shortcuts, detected real AI agents with brand icons, and "Agent settings...".

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Lucide Icons, Tauri v2, `@xterm/xterm`.

**Spec:** `AGENTS.md` (Orca UI fidelity, exact conventions of Orca `~/src/orca`). Reference files in Orca:
- `~/src/orca/src/renderer/src/components/tab-bar/tab-bar-surface.tsx`
- `~/src/orca/src/renderer/src/components/tab-bar/tab-bar-static-create-menu.tsx`
- `~/src/orca/src/renderer/src/components/tab-bar/QuickLaunchButton.tsx`
- `~/src/orca/src/renderer/src/components/tab-bar/shell-icons.tsx`
- `~/src/orca/src/shared/tab-title-resolution.ts`

## Global Constraints

- **Dynamic Default Shell:** When `terminal_default_shell` is empty or not set in Hydra settings, Hydra MUST resolve the system login shell (`$SHELL`, e.g. `/usr/bin/zsh`) rather than hardcoding `"bash"`.
- **Shell Icons:** `shell-icons.tsx` MUST provide dedicated vector icons for Zsh, Bash, and Fish.
- **Dynamic Tab Titles:** Tab title MUST update when the terminal emits OSC title changes (`term.onTitleChange`), while preserving user custom renames.
- **100% Orca Create Menu Layout:** The `+` menu MUST follow Orca's exact structure (Search header -> Core tab actions with shortcuts -> Separator -> Detected AI agents with authentic brand icons -> Separator -> Agent settings...).
- **Working Actions:** Every item in the menu MUST execute its corresponding action and focus the new surface.

## Review Focus

1. **Default Shell Execution:** Starting a new terminal with unconfigured settings spawns the system `$SHELL` (`zsh` on Garuda Linux), verified by `echo $SHELL` inside the terminal.
2. **Tab Branding & Shell Icon:** Tabs running zsh display the Zsh icon, bash displays Bash icon, fish displays Fish icon.
3. **Dynamic Title Propagation:** Running commands or shell prompt title sequences updates the tab strip title in real time.
4. **Create Menu Layout Parity:** Menu visually matches Orca Image #2 (clean grouped dropdown, no "Launch Plain Bash Shell" as agent, working shortcuts).
5. **Menu Action Execution:** Clicking "New Terminal", "New Browser Tab", "New Markdown", or an AI agent creates the tab and dismisses the menu cleanly.

---

### Task 1: Resolve System `$SHELL` Dynamically (Eliminate Hardcoded Bash)

**Files:**
- Modify: `src-tauri/src/shell_detection.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src/App.tsx`
- Modify: `src/components/SettingsModal.tsx`

**Interfaces:**
- Consumes: OS environment `$SHELL`, `hydraSettings.terminal_default_shell`
- Produces: `resolvedDefaultShell: string`

- [ ] **Step 1: Expose `get_system_default_shell` in Rust backend**
  Add a helper function in `src-tauri/src/shell_detection.rs` that reads `std::env::var("SHELL")`, extracts the executable name (or path), and returns it. Expose as `#[tauri::command] async fn get_default_system_shell() -> String`.

- [ ] **Step 2: Update App.tsx fallback resolution**
  Replace all `hydraSettings.terminal_default_shell || "bash"` in `src/App.tsx` with a dynamic resolver `resolveDefaultShell()` that queries the detected system shell if the setting is unset.

- [ ] **Step 3: Update SettingsModal placeholder and label**
  Change "System default (bash)" to "System default ({systemShell})" so the user clearly sees their actual system shell.

- [ ] **Step 4: Verify typecheck & cargo check**
  Run: `pnpm exec tsc --noEmit && cargo check --manifest-path src-tauri/Cargo.toml`
  Expected: PASS

---

### Task 2: Dedicated Vector Shell Icons & Dynamic Tab Titles

**Files:**
- Modify: `src/components/workbench/shell-icons.tsx`
- Modify: `src/components/TerminalDrawer.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `shell: string | null`, `term.onTitleChange`
- Produces: Vector icons for Zsh, Bash, Fish; `onTitleChange` callback to App

- [ ] **Step 1: Add Zsh, Bash, and Fish vector icons in `shell-icons.tsx`**
  Implement `ZshIcon`, `BashIcon`, and `FishIcon` components with accurate vector paths and colors. Route `zsh`, `bash`, `fish` in `ShellIcon`.

- [ ] **Step 2: Wire up `term.onTitleChange` in `TerminalDrawer.tsx`**
  Listen to `term.onTitleChange((title) => onTitleChange?.(sessionId, title))` and notify `App.tsx`.

- [ ] **Step 3: Update `App.tsx` to handle title updates**
  Update tab title in state when title change event arrives, unless the tab has a custom user-assigned title.

- [ ] **Step 4: Verify typecheck**
  Run: `pnpm exec tsc --noEmit`
  Expected: PASS

---

### Task 3: 100% Orca Parity Tab Bar Create Menu (`TabBarCreateEntry`)

**Files:**
- Modify: `src/components/workbench/TabBarCreateEntry.tsx`
- Modify: `src/components/workbench/WorkbenchTabBar.tsx`

**Interfaces:**
- Consumes: `detectedAgents: AvailableAgent[]`, shortcuts, callbacks
- Produces: Orca-faithful Dropdown Menu matching Image #2

- [ ] **Step 1: Redesign menu layout structure**
  Implement the exact Orca layout:
  - Header search input with placeholder: `Search open tabs, history, files, URLs, agents...`
  - Group 1 (Static actions):
    - `New Terminal` (`Ctrl+T`)
    - `New Browser Tab` (`Ctrl+Shift+B`)
    - `New Markdown` (`Ctrl+Shift+M`)
    - `New Mobile Emulator` (`Unassigned`)
  - Separator
  - Group 2 (Detected AI Agents):
    - Real brand icons (`AgentBrandIcon agent={agent.id}`), label = agent name.
    - Exclude plain shells (`isShellProcess` check).
  - Separator
  - Group 3:
    - `Agent settings...` (SettingsIcon) -> calls `onOpenSettings()` to agents pane.

- [ ] **Step 2: Fix and wire all actions**
  Ensure clicking each action calls the appropriate handler (`onNewTerminalTab`, `onNewFileTab`, `onOpenFileTab`, `onLaunchAgent`, `onOpenSettings`) and closes the dropdown menu cleanly.

- [ ] **Step 3: Verify typecheck**
  Run: `pnpm exec tsc --noEmit`
  Expected: PASS

---

### Task 4: End-to-End Verification & Build

**Files:**
- Full build test

- [ ] **Step 1: Run TypeScript check**
  Run: `pnpm exec tsc --noEmit`
  Expected: 0 errors

- [ ] **Step 2: Run frontend production build**
  Run: `pnpm build`
  Expected: Success

- [ ] **Step 3: Run Rust compilation**
  Run: `cargo check --manifest-path src-tauri/Cargo.toml`
  Expected: 0 errors
