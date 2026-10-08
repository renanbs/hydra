# Coverage Report — D01-shell-chrome

## Contagens de Cobertura

- **arquivos:** 25/25
- **símbolos:** 43/43
- **testes:** 162/162
- **labels:** 181/181
- **hotkeys:** 62/62
- **prefs:** 7/7
- **timers:** 1/1
- **subs:** 6/6
- **preload:** 7/7

## Justificativas (INFRA / N/A / DUP)

| Categoria | Entrada | Justificativa |
|-----------|---------|---------------|
| symbols | `SetupGuideEntryVisibilityInput` | INFRA: type-only visibility input contract |
| symbols | `HostHeaderRow` | INFRA: type-only row definition for host section headers |
| symbols | `HostSectionRow` | INFRA: type-only union of list Row and HostHeaderRow |
| symbols | `HostSectionOption` | INFRA: type-only host metadata option contract |
| symbols | `SidebarHostOption` | INFRA: type-only host registry option model |
| symbols | `SidebarHostScopeOption` | INFRA: type-only host scope option model |
| tests | `components/sidebar/AgentDashboardSidebarHost.test.tsx:23 :: AgentDashboardSidebarHost` | INFRA: test suite describe container |
| tests | `components/sidebar/CacheTimer.test.tsx:34 :: usePromptCacheCountdownStartedAt` | INFRA: test suite describe container |
| tests | `components/sidebar/ProjectHeaderActions.test.tsx:9 :: ProjectHeaderActions` | INFRA: test suite describe container |
| tests | `components/sidebar/SetupGuideSidebarEntry.test.tsx:116 :: SetupGuideSidebarEntry` | INFRA: test suite describe container |
| tests | `components/sidebar/Sidebar.test.tsx:143 :: Sidebar` | INFRA: test suite describe container |
| tests | `components/sidebar/SidebarFeedbackDialog.test.tsx:92 :: SidebarFeedbackDialog environment prefill` | INFRA: test suite describe container |
| tests | `components/sidebar/SidebarFeedbackDialog.test.tsx:192 :: SidebarFeedbackDialog image submission` | INFRA: test suite describe container |
| tests | `components/sidebar/SidebarHeader.test.tsx:133 :: SidebarHeader` | INFRA: test suite describe container |
| tests | `components/sidebar/SidebarNav.test.tsx:203 :: SidebarNav` | INFRA: test suite describe container |
| tests | `components/sidebar/SidebarSettingsHelpMenu.test.tsx:172 :: SidebarSettingsHelpMenu` | INFRA: test suite describe container |
| tests | `components/sidebar/SidebarToolbar.test.tsx:68 :: SidebarToolbar moved workspace board hint` | INFRA: test suite describe container |
| tests | `components/sidebar/StatusIndicator.test.ts:35 :: StatusIndicator` | INFRA: test suite describe container |
| tests | `components/sidebar/host-section-order.test.ts:13 :: orderHostSectionOptions` | INFRA: test suite describe container |
| tests | `components/sidebar/host-section-rows.test.ts:143 :: addHostSectionRows` | INFRA: test suite describe container |
| tests | `components/sidebar/mobile-sidebar-onboarding-badge.test.ts:37 :: mobile sidebar onboarding badge` | INFRA: test suite describe container |
| tests | `components/sidebar/sidebar-empty-state-gate.test.ts:10 :: Clear Filters empty state` | INFRA: test suite describe container |
| tests | `components/sidebar/sidebar-host-options.test.ts:13 :: sidebar host options` | INFRA: test suite describe container |

## Arquivos Produtivos (25/25)

| Arquivo | IDs de Capability |
|---------|-------------------|
| `components/Sidebar.tsx` | D01-001 |
| `components/sidebar/AgentDashboardSidebarEntry.tsx` | D01-027, D01-028 |
| `components/sidebar/AgentDashboardSidebarHost.tsx` | D01-029 |
| `components/sidebar/CacheTimer.tsx` | D01-049 |
| `components/sidebar/ProjectHeaderActions.tsx` | D01-014 |
| `components/sidebar/ScrollToCurrentWorkspaceToolbarButton.tsx` | D01-031 |
| `components/sidebar/SetupGuideSidebarEntry.tsx` | D01-017 |
| `components/sidebar/SidebarFeedbackDialog.tsx` | D01-040, D01-041, D01-042, D01-043 |
| `components/sidebar/SidebarFeedbackImageAttachments.tsx` | D01-042 |
| `components/sidebar/SidebarHeader.tsx` | D01-005, D01-007, D01-008, D01-009, D01-010 |
| `components/sidebar/SidebarHostScopeMenuSection.tsx` | D01-045 |
| `components/sidebar/SidebarNav.tsx` | D01-016, D01-021, D01-022, D01-023, D01-024, D01-026 |
| `components/sidebar/SidebarSettingsHelpMenu.tsx` | D01-034, D01-035, D01-036, D01-037, D01-038, D01-039 |
| `components/sidebar/SidebarTaskNavButton.tsx` | D01-018, D01-019, D01-020 |
| `components/sidebar/SidebarToolbar.tsx` | D01-030, D01-032, D01-033 |
| `components/sidebar/StatusIndicator.tsx` | D01-048 |
| `components/sidebar/host-section-order.ts` | D01-046 |
| `components/sidebar/host-section-rows.ts` | D01-047 |
| `components/sidebar/mobile-sidebar-onboarding-badge.ts` | D01-024 |
| `components/sidebar/repo-header-action-button-class.ts` | D01-015 |
| `components/sidebar/sidebar-count-badge.tsx` | D01-050 |
| `components/sidebar/sidebar-empty-state-gate.ts` | D01-051 |
| `components/sidebar/sidebar-header-actions.tsx` | D01-011, D01-012, D01-013 |
| `components/sidebar/sidebar-host-options.ts` | D01-044, D01-045 |
| `components/sidebar/sidebar-nav-controls.tsx` | D01-025 |

## Símbolos Exportados (43/43)

| Símbolo | Mapeamento / Justificativa |
|---------|----------------------------|
| `AgentDashboardSidebarEntry` | D01-027, D01-028 |
| `AgentDashboardSidebarHost` | D01-029 |
| `CacheTimer` | D01-049 |
| `HideSidebarMenu` | D01-025 |
| `HostHeaderRow` | INFRA: type-only row definition for host section headers |
| `HostSectionOption` | INFRA: type-only host metadata option contract |
| `HostSectionRow` | INFRA: type-only union of list Row and HostHeaderRow |
| `PROJECT_HEADER_ACTIONS_CLASS_NAME` | D01-014 |
| `ProjectHeaderActions` | D01-014 |
| `REPO_HEADER_ACTION_BUTTON_CLASS` | D01-015 |
| `REPO_HEADER_ACTION_REVEAL_CLASS` | D01-015 |
| `ScrollToCurrentWorkspaceToolbarButton` | D01-031 |
| `SetupGuideEntryVisibilityInput` | INFRA: type-only visibility input contract |
| `SetupGuideSidebarEntry` | D01-017 |
| `SidebarCountBadge` | D01-050 |
| `SidebarFeedbackDialog` | D01-040, D01-041, D01-042, D01-043 |
| `SidebarFeedbackImageAttachments` | D01-042 |
| `SidebarHeaderActions` | D01-011, D01-012, D01-013 |
| `SidebarHostOption` | INFRA: type-only host registry option model |
| `SidebarHostScopeMenuSection` | D01-045 |
| `SidebarHostScopeOption` | INFRA: type-only host scope option model |
| `SidebarSettingsHelpMenu` | D01-034, D01-035, D01-036, D01-037, D01-038, D01-039 |
| `SidebarTaskNavButton` | D01-018, D01-019, D01-020 |
| `Status` | D01-048 |
| `addHostSectionRows` | D01-047 |
| `buildSidebarHostOptions` | D01-044 |
| `buildSidebarHostScopeOptions` | D01-045 |
| `getSetupGuideSidebarEntryReady` | D01-017 |
| `getSidebarHostHealthLabel` | D01-045 |
| `getSidebarHostVisibilityLabel` | D01-045 |
| `orderHostSectionOptions` | D01-046 |
| `shouldFiltersHideAllRows` | D01-051 |
| `shouldShowAgentDashboardButton` | D01-027 |
| `shouldShowArtifactsButton` | D01-021 |
| `shouldShowAutomationsButton` | D01-023 |
| `shouldShowHostScopeControls` | D01-044, D01-045 |
| `shouldShowMobileButton` | D01-024 |
| `shouldShowMobileSidebarOnboardingBadge` | D01-024 |
| `shouldShowSetupGuideEntry` | D01-017 |
| `shouldShowSkillsButton` | D01-022 |
| `useMobileSidebarOnboardingBadge` | D01-024 |
| `usePromptCacheCountdownForPane` | D01-049 |
| `usePromptCacheCountdownStartedAt` | D01-049 |

