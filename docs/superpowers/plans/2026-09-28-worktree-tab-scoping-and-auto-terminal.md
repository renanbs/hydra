# Worktree Tab Scoping and Auto-Terminal Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish 100% Orca parity for worktree activation: clicking a worktree with no open sessions automatically spawns an initial terminal tab for that worktree, isolates workbench tabs per worktree (`tabsByWorktree`), scopes RightSidebar to the active worktree root, and prevents plain shell terminals from appearing as AI agents in the sidebar.

**Architecture:** Transition Hydra's workspace model from being globally/project-scoped to worktree-scoped (`activeWorktreeId`), partition workbench tabs by `worktree.path`, persist `workbench_state` per worktree in SQLite, and implement Orca's `ensureWorktreeHasInitialTerminal` contract on worktree activation.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Tauri v2, SQLite WAL (via Tauri IPC), `@xterm/xterm`.

**Spec:** `AGENTS.md` (Orca architectural fidelity, left sidebar fleet & worktree management, center multi-tab workbench). Reference implementation: `~/src/orca` (`worktree-activation.ts`, `worktree-initial-terminal-seeding.ts`, `use-worktree-card-activation-actions.ts`).

## Global Constraints

- **Orca Behavioral Fidelity:** Left sidebar is strictly a Fleet & Worktree Manager. Clicking any worktree card or branch selects it as the active workspace.
- **Auto-Terminal Reseeding:** If the activated worktree has 0 open tabs, an initial terminal tab (`Terminal 1`, cwd = `worktree.path`, shell = default shell) MUST be created automatically.
- **Clean Sidebar Card:** Plain shell terminals (`bash`, `zsh`, `fish`, `sh`) MUST NOT create an agent row in `WorktreeCardAgents` nor increment the agent count badge in `WorktreeCardMetaRow`. Only recognized AI agent CLIs/sessions (`omp`, `claude`, `codex`, `aider`, `gemini`, etc.) appear under worktrees.
- **Tab Isolation:** Switching worktrees MUST switch the displayed tabs to the target worktree's tab set. Tabs belonging to `plankton` MUST NOT appear while `main` is selected.
- **Right Sidebar Context:** `RightSidebar` (File Explorer and Git Source Control) MUST point to `activeWorktree.path`, not `activeProject.path`.

## Review Focus

