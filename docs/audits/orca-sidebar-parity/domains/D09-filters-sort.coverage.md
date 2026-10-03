# Cobertura de Auditoria — Domínio D09: Filters & Sort

## Contagens de Cobertura

- **Arquivos produtivos**: 11/11 (100%)
- **Símbolos exportados**: 34/34 (100%)
- **Testes de especificação**: 150/150 (100%)
- **Labels de menu e UI**: 13/13 (100%)
- **Atalhos de teclado (shortcuts)**: 18/18 (100%)
- **Preferências / Configurações (prefs)**: 0/0 (100%)
- **Timers e rAF**: 2/2 (100%)
- **Subscriptions e watchers**: 1/1 (100%)
- **Contratos Preload / IPC**: 0/0 (100%)

---

## Justificativas N/A / INFRA / DUP

| Entrada | Tipo | Justificativa |
|---|---|---|
| `components/sidebar/SidebarRepositoryFilterSection.test.tsx:25` | INFRA | Import de componente UI em arquivo de teste (`DropdownMenuItem`) |
| `components/sidebar/SidebarRepositoryFilterSection.test.tsx:56` | INFRA | Mock de menu wrapper no teste de integração (`<DropdownMenuItem>Sort by</DropdownMenuItem>`) |
| `components/sidebar/SidebarRepositoryFilterSection.test.tsx:96` | INFRA | Helper assíncrono de espera no teste de foco (`requestAnimationFrame` + `setTimeout`) |

---

## Mapeamento de Arquivos Produtivos

| Arquivo | Capabilities Mapeadas |
|---|---|
| `FilterToggleRow.tsx` | D09-001, D09-002, D09-003 |
| `SidebarFilter.tsx` | D09-004, D09-005, D09-006, D09-007, D09-008, D09-009, D09-010 |
| `SidebarGroupByToggle.tsx` | D09-011 |
| `SidebarProjectFilterPanel.tsx` | D09-012, D09-013, D09-014, D09-015 |
| `SidebarRepositoryFilterSection.tsx` | D09-016 |
| `SidebarWorkspaceFilterSection.tsx` | D09-006, D09-007, D09-017 |
| `project-filter-reveal.ts` | D09-018 |
| `sidebar-filter-actions.ts` | D09-019, D09-020 |
| `smart-attention.ts` | D09-022, D09-023, D09-024, D09-025, D09-026, D09-027 |
| `smart-sort.ts` | D09-028, D09-029, D09-030, D09-031 |
| `worktree-filter-visibility.ts` | D09-021 |

---

## Mapeamento de Símbolos Exportados

| Símbolo | Capabilities Mapeadas |
|---|---|
| `SidebarFilter.tsx:default` | D09-004 |
| `SidebarRepositoryFilterSection.tsx:default` | D09-016 |
| `SidebarWorkspaceFilterSection.tsx:default` | D09-017 |
| `FilterToggleRow` | D09-001 |
| `SidebarGroupByToggle` | D09-011 |
| `SidebarProjectFilterPanel` | D09-012 |
| `ProjectFilterRevealState` | D09-018 |
| `revealRepoInProjectFilter` | D09-018 |
| `sidebarHasActiveFilters` | D09-019 |
| `ClearFilterActions` | D09-020 |
| `computeClearFilterActions` | D09-020 |
| `SmartClass` | D09-022 |
| `AttentionCause` | D09-022 |
| `WorktreeAttention` | D09-022 |
| `IDLE` | D09-022 |
| `hasFreshAttributedAgentStatus` | D09-027 |
| `mostRecentAttentionInHistory` | D09-024 |
| `PaneInput` | D09-025 |
| `resolveAttention` | D09-023 |
| `buildExplicitEntriesByTabId` | D09-026 |
| `TabPaneInputSources` | D09-025 |
| `collectTabPaneInputs` | D09-025 |
| `buildAttentionByWorktree` | D09-026 |
| `SortBy` | D09-030 |
| `CREATE_GRACE_MS` | D09-028 |
| `effectiveRecentActivity` | D09-028 |
| `WorktreeSortLabelInput` | D09-029 |
| `getWorktreeSortLabel` | D09-029 |
| `WorktreeSortLabels` | D09-029 |
| `buildWorktreeSortLabels` | D09-029 |
| `compareWorktreeSortLabel` | D09-029 |
| `buildWorktreeComparator` | D09-030 |
| `sortWorktreesSmart` | D09-031 |
| `worktreePassesSidebarFilters` | D09-021 |