## Timers (1/1)

| Timer / Interval | ID de Capability |
|------------------|-------------------|
| `components/sidebar/SidebarToolbar.tsx:61 :: const timeoutId = window.setTimeout(() => {` | D01-033 |

## Subscriptions (6/6)

| Subscription | ID de Capability |
|--------------|-------------------|
| `components/sidebar/AgentDashboardSidebarHost.tsx:24 :: useEffect(() => {` | D01-029 |
| `components/sidebar/AgentDashboardSidebarHost.tsx:29 :: useEffect(() => {` | D01-029 |
| `components/sidebar/AgentDashboardSidebarHost.tsx:34 :: useEffect(() => {` | D01-029 |
| `components/sidebar/SidebarFeedbackDialog.tsx:91 :: React.useEffect(() => {` | D01-041 |
| `components/sidebar/SidebarTaskNavButton.tsx:107 :: React.useEffect(() => {` | D01-020 |
| `components/sidebar/SidebarToolbar.tsx:39 :: React.useEffect(() => {` | D01-033 |

## Contrato Preload / Backend IPC (7/7)

| Chamada Preload | ID de Capability |
|-----------------|-------------------|
| `components/sidebar/AgentDashboardSidebarEntry.tsx:74 :: void window.api.dashboard.openPopout()` | D01-028 |
| `components/sidebar/SidebarFeedbackDialog.tsx:146 :: const result = await window.api.feedback.submit({` | D01-043 |
| `components/sidebar/SidebarFeedbackDialog.tsx:42 :: void window.api.shell.openUrl(url)` | D01-040 |
| `components/sidebar/SidebarFeedbackDialog.tsx:98 :: void window.api.gh` | D01-041 |
| `components/sidebar/SidebarSettingsHelpMenu.tsx:153 :: void window.api.app.restart().catch((error) => {` | D01-039 |
| `components/sidebar/SidebarSettingsHelpMenu.tsx:186 :: void window.api.updater.check(getUpdateCheckClickOptions(modifiers))` | D01-038 |
| `components/sidebar/SidebarSettingsHelpMenu.tsx:63 :: void window.api.shell.openUrl(url)` | D01-037 |

## Preferências / LocalStorage (7/7)

| Chave / LocalStorage | ID de Capability |
|----------------------|-------------------|
| `components/sidebar/SidebarToolbar.test.tsx:114 :: expect(window.localStorage.getItem('orca.workspaceBoardMovedHintSeen.v1')).toBeNull()` | D01-033 |
| `components/sidebar/SidebarToolbar.test.tsx:128 :: expect(window.localStorage.getItem('orca.workspaceBoardMovedHintSeen.v1')).toBe('true')` | D01-033 |
| `components/sidebar/SidebarToolbar.tsx:12 :: const WORKSPACE_BOARD_MOVED_HINT_STORAGE_KEY = 'orca.workspaceBoardMovedHintSeen.v1'` | D01-033 |
| `components/sidebar/SidebarToolbar.tsx:52 :: if (window.localStorage.getItem(WORKSPACE_BOARD_MOVED_HINT_STORAGE_KEY) === 'true') {` | D01-033 |
| `components/sidebar/SidebarToolbar.tsx:55 :: window.localStorage.setItem(WORKSPACE_BOARD_MOVED_HINT_STORAGE_KEY, 'true')` | D01-033 |
| `components/sidebar/mobile-sidebar-onboarding-badge.ts:37 :: window.localStorage.setItem(DISMISS_KEY, '1')` | D01-024 |
| `components/sidebar/mobile-sidebar-onboarding-badge.ts:8 :: return window.localStorage.getItem(DISMISS_KEY) === '1'` | D01-024 |

## Atalhos de Teclado / Hotkeys (62/62)

| Atalho / Referência | ID de Capability |
|---------------------|-------------------|
| `components/sidebar/SidebarHeader.test.tsx:111 :: mocks.shortcutLabel.current = '⌘N'` | D01-012 |
| `components/sidebar/SidebarHeader.test.tsx:12 :: const shortcutLabel: { current: string \| null } = { current: '⌘N' }` | D01-012 |
| `components/sidebar/SidebarHeader.test.tsx:17 :: shortcutLabel,` | D01-012 |
| `components/sidebar/SidebarHeader.test.tsx:190 :: it('advertises the workspace shortcut on the create tooltip, and omits it when unassigned', () => {` | D01-012 |
| `components/sidebar/SidebarHeader.test.tsx:196 :: mocks.shortcutLabel.current = null` | D01-012 |
| `components/sidebar/SidebarHeader.test.tsx:63 :: vi.mock('@/hooks/useShortcutLabel', () => ({` | D01-012 |
| `components/sidebar/SidebarHeader.test.tsx:64 :: useShortcutLabel: () => '⌘N',` | D01-012 |
| `components/sidebar/SidebarHeader.test.tsx:65 :: formatOptionalPrimaryShortcutLabel: () => mocks.shortcutLabel.current` | D01-012 |
| `components/sidebar/SidebarNav.test.tsx:419 :: it('hides the worktree palette shortcut until the search field is hovered or focused', async () => {` | D01-016 |
| `components/sidebar/SidebarNav.test.tsx:428 :: const shortcuts = searchButton?.querySelector('span.hidden')` | D01-016 |
| `components/sidebar/SidebarNav.test.tsx:429 :: expect(shortcuts?.className).toContain('hidden')` | D01-016 |
| `components/sidebar/SidebarNav.test.tsx:430 :: expect(shortcuts?.className).toContain('group-hover:flex')` | D01-016 |
| `components/sidebar/SidebarNav.test.tsx:431 :: expect(shortcuts?.className).toContain('group-focus-within:flex')` | D01-016 |
| `components/sidebar/SidebarNav.test.tsx:432 :: expect(shortcuts?.textContent).toContain('⌘')` | D01-016 |
| `components/sidebar/SidebarNav.test.tsx:433 :: expect(shortcuts?.textContent).toContain('J')` | D01-016 |
| `components/sidebar/SidebarNav.test.tsx:437 :: it('keeps task source shortcuts keyboard-reachable and revealed on Tasks row hover or focus', async () => {` | D01-019 |
| `components/sidebar/SidebarNav.test.tsx:441 :: const githubShortcut = tasksButton.parentElement?.querySelector<HTMLButtonElement>(` | D01-019 |
| `components/sidebar/SidebarNav.test.tsx:444 :: expect(githubShortcut).not.toBeNull()` | D01-019 |
| `components/sidebar/SidebarNav.test.tsx:445 :: expect(githubShortcut?.tabIndex).toBe(0)` | D01-019 |
| `components/sidebar/SidebarNav.test.tsx:446 :: expect(tasksButton.contains(githubShortcut ?? null)).toBe(false)` | D01-019 |
| `components/sidebar/SidebarNav.test.tsx:448 :: const shortcuts = githubShortcut?.parentElement` | D01-019 |
| `components/sidebar/SidebarNav.test.tsx:449 :: expect(shortcuts?.className).toContain('can-hover:opacity-0')` | D01-016 |
| `components/sidebar/SidebarNav.test.tsx:450 :: expect(shortcuts?.className).toContain('can-hover:group-hover:opacity-100')` | D01-016 |
| `components/sidebar/SidebarNav.test.tsx:451 :: expect(shortcuts?.className).toContain('can-hover:group-focus-within:opacity-100')` | D01-016 |
| `components/sidebar/SidebarNav.test.tsx:54 :: vi.mock('@/hooks/useShortcutLabel', () => ({` | D01-016 |
| `components/sidebar/SidebarNav.test.tsx:55 :: useShortcutKeyComboDetails: () => [{ keys: ['⌘', 'J'], doubleTap: false }]` | D01-016 |
| `components/sidebar/SidebarNav.tsx:110 :: {worktreePaletteShortcutCombos.map((combo) => (` | D01-016 |
| `components/sidebar/SidebarNav.tsx:111 :: <ShortcutKeyCombo` | D01-016 |
| `components/sidebar/SidebarNav.tsx:57 :: const worktreePaletteShortcutCombos = useShortcutKeyComboDetails('worktree.palette')` | D01-016 |
| `components/sidebar/SidebarNav.tsx:6 :: import { useShortcutKeyComboDetails } from '@/hooks/useShortcutLabel'` | D01-016 |
| `components/sidebar/SidebarNav.tsx:7 :: import { ShortcutKeyCombo } from '@/components/ShortcutKeyCombo'` | D01-016 |
| `components/sidebar/SidebarSettingsHelpMenu.test.tsx:16 :: useShortcutKeyDetails: vi.fn(),` | D01-034 |
| `components/sidebar/SidebarSettingsHelpMenu.test.tsx:177 :: mocks.useShortcutKeyDetails.mockReturnValue({ keys: ['⌘', ','], doubleTap: false })` | D01-034 |
| `components/sidebar/SidebarSettingsHelpMenu.test.tsx:217 :: it('renders Keyboard Shortcuts menu item', () => {` | D01-036 |
| `components/sidebar/SidebarSettingsHelpMenu.test.tsx:219 :: expect(html).toContain('Keyboard Shortcuts')` | D01-036 |
| `components/sidebar/SidebarSettingsHelpMenu.test.tsx:344 :: it('renders shortcut keys in the settings tooltip', () => {` | D01-034 |
| `components/sidebar/SidebarSettingsHelpMenu.test.tsx:40 :: vi.mock('@/hooks/useShortcutLabel', () => ({` | D01-034 |
| `components/sidebar/SidebarSettingsHelpMenu.test.tsx:41 :: useShortcutKeyDetails: mocks.useShortcutKeyDetails` | D01-034 |
| `components/sidebar/SidebarSettingsHelpMenu.tsx:107 :: const settingsShortcut = useShortcutKeyDetails('app.settings')` | D01-034 |
| `components/sidebar/SidebarSettingsHelpMenu.tsx:169 :: const openShortcutsSettings = (): void => {` | D01-036 |
| `components/sidebar/SidebarSettingsHelpMenu.tsx:170 :: openSettingsTarget({ pane: 'shortcuts', repoId: null })` | D01-034 |
| `components/sidebar/SidebarSettingsHelpMenu.tsx:214 :: {settingsShortcut.keys.length > 0 ? (` | D01-034 |
| `components/sidebar/SidebarSettingsHelpMenu.tsx:215 :: <ShortcutKeyCombo` | D01-034 |
| `components/sidebar/SidebarSettingsHelpMenu.tsx:216 :: keys={settingsShortcut.keys}` | D01-034 |
| `components/sidebar/SidebarSettingsHelpMenu.tsx:217 :: doubleTap={settingsShortcut.doubleTap}` | D01-034 |
| `components/sidebar/SidebarSettingsHelpMenu.tsx:248 :: <DropdownMenuItem onSelect={openShortcutsSettings}>` | D01-036 |
| `components/sidebar/SidebarSettingsHelpMenu.tsx:252 :: 'Keyboard Shortcuts'` | D01-036 |
| `components/sidebar/SidebarSettingsHelpMenu.tsx:29 :: import { useShortcutKeyDetails } from '@/hooks/useShortcutLabel'` | D01-034 |
| `components/sidebar/SidebarSettingsHelpMenu.tsx:30 :: import { ShortcutKeyCombo } from '@/components/ShortcutKeyCombo'` | D01-034 |
| `components/sidebar/SidebarTaskNavButton.tsx:159 :: {/* Why: shortcuts sit beside the Tasks button, not inside it, so each stays keyboard-reachable. */}` | D01-019 |
| `components/sidebar/SidebarTaskNavButton.tsx:188 :: <TaskProviderShortcut` | D01-019 |
| `components/sidebar/SidebarTaskNavButton.tsx:196 :: </TaskProviderShortcut>` | D01-019 |
| `components/sidebar/SidebarTaskNavButton.tsx:199 :: <TaskProviderShortcut` | D01-019 |
| `components/sidebar/SidebarTaskNavButton.tsx:207 :: </TaskProviderShortcut>` | D01-019 |
| `components/sidebar/SidebarTaskNavButton.tsx:210 :: <TaskProviderShortcut` | D01-019 |
| `components/sidebar/SidebarTaskNavButton.tsx:218 :: </TaskProviderShortcut>` | D01-019 |
| `components/sidebar/SidebarTaskNavButton.tsx:221 :: <TaskProviderShortcut` | D01-019 |
| `components/sidebar/SidebarTaskNavButton.tsx:229 :: </TaskProviderShortcut>` | D01-019 |
| `components/sidebar/SidebarTaskNavButton.tsx:36 :: function TaskProviderShortcut({` | D01-019 |
| `components/sidebar/sidebar-header-actions.tsx:49 :: const shortcutLabel = formatOptionalPrimaryShortcutLabel('workspace.create', keybindings)` | D01-012 |
| `components/sidebar/sidebar-header-actions.tsx:6 :: import { formatOptionalPrimaryShortcutLabel } from '@/hooks/useShortcutLabel'` | D01-012 |
| `components/sidebar/sidebar-header-actions.tsx:76 :: {shortcutLabel ? <span className="ml-1.5 text-background/60">{shortcutLabel}</span> : null}` | D01-012 |