1. **Empty Worktree Activation:** Clicking a branch or worktree with 0 tabs creates exactly 1 terminal tab rooted at `worktree.path`, with no ghost agent added to the sidebar.
2. **Worktree Switch Tab Isolation:** Creating a tab in worktree A (`plankton`) then clicking worktree B (`main`) hides A's tabs and shows B's tabs (or spawns B's initial terminal). Clicking back to A restores A's tabs intact.
3. **Closing Last Tab (Tombstone / Reseed):** Closing the last tab of a worktree leaves the worktree empty (Landing visible). Reselecting the worktree from the sidebar reseeds an initial terminal (Orca `reseedEmptiedWorkspace` behavior).
4. **Agent Filter Integrity:** Launching an agent (e.g. OMP / Claude / new session with agent) adds an agent row to `WorktreeCardAgents`; spawning a plain terminal tab does NOT add an agent row.
5. **RightSidebar Pathing:** File explorer and git status immediately refresh to the newly selected worktree directory.

---

### Task 1: Core State Refactoring — Introduce `activeWorktree` and `tabsByWorktree`

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/sidebar/types.ts`
- Modify: `src/components/sidebar/WorktreeSidebar.tsx`
- Modify: `src/components/sidebar/SidebarShell.tsx`

**Interfaces:**
- Consumes: `GitWorktreeInfo`, `HydraProject`, `TabItem`
- Produces: `activeWorktreePath: string | null`, `tabsByWorktree: Record<string, TabItem[]>`, `activeTabIdByWorktree: Record<string, string>`

- [ ] **Step 1: Define `activeWorktreePath` and `tabsByWorktree` in App state**
  Replace single flat `tabs` array as the primary source of truth with worktree-keyed tab dictionary `tabsByWorktree: Record<string, TabItem[]>` and `activeTabIdByWorktree: Record<string, string>`. Compute current active tabs as `tabsByWorktree[activeWorktreePath] ?? []` and `activeTabId = activeTabIdByWorktree[activeWorktreePath] ?? ""`.

- [ ] **Step 2: Update per-worktree persistence in SQLite**
  Update `save_workbench_persistence_for_project` calls to save by `activeWorktreePath` (fallback to `activeProject.path`), so each worktree retains its own persisted tab layout in SQLite.

- [ ] **Step 3: Propagate `activeWorktreePath` to sidebar components**
  Pass `activeWorktreePath` to `WorktreeSidebar` and `SidebarShell` so the selected worktree card uses `isFocused = activeWorktreePath === wt.path` derived from single-source App state rather than local ephemeral state.

- [ ] **Step 4: Verify typecheck passes**
  Run: `pnpm exec tsc --noEmit`
  Expected: PASS

---

### Task 2: Implement Auto-Terminal Creation on Worktree Activation (Orca Parity)

**Files:**
- Modify: `src/App.tsx` (in `handleSelectGitWorktree`)

**Interfaces:**
- Consumes: `wt: GitWorktreeInfo`, `tabsByWorktree`, `activeTabIdByWorktree`
- Produces: Initial `TabItem` when worktree has 0 renderable tabs

- [ ] **Step 1: Remove the phantom comment and early return**
  Remove lines 1589-1592 in `src/App.tsx` that suppressed terminal creation.

- [ ] **Step 2: Implement Orca activation logic**
  In `handleSelectGitWorktree`:
  1. Set `activeWorktreePath = wt.path`.
  2. Set `activeProject` to owning project.
  3. Look up existing tabs for `wt.path` in `tabsByWorktree[wt.path]`.
  4. If tabs exist: activate the last active tab in `wt.path`.
  5. If 0 tabs exist: spawn an initial terminal tab:
     - `id: tab_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
     - `title: "Terminal 1"`
     - `type: "terminal"`
     - `cwd: wt.path`
     - `executable: hydraSettings.terminal_default_shell || "bash"`
     - Set this tab as active in `wt.path`.
     - Do NOT add a shell session to `sessions` (prevents sidebar clutter).

- [ ] **Step 3: Update `handleCloseTab` and tab modifications**
  Ensure closing tabs updates `tabsByWorktree[activeWorktreePath]`. If 0 tabs remain in that worktree, workbench shows Landing.

- [ ] **Step 4: Verify typecheck passes**
  Run: `pnpm exec tsc --noEmit`
  Expected: PASS

---

### Task 3: Separate AI Agent Sessions from Shell Terminals in Sidebar

**Files:**
- Modify: `src/components/sidebar/WorktreeCardAgents.tsx`
- Modify: `src/components/sidebar/SidebarShell.tsx`
- Modify: `src/components/sidebar/WorktreeCard.tsx`

**Interfaces:**
- Consumes: `sessions: WorktreeSession[]`
- Produces: Filtered agent rows excluding standard shells (`bash`, `zsh`, `fish`, `sh`, `powershell`, `cmd`)

- [ ] **Step 1: Define recognized agent types vs shell executables**
  Add a helper `isRecognizedAgentSession(session: WorktreeSession): boolean` matching Orca's `TITLE_AGENT_LABEL_TO_TYPE` (`omp`, `claude`, `codex`, `opencode`, `gemini`, `aider`, `cursor`, `pi`, `droid`, `hermes`, etc.). Shells (`bash`, `zsh`, `fish`, `sh`, `Terminal`) return `false`.

- [ ] **Step 2: Filter sessions in `WorktreeCardAgents` and count badge**
  In `WorktreeCardAgents.tsx`, ignore non-agent sessions so plain shells never render agent sub-rows. In `SidebarShell.tsx`, the `wtSessions.length` badge should count only recognized agent sessions (`wtAgentSessions.length`).

- [ ] **Step 3: Verify typecheck passes**
  Run: `pnpm exec tsc --noEmit`
  Expected: PASS

---

### Task 4: Connect `RightSidebar` (Git & File Explorer) to Active Worktree

**Files:**
- Modify: `src/App.tsx` (around `<RightSidebar ... />`)

**Interfaces:**
- Consumes: `activeWorktreePath: string | null`, `activeProject: HydraProject | null`
- Produces: `rootPath` for `RightSidebar` pointing to `activeWorktreePath || activeProject?.path`

- [ ] **Step 1: Point `rootPath` to active worktree**
  Update `<RightSidebar rootPath={activeWorktreePath || activeProject?.path ?? null} ... />`.
  Ensure `git_diff_cmd` and file reading operations operate on the active worktree root.

- [ ] **Step 2: Verify typecheck passes**
  Run: `pnpm exec tsc --noEmit`
  Expected: PASS

---

### Task 5: End-to-End Verification & Regression Testing

**Files:**
- Test scripts / throwaway smoke verification

- [ ] **Step 1: Run TypeScript full check**
  Run: `pnpm exec tsc --noEmit`
  Expected: 0 errors

- [ ] **Step 2: Run frontend production build**
  Run: `pnpm build`
  Expected: Build succeeds with 0 errors

- [ ] **Step 3: Verify Rust core compilation**
  Run: `cargo check --manifest-path src-tauri/Cargo.toml`
  Expected: 0 errors