---

## Mapeamento de Labels de Menu e UI

| Entrada do Índice | Mapeamento |
|---|---|
| `components/sidebar/FilterToggleRow.tsx:21 :: label: string` | D09-001 |
| `components/sidebar/FilterToggleRow.tsx:35 :: aria-label={ariaLabel}` | D09-001 |
| `components/sidebar/SidebarFilter.tsx:28 :: import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'` | D09-004 |
| `components/sidebar/SidebarFilter.tsx:39 :: tooltipSide?: 'top' | 'right' | 'bottom' | 'left'` | D09-004 |
| `components/sidebar/SidebarFilter.tsx:46 :: tooltipSide = 'bottom',` | D09-004 |
| `components/sidebar/SidebarFilter.tsx:180 :: aria-label={` | D09-004 |
| `components/sidebar/SidebarFilter.tsx:209 :: <TooltipContent side={tooltipSide} sideOffset={6}>` | D09-004 |
| `components/sidebar/SidebarFilter.tsx:321 :: placeholder={translate(` | D09-008 |
| `components/sidebar/SidebarProjectFilterPanel.tsx:140 :: placeholder={` | D09-012 |
| `components/sidebar/SidebarProjectFilterPanel.tsx:230 :: aria-label={translate(` | D09-013 |
| `components/sidebar/SidebarRepositoryFilterSection.test.tsx:25 :: DropdownMenuItem,` | INFRA: import de componente UI em arquivo de teste |
| `components/sidebar/SidebarRepositoryFilterSection.test.tsx:56 :: <DropdownMenuItem>Sort by</DropdownMenuItem>` | INFRA: mock de menu wrapper no teste de integração |
| `components/sidebar/smart-attention.test.ts:435 :: it('per-pane authority across panes: pane A hook=done, pane B title=permission → Class 1', () => {` | D09-023 |

---

## Mapeamento de Atalhos de Teclado (Shortcuts)

| Entrada do Índice | Mapeamento |
|---|---|
| `components/sidebar/FilterToggleRow.tsx:2 :: import { DropdownMenuShortcut } from '@/components/ui/dropdown-menu'` | D09-003 |
| `components/sidebar/FilterToggleRow.tsx:17 :: shortcutLabel,` | D09-003 |
| `components/sidebar/FilterToggleRow.tsx:26 :: shortcutLabel?: string` | D09-003 |
| `components/sidebar/FilterToggleRow.tsx:54 :: {shortcutLabel ? <DropdownMenuShortcut>{shortcutLabel}</DropdownMenuShortcut> : null}` | D09-003 |
| `components/sidebar/SidebarFilter.tsx:31 :: import { useShortcutLabel } from '@/hooks/useShortcutLabel'` | D09-005 |
| `components/sidebar/SidebarFilter.tsx:52 :: // Surface the user-assigned shortcut here so the filter menu doubles as its` | D09-005 |
| `components/sidebar/SidebarFilter.tsx:53 :: // discovery point ('Unassigned' until they bind one in Settings → Shortcuts).` | D09-005 |
| `components/sidebar/SidebarFilter.tsx:54 :: const sleepingShortcut = useShortcutLabel('sidebar.sleepingWorkspaces.toggle')` | D09-005 |
| `components/sidebar/SidebarFilter.tsx:227 :: shortcutLabel={sleepingShortcut === 'Unassigned' ? undefined : sleepingShortcut}` | D09-005 |
| `components/sidebar/SidebarProjectFilterPanel.tsx:88 :: (event: React.KeyboardEvent<HTMLInputElement>) => {` | D09-015 |
| `components/sidebar/SidebarProjectFilterPanel.tsx:91 :: if (event.key === 'Backspace' && query === '' && selectedRepos.length > 0) {` | D09-015 |
| `components/sidebar/SidebarProjectFilterPanel.tsx:101 :: if (event.key === 'Enter') {` | D09-015 |
| `components/sidebar/SidebarProjectFilterPanel.tsx:115 :: if (event.key === 'ArrowLeft') {` | D09-015 |
| `components/sidebar/SidebarProjectFilterPanel.tsx:124 :: if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {` | D09-015 |
| `components/sidebar/SidebarRepositoryFilterSection.test.tsx:84 :: new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true })` | D09-015 |
| `components/sidebar/SidebarRepositoryFilterSection.test.tsx:180 :: new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true })` | D09-015 |
| `components/sidebar/SidebarRepositoryFilterSection.test.tsx:196 :: new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true })` | D09-015 |
| `components/sidebar/sidebar-filter-actions.ts:77 :: * between badge numbers and the Cmd+N shortcut target.` | D09-019 |