## Testes como Especificação (162/162)

| Caso de Teste | ID de Capability |
|---------------|-------------------|
| `components/sidebar/AgentDashboardSidebarHost.test.tsx:23 :: AgentDashboardSidebarHost` | INFRA: test suite describe container |
| `components/sidebar/AgentDashboardSidebarHost.test.tsx:24 :: closes the dashboard when the workspace board opens` | D01-029 |
| `components/sidebar/AgentDashboardSidebarHost.test.tsx:38 :: closes the workspace board when the dashboard opens` | D01-029 |
| `components/sidebar/AgentDashboardSidebarHost.test.tsx:62 :: clears an open dashboard when the sidebar closes` | D01-029 |
| `components/sidebar/CacheTimer.test.tsx:34 :: usePromptCacheCountdownStartedAt` | INFRA: test suite describe container |
| `components/sidebar/CacheTimer.test.tsx:49 :: does not scan aggregate cache timers while inactive` | D01-049 |
| `components/sidebar/CacheTimer.test.tsx:56 :: does not scan aggregate cache timers while disabled` | D01-049 |
| `components/sidebar/CacheTimer.test.tsx:68 :: does not scan aggregate cache timers when ttl is zero` | D01-049 |
| `components/sidebar/CacheTimer.test.tsx:80 :: scans aggregate cache timers only when the timer can render` | D01-049 |
| `components/sidebar/ProjectHeaderActions.test.tsx:22 :: overlays hover-only controls instead of reserving project title width` | D01-014 |
| `components/sidebar/ProjectHeaderActions.test.tsx:9 :: ProjectHeaderActions` | INFRA: test suite describe container |
| `components/sidebar/SetupGuideSidebarEntry.test.tsx:116 :: SetupGuideSidebarEntry` | INFRA: test suite describe container |
| `components/sidebar/SetupGuideSidebarEntry.test.tsx:135 :: does not render before persisted UI hydration is ready` | D01-017 |
| `components/sidebar/SetupGuideSidebarEntry.test.tsx:141 :: does not render before setup progress readiness settles` | D01-017 |
| `components/sidebar/SetupGuideSidebarEntry.test.tsx:147 :: does not flash when agent capability completion is still unresolved` | D01-017 |
| `components/sidebar/SetupGuideSidebarEntry.test.tsx:162 :: does not render after setup is complete and progress is ready` | D01-017 |
| `components/sidebar/SetupGuideSidebarEntry.test.tsx:168 :: renders for fresh active users when only the browser step is incomplete` | D01-017 |
| `components/sidebar/SetupGuideSidebarEntry.test.tsx:174 :: does not render when the sidebar entry was dismissed with only browser incomplete` | D01-017 |
| `components/sidebar/SetupGuideSidebarEntry.test.tsx:181 :: renders after persisted UI and setup progress are ready when setup is incomplete` | D01-017 |
| `components/sidebar/SetupGuideSidebarEntry.test.tsx:185 :: keeps the visible entry mounted during transient setup progress refreshes` | D01-017 |
| `components/sidebar/Sidebar.test.tsx:143 :: Sidebar` | INFRA: test suite describe container |
| `components/sidebar/Sidebar.test.tsx:144 :: anchors the setup script popup to the bottom toolbar` | D01-030 |
| `components/sidebar/Sidebar.test.tsx:155 :: applies left sidebar appearance variables to the workspace sidebar surface` | D01-002 |
| `components/sidebar/Sidebar.test.tsx:173 :: passes status bar visibility into the workspace board drawer` | D01-002 |
| `components/sidebar/Sidebar.test.tsx:182 :: does not start a full worktree scan while the startup session is hydrating` | D01-006 |
| `components/sidebar/Sidebar.test.tsx:206 :: does not scan all hosts when runtime connection status flaps` | D01-006 |
| `components/sidebar/Sidebar.test.tsx:230 :: closes the dashboard drawer when the dashboard experiment is disabled` | D01-028 |
| `components/sidebar/SidebarFeedbackDialog.test.tsx:105 :: keeps version info when the user types above the prefilled block` | D01-040 |
| `components/sidebar/SidebarFeedbackDialog.test.tsx:121 :: preserves early typing and appends the footer after version loading finishes` | D01-040 |
| `components/sidebar/SidebarFeedbackDialog.test.tsx:141 :: enables Send when the user types below the prefilled footer` | D01-040 |
| `components/sidebar/SidebarFeedbackDialog.test.tsx:153 :: keeps Send disabled for an edited footer with no user text` | D01-040 |
| `components/sidebar/SidebarFeedbackDialog.test.tsx:165 :: allows a real report after the prefilled footer is deleted` | D01-040 |
| `components/sidebar/SidebarFeedbackDialog.test.tsx:177 :: still prefills best-effort details when preload lookups fail` | D01-040 |
| `components/sidebar/SidebarFeedbackDialog.test.tsx:192 :: SidebarFeedbackDialog image submission` | INFRA: test suite describe container |
| `components/sidebar/SidebarFeedbackDialog.test.tsx:193 :: keeps the dialog scrollable within short windows` | D01-040 |
| `components/sidebar/SidebarFeedbackDialog.test.tsx:201 :: waits for in-flight image reads before enabling Send` | D01-042 |
| `components/sidebar/SidebarFeedbackDialog.test.tsx:249 :: warns when the server cannot confirm image delivery` | D01-042 |
| `components/sidebar/SidebarFeedbackDialog.test.tsx:285 :: releases image previews when the sidebar unmounts the dialog` | D01-042 |
| `components/sidebar/SidebarFeedbackDialog.test.tsx:311 :: does not consume text when the pasted image cannot be attached` | D01-042 |
| `components/sidebar/SidebarFeedbackDialog.test.tsx:331 :: rejects images added after submission starts instead of clearing them unsent` | D01-042 |
| `components/sidebar/SidebarFeedbackDialog.test.tsx:92 :: SidebarFeedbackDialog environment prefill` | INFRA: test suite describe container |
| `components/sidebar/SidebarFeedbackDialog.test.tsx:93 :: pre-inserts Orca version and OS info when the dialog opens` | D01-040 |
| `components/sidebar/SidebarHeader.test.tsx:133 :: SidebarHeader` | INFRA: test suite describe container |
| `components/sidebar/SidebarHeader.test.tsx:134 :: keeps New workspace clickable with zero projects, since the composer adds the first one` | D01-012 |
| `components/sidebar/SidebarHeader.test.tsx:148 :: opens the composer the same way once projects exist` | D01-012 |
| `components/sidebar/SidebarHeader.test.tsx:162 :: reaches Add project and New workspace in one click each, with no menu` | D01-011 |
| `components/sidebar/SidebarHeader.test.tsx:179 :: keeps the create button rightmost so the frequent action stays where it was` | D01-007 |
| `components/sidebar/SidebarHeader.test.tsx:190 :: advertises the workspace shortcut on the create tooltip, and omits it when unassigned` | D01-012 |
| `components/sidebar/SidebarHeader.test.tsx:203 :: opens agent activity from the bell button` | D01-008 |
| `components/sidebar/SidebarHeader.test.tsx:220 :: shows the Agents introduction only for migrated users and never offers a hide action` | D01-009 |
| `components/sidebar/SidebarHeader.test.tsx:237 :: turns off agent activity from the active bell button` | D01-008 |
| `components/sidebar/SidebarHeader.test.tsx:255 :: uses the legacy title based on workspace grouping` | D01-007 |
| `components/sidebar/SidebarHeader.test.tsx:273 :: drops both project actions in the agents view, which lists activity, not projects` | D01-013 |
| `components/sidebar/SidebarHeader.test.tsx:285 :: keeps the activity bell and actions on one row at the default sidebar width` | D01-008 |
| `components/sidebar/SidebarHeader.test.tsx:299 :: keeps the same actions on one row at compact width` | D01-013 |
| `components/sidebar/SidebarHeader.test.tsx:317 :: does not reset a persisted agents body before settings hydrate` | D01-005 |
| `components/sidebar/SidebarHeader.test.tsx:327 :: does not expose the deprecated full Agents view in agents mode` | D01-005 |
| `components/sidebar/SidebarHeader.test.tsx:339 :: renders the same actions on both sides of the old wide-layout breakpoint` | D01-013 |
| `components/sidebar/SidebarNav.test.tsx:203 :: SidebarNav` | INFRA: test suite describe container |
| `components/sidebar/SidebarNav.test.tsx:221 :: keeps the Agent Dashboard row unmounted while its experiment is off` | D01-027 |
| `components/sidebar/SidebarNav.test.tsx:228 :: mounts the Agent Dashboard row only when its experiment is enabled` | D01-027 |
| `components/sidebar/SidebarNav.test.tsx:241 :: uses a question glyph only for the Needs You count` | D01-027 |
| `components/sidebar/SidebarNav.test.tsx:268 :: shows the Mobile entry by default for older settings` | D01-024 |
| `components/sidebar/SidebarNav.test.tsx:273 :: hides the Artifacts entry by default for older settings` | D01-021 |
| `components/sidebar/SidebarNav.test.tsx:280 :: opens Artifacts from the sidebar` | D01-021 |
| `components/sidebar/SidebarNav.test.tsx:291 :: hides Artifacts from its context menu` | D01-021 |
| `components/sidebar/SidebarNav.test.tsx:304 :: hides the Mobile entry when the sidebar setting is off` | D01-024 |
| `components/sidebar/SidebarNav.test.tsx:308 :: updates localized labels when the language changes after mount` | D01-026 |
| `components/sidebar/SidebarNav.test.tsx:322 :: updates labels when pseudo-localization is enabled after mount` | D01-026 |
| `components/sidebar/SidebarNav.test.tsx:333 :: shows the inline hide control only once a device is paired` | D01-024 |
| `components/sidebar/SidebarNav.test.tsx:354 :: shows the Automations entry by default for older settings` | D01-023 |
| `components/sidebar/SidebarNav.test.tsx:359 :: hides the Automations entry when the sidebar setting is off` | D01-023 |
| `components/sidebar/SidebarNav.test.tsx:363 :: omits the Automations row when the sidebar setting is off` | D01-023 |
| `components/sidebar/SidebarNav.test.tsx:376 :: hides Automations from its sidebar context menu` | D01-023 |
| `components/sidebar/SidebarNav.test.tsx:389 :: hides Mobile from its sidebar context menu` | D01-024 |
| `components/sidebar/SidebarNav.test.tsx:402 :: places the worktree palette search above the sidebar nav rows` | D01-016 |
| `components/sidebar/SidebarNav.test.tsx:419 :: hides the worktree palette shortcut until the search field is hovered or focused` | D01-016 |
| `components/sidebar/SidebarNav.test.tsx:437 :: keeps task source shortcuts keyboard-reachable and revealed on Tasks row hover or focus` | D01-019 |
| `components/sidebar/SidebarNav.test.tsx:454 :: hides available Tasks from its sidebar context menu` | D01-018 |
| `components/sidebar/SidebarNav.test.tsx:466 :: keeps Tasks enabled with no git repos so the page can explain the empty state` | D01-018 |
| `components/sidebar/SidebarNav.test.tsx:488 :: shows the setup guide entry only after readiness, before completion, and before explicit hide` | D01-017 |
| `components/sidebar/SidebarNav.test.tsx:503 :: requires both persisted UI and setup progress readiness before showing setup guide entry` | D01-017 |
| `components/sidebar/SidebarSettingsHelpMenu.test.tsx:172 :: SidebarSettingsHelpMenu` | INFRA: test suite describe container |
| `components/sidebar/SidebarSettingsHelpMenu.test.tsx:194 :: renders the help button with correct aria-label` | D01-035 |
| `components/sidebar/SidebarSettingsHelpMenu.test.tsx:199 :: renders the settings button with correct aria-label` | D01-034 |
| `components/sidebar/SidebarSettingsHelpMenu.test.tsx:204 :: renders the settings button before the help button` | D01-035 |
| `components/sidebar/SidebarSettingsHelpMenu.test.tsx:212 :: renders Send Feedback menu item` | D01-036 |
| `components/sidebar/SidebarSettingsHelpMenu.test.tsx:217 :: renders Keyboard Shortcuts menu item` | D01-036 |
| `components/sidebar/SidebarSettingsHelpMenu.test.tsx:222 :: renders Milestones with progress when setup is incomplete` | D01-036 |
| `components/sidebar/SidebarSettingsHelpMenu.test.tsx:228 :: hides Milestones when setup is complete` | D01-036 |
| `components/sidebar/SidebarSettingsHelpMenu.test.tsx:239 :: renders the Onboarding menu item by default` | D01-036 |
| `components/sidebar/SidebarSettingsHelpMenu.test.tsx:244 :: renders Restart Orca by default` | D01-039 |
| `components/sidebar/SidebarSettingsHelpMenu.test.tsx:249 :: renders Docs link` | D01-037 |
| `components/sidebar/SidebarSettingsHelpMenu.test.tsx:254 :: renders Changelog link` | D01-037 |
| `components/sidebar/SidebarSettingsHelpMenu.test.tsx:259 :: renders GitHub link` | D01-037 |
| `components/sidebar/SidebarSettingsHelpMenu.test.tsx:264 :: renders Discord link` | D01-037 |
| `components/sidebar/SidebarSettingsHelpMenu.test.tsx:271 :: opens Discord invite through the shell bridge` | D01-037 |
| `components/sidebar/SidebarSettingsHelpMenu.test.tsx:282 :: renders X link` | D01-037 |
| `components/sidebar/SidebarSettingsHelpMenu.test.tsx:287 :: renders Check for Updates menu item` | D01-038 |
| `components/sidebar/SidebarSettingsHelpMenu.test.tsx:294 :: passes update-check modifier options through the updater bridge` | D01-035 |
| `components/sidebar/SidebarSettingsHelpMenu.test.tsx:331 :: warms the feedback chunk when the menu opens, before Send Feedback is selected` | D01-035 |
| `components/sidebar/SidebarSettingsHelpMenu.test.tsx:344 :: renders shortcut keys in the settings tooltip` | D01-034 |
| `components/sidebar/SidebarToolbar.test.tsx:117 :: shows the moved hint once to users who had already used the workspace board` | D01-033 |
| `components/sidebar/SidebarToolbar.test.tsx:135 :: relabels itself when the UI language changes after mount` | D01-030 |
| `components/sidebar/SidebarToolbar.test.tsx:151 :: keeps account controls out of the sidebar footer` | D01-030 |
| `components/sidebar/SidebarToolbar.test.tsx:68 :: SidebarToolbar moved workspace board hint` | INFRA: test suite describe container |
| `components/sidebar/SidebarToolbar.test.tsx:90 :: does not show the moved hint to brand-new users after their first board click` | D01-033 |
| `components/sidebar/StatusIndicator.test.ts:111 :: lets an enclosing action own the tooltip` | D01-048 |
| `components/sidebar/StatusIndicator.test.ts:35 :: StatusIndicator` | INFRA: test suite describe container |
| `components/sidebar/StatusIndicator.test.ts:36 :: renders working as a yellow spinner ring` | D01-048 |
| `components/sidebar/StatusIndicator.test.ts:50 :: renders monitoring as a static heartbeat glyph` | D01-048 |
| `components/sidebar/StatusIndicator.test.ts:60 :: renders permission as the shared question glyph` | D01-048 |
| `components/sidebar/StatusIndicator.test.ts:69 :: renders active as full emerald dot` | D01-048 |
| `components/sidebar/StatusIndicator.test.ts:75 :: renders done as an emerald dot` | D01-048 |
| `components/sidebar/StatusIndicator.test.ts:81 :: renders interrupted distinctly from done` | D01-048 |
| `components/sidebar/host-section-order.test.ts:13 :: orderHostSectionOptions` | INFRA: test suite describe container |
| `components/sidebar/host-section-order.test.ts:14 :: applies persisted host order and appends newly discovered hosts` | D01-046 |
| `components/sidebar/host-section-order.test.ts:23 :: ignores stale host ids in the persisted order` | D01-046 |
| `components/sidebar/host-section-rows.test.ts:143 :: addHostSectionRows` | INFRA: test suite describe container |
| `components/sidebar/host-section-rows.test.ts:144 :: does not add host headers for a specific host scope` | D01-047 |
| `components/sidebar/host-section-rows.test.ts:168 :: does not add host headers when only the local host exists` | D01-047 |
| `components/sidebar/host-section-rows.test.ts:190 :: groups rows under host headers in all-host scope` | D01-047 |
| `components/sidebar/host-section-rows.test.ts:225 :: keeps project grouping outermost in the default Projects view` | D01-047 |
| `components/sidebar/host-section-rows.test.ts:250 :: keeps host headers for a custom multi-host visibility filter` | D01-047 |
| `components/sidebar/host-section-rows.test.ts:283 :: keeps non-repo group headers with the following host-owned rows` | D01-047 |
| `components/sidebar/host-section-rows.test.ts:314 :: copies global pinned and all headers into each mixed-host section without duplicating pins` | D01-047 |
| `components/sidebar/host-section-rows.test.ts:373 :: keeps collapsed pinned rows attributable to their owning hosts` | D01-047 |
| `components/sidebar/host-section-rows.test.ts:410 :: keeps a pinned row with its explicit worktree host` | D01-047 |
| `components/sidebar/host-section-rows.test.ts:451 :: does not double-count a collapsed pinned header and its natural duplicate row` | D01-047 |
| `components/sidebar/host-section-rows.test.ts:483 :: localizes collapsed natural headers even when the hidden rows are owned by one host` | D01-047 |
| `components/sidebar/host-section-rows.test.ts:530 :: groups explicitly runtime-owned repos under their owner host, not the focused host` | D01-047 |
| `components/sidebar/host-section-rows.test.ts:579 :: groups SSH folder workspace rows under their connection host` | D01-047 |
| `components/sidebar/host-section-rows.test.ts:608 :: carries the SSH connection status through to the host header row` | D01-047 |
| `components/sidebar/host-section-rows.test.ts:645 :: uses the focused runtime as the owner for non-SSH repos` | D01-047 |
| `components/sidebar/host-section-rows.test.ts:685 :: passes host kind and blocked compatibility through to the header row` | D01-047 |
| `components/sidebar/host-section-rows.test.ts:733 :: suppresses host headers when only one host has visible workspaces` | D01-047 |
| `components/sidebar/host-section-rows.test.ts:763 :: counts a collapsed repo group via its header count instead of zero` | D01-047 |
| `components/sidebar/host-section-rows.test.ts:794 :: keeps a collapsed host header but hides its rows` | D01-047 |
| `components/sidebar/host-section-rows.test.ts:828 :: can temporarily collapse every host without mutating persisted collapse keys` | D01-047 |
| `components/sidebar/mobile-sidebar-onboarding-badge.test.ts:37 :: mobile sidebar onboarding badge` | INFRA: test suite describe container |
| `components/sidebar/mobile-sidebar-onboarding-badge.test.ts:64 :: does not show when the sidebar button is hidden` | D01-024 |
| `components/sidebar/mobile-sidebar-onboarding-badge.test.ts:68 :: shows only while enabled and undismissed` | D01-024 |
| `components/sidebar/mobile-sidebar-onboarding-badge.test.ts:73 :: marks a paired device after shared mobile devices load` | D01-024 |
| `components/sidebar/mobile-sidebar-onboarding-badge.test.ts:84 :: shows the badge after shared mobile devices load empty` | D01-024 |
| `components/sidebar/mobile-sidebar-onboarding-badge.test.ts:93 :: does not show the badge on a failed load and recovers on window focus` | D01-024 |
| `components/sidebar/sidebar-empty-state-gate.test.ts:10 :: Clear Filters empty state` | INFRA: test suite describe container |
| `components/sidebar/sidebar-empty-state-gate.test.ts:11 :: does not replace a folder-only sidebar when a filter is active` | D01-051 |
| `components/sidebar/sidebar-empty-state-gate.test.ts:24 :: still wins when filters hid every row kind` | D01-051 |
| `components/sidebar/sidebar-empty-state-gate.test.ts:34 :: never wins without active filters` | D01-051 |
| `components/sidebar/sidebar-empty-state-gate.test.ts:44 :: defers to worktrees, placeholders and imported cards as before` | D01-051 |
| `components/sidebar/sidebar-host-options.test.ts:106 :: marks a runtime host blocked when its live status fails compat` | D01-044 |
| `components/sidebar/sidebar-host-options.test.ts:13 :: sidebar host options` | INFRA: test suite describe container |
| `components/sidebar/sidebar-host-options.test.ts:14 :: hides host controls for local-only workspaces` | D01-044 |
| `components/sidebar/sidebar-host-options.test.ts:142 :: leaves a runtime host available when its live status is compatible` | D01-044 |
| `components/sidebar/sidebar-host-options.test.ts:172 :: builds all-host plus focused-host scope options` | D01-045 |
| `components/sidebar/sidebar-host-options.test.ts:186 :: labels visible host selections for the workspace options menu` | D01-045 |
| `components/sidebar/sidebar-host-options.test.ts:198 :: carries host kind so the header menu can pick lifecycle actions` | D01-044 |
| `components/sidebar/sidebar-host-options.test.ts:210 :: labels host health for compact sidebar UI` | D01-045 |
| `components/sidebar/sidebar-host-options.test.ts:34 :: includes SSH hosts from labels and repos` | D01-044 |
| `components/sidebar/sidebar-host-options.test.ts:48 :: includes SSH health in options` | D01-044 |
| `components/sidebar/sidebar-host-options.test.ts:72 :: includes the focused runtime compatibility host` | D01-044 |
| `components/sidebar/sidebar-host-options.test.ts:87 :: uses saved runtime environment names for runtime host labels` | D01-044 |

## Menu Labels & Textos Interativos (181/181)

| Texto / Label | ID de Capability |
|---------------|-------------------|
| `components/sidebar/AgentDashboardSidebarEntry.tsx:46 :: aria-label={`${dashboardBucketLabel(bucket)}: ${counts[bucket]}`}` | D01-027 |
| `components/sidebar/CacheTimer.tsx:108 :: <span>{tooltipText}</span>` | D01-049 |
| `components/sidebar/CacheTimer.tsx:4 :: import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'` | D01-049 |
| `components/sidebar/CacheTimer.tsx:88 :: const tooltipText = expired` | D01-049 |
| `components/sidebar/ScrollToCurrentWorkspaceToolbarButton.tsx:16 :: aria-label={translate(` | D01-031 |
| `components/sidebar/ScrollToCurrentWorkspaceToolbarButton.tsx:4 :: import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'` | D01-031 |
| `components/sidebar/SetupGuideSidebarEntry.test.tsx:39 :: ContextMenuItem: ({ children }: { children: ReactNode }) => <>{children}</>,` | D01-017 |
| `components/sidebar/SetupGuideSidebarEntry.tsx:114 :: <ContextMenuItem onSelect={handleHideSetupGuide}>` | D01-017 |
| `components/sidebar/SetupGuideSidebarEntry.tsx:120 :: </ContextMenuItem>` | D01-017 |
| `components/sidebar/SetupGuideSidebarEntry.tsx:8 :: ContextMenuItem,` | D01-017 |
| `components/sidebar/Sidebar.test.tsx:34 :: vi.mock('@/components/ui/tooltip', () => ({` | D01-001 |
| `components/sidebar/SidebarFeedbackDialog.tsx:299 :: placeholder={translate(` | D01-040 |
| `components/sidebar/SidebarFeedbackImageAttachments.tsx:87 :: aria-label={translate(` | D01-042 |
| `components/sidebar/SidebarHeader.test.tsx:190 :: it('advertises the workspace shortcut on the create tooltip, and omits it when unassigned', () => {` | D01-007 |
| `components/sidebar/SidebarHeader.test.tsx:209 :: '[aria-label="View activity"]'` | D01-008 |
| `components/sidebar/SidebarHeader.test.tsx:244 :: '[aria-label="Turn off activity view"]'` | D01-008 |
| `components/sidebar/SidebarHeader.test.tsx:260 :: expect(container.querySelector('[data-sidebar-section-title="projects"]')?.textContent).toBe(` | D01-007 |
| `components/sidebar/SidebarHeader.test.tsx:268 :: expect(container.querySelector('[data-sidebar-section-title="workspaces"]')?.textContent).toBe(` | D01-007 |
| `components/sidebar/SidebarHeader.test.tsx:279 :: expect(container.querySelector('[aria-label="Turn off activity view"]')).toBeTruthy()` | D01-008 |
| `components/sidebar/SidebarHeader.test.tsx:280 :: expect(container.querySelector('[aria-label="New workspace"]')).toBeTruthy()` | D01-012 |
| `components/sidebar/SidebarHeader.test.tsx:281 :: expect(container.querySelector('[aria-label="Workspace options"]')).toBeNull()` | D01-007 |
| `components/sidebar/SidebarHeader.test.tsx:282 :: expect(container.querySelector('[aria-label="Add project"]')).toBeNull()` | D01-011 |
| `components/sidebar/SidebarHeader.test.tsx:294 :: expect(container.querySelector('[aria-label="View activity"]')).toBeTruthy()` | D01-008 |
| `components/sidebar/SidebarHeader.test.tsx:295 :: expect(container.querySelector('[aria-label="Add project"]')).toBeTruthy()` | D01-011 |
| `components/sidebar/SidebarHeader.test.tsx:296 :: expect(container.querySelector('[aria-label="New workspace"]')).toBeTruthy()` | D01-012 |
| `components/sidebar/SidebarHeader.test.tsx:305 :: expect(container.querySelector('[aria-label="Add project"]')).toBeTruthy()` | D01-011 |
| `components/sidebar/SidebarHeader.test.tsx:306 :: expect(container.querySelector('[aria-label="View activity"]')).toBeTruthy()` | D01-008 |
| `components/sidebar/SidebarHeader.test.tsx:307 :: expect(container.querySelector('[aria-label="New workspace"]')).toBeTruthy()` | D01-012 |
| `components/sidebar/SidebarHeader.test.tsx:308 :: expect(container.querySelector('[aria-label="Workspace options"]')).toBeTruthy()` | D01-007 |
| `components/sidebar/SidebarHeader.test.tsx:309 :: expect(container.querySelector('[aria-label="More workspace actions"]')).toBeNull()` | D01-007 |
| `components/sidebar/SidebarHeader.test.tsx:334 :: expect(container.querySelector('[aria-label="Open full Agents view"]')).toBeNull()` | D01-007 |
| `components/sidebar/SidebarHeader.test.tsx:345 :: expect(container.querySelector('[aria-label="More workspace actions"]')).toBeNull()` | D01-007 |
| `components/sidebar/SidebarHeader.test.tsx:346 :: expect(container.querySelector('[aria-label="Add project"]')).toBeTruthy()` | D01-011 |
| `components/sidebar/SidebarHeader.test.tsx:347 :: expect(container.querySelector('[aria-label="New workspace"]')).toBeTruthy()` | D01-012 |
| `components/sidebar/SidebarHeader.test.tsx:348 :: expect(container.querySelector('[aria-label="Workspace options"]')).toBeTruthy()` | D01-007 |
| `components/sidebar/SidebarHeader.test.tsx:51 :: default: () => <button aria-label="Workspace options" type="button" />` | D01-007 |
| `components/sidebar/SidebarHeader.test.tsx:68 :: vi.mock('@/components/ui/tooltip', () => ({` | D01-007 |
| `components/sidebar/SidebarHeader.test.tsx:96 :: function headerButton(label: string): HTMLButtonElement {` | D01-007 |
| `components/sidebar/SidebarHeader.test.tsx:97 :: const button = container.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)` | D01-007 |
| `components/sidebar/SidebarHeader.tsx:55 :: data-sidebar-section-title={groupBy === 'repo' ? 'projects' : 'workspaces'}` | D01-007 |
| `components/sidebar/SidebarHeader.tsx:8 :: import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'` | D01-007 |
| `components/sidebar/SidebarHeader.tsx:81 :: aria-label={activityLabel}` | D01-008 |
| `components/sidebar/SidebarNav.test.tsx:253 :: expect(container.querySelector('[aria-label="Needs You: 2"]')).not.toBeNull()` | D01-025 |
| `components/sidebar/SidebarNav.test.tsx:255 :: const attention = container.querySelector('[aria-label="Needs You: 2"]')` | D01-025 |
| `components/sidebar/SidebarNav.test.tsx:256 :: const working = container.querySelector('[aria-label="Working: 3"]')` | D01-025 |
| `components/sidebar/SidebarNav.test.tsx:257 :: const done = container.querySelector('[aria-label="Done: 1"]')` | D01-025 |
| `components/sidebar/SidebarNav.test.tsx:258 :: const idle = container.querySelector('[aria-label="Idle: 4"]')` | D01-025 |
| `components/sidebar/SidebarNav.test.tsx:336 :: expect(beforePairing.querySelector('button[aria-label="Hide from sidebar"]')).toBeNull()` | D01-025 |
| `components/sidebar/SidebarNav.test.tsx:341 :: 'button[aria-label="Hide from sidebar"]'` | D01-025 |
| `components/sidebar/SidebarNav.test.tsx:406 :: 'button[aria-label="Search worktrees and browser tabs"]'` | D01-016 |
| `components/sidebar/SidebarNav.test.tsx:423 :: 'button[aria-label="Search worktrees and browser tabs"]'` | D01-016 |
| `components/sidebar/SidebarNav.test.tsx:442 :: 'button[aria-label="Open GitHub tasks"]'` | D01-025 |
| `components/sidebar/SidebarNav.test.tsx:475 :: tasksButton.parentElement?.querySelector('button[aria-label="Open GitHub tasks"]')` | D01-025 |
| `components/sidebar/SidebarNav.test.tsx:7 :: import { TooltipProvider } from '@/components/ui/tooltip'` | D01-025 |
| `components/sidebar/SidebarNav.test.tsx:83 :: ContextMenuItem: ({ children, onSelect }: { children: ReactNode; onSelect?: () => void }) => (` | D01-025 |
| `components/sidebar/SidebarNav.tsx:11 :: import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'` | D01-025 |
| `components/sidebar/SidebarNav.tsx:268 :: aria-label={translate(` | D01-025 |
| `components/sidebar/SidebarNav.tsx:96 :: aria-label={translate(` | D01-025 |
| `components/sidebar/SidebarSettingsHelpMenu.test.tsx:101 :: vi.mock('@/components/ui/tooltip', () => ({` | D01-035 |
| `components/sidebar/SidebarSettingsHelpMenu.test.tsx:117 :: <button data-testid="trigger-button" aria-label={ariaLabel} onClick={onClick}>` | D01-035 |
| `components/sidebar/SidebarSettingsHelpMenu.test.tsx:164 :: function findMenuItem(container: HTMLElement, label: string): HTMLButtonElement {` | D01-035 |
| `components/sidebar/SidebarSettingsHelpMenu.test.tsx:201 :: expect(html).toContain('aria-label="Settings"')` | D01-034 |
| `components/sidebar/SidebarSettingsHelpMenu.test.tsx:344 :: it('renders shortcut keys in the settings tooltip', () => {` | D01-035 |
| `components/sidebar/SidebarSettingsHelpMenu.test.tsx:74 :: DropdownMenuItem: ({` | D01-035 |
| `components/sidebar/SidebarSettingsHelpMenu.test.tsx:92 :: title={title}` | D01-035 |
| `components/sidebar/SidebarSettingsHelpMenu.tsx:20 :: import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'` | D01-035 |
| `components/sidebar/SidebarSettingsHelpMenu.tsx:202 :: aria-label={translate(` | D01-035 |
| `components/sidebar/SidebarSettingsHelpMenu.tsx:233 :: aria-label={translate(` | D01-035 |
| `components/sidebar/SidebarSettingsHelpMenu.tsx:24 :: DropdownMenuItem,` | D01-035 |
| `components/sidebar/SidebarSettingsHelpMenu.tsx:248 :: <DropdownMenuItem onSelect={openShortcutsSettings}>` | D01-034 |
| `components/sidebar/SidebarSettingsHelpMenu.tsx:254 :: </DropdownMenuItem>` | D01-035 |
| `components/sidebar/SidebarSettingsHelpMenu.tsx:256 :: <DropdownMenuItem onSelect={handleOpenFeedback}>` | D01-036 |
| `components/sidebar/SidebarSettingsHelpMenu.tsx:262 :: </DropdownMenuItem>` | D01-035 |
| `components/sidebar/SidebarSettingsHelpMenu.tsx:264 :: <DropdownMenuItem onSelect={openMilestones}>` | D01-036 |
| `components/sidebar/SidebarSettingsHelpMenu.tsx:281 :: </DropdownMenuItem>` | D01-035 |
| `components/sidebar/SidebarSettingsHelpMenu.tsx:283 :: <DropdownMenuItem` | D01-035 |
| `components/sidebar/SidebarSettingsHelpMenu.tsx:293 :: </DropdownMenuItem>` | D01-035 |
| `components/sidebar/SidebarSettingsHelpMenu.tsx:319 :: <DropdownMenuItem onSelect={() => openExternalUrl(DISCORD_URL)}>` | D01-035 |
| `components/sidebar/SidebarSettingsHelpMenu.tsx:323 :: </DropdownMenuItem>` | D01-035 |
| `components/sidebar/SidebarSettingsHelpMenu.tsx:324 :: <DropdownMenuItem onSelect={() => openExternalUrl(X_URL)}>` | D01-037 |
| `components/sidebar/SidebarSettingsHelpMenu.tsx:328 :: </DropdownMenuItem>` | D01-035 |
| `components/sidebar/SidebarSettingsHelpMenu.tsx:330 :: <DropdownMenuItem` | D01-035 |
| `components/sidebar/SidebarSettingsHelpMenu.tsx:334 :: title={updateCheckHint}` | D01-035 |
| `components/sidebar/SidebarSettingsHelpMenu.tsx:345 :: </DropdownMenuItem>` | D01-035 |
| `components/sidebar/SidebarSettingsHelpMenu.tsx:347 :: <DropdownMenuItem onSelect={handleRestartOrca} disabled={isRestartingOrca}>` | D01-039 |
| `components/sidebar/SidebarSettingsHelpMenu.tsx:353 :: </DropdownMenuItem>` | D01-035 |
| `components/sidebar/SidebarSettingsHelpMenu.tsx:87 :: label: string` | D01-035 |
| `components/sidebar/SidebarSettingsHelpMenu.tsx:92 :: <DropdownMenuItem onSelect={() => openExternalUrl(url)}>` | D01-035 |
| `components/sidebar/SidebarSettingsHelpMenu.tsx:96 :: </DropdownMenuItem>` | D01-035 |
| `components/sidebar/SidebarTaskNavButton.tsx:28 :: <ContextMenuItem onSelect={onHide}>` | D01-018 |
| `components/sidebar/SidebarTaskNavButton.tsx:31 :: </ContextMenuItem>` | D01-018 |
| `components/sidebar/SidebarTaskNavButton.tsx:41 :: label: string` | D01-018 |
| `components/sidebar/SidebarTaskNavButton.tsx:50 :: aria-label={label}` | D01-018 |
| `components/sidebar/SidebarTaskNavButton.tsx:8 :: ContextMenuItem,` | D01-018 |
| `components/sidebar/SidebarToolbar.test.tsx:104 :: 'button[aria-label="Workspace board"]'` | D01-032 |
| `components/sidebar/SidebarToolbar.test.tsx:137 :: expect(container.querySelector('button[aria-label="Workspace board"]')).not.toBeNull()` | D01-032 |
| `components/sidebar/SidebarToolbar.test.tsx:148 :: expect(container.querySelector(`button[aria-label="${localized}"]`)).not.toBeNull()` | D01-032 |
| `components/sidebar/SidebarToolbar.test.tsx:23 :: vi.mock('@/components/ui/tooltip', () => ({` | D01-032 |
| `components/sidebar/SidebarToolbar.tsx:5 :: import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'` | D01-032 |
| `components/sidebar/SidebarToolbar.tsx:90 :: aria-label={translate(` | D01-032 |
| `components/sidebar/StatusIndicator.test.ts:106 :: expect(markup).not.toContain('data-state-indicator-tooltip')` | D01-048 |
| `components/sidebar/StatusIndicator.test.ts:107 :: expect(markup).not.toContain(' title=')` | D01-048 |
| `components/sidebar/StatusIndicator.test.ts:111 :: it('lets an enclosing action own the tooltip', () => {` | D01-048 |
| `components/sidebar/StatusIndicator.test.ts:116 :: expect(markup).not.toContain('data-state-indicator-tooltip')` | D01-048 |
| `components/sidebar/StatusIndicator.test.ts:13 :: label: string \| null` | D01-048 |
| `components/sidebar/StatusIndicator.test.ts:18 :: : createElement('span', { 'data-state-indicator-tooltip': label }, children)` | D01-048 |
| `components/sidebar/StatusIndicator.test.ts:53 :: expect(markup).toContain('data-state-indicator-tooltip="Monitoring background tasks"')` | D01-048 |
| `components/sidebar/StatusIndicator.test.ts:54 :: expect(markup).not.toContain(' title=')` | D01-048 |
| `components/sidebar/StatusIndicator.test.ts:97 :: expect(markup).toContain(`data-state-indicator-tooltip="${label}"`)` | D01-048 |
| `components/sidebar/StatusIndicator.test.ts:98 :: expect(markup).not.toContain(' title=')` | D01-048 |
| `components/sidebar/StatusIndicator.tsx:101 :: <StateIndicatorTooltip label={tooltipLabel} side={tooltipSide}>` | D01-048 |
| `components/sidebar/StatusIndicator.tsx:21 :: tooltipSide?: StateIndicatorTooltipSide` | D01-048 |
| `components/sidebar/StatusIndicator.tsx:36 :: tooltipSide,` | D01-048 |
| `components/sidebar/StatusIndicator.tsx:39 :: const tooltipLabel =` | D01-048 |
| `components/sidebar/host-section-rows.test.ts:154 :: label: 'Local Mac',` | D01-001 |
| `components/sidebar/host-section-rows.test.ts:158 :: { id: 'ssh:ssh-1', kind: 'ssh', label: 'Builder', detail: 'SSH', health: 'available' }` | D01-001 |
| `components/sidebar/host-section-rows.test.ts:179 :: label: 'Local Mac',` | D01-001 |
| `components/sidebar/host-section-rows.test.ts:201 :: label: 'Local Mac',` | D01-001 |
| `components/sidebar/host-section-rows.test.ts:205 :: { id: 'ssh:ssh-1', kind: 'ssh', label: 'Builder', detail: 'SSH', health: 'available' }` | D01-001 |
| `components/sidebar/host-section-rows.test.ts:220 :: { label: 'Local Mac', count: 1 },` | D01-001 |
| `components/sidebar/host-section-rows.test.ts:221 :: { label: 'Builder', count: 1 }` | D01-001 |
| `components/sidebar/host-section-rows.test.ts:236 :: label: 'Local Mac',` | D01-001 |
| `components/sidebar/host-section-rows.test.ts:240 :: { id: 'ssh:ssh-1', kind: 'ssh', label: 'Builder', detail: 'SSH', health: 'available' }` | D01-001 |
| `components/sidebar/host-section-rows.test.ts:261 :: label: 'Local Mac',` | D01-001 |
| `components/sidebar/host-section-rows.test.ts:265 :: { id: 'ssh:ssh-1', kind: 'ssh', label: 'Builder', detail: 'SSH', health: 'available' }` | D01-001 |
| `components/sidebar/host-section-rows.test.ts:294 :: label: 'Local Mac',` | D01-001 |
| `components/sidebar/host-section-rows.test.ts:298 :: { id: 'ssh:ssh-1', kind: 'ssh', label: 'Builder', detail: 'SSH', health: 'available' }` | D01-001 |
| `components/sidebar/host-section-rows.test.ts:337 :: label: 'Local Mac',` | D01-001 |
| `components/sidebar/host-section-rows.test.ts:341 :: { id: 'ssh:ssh-1', kind: 'ssh', label: 'Builder', detail: 'SSH', health: 'available' }` | D01-001 |
| `components/sidebar/host-section-rows.test.ts:360 :: { label: 'Local Mac', count: 2 },` | D01-001 |
| `components/sidebar/host-section-rows.test.ts:361 :: { label: 'Builder', count: 2 }` | D01-001 |
| `components/sidebar/host-section-rows.test.ts:389 :: label: 'Local Mac',` | D01-001 |
| `components/sidebar/host-section-rows.test.ts:393 :: { id: 'ssh:ssh-1', kind: 'ssh', label: 'Builder', detail: 'SSH', health: 'available' }` | D01-001 |
| `components/sidebar/host-section-rows.test.ts:427 :: label: 'Local Mac',` | D01-001 |
| `components/sidebar/host-section-rows.test.ts:431 :: { id: 'ssh:ssh-1', kind: 'ssh', label: 'Builder', detail: 'SSH', health: 'available' }` | D01-001 |
| `components/sidebar/host-section-rows.test.ts:468 :: label: 'Local Mac',` | D01-001 |
| `components/sidebar/host-section-rows.test.ts:472 :: { id: 'ssh:ssh-1', kind: 'ssh', label: 'Builder', detail: 'SSH', health: 'available' }` | D01-001 |
| `components/sidebar/host-section-rows.test.ts:504 :: label: 'Local Mac',` | D01-001 |
| `components/sidebar/host-section-rows.test.ts:508 :: { id: 'ssh:ssh-1', kind: 'ssh', label: 'Builder', detail: 'SSH', health: 'available' }` | D01-001 |
| `components/sidebar/host-section-rows.test.ts:546 :: label: 'Local Mac',` | D01-001 |
| `components/sidebar/host-section-rows.test.ts:553 :: label: 'env-1',` | D01-001 |
| `components/sidebar/host-section-rows.test.ts:560 :: label: 'env-2',` | D01-001 |
| `components/sidebar/host-section-rows.test.ts:589 :: label: 'Local Mac',` | D01-001 |
| `components/sidebar/host-section-rows.test.ts:593 :: { id: 'ssh:ssh-1', kind: 'ssh', label: 'Builder', detail: 'SSH', health: 'available' }` | D01-001 |
| `components/sidebar/host-section-rows.test.ts:619 :: label: 'Local Mac',` | D01-001 |
| `components/sidebar/host-section-rows.test.ts:626 :: label: 'Builder',` | D01-001 |
| `components/sidebar/host-section-rows.test.ts:661 :: label: 'Local Mac',` | D01-001 |
| `components/sidebar/host-section-rows.test.ts:668 :: label: 'env-1',` | D01-001 |
| `components/sidebar/host-section-rows.test.ts:681 :: label: 'env-1'` | D01-001 |
| `components/sidebar/host-section-rows.test.ts:701 :: label: 'Local Mac',` | D01-001 |
| `components/sidebar/host-section-rows.test.ts:708 :: label: 'env-1',` | D01-001 |
| `components/sidebar/host-section-rows.test.ts:743 :: label: 'Local Mac',` | D01-001 |
| `components/sidebar/host-section-rows.test.ts:747 :: { id: 'ssh:ssh-1', kind: 'ssh', label: 'Builder', detail: 'SSH', health: 'disconnected' },` | D01-001 |
| `components/sidebar/host-section-rows.test.ts:751 :: label: 'env-1',` | D01-001 |
| `components/sidebar/host-section-rows.test.ts:776 :: label: 'Local Mac',` | D01-001 |
| `components/sidebar/host-section-rows.test.ts:780 :: { id: 'ssh:ssh-1', kind: 'ssh', label: 'Builder', detail: 'SSH', health: 'available' }` | D01-001 |
| `components/sidebar/host-section-rows.test.ts:805 :: label: 'Local Mac',` | D01-001 |
| `components/sidebar/host-section-rows.test.ts:809 :: { id: 'ssh:ssh-1', kind: 'ssh', label: 'Builder', detail: 'SSH', health: 'available' }` | D01-001 |
| `components/sidebar/host-section-rows.test.ts:839 :: label: 'Local Mac',` | D01-001 |
| `components/sidebar/host-section-rows.test.ts:843 :: { id: 'ssh:ssh-1', kind: 'ssh', label: 'Builder', detail: 'SSH', health: 'available' }` | D01-001 |
| `components/sidebar/host-section-rows.ts:23 :: label: string` | D01-001 |
| `components/sidebar/host-section-rows.ts:294 :: label: host.label,` | D01-001 |
| `components/sidebar/host-section-rows.ts:39 :: label: string` | D01-001 |
| `components/sidebar/host-section-rows.ts:78 :: label: isLocal ? getLocalExecutionHostLabel() : hostId,` | D01-001 |
| `components/sidebar/sidebar-header-actions.tsx:27 :: aria-label={label}` | D01-012 |
| `components/sidebar/sidebar-header-actions.tsx:48 :: // every alias in a one-line tooltip reads as noise rather than help.` | D01-012 |
| `components/sidebar/sidebar-header-actions.tsx:5 :: import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'` | D01-012 |
| `components/sidebar/sidebar-header-actions.tsx:66 :: aria-label={label}` | D01-012 |
| `components/sidebar/sidebar-host-options.test.ts:101 :: label: 'dev box',` | D01-045 |
| `components/sidebar/sidebar-host-options.test.ts:180 :: { id: 'all', label: 'All hosts', detail: `${LOCAL_HOST_LABEL}, Builder`, health: 'mixed' },` | D01-045 |
| `components/sidebar/sidebar-host-options.test.ts:181 :: { id: 'local', label: LOCAL_HOST_LABEL, health: 'local' },` | D01-045 |
| `components/sidebar/sidebar-host-options.test.ts:182 :: { id: 'ssh:ssh-1', label: 'Builder', health: 'disconnected' }` | D01-045 |
| `components/sidebar/sidebar-host-options.test.ts:24 :: label: LOCAL_HOST_LABEL,` | D01-045 |
| `components/sidebar/sidebar-host-options.test.ts:67 :: label: 'Builder',` | D01-045 |
| `components/sidebar/sidebar-host-options.ts:107 :: label: translate('auto.components.sidebar.sidebarHostOptions.3e102f111c', 'All hosts'),` | D01-045 |
| `components/sidebar/sidebar-host-options.ts:113 :: label: host.label,` | D01-045 |
| `components/sidebar/sidebar-host-options.ts:21 :: label: string` | D01-045 |
| `components/sidebar/sidebar-host-options.ts:34 :: label: string` | D01-045 |
| `components/sidebar/sidebar-nav-controls.tsx:12 :: </ContextMenuItem>` | D01-025 |
| `components/sidebar/sidebar-nav-controls.tsx:3 :: import { ContextMenuContent, ContextMenuItem } from '@/components/ui/context-menu'` | D01-025 |
| `components/sidebar/sidebar-nav-controls.tsx:9 :: <ContextMenuItem onSelect={onHide}>` | D01-025 |