---

## Mapeamento de Timers e Subscriptions

| Tipo | Entrada do Índice | Mapeamento |
|---|---|---|
| Timer | `components/sidebar/SidebarProjectFilterPanel.tsx:66 :: const frame = requestAnimationFrame(() => inputRef.current?.focus())` | D09-012 |
| Timer | `components/sidebar/SidebarRepositoryFilterSection.test.tsx:96 :: await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)))` | INFRA: helper assíncrono de espera no teste de foco |
| Subscription | `components/sidebar/SidebarProjectFilterPanel.tsx:65 :: useEffect(() => {` | D09-012 |

---

## Mapeamento de Testes de Especificação (150 casos)

| Teste (`arquivo:linha :: nome`) | Capability |
|---|---|
| `components/sidebar/FilterToggleRow.test.tsx:50 :: FilterToggleRow` | D09-001 |
| `components/sidebar/FilterToggleRow.test.tsx:51 :: indents a sub-option past the row above it` | D09-002 |
| `components/sidebar/FilterToggleRow.test.tsx:58 :: never pairs the indent with a padding-inline utility that would outrank it` | D09-002 |
| `components/sidebar/SidebarGroupByToggle.test.tsx:27 :: SidebarGroupByToggle` | D09-011 |
| `components/sidebar/SidebarGroupByToggle.test.tsx:40 :: commits the pointer-selected grouping mode` | D09-011 |
| `components/sidebar/SidebarRepositoryFilterSection.test.tsx:136 :: SidebarRepositoryFilterSection` | D09-016 |
| `components/sidebar/SidebarRepositoryFilterSection.test.tsx:137 :: focuses the search input when the submenu opens` | D09-012 |
| `components/sidebar/SidebarRepositoryFilterSection.test.tsx:146 :: routes typing into the search box rather than menu typeahead` | D09-015 |
| `components/sidebar/SidebarRepositoryFilterSection.test.tsx:155 :: resets the query when the panel is reopened` | D09-012 |
| `components/sidebar/SidebarRepositoryFilterSection.test.tsx:170 :: keeps ArrowLeft in the text field while the caret can still move` | D09-015 |
| `components/sidebar/SidebarRepositoryFilterSection.test.tsx:187 :: lets ArrowLeft close the panel once the caret is at the start` | D09-015 |
| `components/sidebar/SidebarRepositoryFilterSection.test.tsx:203 :: hides itself when only one project exists` | D09-016 |
| `components/sidebar/SidebarWorkspaceFilterSection.test.tsx:72 :: SidebarWorkspaceFilterSection` | D09-017 |
| `components/sidebar/SidebarWorkspaceFilterSection.test.tsx:73 :: hides the default-branch exemption row while sleeping workspaces are shown` | D09-006 |
| `components/sidebar/SidebarWorkspaceFilterSection.test.tsx:79 :: shows the exemption row once ` | D09-006 |
| `components/sidebar/SidebarWorkspaceFilterSection.test.tsx:85 :: keeps the exemption row hidden even when it is switched off` | D09-006 |
| `components/sidebar/SidebarWorkspaceFilterSection.test.tsx:91 :: shows the other-client filter when a remote server is configured` | D09-017 |
| `components/sidebar/SidebarWorkspaceFilterSection.test.tsx:100 :: keeps the other-client filter visible while the remote catalog loads` | D09-017 |
| `components/sidebar/SidebarWorkspaceFilterSection.test.tsx:107 :: hides the other-client filter for local-only clients` | D09-017 |
| `components/sidebar/SidebarWorkspaceFilterSection.test.tsx:114 :: keeps an enabled other-client filter available to turn off` | D09-017 |
| `components/sidebar/project-filter-reveal.test.ts:8 :: revealRepoInProjectFilter` | D09-018 |
| `components/sidebar/project-filter-reveal.test.ts:9 :: keeps the existing selection and adds the revealed project` | D09-018 |
| `components/sidebar/project-filter-reveal.test.ts:17 :: does nothing when no project filter is active` | D09-018 |
| `components/sidebar/project-filter-reveal.test.ts:25 :: does nothing when the project is already selected` | D09-018 |
| `components/sidebar/sidebar-filter-state.test.ts:49 :: isDefaultBranchWorkspace` | D09-007 |
| `components/sidebar/sidebar-filter-state.test.ts:50 :: returns true for a branch-backed main worktree` | D09-007 |
| `components/sidebar/sidebar-filter-state.test.ts:56 :: returns false for folder-mode main worktrees (empty branch)` | D09-007 |
| `components/sidebar/sidebar-filter-state.test.ts:63 :: returns false for non-main worktrees even on the default branch` | D09-007 |
| `components/sidebar/sidebar-filter-state.test.ts:68 :: keeps a provisioned root visible as the recipe-created workspace` | D09-007 |
| `components/sidebar/sidebar-filter-state.test.ts:76 :: sidebarHasActiveFilters` | D09-019 |
| `components/sidebar/sidebar-filter-state.test.ts:77 :: returns false when no filters are active` | D09-019 |
| `components/sidebar/sidebar-filter-state.test.ts:81 :: returns true when only hideDefaultBranchWorkspace is active` | D09-019 |
| `components/sidebar/sidebar-filter-state.test.ts:88 :: returns true when only automation-created workspaces are hidden` | D09-019 |
| `components/sidebar/sidebar-filter-state.test.ts:94 :: returns true when only CLI-created workspaces are hidden` | D09-019 |
| `components/sidebar/sidebar-filter-state.test.ts:98 :: returns true when only detached-HEAD workspaces are hidden` | D09-019 |
| `components/sidebar/sidebar-filter-state.test.ts:102 :: returns true when workspaces from other devices are hidden` | D09-019 |
| `components/sidebar/sidebar-filter-state.test.ts:108 :: returns true when sleeping workspaces are hidden` | D09-019 |
| `components/sidebar/sidebar-filter-state.test.ts:112 :: returns true when only filterRepoIds is non-empty` | D09-019 |
| `components/sidebar/sidebar-filter-state.test.ts:116 :: counts an opted-out default-branch exemption as an active filter` | D09-019 |
| `components/sidebar/sidebar-filter-state.test.ts:122 :: treats a missing default-branch exemption as the default, not a filter` | D09-019 |
| `components/sidebar/sidebar-filter-state.test.ts:127 :: returns true when only host visibility is narrowed` | D09-019 |
| `components/sidebar/sidebar-filter-state.test.ts:132 :: isSleepingSweepExemptionNarrowingList` | D09-006 |
| `components/sidebar/sidebar-filter-state.test.ts:133 :: is false while sleeping workspaces are shown, even when opted out` | D09-006 |
| `components/sidebar/sidebar-filter-state.test.ts:137 :: is true only when the sweep is on and the exemption is opted out` | D09-006 |
| `components/sidebar/sidebar-filter-state.test.ts:142 :: treats a missing flag as the on default` | D09-006 |
| `components/sidebar/sidebar-filter-state.test.ts:147 :: computeClearFilterActions` | D09-020 |
| `components/sidebar/sidebar-filter-state.test.ts:148 :: returns no-op actions when nothing is set` | D09-020 |
| `components/sidebar/sidebar-filter-state.test.ts:162 :: flags only hideDefaultBranchWorkspace for reset when it is the sole filter` | D09-020 |
| `components/sidebar/sidebar-filter-state.test.ts:179 :: flags only hideAutomationGeneratedWorkspaces for reset when it is the sole filter` | D09-020 |
| `components/sidebar/sidebar-filter-state.test.ts:195 :: flags only hideCliCreatedWorkspaces for reset when it is the sole filter` | D09-020 |
| `components/sidebar/sidebar-filter-state.test.ts:209 :: flags only hideDetachedHeadWorkspaces for reset when it is the sole filter` | D09-020 |
| `components/sidebar/sidebar-filter-state.test.ts:223 :: does not flag hideDefaultBranchWorkspace when it is already off` | D09-020 |
| `components/sidebar/sidebar-filter-state.test.ts:236 :: flags legacy single-host scope for reset even without visible host ids` | D09-020 |
| `components/sidebar/sidebar-filter-state.test.ts:250 :: flags only the default-branch exemption for reset when it is the sole filter` | D09-020 |
| `components/sidebar/sidebar-filter-state.test.ts:266 :: flags every active filter simultaneously` | D09-020 |
| `components/sidebar/smart-attention.test.ts:78 :: mostRecentAttentionInHistory` | D09-024 |
| `components/sidebar/smart-attention.test.ts:79 :: returns null on an empty history` | D09-024 |
| `components/sidebar/smart-attention.test.ts:83 :: returns the latest done/blocked/waiting startedAt` | D09-024 |
| `components/sidebar/smart-attention.test.ts:94 :: skips interrupted done rows` | D09-024 |
| `components/sidebar/smart-attention.test.ts:103 :: returns null when only interrupted dones exist` | D09-024 |
| `components/sidebar/smart-attention.test.ts:107 :: ignores working rows entirely` | D09-024 |
| `components/sidebar/smart-attention.test.ts:116 :: skips history rows with non-finite startedAt` | D09-024 |
| `components/sidebar/smart-attention.test.ts:129 :: resolveAttention` | D09-023 |
| `components/sidebar/smart-attention.test.ts:130 :: returns idle when there are no panes` | D09-023 |
| `components/sidebar/smart-attention.test.ts:134 :: classifies a blocked pane as Class 1 with stateStartedAt` | D09-022 |
| `components/sidebar/smart-attention.test.ts:148 :: classifies a waiting pane as Class 1` | D09-022 |
| `components/sidebar/smart-attention.test.ts:158 :: classifies a done pane as Class 2` | D09-022 |
| `components/sidebar/smart-attention.test.ts:171 :: treats interrupted done as idle` | D09-022 |
| `components/sidebar/smart-attention.test.ts:182 :: treats a session boundary as idle unless it displaced a real completion` | D09-022 |
| `components/sidebar/smart-attention.test.ts:199 :: drops a done pane out of Class 2 once the completion itself ages out` | D09-022 |
| `components/sidebar/smart-attention.test.ts:220 :: does not let same-state done writes extend Class 2 eligibility` | D09-022 |
| `components/sidebar/smart-attention.test.ts:232 :: keeps an expired done pane from masking a live working sibling` | D09-023 |
| `components/sidebar/smart-attention.test.ts:251 :: ages out a session-boundary completion from its real completion time` | D09-022 |
| `components/sidebar/smart-attention.test.ts:263 :: classifies a working pane with prior done as Class 3 with the prior timestamp` | D09-022 |
| `components/sidebar/smart-attention.test.ts:277 :: uses a reset stateStartedAt for Command Code new prompts while still working` | D09-022 |
| `components/sidebar/smart-attention.test.ts:292 :: falls back to current stateStartedAt when working has no prior attention history` | D09-022 |
| `components/sidebar/smart-attention.test.ts:306 :: falls back when history contains only interrupted done rows` | D09-022 |
| `components/sidebar/smart-attention.test.ts:320 :: skips stale entries (updatedAt older than the freshness window)` | D09-022 |
| `components/sidebar/smart-attention.test.ts:330 :: takes the most attention-demanding class across multiple panes` | D09-023 |
| `components/sidebar/smart-attention.test.ts:352 :: within the resolved class, takes the freshest attention timestamp across panes` | D09-023 |
| `components/sidebar/smart-attention.test.ts:372 :: skips entries with non-finite stateStartedAt` | D09-022 |
| `components/sidebar/smart-attention.test.ts:384 :: title-heuristic permission maps to Class 1 with ts = now` | D09-022 |
| `components/sidebar/smart-attention.test.ts:393 :: title-heuristic working maps to Class 3 with ts = worktree.lastActivityAt` | D09-022 |
| `components/sidebar/smart-attention.test.ts:402 :: title-heuristic idle / null contributes nothing (Class 4)` | D09-022 |
| `components/sidebar/smart-attention.test.ts:414 :: hook entry overrides title heuristic on the same pane (hook wins when fresh)` | D09-025 |
| `components/sidebar/smart-attention.test.ts:435 :: per-pane authority across panes: pane A hook=done, pane B title=permission → Class 1` | D09-023 |
| `components/sidebar/smart-attention.test.ts:456 :: buildAttentionByWorktree` | D09-026 |
| `components/sidebar/smart-attention.test.ts:500 :: returns IDLE for worktrees with no tabs` | D09-026 |
| `components/sidebar/smart-attention.test.ts:506 :: uses fresh worktree attribution before a headless tab is mirrored` | D09-026 |
| `components/sidebar/smart-attention.test.ts:527 :: prefers mirrored tab ownership over a stale worktree stamp` | D09-026 |
| `components/sidebar/smart-attention.test.ts:560 :: aggregates entries across multiple panes on the same tab` | D09-025 |
| `components/sidebar/smart-attention.test.ts:585 :: skips malformed paneKeys (no colon)` | D09-026 |
| `components/sidebar/smart-attention.test.ts:606 :: title-heuristic Class 1: hookless pane with permission title → Class 1 with ts = now` | D09-025 |
| `components/sidebar/smart-attention.test.ts:624 :: title-heuristic Class 3: hookless pane with working title → ts = worktree.lastActivityAt` | D09-025 |
| `components/sidebar/smart-attention.test.ts:638 :: hook overrides title on the same pane (hook=done + working-style title stays Class 2)` | D09-025 |
| `components/sidebar/smart-attention.test.ts:663 :: keeps a restored row idle while allowing an independently live sibling title` | D09-025 |
| `components/sidebar/smart-attention.test.ts:691 :: does not revive a restored row from one title before layout hydration` | D09-025 |
| `components/sidebar/smart-attention.test.ts:713 :: still uses one unmapped title when the hook is only age-stale` | D09-025 |
| `components/sidebar/smart-attention.test.ts:739 :: per-pane authority across panes: pane A fresh hook=done, pane B no hook + permission title → Class 1` | D09-025 |
| `components/sidebar/smart-attention.test.ts:768 :: does not fire title fallback for tabs without a live PTY` | D09-025 |
| `components/sidebar/smart-sort.test.ts:139 :: smart sort — class invariants` | D09-030 |
| `components/sidebar/smart-sort.test.ts:140 :: ranks blocked above done regardless of which stateStartedAt is newer` | D09-030 |
| `components/sidebar/smart-sort.test.ts:167 :: ranks done above working` | D09-030 |
| `components/sidebar/smart-sort.test.ts:193 :: ranks working above idle` | D09-030 |
| `components/sidebar/smart-sort.test.ts:219 :: smart sort — within-class recency` | D09-030 |
| `components/sidebar/smart-sort.test.ts:220 :: orders two blocked worktrees by stateStartedAt (newer first)` | D09-030 |
| `components/sidebar/smart-sort.test.ts:245 :: ranks a working worktree with prior done above one with no history` | D09-030 |
| `components/sidebar/smart-sort.test.ts:274 :: falls back to current stateStartedAt when history is only interrupted dones` | D09-030 |
| `components/sidebar/smart-sort.test.ts:306 :: smart sort — interrupted and stale handling` | D09-030 |
| `components/sidebar/smart-sort.test.ts:307 :: interrupted done worktrees fall to Class 4 (idle), not Class 2` | D09-030 |
| `components/sidebar/smart-sort.test.ts:337 :: stale entries fall to Class 4` | D09-030 |
| `components/sidebar/smart-sort.test.ts:368 :: smart sort — completed-agent eligibility clock` | D09-030 |
| `components/sidebar/smart-sort.test.ts:407 :: ranks the two spinners above the 32-minute-old completion` | D09-030 |
| `components/sidebar/smart-sort.test.ts:417 :: still ranks that completion above the spinners inside its own window` | D09-030 |
| `components/sidebar/smart-sort.test.ts:424 :: smart sort — Class 4 ordering` | D09-030 |
| `components/sidebar/smart-sort.test.ts:425 :: breaks ties on effectiveRecentActivity, then displayName` | D09-030 |
| `components/sidebar/smart-sort.test.ts:445 :: falls back to displayName when recency is identical` | D09-030 |
| `components/sidebar/smart-sort.test.ts:464 :: honors the create-grace floor for new worktrees in Class 4` | D09-028 |
| `components/sidebar/smart-sort.test.ts:486 :: smart sort — multi-pane resolution` | D09-030 |
| `components/sidebar/smart-sort.test.ts:487 :: any blocked pane promotes the whole worktree to Class 1` | D09-030 |
| `components/sidebar/smart-sort.test.ts:519 :: sortWorktreesSmart — cold start fallback` | D09-031 |
| `components/sidebar/smart-sort.test.ts:520 :: falls back to persisted sortOrder when no PTY is alive` | D09-031 |
| `components/sidebar/smart-sort.test.ts:529 :: uses fresh attributed agents before their headless tabs are mirrored` | D09-027 |
| `components/sidebar/smart-sort.test.ts:553 :: uses a fresh agent resolved through its mirrored tab without a worktree stamp` | D09-027 |
| `components/sidebar/smart-sort.test.ts:585 :: falls back to the path label when a persisted worktree has no displayName` | D09-029 |
| `components/sidebar/smart-sort.test.ts:601 :: treats slept tabs (tab.ptyId without live entry) as cold start` | D09-031 |
| `components/sidebar/smart-sort.test.ts:615 :: uses the smart comparator once a PTY is alive` | D09-031 |
| `components/sidebar/smart-sort.test.ts:649 :: sortWorktreesSmart — palette caller regression` | D09-031 |
| `components/sidebar/smart-sort.test.ts:653 :: palette ranks blocked above working when both flow through sortWorktreesSmart` | D09-031 |
| `components/sidebar/smart-sort.test.ts:691 :: buildWorktreeComparator — recent (lastActivityAt)` | D09-030 |
| `components/sidebar/smart-sort.test.ts:692 :: sorts by lastActivityAt descending (most recent first)` | D09-030 |
| `components/sidebar/smart-sort.test.ts:710 :: sorts worktrees with lastActivityAt 0 to the bottom` | D09-030 |
| `components/sidebar/smart-sort.test.ts:728 :: falls back to alphabetical when lastActivityAt is equal` | D09-030 |
| `components/sidebar/smart-sort.test.ts:746 :: ignores sortOrder entirely — activity alone determines the order` | D09-030 |
| `components/sidebar/smart-sort.test.ts:767 :: effectiveRecentActivity — create-grace floor` | D09-028 |
| `components/sidebar/smart-sort.test.ts:768 :: returns lastActivityAt when createdAt is absent` | D09-028 |
| `components/sidebar/smart-sort.test.ts:773 :: returns createdAt + CREATE_GRACE_MS when grace window exceeds lastActivityAt` | D09-028 |
| `components/sidebar/smart-sort.test.ts:778 :: returns lastActivityAt when grace window has elapsed` | D09-028 |
| `components/sidebar/smart-sort.test.ts:787 :: returns lastActivityAt when real activity has surpassed the grace floor` | D09-028 |
| `components/sidebar/smart-sort.test.ts:793 :: returns lastActivityAt once the grace window has elapsed even when no other activity has occurred` | D09-028 |
| `components/sidebar/smart-sort.test.ts:800 :: buildWorktreeComparator — manual order` | D09-030 |
| `components/sidebar/smart-sort.test.ts:801 :: orders by persisted manualOrder with higher values first` | D09-030 |
| `components/sidebar/smart-sort.test.ts:811 :: falls back to sortOrder before a workspace has manualOrder` | D09-030 |
| `components/sidebar/smart-sort.test.ts:830 :: buildWorktreeComparator — recent with createdAt grace window` | D09-028 |
| `components/sidebar/smart-sort.test.ts:831 :: keeps a newly-created worktree on top even when another worktree bumps lastActivityAt` | D09-028 |
| `components/sidebar/smart-sort.test.ts:850 :: falls through to normal recency once the grace window has elapsed` | D09-028 |
| `components/sidebar/smart-sort.test.ts:869 :: does not disturb ranking for worktrees without createdAt` | D09-028 |
| `components/sidebar/worktree-filter-visibility.test.ts:61 :: worktreePassesSidebarFilters` | D09-021 |
| `components/sidebar/worktree-filter-visibility.test.ts:62 :: does not let a visible local twin vouch for a host-filtered remote target` | D09-021 |
| `components/sidebar/worktree-filter-visibility.test.ts:71 :: reports the remote twin visible when its host is in scope` | D09-021 |